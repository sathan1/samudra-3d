# Phase 14 Implementation Report: 3D Difference Field & Anomaly Heatmap

**Date:** 2026-09-12  
**Authority:** SAMUDRA-3D_SIH26067_Master_Handbook.pdf (roadmap row 14, p. 10; supporting pp. 6, 9-11, 13; DOCX workflow; Presentation slide 6)  
**Classification:** GOOD TO HAVE  
**Status:** PASS

---

## Summary

Phase 14 implements a complete 3D Difference Field & Anomaly Heatmap visualizer and analysis engine for SAMUDRA-3D. Consuming valid 4D spatio-temporal collocations from Phase 13, the engine aggregates observation-level residuals ($\Delta = \text{MODEL} - \text{OBSERVED}$) across all available in-situ platforms (Argo floats and Underwater Gliders). A sparse 3D residual field is rendered as Three.js `InstancedMesh` spheres on the globe using a diverging color palette centered at zero (blue for model under-prediction, red/amber for over-prediction, light neutral for near-zero). The `ComparisonPanel.jsx` component has been expanded with configurable anomaly threshold sliders, observation coverage counts, honest sparse-data disclaimers, and a clickable discrepancy alert list with direct traceability to source CTD profiles in `ProfileModal.jsx`.

---

## Backend

### New Files

| File | Purpose |
|------|---------|
| `backend/app/schemas/anomaly.py` | Pydantic v2 schemas: `AnomalyPoint`, `CoverageBin`, `AnomalyFieldResponse`, `AnomalySummaryResponse` |
| `backend/app/services/anomaly_engine.py` | `AnomalyEngine` with `compute_field()` and `compute_summary()`, sparse aggregation, binning, and threshold alerts |
| `backend/app/routers/anomaly.py` | FastAPI router: `GET /api/anomaly/field` and `GET /api/anomaly/summary` |
| `backend/tests/test_anomaly.py` | 8-test acceptance suite covering sign convention, threshold boundaries, QC exclusion, depth filtering, coverage bins, and latency |

### Modified Files

| File | Change |
|------|--------|
| `backend/app/main.py` | Import and mount `anomaly_router` |

### API Endpoints

| Endpoint | Response | Notes |
|----------|---------|-------|
| `GET /api/anomaly/field` | `AnomalyFieldResponse` | Sparse residual field with points, coverage bins, alert counts, Bias/MAE/RMSE, support radius |
| `GET /api/anomaly/summary` | `AnomalySummaryResponse` | Cross-variable summary (Temperature + Salinity), platform counts, and D07 deferral notice |

### Test Results — Backend

```
backend/tests/test_anomaly.py         8/8 PASS (129.75ms latency)
backend/tests/test_collocation.py     8/8 PASS (non-regression)
backend/tests/test_gliders.py         PASS (non-regression)
backend/tests/test_insitu.py          PASS (non-regression)
backend/tests/test_api.py             PASS (non-regression)
backend/tests/test_synthetic_data.py  PASS (non-regression)
```

---

## Scientific & Visualization Design Decisions

### 1. Diverging Color Palette Centered at Zero (D73)
- Strictly enforces $\Delta = \text{MODEL} - \text{OBSERVED}$:
  - $\Delta < 0$: Model under-prediction $\rightarrow$ Blue palette (`#0284c7` to `#38bdf8`)
  - $|\Delta| < 0.05$: Near-zero residual $\rightarrow$ Light neutral white/slate (`#f8fafc`)
  - $\Delta > 0$: Model over-prediction $\rightarrow$ Amber to crimson red (`#fbbf24` to `#ef4444`)
- Physical units are kept strictly separated: Temperature (°C) vs Practical Salinity (PSU).

### 2. Sparse Observation Policy & Support Radius (D74)
- Observations are sparse point measurements in the ocean volume.
- Residuals are rendered exclusively at directly observed $(t, \text{lat}, \text{lon}, z)$ coordinates.
- Documented support radius is ~55 km (one 0.5° model grid cell); no artificial spatial extrapolation across unobserved ocean basins is performed.
- Coverage holes are explicitly reported in the API (`has_data = false`) and an honest disclaimer is visible in the UI:
  *"Sparse observations: residuals shown only at directly measured locations. No interpolation beyond source collocation (55km support). No-data regions exist."*

