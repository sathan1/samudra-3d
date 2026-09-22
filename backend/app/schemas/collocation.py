"""
SAMUDRA-3D Model vs In-situ Collocation & Bias Analytics Schemas
Authority: Master Handbook physical pp. 5-6, 9-11, 13; roadmap row 13 (SIH26067)
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class CollocationLevel(BaseModel):
    depth: float = Field(..., description="Depth level in metres (positive-down)")
    observed_value: Optional[float] = Field(None, description="In-situ physical observation measurement")
    model_value: Optional[float] = Field(None, description="Co-located trilinear interpolated model value")
    delta: Optional[float] = Field(None, description="Residual delta = MODEL - OBSERVED (negative means under-prediction)")
    valid: bool = Field(True, description="Whether this depth pair passed QC and domain mask checks")
    rejection_reason: Optional[str] = Field(None, description="Reason if pair rejected (BAD_QC_FLAG, MASKED_LAND, OUT_OF_BOUNDS)")
    qc_flag: int = Field(1, description="WMO observation QC flag (1=good, 2=probably good, 3/4=bad)")

class CollocationSummary(BaseModel):
    variable: str = Field(..., description="Variable name (temperature or salinity)")
    unit: str = Field(..., description="Measurement unit (degC or PSU)")
    total_levels: int = Field(..., description="Total observation depth levels")
    valid_pairs: int = Field(..., description="Count of valid, unmasked matched pairs")
    bias: Optional[float] = Field(None, description="Mean error: sum(MODEL - OBSERVED) / N")
    mae: Optional[float] = Field(None, description="Mean absolute error: sum(|MODEL - OBSERVED|) / N")
    rmse: Optional[float] = Field(None, description="Root mean square error: sqrt(sum((MODEL - OBSERVED)^2) / N)")
    correlation_r: Optional[float] = Field(None, description="Pearson product-moment correlation coefficient R between model and observed values. Computed only when n >= 3 valid pairs; None otherwise.")
    min_delta: Optional[float] = Field(None, description="Minimum residual delta")
    max_delta: Optional[float] = Field(None, description="Maximum residual delta")
    prediction_tendency: str = Field("neutral", description="under-prediction, over-prediction, or neutral")
    temporal_offset_hours: float = Field(0.0, description="Temporal separation between observation and model slice (hours)")
    spatial_distance_km: float = Field(0.0, description="Spatial offset to nearest model grid node (km)")
    interpolation_method: str = Field("trilinear", description="Spatial interpolation method applied")
    time_strategy: str = Field("linear", description="Temporal interpolation strategy applied (linear or nearest)")
    provenance: str = Field("INCOIS ROMS Numerical Simulation (CF-1.8)", description="Model dataset origin")

class ProfileCollocationResponse(BaseModel):
    profile_id: str = Field(..., description="In-situ platform identifier (Argo WMO or Glider mission)")
    platform_type: str = Field("argo", description="Platform type (argo or glider)")
    name: Optional[str] = Field(None, description="Sensor name or mission description")
    lat: float = Field(..., description="Observation latitude (deg N)")
    lon: float = Field(..., description="Observation longitude (deg E)")
    timestamp: str = Field(..., description="Observation timestamp (ISO-8601 UTC)")
    temperature: Optional[CollocationSummary] = Field(None, description="Potential Temperature collocation metrics")
    salinity: Optional[CollocationSummary] = Field(None, description="Practical Salinity collocation metrics")
    temperature_levels: List[CollocationLevel] = Field(default_factory=list, description="Level-by-level temperature collocation")
    salinity_levels: List[CollocationLevel] = Field(default_factory=list, description="Level-by-level salinity collocation")
    model_health: str = Field("GOOD", description="Overall skill assessment (EXCELLENT, GOOD, ACCEPTABLE, REQUIRES_CALIBRATION)")
    model_health_description: str = Field(..., description="Detailed narrative explanation of model skill")
    latency_ms: float = Field(0.0, description="Collocation computation time in milliseconds")

class GliderWaypointCollocation(BaseModel):
    waypoint_index: int
    lat: float
    lon: float
    depth: float
    timestamp: str
    observed_temp: Optional[float] = None
    model_temp: Optional[float] = None
    delta_temp: Optional[float] = None
    observed_sal: Optional[float] = None
    model_sal: Optional[float] = None
    delta_sal: Optional[float] = None
    valid: bool = True

class GliderCollocationResponse(BaseModel):
    glider_id: str
    name: str
    total_waypoints: int
    matched_waypoints: int
    temperature_summary: Optional[CollocationSummary] = None
    salinity_summary: Optional[CollocationSummary] = None
    waypoints: List[GliderWaypointCollocation] = []
    latency_ms: float = 0.0

class CollocationHealthResponse(BaseModel):
    status: str = "operational"
    engine: str = "SAMUDRA-3D 4D Spatio-Temporal Collocation Engine"
    interpolation: str = "3D Rectilinear Trilinear Spatial + Bounding Linear Temporal"
    sign_convention: str = "delta = MODEL - OBSERVED (negative = under-prediction, positive = over-prediction)"
    supported_variables: List[str] = ["temperature", "salinity"]
    grid_type: str = "rectilinear"
    domain_bounds: Dict[str, Any]
    affine_verification_passed: bool = True
