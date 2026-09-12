# Phase 12 Report: Underwater Glider Vertical Transect Profiles & 3D Mission Paths

## 1. Executive Summary
- **Phase Objective:** Ingest, reconstruct, and interactively render 3D underwater glider sawtooth (yo-yo dive/climb) profiling transects across the Indian Ocean water column with vertical depth exaggeration, GPS surfacing beacons, bottom inflection anchors, strict discontinuity gap segmentation, ProfileModal CTD curve inspection, and multi-sensor concurrency (Argo + Gliders + Currents).
- **Status:** **PASS** (100% test pass rate across backend, frontend unit, and browser E2E suites; 165 FPS multi-sensor WebGL render performance).
- **Master Handbook Authority:** Roadmap row 12, physical p. 10; supporting detail pp. 4, 6, 9-11, 13; Handbook H23 depth exaggeration ($E=30$).
- **Evidence Output:** 4 high-resolution screenshots in `docs/evidence/phase-12/`:
  - `01-glider-transect-overview.png`: Full Indian Ocean overview with active glider layer toggle, active count badge, and keyboard selector.
  - `02-sawtooth-dives-3d-detail.png`: 3D sawtooth yo-yo trajectory detail showing surface GPS beacons, depth penetration, and QC gap discontinuity handling.
  - `03-glider-profile-inspector.png`: ProfileModal inspection of glider transect vertical Temperature, Salinity, and T-S correlation curves with UNESCO EOS-80 isopycnals.
  - `04-multi-sensor-argo-glider-currents.png`: Concurrency of 3 simultaneous in-situ and numerical layers (Argo floats + Glider sawtooth paths + 3D current particle streamlines) at 165 FPS.

---

## 2. Implemented Architecture & Methodology

### 2.1 Backend In-Situ Ingestion & Normalization
- **Endpoints:**
  - `GET /api/insitu/gliders`: Summary list of active glider transects (`id`, `name`, `wmo_id`, `mission`, `total_dives`, `max_depth`, `total_waypoints`, `qc_summary`).
  - `GET /api/insitu/gliders/{id}`: Detailed transect with full 3D waypoints $(t_k, \text{lat}_k, \text{lon}_k, z_k)$, dive/climb phase flags, temperature, salinity, and WMO QC flags.
- **Datasets:**
  - `backend/sample_data/glider_transects.json`: 2 synthetic missions (`GLIDER_BOB_SG01` with 25 waypoints across 3 dives to 1,000m, and `GLIDER_TEST_GAP_FIXTURE` with missing depth and flag 4 QC outlier).
  - `backend/sample_data/real_glider_sample.json`: Documented real sample (`GLIDER_REAL_INCOIS_SG02`) with raw pressure in dbar converted via UNESCO standard approximation ($z = P \times 0.992$).

### 2.2 3D Sawtooth Kinematics & Vertical Depth Exaggeration
- **Coordinate Projection:**
  - Surface radius $R = 100.0$.
  - Depth exaggeration factor $E = 30$ per Handbook H23:
    $$\text{scale} = \frac{E}{6,371,000} = 0.000471$$
    $$r = R - \text{depth} \times \text{scale}$$
  - For a 1,000m dive turnaround:
    $$r = 100.0 - 1000 \times 0.000471 = 99.529$$
  - Provides clear subsurface penetration into the water column without compromising planetary curvature.

### 2.3 Strict Discontinuity & QC Gap Handling
- **Scientific Integrity Requirement:** Oceanographic glider paths must not interpolate across missing depth soundings or failed sensor transmissions.
- **Segmentation Engine (`gliderTransects.js`):**
  - Waypoints with missing depths (`depth === null`), bad QC flags (`qc_flag === 3 || qc_flag === 4`), or temporal jump $>12\text{h}$ trigger segment termination.
  - The trajectory is partitioned into clean, disconnected Three.js `Line` sub-paths. No line connects across an invalid gap.
  - In `ProfileModal.jsx`, discontinuous segments trigger a visible warning banner: `⚠ QC Flag Discontinuity (Gap Rendered)`.

