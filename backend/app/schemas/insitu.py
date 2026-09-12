"""
SAMUDRA-3D In-situ Observation Schemas
Authority: Master Handbook physical pp. 4, 6, 9-11, 13; roadmap p. 10 (SIH26067)
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class QCFlagSummary(BaseModel):
    good: int = Field(0, description="Count of good quality measurements (WMO flag 1)")
    probably_good: int = Field(0, description="Count of probably good measurements (WMO flag 2)")
    bad: int = Field(0, description="Count of bad/outlier measurements (WMO flags 3, 4)")
    missing: int = Field(0, description="Count of missing measurements (WMO flag 9)")
    total: int = Field(0, description="Total profile levels")
    pass_rate_pct: float = Field(100.0, description="Percentage of levels passing QC (flags 1 or 2)")

class ArgoProfileMetadata(BaseModel):
    wmo_id: Optional[str] = None
    data_centre: str = "INCOIS-DAC"
    cycle_number: Optional[int] = None
    direction: Optional[str] = "ascending"
    synthetic: bool = True
    source_mode: str = "SYNTHETIC"  # SYNTHETIC, REAL_LOCAL, REAL_ERDDAP
    attribution: str = "Ministry of Earth Sciences (MoES) / INCOIS Indian Ocean Argo Program"
    retrieval_time: Optional[str] = None
    pressure_unit: str = "dbar"
    pressure_to_depth_conversion: str = "depth_m = pressure_dbar * 0.992 (UNESCO standard approximation)"

class ArgoProfileSummary(BaseModel):
    id: str
    platform_type: str = "argo"
    name: str
    wmo_id: Optional[str] = None
    lat: float
    lon: float
    timestamp: str
    max_depth: float
    num_levels: int
    surface_temp: Optional[float] = None
    surface_salinity: Optional[float] = None
    qc_summary: QCFlagSummary
    source_mode: str = "SYNTHETIC"

class ArgoProfileDetail(BaseModel):
    id: str
    platform_type: str = "argo"
    name: str
    wmo_id: Optional[str] = None
    lat: float
    lon: float
    timestamp: str
    max_depth: float
    num_levels: int
    surface_temp: Optional[float] = None
    surface_salinity: Optional[float] = None
    depths: List[float]
    temperature: List[float]
    salinity: List[float]
    qc_flags: List[int]
    qc_summary: QCFlagSummary
    metadata: Dict[str, Any]
    source_mode: str = "SYNTHETIC"

class GliderWaypoint(BaseModel):
    waypoint_index: int
    timestamp: str
    lat: float
    lon: float
    depth: Optional[float] = None
    pressure_dbar: Optional[float] = None
    temperature: Optional[float] = None
    salinity: Optional[float] = None
    qc_flag: int = 1
    phase: str = "dive"  # surface, dive, bottom, climb
    dive_number: int = 1

class GliderTransectSummary(BaseModel):
    id: str
    platform_type: str = "glider"
    name: str
    wmo_id: Optional[str] = None
    model: Optional[str] = None
    mission: Optional[str] = None
    lat: float
    lon: float
    timestamp: str
    total_dives: int
    max_depth: float
    total_waypoints: int
    surface_temp: Optional[float] = None
    surface_salinity: Optional[float] = None
    qc_summary: QCFlagSummary
    source_mode: str = "SYNTHETIC"

class GliderTransectDetail(BaseModel):
    id: str
    platform_type: str = "glider"
    name: str
    wmo_id: Optional[str] = None
    model: Optional[str] = None
    mission: Optional[str] = None
    lat: float
    lon: float
    timestamp: str
    total_dives: int
    max_depth: float
    total_waypoints: int
    surface_temp: Optional[float] = None
    surface_salinity: Optional[float] = None
    depths: List[float]
    temperature: List[float]
    salinity: List[float]
    qc_flags: List[int]
    qc_summary: QCFlagSummary
    waypoints: List[GliderWaypoint]
    metadata: Dict[str, Any]
    source_mode: str = "SYNTHETIC"

class InsituStatusResponse(BaseModel):
    status: str = "operational"
    total_profiles: int
    argo_count: int
    glider_count: int
    synthetic_count: int
    real_sample_count: int
    erddap_live_feed: str
    data_centre: str = "INCOIS-DAC"
    timestamp: str
