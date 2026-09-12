"""
SAMUDRA-3D In-situ Observation Router
Authority: Master Handbook physical pp. 4, 6, 9-11, 13; roadmap p. 10 (SIH26067)
"""
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, status
from backend.app.schemas.insitu import (
    ArgoProfileSummary,
    ArgoProfileDetail,
    GliderTransectSummary,
    GliderTransectDetail,
    InsituStatusResponse
)
from backend.app.services.insitu_service import insitu_service

router = APIRouter(prefix="/api/insitu", tags=["In-situ Observations"])

@router.get("/profiles", summary="Retrieve all normalized in-situ profiles (Argo & Gliders)")
def get_profiles(
    platform_type: Optional[str] = Query(None, description="Filter by platform type: 'argo' or 'glider'"),
    qc_filter: bool = Query(False, description="Filter out profiles/levels failing quality checks"),
    source_mode: Optional[str] = Query(None, description="Filter by source provenance: 'SYNTHETIC' or 'REAL_LOCAL'")
):
    """
    Returns normalized in-situ observation profiles.
    Maintains full backwards compatibility with Phase 4's /api/insitu/profiles.
    """
    return insitu_service.get_all_profiles(
        platform_type=platform_type,
        qc_filter=qc_filter,
        source_mode=source_mode
    )

@router.get("/argo", response_model=List[ArgoProfileSummary], summary="Retrieve Argo float profile summaries")
def get_argo_floats(
    qc_filter: bool = Query(False, description="Filter out profiles with bad QC flags"),
    source_mode: Optional[str] = Query(None, description="Filter by source mode ('SYNTHETIC' or 'REAL_LOCAL')")
):
    """Returns active Argo floats with coordinate positions, metadata, and quality summaries."""
    return insitu_service.get_argo_profiles(qc_filter=qc_filter, source_mode=source_mode)

@router.get("/argo/{float_id}", response_model=ArgoProfileDetail, summary="Retrieve single Argo profile by ID")
def get_argo_float_by_id(float_id: str):
    """Returns full vertical depth, temperature, salinity, and QC flags for a specific float."""
    profile = insitu_service.get_profile_by_id(float_id)
    if not profile or profile.get("platform_type") != "argo":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Float profile '{float_id}' not found"
        )
    return profile

@router.get("/gliders", response_model=List[GliderTransectSummary], summary="Retrieve underwater glider transects")
def get_glider_transects(
    qc_filter: bool = Query(False, description="Filter out transects with bad QC flags"),
    source_mode: Optional[str] = Query(None, description="Filter by source mode ('SYNTHETIC' or 'REAL_LOCAL')")
):
    """Returns underwater glider mission transects with summary metrics."""
    return insitu_service.get_glider_transects(qc_filter=qc_filter, source_mode=source_mode)

@router.get("/gliders/{glider_id}", response_model=GliderTransectDetail, summary="Retrieve detailed glider mission with 3D waypoints")
def get_glider_by_id(glider_id: str):
    """Returns full 3D sawtooth waypoints, dive cycles, depth profiles, and metadata for a specific glider."""
    glider = insitu_service.get_glider_by_id(glider_id)
    if not glider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Glider mission '{glider_id}' not found"
        )
    return glider

@router.get("/status", response_model=InsituStatusResponse, summary="Retrieve in-situ ingestion telemetry & ERDDAP status")
def get_insitu_status():
    """Returns platform counts, synthetic vs real data breakdown, and live ERDDAP connectivity status."""
    return insitu_service.get_status()
