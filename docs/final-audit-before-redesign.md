# SAMUDRA-3D — Complete Repository Audit Before Redesign
**Audit Date**: September 22, 2026  
**Auditor**: Lead Product Architect & Scientific UX Designer  
**Scope**: Full repository audit across frontend, backend, tests, dataset registry, API routers, services, authentication, database layer, Docker, configuration, and documentation.

---

## 1. Executive Summary & Verification Baseline

Before modifying any source code, the entire repository was executed and audited from raw source. No claims from past phase reports or README files were accepted without verification.

### Baseline Test & Build Results

| Verification Item | Command Executed | Result | Notes / Details |
|---|---|---|---|
| **Backend Unit & Integration Tests** | `python -m unittest discover backend/tests -v` | **56 / 56 PASSED (100%)** | 26.768s execution time. All collocation, NetCDF slicing, in-situ ingestion, auth, download manager, and depth analysis tests pass. |
| **Frontend Production Build** | `npm.cmd run build` | **PASSED (0 Errors)** | 50 modules transformed in 1.27s. Dist bundle created (`index-DCGqjVnl.js`: 1,061 kB, gzip: 267 kB). |
| **Frontend Static Analysis / Lint** | `npm.cmd run lint` | **42 Errors, 8 Warnings** | Identified missing globals (`AbortSignal`, `Blob`, `performance`, `THREE` in utils) and React hook exhaustive-deps / setState warnings. Must be resolved in redesign. |
| **Active Database Layer** | `backend/data/samudra.db` | **SQLite (Legacy)** | Contains `users` (1 admin), `sessions` (235), `audit_logs` (764), `custom_sensors` (1), `data_sources` (3). Requires migration to PostgreSQL + Alembic. |
| **Docker & Orchestration** | `docker-compose.yml` | **Partial** | Configured for backend + frontend; missing PostgreSQL/PostGIS container definition and environment variable wiring. |

---

## 2. Complete Feature Audit Matrix

