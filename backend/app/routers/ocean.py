from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, status
from backend.app.schemas.ocean import (
    HealthResponse,
    OceanMetadataResponse,
    OceanDataSliceResponse
)
from backend.app.services.ocean_service import ocean_service

router = APIRouter(prefix="/api", tags=["Ocean Intelligence"])

@router.get("/health", response_model=HealthResponse, summary="Backend health and dataset readiness check")
def get_health():
    """Returns backend system status and confirms NetCDF dataset load readiness."""
    try:
        if not ocean_service.is_loaded():
            ocean_service.load_dataset()
        dataset_loaded = ocean_service.is_loaded()
    except Exception:
        dataset_loaded = False

    return HealthResponse(
        status="healthy" if dataset_loaded else "degraded",
        dataset_loaded=dataset_loaded,
        variables_available=["temperature", "salinity", "currents", "u_current", "v_current"],
        dataset_path=str(ocean_service.nc_path),
        timestamp=datetime.now(timezone.utc).isoformat()
    )

@router.get("/metadata", response_model=OceanMetadataResponse, summary="Retrieve dataset CF metadata and dimensions")
def get_metadata():
    """
    Returns available variables, coordinate extents, depth levels, and time steps.
    Used by frontend controls to populate selectable options truthfully.
    """
    try:
        return ocean_service.get_metadata()
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ocean dataset unavailable: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reading dataset metadata: {str(e)}"
        )

@router.get("/ocean-data", response_model=OceanDataSliceResponse, summary="Slice 2D ocean field by depth, time, and bounds")
def get_ocean_data(
    variable: str = Query("temperature", description="Target variable (temperature, salinity, currents, u_current, v_current)"),
    time_idx: int = Query(0, ge=0, description="Time index (0 to 7)"),
    depth: float = Query(0.0, ge=0.0, description="Requested depth in meters (0 to 4000)"),
    lat_min: Optional[float] = Query(None, description="Minimum latitude bounding filter"),
    lat_max: Optional[float] = Query(None, description="Maximum latitude bounding filter"),
    lon_min: Optional[float] = Query(None, description="Minimum longitude bounding filter"),
    lon_max: Optional[float] = Query(None, description="Maximum longitude bounding filter")
):
    """
    Slices precomputed numerical ocean model outputs on the backend.
    Returns 2D horizontal field with land points and missing values serialized as JSON null.
    """
    try:
        return ocean_service.slice_data(
            variable=variable,
            time_idx=time_idx,
            depth=depth,
            lat_min=lat_min,
            lat_max=lat_max,
            lon_min=lon_min,
            lon_max=lon_max
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Dataset file missing: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error slicing ocean data: {str(e)}"
        )

