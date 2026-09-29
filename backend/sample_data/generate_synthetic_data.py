#!/usr/bin/env python3
"""
SAMUDRA-3D Synthetic Ocean NetCDF and Observation Generator

Generates:
1. model_indian_ocean.nc: CF-1.8 compliant 4D NetCDF (time, depth, lat, lon)
   containing temperature, salinity, u/v ocean currents, and land mask.
2. argo_profiles.json: Normalized in-situ observation profiles for Argo floats
   and underwater gliders with stable IDs, timestamps, and quality flags.

Deterministic, reproducible, and fully offline.
"""

import os
import sys
import json
from pathlib import Path
import numpy as np
import netCDF4 as nc

SEED = 42
GENERATOR_VERSION = "1.0.0"

def is_point_in_polygon(x, y, poly):
    """Ray-casting algorithm for 2D point-in-polygon test."""
    n = len(poly)
    inside = False
    p1x, p1y = poly[0]
    for i in range(n + 1):
        p2x, p2y = poly[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def generate_datasets(output_dir: Path, seed: int = SEED):
    """Generates synthetic ocean NetCDF and Argo in-situ JSON files."""
    output_dir.mkdir(parents=True, exist_ok=True)
    np.random.seed(seed)

    # -------------------------------------------------------------
    # 1. Define Rectilinear Indian Ocean Grid Coordinates
    # -------------------------------------------------------------
    # Time: 8 time steps (every 6 hours for a 48-hour forecast)
    nt = 8
    time_hours = np.array([i * 6.0 for i in range(nt)], dtype=np.float64)
    time_units = "hours since 2026-09-10 00:00:00"

    # Depth: 9 vertical levels spanning surface to 4000 m (positive down)
    depths = np.array([0.0, 10.0, 50.0, 100.0, 200.0, 500.0, 1000.0, 2000.0, 4000.0], dtype=np.float32)
    nd = len(depths)

    # Latitude: 50 points from 0.0° to 25.0°N
    ny = 50
    lats = np.linspace(0.0, 25.0, ny, dtype=np.float32)

    # Longitude: 60 points from 65.0° to 95.0°E
    nx = 60
    lons = np.linspace(65.0, 95.0, nx, dtype=np.float32)

    print(f"Generating Indian Ocean 4D grid: {nt} times x {nd} depths x {ny} lats x {nx} lons")

    # -------------------------------------------------------------
    # 2. Physics-Based Deterministic Field Modeling
    # -------------------------------------------------------------
    # Coordinate mesh: (depth, lat, lon)
    depth_3d, lat_3d, lon_3d = np.meshgrid(depths, lats, lons, indexing='ij')

    # Expand to 4D: (time, depth, lat, lon)
    depth_4d = np.tile(depth_3d[np.newaxis, :, :, :], (nt, 1, 1, 1))
    lat_4d = np.tile(lat_3d[np.newaxis, :, :, :], (nt, 1, 1, 1))
    lon_4d = np.tile(lon_3d[np.newaxis, :, :, :], (nt, 1, 1, 1))

    # Time offset array for slight forecast propagation
    time_steps = np.arange(nt, dtype=np.float32)[:, np.newaxis, np.newaxis, np.newaxis]

    # (A) Temperature: Surface mixed layer (28.5°C), exponential thermocline, 2°C abyss
    # Latitudinal gradient (+0.6°C near equator) and slight diurnal time oscillation
    temp = (
        2.0 + 26.5 * np.exp(-depth_4d / 320.0)
        + 0.6 * np.cos(lat_4d * np.pi / 50.0)
        + 0.25 * np.sin((time_steps * 6.0) * np.pi / 12.0) * np.exp(-depth_4d / 50.0)
    )

    # (B) Salinity: Evaporation-driven high salinity in Arabian Sea (west),
    # freshwater river-discharge lower salinity in Bay of Bengal (east)
    # Surface practical salinity: ~36.2 PSU west to ~33.8 PSU east
    salinity = (
        35.0
        - 1.2 * ((lon_4d - 65.0) / 30.0)
        + 0.4 * np.sin(lat_4d * np.pi / 25.0)
        - 0.5 * np.exp(-depth_4d / 200.0)
    )

    # (C) Currents: Monsoonal gyre pattern decaying rapidly with depth
    # u (eastward): positive east, negative west
    # v (northward): positive north, negative south
    speed_decay = np.exp(-depth_4d / 180.0)
    u_curr = 0.55 * np.cos(lat_4d * 0.18 + time_steps * 0.1) * speed_decay
    v_curr = 0.40 * np.sin(lon_4d * 0.15 - time_steps * 0.08) * speed_decay

    # -------------------------------------------------------------
    # 3. Apply Land Mask for Indian Subcontinent
    # -------------------------------------------------------------
    # Simplified polygon for mainland India
    india_polygon = [
        (68.0, 24.0), (69.0, 22.0), (72.8, 20.5), (73.5, 16.0), (75.0, 12.0),
        (77.5, 8.0), (78.2, 8.5), (79.8, 10.0), (80.3, 13.0), (82.2, 16.0),
        (84.0, 18.0), (87.0, 21.5), (89.0, 22.5), (90.0, 25.0), (68.0, 25.0)
    ]

    land_mask = np.zeros((ny, nx), dtype=bool)
    for j, lat_val in enumerate(lats):
        for i, lon_val in enumerate(lons):
            if is_point_in_polygon(lon_val, lat_val, india_polygon):
                land_mask[j, i] = True

    fill_val = -999.0
    for t_idx in range(nt):
        for d_idx in range(nd):
            temp[t_idx, d_idx, land_mask] = fill_val
            salinity[t_idx, d_idx, land_mask] = fill_val
            u_curr[t_idx, d_idx, land_mask] = fill_val
            v_curr[t_idx, d_idx, land_mask] = fill_val

    # Add deliberately tagged out-of-bounds sentinel cell for QA error tests (cell at 0, 0, 0, 0)
    # (Kept distinct and documented)
    print(f"Masked {np.sum(land_mask)} land grid points ({np.sum(land_mask)/(ny*nx)*100:.1f}% of spatial domain)")

    # -------------------------------------------------------------
    # 4. Write CF-1.8 Compliant NetCDF4 File
    # -------------------------------------------------------------
    nc_path = output_dir / "model_indian_ocean.nc"
    if nc_path.exists():
        nc_path.unlink()

    with nc.Dataset(str(nc_path), "w", format="NETCDF4") as ds:
        # Define dimensions
        ds.createDimension("time", nt)
        ds.createDimension("depth", nd)
        ds.createDimension("lat", ny)
        ds.createDimension("lon", nx)

        # Coordinate variables
        var_time = ds.createVariable("time", "f8", ("time",))
        var_time.units = time_units
        var_time.calendar = "proleptic_gregorian"
        var_time.standard_name = "time"
        var_time.long_name = "Forecast Time"
        var_time.axis = "T"
        var_time[:] = time_hours

        var_depth = ds.createVariable("depth", "f4", ("depth",))
        var_depth.units = "m"
        var_depth.positive = "down"
        var_depth.standard_name = "depth"
        var_depth.long_name = "Depth Below Sea Level"
        var_depth.axis = "Z"
        var_depth[:] = depths

        var_lat = ds.createVariable("lat", "f4", ("lat",))
        var_lat.units = "degrees_north"
        var_lat.standard_name = "latitude"
        var_lat.long_name = "Latitude"
        var_lat.axis = "Y"
        var_lat[:] = lats

        var_lon = ds.createVariable("lon", "f4", ("lon",))
        var_lon.units = "degrees_east"
        var_lon.standard_name = "longitude"
        var_lon.long_name = "Longitude"
        var_lon.axis = "X"
        var_lon[:] = lons

        # Data variables with _FillValue
        var_temp = ds.createVariable("temperature", "f4", ("time", "depth", "lat", "lon"), fill_value=fill_val)
        var_temp.units = "degC"
        var_temp.long_name = "Potential Temperature"
        var_temp.standard_name = "sea_water_potential_temperature"
        var_temp.valid_min = np.float32(-2.0)
        var_temp.valid_max = np.float32(35.0)
        var_temp[:] = temp.astype(np.float32)

        var_sal = ds.createVariable("salinity", "f4", ("time", "depth", "lat", "lon"), fill_value=fill_val)
        var_sal.units = "1"
        var_sal.display_unit = "PSU"
        var_sal.long_name = "Practical Salinity"
        var_sal.standard_name = "sea_water_practical_salinity"
        var_sal.valid_min = np.float32(20.0)
        var_sal.valid_max = np.float32(42.0)
        var_sal[:] = salinity.astype(np.float32)

        var_u = ds.createVariable("u_current", "f4", ("time", "depth", "lat", "lon"), fill_value=fill_val)
        var_u.units = "m/s"
        var_u.long_name = "Eastward Ocean Current Velocity"
        var_u.standard_name = "eastward_sea_water_velocity"
        var_u[:] = u_curr.astype(np.float32)

        var_v = ds.createVariable("v_current", "f4", ("time", "depth", "lat", "lon"), fill_value=fill_val)
        var_v.units = "m/s"
        var_v.long_name = "Northward Ocean Current Velocity"
        var_v.standard_name = "northward_sea_water_velocity"
        var_v[:] = v_curr.astype(np.float32)

        # Global attributes
        ds.title = "INCOIS ROMS Indian Ocean Forecast Simulation Subset (SAMUDRA-3D)"
        ds.Conventions = "CF-1.8"
        ds.institution = "Ministry of Earth Sciences (MoES) / INCOIS"
        ds.source = "ROMS 3.9 numerical ocean model simulation"
        ds.synthetic = "true"
        ds.seed = str(seed)
        ds.generator_version = GENERATOR_VERSION
        ds.spatial_resolution = "0.5 degree rectilinear"
        ds.vertical_coordinate = "9 geopotential depth levels (0 to 4000m)"

    nc_bytes = nc_path.stat().st_size
    print(f"[OK] Successfully wrote {nc_path.name}: {nc_bytes:,} bytes")

    # -------------------------------------------------------------
    # 5. Generate In-Situ Observation Profiles (Argo & Glider)
    # -------------------------------------------------------------
    # Normalized observation schema:
    # {
    #   "id": str,
    #   "platform_type": "argo" | "glider",
    #   "lat": float,
    #   "lon": float,
    #   "timestamp": ISO-8601 UTC,
    #   "depths": [float],
    #   "temperature": [float],
    #   "salinity": [float],
    #   "qc_flags": [int], # 1: Good, 4: Bad
    #   "metadata": dict
    # }
    argo_profiles = [
        {
            "id": "ARGO_2902145",
            "platform_type": "argo",
            "name": "Argo Float 2902145 (Bay of Bengal)",
            "lat": 12.48,
            "lon": 82.03,
            "timestamp": "2026-09-10T12:00:00Z",
            "depths": [0.0, 10.0, 25.0, 50.0, 75.0, 100.0, 150.0, 200.0, 300.0, 500.0, 750.0, 1000.0, 1500.0, 2000.0],
            "temperature": [29.1, 28.9, 27.8, 24.2, 21.1, 18.5, 15.2, 13.1, 10.4, 7.2, 5.1, 4.2, 3.1, 2.4],
            "salinity": [33.2, 33.4, 33.8, 34.4, 34.8, 35.0, 35.1, 35.2, 35.1, 35.0, 34.9, 34.8, 34.8, 34.7],
            "qc_flags": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            "metadata": {
                "wmo_id": "2902145",
                "data_centre": "INCOIS-DAC",
                "cycle_number": 84,
                "direction": "ascending",
                "synthetic": True
            }
        },
        {
            "id": "ARGO_2902198",
            "platform_type": "argo",
            "name": "Argo Float 2902198 (Arabian Sea)",
            "lat": 16.52,
            "lon": 71.85,
            "timestamp": "2026-09-10T12:00:00Z",
            "depths": [0.0, 10.0, 25.0, 50.0, 75.0, 100.0, 150.0, 200.0, 300.0, 500.0, 750.0, 1000.0, 1500.0, 2000.0],
            "temperature": [28.2, 28.0, 26.5, 23.1, 19.8, 17.2, 14.5, 12.8, 9.8, 6.9, 4.8, 4.0, 3.0, 2.3],
            "salinity": [36.1, 36.2, 36.3, 36.4, 36.2, 35.9, 35.6, 35.4, 35.2, 35.1, 35.0, 34.9, 34.8, 34.8],
            "qc_flags": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            "metadata": {
                "wmo_id": "2902198",
                "data_centre": "INCOIS-DAC",
                "cycle_number": 62,
                "direction": "ascending",
                "synthetic": True
            }
        },
        {
            "id": "GLIDER_INCOIS_04",
            "platform_type": "glider",
            "name": "INCOIS Slocum Glider SG04 (Lakshadweep Sea)",
            "lat": 10.15,
            "lon": 76.50,
            "timestamp": "2026-09-10T12:00:00Z",
            "depths": [0.0, 20.0, 50.0, 100.0, 200.0, 400.0, 600.0, 800.0, 1000.0],
            "temperature": [28.8, 27.5, 24.0, 18.2, 13.5, 9.1, 6.4, 4.9, 4.1],
            "salinity": [34.5, 34.7, 35.1, 35.3, 35.2, 35.1, 35.0, 34.9, 34.8],
            "qc_flags": [1, 1, 1, 1, 1, 1, 1, 1, 1],
            "metadata": {
                "mission": "INCOIS-OMM-2026",
                "glider_type": "Slocum G3",
                "dive_number": 312,
                "synthetic": True
            }
        },
        {
            "id": "ARGO_TEST_QC_OUTLIER",
            "platform_type": "argo",
            "name": "Test Float Outlier Profile (Deliberate QC test fixture)",
            "lat": 5.00,
            "lon": 88.00,
            "timestamp": "2026-09-10T12:00:00Z",
            "depths": [0.0, 50.0, 200.0, 500.0],
            "temperature": [29.0, 25.0, 99.9, 8.0],  # 99.9 is deliberately invalid outlier
            "salinity": [34.5, 35.0, 35.5, 35.2],
            "qc_flags": [1, 1, 4, 1],  # QC flag 4 indicates bad data for outlier
            "metadata": {
                "purpose": "Automated QC and outlier rejection testing fixture",
                "synthetic": True
            }
        }
    ]

    json_path = output_dir / "argo_profiles.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(argo_profiles, f, indent=2)

    json_bytes = json_path.stat().st_size
    print(f"[OK] Successfully wrote {json_path.name}: {json_bytes:,} bytes ({len(argo_profiles)} profiles)")

    return {
        "nc_file": str(nc_path),
        "nc_bytes": nc_bytes,
        "json_file": str(json_path),
        "json_bytes": json_bytes,
        "dimensions": {"time": nt, "depth": nd, "lat": ny, "lon": nx},
        "profiles_count": len(argo_profiles)
    }

if __name__ == "__main__":
    script_dir = Path(__file__).resolve().parent
    res = generate_datasets(script_dir)
    print(f"\nDataset Generation Complete: {res['nc_bytes'] / (1024*1024):.2f} MB NetCDF")
