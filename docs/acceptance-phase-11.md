# Phase 11 acceptance checklist: Vertical Depth Profile Modal Curves

Authority: `SAMUDRA-3D_SIH26067_Master_Handbook.pdf` (roadmap row 11, physical p. 10; supporting detail pp. 9-11, 13) and `phase-prompts/PHASE-11.md`.

## Implementation verification criteria

- [x] **AC01: In-Situ Profile Retrieval & Validation**
  - Full observation profile (depths, temperature, salinity, QC flags, metadata) retrieved from backend `/api/insitu/argo/{id}` via `fetchArgoFloatById()`.
  - Verified against source profiles for `ARGO_2902145` (Bay of Bengal, 14 levels), `ARGO_2902198` (Arabian Sea, 14 levels), `ARGO_2902210_REAL` (real reference APEX float), and `ARGO_TEST_QC_OUTLIER` (fixture with bad QC flags).
  - Backend returns HTTP 404 cleanly for unknown identifiers. Verified via `backend/tests/test_insitu.py`.

- [x] **AC02: Positive-Down Vertical Depth Axis Inversion**
  - Depth is plotted on the vertical axis with 0m (sea surface) at the top and increasing downward to max depth (e.g. 2,000m), adhering strictly to physical oceanographic conventions.
  - Linear mapping function $Y(z) = \text{padding.top} + (z / z_{\max}) \times \text{plotHeight}$ ensures surface observations appear at top of SVG chart.
  - Verified in `frontend/tests/test-profile-charts.mjs` and Playwright spec `frontend/tests/profile-modal.spec.js`.

- [x] **AC03: Irregular Depth Spacing & Monotonic Sorting**
  - Handles non-uniform vertical intervals (dense thermocline sampling at 0m, 10m, 25m, 50m vs sparse deep ocean sampling at 1000m, 1500m, 2000m) using true proportional depth scaling.
  - Automatically sorts depth levels monotonically and deduplicates duplicate levels in `cleanProfileData()`.
  - Verified in `frontend/tests/test-profile-charts.mjs`.

- [x] **AC04: QC Flag Visualization & Discontinuous Curve Gaps**
  - Measurements color-coded by WMO QC flags: good (flags 1, 2) in cyan/emerald (#38bdf8 / #10b981); bad/outlier (flags 3, 4) in crimson alert (#f43f5e).
  - Missing or rejected data points break line continuity, rendering visible gaps rather than false scientific interpolation across bad data.
  - SVG path generator outputs separated `M ... L ...` sub-paths for continuous valid segments. Verified in `frontend/tests/test-profile-charts.mjs` and Playwright test 4.

- [x] **AC05: Variable Switching (Temperature / Salinity)**
  - Tabbed controls allow seamless toggling between Potential Temperature (°C) and Practical Salinity (PSU), updating axes, units, scales, and gradient colors without remounting glitches.
  - Verified in `frontend/tests/profile-modal.spec.js` (tests 1 and 2).

- [x] **AC06: Interactive Temperature-Salinity (T-S) Diagram**
  - Scatter/path curve plotting Temperature against Salinity with point coloring by depth zone.
  - Displays computed reference isopycnal density contours ($\sigma_\theta = 22 \dots 28\,\text{kg/m}^3$) calculated via the UNESCO 1983 seawater equation of state (EOS-80).
  - Verified in `frontend/tests/test-profile-charts.mjs` and Playwright test 3 (`03-ts-diagram-isopycnals.png`).

- [x] **AC07: Interactive Tooltips & Crosshairs**
  - Hover / pointer tracking reveals exact depth (m), parameter value (°C or PSU), calculated potential density anomaly ($\sigma_\theta$), and QC status at each observation level.
  - SVG crosshairs dynamically intersect active hover position. Verified in Playwright tests 1, 2, and 3.

- [x] **AC08: Model Comparison Contract Disclosure**
  - Discloses model co-location overlay toggle with disabled state and explicit badge `"Phase 13 Contract"`.
  - Truthful observation display preserved without premature collocation or fabricated model curves. Verified in Playwright test 4.

- [x] **AC09: Accessible Dialog Lifecycle & Focus Management**
  - Modal container with `role="region"`, `aria-labelledby="profile-heading"`, close button (`✕ Close`), Escape key closing, and focus restoration.
  - Verified in Playwright test 4 (`04-qc-outlier-gap-handling.png`).

- [x] **AC10: Automated Test Suite & Non-Regression Gate**
  - Unit tests in `frontend/tests/test-profile-charts.mjs` pass 100% (6/6 suites).
  - Playwright browser tests in `frontend/tests/profile-modal.spec.js` pass with exit code 0 (4/4 tests).
  - All 30 browser tests across 9 test suites pass cleanly with exit code 0.
  - ESLint (0 errors, 0 warnings) and production build pass cleanly in 619ms.
  - Baseline verification script `scripts/check-baseline.py` exits with PASS.
