# Phase 10 report

## Identity and status

- Phase 10 of 15: **Clickable 3D Argo Float Markers (Raycasting, In-situ Profile Ingestion, Sensor Inspector, Earth Occlusion)**, handbook classification MUST HAVE.
- Report version 1, 2026-09-12, 10:28 IST (Asia/Calcutta, UTC+05:30).
- Implementation result: **PASS**. Independent review result: **PENDING**.
- Workspace: `D:\Studies\SIH\Samudra 3D`. Non-Git baseline: `docs/evidence/phase-10/implementation-manifest.json` (verified file hashes).
- Previous-phase gate: Phase 9 implementation PASS, explicit user authorization received to proceed to Phase 10.
- Authority: complete 14-page handbook; roadmap physical p. 10 row 10; supporting detail pp. 4, 6, 9-11, 13; `phase-prompts/PHASE-10.md`. Supporting sources: Problem statement DOCX, SIH2026-IDEA-Presentation.pptx (all slides and notes).
- Source file hashes verified: 36 entry-inventory files unchanged (`check-baseline.py` PASS). Phase-prompts and reference docs preserved.

## Work and baseline

On entry, Phase 9 3D current vector particle streamlines and Phase 8 4D time playback controls were operational on the Three.js globe. In `SidebarControls.jsx`, the "Argo floats" overlay checkbox was disabled, and `ProfileModal.jsx` served as an empty placeholder ("No sensor selected").

Phase 10 implements the complete 3D in-situ observation marker and sensor inspection engine:
1. **Dedicated In-Situ Observation Backend Service & Router (`routes_insitu.py`, `insitu_service.py`, `insitu.py`):**
   - Created dedicated FastAPI router in `backend/app/routers/routes_insitu.py` with endpoints `/api/insitu/profiles`, `/api/insitu/argo`, `/api/insitu/argo/{id}`, and `/api/insitu/status`.
   - Typed Pydantic schemas in `backend/app/schemas/insitu.py`: `ArgoProfileSummary`, `ArgoProfileDetail`, `QCFlagSummary`, `InsituStatusResponse`.
   - Maintained 100% backwards compatibility with Phase 4's `/api/insitu/profiles` endpoint.

2. **Domain Boundary Verification & WMO Quality Control (QC):**
   - Spatial domain validation: Lat $[-30^\circ, 30^\circ]$, Lon $[30^\circ, 120^\circ]$. Out-of-domain coordinate records are rejected during ingestion.
   - WMO Argo standard QC flag computation (1 = Good, 2 = Probably Good, 3 = Probably Bad, 4 = Bad, 9 = Missing).
   - Filtering query parameter `?qc_filter=true` rejects profiles failing quality thresholds (e.g. successfully excludes fixture `ARGO_TEST_QC_OUTLIER`).

3. **Pressure-to-Depth Conversion & Real Local Sample Support:**
   - Documented UNESCO 1983 seawater hydrostatic pressure-to-depth approximation ($z = p \times 0.992\,\text{m/dbar}$).
   - Ingestion of documented authentic INCOIS reference profile `ARGO_2902210_REAL` (`backend/sample_data/real_argo_sample.json`) with pressure in dbar and raw metadata.
   - Explicit `source_mode` distinction: synthetic records tagged `SYNTHETIC`; local reference tagged `REAL_LOCAL`.
   - Live external INCOIS ERDDAP network feed truthfully recorded as an offline environment integration gap in status telemetry.

4. **3D Spherical Marker Placement & Visual Styling (`argoProfiles.js`):**
   - Spherical Cartesian positioning at radial elevation $R = 100.8$, floating cleanly above the solid Earth globe ($R = 100$) and 3D scalar field ($R = 100.2$).
   - High-contrast visual hierarchy: beacon sphere with emissive illumination (`0xf59e0b` amber / `0x38bdf8` sky blue selected), surface anchor pin stem, selection halo ring, and wireframe pulse glow.

5. **Earth Line-of-Sight Occlusion & Raycasting Discrimination:**
   - Physically accurate line-of-sight sphere intersection and outward normal dot product tests prevent far-side markers from shining through the globe or intercepting click raycasts.
   - Pointer distance tracker (threshold $\le 4\,\text{px}$) distinguishes intentional clicks from OrbitControls camera rotation and pan gestures.

