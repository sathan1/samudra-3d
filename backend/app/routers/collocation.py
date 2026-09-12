"""
SAMUDRA-3D Collocation API Router
Authority: Master Handbook physical pp. 5-6, 9-11, 13; roadmap row 13 (SIH26067)
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from backend.app.services.collocation import collocation_engine
from backend.app.schemas.collocation import (
    ProfileCollocationResponse,
    GliderCollocationResponse,
    CollocationHealthResponse
)

router = APIRouter(prefix="/api/collocation", tags=["Model vs In-situ Collocation"])

@router.get("/profile/{profile_id}", response_model=ProfileCollocationResponse, summary="Collocate model against in-situ profile")
def collocate_profile(
    profile_id: str,
    time_strategy: str = Query("linear", description="Temporal interpolation strategy ('linear' or 'nearest')")
):
    """
    Collocates 4D numerical model outputs (ROMS) against an in-situ profile (Argo float or Glider profile).
    Returns level-by-level matched pairs, residuals (delta = MODEL - OBSERVED), Bias, MAE, RMSE, and model health.
    """
    if time_strategy not in ("linear", "nearest"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported time_strategy '{time_strategy}'. Must be 'linear' or 'nearest'."
        )

    result = collocation_engine.collocate_profile(profile_id, time_strategy=time_strategy)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"In-situ profile '{profile_id}' not found"
        )
    return result

@router.get("/glider/{glider_id}", response_model=GliderCollocationResponse, summary="Collocate model against 3D glider transect")
def collocate_glider_transect(glider_id: str):
    """
    Collocates 4D numerical model outputs against each 3D waypoint of an underwater glider mission.
    """
    result = collocation_engine.collocate_glider(glider_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Glider mission '{glider_id}' not found"
        )
    return result

@router.get("/health", response_model=CollocationHealthResponse, summary="Collocation engine status and analytical affine verification")
def get_collocation_health():
    """
    Returns operational domain boundaries, supported variables, and analytical affine ground-truth verification result.
    """
    return collocation_engine.get_health()