| FEATURE | STATUS | REAL/SYNTHETIC/REMOTE | SOURCE FILE | API | UI LOCATION | TEST STATUS | RECOMMENDED ACTION |
|---|---|---|---|---|---|---|---|
| **Copernicus GLORYS12V1 Grid & Slicing** | Implemented | **REAL LOCAL** | `backend/app/routers/ocean.py`, `backend/app/services/ocean_service.py`, `backend/app/data/adapters.py` | `GET /api/ocean/point`, `GET /api/ocean/profile`, `GET /api/ocean/region`, `GET /api/ocean-data` | `OceanCanvas.jsx`, `SidebarControls.jsx` | PASSED (`test_real_glorys_activation_and_slicing`) | Retain and optimize: enforce viewport bounding box; eliminate full horizontal grid loading; connect to new LOD system. |
| **Coordinate Availability Metadata** | Implemented | **REAL LOCAL** | `backend/app/routers/ocean.py` | `GET /api/location/availability` | `OceanCanvas.jsx` | PASSED (`test_api.py`) | Use as primary lightweight probe check when user clicks or hovers over globe coordinates. |
| **Argo Profiling Floats** | Implemented | **REAL LOCAL** (6 NetCDF files) + **SYNTHETIC** fallback | `backend/app/routers/routes_insitu.py`, `backend/app/services/insitu_service.py`, `backend/app/data/argo_ingest.py` | `GET /api/insitu/profiles`, `GET /api/insitu/profiles/{id}` | `argoProfiles.js`, `SidebarControls.jsx`, `ComparisonPanel.jsx` | PASSED (`test_02_argo_real_ingest_and_domain_filter`, `test_05_api_insitu_source_modes`) | Move out of permanent sidebar into contextual floating Observation Drawer. Display clear `REAL • ARGO` badge. |
| **Autonomous Underwater Gliders** | Implemented | **REAL LOCAL** (3 NetCDF files) + **SYNTHETIC** fallback | `backend/app/routers/routes_insitu.py`, `backend/app/services/insitu_service.py`, `backend/app/data/glider_ingest.py` | `GET /api/insitu/transects`, `GET /api/insitu/transects/{id}` | `gliderTransects.js`, `SidebarControls.jsx`, `ComparisonPanel.jsx` | PASSED (`test_03_glider_ingest_and_waypoints`, `test_06_glider_transect_waypoint_collocation`) | Render 3D swept-wing diamond markers with directional vectors. Accessible via contextual Observation Drawer. |
| **INCOIS OMNI Moored Buoys** | Implemented | **REAL LOCAL** (2 NetCDF files) | `backend/app/data/incois_ingest.py`, `backend/app/routers/routes_insitu.py` | `GET /api/insitu/profiles` | `DataSourcesModal.jsx` | PASSED (`test_01_incois_moored_buoys_ingestion`) | Add dedicated Buoy filter in the new Observation Drawer; render distinct mooring buoy icons on globe. |
| **Model vs. Observation Collocation** | Implemented | **REAL LOCAL** | `backend/app/routers/collocation.py`, `backend/app/services/collocation.py` | `POST /api/collocation/profile`, `POST /api/collocation/glider-transect` | `ComparisonPanel.jsx`, `ModelComparisonModal.jsx` | PASSED (`test_01_collocation_health_and_affine_ground_truth`, `test_02_sign_convention_and_residual_metrics`) | Make this the hero analytical feature: 1-click `COMPARE MODEL` from any observation card or probe. Display Bias, MAE, RMSE, Pearson $R$, $N$, units. |
| **3D Anomaly Residual Field** | Implemented | **REAL LOCAL** | `backend/app/routers/anomaly.py`, `backend/app/services/anomaly_engine.py` | `GET /api/anomaly/field`, `GET /api/anomaly/summary` | `anomalyField.js`, `ComparisonPanel.jsx` | PASSED (`test_phase13_collocation`) | Sparse scientific anomaly visualization. Clicking anomaly navigates directly to source profile (`ANOMALY -> OBSERVATION -> PROFILE -> MODEL`). |
| **In-Depth Ocean Physics (EOS-80, Sound Speed, BV Freq)** | Implemented | **REAL LOCAL** | `backend/app/services/ocean_service.py` | `GET /api/ocean/in-depth-analysis` | `InDepthOceanModal.jsx` | PASSED (6 tests in `test_depth_analysis.py`) | Integrate into Profile / Probe Inspector as advanced physics tabs rather than isolated popups. |
| **Dataset Subsetting & Download Manager** | Implemented | **REAL LOCAL** | `backend/app/routers/datasets.py`, `backend/app/data/download_manager.py`, `backend/app/data/estimator.py` | `POST /api/datasets/estimate-size`, `POST /api/datasets/generate-command`, `GET /api/datasets/manifests` | `DatasetManagerModal.jsx` | PASSED (5 tests in `test_download_manager.py`) | Redesign as a clean workspace tab under `DATA -> Download Manager` with disk safety caps, logical memory estimation, and SHA-256 validation. |
| **Authentication & RBAC (Admin, Operator, Researcher, Viewer)** | Implemented | **REAL LOCAL** | `backend/app/db.py`, `backend/app/routers/auth.py`, `backend/app/routers/admin.py`, `backend/app/services/auth_service.py` | `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/admin/users`, `GET /api/admin/audit-logs` | `AuthGate.jsx`, `LoginPage.jsx`, `AdminPortal.jsx` | PASSED (6 tests in `test_auth.py`) | Migrate database storage to PostgreSQL. Move administration behind `User -> Administration` so it does not clutter scientific workspace. |
| **AI Ocean Assistant** | Implemented | **REAL LOCAL** (Grounded) | `backend/app/routers/assistant.py`, `backend/app/services/ai_assistant.py` | `POST /api/assistant/query` | `AIAssistantModal.jsx` | PASSED (Latency: 11.22ms) | Move from intrusive shortcut/header to bottom-right floating trigger (`Ask SAMUDRA`). Ground all answers strictly in live API results. |
| **Fisherman Mode** | Partial / UI Mockup | **PARTIAL** | `frontend/src/components/FishermanModeModal.jsx` | None (uses local harbor list + probe) | `FishermanModeModal.jsx` | Untested | Redesign as dedicated operational mode (`OPERATIONS -> Fisherman View`). Show only real SST, currents, depth, and nearby observations. Surface explicit "Advisory unavailable" notice if no official PFZ exists. |
| **Cyclone / Marine Conditions** | Partial / UI Mockup | **PARTIAL** | `frontend/src/components/CycloneModeModal.jsx` | None (hardcoded track coords) | `CycloneModeModal.jsx` | Untested | Redesign as dedicated operational mode (`OPERATIONS -> Cyclone / Marine Conditions`). Separate atmospheric track, ocean state (SST, TCHP, D26, MLD), and derived impact indicators. |
| **Global 3D Earth Globe & Orbit Controls** | Implemented (Needs Overhaul) | **REAL / WEBGL** | `frontend/src/components/OceanCanvas.jsx`, `coordinates.js`, `earthTexture.js` | WebGL / Three.js | `OceanCanvas.jsx` | Builds cleanly; WebGL startup OK | Rebuild into full-viewport scientific workstation. Replace basic OrbitControls with custom smooth camera layer (inertia, damping, double-click focus). Implement 6-tier LOD system. |
| **Dashboard Layout** | Obsolete | **UI ONLY** | `frontend/src/App.jsx`, `SidebarControls.jsx`, `ComparisonPanel.jsx` | N/A | Main Page Layout | Lints with 42 errors | **REMOVE** permanent 3-column split (left sidebar + center canvas + right drawer). Rebuild as clean application shell with top bar, full globe, bottom timeline/variable bar, vertical depth bar, and dockable contextual panels. |
| **Database Architecture** | Obsolete (SQLite) | **REAL LOCAL** | `backend/app/db.py`, `backend/data/samudra.db` | SQLite3 | Backend internal | Tested via test suite | **MIGRATE to PostgreSQL + SQLAlchemy 2.x + Alembic**. Create migration script `scripts/migrate_sqlite_to_postgres.py` and Docker service. |