6. **Interactive Sensor Inspector (`ProfileModal.jsx`, `SidebarControls.jsx`, `OceanCanvas.jsx`):**
   - Selecting a marker opens sensor inspector in `ProfileModal.jsx` displaying sensor identity, WMO number, coordinates, timestamp, cycle number, data center (`INCOIS-DAC`), QC pass percentage, depth range, and Phase 11 T-S chart preview notice.
   - Accessible keyboard dropdown in sidebar controls (`select#argo-float-select`) provides full non-mouse navigation.
   - Viewport floating HUD badge: `ARGO FLOATS: 3 active (INCOIS-DAC)`.
   - Measured WebGL render performance: **165 FPS** in headless Chromium/Edge.

Runtime: Windows 10.0.26200 x64; Node 24.19.0; Vite 8.3.0; React 18.3.1; Three.js 0.168.0; FastAPI 0.141.1; Uvicorn 0.52.4; Edge 153 (Chromium headless).

## Changed files

| File | Change | Purpose | Requirement | Prior work preserved |
| --- | --- | --- | --- | --- |
| `backend/app/schemas/insitu.py` | Added | Typed Pydantic schemas for in-situ profiles, summaries, QC metrics, and status | H10 | Yes |
| `backend/sample_data/real_argo_sample.json` | Added | Documented authentic INCOIS reference Argo profile format with dbar pressure | H10 | Yes |
| `backend/app/services/insitu_service.py` | Added | Normalization, domain boundary checks, QC flag analysis, and UNESCO pressure conversion | H10 | Yes |
| `backend/app/routers/routes_insitu.py` | Added | Dedicated in-situ endpoints: `/api/insitu/profiles`, `/api/insitu/argo`, `/api/insitu/argo/{id}`, `/api/insitu/status` | H10 | Yes |
| `backend/app/main.py` | Modified | Registered `insitu_router` | H10 | Yes |
| `backend/app/routers/ocean.py` | Modified | Removed redundant placeholder endpoint in favor of `routes_insitu.py` | H10 | Yes |
| `backend/tests/test_insitu.py` | Added | Backend acceptance tests for in-situ ingestion, filtering, conversion, and provenance | H10 | Yes |
| `frontend/src/utils/argoProfiles.js` | Added | 3D marker geometry, spherical coordinates, Earth occlusion test, raycasting, formatting | H10/H25 | Yes |
| `frontend/src/services/api.js` | Modified | Added `fetchArgoFloats`, `fetchArgoFloatById`, and `fetchInsituStatus` client methods | H10 | Yes |
| `frontend/src/components/ProfileModal.jsx` | Modified | Replaced placeholder with interactive sensor inspector displaying typed metadata and QC telemetry | H10/H17 | Yes |
| `frontend/src/components/ComparisonPanel.jsx` | Modified | Forwarded `selectedFloat` and `onSelectFloat` to `ProfileModal` | H10 | Yes |
| `frontend/src/components/SidebarControls.jsx` | Modified | Enabled `input#layer-argo` checkbox and added accessible keyboard selector | H10/H17 | Yes |
| `frontend/src/components/OceanCanvas.jsx` | Modified | Integrated 3D Argo markers, drag vs click raycasting, Earth occlusion, and HUD badge | H10/H29 | Yes |
| `frontend/src/App.jsx` | Modified | Lifted `showArgo` and `selectedFloat` state, updated Phase label to Phase 10 | H10/H17 | Yes |
| `frontend/tests/test-argo.mjs` | Added | Standalone unit tests for marker placement, occlusion geometry, formatting, and disposal | H10 | Yes |
| `frontend/tests/argo.spec.js` | Added | Playwright tests: layer toggle, marker selection, modal metadata, drag vs click, FPS benchmark | U05 | Yes |
| `frontend/tests/shell.spec.js` | Modified | Updated aside controls count (14 total: 10 enabled, 4 disabled) and keyboard tab navigation | U05 | Yes |
| `scripts/check-baseline.py` | Modified | Assert Phase 10 Argo profiles active and Phase 11 T-S charts deferred | U01/U02 | Yes |
| `docs/acceptance-phase-10.md` | Added | Pre-implementation checklist AC01–AC10 marked PASS | U06 | Yes |
| `docs/decisions.md` | Modified | Added decisions D53–D57 (router architecture, provenance disclosure, Earth occlusion, drag vs click, UNESCO pressure conversion) | U02 | Yes |
| `docs/phase-status.md` | Modified | Phase 10 updated to PASS/PENDING | U06 | Yes |
| `docs/phase-reports/phase-10-report.md` | Added | This formal report | U06 | Yes |

