# Phase 07 report

## Identity and status

- Phase 7 of 15: **Interactive Depth Slicer (0m to 4,000m)**, handbook classification MUST HAVE.
- Report version 1, 2026-09-12, 09:32 IST (Asia/Calcutta, UTC+05:30).
- Implementation result: **PASS**. Independent review result: **PENDING**.
- Workspace: `D:\Studies\SIH\Samudra 3D`. Non-Git baseline: `docs/evidence/phase-07/implementation-manifest.json` (74 files, all hashes verified).
- Previous-phase gate: Phase 6 implementation PASS, explicit user authorization received to proceed to Phase 7.
- Authority: complete 14-page handbook; roadmap physical p. 10; supporting detail pp. 3, 6-7, 9-11; `phase-prompts/PHASE-07.md`. Supporting sources: Problem statement DOCX, SIH2026-IDEA-Presentation.pptx (all slides and notes).
- Source file hashes verified: 36 entry-inventory files unchanged (`check-baseline.py` PASS). Phase-prompts and reference docs preserved.

## Work and baseline

On entry, Phase 6 dynamic colormaps (`cmocean thermal` and `cmocean haline`) and variable selector were active on the Three.js globe. However, vertical depth navigation was disabled in `SidebarControls.jsx`, and scalar field geometry was fixed at the ocean surface ($r = R = 100$).

Phase 7 implements the complete interactive 3D depth slicing engine across 0m to 4,000m:
1. **Interactive Depth Slider & Discrete Tick Markers (`SidebarControls.jsx`):**
   - Enabled `input#depth` with continuous range `min="0"` to `max="4000"`, `step="5"`.
   - Integrated native HTML5 `<datalist id="depth-ticks">` displaying ticks for all discrete model vertical levels (`0, 10, 50, 100, 200, 500, 1000, 2000, 4000m`).
   - Built transparent snapping disclosure: displays requested depth and model snapped layer whenever a non-grid depth is selected (e.g. `75m (snapped to 50m model layer)`).
   - Preserved disabled state on future Phase 8–15 controls (time playback, sensor overlays, AI assistant).

2. **Asynchronous Communication Pipeline & Debouncing (`App.jsx`, `OceanCanvas.jsx`):**
   - Lifted `requestedDepth` and `resolvedDepth` state into `App.jsx`, updating the header badge to `PHASE 07 / DEPTH SLICER`.
   - Wired depth updates to `/api/ocean-data?depth=...`.
   - Implemented 100ms debouncing, monotonic sequence counter (`fetchIdRef`), and `AbortController` cancellation to eliminate race conditions and discard out-of-order network responses during rapid slider dragging.
   - Preserves active variable (`temperature` vs `salinity`) and time step across depth transitions.

3. **Radial Subsurface Geometry & Visual Layer Hierarchy (`OceanCanvas.jsx`, `scalarField.js`):**
   - Evaluated radial depth coordinate scaling: $r = R - depth \times (globeRadius / R_{earth}) \times exaggeration$.
   - Verified inward radial distance hierarchy in unit tests: $r(4000m) < r(2000m) < r(500m) < r(100m) < r(0m)$ ($r = 100.0$ at 0m, $r = 98.1165$ at 4000m).
   - Solved subsurface visual blending: configured `earthMesh.renderOrder = 2` with `globeMaterial.depthWrite = false`, and set `scalarMesh.renderOrder = 1` for subsurface layers ($depth > 0$) versus `scalarMesh.renderOrder = 3` for surface layers ($depth = 0$). Subsurface layers are visible beneath the semi-transparent bathymetric ocean surface without occlusion or z-fighting.
   - Viewport HUD updated to disclose real-time variable, requested depth, resolved model layer, and scalar bounds.

4. **Direct Oceanographic Thermal Stratification Verification:**
   - Surface layer (0m): Warm tropical Indian Ocean (~28.5–29.1°C).
   - Thermocline layer (100m): Sharp thermal gradient (~21.4–22.0°C).
   - Abyssal layer (4000m): Cold deep ocean floor (~2.0–2.6°C).

Runtime: Windows 10.0.26200 x64; Node 24.19.0; Vite 8.3.0; React 18.3.1; Three.js 0.168.0; FastAPI 0.141.1; Uvicorn 0.52.4; Edge 153 (Chromium headless).

## Changed files

