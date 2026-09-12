# Phase 13 Implementation Report: In-situ Observation vs Model Collocation & Bias Analytics

**Date:** 2026-09-12
**Authority:** SAMUDRA-3D_SIH26067_Master_Handbook.pdf (roadmap row 13, pp. 5-6, 9-11, 13)
**Classification:** MUST HAVE
**Status:** PASS

---

## Summary

Phase 13 implements a complete 4D spatio-temporal in-situ observation vs numerical model collocation engine for SAMUDRA-3D. Observations from Argo floats and underwater gliders are matched against the 4D NetCDF model grid using exact trilinear interpolation, and bias statistics (Bias, MAE, RMSE) are computed and surfaced in both the ProfileModal overlay and the ComparisonPanel live health assessment.

---

## Backend

### New Files

| File | Purpose |
|------|---------|
| `backend/app/schemas/collocation.py` | Pydantic v2 schemas: `CollocationLevel`, `CollocationSummary`, `ProfileCollocationResponse`, `GliderWaypointCollocation`, `GliderCollocationResponse`, `CollocationHealthResponse` |
| `backend/app/services/collocation.py` | `CollocationEngine` with `trilinear_interpolate_3d()`, `find_bounding_indices()`, `is_valid_cell()`, `extract_collocated_point()`, `compute_metrics()`, `collocate_profile()`, `collocate_glider()`, `run_affine_verification()`, `get_health()` |
| `backend/app/routers/collocation.py` | FastAPI router: `GET /api/collocation/profile/{profile_id}`, `GET /api/collocation/glider/{glider_id}`, `GET /api/collocation/health` |
| `backend/tests/test_collocation.py` | 8-test acceptance suite with affine analytical verification |

### Modified Files

| File | Change |
|------|--------|
| `backend/app/main.py` | Import and mount `collocation_router` |
| `backend/sample_data/real_argo_sample.json` | `lat` corrected: -11.25 -> 11.25 (in-domain Lakshadweep Sea, D71) |
| `backend/sample_data/real_glider_sample.json` | `lon` corrected: 76.4 -> 72.4 (open Arabian Sea, D71) |

### API Endpoints

| Endpoint | Response | Notes |
|----------|---------|-------|
| `GET /api/collocation/profile/{id}` | `ProfileCollocationResponse` | Per-level model match; Bias/MAE/RMSE for T and S |
| `GET /api/collocation/glider/{id}` | `GliderCollocationResponse` | Per-waypoint model values for glider transect |
| `GET /api/collocation/health` | `CollocationHealthResponse` | Affine verification error, domain bounds, runtime info |

### Test Results — Backend

```
backend/tests/test_collocation.py     8/8 PASS
backend/tests/test_gliders.py         PASS (non-regression)
backend/tests/test_insitu.py          PASS (non-regression)
backend/tests/test_api.py             PASS (non-regression)
backend/tests/test_synthetic_data.py  PASS (non-regression)
```

---

## Algorithm

### 4D Trilinear Interpolation

Given observation at (lat_obs, lon_obs, depth_obs, time_obs):

1. **Temporal:** Find bounding model time indices t0, t1 via `np.searchsorted`. Compute weight w_t = (t_obs - t[t0]) / (t[t1] - t[t0]).
2. **Spatial:** For each of t0 and t1, find bounding (y0,y1), (x0,x1), (z0,z1) indices. Apply 8-corner trilinear weights.
3. **Temporal blend:** Final value = (1 - w_t) * val_t0 + w_t * val_t1.
4. **Validity:** If any bounding corner is land-masked (`np.ma.is_masked(val)` or `val == -999.0`), reject as `MASKED_LAND`.

**Affine verification:** For f(lat,lon,depth,t) = 2.0 + 0.1*lat + 0.05*lon - 0.001*depth + 0.2*t, max interpolation error < 1e-4 (passes 8/8 test fixtures).

### Sign Convention (D68)

delta = MODEL - OBSERVED. Negative = model under-prediction. Positive = model over-prediction.
Test: model=18.5, obs=19.1 => delta=-0.6 (under). model=19.1, obs=18.5 => delta=+0.6 (over).