Non-Git baseline: `docs/evidence/phase-10/implementation-manifest.json` (verified file hashes).

## Requirement and acceptance traceability

| Requirement ID | Source and physical page | Acceptance criterion | Implementation file | Verification ID | Result |
| --- | --- | --- | --- | --- | --- |
| H10 | Handbook p. 10 roadmap row 10 | Clickable 3D Argo Float Markers (Raycasting, In-situ Profile Ingestion, Sensor Inspector, Earth Occlusion) | routes_insitu.py, argoProfiles.js, OceanCanvas.jsx, ProfileModal.jsx | AC01–AC09 | PASS |
| H16 | Handbook pp. 1,3,5 | React 18, Three.js, Vite frontend stack | package.json, App.jsx, OceanCanvas.jsx | AC01/AC04 | PASS |
| H17 | Handbook p. 9 | Sidebar overlay checkbox, accessible selector, and Viewport HUD floats readout | SidebarControls.jsx, OceanCanvas.jsx | AC08/AC09 | PASS |
| H22 | Handbook pp. 3,6-7 | Numerical observation data served with typed metadata, WMO IDs, and QC flags | insitu_service.py, routes_insitu.py | AC01/AC02 | PASS |
| H25 | Handbook p. 6 | Measured browser FPS (>60 FPS target); smooth 3D globe rendering with markers | Playwright performance run | AC10 | PASS (165 FPS measured) |
| H29 | Handbook p. 12 | Clean WebGL resource disposal and bounding box/domain validation | argoProfiles.js, OceanCanvas.jsx | AC02/AC09 | PASS |
| U03 | User requirement | Clean build & lint; zero errors, zero warnings | `npm run build`, `npm run lint` | AC10 | PASS |
| U05 | User requirement | Playwright browser suite (26 tests) passing across 8 test specs | `tests/*.spec.js` | AC10 | PASS (26/26) |

## Executed checks

| Check | Exact command | Working directory | Actual result | Exit code | Evidence |
| --- | --- | --- | --- | --- | --- |
| In-situ Backend Acceptance Tests | `python backend/tests/test_insitu.py` | `D:\Studies\SIH\Samudra 3D` | 5/5 test sections PASSED: status, profile filtering, argo summaries, detailed profile, domain checks | 0 | `test_insitu.py` exit 0 |
| Phase 4 API Regression Tests | `python backend/tests/test_api.py` | `D:\Studies\SIH\Samudra 3D` | 10/10 test sections PASSED: health, metadata, 4D slicing, in-situ profiles (4 profiles verified) | 0 | `test_api.py` exit 0 |
| Argo Unit Tests | `node tests/test-argo.mjs` | `frontend/` | 5/5 test sections PASSED: 3D spherical placement, shared coordinate alignment, Earth occlusion, formatting, Three.js hierarchy | 0 | `test-argo.mjs` exit 0 |
| Currents Unit Tests | `node tests/test-currents.mjs` | `frontend/` | 5/5 test sections PASSED: tangent basis orthonormality, 3-4-5 speed, bilinear sampling, Euler advection | 0 | Re-verified exit 0 |
| Frontend ESLint | `npm run lint` | `frontend/` | 0 errors, 0 warnings (clean) | 0 | Clean lint execution |
| Production Build | `npm run build` | `frontend/` | 32 modules transformed; built in 635ms; dist output verified | 0 | Dist artifacts generated cleanly |
| Dedicated Argo Browser Tests | `npm run test:browser -- tests/argo.spec.js` | `frontend/` | 3/3 passed: layer toggle, metadata modal display, drag vs click discrimination; 7.7s | 0 | Test run exit 0 |
| Full Browser Suite (26 tests) | `npm run test:browser` | `frontend/` | 26/26 passed across 8 test specs (argo, currents, colormaps, depth, globe, scalar field, shell, time); 50.1s | 0 | Test run exit 0 |
| Browser Render FPS | `page.evaluate(rAF loop 1s)` | Headless Edge 153 | **165 FPS measured**; avgFrameTime 6.06ms; 166 frames in 1005.7ms | PASS | Browser performance telemetry in evidence |
| Baseline & Scope Check | `python scripts/check-baseline.py` | `D:\Studies\SIH\Samudra 3D` | 36 entry files unchanged; 15 roadmap rows; Phase 10 Argo profiles active; Phase 11 charts deferred | 0 | `check-baseline.py` exit 0 |
| SHA-256 Manifest Snapshot | `python scripts/snapshot-baseline.py phase-10` | `D:\Studies\SIH\Samudra 3D` | Manifest snapshotted and verified | 0 | `implementation-manifest.json` |

