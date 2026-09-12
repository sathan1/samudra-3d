# Phase 11 report

## Identity and status

- Phase 11 of 15: **Vertical Depth Profile Modal Curves & T-S Correlation Diagrams (Positive-Down Depth Axis, Irregular Proportional Depth Spacing, UNESCO EOS-80 Isopycnals, QC Outlier Gaps, Model Comparison Contract)**, handbook classification MUST HAVE.
- Report version 1, 2026-09-12, 10:42 IST (Asia/Calcutta, UTC+05:30).
- Implementation result: **PASS**. Independent review result: **PENDING**.
- Workspace: `D:\Studies\SIH\Samudra 3D`. Non-Git baseline: `docs/evidence/phase-11/implementation-manifest.json` (verified file hashes).
- Previous-phase gate: Phase 10 implementation PASS, explicit user authorization received to proceed to Phase 11.
- Authority: complete 14-page handbook; roadmap physical p. 10 row 11; supporting detail pp. 4, 6, 9-11, 13; `phase-prompts/PHASE-11.md`. Supporting sources: Problem statement DOCX, SIH2026-IDEA-Presentation.pptx (all slides and notes).
- Source file hashes verified: 36 entry-inventory files unchanged (`check-baseline.py` PASS). Phase-prompts and reference docs preserved.

## Work and baseline

On entry, Phase 10 clickable 3D Argo float markers, in-situ observation ingestion, sensor inspector, and Earth line-of-sight occlusion were fully operational. The `ProfileModal.jsx` displayed float identity and metadata, but vertical depth curves and T-S correlation diagrams were deferred to Phase 11.

Phase 11 implements the complete interactive oceanographic vertical depth curve and T-S diagram charting engine:
1. **Zero-Dependency SVG Oceanographic Charting Engine (`profileCharts.js`):**
   - Built a specialized scientific SVG charting engine adhering strictly to physical oceanography standards without heavy third-party chart libraries.
   - Fully reactive coordinate transformations from physical units (depth in meters, temperature in °C, salinity in PSU, density anomaly in $\text{kg/m}^3$) to SVG viewport pixels.

2. **Inverted Positive-Down Vertical Depth Axis Convention:**
   - Depth is mapped to the vertical Y-axis with $Y(0) = \text{padding.top}$ at the sea surface (top of viewport) and linearly scaling downward to $Y(z_{\max}) = \text{chartHeight} - \text{padding.bottom}$ at the ocean floor/abyss (e.g. 2,000m).
   - Horizontal X-axis plots physical parameter measurements (Temperature in °C / Salinity in PSU).

3. **Irregular Depth Sampling & Monotonic Sorting (`cleanProfileData`):**
   - Correctly represents real-world Argo CTD non-uniform vertical sampling (e.g. dense measurements at 0m, 10m, 25m, 50m in the mixed layer/thermocline, expanding to 250m and 500m intervals at depth) through true proportional depth scaling, rather than uniform array index spacing.
   - Automatically cleans data by sorting levels monotonically by depth and eliminating duplicate depth levels.

4. **WMO QC Flag Visual Discontinuity & Gap Handling:**
   - Color codes profile points by WMO QC flags: good levels (flags 1, 2) in cyan/emerald (`#38bdf8`); questionable or bad levels (flags 3, 4) in crimson alert (`#f43f5e`).
   - Line curves render as discontinuous SVG path segments: valid contiguous points form continuous line segments (`M ... L ...`), while rejected or missing data points intentionally create visible gaps to prevent false scientific interpolation across corrupted depths.
   - Displays clear `"⚠ QC Flag Discontinuity (Gap Rendered)"` notification banner when gaps occur.

5. **Temperature-Salinity (T-S) Diagram & UNESCO EOS-80 Isopycnal Contours:**
   - Scatter-trajectory diagram plotting Practical Salinity on the horizontal X-axis against Potential Temperature on the vertical Y-axis.
   - Computes background isopycnal density reference contours ($\sigma_\theta = 22, 23, 24, 25, 26, 27, 28\,\text{kg/m}^3$) across $(S, T)$ phase space using the UNESCO 1983 Seawater Equation of State (EOS-80 polynomial approximation: pure water density $\rho_w(T)$, salinity coefficient $A(T)$, $B(T)$, and $C$, yielding potential density anomaly $\sigma_\theta = \rho(S, T, 0) - 1000\,\text{kg/m}^3$).
   - Profile points colored according to oceanographic depth zones (epipelagic $\le 100\text{m}$, mesopelagic $100\text{m}-500\text{m}$, and bathypelagic $>500\text{m}$).

6. **Interactive Tooltips, Crosshairs & Variable Switching Tabs:**
   - Tabbed navigation allows instantaneous switching between Temperature (°C), Salinity (PSU), and T-S Diagram views.
   - Dynamic SVG crosshairs intersect active hover targets, displaying exact physical values, depth (m), calculated potential density ($\sigma_\theta$), and QC status in the scientific tooltip bar.