---

## 3. Identification of Data Status

1. **Real Local Datasets**:
   - `SAMUDRA_DATA/raw/cmems_mod_glo_phy_my_0.083deg_P1D-m_thetao-so-uo-vo_50.00E-100.00E_0.00N-25.00N_0.49-92.33m_2025-01-01-2025-01-07.nc`: Real Copernicus GLORYS12V1 reanalysis (301x601 horizontal grid, 22 depths: 0.494m - 92.326m, 7 days: 2025-01-01 to 2025-01-07).
   - `SAMUDRA_DATA/raw/argo/*.nc`: 6 real NetCDF files (INCOIS floats 1900121, 1900122, 2902210 and GDAC profiles).
   - `SAMUDRA_DATA/raw/glider/*.nc`: 3 real NetCDF files (CP335, MARACOOS01, SL502 Ningaloo).
   - `SAMUDRA_DATA/raw/incois/*.nc`: 2 real NetCDF files (IMOS ITF Seabird, LOCO MozChannel).

2. **Synthetic Datasets (Development & Fallback Only)**:
   - `backend/sample_data/model_indian_ocean.nc`: Synthetic 9-depth grid used solely for offline testing.
   - `backend/sample_data/argo_profiles.json` & `glider_transects.json`: Synthetic sensor arrays used when explicitly requested (`source_mode=SYNTHETIC`).
   - *Rule*: Never silently present synthetic data as real. Clearly badge `SYNTHETIC • DEVELOPMENT` vs `REAL • COPERNICUS` / `REAL • ARGO`.

3. **Unavailable Remote / Live Feeds**:
   - Live INCOIS REST feeds, real-time satellite SST feeds, and real-time PFZ advisories are currently not cached locally.
   - *Rule*: Surface `"DATA UNAVAILABLE"` or `"ADVISORY UNAVAILABLE FOR THIS LOCATION"` rather than fabricating values.

---

## 4. Key Architectural Flaws Identified for Redesign

1. **Cramped Multi-Column UI**: The current UI permanently divides the screen into a dense left sidebar (`SidebarControls`), center 3D viewport, and right drawer (`ComparisonPanel`), resulting in a cluttered "student dashboard" feel.
2. **Missing Custom Camera & LOD Navigation**: Camera controls rely on basic Three.js `OrbitControls` with jumpy preset teleports, lacking smooth zoom interpolation across geographical scales (Global -> Basin -> Coastal -> Point -> Observation).
3. **Database on SQLite**: The backend currently relies on SQLite (`samudra.db`) without migrations or production-grade ORM models.
4. **Scattered Modals**: Operational views (Fisherman, Cyclone, In-Depth Physics, Data Sources) open in disconnected dialog cards rather than being coherent workspace workflows.
5. **Lint & Type Inconsistencies**: 42 ESLint errors in frontend (missing global browser types in scripts, React hook dependency warnings).