| File | Change | Purpose | Requirement | Prior work preserved |
| --- | --- | --- | --- | --- |
| `frontend/src/App.jsx` | Modified | Lifted `requestedDepth` and `resolvedDepth` states; updated phase label to PHASE 07 / DEPTH SLICER | H17/H07 | Yes |
| `frontend/src/components/SidebarControls.jsx` | Modified | Enabled `input#depth` (0–4000m), added `<datalist>`, depth readout with honest snapping disclosure | H07/H17 | Yes |
| `frontend/src/components/OceanCanvas.jsx` | Modified | Integrated depth fetching, 100ms debouncing, AbortController cancellation, renderOrder / depthWrite policy, HUD depth badge | H07/H29 | Yes |
| `frontend/tests/test-depth.mjs` | Added | Unit tests for radial hierarchy, depth snapping logic, debouncing, and exaggeration factor | H07 | Yes |
| `frontend/tests/depth.spec.js` | Added | Playwright tests: slider interaction, HUD depth badges, variable preservation, rapid dragging, non-grid snapping | U05 | Yes |
| `frontend/tests/shell.spec.js` | Modified | Updated disabled controls count (8) and natural tab order through active variable select and depth range slider | U05 | Yes |
| `frontend/tests/colormaps.spec.js` | Modified | Updated phase label regex to `/PHASE/` for forward compatibility | U05 | Yes |
| `scripts/check-baseline.py` | Modified | Assert Phase 7 depth slicer active and Phase 8 time animation deferred | U01/U02 | Yes |
| `docs/acceptance-phase-07.md` | Added | Pre-implementation checklist AC01–AC10 marked PASS | U06 | Yes |
| `docs/decisions.md` | Modified | Added decisions D38–D42 (snapping disclosure, renderOrder policy, debouncing, radial scaling, datalist ticks) | U02 | Yes |
| `docs/phase-status.md` | Modified | Phase 7 updated to PASS/PENDING | U06 | Yes |
| `docs/phase-reports/phase-07-report.md` | Added | This formal report | U06 | Yes |

Non-Git baseline: `docs/evidence/phase-07/implementation-manifest.json` (74 files, all hashes verified).

## Requirement and acceptance traceability

| Requirement ID | Source and physical page | Acceptance criterion | Implementation file | Verification ID | Result |
| --- | --- | --- | --- | --- | --- |
| H07 | Handbook p. 10 roadmap row 7 | Interactive Depth Slicer (0m to 4,000m) | SidebarControls.jsx, OceanCanvas.jsx | AC02/AC04/AC05 | PASS |
| H16 | Handbook pp. 1,3,5 | React 18, Three.js, Vite frontend stack | package.json, OceanCanvas.jsx | AC01/AC04 | PASS |
| H17 | Handbook p. 9 | Sidebar depth slider & Viewport HUD layer depth readout | SidebarControls.jsx, OceanCanvas.jsx | AC02/AC07 | PASS |
| H22 | Handbook pp. 3,6-7 | Discrete model depth levels (0, 10, 50, 100, 200, 500, 1000, 2000, 4000m) | ocean_service.py, SidebarControls.jsx | AC05/AC07 | PASS |
| H25 | Handbook p. 6 | Measured browser FPS (>60 FPS target); smooth 3D depth transitions | Playwright performance run | AC09 | PASS (166 FPS measured) |
| H29 | Handbook p. 12 | Debouncing, AbortController cancellation, race condition prevention | OceanCanvas.jsx | AC06 | PASS |
| U03 | User requirement | Clean build & lint; zero errors, zero warnings | `npm run build`, `npm run lint` | AC10 | PASS |
| U05 | User requirement | Playwright browser suite (16 tests) passing across 5 test specs | `tests/*.spec.js` | AC09/AC10 | PASS (16/16) |

## Executed checks

| Check | Exact command | Working directory | Actual result | Exit code | Evidence |
| --- | --- | --- | --- | --- | --- |
| Depth Slicer Unit Tests | `node tests/test-depth.mjs` | `frontend/` | 5/5 test sections PASSED: radial hierarchy, mesh radius reduction, discrete snapping, exaggeration, debouncing logic | 0 | `20260912-092614-604-test-depth-phase07.txt` |
| Colormap Unit Tests | `node tests/test-colormaps.mjs` | `frontend/` | 5/5 test sections PASSED: thermal stops, haline stops, out-of-range clamping, NaN/Infinity safety, CSS gradients | 0 | Recorded in phase 06 & re-verified |
| Frontend ESLint | `npm run lint` | `frontend/` | 0 errors, 0 warnings (clean) | 0 | Clean lint execution |
| Production Build | `npm run build` | `frontend/` | 30 modules transformed; built in 534ms; dist output verified | 0 | Dist artifacts generated cleanly |
| Full Browser Suite (16 tests) | `npm run test:browser` | `frontend/` | 16/16 passed: 4 depth tests, 2 colormaps tests, 3 globe tests, 2 scalar field tests, 5 shell regression tests; 21.5s | 0 | `20260912-092901-577-playwright-browser-suite-phase07.txt` |
| Browser Render FPS | `page.evaluate(rAF loop 1s)` | Headless Edge 153 | **166 FPS measured**; avgFrameTime 6.02ms; 166 frames in 1000.8ms | PASS | Playwright console log in evidence |
| Baseline & Scope Check | `python scripts/check-baseline.py` | `D:\Studies\SIH\Samudra 3D` | 36 entry files unchanged; 15 roadmap rows; Phase 7 depth slicer active; Phase 8 time animation deferred | 0 | `check-baseline.py` exit 0 |
| SHA-256 Manifest Snapshot | `python scripts/snapshot-baseline.py phase-07` | `D:\Studies\SIH\Samudra 3D` | 74 files snapshotted and verified | 0 | `implementation-manifest.json` |

