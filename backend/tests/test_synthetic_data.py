"""
Unit and numerical validation test suite for SAMUDRA-3D Datasets
"""

import os
import sys
import json
import tempfile
from pathlib import Path
import numpy as np
import netCDF4 as nc

def run_tests():
    print("=== SAMUDRA-3D Numerical & Data Validation ===")
    root_dir = Path(__file__).resolve().parents[2]
    if str(root_dir) not in sys.path:
        sys.path.insert(0, str(root_dir))
    sample_data_dir = root_dir / "backend" / "sample_data"
    nc_path = sample_data_dir / "model_indian_ocean.nc"
    json_path = sample_data_dir / "argo_profiles.json"

    assert nc_path.exists(), f"NetCDF file missing: {nc_path}"
    assert json_path.exists(), f"In-situ profiles JSON missing: {json_path}"

    # -------------------------------------------------------------
    # 1. Inspect and Validate NetCDF Structure and CF Metadata
    # -------------------------------------------------------------
    with nc.Dataset(str(nc_path), "r") as ds:
        # Check global attributes
        assert ds.Conventions == "CF-1.8", "Must follow CF-1.8 conventions"
        assert ds.synthetic == "true", "Must be explicitly flagged as synthetic data"
        assert ds.institution == "Ministry of Earth Sciences (MoES) / INCOIS"

        # Check dimensions
        expected_dims = {"time": 8, "depth": 9, "lat": 50, "lon": 60}
        for dim_name, expected_len in expected_dims.items():
            assert dim_name in ds.dimensions, f"Dimension {dim_name} missing"
            assert len(ds.dimensions[dim_name]) == expected_len, (
                f"Dimension {dim_name} length mismatch: expected {expected_len}, got {len(ds.dimensions[dim_name])}"
            )
        print(f"[OK] Dimensions verified: {expected_dims}")

        # Check coordinate variables
        times = ds.variables["time"][:]
        depths = ds.variables["depth"][:]
        lats = ds.variables["lat"][:]
        lons = ds.variables["lon"][:]

        assert ds.variables["depth"].positive == "down", "Depth positive attribute must be 'down'"
        assert ds.variables["depth"].units == "m", "Depth units must be 'm'"
        assert np.all(np.diff(depths) > 0), "Depth levels must be strictly monotonic increasing"
        assert depths[0] == 0.0 and depths[-1] == 4000.0, "Depths must span 0m to 4000m"

        assert np.all(np.diff(lats) > 0), "Latitude must be strictly monotonic increasing"
        assert lats[0] >= 0.0 and lats[-1] <= 25.0, "Latitude must cover 0 to 25 deg N"

        assert np.all(np.diff(lons) > 0), "Longitude must be strictly monotonic increasing"
        assert lons[0] >= 65.0 and lons[-1] <= 95.0, "Longitude must cover 65 to 95 deg E"

        print(f"[OK] Coordinates monotonic: depths [{depths[0]}..{depths[-1]}m], lats [{lats[0]}..{lats[-1]}N], lons [{lons[0]}..{lons[-1]}E]")

        # Check data variables
        for var_name in ["temperature", "salinity", "u_current", "v_current"]:
            assert var_name in ds.variables, f"Variable {var_name} missing"
            var = ds.variables[var_name]
            assert var.dimensions == ("time", "depth", "lat", "lon"), f"Variable {var_name} dim ordering mismatch"
            assert hasattr(var, "_FillValue"), f"Variable {var_name} must have _FillValue"

        # Check temperature thermocline profile at an open-ocean point (e.g. 5°N, 85°E)
        t_var = ds.variables["temperature"]
        # Find index for open ocean (lat ~ 5°N, lon ~ 85°E)
        j_ocean = np.argmin(np.abs(lats - 5.0))
        i_ocean = np.argmin(np.abs(lons - 85.0))

        t_profile = t_var[0, :, j_ocean, i_ocean]
        assert not np.ma.is_masked(t_profile[0]), "Open ocean point must not be masked"
        assert t_profile[0] > 27.0, f"Surface temperature should be warm tropical (>27 degC), got {t_profile[0]:.2f} degC"
        assert t_profile[-1] < 4.0, f"4000m abyssal temperature should be cold (<4 degC), got {t_profile[-1]:.2f} degC"
        assert t_profile[0] > t_profile[3] > t_profile[5] > t_profile[-1], (
            "Temperature must strictly decrease with depth (thermocline stratification)"
        )
        print(f"[OK] Thermocline verified: Surface {t_profile[0]:.2f} degC -> 100m {t_profile[3]:.2f} degC -> 4000m {t_profile[-1]:.2f} degC")

        # Check Land Masking on Indian mainland (e.g. lat ~ 18 deg N, lon ~ 76 deg E near Maharashtra/Telangana)
        j_land = np.argmin(np.abs(lats - 18.0))
        i_land = np.argmin(np.abs(lons - 76.0))
        t_land = t_var[0, 0, j_land, i_land]
        assert np.ma.is_masked(t_land) or t_land == -999.0, "Land point on Indian subcontinent must be masked"
        print(f"[OK] Land mask verified: grid point (18 deg N, 76 deg E) is correctly masked as land")

        # Check ocean current decay
        u_var = ds.variables["u_current"]
        v_var = ds.variables["v_current"]
        u_surf = np.abs(u_var[0, 0, j_ocean, i_ocean])
        u_deep = np.abs(u_var[0, -1, j_ocean, i_ocean])
        assert u_surf > u_deep, "Current velocity magnitude must decay from surface to abyss"
        print(f"[OK] Current vector decay verified: surface u={u_surf:.3f} m/s vs deep u={u_deep:.3f} m/s")

    # -------------------------------------------------------------
    # 2. Test In-Situ Observation Profiles Contract (argo_profiles.json)
    # -------------------------------------------------------------
    with open(json_path, "r", encoding="utf-8") as f:
        profiles = json.load(f)

    assert isinstance(profiles, list) and len(profiles) >= 3, "Must contain at least 3 observation profiles"
    ids = set()
    for prof in profiles:
        assert "id" in prof, "Profile missing 'id'"
        assert prof["id"] not in ids, f"Duplicate profile ID: {prof['id']}"
        ids.add(prof["id"])

        assert prof["platform_type"] in ["argo", "glider"], f"Unknown platform type: {prof['platform_type']}"
        assert 0.0 <= prof["lat"] <= 25.0, f"Latitude {prof['lat']} out of domain"
        assert 65.0 <= prof["lon"] <= 95.0, f"Longitude {prof['lon']} out of domain"

        depth_arr = np.array(prof["depths"])
        assert np.all(np.diff(depth_arr) > 0), "In-situ depth levels must be monotonically increasing"
        assert len(prof["depths"]) == len(prof["temperature"]) == len(prof["salinity"]) == len(prof["qc_flags"]), (
            f"Array length mismatch in profile {prof['id']}"
        )

    # Check outlier fixture
    outlier_prof = next((p for p in profiles if p["id"] == "ARGO_TEST_QC_OUTLIER"), None)
    assert outlier_prof is not None, "Test outlier fixture must be present"
    assert 4 in outlier_prof["qc_flags"], "Outlier fixture must contain QC flag 4 (bad data)"
    print(f"[OK] In-situ observation profiles verified: {len(profiles)} profiles, stable IDs: {list(ids)}")

    # -------------------------------------------------------------
    # 3. Deterministic Regeneration Test
    # -------------------------------------------------------------
    from backend.sample_data.generate_synthetic_data import generate_datasets
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        generate_datasets(tmp_path, seed=42)

        # Compare decoded arrays from original and re-generated file
        with nc.Dataset(str(nc_path), "r") as ds_orig, nc.Dataset(str(tmp_path / "model_indian_ocean.nc"), "r") as ds_new:
            for v in ["temperature", "salinity", "u_current", "v_current"]:
                np.testing.assert_array_equal(ds_orig.variables[v][:], ds_new.variables[v][:], err_msg=f"Array mismatch on {v}")
            for c in ["time", "depth", "lat", "lon"]:
                np.testing.assert_array_equal(ds_orig.variables[c][:], ds_new.variables[c][:], err_msg=f"Coordinate mismatch on {c}")

        # Compare JSON content
        with open(json_path, "r") as f1, open(tmp_path / "argo_profiles.json", "r") as f2:
            assert json.load(f1) == json.load(f2), "JSON profile content must be deterministically identical"

    print("[OK] Deterministic regeneration test PASSED: Bit-for-bit array equality verified across two independent runs")
    print("\nALL NUMERICAL AND DATA CHECKS PASSED (100%)")

if __name__ == "__main__":
    run_tests()
