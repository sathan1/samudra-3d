# Phase 13 acceptance checklist: In-situ Observation vs Model Collocation & Bias Analytics

Authority: `SAMUDRA-3D_SIH26067_Master_Handbook.pdf` (roadmap row 13, physical p. 10; supporting detail pp. 5-6, 9-11, 13) and `phase-prompts/PHASE-13.md`.

## Pre-implementation verification criteria

- [x] **AC01: 4D Spatio-Temporal Collocation Engine & API Endpoints**
  - Backend service `collocation.py` matches arbitrary observation points $(t_{obs}, \text{lat}_{obs}, \text{lon}_{obs}, z_{obs})$ against 4D numerical model arrays $(t, z, y, x)$.
  - Endpoints `GET /api/collocation/profile/{profile_id}`, `GET /api/collocation/glider/{glider_id}`, and `GET /api/collocation/health` active.
  - Rejects unsupported grids, out-of-domain coordinates, or land-masked points with explicit error codes (`OUT_OF_BOUNDS`, `MASKED_LAND`).

- [x] **AC02: Spatial Trilinear Interpolation (Rectilinear 3D Grid)**
  - Implements true 3D trilinear interpolation across bounding grid cells in latitude, longitude, and depth.
  - Never performs crude nearest-neighbor lookup or unscaled Euclidean mixing of degrees, metres, and seconds.
  - Handles exact grid nodes, interior volume points, and domain boundaries without distortion.

- [x] **AC03: Temporal Policy & Matching Tolerance**
  - Implements defined temporal interpolation between bounding model time slices (default `linear`) or nearest-time matching (`nearest`) within defined tolerance $\Delta t \le 12\text{h}$.
  - Returns temporal offset in hours and spatial distance offset in kilometres.

- [x] **AC04: Analytical Affine Field Verification**
  - Verified against an independently defined analytical affine field $f(\text{lat}, \text{lon}, \text{depth}, t) = c_0 + c_1\text{lat} + c_2\text{lon} + c_3\text{depth} + c_4 t$.
  - Trilinear interpolation must match analytical ground-truth to machine precision ($< 10^{-5}$ error).

- [x] **AC05: Resolved Residual Sign Convention**
  - Adopts the strictly recorded convention: $\Delta = \text{MODEL} - \text{OBSERVED}$.
  - Negative delta indicates model under-prediction; positive delta indicates model over-prediction.
  - Verified: $\text{model}=18.5$ and $\text{observed}=19.1 \implies \Delta = -0.6$ (under-prediction); $\text{model}=19.1$ and $\text{observed}=18.5 \implies \Delta = +0.6$ (over-prediction).

- [x] **AC06: Statistical Metrics (Bias, MAE, RMSE)**
  - Computes $\text{Bias} = \frac{1}{N} \sum (m_i - o_i)$, $\text{MAE} = \frac{1}{N} \sum |m_i - o_i|$, and $\text{RMSE} = \sqrt{\frac{1}{N} \sum (m_i - o_i)^2}$ over valid matched pairs.
  - Verified test case: for residuals $[-1, 0, 2]$, checks $\text{Bias} = 1/3 \approx 0.333$, $\text{MAE} = 1.0$, and $\text{RMSE} = \sqrt{5/3} \approx 1.291$.
  - Strictly separates variables: never mixes Temperature (°C) and Salinity (PSU) metrics.

- [x] **AC07: Strict QC Flag & Missing Data Filtering**
  - Observation levels with bad WMO QC flags (flags 3, 4) or missing data (`depth === null`, NaN) are excluded from statistical metrics.
  - Excluded levels marked `valid = false` with explicit `rejection_reason = "BAD_QC_FLAG"`.

- [x] **AC08: ProfileModal Interactive Model Overlay & Delta Inspector**
  - Un-disables model overlay checkbox (`input#toggle-model-overlay`, `data-testid="model-overlay-toggle"`).
  - When checked, renders the co-located model vertical profile as a dashed magenta curve overlaid on the same inverted positive-down depth SVG chart.
  - Interactive crosshairs show observed value, model value, and live $\Delta$.
  - Displays statistical bias pill (`data-testid="collocation-metrics-badge"`) with Bias, MAE, RMSE, and match count.

- [x] **AC09: ComparisonPanel Difference & Model Health Assessment**
  - `ComparisonPanel.jsx` updates from placeholder to live numerical model evaluation:
    - Difference metric shows computed Bias.
    - Model health assessment classifies model skill based on RMSE (e.g. `EXCELLENT`, `ACCEPTABLE`, `REQUIRES_CALIBRATION`).

- [x] **AC10: Automated Test Suite, Performance & Non-Regression Gate**
  - `backend/tests/test_collocation.py` passes 100% with analytical affine checks.
  - Collocation response latency measured $< 50\text{ms}$.
  - `frontend/tests/test-collocation.mjs` passes 100%.
  - Dedicated Playwright test `collocation.spec.js` passes with 4 screenshots in `docs/evidence/phase-13/`.
  - All 38 browser tests across 11 test specs pass without regression.
  - ESLint (0 errors, 0 warnings), production build, and `scripts/check-baseline.py` pass.
