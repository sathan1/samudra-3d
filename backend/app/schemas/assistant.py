"""
SAMUDRA-3D AI Ocean Assistant Schemas
Authority: Master Handbook physical pp. 9-14; roadmap row 15 (SIH26067)
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class AssistantQueryContext(BaseModel):
    selected_platform_id: Optional[str] = Field(None, description="Currently selected Argo float or Glider ID")
    selected_variable: Optional[str] = Field("temperature", description="Active variable (temperature, salinity)")
    selected_depth: Optional[float] = Field(0.0, description="Active depth level in metres")
    time_idx: Optional[int] = Field(0, description="Active forecast time index (0 to 7)")


class AssistantQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500, description="User's natural language or bounded scientific question")
    context: Optional[AssistantQueryContext] = Field(default_factory=AssistantQueryContext, description="Current workspace context")
    api_key: Optional[str] = Field(None, description="Optional Google Gemini or OpenAI API Key provided by user")
    api_provider: Optional[str] = Field("gemini", description="AI Provider ('gemini' or 'openai')")
    conversation_history: Optional[List[Dict[str, str]]] = Field(default_factory=list, description="Recent conversation turns")


class SupportingMetric(BaseModel):
    label: str = Field(..., description="Human-readable metric label")
    value: str = Field(..., description="Formatted value")
    unit: Optional[str] = Field(None, description="Physical unit")
    hint: Optional[str] = Field(None, description="Contextual explanation")


class GroundedDataScope(BaseModel):
    variable: str = Field(..., description="Evaluated variable")
    dataset: str = Field("INCOIS ROMS + In-situ CTD (CF-1.8)", description="Source dataset provenance")
    platforms_evaluated: int = Field(0, description="Count of evaluated platforms")
    depth_range_m: List[float] = Field(default_factory=lambda: [0.0, 4000.0], description="Depth bounds evaluated")
    temporal_coverage: str = Field("T+00h to T+42h (2026-09-10 to 2026-09-11)", description="Temporal bounds")
    support_radius_km: float = Field(55.0, description="Documented observation support radius")


class AssistantQueryResponse(BaseModel):
    query: str
    intent: str = Field(..., description="Classified intent (e.g. LARGEST_RESIDUAL, COVERAGE_SUMMARY, PLATFORM_SUMMARY, CONVERSATIONAL_AI)")
    confidence: float = Field(1.0, description="Confidence in grounded query evaluation")
    answer_markdown: str = Field(..., description="Grounded markdown response")
    grounded_scope: GroundedDataScope
    supporting_metrics: List[SupportingMetric] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list, description="Follow-up scientific query suggestions")
    latency_ms: float = Field(0.0, description="Response generation time in milliseconds")
    engine_mode: str = Field("DETERMINISTIC_GROUNDED", description="Assistant generation engine mode (e.g. GEMINI_1_5_FLASH, OPENAI_GPT4O, DETERMINISTIC_GROUNDED, CONVERSATIONAL_SIM)")
    navigation_action: Optional[Dict[str, Any]] = Field(None, description="Actionable navigation parameters for the UI")


class PresetQuery(BaseModel):
    id: str
    label: str
    query_text: str
    category: str


class AssistantPresetsResponse(BaseModel):
    presets: List[PresetQuery]
    engine: str = "SAMUDRA-3D Grounded Ocean Analysis Assistant"
    status: str = "operational"
