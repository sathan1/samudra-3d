"""
SAMUDRA-3D In-situ Observation Service
Authority: Master Handbook physical pp. 4, 6, 9-11, 13; roadmap p. 10 (SIH26067)
"""
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import json
from backend.app.core.config import settings
from backend.app.schemas.insitu import (
    QCFlagSummary,
    ArgoProfileMetadata,
    ArgoProfileSummary,
    ArgoProfileDetail,
    GliderWaypoint,
    GliderTransectSummary,
    GliderTransectDetail,
    InsituStatusResponse
)

# Standard Indian Ocean domain bounds
DOMAIN_LAT_MIN = -30.0
DOMAIN_LAT_MAX = 30.0
DOMAIN_LON_MIN = 30.0
DOMAIN_LON_MAX = 120.0

# Pressure to Depth conversion factor (UNESCO 1983 standard ocean approximation)
# 1 dbar ~ 0.992 meters in tropical/subtropical oceans
PRESSURE_TO_DEPTH_FACTOR = 0.992

class InsituDataService:
    def __init__(
        self,
        argo_path: Path = settings.ARGO_PATH,
        real_sample_path: Path = settings.SAMPLE_DATA_DIR / "real_argo_sample.json",
        glider_path: Path = settings.SAMPLE_DATA_DIR / "glider_transects.json",
        real_glider_path: Path = settings.SAMPLE_DATA_DIR / "real_glider_sample.json"
    ):
        self.argo_path = argo_path
        self.real_sample_path = real_sample_path
        self.glider_path = glider_path
        self.real_glider_path = real_glider_path

        self.synthetic_profiles: List[Dict[str, Any]] = []
        self.real_profiles: List[Dict[str, Any]] = []
        self._profiles_by_id: Dict[str, Dict[str, Any]] = {}

        self.synthetic_gliders: List[Dict[str, Any]] = []
        self.real_gliders: List[Dict[str, Any]] = []
        self._gliders_by_id: Dict[str, Dict[str, Any]] = {}

        self.load_observations()

    def is_in_domain(self, lat: float, lon: float) -> bool:
        """Verifies if coordinates fall within Indian Ocean domain bounds."""
        return (DOMAIN_LAT_MIN <= lat <= DOMAIN_LAT_MAX) and (DOMAIN_LON_MIN <= lon <= DOMAIN_LON_MAX)

    def compute_qc_summary(self, qc_flags: List[int]) -> QCFlagSummary:
        """Computes statistical summary of WMO Argo/Glider QC flags (1=good, 2=probably good, 3=bad, 4=outlier)."""
        good = sum(1 for f in qc_flags if f == 1)
        probably_good = sum(1 for f in qc_flags if f == 2)
        bad = sum(1 for f in qc_flags if f in (3, 4))
        missing = sum(1 for f in qc_flags if f == 9)
        total = len(qc_flags)
        pass_rate = round(((good + probably_good) / total * 100.0), 1) if total > 0 else 0.0
        return QCFlagSummary(
            good=good,
            probably_good=probably_good,
            bad=bad,
            missing=missing,
            total=total,
            pass_rate_pct=pass_rate
        )

    def normalize_profile(self, raw: Dict[str, Any], default_source_mode: str = "SYNTHETIC") -> Optional[Dict[str, Any]]:
        """Normalizes raw profile records with domain verification, QC analysis, and pressure-to-depth conversion."""
        profile_id = raw.get("id")
        lat = raw.get("lat")
        lon = raw.get("lon")

        if not profile_id or lat is None or lon is None:
            return None

        # Domain boundary check
        if not self.is_in_domain(lat, lon):
            return None

        # Pressure to depth conversion if depths not provided directly
        depths = raw.get("depths")
        if not depths and "pressure" in raw:
            depths = [round(p * PRESSURE_TO_DEPTH_FACTOR, 2) for p in raw["pressure"]]

        if not depths:
            depths = [0.0]

        temps = raw.get("temperature", [])
        sals = raw.get("salinity", [])
        qc_flags = raw.get("qc_flags", [1] * len(depths))

        qc_summary = self.compute_qc_summary(qc_flags)
        metadata = raw.get("metadata", {})
        source_mode = metadata.get("source_mode", default_source_mode)

        wmo_id = metadata.get("wmo_id") or raw.get("wmo_id")
        if not wmo_id and "ARGO_" in profile_id:
            wmo_id = profile_id.replace("ARGO_", "").split("_")[0]

        surface_temp = temps[0] if temps else None
        surface_sal = sals[0] if sals else None
        max_depth = max(depths) if depths else 0.0

        return {
            "id": profile_id,
            "platform_type": raw.get("platform_type", "argo"),
            "name": raw.get("name", f"Sensor {profile_id}"),
            "wmo_id": wmo_id,
            "lat": float(lat),
            "lon": float(lon),
            "timestamp": raw.get("timestamp", datetime.now(timezone.utc).isoformat()),
            "depths": depths,
            "temperature": temps,
            "salinity": sals,
            "qc_flags": qc_flags,
            "qc_summary": qc_summary.model_dump(),
            "max_depth": max_depth,
            "num_levels": len(depths),
            "surface_temp": surface_temp,
            "surface_salinity": surface_sal,
            "metadata": metadata,
            "source_mode": source_mode
        }

    def normalize_glider_transect(self, raw: Dict[str, Any], default_source_mode: str = "SYNTHETIC") -> Optional[Dict[str, Any]]:
        """Normalizes underwater glider mission transect data with 3D waypoints and dive cycles."""
        glider_id = raw.get("id")
        lat = raw.get("lat")
        lon = raw.get("lon")

        if not glider_id or lat is None or lon is None:
            return None

        if not self.is_in_domain(lat, lon):
            return None

        waypoints = raw.get("waypoints", [])
        clean_waypoints = []
        for wp in waypoints:
            w_lat = wp.get("lat")
            w_lon = wp.get("lon")
            if w_lat is None or w_lon is None:
                continue
            if not self.is_in_domain(w_lat, w_lon):
                continue
            
            w_depth = wp.get("depth")
            if w_depth is None and "pressure_dbar" in wp:
                w_depth = round(wp["pressure_dbar"] * PRESSURE_TO_DEPTH_FACTOR, 2)

            clean_waypoints.append({
                "waypoint_index": wp.get("waypoint_index", len(clean_waypoints)),
                "timestamp": wp.get("timestamp", raw.get("timestamp")),
                "lat": float(w_lat),
                "lon": float(w_lon),
                "depth": w_depth,
                "pressure_dbar": wp.get("pressure_dbar"),
                "temperature": wp.get("temperature"),
                "salinity": wp.get("salinity"),
                "qc_flag": wp.get("qc_flag", 1),
                "phase": wp.get("phase", "dive"),
                "dive_number": wp.get("dive_number", 1)
            })

        metadata = raw.get("metadata", {})
        source_mode = metadata.get("source_mode", default_source_mode)
        qc_flags = raw.get("qc_flags") or [wp["qc_flag"] for wp in clean_waypoints]
        qc_summary = self.compute_qc_summary(qc_flags)

        depths = raw.get("depths")
        if not depths:
            depths = sorted(list({wp["depth"] for wp in clean_waypoints if wp["depth"] is not None}))

        temps = raw.get("temperature")
        sals = raw.get("salinity")

        return {
            "id": glider_id,
            "platform_type": "glider",
            "name": raw.get("name", f"Glider {glider_id}"),
            "wmo_id": raw.get("wmo_id") or metadata.get("wmo_id"),
            "model": raw.get("model") or metadata.get("glider_model", "Slocum / Seaglider"),
            "mission": raw.get("mission") or metadata.get("mission", "Ocean Transect"),
            "lat": float(lat),
            "lon": float(lon),
            "timestamp": raw.get("timestamp", datetime.now(timezone.utc).isoformat()),
            "total_dives": raw.get("total_dives", 1),
            "max_depth": raw.get("max_depth", 1000.0),
            "total_waypoints": len(clean_waypoints),
            "surface_temp": raw.get("surface_temp"),
            "surface_salinity": raw.get("surface_salinity"),
            "depths": depths,
            "temperature": temps or [],
            "salinity": sals or [],
            "qc_flags": qc_flags,
            "qc_summary": qc_summary.model_dump(),
            "waypoints": clean_waypoints,
            "metadata": metadata,
            "source_mode": source_mode
        }

    def load_observations(self):
        """Loads and normalizes observation files (Argo floats and glider transects)."""
        self.synthetic_profiles = []
        self.real_profiles = []
        self._profiles_by_id = {}

        self.synthetic_gliders = []
        self.real_gliders = []
        self._gliders_by_id = {}
        seen_ids = set()

        # 1. Load primary synthetic dataset (4 profiles for backward compatibility)
        if self.argo_path.exists():
            with open(self.argo_path, "r", encoding="utf-8") as f:
                raw_list = json.load(f)
                for item in raw_list:
                    pid = item.get("id")
                    if pid in seen_ids:
                        continue
                    norm = self.normalize_profile(item, default_source_mode="SYNTHETIC")
                    if norm:
                        self.synthetic_profiles.append(norm)
                        self._profiles_by_id[norm["id"]] = norm
                        seen_ids.add(norm["id"])

        # 2. Load documented real local argo sample if available
        if self.real_sample_path.exists():
            with open(self.real_sample_path, "r", encoding="utf-8") as f:
                item = json.load(f)
                pid = item.get("id")
                if pid not in seen_ids:
                    norm = self.normalize_profile(item, default_source_mode="REAL_LOCAL")
                    if norm:
                        self.real_profiles.append(norm)
                        self._profiles_by_id[norm["id"]] = norm
                        seen_ids.add(norm["id"])

        # 3. Load synthetic glider transects
        if self.glider_path.exists():
            with open(self.glider_path, "r", encoding="utf-8") as f:
                raw_gliders = json.load(f)
                for item in raw_gliders:
                    norm = self.normalize_glider_transect(item, default_source_mode="SYNTHETIC")
                    if norm:
                        self.synthetic_gliders.append(norm)
                        self._gliders_by_id[norm["id"]] = norm
                        self._profiles_by_id[norm["id"]] = norm

        # 4. Load documented real local glider sample
        if self.real_glider_path.exists():
            with open(self.real_glider_path, "r", encoding="utf-8") as f:
                item = json.load(f)
                norm = self.normalize_glider_transect(item, default_source_mode="REAL_LOCAL")
                if norm:
                    self.real_gliders.append(norm)
                    self._gliders_by_id[norm["id"]] = norm
                    self._profiles_by_id[norm["id"]] = norm

    def get_all_profiles(
        self,
        platform_type: Optional[str] = None,
        qc_filter: bool = False,
        source_mode: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Returns normalized profiles.
        Default (source_mode is None or 'SYNTHETIC') preserves exactly the 4 primary profiles.
        If source_mode='REAL_LOCAL', returns real profiles.
        If source_mode='ALL', returns union.
        """
        if source_mode == "REAL_LOCAL":
            res = list(self.real_profiles)
        elif source_mode == "ALL":
            res = list(self.synthetic_profiles) + list(self.real_profiles)
        else:
            res = list(self.synthetic_profiles)

        if platform_type:
            res = [p for p in res if p.get("platform_type") == platform_type]
        if qc_filter:
            res = [p for p in res if p.get("qc_summary", {}).get("pass_rate_pct", 100) >= 90.0]
        return res

    def get_argo_profiles(
        self,
        qc_filter: bool = False,
        source_mode: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Specialized retrieval of Argo float profiles."""
        return self.get_all_profiles(platform_type="argo", qc_filter=qc_filter, source_mode=source_mode)

    def get_glider_transects(
        self,
        qc_filter: bool = False,
        source_mode: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieval of underwater glider transects."""
        if source_mode == "REAL_LOCAL":
            res = list(self.real_gliders)
        elif source_mode == "ALL":
            res = list(self.synthetic_gliders) + list(self.real_gliders)
        else:
            res = list(self.synthetic_gliders)

        if qc_filter:
            res = [g for g in res if g.get("qc_summary", {}).get("pass_rate_pct", 100) >= 90.0]
        return res

    def get_glider_by_id(self, glider_id: str) -> Optional[Dict[str, Any]]:
        """Returns single glider transect detail by identifier."""
        return self._gliders_by_id.get(glider_id)

    def get_profile_by_id(self, profile_id: str) -> Optional[Dict[str, Any]]:
        """Returns single profile or glider by identifier."""
        return self._profiles_by_id.get(profile_id)

    def get_status(self) -> InsituStatusResponse:
        """Returns operational telemetry, ingestion summary, and ERDDAP integration status."""
        all_profs = self.synthetic_profiles + self.real_profiles
        argo_count = sum(1 for p in all_profs if p.get("platform_type") == "argo")
        
        all_gliders = self.synthetic_gliders + self.real_gliders
        glider_count = len(all_gliders)
        synthetic_count = len(self.synthetic_profiles)
        real_count = len(self.real_profiles)

        return InsituStatusResponse(
            status="operational",
            total_profiles=len(all_profs),
            argo_count=argo_count,
            glider_count=glider_count,
            synthetic_count=synthetic_count,
            real_sample_count=real_count,
            erddap_live_feed="OFFLINE_INTEGRATION_GAP (Local synthetic & real samples active; external live INCOIS ERDDAP requires network feed)",
            data_centre="INCOIS-DAC",
            timestamp=datetime.now(timezone.utc).isoformat()
        )

insitu_service = InsituDataService()
