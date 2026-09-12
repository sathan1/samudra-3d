"""
SAMUDRA-3D Grounded AI Ocean Assistant Service
Authority: Master Handbook physical pp. 9-14; roadmap row 15 (SIH26067)

Provides deterministic, grounded scientific answers evaluated directly from:
- 4D NetCDF ocean model fields (ROMS)
- In-situ Argo CTD profiles and Glider sawtooth transects
- Phase 13/14 Spatio-Temporal Collocations & Difference Field Residuals

Strictly immune to prompt injection; data is never treated as instruction source.
No fabricated operational warnings, physical hazards, or unverified forecasts.
"""
import time
import re
from typing import Optional, List, Dict, Any, Tuple
import numpy as np

from backend.app.services.ocean_service import ocean_service
from backend.app.services.insitu_service import insitu_service
from backend.app.services.collocation import collocation_engine
from backend.app.services.anomaly_engine import anomaly_engine
from backend.app.schemas.assistant import (
    AssistantQueryRequest,
    AssistantQueryResponse,
    AssistantQueryContext,
    SupportingMetric,
    GroundedDataScope,
    PresetQuery,
    AssistantPresetsResponse
)

PRESET_QUERIES = [
    PresetQuery(
        id="largest_residual",
        label="Largest Discrepancy",
        query_text="What is the largest model-observation discrepancy in the Indian Ocean basin?",
        category="residuals"
    ),
    PresetQuery(
        id="observation_coverage",
        label="Observation Coverage",
        query_text="Summarize the in-situ observation network coverage and active sensors.",
        category="coverage"
    ),
    PresetQuery(
        id="domain_extremes",
        label="Domain Extremes",
        query_text="What are the maximum and minimum sea surface temperatures currently simulated?",
        category="oceanography"
    ),
    PresetQuery(
        id="current_platform",
        label="Inspect Selected Platform",
        query_text="Summarize the currently selected sensor profile and its model collocation.",
        category="inspection"
    )
]

INJECTION_PATTERN = re.compile(
    r"(ignore\s+(all\s+)?previous\s+instructions|system\s+prompt|reveal\s+secret|you\s+are\s+now|bypass|act\s+as)",
    re.IGNORECASE
)