## Visual evidence and screenshots

All screenshots captured during automated browser testing and stored under `docs/evidence/phase-07/`:
1. `01-surface-0m.png`: 3D Earth globe showing Indian Ocean Potential Temperature at Surface (0m) with thermal palette (~28.5–29.1°C). Sidebar depth slider at 0m. HUD displays `DEPTH: 0m`.
2. `02-thermocline-100m.png`: 3D Earth globe showing Thermocline layer at 100m depth (~21.4–22.0°C), revealing sharp vertical temperature decrease and subsurface inward mesh positioning beneath the semi-transparent ocean shell. HUD displays `DEPTH: 100m`.
3. `03-abyssal-4000m.png`: 3D Earth globe showing Abyssal floor at 4000m depth (~2.0–2.6°C) dominated by deep cold blue hues. HUD displays `DEPTH: 4000m`.
4. `04-non-grid-snapping-75m.png`: Non-grid depth selection (75m) demonstrating honest model snapping disclosure in both sidebar (`75m (snapped to 50m model layer)`) and HUD badge (`DEPTH: 75m requested (snapped to 50m model layer)`).

## Regressions and robustness

- **Regression testing:** All tests from Phase 1 (Shell), Phase 2 (Globe), Phase 5 (Scalar Field), and Phase 6 (Colormaps) were re-run against the Phase 7 build. All 16 tests passed without failures.
- **Subsurface visibility & z-fighting elimination:** By configuring `globeMaterial.depthWrite = false` and setting `earthMesh.renderOrder = 2` with `scalarMesh.renderOrder = 1` for subsurface fields ($depth > 0$), subsurface scalar layers render cleanly without polygon clipping or z-fighting against the bathymetric Earth shell.
- **Race conditions & debouncing:** Rapid continuous slider scrubbing across the full depth domain (0m to 4000m) was verified with 100ms debouncing and `AbortController` cancellation; out-of-order network responses are cleanly aborted and never corrupt the final visual state.
- **Variable switching across depth:** Toggling between temperature and salinity while depth slicing preserves the active vertical level seamlessly.

## Deviations and scientific decisions

- **D38:** Nearest-layer depth snapping disclosure: non-grid depths (e.g. 75m) map to nearest model layer (50m), displaying both requested and snapped levels across UI controls and HUD badges.
- **D39:** Three.js subsurface visibility via renderOrder (`earthMesh.renderOrder = 2`, `scalarMesh.renderOrder = 1` for subsurface) and `globeMaterial.depthWrite = false`.
- **D40:** 100ms debouncing and `AbortController` cancellation for rapid depth slider dragging.
- **D41:** Visual vertical exaggeration separation ($r = R - depth \times scale \times 30$), applied strictly to 3D Cartesian coordinates while preserving exact SI metres ($m$) in data, state, and UI.
- **D42:** HTML5 `<datalist>` discrete level tick indicators (`0, 10, 50, 100, 200, 500, 1000, 2000, 4000m`).

## Data provenance

- Numerical vertical slice data served via FastAPI `/api/ocean-data?depth=...` from `backend/sample_data/model_indian_ocean.nc` (3.32 MB NetCDF-4 generated from synthetic Indian Ocean ROMS parameterization).
- Vertical coordinate levels: 9 discrete depths `[0.0, 10.0, 50.0, 100.0, 200.0, 500.0, 1000.0, 2000.0, 4000.0]`.

## Failures and NOT RUN checks

None. All 10 acceptance checks (AC01–AC10) and all 16 browser test cases passed with exit code 0.

## Risks and prerequisites for Phase 8

- **Phase 8 scope:** Time Animation Playback Controls (Play/Pause, Step Forward/Backward, Speed Slider, 48-hour loop).
- **Prerequisites met:**
  1. Backend `/api/ocean-data` already accepts and handles `time_index` query parameter across all 8 forecast time steps (`0` to `7`, 0h to 42h forecast).
  2. Frontend state architecture in `App.jsx` cleanly supports lifting time step state and passing it down to `SidebarControls.jsx` and `OceanCanvas.jsx`.
  3. Phase 8 will implement `timeAnimation.js` / time playback state machine, enable time controls in `SidebarControls.jsx`, and wire animation loop to `OceanCanvas.jsx`.
