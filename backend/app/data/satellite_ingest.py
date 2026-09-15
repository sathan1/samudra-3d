"""
SAMUDRA-3D Satellite Surface Layers & Thermal Front Engine
Ingests gridded satellite SST (NOAA/AVHRR, INSAT-3D) and Chlorophyll-a (MODIS/VIIRS) fields.
Computes 2D horizontal temperature gradient vectors |∇T| for thermal front detection
and Potential Fishing Zone (PFZ) boundaries.
"""
import os
import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple
import numpy as np

from backend.app.core.config import settings
from backend.app.data.registry import dataset_registry


class SatelliteLayerManager:
    """Manages satellite SST and Chlorophyll-a gridded surface layers."""

    def __init__(self, raw_dir: Optional[Path] = None):
        self.raw_dir = raw_dir or (settings.RAW_DATA_DIR / "satellite" if settings.RAW_DATA_DIR else None)
        if self.raw_dir:
            self.raw_dir.mkdir(parents=True, exist_ok=True)

    def compute_thermal_fronts(
        self,
        sst_grid: np.ndarray,
        lats: np.ndarray,
        lons: np.ndarray,
        threshold_deg_per_km: float = 0.015
    ) -> List[Dict[str, Any]]:
        """
        Computes spatial gradients |∇T| across the 2D SST surface tensor.
        Extracts locations exceeding the thermal front threshold.
        """
        if sst_grid.ndim != 2:
            return []

        ny, nx = sst_grid.shape
        fronts = []

        d_lat = abs(float(lats[1] - lats[0])) if len(lats) > 1 else 0.083
        d_lon = abs(float(lons[1] - lons[0])) if len(lons) > 1 else 0.083

        for i in range(1, ny - 1):
            lat_deg = float(lats[i])
            dx_km = 111.0 * max(0.2, np.cos(np.radians(lat_deg))) * d_lon
            dy_km = 111.0 * d_lat

            for j in range(1, nx - 1):
                t_c = sst_grid[i, j]
                if t_c is None or np.isnan(t_c) or t_c < -5:
                    continue

                t_e = sst_grid[i, j + 1]
                t_w = sst_grid[i, j - 1]
                t_n = sst_grid[i + 1, j]
                t_s = sst_grid[i - 1, j]

                if any(v is None or np.isnan(v) for v in [t_e, t_w, t_n, t_s]):
                    continue

                dt_dx = (t_e - t_w) / (2.0 * max(1.0, dx_km))
                dt_dy = (t_n - t_s) / (2.0 * max(1.0, dy_km))
                grad = float(np.sqrt(dt_dx**2 + dt_dy**2))

                if grad >= threshold_deg_per_km:
                    fronts.append({
                        "lat": round(float(lats[i]), 3),
                        "lon": round(float(lons[j]), 3),
                        "sst_celsius": round(float(t_c), 2),
                        "gradient_deg_c_per_km": round(grad, 4),
                        "front_intensity": "HIGH" if grad > 0.03 else "MODERATE",
                        "pfz_probability": min(0.98, round(0.5 + (grad * 10.0), 2))
                    })

        fronts.sort(key=lambda x: x["gradient_deg_c_per_km"], reverse=True)
        return fronts[:150]

    def get_surface_thermal_analysis(
        self,
        lat_min: float = 0.0,
        lat_max: float = 25.0,
        lon_min: float = 50.0,
        lon_max: float = 100.0
    ) -> Dict[str, Any]:
        """
        Retrieves real surface temperature field and computes thermal front boundaries.
        """
        from backend.app.services.ocean_service import ocean_service
        adapter = ocean_service.get_active_adapter()
        active = dataset_registry.get_active_dataset()

        if adapter:
            slice_res = adapter.slice_data(
                variable="temperature",
                time_idx=0,
                depth=0.0,
                lat_min=lat_min,
                lat_max=lat_max,
                lon_min=lon_min,
                lon_max=lon_max
            )

            lats = np.array(slice_res.lats)
            lons = np.array(slice_res.lons)
            raw_grid = np.array([[np.nan if val is None else val for val in row] for row in slice_res.values], dtype=float)

            fronts = self.compute_thermal_fronts(raw_grid, lats, lons)

            badge = "[REAL • COPERNICUS]" if (active and active.source_mode.value == "REAL_LOCAL") else "[SYNTHETIC • TEST]"
            source_label = f"Surface Skin Layer ({active.name if active else 'Active Dataset'})"

            return {
                "source": source_label,
                "source_mode": active.source_mode.value if active else "UNKNOWN",
                "provenance_badge": badge,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "total_fronts_detected": len(fronts),
                "fronts": fronts,
                "domain": {
                    "lat_min": lat_min, "lat_max": lat_max, "lon_min": lon_min, "lon_max": lon_max
                }
            }

        return {
            "source": "No active dataset",
            "total_fronts_detected": 0,
            "fronts": [],
            "provenance_badge": "[UNAVAILABLE]"
        }


satellite_manager = SatelliteLayerManager()