### 3. Configurable Thresholds & Honest Alert Labelling (D75)
- User-configurable threshold slider: 0.1–3.0 °C (step 0.1 °C) for temperature; 0.02–1.0 PSU (step 0.02 PSU) for salinity.
- Exceedances ($|\Delta| \ge \text{threshold}$) are labelled exclusively as `"Model-observation discrepancy"`.
- Never labelled as a "hazard", "warning", or "operational prediction".
- Clicking an alert item navigates directly to the source platform's CTD profile in `ProfileModal.jsx`.

### 4. Deferral of 88.4% Percentage Health Score Widget (D76, D07)
- The handbook's wireframe illustration of an 88.4% health score is not backed by any mathematical formula or reference scale.
- Scientifically validated error metrics (Bias, MAE, RMSE) are reported instead.
- The API explicitly returns `health_score_status: "DEFERRED (D07)"` to document this choice transparently.

---

## Frontend

### New Files

| File | Purpose |
|------|---------|
| `frontend/src/utils/anomalyField.js` | 3D residual sphere layer using Three.js `InstancedMesh`, `deltaToColor()`, raycasting, Earth occlusion, and disposal |
| `frontend/tests/test-anomaly.mjs` | 4 unit tests: diverging color mapping, `createAnomalyFieldMesh`, raycasting, and disposal |
| `frontend/tests/anomaly.spec.js` | 4 Playwright E2E tests with automated screenshot captures |

### Modified Files

| File | Change |
|------|--------|
| `frontend/src/services/api.js` | Added `fetchAnomalyField()` and `fetchAnomalySummary()` |
| `frontend/src/components/OceanCanvas.jsx` | Added 3D anomaly sphere layer, viewport HUD badge (`ANOMALY FIELD`), Earth occlusion, and click raycasting |
| `frontend/src/components/ComparisonPanel.jsx` | Added 3D Difference & Anomaly section with toggle, variable selector, threshold slider, coverage readout, and alert list |
| `frontend/src/App.jsx` | Managed anomaly state, fetched field data on filter changes, and wired click-to-trace navigation to `ProfileModal` |
| `frontend/tests/shell.spec.js` | Updated `allAsideControls` count to 15 and added Tab focus assertion for `#toggle-anomaly-layer` |

---

## Verification Results

| Check | Tool / Scope | Result | Notes |
| :--- | :--- | :---: | :--- |
| **Backend Anomaly Tests** | `python -m backend.tests.test_anomaly` | **PASS (8/8)** | Sign convention, threshold boundaries, QC exclusion, depth range, coverage bins, latency (129ms) |
| **Backend Non-Regression** | All backend test suites | **PASS (100%)** | `test_collocation`, `test_gliders`, `test_insitu`, `test_api`, `test_synthetic_data` |
| **Frontend Unit Tests** | `node tests/test-anomaly.mjs` | **PASS (4/4)** | Diverging color mapping, mesh creation, raycast picking, cleanup |
| **Phase 14 Playwright** | `playwright test tests/anomaly.spec.js` | **PASS (4/4, 10.8s)** | Layer toggle, threshold slider, salinity PSU separation, click-to-inspect |
| **Full Browser Regression** | `npm run test:browser` | **PASS (42/42, 1.3m)** | 42 tests across 12 spec files — zero regressions |
| **Code Linting** | `npm run lint` | **PASS (0 errors, 0 warnings)** | ESLint verification |
| **Production Build** | `npm run build` | **PASS (925ms)** | Production bundle built cleanly |
| **Baseline Assertion Gate** | `python scripts/check-baseline.py` | **PASS** | `phase14AnomalyActive: true`, `phase15AIDeferred: true` |
| **Implementation Snapshot** | `python scripts/snapshot-baseline.py phase-14` | **PASS** | 124 files verified and checksummed |

---

## Evidence

Screenshots captured under `docs/evidence/phase-14/`:

1. `01-3d-anomaly-residual-field-overview.png` — 3D anomaly residual spheres rendered on Earth globe with HUD badge and coverage count.
2. `02-anomaly-discrepancy-alerts-and-threshold.png` — Threshold slider interaction, discrepancy alert count badge, and alert items.
3. `03-salinity-anomaly-field-psu.png` — Salinity anomaly field with PSU physical units separation.
4. `04-traceable-anomaly-to-source-profile.png` — Click-to-trace inspection opening `ProfileModal` for originating platform.

Implementation manifest: `docs/evidence/phase-14/implementation-manifest.json` (124 files, all hashes verified).

---

## Deferred to Phase 15

- AI Ocean Assistant Modal (`AIAssistantModal.jsx` and backend AI endpoints)
- Docker compose SIH deployment packaging
- Final cross-phase requirements audit & system packaging
