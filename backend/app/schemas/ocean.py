from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str = Field(..., example="healthy")
    dataset_loaded: bool = Field(..., example=True)
    variables_available: List[str] = Field(..., example=["temperature", "salinity", "currents"])
    dataset_path: str
    timestamp: str

class VariableMetadata(BaseModel):
    name: str
    long_name: str
    units: str
    standard_name: Optional[str] = None
    valid_range: Optional[List[float]] = None

class OceanMetadataResponse(BaseModel):
    title: str
    conventions: str
    institution: str
    source: str
    synthetic: bool
    dimensions: Dict[str, int]
    variables: Dict[str, VariableMetadata]
    time_steps_hours: List[float]
    time_timestamps: List[str]
    depth_levels_m: List[float]
    lat_bounds: List[float] = Field(..., example=[0.0, 25.0])
    lon_bounds: List[float] = Field(..., example=[65.0, 95.0])
    spatial_resolution: str

class OceanDataSliceResponse(BaseModel):
    variable: str
    units: str
    time_idx: int
    timestamp: str
    requested_depth: float
    selected_depth: float
    shape: List[int]
    lats: List[float]
    lons: List[float]
    values: List[List[Optional[float]]]
    u_values: Optional[List[List[Optional[float]]]] = None
    v_values: Optional[List[List[Optional[float]]]] = None
    min_val: Optional[float] = None
    max_val: Optional[float] = None
    missing_count: int
    valid_count: int
