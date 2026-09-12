# Phase 15 acceptance checklist: AI Ocean Assistant & SIH Packaging

Authority: `SAMUDRA-3D_SIH26067_Master_Handbook.pdf` (roadmap row 15, physical p. 10; supporting pp. 9-14; DOCX AI feature; Presentation slides 6-7).

## Pre-implementation verification criteria

- [x] **AC01: Grounded AI Assistant Engine & API Endpoints**
  - `backend/app/services/ai_assistant.py` implements grounded, deterministic query answering over NetCDF model fields and in-situ observations.
  - `POST /api/assistant/query` returns structured responses with answer markdown, grounded scope, supporting metrics, and latency.
  - `GET /api/assistant/presets` returns pre-canned scientific query presets.

- [x] **AC02: Bounded Scientific Queries & Provenance**
  - Answers to "largest residual", "coverage summary", and "platform summary" match actual backend mathematical calculations.
  - Every answer includes variable, units, location, depth, timestamp, source mode, and supporting comparison IDs/metrics.
  - Extrema and counts match backend NetCDF and in-situ datasets exactly.

- [x] **AC03: Adversarial Prompt Injection Defense & Sanitization**
  - Adversarial injection attempts ("ignore instructions", system prompt overrides) are neutralized.
  - Data content is never treated as an instruction source.
  - Out-of-scope/unsupported queries receive an honest explanatory fallback without hallucinating data.

- [x] **AC04: Honest No-Data & Failure Handling**
  - Queries for non-existent platforms or variables return explicit not-found explanations.
  - Never invents physical hazards, operational cyclone warnings, or unverified forecasts.

- [x] **AC05: Interactive AIAssistantModal Frontend**
  - Accessible modal dialog opened via Header button (`data-testid="open-assistant-btn"`), closed via close button or Escape key.
  - Context banner displays currently selected platform, variable, and depth.
  - Clickable preset buttons (`data-testid="assistant-preset-chip"`) allow instant queries.
  - Input field (`data-testid="assistant-input"`) and submit button (`data-testid="assistant-submit"`) allow freeform questions.
  - Grounded answer displayed with supporting metrics and data scope pills.

- [x] **AC06: SIH Packaging & Docker Orchestration**
  - `docker-compose.yml` orchestrates backend (port 8000) and frontend (port 80).
  - `Dockerfile.backend` and `Dockerfile.frontend` build minimal, multi-stage production images.
  - `.env.example` provides complete configuration template with zero embedded secrets.

- [x] **AC07: Production Documentation & PowerShell Setup**
  - `README.md` updated with comprehensive project overview, 15-phase architecture, single-command PowerShell setup, and test instructions.
  - Clean local offline synthetic demonstration functions without mandatory cloud API keys or external services.

- [x] **AC08: Final Readiness Audit & SIH Presentation Script**
  - `docs/final-readiness.md` provides separate synthetic-demo, real-data-integration, and deployment readiness evaluations.
  - Contains evidence-based 5-minute SIH presentation script and concise jury Q&A.
  - Reconciles claimed capabilities against actual evidence; does not claim OGC conformance from JSON endpoints alone.

- [x] **AC09: Full 15-Phase Test Suite & Non-Regression Gate**
  - `backend/tests/test_assistant.py` passes 8/8.
  - `frontend/tests/test-assistant.mjs` passes 4/4.
  - `frontend/tests/assistant.spec.js` passes 4/4 with screenshots in `docs/evidence/phase-15/`.
  - Full Playwright test suite passes all 46 browser tests across all 13 spec files.
  - ESLint 0 errors/0 warnings, production build clean.

- [x] **AC10: Baseline Gate & 15-Phase Manifest Snapshot**
  - `scripts/check-baseline.py` passes with all 15 roadmap phases active.
  - `scripts/snapshot-baseline.py phase-15` verifies complete workspace manifest.
