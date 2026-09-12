"""
SAMUDRA-3D AI Ocean Assistant API Router
Authority: Master Handbook physical pp. 9-14; roadmap row 15 (SIH26067)
"""
from fastapi import APIRouter, HTTPException, status
from backend.app.services.ai_assistant import ocean_assistant
from backend.app.schemas.assistant import (
    AssistantQueryRequest,
    AssistantQueryResponse,
    AssistantPresetsResponse
)

router = APIRouter(prefix="/api/assistant", tags=["AI Ocean Assistant"])

@router.post("/query", response_model=AssistantQueryResponse, summary="Query grounded AI ocean assistant")
def query_assistant(request: AssistantQueryRequest):
    """
    Submits a bounded scientific query to the grounded AI Ocean Assistant.
    Evaluates answers deterministically over active 4D model grids and in-situ CTD observations.
    """
    if not request.query or not request.query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query string cannot be empty."
        )
    return ocean_assistant.answer_query(request)

@router.get("/presets", response_model=AssistantPresetsResponse, summary="Retrieve pre-canned scientific query presets")
def get_presets():
    """
    Returns verified preset scientific inquiries ready for one-click execution.
    """
    return ocean_assistant.get_presets()
