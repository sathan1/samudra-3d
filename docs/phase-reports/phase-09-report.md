# Phase 09 report

## Identity and status

- Phase 9 of 15: **3D Current Vector Particle Streamlines (Euler Advection, Speed Color Mapping, Spherical Tangent Basis)**, handbook classification GOOD TO HAVE.
- Report version 1, 2026-09-12, 10:10 IST (Asia/Calcutta, UTC+05:30).
- Implementation result: **PASS**. Independent review result: **PENDING**.
- Workspace: `D:\Studies\SIH\Samudra 3D`. Non-Git baseline: `docs/evidence/phase-09/implementation-manifest.json` (verified file hashes).
- Previous-phase gate: Phase 8 implementation PASS, explicit user authorization received to proceed to Phase 9.
- Authority: complete 14-page handbook; roadmap physical p. 10 row 9; supporting detail pp. 3, 6-7, 9-11; `phase-prompts/PHASE-09.md`. Supporting sources: Problem statement DOCX, SIH2026-IDEA-Presentation.pptx (all slides and notes).
- Source file hashes verified: 36 entry-inventory files unchanged (`check-baseline.py` PASS). Phase-prompts and reference docs preserved.

## Work and baseline

On entry, Phase 8 4D time playback controls and Phase 7 depth slicer (0m to 4,000m) were active on the Three.js globe. In `SidebarControls.jsx`, the "Current streamlines" overlay checkbox was disabled, and no particle advection geometry was present in the WebGL scene.

Phase 9 implements the complete 3D current vector particle streamline engine:
1. **Currents Ingestion & Derived Speed (`frontend/src/services/api.js`, `frontend/src/utils/particleStreamlines.js`):**
   - Ingests horizontal current components $u$ (eastward) and $v$ (northward) in m/s from `/api/ocean-data?variable=currents`.
   - Derives scalar speed $s = \sqrt{u^2 + v^2}$ in m/s.
   - Bilinear grid vector interpolation over non-uniform lat/lon coordinates with land-mask verification.

2. **3D Spherical Local Tangent Basis Formulation:**
   - Differentiates the spherical coordinate parametrization $(R\cos\phi\sin\lambda, R\sin\phi, R\cos\phi\cos\lambda)$ to establish strictly orthonormal tangent unit vectors:
     $$\mathbf{e}_{\text{east}}(\lambda) = (\cos\lambda, 0, -\sin\lambda)$$
     $$\mathbf{e}_{\text{north}}(\phi, \lambda) = (-\sin\phi \sin\lambda, \cos\phi, -\sin\phi \cos\lambda)$$
   - Maps horizontal velocities to 3D Cartesian space: $\mathbf{V}_{\text{3D}} = u \cdot \mathbf{e}_{\text{east}} + v \cdot \mathbf{e}_{\text{north}}$, guaranteeing strictly tangential flow without vertical penetration into the planetary interior.

3. **High-Performance GPU InstancedMesh Particle System (`frontend/src/utils/particleStreamlines.js`):**
   - Uses a single `THREE.InstancedMesh` with a strictly bounded budget of 1,500 particles sharing a single sphere geometry and mesh material, requiring only 1 draw call.
   - Per-instance matrix transformation and per-instance dynamic RGB color attributes.
   - Speed-dependent dynamic color ramp:
     - $s < 0.2\,\text{m/s}$: Cyan `rgb(0, 210, 255)`
     - $0.2 \le s < 0.5\,\text{m/s}$: Emerald Green `rgb(34, 197, 94)`
     - $0.5 \le s < 0.8\,\text{m/s}$: Amber Yellow `rgb(234, 179, 8)`
     - $s \ge 0.8\,\text{m/s}$: Crimson Red `rgb(239, 68, 68)`

