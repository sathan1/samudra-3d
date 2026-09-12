from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, Any, List
import json
import numpy as np
import netCDF4 as nc
from backend.app.core.config import settings
from backend.app.schemas.ocean import OceanMetadataResponse, VariableMetadata, OceanDataSliceResponse

class OceanDataService:
    def __init__(self, nc_path: Path = settings.NETCDF_PATH, argo_path: Path = settings.ARGO_PATH):
        self.nc_path = nc_path
        self.argo_path = argo_path
        self.dataset: Optional[nc.Dataset] = None
        self.times: np.ndarray = np.array([])
        self.time_timestamps: List[str] = []
        self.depths: np.ndarray = np.array([])
        self.lats: np.ndarray = np.array([])
        self.lons: np.ndarray = np.array([])
        self.metadata_cache: Optional[Dict[str, Any]] = None

    def load_dataset(self):
        """Loads and caches dataset coordinate arrays."""
        if not self.nc_path.exists():
            raise FileNotFoundError(f"NetCDF dataset not found at {self.nc_path}")

        self.dataset = nc.Dataset(str(self.nc_path), "r")
        self.times = np.array(self.dataset.variables["time"][:], dtype=np.float64)
        self.depths = np.array(self.dataset.variables["depth"][:], dtype=np.float32)
        self.lats = np.array(self.dataset.variables["lat"][:], dtype=np.float32)
        self.lons = np.array(self.dataset.variables["lon"][:], dtype=np.float32)

        # Build ISO-8601 UTC timestamps from base time: 2026-09-10 00:00:00
        base_dt = datetime(2026, 9, 10, 0, 0, 0)
        self.time_timestamps = [
            (base_dt + timedelta(hours=float(h))).strftime("%Y-%m-%dT%H:%M:%SZ")
            for h in self.times
        ]

    def close(self):
        if self.dataset is not None:
            self.dataset.close()
            self.dataset = None

    def is_loaded(self) -> bool:
        return self.dataset is not None

    def get_metadata(self) -> OceanMetadataResponse:
        """Returns CF metadata, coordinates, and available variables."""
        if not self.is_loaded():
            self.load_dataset()

        assert self.dataset is not None
        variables_meta = {
            "temperature": VariableMetadata(
                name="temperature",
                long_name=getattr(self.dataset.variables["temperature"], "long_name", "Potential Temperature"),
                units="degC",
                standard_name=getattr(self.dataset.variables["temperature"], "standard_name", "sea_water_potential_temperature"),
                valid_range=[-2.0, 35.0]
            ),
            "salinity": VariableMetadata(
                name="salinity",
                long_name=getattr(self.dataset.variables["salinity"], "long_name", "Practical Salinity"),
                units="PSU",
                standard_name=getattr(self.dataset.variables["salinity"], "standard_name", "sea_water_practical_salinity"),
                valid_range=[20.0, 42.0]
            ),
            "currents": VariableMetadata(
                name="currents",
                long_name="Ocean Current Speed and Velocity Vector",
                units="m/s",
                standard_name="sea_water_speed",
                valid_range=[0.0, 3.0]
            ),
            "u_current": VariableMetadata(
                name="u_current",
                long_name="Eastward Ocean Current Velocity",
                units="m/s",
                standard_name="eastward_sea_water_velocity",
                valid_range=[-2.0, 2.0]
            ),
            "v_current": VariableMetadata(
                name="v_current",
                long_name="Northward Ocean Current Velocity",
                units="m/s",
                standard_name="northward_sea_water_velocity",
                valid_range=[-2.0, 2.0]
            )
        }

        return OceanMetadataResponse(
            title=getattr(self.dataset, "title", "Indian Ocean Numerical Simulation"),
            conventions=getattr(self.dataset, "Conventions", "CF-1.8"),
            institution=getattr(self.dataset, "institution", "MoES / INCOIS"),
            source=getattr(self.dataset, "source", "ROMS 3.9"),
            synthetic=bool(getattr(self.dataset, "synthetic", "true") == "true"),
            dimensions={
                "time": len(self.times),
                "depth": len(self.depths),
                "lat": len(self.lats),
                "lon": len(self.lons)
            },
            variables=variables_meta,
            time_steps_hours=self.times.tolist(),
            time_timestamps=self.time_timestamps,
            depth_levels_m=self.depths.tolist(),
            lat_bounds=[float(self.lats[0]), float(self.lats[-1])],
            lon_bounds=[float(self.lons[0]), float(self.lons[-1])],
            spatial_resolution=getattr(self.dataset, "spatial_resolution", "0.5 degree rectilinear")
        )

    def slice_data(
        self,
        variable: str,
        time_idx: int = 0,
        depth: float = 0.0,
        lat_min: Optional[float] = None,
        lat_max: Optional[float] = None,
        lon_min: Optional[float] = None,
        lon_max: Optional[float] = None
    ) -> OceanDataSliceResponse:
        """
        Extracts a 2D horizontal slice of ocean data at the nearest depth and time.
        Serializes missing values/land mask as JSON null (None).
        """
        if not self.is_loaded():
            self.load_dataset()

        assert self.dataset is not None

        # 1. Validate variable
        valid_vars = ["temperature", "salinity", "currents", "u_current", "v_current"]
        if variable not in valid_vars:
            raise ValueError(f"Unsupported variable '{variable}'. Supported: {valid_vars}")

        # 2. Validate time index
        if time_idx < 0 or time_idx >= len(self.times):
            raise ValueError(f"time_idx {time_idx} out of range [0..{len(self.times)-1}]")

        # 3. Resolve nearest depth
        depth_idx = int(np.argmin(np.abs(self.depths - depth)))
        selected_depth = float(self.depths[depth_idx])

        # 4. Resolve spatial bounding box
        j_min = 0
        j_max = len(self.lats) - 1
        i_min = 0
        i_max = len(self.lons) - 1

        if lat_min is not None:
            if lat_min > float(self.lats[-1]):
                raise ValueError(f"lat_min {lat_min} is north of domain boundary {self.lats[-1]}")
            j_min = int(np.searchsorted(self.lats, lat_min, side='left'))
            j_min = max(0, min(len(self.lats)-1, j_min))

        if lat_max is not None:
            if lat_max < float(self.lats[0]):
                raise ValueError(f"lat_max {lat_max} is south of domain boundary {self.lats[0]}")
            j_max = int(np.searchsorted(self.lats, lat_max, side='right')) - 1
            j_max = max(0, min(len(self.lats)-1, j_max))

        if j_min > j_max:
            raise ValueError(f"Invalid latitude range: min ({lat_min}) > max ({lat_max})")

        if lon_min is not None:
            if lon_min > float(self.lons[-1]):
                raise ValueError(f"lon_min {lon_min} is east of domain boundary {self.lons[-1]}")
            i_min = int(np.searchsorted(self.lons, lon_min, side='left'))
            i_min = max(0, min(len(self.lons)-1, i_min))

        if lon_max is not None:
            if lon_max < float(self.lons[0]):
                raise ValueError(f"lon_max {lon_max} is west of domain boundary {self.lons[0]}")
            i_max = int(np.searchsorted(self.lons, lon_max, side='right')) - 1
            i_max = max(0, min(len(self.lons)-1, i_max))

        if i_min > i_max:
            raise ValueError(f"Invalid longitude range: min ({lon_min}) > max ({lon_max})")

        sliced_lats = self.lats[j_min:j_max+1].tolist()
        sliced_lons = self.lons[i_min:i_max+1].tolist()

        # 5. Extract numerical slice
        units = "degC"
        u_matrix = None
        v_matrix = None

        if variable == "currents":
            u_raw = self.dataset.variables["u_current"][time_idx, depth_idx, j_min:j_max+1, i_min:i_max+1]
            v_raw = self.dataset.variables["v_current"][time_idx, depth_idx, j_min:j_max+1, i_min:i_max+1]
            speed = np.sqrt(u_raw**2 + v_raw**2)
            data_arr = speed
            units = "m/s"
            u_arr = u_raw
            v_arr = v_raw
        else:
            data_arr = self.dataset.variables[variable][time_idx, depth_idx, j_min:j_max+1, i_min:i_max+1]
            if variable == "salinity":
                units = "PSU"
            elif variable in ["u_current", "v_current"]:
                units = "m/s"

        # 6. Sanitize to JSON-serializable list of lists with None for masked/fill values
        def sanitize_2d(arr):
            rows = []
            valid_vals = []
            for j in range(arr.shape[0]):
                row = []
                for i in range(arr.shape[1]):
                    val = arr[j, i]
                    if np.ma.is_masked(val) or np.isnan(val) or val == -999.0 or np.isinf(val):
                        row.append(None)
                    else:
                        clean_val = round(float(val), 4)
                        row.append(clean_val)
                        valid_vals.append(clean_val)
                rows.append(row)
            return rows, valid_vals

        matrix, valid_values = sanitize_2d(data_arr)

        if variable == "currents":
            u_matrix, _ = sanitize_2d(u_arr)
            v_matrix, _ = sanitize_2d(v_arr)

        ny = len(sliced_lats)
        nx = len(sliced_lons)
        total_pts = ny * nx
        valid_count = len(valid_values)
        missing_count = total_pts - valid_count

        min_val = min(valid_values) if valid_values else None
        max_val = max(valid_values) if valid_values else None

        return OceanDataSliceResponse(
            variable=variable,
            units=units,
            time_idx=time_idx,
            timestamp=self.time_timestamps[time_idx],
            requested_depth=float(depth),
            selected_depth=selected_depth,
            shape=[ny, nx],
            lats=sliced_lats,
            lons=sliced_lons,
            values=matrix,
            u_values=u_matrix,
            v_values=v_matrix,
            min_val=min_val,
            max_val=max_val,
            missing_count=missing_count,
            valid_count=valid_count
        )

    def get_insitu_profiles(self) -> List[Dict[str, Any]]:
        """Returns all in-situ observation profiles."""
        if not self.argo_path.exists():
            raise FileNotFoundError(f"In-situ observation data not found at {self.argo_path}")
        with open(self.argo_path, "r", encoding="utf-8") as f:
            return json.load(f)

ocean_service = OceanDataService()
