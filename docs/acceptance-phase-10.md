# Phase 10 acceptance checklist: Clickable 3D Argo Float Markers

Authority: `SAMUDRA-3D_SIH26067_Master_Handbook.pdf` (roadmap row 10, physical p. 10; supporting detail pp. 4, 6, 9-11, 13) and `phase-prompts/PHASE-10.md`.

## Implementation verification criteria

- [x] **AC01: Dedicated In-Situ Observation Router (`routes_insitu.py`)**
  - Typed Pydantic schemas in `backend/app/schemas/insitu.py`.
  - Endpoints fully operational: `GET /api/insitu/profiles`, `GET /api/insitu/argo`, `GET /api/insitu/argo/{id}`, `GET /api/insitu/status`.
  - Strict data provenance: WMO ID, platform type, coordinates, ISO timestamps, cycle number, data center (`INCOIS-DAC`), explicit `source_mode="SYNTHETIC"`.
  - Result: **PASS** (`test_insitu.py`).

- [x] **AC02: Domain Bounding & QC Filtering Validation**
  - Spatial domain verification: Lat $[-30^\circ, 30^\circ]$, Lon $[30^\circ, 120^\circ]$. Rejects or flags out-of-domain coordinates.
  - WMO Argo standard QC flags: 1 (good), 2 (probably good), 3 (probably bad), 4 (bad). Query parameter `qc_filter=true` filters bad levels/profiles (e.g. excluded `ARGO_TEST_QC_OUTLIER`).
  - Result: **PASS** (`test_insitu.py`).

- [x] **AC03: Pressure-to-Depth Conversion & Real Local Sample Support**
  - Documented pressure-to-depth UNESCO conversion formula ($1\,\text{dbar} \approx 0.992\,\text{m}$).
  - Ingestion of local real Argo reference sample (`backend/sample_data/real_argo_sample.json`) with `source_mode="REAL_LOCAL"`.
  - Live ERDDAP feed integration gap documented honestly as offline requirement.
  - Result: **PASS** (`test_insitu.py`).

- [x] **AC04: 3D Spherical Marker Placement (`argoProfiles.js`)**
  - Converts geographic (lat, lon) to Cartesian 3D using the shared formula with radial elevation ($R = 100.8$).
  - Verified marker coordinates for Bay of Bengal (`ARGO_2902145` at $12.48^\circ\text{N}, 82.03^\circ\text{E}$) and Arabian Sea (`ARGO_2902198` at $16.52^\circ\text{N}, 71.85^\circ\text{E}$).
  - Result: **PASS** (`test-argo.mjs`).

- [x] **AC05: Earth Occlusion & Far-Side Line-of-Sight**
  - Line-of-sight test hides markers positioned on the far side of the Earth from camera view and prevents click raycasting through the solid planet.
  - Result: **PASS** (`test-argo.mjs`).

- [x] **AC06: Orbit Drag vs Click Discrimination**
  - Pointer distance tracker ($\le 4\text{px} \implies$ click, $> 4\text{px} \implies$ camera orbit/drag) prevents accidental float selection when rotating the globe.
  - Result: **PASS** (`argo.spec.js`).

- [x] **AC07: Interactive Selection & 3D Highlighting**
  - Clicking a marker selects it, applies a visual highlight (halo ring/enlarged beacon), and updates `selectedFloat` state.
  - Clicking empty space or close button clears selection.
  - Result: **PASS** (`argo.spec.js`).

- [x] **AC08: Profile Metadata Modal & Keyboard Accessibility**
  - Updates `ProfileModal.jsx` to display selected sensor metadata: WMO ID, coordinates, timestamp, cycle number, data center, QC flag counts, and depth range.
  - Accessible keyboard dropdown in sidebar/panel (`select#argo-float-select`) allows selecting floats via keyboard without mouse interaction.
  - Result: **PASS** (`argo.spec.js`).

- [x] **AC09: Layer Toggle & Teardown Lifecycle**
  - Enables `Argo floats` checkbox in `SidebarControls.jsx` (`input#layer-argo`).
  - Viewport HUD badge: `ARGO FLOATS: 3 active (INCOIS-DAC)`.
  - Toggling off removes markers and disposes WebGL resources cleanly.
  - Result: **PASS** (`argo.spec.js`).

- [x] **AC10: Automated Test Suite & Non-Regression Gate**
  - Unit tests (`backend/tests/test_insitu.py`, `frontend/tests/test-argo.mjs`) pass 100%.
  - Playwright browser tests (`frontend/tests/argo.spec.js`) pass with exit code 0; measured **165 FPS**.
  - All existing 26 browser tests pass without regression (50.1s).
  - ESLint (0 errors, 0 warnings) and production build pass cleanly.
  - Result: **PASS**.
