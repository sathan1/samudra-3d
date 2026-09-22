from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, status
from backend.app.schemas.ocean import (
    HealthResponse,
    OceanMetadataResponse,
    OceanDataSliceResponse,
    OceanProbeResponse,
    OceanTransectResponse,
    LocationAvailabilityResponse,
    PointValueResponse,
    ProfileResponse,
    RegionResponse,
    OceanVolumeResponse
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

@router.get("/ocean-data", response_model=OceanDataSliceResponse, summary="Slice 2D ocean field — spatial bounds REQUIRED")
def get_ocean_data(
    variable: str = Query("temperature", description="Target variable (temperature, salinity, currents, u_current, v_current)"),
    time_idx: int = Query(0, ge=0, description="Time index (0 to N-1, from dataset metadata)"),
    depth: float = Query(0.0, ge=0.0, description="Requested depth in meters (from dataset metadata depth_levels_m)"),
    lat_min: float = Query(..., description="REQUIRED minimum latitude bounding filter"),
    lat_max: float = Query(..., description="REQUIRED maximum latitude bounding filter"),
    lon_min: float = Query(..., description="REQUIRED minimum longitude bounding filter"),
    lon_max: float = Query(..., description="REQUIRED maximum longitude bounding filter")
):
    """
    Slices precomputed numerical ocean model outputs on the backend.

    IMPORTANT: Spatial bounds are MANDATORY.  The globe is a coordinate index, not a
    giant container for the entire ocean dataset.  Requests without bounds return HTTP 400
    so that the frontend can never accidentally pull the full 301x601 global grid.

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

@router.get("/ocean/probe", response_model=OceanProbeResponse, summary="Evaluate vertical water column and nearest observation")
@router.get("/probe", response_model=OceanProbeResponse, include_in_schema=False)
def probe_ocean(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude in degrees"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude in degrees"),
    time_idx: int = Query(0, ge=0, description="Forecast time index")
):
    """
    Evaluates vertical water column across all 9 depths using scipy.interpolate.RegularGridInterpolator.
    Returns SST, SSS, Mixed Layer Depth (MLD), Thermocline depth D20, D26, TCHP,
    and nearest observation collocation if within 200km.
    """
    try:
        return ocean_service.probe_water_column(lat=lat, lon=lon, time_idx=time_idx)
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
            detail=f"Error probing water column: {str(e)}"
        )

@router.get("/ocean/transect", response_model=OceanTransectResponse, summary="Interpolate vertical cross-section transect")
@router.get("/transect", response_model=OceanTransectResponse, include_in_schema=False)
def get_ocean_transect(
    lat1: float = Query(..., description="Start latitude"),
    lon1: float = Query(..., description="Start longitude"),
    lat2: float = Query(..., description="End latitude"),
    lon2: float = Query(..., description="End longitude"),
    variable: str = Query("temperature", description="Variable to slice: temperature, salinity, currents, u_current, v_current"),
    time_idx: int = Query(0, ge=0, description="Forecast time index")
):
    """
    Interpolates 100 points along the transect across 9 depth levels,
    returning a 2D distance-depth matrix for ODV-style vertical cross-section plotting,
    along with MLD, D20, and TCHP along-transect profiles.
    """
    try:
        return ocean_service.extract_transect(
            lat1=lat1,
            lon1=lon1,
            lat2=lat2,
            lon2=lon2,
            variable=variable,
            time_idx=time_idx
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
            detail=f"Error extracting ocean transect: {str(e)}"
        )


@router.get("/ocean/thermal-fronts", summary="Extract surface thermal fronts and Potential Fishing Zone (PFZ) boundaries")
def get_thermal_fronts(
    lat_min: float = Query(0.0, description="Minimum latitude"),
    lat_max: float = Query(25.0, description="Maximum latitude"),
    lon_min: float = Query(50.0, description="Minimum longitude"),
    lon_max: float = Query(100.0, description="Maximum longitude")
):
    """
    Computes spatial temperature gradient vector |∇T| across surface SST field
    and returns detected thermal fronts and PFZ probabilities.
    """
    from backend.app.data.satellite_ingest import satellite_manager
    try:
        return satellite_manager.get_surface_thermal_analysis(
            lat_min=lat_min,
            lat_max=lat_max,
            lon_min=lon_min,
            lon_max=lon_max
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error computing thermal fronts: {str(e)}"
        )

@router.get("/ocean/in-depth-analysis", summary="Compute in-depth ocean physics, acoustics, SOFAR axis, buoyancy stability, and water mass identification")
def get_in_depth_analysis(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude in degrees"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude in degrees"),
    time_idx: int = Query(0, ge=0, description="Forecast time index")
):
    """
    Evaluates vertical physical oceanography column:
    - Mackenzie (1981) Sound Velocity Profile & SOFAR Channel Axis
    - UNESCO EOS-80 Potential Density Anomaly & Pycnocline
    - Brunt-Väisälä Buoyancy Frequency N² (Stratification Stability)
    - Regional Indian Ocean Water Mass Fingerprinting
    - Marine Heatwave Subsurface Depth Penetration
    """
    from backend.app.services.depth_analysis import analyze_in_depth_column
    try:
        probe_res = ocean_service.probe_water_column(lat=lat, lon=lon, time_idx=time_idx)
        analysis = analyze_in_depth_column(
            lat=lat,
            lon=lon,
            depths=probe_res.depths,
            temperatures=probe_res.temperature,
            salinities=probe_res.salinity
        )
        analysis["sst"] = probe_res.sst
        analysis["sss"] = probe_res.sss
        analysis["mld"] = probe_res.mld
        analysis["d20"] = probe_res.d20
        analysis["d26"] = probe_res.d26
        analysis["tchp"] = probe_res.tchp
        analysis["tchp_category"] = probe_res.tchp_category
        analysis["nearest_observation"] = probe_res.nearest_observation
        return analysis
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error evaluating in-depth ocean analysis: {str(e)}"
        )

# ──────────────────────────────────────────────────────────────────────────────
# Coordinate-on-Demand API (Master Prompt §6–13, §66)
# The 3D Earth is a spatial index.  The user clicks a coordinate; these endpoints
# return ONLY the small subset of scientific data that was requested.
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/location/availability", response_model=LocationAvailabilityResponse,
            summary="Lightweight data availability at a selected coordinate (no field values)")
def get_location_availability(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude in degrees"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude in degrees")
):
    """
    Returns lightweight metadata about what is available at this coordinate:
    model presence, observation platform availability, variables, depths, and times.

    IMPORTANT: This endpoint NEVER returns the scientific field itself.
    It is the first request after the user selects a point on the globe.
    """
    try:
        return ocean_service.get_availability(lat=lat, lon=lon)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail=f"Dataset file missing: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Error querying availability: {str(e)}")


@router.get("/ocean/point", response_model=PointValueResponse,
            summary="Single model value at (lat, lon, depth, time)")
def get_ocean_point(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude in degrees"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude in degrees"),
    variable: str = Query("temperature", description="Variable name"),
    depth: float = Query(0.0, ge=0.0, description="Depth in metres (use /api/metadata depth_levels_m)"),
    time_idx: int = Query(0, ge=0, description="Time index from dataset metadata")
):
    """
    Returns only the required value and provenance metadata for a single coordinate.
    Payload target: < 10 KB.
    """
    try:
        return ocean_service.get_point(lat=lat, lon=lon, variable=variable, depth=depth, time_idx=time_idx)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail=f"Dataset file missing: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Error querying point value: {str(e)}")


@router.get("/ocean/profile", response_model=ProfileResponse,
            summary="Vertical profile (depth[], value[]) at a selected coordinate")
def get_ocean_profile(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude in degrees"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude in degrees"),
    variable: str = Query("temperature", description="Variable name"),
    time_idx: int = Query(0, ge=0, description="Time index from dataset metadata")
):
    """
    Returns only the depth[] and value[] arrays for the selected coordinate.
    This is far smaller than sending the global horizontal field.
    """
    try:
        return ocean_service.get_profile(lat=lat, lon=lon, variable=variable, time_idx=time_idx)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail=f"Dataset file missing: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Error querying profile: {str(e)}")


@router.get("/ocean/region", response_model=RegionResponse,
            summary="Bounded local 3D region subset for detailed visualization")
def get_ocean_region(
    center_lat: float = Query(..., ge=-90.0, le=90.0, description="Region centre latitude"),
    center_lon: float = Query(..., ge=-180.0, le=180.0, description="Region centre longitude"),
    radius_km: float = Query(25.0, gt=0.0, le=500.0, description="Region radius in kilometres (LOD-based)"),
    variable: str = Query("temperature", description="Variable name"),
    depth_min: float = Query(0.0, ge=0.0, description="Minimum depth in metres"),
    depth_max: float = Query(100.0, ge=0.0, description="Maximum depth in metres"),
    time_idx: int = Query(0, ge=0, description="Time index from dataset metadata")
):
    """
    Returns a bounded 3D region subset — the *detailed* local ocean model.

    This is only called when the user explicitly requests a local 3D view.
    The backend selects the dataset's actual native resolution; it does not invent resolutions.
    """
    try:
        return ocean_service.get_region(
            center_lat=center_lat,
            center_lon=center_lon,
            radius_km=radius_km,
            variable=variable,
            depth_min=depth_min,
            depth_max=depth_max,
            time_idx=time_idx
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail=f"Dataset file missing: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Error querying region: {str(e)}")


@router.get("/ocean/volume", response_model=OceanVolumeResponse,
            summary="Retrieve 3D spatial volume data for volumetric block visualization")
def get_ocean_volume(
    dataset_id: Optional[str] = Query(None, description="Optional dataset ID override"),
    variable: str = Query("temperature", description="Target variable (temperature, salinity, currents, u_current, v_current)"),
    time_idx: int = Query(0, ge=0, description="Time index from dataset metadata"),
    center_lat: Optional[float] = Query(None, description="Center latitude for radial volume query"),
    center_lon: Optional[float] = Query(None, description="Center longitude for radial volume query"),
    radius_km: Optional[float] = Query(None, description="Radius in km for radial volume query"),
    min_lon: Optional[float] = Query(None, description="Minimum longitude bounding filter"),
    max_lon: Optional[float] = Query(None, description="Maximum longitude bounding filter"),
    min_lat: Optional[float] = Query(None, description="Minimum latitude bounding filter"),
    max_lat: Optional[float] = Query(None, description="Maximum latitude bounding filter"),
    depth_min: Optional[float] = Query(None, description="Minimum depth in metres"),
    depth_max: Optional[float] = Query(None, description="Maximum depth in metres"),
    min_depth: Optional[float] = Query(None, description="Minimum depth alias in metres"),
    max_depth: Optional[float] = Query(None, description="Maximum depth alias in metres"),
    max_lon_samples: int = Query(48, ge=4, le=100, description="Maximum samples along longitude axis"),
    max_lat_samples: int = Query(48, ge=4, le=100, description="Maximum samples along latitude axis"),
    max_depth_samples: int = Query(24, ge=2, le=50, description="Maximum samples along depth axis")
):
    """
    Returns 3D spatial volume block with downsampled grid coordinates and scalar values.
    Land cells and missing data are represented as JSON null.
    Strict truth-in-depth: Never displays or fakes depths beyond actual dataset coverage.
    """
    try:
        eff_depth_min = depth_min if depth_min is not None else min_depth
        eff_depth_max = depth_max if depth_max is not None else max_depth
        return ocean_service.get_volume_data(
            dataset_id=dataset_id,
            variable=variable,
            time_idx=time_idx,
            center_lat=center_lat,
            center_lon=center_lon,
            radius_km=radius_km,
            min_lon=min_lon,
            max_lon=max_lon,
            min_lat=min_lat,
            max_lat=max_lat,
            depth_min=eff_depth_min,
            depth_max=eff_depth_max,
            max_lon_samples=max_lon_samples,
            max_lat_samples=max_lat_samples,
            max_depth_samples=max_depth_samples
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail=f"Dataset file missing: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Error querying volume data: {str(e)}")


