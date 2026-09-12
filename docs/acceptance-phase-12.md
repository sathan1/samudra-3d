# Phase 12 acceptance checklist: Underwater Glider Sawtooth Transects

Authority: `SAMUDRA-3D_SIH26067_Master_Handbook.pdf` (roadmap row 12, physical p. 10; supporting detail pp. 4, 6, 9-11, 13) and `phase-prompts/PHASE-12.md`.

## Implementation Verification Criteria

- [x] **AC01: In-Situ Glider Endpoints & Ingestion**
  - Backend endpoints `GET /api/insitu/gliders` and `GET /api/insitu/gliders/{id}` provide normalized mission metadata, dive/climb waypoints, coordinates, depths, temperature, salinity, and QC flags.
  - Supports both synthetic reproducible transects (`source_mode="SYNTHETIC"`) and documented local real glider deployment (`source_mode="REAL_LOCAL"`).
  - Out-of-domain coordinates and invalid payloads rejected cleanly. Unknown IDs return HTTP 404.
  - *Verification:* `backend/tests/test_gliders.py` and `backend/tests/test_insitu.py` pass 100%.

- [x] **AC02: 3D Sawtooth Trajectory & Vertical Depth Exaggeration**
  - Generates 3D physical yo-yo / sawtooth path connecting chronological waypoints through the water column from sea surface (0m) to dive depth (e.g. 1,000m) and back.
  - Applies 3D spherical coordinate mapping with visual depth exaggeration factor ($E = 30$, $r = R - \text{depth} \times \text{scale}$) per Handbook H23.
  - Surface points anchor at Earth sphere radius $R=100.0$; deep dive points (1,000m) retract inwards to $R=99.529$.
  - *Verification:* `frontend/tests/test-glider-transects.mjs` test 1 & 2 pass 100%.

- [x] **AC03: Discontinuity & Invalid Gap Handling**
  - Waypoints with missing depths (`depth === null`), corrupted coordinates, or bad QC flags (flags 3, 4) break line continuity into disconnected 3D sub-paths.
  - No 3D line bridges an invalid gap or time discontinuity (>12h).
  - *Verification:* `frontend/tests/test-glider-transects.mjs` test 3 & 4 pass 100%; `glider.spec.js` test 3 verifies `GLIDER_TEST_GAP_FIXTURE`.

- [x] **AC04: Surfacing Beacons & Dive Bottom Inflection Markers**
  - Surfacing events ($z=0$) rendered with prominent GPS transmission beacon spheres on the sea surface.
  - Dive inflection points (maximum depth turnaround) marked with depth anchor nodes.
  - Glider head marker indicates the latest position in the transect with an orientation beacon.
  - *Verification:* `frontend/src/utils/gliderTransects.js` creates surfacing beacons, bottom anchors, and head beacon; captured in `docs/evidence/phase-12/02-sawtooth-dives-3d-detail.png`.

- [x] **AC05: Earth Line-of-Sight Occlusion**
  - Far-side glider track segments, surfacing beacons, and dive points are geometrically occluded by the solid Earth sphere, preventing click raycasting and visual artifact bleed-through.
  - *Verification:* `gliderTransects.js` implements raycast distance clipping and Earth occlusion checks.

- [x] **AC06: Interactive Selection & Raycasting**
  - Clicking on a glider surfacing beacon, waypoint, or track selects the glider mission with drag-vs-click discrimination (<= 4px).
  - Selection highlights the glider track in cyan (`#00f0ff`) and bottom anchors in gold (`#fbbf24`).
  - *Verification:* `glider.spec.js` test 2 verifies interactive mission selection and styling.

- [x] **AC07: ProfileModal Integration & Vertical Curves**
  - Selecting a glider mission opens `ProfileModal` displaying glider identity, mission metadata, cycle/dive count, and platform tag `GLIDER TRANSECT`.
  - Displays vertical depth profiles (Temperature and Salinity) and T-S correlation diagrams with UNESCO EOS-80 isopycnals for the selected glider dive.
  - *Verification:* `glider.spec.js` test 2 verifies `ProfileModal` tabs, depth axes, and T-S diagram; captured in `docs/evidence/phase-12/03-glider-profile-inspector.png`.

- [x] **AC08: Layer Controls & Viewport HUD Badge**
  - `SidebarControls.jsx` enables the 'Underwater gliders' overlay toggle (`input#layer-glider`) with active count and accessible keyboard selector (`select#glider-transect-select`).
  - Viewport floating HUD displays active glider badge: `GLIDERS: 2 active (INCOIS-Seaglider)`.
  - *Verification:* `glider.spec.js` test 1 verifies toggle state, HUD badge, and keyboard selector; captured in `docs/evidence/phase-12/01-glider-transect-overview.png`.

- [x] **AC09: Multi-Sensor Concurrency & Clean Disposal**
  - Glider 3D transects coexist seamlessly with 3D Argo markers and current vector particle streamlines without state collisions or race conditions.
  - Toggling off the glider layer cleanly disposes all Three.js geometries, line buffers, and materials. WebGL render performance remains >= 60 FPS (measured 165 FPS).
  - *Verification:* `glider.spec.js` test 4 measures 165 FPS under simultaneous 3-layer load; captured in `docs/evidence/phase-12/04-multi-sensor-argo-glider-currents.png`.

- [x] **AC10: Automated Test Suite & Non-Regression Gate**
  - Unit tests in `frontend/tests/test-glider-transects.mjs` pass 100% (6/6 suites).
  - Backend acceptance tests in `backend/tests/test_gliders.py` pass 100%.
  - Playwright browser tests in `frontend/tests/glider.spec.js` pass with exit code 0 (4/4 tests).
  - All existing browser tests (34 tests across 10 specs) continue to pass without regression.
  - ESLint (0 errors, 0 warnings) and production build pass cleanly.
  - Baseline script `scripts/check-baseline.py` passes with 'result': 'PASS'.