## Visual evidence and screenshots

All screenshots captured during automated browser testing and stored under `docs/evidence/phase-10/`:
1. `01-argo-markers-overview.png`: 3D Earth globe showing active Argo float beacons in the Bay of Bengal and Arabian Sea. Viewport HUD displays `ARGO FLOATS: 3 active (INCOIS-DAC)` and sidebar layer toggle shows `Active (3 floats)`.
2. `02-float-selected-modal.png`: Bay of Bengal float (`ARGO_2902145`) selected. Sensor inspector in `ProfileModal.jsx` displays WMO ID `2902145`, coordinates `12.48°N, 82.03°E`, `100% Pass` QC status, and Phase 11 T-S diagram preview.
3. `03-keyboard-selection.png`: Float selection performed via accessible keyboard dropdown (`select#argo-float-select`), selecting Arabian Sea float `ARGO_2902198` (`16.52°N, 71.85°E`) with live inspector metadata synchronization.
4. `04-argo-layer-toggled-off.png`: Argo float layer unchecked (`input#layer-argo`). All 3D marker meshes are removed from the scene and GPU resources disposed, restoring clean scalar field view and clearing HUD float badge.

## Regressions and robustness

- **Regression testing:** All tests from Phase 1 (Shell), Phase 2 (Globe), Phase 4 (API), Phase 5 (Scalar Field), Phase 6 (Colormaps), Phase 7 (Depth Slicer), Phase 8 (Time Playback), and Phase 9 (Current Streamlines) were re-run against the Phase 10 build. All 26 tests passed without failures.
- **Far-side Earth occlusion:** Markers facing away from the camera horizon or obstructed by the Earth globe sphere are hidden and cannot be raycast through the solid planet.
- **Drag vs click discrimination:** Pointer movement distance is tracked between `pointerdown` and `pointerup`. Shifts exceeding 4 pixels are treated as OrbitControls camera manipulation, preventing accidental float selection while dragging the globe.
- **Keyboard accessibility:** Full non-mouse selection pathway provided through standard HTML `<select>` dropdown in the sidebar, supporting keyboard tab and arrow-key navigation.
- **Clean WebGL resource disposal:** Toggling off the overlay removes all marker groups from the Three.js scene and explicitly disposes geometries and materials, eliminating WebGL memory leaks.

## Deviations and scientific decisions

- **D53:** Dedicated In-situ observation router and typed Pydantic models (`routes_insitu.py`, `backend/app/schemas/insitu.py`).
- **D54:** Explicit observation source provenance (`source_mode="SYNTHETIC"` vs `source_mode="REAL_LOCAL"`) and ERDDAP offline integration gap disclosure.
- **D55:** Spherical Earth line-of-sight occlusion for 3D observation markers ($R=100$).
- **D56:** Orbit drag versus click discrimination threshold (4 pixels).
- **D57:** UNESCO 1983 seawater hydrostatic pressure-to-depth conversion ($1\,\text{dbar} \approx 0.992\,\text{m}$).

## Data provenance

- Synthetic profiles served from `backend/sample_data/argo_profiles.json` (3 Argo floats + 1 Glider transect, marked `source_mode="SYNTHETIC"`).
- Real reference observation sample served from `backend/sample_data/real_argo_sample.json` (INCOIS APEX float WMO 2902210, marked `source_mode="REAL_LOCAL"`).
- Live external ERDDAP API connection recorded as an offline environment dependency gap; local ingestion pipelines are prepared and verified.

## Failures and NOT RUN checks

None. All 10 acceptance checks (AC01–AC10) and all 26 browser test cases passed with exit code 0.

## Risks and prerequisites for Phase 11

- **Phase 11 scope:** Interactive Depth-Profile Curves & T-S Correlation Diagrams (Chart.js / SVG vertical profile viewer, temperature-salinity scatter plot, isopycnal density curves).
- **Prerequisites met:**
  1. Backend endpoints `/api/insitu/argo` and `/api/insitu/argo/{id}` already return full vertical depth, temperature, salinity, and QC arrays.
  2. `ProfileModal.jsx` already integrates the selection lifecycle and placeholder for the Phase 11 charting engine.
  3. `check-baseline.py` asserts Phase 11 profile charts are deferred until Phase 11 authorization.
