from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, Any, List
import json
import math
import numpy as np
import netCDF4 as nc
from scipy.interpolate import RegularGridInterpolator
from scipy import ndimage
from scipy.integrate import trapezoid
from backend.app.core.config import settings
from backend.app.schemas.ocean import (
    OceanMetadataResponse,
    VariableMetadata,
    OceanDataSliceResponse,
    OceanProbeResponse,
    OceanTransectResponse,
    NearestObservationSummary
)

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two geographic coordinates in kilometres."""
    r_earth = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r_earth * c

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
        self._interpolator_cache: Dict[Tuple[str, int], RegularGridInterpolator] = {}

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

    def calculate_derived_metrics(self, depths: np.ndarray, temps: np.ndarray) -> Dict[str, Any]:
        """
        Calculates key physical oceanographic metrics:
        - MLD (Mixed Layer Depth): depth where T <= T(0) - 0.5 degC
        - D20: Depth of 20 degC isotherm (main thermocline depth)
        - D26: Depth of 26 degC isotherm
        - TCHP: Tropical Cyclone Heat Potential (kJ/cm^2) = rho * cp * integral_0^{D26} (T - 26) dz / 10^7
        """
        # Filter and sanitize valid (depth, temperature) pairs
        clean_z: List[float] = []
        clean_t: List[float] = []
        for z, t in zip(depths, temps):
            if z is not None and t is not None:
                try:
                    fz, ft = float(z), float(t)
                    if not (math.isnan(fz) or math.isnan(ft)):
                        clean_z.append(fz)
                        clean_t.append(ft)
                except (ValueError, TypeError):
                    continue

        if len(clean_z) < 2:
            return {
                "mld": None,
                "d20": None,
                "d26": None,
                "tchp": None,
                "tchp_category": None
            }

        depths = np.array(clean_z, dtype=np.float64)
        temps = np.array(clean_t, dtype=np.float64)
        t0 = float(temps[0])

        # 1. Mixed Layer Depth (depth where T <= T(0) - 0.5 degC)
        mld = None
        target_mld_t = t0 - 0.5
        for k in range(1, len(depths)):
            if temps[k] <= target_mld_t:
                z0, z1 = float(depths[k-1]), float(depths[k])
                t_prev, t_curr = float(temps[k-1]), float(temps[k])
                if abs(t_curr - t_prev) > 1e-6:
                    mld = z0 + (target_mld_t - t_prev) / (t_curr - t_prev) * (z1 - z0)
                else:
                    mld = z0
                break
        if mld is not None:
            mld = round(float(mld), 2)

        # 2. Thermocline depth D20 (depth where T = 20.0 degC)
        d20 = None
        if t0 <= 20.0:
            d20 = 0.0
        else:
            for k in range(1, len(depths)):
                if temps[k] <= 20.0:
                    z0, z1 = float(depths[k-1]), float(depths[k])
                    t_prev, t_curr = float(temps[k-1]), float(temps[k])
                    if abs(t_curr - t_prev) > 1e-6:
                        d20 = z0 + (20.0 - t_prev) / (t_curr - t_prev) * (z1 - z0)
                    else:
                        d20 = z0
                    break
        if d20 is not None:
            d20 = round(float(d20), 2)

        # 3. 26 degC isotherm depth D26
        d26 = None
        if t0 < 26.0:
            d26 = 0.0
        else:
            for k in range(1, len(depths)):
                if temps[k] <= 26.0:
                    z0, z1 = float(depths[k-1]), float(depths[k])
                    t_prev, t_curr = float(temps[k-1]), float(temps[k])
                    if abs(t_curr - t_prev) > 1e-6:
                        d26 = z0 + (26.0 - t_prev) / (t_curr - t_prev) * (z1 - z0)
                    else:
                        d26 = z0
                    break
        if d26 is not None:
            d26 = round(float(d26), 2)

        # 4. TCHP (Tropical Cyclone Heat Potential)
        tchp = None
        category = "Low"
        if t0 >= 26.0 and d26 is not None and d26 > 0.0:
            sub_z = []
            sub_t = []
            for z, t in zip(depths, temps):
                if z < d26:
                    sub_z.append(float(z))
                    sub_t.append(float(t))
                else:
                    break
            sub_z.append(d26)
            sub_t.append(26.0)

            if len(sub_z) >= 2:
                delta_t = np.array(sub_t) - 26.0
                integral = float(trapezoid(delta_t, sub_z))
                rho_cp = 1025.0 * 3985.0
                val = (rho_cp * integral) / 1e7  # kJ / cm^2
                tchp = round(val, 2)
                if tchp < 50.0:
                    category = "Low"
                elif tchp < 80.0:
                    category = "Moderate"
                elif tchp < 110.0:
                    category = "High"
                else:
                    category = "Severe"
            else:
                tchp = 0.0
                category = "Low"
        else:
            tchp = 0.0
            category = "Low"

        return {
            "mld": mld,
            "d20": d20,
            "d26": d26,
            "tchp": tchp,
            "tchp_category": category
        }

    def _get_interpolator(self, variable: str, time_idx: int) -> RegularGridInterpolator:
        if not self.is_loaded():
            self.load_dataset()
        assert self.dataset is not None

        cache_key = (variable, time_idx)
        if cache_key in self._interpolator_cache:
            return self._interpolator_cache[cache_key]

        raw_data = self.dataset.variables[variable][time_idx, :, :, :]
        filled_3d = np.zeros_like(raw_data.data, dtype=np.float64)

        for k in range(len(self.depths)):
            layer = raw_data[k, :, :]
            mask = np.ma.getmaskarray(layer)
            if np.any(mask):
                ind = ndimage.distance_transform_edt(mask, return_distances=False, return_indices=True)
                filled_3d[k] = layer.data[tuple(ind)]
            else:
                filled_3d[k] = layer.data

        rgi = RegularGridInterpolator(
            (self.depths, self.lats, self.lons),
            filled_3d,
            bounds_error=False,
            fill_value=None
        )
        self._interpolator_cache[cache_key] = rgi
        return rgi

    def probe_water_column(
        self,
        lat: float,
        lon: float,
        time_idx: int = 0
    ) -> OceanProbeResponse:
        """
        Evaluates vertical water column across all 9 depths using scipy.interpolate.RegularGridInterpolator.
        Returns SST, SSS, Mixed Layer Depth, D20, D26, TCHP, and nearest observation within 200km.
        """
        if not self.is_loaded():
            self.load_dataset()
        assert self.dataset is not None

        if time_idx < 0 or time_idx >= len(self.times):
            raise ValueError(f"time_idx {time_idx} out of range [0..{len(self.times)-1}]")

        lat_min, lat_max = float(self.lats[0]), float(self.lats[-1])
        lon_min, lon_max = float(self.lons[0]), float(self.lons[-1])

        if lat < lat_min or lat > lat_max or lon < lon_min or lon > lon_max:
            raise ValueError(f"Coordinates ({lat}, {lon}) outside domain bounds [lat: {lat_min}..{lat_max}, lon: {lon_min}..{lon_max}].")

        nearest_j = int(np.argmin(np.abs(self.lats - lat)))
        nearest_i = int(np.argmin(np.abs(self.lons - lon)))
        surface_mask = np.ma.getmaskarray(self.dataset.variables["temperature"][time_idx, 0, :, :])
        is_land = bool(surface_mask[nearest_j, nearest_i])

        pts = np.column_stack([self.depths, np.full(len(self.depths), lat), np.full(len(self.depths), lon)])

        t_rgi = self._get_interpolator("temperature", time_idx)
        s_rgi = self._get_interpolator("salinity", time_idx)
        u_rgi = self._get_interpolator("u_current", time_idx)
        v_rgi = self._get_interpolator("v_current", time_idx)

        t_interp = t_rgi(pts)
        s_interp = s_rgi(pts)
        u_interp = u_rgi(pts)
        v_interp = v_rgi(pts)
        sp_interp = np.sqrt(u_interp**2 + v_interp**2)

        t_vals = [round(float(v), 3) for v in t_interp]
        s_vals = [round(float(v), 3) for v in s_interp]
        u_vals = [round(float(v), 3) for v in u_interp]
        v_vals = [round(float(v), 3) for v in v_interp]
        sp_vals = [round(float(v), 3) for v in sp_interp]

        metrics = self.calculate_derived_metrics(self.depths, t_interp)

        # Collocate nearest observation platform within 200km
        from backend.app.services.insitu_service import insitu_service
        all_profs = insitu_service.get_all_profiles(source_mode="ALL")
        all_gliders = insitu_service.get_glider_transects(source_mode="ALL")
        candidates = list(all_profs) + list(all_gliders)

        nearest_obs = None
        min_dist = float("inf")
        nearest_p = None

        for p in candidates:
            p_lat = p.get("lat")
            p_lon = p.get("lon")
            if p_lat is not None and p_lon is not None:
                d_km = haversine_km(lat, lon, float(p_lat), float(p_lon))
                if d_km < min_dist:
                    min_dist = d_km
                    nearest_p = p

        if nearest_p is not None and min_dist <= 200.0:
            nearest_obs = NearestObservationSummary(
                id=nearest_p["id"],
                name=nearest_p.get("name", nearest_p["id"]),
                platform_type=nearest_p.get("platform_type", "argo"),
                lat=float(nearest_p["lat"]),
                lon=float(nearest_p["lon"]),
                distance_km=round(min_dist, 1),
                timestamp=nearest_p.get("timestamp", ""),
                depths=nearest_p.get("depths", []),
                temperature=nearest_p.get("temperature", []),
                salinity=nearest_p.get("salinity", []),
                qc_summary=nearest_p.get("qc_summary")
            )

        return OceanProbeResponse(
            lat=lat,
            lon=lon,
            time_idx=time_idx,
            timestamp=self.time_timestamps[time_idx],
            is_land=is_land,
            depths=self.depths.tolist(),
            temperature=t_vals,
            salinity=s_vals,
            u_current=u_vals,
            v_current=v_vals,
            current_speed=sp_vals,
            sst=t_vals[0] if t_vals else None,
            sss=s_vals[0] if s_vals else None,
            surface_current_speed=sp_vals[0] if sp_vals else None,
            mld=metrics["mld"],
            d20=metrics["d20"],
            d26=metrics["d26"],
            tchp=metrics["tchp"],
            tchp_category=metrics["tchp_category"],
            nearest_observation=nearest_obs
        )

    def extract_transect(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float,
        variable: str = "temperature",
        time_idx: int = 0
    ) -> OceanTransectResponse:
        """
        Interpolates 100 points along the transect across all 9 depth levels.
        Returns a 2D distance-depth matrix for ODV-style vertical cross-section plotting,
        along with along-transect MLD, D20, and TCHP profiles.
        """
        if not self.is_loaded():
            self.load_dataset()
        assert self.dataset is not None

        valid_vars = ["temperature", "salinity", "currents", "u_current", "v_current"]
        if variable not in valid_vars:
            raise ValueError(f"Unsupported variable '{variable}'. Supported: {valid_vars}")

        if time_idx < 0 or time_idx >= len(self.times):
            raise ValueError(f"time_idx {time_idx} out of range [0..{len(self.times)-1}]")

        lat_min, lat_max = float(self.lats[0]), float(self.lats[-1])
        lon_min, lon_max = float(self.lons[0]), float(self.lons[-1])

        for (l_lat, l_lon, label) in [(lat1, lon1, "Start"), (lat2, lon2, "End")]:
            if l_lat < lat_min or l_lat > lat_max or l_lon < lon_min or l_lon > lon_max:
                raise ValueError(f"{label} coordinates ({l_lat}, {l_lon}) outside domain [lat: {lat_min}..{lat_max}, lon: {lon_min}..{lon_max}].")

        num_points = 100
        total_dist_km = haversine_km(lat1, lon1, lat2, lon2)
        distances_km = [round(float(d), 2) for d in np.linspace(0.0, total_dist_km, num_points)]
        transect_lats = np.linspace(lat1, lat2, num_points)
        transect_lons = np.linspace(lon1, lon2, num_points)

        surface_mask = np.ma.getmaskarray(self.dataset.variables["temperature"][time_idx, 0, :, :])
        is_land_points = []
        for i in range(num_points):
            j = int(np.argmin(np.abs(self.lats - transect_lats[i])))
            ix = int(np.argmin(np.abs(self.lons - transect_lons[i])))
            is_land_points.append(bool(surface_mask[j, ix]))

        if variable == "currents":
            u_rgi = self._get_interpolator("u_current", time_idx)
            v_rgi = self._get_interpolator("v_current", time_idx)
            units = "m/s"
        else:
            rgi = self._get_interpolator(variable, time_idx)
            units = "degC" if variable == "temperature" else ("PSU" if variable == "salinity" else "m/s")

        matrix: List[List[Optional[float]]] = []
        all_vals: List[float] = []

        for k in range(len(self.depths)):
            d = self.depths[k]
            pts = np.column_stack([np.full(num_points, d), transect_lats, transect_lons])
            if variable == "currents":
                u_arr = u_rgi(pts)
                v_arr = v_rgi(pts)
                layer_vals = np.sqrt(u_arr**2 + v_arr**2)
            else:
                layer_vals = rgi(pts)

            row: List[Optional[float]] = []
            for i in range(num_points):
                if is_land_points[i]:
                    row.append(None)
                else:
                    v = round(float(layer_vals[i]), 3)
                    row.append(v)
                    all_vals.append(v)
            matrix.append(row)

        # Calculate along-transect MLD, D20, TCHP profiles
        t_rgi = self._get_interpolator("temperature", time_idx)
        mld_profile: List[Optional[float]] = []
        d20_profile: List[Optional[float]] = []
        tchp_profile: List[Optional[float]] = []

        for i in range(num_points):
            if is_land_points[i]:
                mld_profile.append(None)
                d20_profile.append(None)
                tchp_profile.append(None)
            else:
                pts_col = np.column_stack([self.depths, np.full(len(self.depths), transect_lats[i]), np.full(len(self.depths), transect_lons[i])])
                t_col = t_rgi(pts_col)
                m = self.calculate_derived_metrics(self.depths, t_col)
                mld_profile.append(m["mld"])
                d20_profile.append(m["d20"])
                tchp_profile.append(m["tchp"])

        min_val = min(all_vals) if all_vals else None
        max_val = max(all_vals) if all_vals else None

        return OceanTransectResponse(
            lat1=lat1,
            lon1=lon1,
            lat2=lat2,
            lon2=lon2,
            variable=variable,
            units=units,
            time_idx=time_idx,
            timestamp=self.time_timestamps[time_idx],
            num_points=num_points,
            total_distance_km=round(total_dist_km, 2),
            distances_km=distances_km,
            lats=[round(float(y), 4) for y in transect_lats],
            lons=[round(float(x), 4) for x in transect_lons],
            depth_levels=self.depths.tolist(),
            matrix=matrix,
            min_val=min_val,
            max_val=max_val,
            mld_profile=mld_profile,
            d20_profile=d20_profile,
            tchp_profile=tchp_profile
        )

ocean_service = OceanDataService()