4. **Frame-Rate Independent Euler Advection & Land-Mask Rejection:**
   - Advection step: $\mathbf{x}_{t+\Delta t} = \mathbf{x}_t + \mathbf{V}_{\text{3D}} \cdot \text{scale} \cdot \Delta t$, with visual multiplier $\text{scale} = 65,000$ calibrated for realistic Indian Ocean gyre visualization.
   - Particle lifecycle: randomized initial lifespan (80 to 220 frames). Particles expire and respawn randomly across oceanic waters.
   - Land-mask bilinear rejection: if any of the 4 surrounding grid nodes are `null` (continental land mass such as the Indian subcontinent or Ceylon), velocity sampling returns `null`, triggering immediate particle respawn. Particles never penetrate landmasses.
   - Radial depth positioning: particle radius synchronizes with active scalar field layer radius ($R = 1.002 + \text{depthIndex} \times 0.0002$), avoiding z-fighting.

5. **UI & Viewport Controls Integration (`SidebarControls.jsx`, `OceanCanvas.jsx`, `App.jsx`):**
   - Enabled `Current streamlines` checkbox (`input#layer-currents`) in `SidebarControls.jsx` under `Overlay layers`, displaying `Active (1,500 particles)` when toggled on.
   - Floating HUD badge in `OceanCanvas.jsx`: `STREAMLINES: 1,500 particles active` appears when streamlines are enabled.
   - Maintained disabled state on remaining 5 future controls (3 overlay layer checkboxes and 2 future buttons).
   - Clean disposal: turning off the overlay immediately disposes geometry, materials, and removes the instanced mesh from the Three.js scene, reclaiming all GPU buffers.
   - Measured WebGL render performance: **165 FPS** (avgFrameTime 6.06ms) in headless Chromium/Edge.

Runtime: Windows 10.0.26200 x64; Node 24.19.0; Vite 8.3.0; React 18.3.1; Three.js 0.168.0; FastAPI 0.141.1; Uvicorn 0.52.4; Edge 153 (Chromium headless).

## Changed files

| File | Change | Purpose | Requirement | Prior work preserved |
| --- | --- | --- | --- | --- |
| `frontend/src/utils/particleStreamlines.js` | Added | 3D tangent basis, InstancedMesh particle engine, bilinear grid sampling, Euler advection, speed colormap, clean disposal | H09/H25 | Yes |
| `frontend/src/components/SidebarControls.jsx` | Modified | Enabled `input#layer-currents` checkbox, added active particle badge, updated disabled counts | H09/H17 | Yes |
| `frontend/src/components/OceanCanvas.jsx` | Modified | Integrated `ParticleSystem`, advection animation loop, depth-synchronized radius, floating HUD streamlines badge | H09/H29 | Yes |
| `frontend/src/App.jsx` | Modified | Lifted `showCurrents` state, updated Phase label to `PHASE 09 / CURRENT STREAMLINES`, updated status notice | H09/H17 | Yes |
| `frontend/tests/test-currents.mjs` | Added | Standalone unit tests: tangent basis orthonormality, 3-4-5 speed calculation, bilinear sampling, land-mask rejection, Euler integration | H09 | Yes |
| `frontend/tests/currents.spec.js` | Added | Playwright tests: toggle overlay, HUD badge visibility, 100m depth synchronization, multi-variable overlay, render FPS benchmark | U05 | Yes |
| `frontend/tests/shell.spec.js` | Modified | Updated aside controls assertion (14 total: 9 enabled, 5 disabled) and keyboard tab navigation | U05 | Yes |
| `scripts/check-baseline.py` | Modified | Assert Phase 9 particle streamlines active and Phase 10 Argo profiles deferred | U01/U02 | Yes |
| `docs/acceptance-phase-09.md` | Added | Pre-implementation checklist AC01–AC10 marked PASS | U06 | Yes |
| `docs/decisions.md` | Modified | Added decisions D48–D52 (bounded InstancedMesh budget, tangent basis mapping, land-mask rejection, visual speed scaling, steady-field disclaimer) | U02 | Yes |
| `docs/phase-status.md` | Modified | Phase 9 updated to PASS/PENDING | U06 | Yes |
| `docs/phase-reports/phase-09-report.md` | Added | This formal report | U06 | Yes |

Non-Git baseline: `docs/evidence/phase-09/implementation-manifest.json` (verified file hashes).

## Requirement and acceptance traceability

