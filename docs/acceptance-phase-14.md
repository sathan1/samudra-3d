# Phase 14 acceptance checklist: 3D Difference Field & Anomaly Heatmap

Authority: `SAMUDRA-3D_SIH26067_Master_Handbook.pdf` (roadmap row 14, physical p. 10; supporting detail pp. 6, 9-11, 13) and `phase-prompts/PHASE-14.md`.

## Pre-implementation verification criteria

- [x] **AC01: Anomaly Engine & API Endpoints**
  - `backend/app/services/anomaly_engine.py` aggregates per-level Phase 13 collocations from all platforms into a sparse residual field.
  - `GET /api/anomaly/field?variable=temperature&threshold=0.5&depth_min=0&depth_max=4000` returns `AnomalyFieldResponse`.
  - `GET /api/anomaly/summary` returns `AnomalySummaryResponse` with counts, metrics, and coverage.

- [x] **AC02: Sign Convention & Diverging Colour Palette**
  - Strictly enforces $\Delta = \text{MODEL} - \text{OBSERVED}$ throughout all labels, colors, and descriptions.
  - Negative $\Delta$ (model under-prediction) maps to blue.
  - Zero / near-zero $\Delta$ maps to white/neutral.
  - Positive $\Delta$ (model over-prediction) maps to red/amber.
  - Temperature (°C) and Salinity (PSU) palettes kept separate; units never mixed.

- [x] **AC03: Configurable Threshold & Alert Labelling**
  - Threshold configurable (default 0.5 degC / 0.1 PSU); `|delta| >= threshold` triggers alert.
  - All alerts labelled "Model-observation discrepancy" — never "hazard", "warning", or "prediction".
  - Boundary cases: |delta| < threshold = no alert; |delta| = threshold = alert; |delta| > threshold = alert.

- [x] **AC04: QC & Missing Data Exclusion**
  - Observation levels with WMO QC flags 3 or 4 excluded from anomaly field points.
  - Missing observations (null / NaN) excluded.
  - Rejected levels do not appear in `AnomalyFieldResponse.points`.

- [x] **AC05: Sparse Observation Policy & Coverage Visualisation**
  - Anomaly points represent only measured platform locations; no spatial extrapolation.
  - Support radius documented as single collocation grid-cell width (~0.5 deg approx 55 km).
  - Coverage bins (0.5 deg x 0.5 deg grid) show `has_data = false` for no-observation areas.
  - Disclaimer text visible in ComparisonPanel UI.
  - `data-testid="anomaly-coverage-count"` shows valid pair count and platform count.

- [x] **AC06: 3D Anomaly Sphere Layer on Globe**
  - Three.js InstancedMesh spheres rendered at (lat, lon, depth) of each anomaly point.
  - Sphere colour follows diverging palette (AC02).
  - Sphere radius scales with |delta| magnitude.
  - Layer appears only when "Show anomaly field" toggle is on.
  - Layer disposes correctly when toggled off or component unmounts.

- [x] **AC07: Traceable Source Link (Click-to-Inspect)**
  - Clicking an alert item selects the originating platform.
  - Source `platform_id` and match metadata (depth, delta, variable) are displayed.
  - Selection navigates to the ProfileModal for that float.

- [x] **AC08: No 88.4% Health Score Widget**
  - No percentage-based health score introduced; D07 explicitly maintained.
  - Metrics shown are Bias, MAE, RMSE, count, and threshold alerts only.

- [x] **AC09: ComparisonPanel Anomaly UI**
  - Variable selector (`data-testid="anomaly-variable-select"`): Temperature / Salinity.
  - Threshold slider (`data-testid="anomaly-threshold-slider"`): 0.1-3.0 degC step 0.1.
  - Toggle (`data-testid="anomaly-toggle"`) enables/disables 3D sphere layer.
  - Alert count (`data-testid="anomaly-alert-count"`) shows integer count of alerts.
  - Alert list (`data-testid="anomaly-alert-list"`) with individual `data-testid="anomaly-alert-item"` entries.

- [x] **AC10: Automated Test Suite & Non-Regression Gate**
  - `backend/tests/test_anomaly.py` passes 8/8.
  - `frontend/tests/test-anomaly.mjs` passes 4/4.
  - `frontend/tests/anomaly.spec.js` passes 4/4 with screenshots in `docs/evidence/phase-14/`.
  - All 42 browser tests across 12 spec files pass without regression.
  - ESLint 0 errors/warnings, production build clean, `check-baseline.py` PASS.