7. **Model Comparison Contract Disclosure Policy:**
   - Displays co-located ROMS model profile overlay checkbox in disabled state with explicit badge `"Phase 13 Contract"`.
   - Strictly avoids premature or fabricated model curve simulation, preserving truthful observation provenance.

8. **Accessibility & Dialog Lifecycle:**
   - Profile modal supports keyboard navigation, accessible close button, and immediate Escape key dismissal with focus restoration.
   - Fully responsive down to mobile viewports.

Runtime: Windows 10.0.26200 x64; Node 24.19.0; Vite 8.3.0; React 18.3.1; Three.js 0.168.0; FastAPI 0.141.1; Uvicorn 0.52.4; Edge 153 (Chromium headless).

## Changed files

| File | Change | Purpose | Requirement | Prior work preserved |
| --- | --- | --- | --- | --- |
| `frontend/src/utils/profileCharts.js` | Added | UNESCO EOS-80 equation of state, isopycnal contour calculation, monotonic depth sorting, positive-down scaling, discontinuous SVG path generation, axis ticks | H11 | Yes |
| `frontend/tests/test-profile-charts.mjs` | Added | Unit tests for scientific calculations, isopycnals, positive-down inversion, depth sorting, and gap detection | H11 | Yes |
| `frontend/src/components/ProfileModal.jsx` | Modified | Interactive tabbed modal with SVG vertical depth curves, T-S diagram with isopycnals, hover crosshairs, QC gap handling, Phase 13 model contract | H11 | Yes |
| `frontend/src/App.jsx` | Modified | Integrated `fetchArgoFloatById()` detailed profile ingestion and Phase 11 status labels | H11 | Yes |
| `frontend/tests/profile-modal.spec.js` | Added | Playwright end-to-end tests for inverted depth curves, salinity curves, T-S diagram with isopycnals, QC gap handling, and visual evidence | H11 | Yes |
| `frontend/tests/argo.spec.js` | Modified | Maintained backwards-compatible close button and testid selectors | H10, H11 | Yes |
| `scripts/check-baseline.py` | Modified | Asserted Phase 11 profileCharts active; asserted Phase 12 gliders deferred | Verification | Yes |
| `docs/acceptance-phase-11.md` | Modified | Full checklist of AC01–AC10 marked PASS with verification notes | Verification | Yes |
| `docs/decisions.md` | Modified | Recorded decisions D58–D62 for Phase 11 | Architectural | Yes |
| `docs/phase-status.md` | Modified | Marked Phase 11 PASS / PENDING; summarized implementation | Verification | Yes |

## Acceptance criteria verification

All 10 Phase 11 acceptance criteria verified and passed:

- **AC01: In-Situ Profile Retrieval & Validation (PASS)**
  - Full observation profile (depths, temperature, salinity, QC flags, metadata) retrieved from FastAPI `/api/insitu/argo/{id}` via `fetchArgoFloatById()`.
  - Verified for `ARGO_2902145` (Bay of Bengal, 14 levels), `ARGO_2902198` (Arabian Sea, 14 levels), `ARGO_2902210_REAL` (real local sample), and `ARGO_TEST_QC_OUTLIER`.
- **AC02: Positive-Down Vertical Depth Axis Inversion (PASS)**
  - Depth is plotted on the vertical axis with $Y=0$ at the sea surface (top) and increasing downward to max depth ($Y=2000\text{m}$ at bottom), displaying `Depth (m) ↓`.
  - Physical measurement value plotted horizontally on X-axis (`Temperature (°C) →` / `Salinity (PSU) →`). Verified in `test-profile-charts.mjs` and `profile-modal.spec.js` test 1.
- **AC03: Irregular Depth Spacing & Monotonic Sorting (PASS)**
  - Non-uniform depth intervals (0m, 10m, 25m, 50m ... 2000m) scaled proportionally to true physical depth.
  - Automatically sorts depth monotonically and deduplicates redundant depth entries. Verified in `test-profile-charts.mjs`.
- **AC04: QC Flag Visualization & Discontinuous Curve Gaps (PASS)**
  - Outlier profile `ARGO_TEST_QC_OUTLIER` displays crimson alert point (`#f43f5e`), QC Alert label, and `"⚠ QC Flag Discontinuity (Gap Rendered)"` banner.
  - Discontinuous SVG path segments prevent false scientific interpolation across corrupted levels. Verified in `profile-modal.spec.js` test 4.
- **AC05: Variable Switching (PASS)**
  - Tabbed controls switch seamlessly between Temperature (°C) and Salinity (PSU), updating axes, units, ticks, and colors without remount glitches. Verified in `profile-modal.spec.js` tests 1 & 2.
- **AC06: Interactive Temperature-Salinity (T-S) Diagram (PASS)**
  - T-S diagram plots Potential Temperature vs Salinity with depth-colored observation points.
  - Generates 7 UNESCO EOS-80 potential density anomaly reference contours ($\sigma_\theta = 22 \dots 28\,\text{kg/m}^3$). Verified in `test-profile-charts.mjs` and `profile-modal.spec.js` test 3.