class OceanAssistantEngine:
    def __init__(self):
        pass

    def get_presets(self) -> AssistantPresetsResponse:
        return AssistantPresetsResponse(presets=PRESET_QUERIES)

    def answer_query(self, request: AssistantQueryRequest) -> AssistantQueryResponse:
        t0 = time.perf_counter()
        raw_query = request.query.strip()
        context = request.context or AssistantQueryContext()

        # 1. Adversarial Injection Detection & Sanitization
        if INJECTION_PATTERN.search(raw_query):
            latency = (time.perf_counter() - t0) * 1000.0
            return AssistantQueryResponse(
                query=raw_query,
                intent="SECURITY_REJECTION",
                confidence=1.0,
                answer_markdown=(
                    "### ⚠️ Security Policy Notification\n\n"
                    "The query contained prompt injection or system override patterns. "
                    "SAMUDRA-3D's AI Ocean Assistant operates under a strict **Grounded Scientific Policy**: "
                    "queries are parsed exclusively for physical oceanographic intents, and data content is never "
                    "treated as an execution instruction source. Please ask a scientific or operational query."
                ),
                grounded_scope=GroundedDataScope(
                    variable=context.selected_variable or "temperature",
                    platforms_evaluated=0
                ),
                supporting_metrics=[
                    SupportingMetric(label="Status", value="Rejected", hint="Policy violation neutralized")
                ],
                suggestions=[p.query_text for p in PRESET_QUERIES[:2]],
                latency_ms=round(latency, 2)
            )

        q_lower = raw_query.lower()

        # 2. Intent Classification
        if any(w in q_lower for w in ["largest", "maximum residual", "max discrepancy", "worst", "highest error", "biggest error"]):
            return self._handle_largest_residual(raw_query, context, t0)
        elif any(w in q_lower for w in ["coverage", "how many", "network", "active sensors", "active floats", "platforms"]):
            return self._handle_coverage(raw_query, context, t0)
        elif any(w in q_lower for w in ["extreme", "max temp", "min temp", "hottest", "coldest", "warmest", "domain"]):
            return self._handle_domain_extremes(raw_query, context, t0)
        elif any(w in q_lower for w in ["selected", "current platform", "this float", "this glider", "profile summary", "inspect", "detail"]) or "argo_" in q_lower or "glider_" in q_lower:
            return self._handle_platform_summary(raw_query, context, t0)
        else:
            return self._handle_fallback(raw_query, context, t0)

    def _handle_largest_residual(self, query: str, context: AssistantQueryContext, t0: float) -> AssistantQueryResponse:
        var = context.selected_variable or "temperature"
        field = anomaly_engine.compute_field(variable=var)
        unit = "°C" if var == "temperature" else "PSU"

        if not field.points:
            latency = (time.perf_counter() - t0) * 1000.0
            return AssistantQueryResponse(
                query=query,
                intent="LARGEST_RESIDUAL",
                confidence=1.0,
                answer_markdown=f"No valid collocated observation points were found for variable **{var}**.",
                grounded_scope=GroundedDataScope(variable=var, platforms_evaluated=0),
                latency_ms=round(latency, 2)
            )

        # Find point with largest absolute delta = |MODEL - OBSERVED|
        max_pt = max(field.points, key=lambda p: abs(p.delta))
        sign_str = f"+{max_pt.delta}" if max_pt.delta > 0 else f"{max_pt.delta}"
        tendency = "over-prediction" if max_pt.delta > 0 else "under-prediction"

        md = (
            f"### 🔍 Largest Model-Observation Discrepancy ({var.capitalize()})\n\n"
            f"Based on 4D trilinear collocation across all active platforms, the largest residual is observed at **{max_pt.platform_id}** "
            f"({max_pt.platform_type.upper()}) at **{max_pt.depth}m depth**:\n\n"
            f"- **Residual (Δ = Model - Obs):** `{sign_str} {unit}` ({tendency})\n"
            f"- **Observed Value:** `{max_pt.observed_value} {unit}` (QC Flag {max_pt.qc_flag})\n"
            f"- **Model Output (ROMS):** `{max_pt.model_value} {unit}`\n"
            f"- **Coordinates:** `{max_pt.lat:.2f}°N, {max_pt.lon:.2f}°E`\n\n"
            f"> **Scientific Note:** This discrepancy represents a localized difference between numerical simulation and "
            f"in-situ CTD measurement, often associated with thermocline gradient sharp boundaries or localized internal waves. "
            f"It is classified as a *Model-observation discrepancy*, not a physical hazard."
        )

        latency = (time.perf_counter() - t0) * 1000.0
        return AssistantQueryResponse(
            query=query,
            intent="LARGEST_RESIDUAL",
            confidence=0.98,
            answer_markdown=md,
            grounded_scope=GroundedDataScope(
                variable=var,
                platforms_evaluated=field.platform_count,
                sample_count=field.total_valid_pairs
            ),
            supporting_metrics=[
                SupportingMetric(label="Platform", value=max_pt.platform_id, hint=max_pt.platform_type.upper()),
                SupportingMetric(label="Depth", value=f"{max_pt.depth}m"),
                SupportingMetric(label="Residual (Δ)", value=f"{sign_str}", unit=unit),
                SupportingMetric(label="Observed", value=f"{max_pt.observed_value}", unit=unit),
                SupportingMetric(label="Model", value=f"{max_pt.model_value}", unit=unit),
                SupportingMetric(label="Domain RMSE", value=f"{field.rmse:.2f}" if field.rmse else "N/A", unit=unit)
            ],
            suggestions=[
                "Summarize observation coverage",
                "What are the simulated domain extremes?",
                f"Inspect {max_pt.platform_id}"
            ],
            latency_ms=round(latency, 2)
        )

    def _handle_coverage(self, query: str, context: AssistantQueryContext, t0: float) -> AssistantQueryResponse:
        profiles = insitu_service.get_all_profiles(source_mode="ALL")
        gliders = insitu_service.get_glider_transects(source_mode="ALL")
        t_field = anomaly_engine.compute_field("temperature")
        s_field = anomaly_engine.compute_field("salinity")

        argo_count = sum(1 for p in profiles if p.get("platform_type") == "argo")
        glider_count = len(gliders)
        total_platforms = argo_count + glider_count

        md = (
            f"### 🌐 In-Situ Observation Network Coverage\n\n"
            f"The SAMUDRA-3D observatory currently integrates **{total_platforms} platforms** across the Indian Ocean basin:\n\n"
            f"- **Argo Profiling Floats:** `{argo_count}` active floats (INCOIS-DAC normalized)\n"
            f"- **Underwater Gliders:** `{glider_count}` missions (INCOIS-Seaglider sawtooth yo-yo transects)\n"
            f"- **Valid Collocated Pairs:** `{t_field.total_valid_pairs}` Temperature / `{s_field.total_valid_pairs}` Salinity pairs\n"
            f"- **Observation Support Radius:** `55.0 km` (~0.5° model grid cell width)\n"
            f"- **Domain Coverage Bins:** `{len(t_field.coverage_bins)}` non-empty 0.5°×0.5° cells\n\n"
            f"> **Sparse Policy:** Residuals and collocations are strictly evaluated at measured geographic coordinates. "
            f"Unobserved areas remain explicit coverage holes without synthetic extrapolation."
        )

        latency = (time.perf_counter() - t0) * 1000.0
        return AssistantQueryResponse(
            query=query,
            intent="OBSERVATION_COVERAGE",
            confidence=0.99,
            answer_markdown=md,
            grounded_scope=GroundedDataScope(
                variable="temperature + salinity",
                platforms_evaluated=total_platforms,
                sample_count=t_field.total_valid_pairs + s_field.total_valid_pairs
            ),
            supporting_metrics=[
                SupportingMetric(label="Total Platforms", value=str(total_platforms)),
                SupportingMetric(label="Argo Floats", value=str(argo_count)),
                SupportingMetric(label="Glider Missions", value=str(glider_count)),
                SupportingMetric(label="Valid Temp Pairs", value=str(t_field.total_valid_pairs)),
                SupportingMetric(label="Valid Sal Pairs", value=str(s_field.total_valid_pairs)),
                SupportingMetric(label="Support Radius", value="55", unit="km")
            ],
            suggestions=[
                "What is the largest model-observation discrepancy?",
                "What are the simulated domain extremes?",
                "Inspect selected platform"
            ],
            latency_ms=round(latency, 2)
        )

    def _handle_domain_extremes(self, query: str, context: AssistantQueryContext, t0: float) -> AssistantQueryResponse:
        if not ocean_service.is_loaded():
            ocean_service.load_dataset()

        ds = ocean_service.dataset
        t_idx = context.time_idx or 0
        temp_surf = ds.variables["temperature"][t_idx, 0, :, :]
        valid_mask = (temp_surf != -999.0) & ~np.ma.getmaskarray(temp_surf)
        valid_temps = temp_surf[valid_mask]

        min_t = float(np.min(valid_temps))
        max_t = float(np.max(valid_temps))
        mean_t = float(np.mean(valid_temps))

        md = (
            f"### 🌡️ Simulated Sea Surface Temperature Extremes (Forecast Step {t_idx + 1}/8)\n\n"
            f"Across the Indian Ocean basin (0°N to 25°N, 65°E to 95°E) at the sea surface (0m depth):\n\n"
            f"- **Maximum Surface Temperature:** `{max_t:.2f} °C` (typically equatorial open waters / Bay of Bengal)\n"
            f"- **Minimum Surface Temperature:** `{min_t:.2f} °C` (coastal upwelling / northern margins)\n"
            f"- **Mean Basin SST:** `{mean_t:.2f} °C`\n"
            f"- **Forecast Timestamp:** `{ocean_service.times[t_idx]}h forecast relative to 2026-09-10 00:00 UTC`\n\n"
            f"> **Model Provenance:** Values generated from INCOIS ROMS numerical hydrodynamic simulation (CF-1.8)."
        )

        latency = (time.perf_counter() - t0) * 1000.0
        return AssistantQueryResponse(
            query=query,
            intent="DOMAIN_EXTREMES",
            confidence=0.99,
            answer_markdown=md,
            grounded_scope=GroundedDataScope(
                variable="temperature",
                depth_range_m=[0.0, 0.0]
            ),
            supporting_metrics=[
                SupportingMetric(label="Max SST", value=f"{max_t:.2f}", unit="°C"),
                SupportingMetric(label="Min SST", value=f"{min_t:.2f}", unit="°C"),
                SupportingMetric(label="Mean SST", value=f"{mean_t:.2f}", unit="°C"),
                SupportingMetric(label="Depth", value="0m (Surface)"),
                SupportingMetric(label="Forecast Step", value=f"{t_idx + 1}/8")
            ],
            suggestions=[
                "What is the largest model-observation discrepancy?",
                "Summarize observation coverage",
                "Inspect selected platform"
            ],
            latency_ms=round(latency, 2)
        )

    def _handle_platform_summary(self, query: str, context: AssistantQueryContext, t0: float) -> AssistantQueryResponse:
        pid = context.selected_platform_id

        match = re.search(r"(ARGO_[A-Za-z0-9_]+|GLIDER_[A-Za-z0-9_]+)", query, re.IGNORECASE)
        if match:
            pid = match.group(1).upper()

        if not pid:
            latency = (time.perf_counter() - t0) * 1000.0
            return AssistantQueryResponse(
                query=query,
                intent="PLATFORM_SUMMARY",
                confidence=0.95,
                answer_markdown=(
                    "### ℹ️ No Sensor Platform Selected\n\n"
                    "Please select an Argo float marker or Glider transect on the 3D globe or in the sidebar dropdown, "
                    "or specify a platform ID in your query (e.g. *\"Inspect ARGO_2902145\"* or *\"Inspect GLIDER_BOB_SG01\"*)."
                ),
                grounded_scope=GroundedDataScope(variable="all", platforms_evaluated=0),
                suggestions=[
                    "Inspect ARGO_2902145",
                    "Inspect GLIDER_BOB_SG01",
                    "Summarize observation coverage"
                ],
                latency_ms=round(latency, 2)
            )

        collocation = collocation_engine.collocate_profile(pid)
        if not collocation:
            glider_colloc = collocation_engine.collocate_glider(pid)
            if not glider_colloc:
                latency = (time.perf_counter() - t0) * 1000.0
                return AssistantQueryResponse(
                    query=query,
                    intent="PLATFORM_SUMMARY",
                    confidence=1.0,
                    answer_markdown=f"### ❌ Platform Not Found\n\nSensor platform `{pid}` could not be found in active in-situ records.",
                    grounded_scope=GroundedDataScope(variable="unknown", platforms_evaluated=0),
                    latency_ms=round(latency, 2)
                )

            t_sum = glider_colloc.temperature_summary
            md = (
                f"### 🤿 Underwater Glider Mission Summary: {glider_colloc.name}\n\n"
                f"- **Platform ID:** `{glider_colloc.glider_id}` (Mission Transect)\n"
                f"- **Waypoints:** `{glider_colloc.total_waypoints}` total waypoints ({glider_colloc.matched_waypoints} collocated)\n"
                f"- **Temperature Bias:** `{t_sum.bias if t_sum else 'N/A'} °C`\n"
                f"- **Temperature RMSE:** `{t_sum.rmse if t_sum else 'N/A'} °C`\n"
                f"- **Prediction Tendency:** `{t_sum.prediction_tendency if t_sum else 'N/A'}`\n\n"
                f"> **Mission Profile:** Sawtooth yo-yo diving trajectory through the northern Indian Ocean water column."
            )
            latency = (time.perf_counter() - t0) * 1000.0
            return AssistantQueryResponse(
                query=query,
                intent="PLATFORM_SUMMARY",
                confidence=0.98,
                answer_markdown=md,
                grounded_scope=GroundedDataScope(
                    variable="temperature + salinity",
                    platforms_evaluated=1,
                    sample_count=glider_colloc.matched_waypoints
                ),
                supporting_metrics=[
                    SupportingMetric(label="Platform", value=glider_colloc.glider_id),
                    SupportingMetric(label="Waypoints", value=str(glider_colloc.total_waypoints)),
                    SupportingMetric(label="Temp Bias", value=f"{t_sum.bias if t_sum else 'N/A'}", unit="°C"),
                    SupportingMetric(label="Temp RMSE", value=f"{t_sum.rmse if t_sum else 'N/A'}", unit="°C")
                ],
                latency_ms=round(latency, 2)
            )

        t_sum = collocation.temperature
        s_sum = collocation.salinity
        md = (
            f"### 📍 Argo Float Profile Summary: {collocation.profile_id}\n\n"
            f"- **Platform ID:** `{collocation.profile_id}` ({collocation.platform_type.upper()})\n"
            f"- **Position:** `{collocation.lat:.2f}°N, {collocation.lon:.2f}°E`\n"
            f"- **Timestamp:** `{collocation.timestamp}`\n"
            f"- **Model Health:** `{collocation.model_health}` — {collocation.model_health_description}\n"
            f"- **Temperature Bias:** `{t_sum.bias if t_sum else 'N/A'} °C` (RMSE `{t_sum.rmse if t_sum else 'N/A'} °C`)\n"
            f"- **Salinity Bias:** `{s_sum.bias if s_sum else 'N/A'} PSU` (RMSE `{s_sum.rmse if s_sum else 'N/A'} PSU`)\n"
            f"- **Depth Levels:** `{len(collocation.temperature_levels)}` vertical CTD observations\n\n"
            f"> **Inspection Tip:** Open the Profile Inspection modal to view full vertical curves and T-S correlation diagrams."
        )

        latency = (time.perf_counter() - t0) * 1000.0
        return AssistantQueryResponse(
            query=query,
            intent="PLATFORM_SUMMARY",
            confidence=0.98,
            answer_markdown=md,
            grounded_scope=GroundedDataScope(
                variable="temperature + salinity",
                platforms_evaluated=1,
                sample_count=len(collocation.temperature_levels)
            ),
            supporting_metrics=[
                SupportingMetric(label="Profile ID", value=collocation.profile_id),
                SupportingMetric(label="Health", value=collocation.model_health),
                SupportingMetric(label="Temp Bias", value=f"{t_sum.bias if t_sum else 'N/A'}", unit="°C"),
                SupportingMetric(label="Temp RMSE", value=f"{t_sum.rmse if t_sum else 'N/A'}", unit="°C"),
                SupportingMetric(label="Levels", value=str(len(collocation.temperature_levels)))
            ],
            suggestions=[
                "What is the largest model-observation discrepancy?",
                "Summarize observation coverage",
                "What are the simulated domain extremes?"
            ],
            latency_ms=round(latency, 2)
        )

    def _handle_fallback(self, query: str, context: AssistantQueryContext, t0: float) -> AssistantQueryResponse:
        latency = (time.perf_counter() - t0) * 1000.0
        md = (
            f"### 🤖 SAMUDRA-3D AI Ocean Assistant\n\n"
            f"I am the scientific oceanographic assistant for SAMUDRA-3D, grounded directly in the active 4D ROMS model simulation "
            f"and INCOIS in-situ observation network (Argo floats & gliders).\n\n"
            f"**Supported Scientific Inquiries:**\n"
            f"1. **Discrepancy & Residuals:** *\"What is the largest model-observation discrepancy?\"*\n"
            f"2. **Observation Coverage:** *\"Summarize the in-situ observation network coverage.\"*\n"
            f"3. **Domain Extremes:** *\"What are the simulated sea surface temperature extremes?\"*\n"
            f"4. **Platform Inspection:** *\"Inspect ARGO_2902145\"* or *\"Inspect GLIDER_BOB_SG01\"*\n\n"
            f"> **Grounded Policy:** All answers are computed deterministically from verified numerical outputs. "
            f"General conversational queries or ungrounded predictions are declined."
        )
        return AssistantQueryResponse(
            query=query,
            intent="GENERAL_EXPLANATION",
            confidence=0.85,
            answer_markdown=md,
            grounded_scope=GroundedDataScope(
                variable=context.selected_variable or "temperature",
                platforms_evaluated=0
            ),
            supporting_metrics=[
                SupportingMetric(label="Status", value="Grounded Engine Active"),
                SupportingMetric(label="Modes", value="ROMS + In-situ CTD")
            ],
            suggestions=[p.query_text for p in PRESET_QUERIES[:3]],
            latency_ms=round(latency, 2)
        )


ocean_assistant = OceanAssistantEngine()