| Requirement ID | Source and physical page | Acceptance criterion | Implementation file | Verification ID | Result |
| --- | --- | --- | --- | --- | --- |
| H09 | Handbook p. 10 roadmap row 9 | 3D Current Vector Particle Streamlines (Euler Advection, Speed Color Mapping, Spherical Tangent Basis) | SidebarControls.jsx, OceanCanvas.jsx, particleStreamlines.js | AC01–AC08 | PASS |
| H16 | Handbook pp. 1,3,5 | React 18, Three.js, Vite frontend stack | package.json, App.jsx, OceanCanvas.jsx | AC01/AC04 | PASS |
| H17 | Handbook p. 9 | Sidebar overlay checkbox and Viewport HUD streamlines readout | SidebarControls.jsx, OceanCanvas.jsx | AC02/AC06 | PASS |
| H22 | Handbook pp. 3,6-7 | Numerical $u, v$ current velocity data served from NetCDF model dataset | ocean.py, ocean_service.py | AC01 | PASS |
| H25 | Handbook p. 6 | Measured browser FPS (>60 FPS target); smooth 3D particle advection | Playwright performance run | AC08 | PASS (165 FPS measured) |
| H29 | Handbook p. 12 | Bounded particle budget (1,500), single draw call InstancedMesh, clean WebGL resource disposal | particleStreamlines.js, OceanCanvas.jsx | AC04/AC07 | PASS |
| U03 | User requirement | Clean build & lint; zero errors, zero warnings | `npm run build`, `npm run lint` | AC10 | PASS |
| U05 | User requirement | Playwright browser suite (23 tests) passing across 7 test specs | `tests/*.spec.js` | AC09/AC10 | PASS (23/23) |

## Executed checks

| Check | Exact command | Working directory | Actual result | Exit code | Evidence |
| --- | --- | --- | --- | --- | --- |
| Currents Unit Tests | `node tests/test-currents.mjs` | `frontend/` | 5/5 test sections PASSED: tangent basis orthonormality ($<10^{-6}$), 3-4-5 speed calculation (5.0 m/s), bilinear interpolation, land-mask rejection (null on land), Euler integration | 0 | Unit test run exit 0 |
| Time Animation Unit Tests | `node tests/test-time-animation.mjs` | `frontend/` | 7/7 test sections PASSED: timestamps, 6h spacing, speed intervals, lead hours, time labels, next/prev step wrapping, final step detection | 0 | Re-verified exit 0 |
| Depth Slicer Unit Tests | `node tests/test-depth.mjs` | `frontend/` | 5/5 sections PASSED: radial hierarchy, mesh reduction, snapping, debouncing | 0 | Re-verified exit 0 |
| Colormap Unit Tests | `node tests/test-colormaps.mjs` | `frontend/` | 5/5 sections PASSED: thermal stops, haline stops, out-of-range clamping, CSS gradients | 0 | Re-verified exit 0 |
| Frontend ESLint | `npm run lint` | `frontend/` | 0 errors, 0 warnings (clean) | 0 | Clean lint execution |
| Production Build | `npm run build` | `frontend/` | 31 modules transformed; built in 558ms; dist output verified | 0 | Dist artifacts generated cleanly |
| Full Browser Suite (23 tests) | `npm run test:browser` | `frontend/` | 23/23 passed: 3 currents tests, 4 time tests, 4 depth tests, 2 colormaps tests, 3 globe tests, 2 scalar field tests, 5 shell regression tests; 41.8s | 0 | Test run exit 0 |
| Browser Render FPS | `page.evaluate(rAF loop 1s)` | Headless Edge 153 | **165 FPS measured**; avgFrameTime 6.06ms; 165 frames in 1000.5ms | PASS | Browser performance telemetry in evidence |
| Baseline & Scope Check | `python scripts/check-baseline.py` | `D:\Studies\SIH\Samudra 3D` | 36 entry files unchanged; 15 roadmap rows; Phase 9 particle streamlines active; Phase 10 Argo profiles deferred | 0 | `check-baseline.py` exit 0 |
| SHA-256 Manifest Snapshot | `python scripts/snapshot-baseline.py phase-09` | `D:\Studies\SIH\Samudra 3D` | Manifest snapshotted and verified | 0 | `implementation-manifest.json` |

## Visual evidence and screenshots