- **AC07: Interactive Tooltips & Crosshairs (PASS)**
  - Hovering observation points reveals depth (m), physical value (°C / PSU), density anomaly ($\sigma_\theta$), and QC flag status. SVG dashed crosshairs track cursor. Verified in `profile-modal.spec.js`.
- **AC08: Model Comparison Contract Disclosure (PASS)**
  - Model co-location checkbox displayed in disabled state with explicit badge `"Phase 13 Contract"` and disclaimer text. Truthful observation provenance preserved without fabricated curves. Verified in `profile-modal.spec.js` test 4.
- **AC09: Accessible Dialog Lifecycle (PASS)**
  - Accessible modal container with close button (`✕ Close`), Escape key closing, and focus restoration. Verified in `profile-modal.spec.js` test 4.
- **AC10: Automated Test Suite & Non-Regression Gate (PASS)**
  - Unit tests in `frontend/tests/test-profile-charts.mjs` pass 100% (6/6 suites).
  - Playwright spec `frontend/tests/profile-modal.spec.js` passes 100% (4/4 tests).
  - Full browser test suite passes cleanly: **30/30 tests passed** across all 9 specs.
  - ESLint passes with 0 errors and 0 warnings. Production build passes cleanly in 619ms.

## Evidence and screenshots

Four required high-resolution visual evidence artifacts captured in `docs/evidence/phase-11/`:

1. `01-temperature-depth-profile.png`: Profile modal open displaying temperature depth profile with inverted positive-down vertical depth axis (0m at surface at top, 2,000m abyss at bottom), temperature on X-axis, proportional depth spacing, hover crosshair, and tooltip readout.
2. `02-salinity-depth-profile.png`: Modal tab switched to Salinity (PSU), displaying salinity depth profile with inverted depth axis.
3. `03-ts-diagram-isopycnals.png`: Modal tab switched to T-S Diagram, displaying potential density reference contours $\sigma_\theta$ (22–28 $\text{kg/m}^3$) calculated via UNESCO EOS-80, salinity on X-axis, temperature on Y-axis, and active hover readout.
4. `04-qc-outlier-gap-handling.png`: Profile modal for outlier float (`ARGO_TEST_QC_OUTLIER`) showing QC flag alerts, discontinuous curve gap, warning banner, disabled Phase 13 model comparison contract checkbox, and Escape key dismissal.

## Decisions and rationale

- **D58: Zero-dependency React SVG oceanographic charting engine:** Custom SVG rendering avoids heavy external chart libraries, providing absolute control over inverted vertical depth coordinates, irregular depth scaling, and crisp vectorized responsive rendering.
- **D59: Inverted positive-down vertical depth axis convention:** Sea surface ($z=0$) at top and ocean floor at bottom adheres strictly to universal oceanographic convention.
- **D60: WMO QC flag visual discontinuity policy:** Corrupted or flagged data points break SVG path continuity, rendering explicit gaps rather than false linear interpolations across bad data.
- **D61: UNESCO EOS-80 Seawater Equation of State for Isopycnal Contours:** Potential density anomaly $\sigma_\theta = \rho(S, T, 0) - 1000\,\text{kg/m}^3$ computed using UNESCO 1983 polynomial formulas across $(S, T)$ domain.
- **D62: Model comparison contract disclosure policy:** Truthful observation display preserved; numerical model collocation overlay toggle provided with disabled state and explicit badge `"Phase 13 Contract"`.

## Non-regression confirmation

All prior phase features and capabilities were tested and verified:
- Phase 1 & 2: Responsive shell, Three.js 3D Earth Globe, OrbitControls, theme switcher.
- Phase 3 & 4: NetCDF synthetic data generator, FastAPI backend, metadata endpoints.
- Phase 5: 3D scalar temperature field texture rendering on globe with thermal color legend.
- Phase 6: Dynamic thermal/haline color palettes and rapid variable switching.
- Phase 7: Interactive depth slicer (0m to 4,000m) with snapping and keyboard navigation.
- Phase 8: 4D time animation playback controls (Play/Pause, speed, looping, frame stepping).
- Phase 9: 3D ocean current vector particle streamlines with GPU InstancedMesh.
- Phase 10: Clickable 3D Argo float markers, raycasting, Earth occlusion, and sensor inspector.
- Phase 11: Interactive vertical depth profile curves, T-S correlation diagrams with UNESCO EOS-80 isopycnals, and QC gap handling.

Full browser test run: **30 passed in 50.3s** (0 failures).

## Advancement gate and deferrals

Phase 11 implementation is complete and ready for cross-check.
Underwater glider transect visualization (GOOD TO HAVE) is deferred to Phase 12.
Co-located numerical model profile extraction and bias delta computation are deferred to Phase 13.