### 2.4 Multi-Marker Visualization & Earth Occlusion
- **Surface Beacons:** Rendered at $z=0$ surfacing points with cyan spheres ($r=0.45$).
- **Dive Anchors:** Rendered at bottom inflections with gold spheres ($r=0.35$).
- **Glider Head:** Navigation beacon marking the latest known location.
- **Earth Occlusion:** Camera dot product $\mathbf{P} \cdot \mathbf{C} > 0$ geometrically occludes far-side beacons and track segments, preventing visual bleed-through and click-through bugs.
- **Drag-vs-Click:** $\le 4\text{px}$ movement threshold prevents accidental selection during globe orbit maneuvers.

### 2.5 Multi-Sensor Concurrency
- `ProfileModal.jsx` supports both `ARGO FLOAT` and `GLIDER TRANSECT` platform tags.
- `SidebarControls.jsx` enables independent toggling of Argo, Glider, and ROMS Current streamlines.
- Full multi-sensor concurrency verified with all 3 layers active simultaneously at **165 FPS** on WebGL canvas.

---

## 3. Verification & Test Results

| Test Category | Test Suite | Command | Result |
| :--- | :--- | :--- | :--- |
| **Backend Glider Acceptance** | `backend/tests/test_gliders.py` | `python backend/tests/test_gliders.py` | **PASS (100%)** |
| **Backend In-Situ Integration** | `backend/tests/test_insitu.py` | `python backend/tests/test_insitu.py` | **PASS (100%)** |
| **Backend API Acceptance** | `backend/tests/test_api.py` | `python backend/tests/test_api.py` | **PASS (100%)** |
| **Backend Synthetic Data Validation** | `backend/tests/test_synthetic_data.py` | `python backend/tests/test_synthetic_data.py` | **PASS (100%)** |
| **Frontend Glider Unit Tests** | `frontend/tests/test-glider-transects.mjs` | `node tests/test-glider-transects.mjs` | **PASS (6/6 suites)** |
| **Frontend Code Quality** | ESLint | `npm run lint` | **PASS (0 errors, 0 warnings)** |
| **Frontend Production Build** | Vite Build | `npm run build` | **PASS** |
| **Phase 12 Dedicated Playwright** | `frontend/tests/glider.spec.js` | `npm run test:browser -- tests/glider.spec.js` | **PASS (4/4 tests, 7.6s)** |
| **Full Browser Regression Suite** | All 10 test specs | `npm run test:browser` | **PASS (34/34 tests, 55.4s)** |
| **Repository Baseline Checks** | `scripts/check-baseline.py` | `python scripts/check-baseline.py` | **PASS (`"result": "PASS"`)** |

---

## 4. Acceptance Criteria Checklist (AC01–AC10)

- [x] **AC01: In-Situ Glider Endpoints & Ingestion** — `GET /api/insitu/gliders` and `/api/insitu/gliders/{id}` active, normalized schemas, synthetic and real local samples supported.
- [x] **AC02: 3D Sawtooth Trajectory & Vertical Depth Exaggeration** — $E=30$, surface radius $R=100.0$, 1,000m dive radius $r=99.529$.
- [x] **AC03: Discontinuity & Invalid Gap Handling** — Missing depths and bad QC flags break lines into sub-paths; no gap bridging.
- [x] **AC04: Surfacing Beacons & Dive Bottom Inflection Markers** — Surface GPS beacons, bottom inflection anchors, glider head beacon.
- [x] **AC05: Earth Line-of-Sight Occlusion** — Solid Earth occlusion prevents far-side picking and visual bleed-through.
- [x] **AC06: Interactive Selection & Raycasting** — Drag-vs-click $\le 4	ext{px}$, cyan track highlighting, gold anchor nodes.
- [x] **AC07: ProfileModal Integration & Vertical Curves** — Platform tag `GLIDER TRANSECT`, temperature, salinity, and T-S diagram with isopycnals.
- [x] **AC08: Layer Controls & Viewport HUD Badge** — `input#layer-glider` toggle, active badge `GLIDERS: 2 active (INCOIS-Seaglider)`, keyboard dropdown.
- [x] **AC09: Multi-Sensor Concurrency & Clean Disposal** — Argo + Gliders + Currents active concurrently at 165 FPS; clean resource disposal.
- [x] **AC10: Automated Test Suite & Non-Regression Gate** — All 34 browser tests passing across 10 specs, 0 regressions.

---

## 5. Next Steps
Phase 12 is complete and verified. Ready for user cross-check before proceeding to Phase 13 (*In-situ Observation vs Model Collocation & Bias Analytics*).