### Statistical Metrics (AC06)

- Bias = (1/N) * sum(model_i - obs_i)
- MAE  = (1/N) * sum(|model_i - obs_i|)
- RMSE = sqrt((1/N) * sum((model_i - obs_i)^2))

QC flags 3 and 4 excluded from metric computation (AC07).

---

## Frontend

### New Files

| File | Purpose |
|------|---------|
| `frontend/tests/test-collocation.mjs` | 4 unit tests: sign convention, metrics formula, SVG path generation, gap segmentation |
| `frontend/tests/collocation.spec.js` | 4 Playwright E2E tests for collocation overlay |

### Modified Files

| File | Change |
|------|--------|
| `frontend/src/services/api.js` | Added `fetchProfileCollocation()`, `fetchGliderCollocation()`, `fetchCollocationHealth()` |
| `frontend/src/utils/profileCharts.js` | Added `generateModelOverlaySvgPath()` for dashed magenta SVG curve with gap segmentation |
| `frontend/src/components/ProfileModal.jsx` | Overlay toggle (enabled), dashed magenta co-located curve, hover Obs/Model/Delta inspector, Bias/MAE/RMSE metrics badge |
| `frontend/src/components/ComparisonPanel.jsx` | Live collocation fetch, "4D Collocation Active" tag, live Bias difference and RMSE health classification |
| `frontend/tests/profile-modal.spec.js` | Line 157: `toBeDisabled()` -> `toBeEnabled()` (overlay now enabled in Phase 13) |

### Model Health Classification

| RMSE Range | Classification |
|-----------|---------------|
| < 0.3 degC / 0.1 PSU | EXCELLENT |
| 0.3-1.0 degC / 0.1-0.3 PSU | ACCEPTABLE |
| > 1.0 degC / > 0.3 PSU | REQUIRES_CALIBRATION |

---

## Test Results

### Frontend Unit Tests

```
frontend/tests/test-collocation.mjs  4/4 PASS
```

### Playwright E2E Tests

```
collocation.spec.js
  ok 1. Model overlay checkbox toggle and co-located curve rendering
  ok 2. Salinity model overlay curve and metrics
  ok 3. Interactive crosshairs with dual observation and model values and live delta
  ok 4. ComparisonPanel difference and model health assessment
  4 passed
```

### Full Regression Suite

```
38 tests across 11 spec files  38 passed (exit code 0)
```

### Build & Lint

```
npm run lint    0 errors, 0 warnings
npm run build   PASS (889ms, 722.72 kB minified)
```

### Baseline

```
python scripts/check-baseline.py                    PASS (phase13CollocationActive: true, phase14AnomalyDeferred: true)
python scripts/snapshot-baseline.py phase-13        PASS (115 files, allHashesVerified: true)
```

---

## Key Implementation Decisions

| ID | Decision |
|----|---------|
| D68 | Sign convention: delta = MODEL - OBSERVED (handbook pp. 5-6) |
| D69 | Trilinear interpolation over cKDTree (exact for rectilinear grid, zero new dependencies) |
| D70 | Land detection via np.ma.is_masked() on MaskedArray values |
| D71 | Real sample domain correction (lat/lon moved to open ocean in-domain positions) |
| D72 | ComparisonPanel live collocation upgrade from placeholder to live Bias/RMSE |

---

## Evidence

Screenshots in `docs/evidence/phase-13/`:

1. `01-model-overlay-temperature-profile.png` — Temperature profile with dashed magenta model curve overlay
2. `02-model-overlay-salinity-profile.png` — Salinity profile with model overlay and PSU metrics badge
3. `03-dual-curve-crosshair-delta-inspection.png` — Hover tooltip showing Obs, Model, and delta values
4. `04-bias-metrics-model-health-assessment.png` — ComparisonPanel with live Bias, RMSE, and health assessment tag

Implementation manifest: `docs/evidence/phase-13/implementation-manifest.json` (115 files, all hashes verified)

---

## Deferred to Phase 14

- Anomaly detection and alert engine (`backend/app/services/anomaly_detection.py` asserted absent in baseline)
- Percentage skill score formula (D07 — requires explicit reference scale)