All screenshots captured during automated browser testing and stored under `docs/evidence/phase-09/`:
1. `01-surface-currents-overlay.png`: 3D Earth globe showing Potential Temperature at Surface (0m) overlaid with 1,500 active current streamline particles. Particle velocities follow the clockwise Arabian Sea gyre and eastward South Equatorial Current. Viewport HUD displays `STREAMLINES: 1,500 particles active`.
2. `02-subsurface-100m-currents.png`: Subsurface depth slice at 100m showing current streamlines dynamically repositioned to radial radius $R = 1.0022$, flowing through the subsurface thermocline with velocity speeds mapped to cyan/green colors ($<0.5$ m/s).
3. `03-currents-with-salinity.png`: Multi-layer composition demonstrating simultaneous activation of Practical Salinity (`cmocean haline` colormap) and 3D current vector streamlines at 100m depth, maintaining visual clarity and color contrast.
4. `04-currents-toggled-off.png`: Streamlines overlay unchecked (`input#layer-currents`). Particle InstancedMesh is completely removed from the scene and GPU resources disposed, restoring clean scalar field view and removing the HUD streamlines badge.

## Regressions and robustness

- **Regression testing:** All tests from Phase 1 (Shell), Phase 2 (Globe), Phase 5 (Scalar Field), Phase 6 (Colormaps), Phase 7 (Depth Slicer), and Phase 8 (Time Playback) were re-run against the Phase 9 build. All 23 tests passed without failures.
- **Strictly bounded memory budget:** Fixed budget of 1,500 particles executed as a single `THREE.InstancedMesh`. GPU memory footprint is fixed at $\approx 100\,\text{KB}$ for instance transformation matrices and color attributes. No unbounded geometry creation or memory leaks.
- **Land-mask boundary rejection:** Particle advection checks bilinear interpolation quad. If any vertex is on land (e.g. Indian subcontinent, Sri Lanka), velocity returns `null` and the particle respawns instantly at an oceanic coordinate, ensuring streamlines never traverse landmasses.
- **Frame-rate independent Euler advection:** Particle movement uses elapsed time $\Delta t$ clamped between 1ms and 100ms. Particle trajectories and visual speeds remain consistent regardless of whether the browser runs at 30 FPS, 60 FPS, or 165 FPS.
- **Depth and variable synchronization:** Particle radial placement tracks depth slicing without z-fighting. Toggling scalar variables (temperature / salinity) or advancing forecast time preserves particle streamlines.

## Deviations and scientific decisions

- **D48:** GPU InstancedMesh bounded particle budget (1,500 particles) for optimal WebGL performance (>160 FPS).
- **D49:** Spherical tangent basis mapping (orthonormal differentiation ensuring flow strictly tangent to the sphere surface).
- **D50:** Land mask bilinear rejection and boundary respawning policy.
- **D51:** Visual advection speed scaling (scale factor $65,000$) and frame-rate independent Euler integration.
- **D52:** Steady-field Eulerian streamline animation disclaimer for active time frames.

## Data provenance

- Numerical current vector fields served via FastAPI `/api/ocean-data?variable=currents&depth=...&time_idx=...` from `backend/sample_data/model_indian_ocean.nc` (3.32 MB NetCDF-4 generated from synthetic Indian Ocean ROMS parameterization).
- Horizontal velocity components: $u$ (eastward velocity, m/s) and $v$ (northward velocity, m/s) over spatial grid $30^\circ\text{E}$ to $120^\circ\text{E}$, $30^\circ\text{S}$ to $30^\circ\text{N}$.

## Failures and NOT RUN checks

None. All 10 acceptance checks (AC01–AC10) and all 23 browser test cases passed with exit code 0.

## Risks and prerequisites for Phase 10

- **Phase 10 scope:** In-situ Argo Float Profiling (Virtual Floats, Profile Viewer, T-S Diagram).
- **Prerequisites met:**
  1. Backend NetCDF dataset contains full depth profiles (0m to 4,000m) for temperature and salinity.
  2. Frontend shell contains `<ProfileModal>` and `<ComparisonPanel>` component boundaries ready for activation.
  3. Phase 10 will place interactive 3D markers for Argo floats in the Indian Ocean, open depth-profile charts on click, and plot Temperature-Salinity (T-S) correlation diagrams.
