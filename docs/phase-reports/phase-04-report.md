# Phase 04 report

## Identity and status

- Phase 4 of 15: **FastAPI Endpoints (/api/ocean-data, /api/metadata, /api/health)**, handbook classification MUST HAVE.
- Report version 1, 2026-09-12, 08:58 IST (Asia/Calcutta, UTC+05:30).
- Implementation result: **PASS**. Independent review result: **PENDING**.
- Workspace: `D:\Studies\SIH\Samudra 3D`. Non-Git baseline: `docs/evidence/phase-04/implementation-manifest.json` (61 files, all hashes verified).
- Previous-phase gate: Phase 3 implementation PASS, explicit user authorization received 2026-09-12 to proceed to Phase 4.
- Authority: complete 14-page handbook; roadmap physical p. 10; supporting detail pp. 5-10, 12, 14. Supporting sources: Problem statement DOCX, SIH2026-IDEA-Presentation.pptx (all slides and notes).
- Source file hashes verified: 36 entry-inventory files unchanged (`check-baseline.py` PASS). Phase-prompts and reference docs preserved.

## Work and baseline

On entry, Phase 1 dashboard shell, Phase 2 Three.js 3D Earth globe, and Phase 3 synthetic NetCDF generator (`model_indian_ocean.nc`) were confirmed PASS. The backend lacked HTTP server files, API routes, or data services.

Phase 4 implements the high-performance FastAPI service layer:
1. Created modular backend architecture in `backend/app/`:
   - `core/config.py`: Application settings, dataset filepaths, and local CORS origins (`localhost:5173`, `127.0.0.1:5173`, `localhost:4175`, `127.0.0.1:4175`).
   - `schemas/ocean.py`: Pydantic models for `HealthResponse`, `OceanMetadataResponse`, `VariableMetadata`, and `OceanDataSliceResponse`.
   - `services/ocean_service.py`: High-performance NetCDF4 reader, in-memory caching of coordinate axes, spatial/depth/time slicing, land-mask handling, nearest-depth level resolution, and derived current speed computation $\sqrt{u^2 + v^2}$.
   - `routers/ocean.py`: Endpoints `/api/health`, `/api/metadata`, `/api/ocean-data`, and `/api/insitu/profiles`.
   - `main.py`: FastAPI app with async lifespan management (pre-loads dataset on startup and ensures clean disposal on shutdown) and restricted CORS middleware.
2. Slices 4D arrays on the backend before transmission:
   - Evaluates variable, time index, depth (with disclosure of both `requested_depth` and `selected_depth`), and optional spatial bounding box (`lat_min`, `lat_max`, `lon_min`, `lon_max`).
   - Preserves land masks: 703 land points on the Indian subcontinent serialized strictly as JSON `null`, never as `-999.0` or raw fill numbers.
   - Prevents `NaN` or `Infinity` in JSON output.
3. Input validation and error handling:
   - Unsupported variable returns HTTP 400 with descriptive message.
   - Out-of-bounds time index or inverted latitude/longitude bounding box returns HTTP 400.
   - OpenAPI documentation generated and verified at `/docs` and exported to `docs/evidence/phase-04/openapi.json`.
4. Automated integration test suite `backend/tests/test_api.py` validating status codes, response schemas, edge cases, error conditions, and numerical agreement with direct NetCDF reads.
5. Measured performance and payload size:
   - Single slice payload: **23.2 KB** (substantially under the <50 KB handbook target).
   - Query latency: **8.09 ms** average, **8.41 ms** p95 (immensely faster than the sub-second 1000 ms handbook target).
6. No frontend 3D scalar rendering or colormap wiring is implemented yet — those belong to Phase 5 and Phase 6.

Runtime: Windows 10.0.26200 x64; Python 3.11.9; `fastapi` 0.141.1; `uvicorn` 0.52.4; `netCDF4` 1.7.4; `numpy` 2.4.6; `scipy` 1.17.1; Node 24.19.0.

## Changed files

| File | Change | Purpose | Requirement | Prior work preserved |
| --- | --- | --- | --- | --- |
| `backend/app/core/config.py` | Added | Backend application settings, dataset paths, CORS origins | H16/H29 | Yes |
| `backend/app/schemas/ocean.py` | Added | Pydantic response models for health, metadata, and 2D data slice | H04/H22 | Yes |
| `backend/app/services/ocean_service.py` | Added | NetCDF slicing service, nearest-depth matcher, mask serializer, vector speed | H04/H24 | Yes |
| `backend/app/routers/ocean.py` | Added | API routes: `/api/health`, `/api/metadata`, `/api/ocean-data`, `/api/insitu/profiles` | H04 | Yes |
| `backend/app/main.py` | Added | FastAPI entrypoint, lifespan startup/shutdown, CORS middleware | H04/H16 | Yes |
| `backend/app/**/__init__.py` | Added | Python package initializers | H16 | Yes |
| `backend/tests/test_api.py` | Added | Integration and acceptance test suite for all endpoints, errors, and performance | H04/U03 | Yes |
| `scripts/check-baseline.py` | Modified | Updated scope assertions for Phase 4 backend app and future 3D shader guards | U01/U02 | Yes |
| `docs/acceptance-phase-04.md` | Added | Pre-implementation acceptance checklist AC01–AC10 | U06 | Yes |
| `docs/decisions.md` | Modified | Added decisions D23–D27 (modular app, backend slicing, vector speed, nearest depth, CORS) | U02 | Yes |
| `docs/phase-status.md` | Modified | Phase 4 updated to PASS/PENDING | U06 | Yes |
| `docs/phase-reports/phase-04-report.md` | Added | This formal report | U06 | Yes |

Non-Git baseline: `docs/evidence/phase-04/implementation-manifest.json` (61 files, all hashes verified).

## Requirement and acceptance traceability

| Requirement ID | Source and physical page | Acceptance criterion | Implementation file | Verification ID | Result |
| --- | --- | --- | --- | --- | --- |
| H04 | Handbook p. 10 roadmap row 4 | FastAPI endpoints (`/api/metadata`, `/api/ocean-data`, `/api/health`); slice value agreement | routers/ocean.py, ocean_service.py | AC02/AC03/AC04 | PASS |
| H16 | Handbook pp. 1,3,5 | FastAPI/Uvicorn, Pydantic, netCDF4 stack | backend/requirements.txt, main.py | AC02 | PASS |
| H22 | Handbook pp. 3,6-7 | Units: °C (`degC`), practical salinity (`PSU`), current speed and components ($u, v$ in `m/s`) | schemas/ocean.py, ocean_service.py | AC03/AC04 | PASS |
| H24 | Handbook pp. 6-7,13 | Lazy backend slicing before transmission; bounded JSON <50 KB | ocean_service.py | AC04/AC08 | PASS (23.2 KB) |
| H25 | Handbook p. 6 | Sub-second request latency target measured and recorded honestly | test_api.py (test 10) | AC08 | PASS (8.09 ms avg) |
| H29 | Handbook p. 12 | CORS configured, resource cleanup on shutdown | main.py lifespan & middleware | AC02/AC07 | PASS |
| U03 | User requirement | Automated test suite exiting 0; clean schema validation | test_api.py | AC09 | PASS |
| U05 | User requirement | Mask preservation: land cells serialized as JSON null, never -999.0 | test_api.py (test 3) | AC05 | PASS |

## Executed checks

| Check | Exact command | Working directory | Actual result | Exit code | Evidence |
| --- | --- | --- | --- | --- | --- |
| Automated API Test Suite | `python backend/tests/test_api.py` | `D:\Studies\SIH\Samudra 3D` | 10/10 test sections PASSED: health, metadata, data slice, time bounds, depth levels, bbox, currents, errors, profiles, performance | 0 | `20260912-085642-140-test-api-suite.txt` |
| OpenAPI Spec Export | `python -c "from backend.app.main import app; ..."` | `D:\Studies\SIH\Samudra 3D` | Exported complete OpenAPI JSON spec with all endpoints and schemas | 0 | `docs/evidence/phase-04/openapi.json` |
| Baseline & Scope Check | `python scripts/check-baseline.py` | `D:\Studies\SIH\Samudra 3D` | 36 entry files unchanged; 15 roadmap rows; Phase 4 backend present; shaders deferred | 0 | `20260912-085705-794-check-baseline-phase04.txt` |
| Frontend Build Regression | `npm run build` | `frontend/` | 26 modules; built in 542ms; exit 0 | 0 | `20260912-085711-894-frontend-regression-build.txt` |
| Frontend Lint Regression | `npm run lint` | `frontend/` | 0 errors, 0 warnings; exit 0 | 0 | `20260912-085719-332-frontend-regression-lint.txt` |
| SHA-256 Manifest Snapshot | `python scripts/snapshot-baseline.py phase-04` | `D:\Studies\SIH\Samudra 3D` | 61 files snapshotted and verified | 0 | `implementation-manifest.json` |

### Detailed Numerical and Performance Verification

1. **Endpoint Responses**:
   - `GET /api/health`: HTTP 200, `status="healthy"`, `dataset_loaded=true`.
   - `GET /api/metadata`: HTTP 200, dimensions `[time: 8, depth: 9, lat: 50, lon: 60]`, 5 variables, 9 depth levels (`0m` to `4000m`).
   - `GET /api/ocean-data?variable=temperature&time_idx=0&depth=0`: HTTP 200, shape `[50, 60]`, surface temperature min/max `[28.53°C, 29.10°C]`.
   - `GET /api/ocean-data?variable=temperature&depth=4000`: HTTP 200, abyssal temperature min/max `[2.03°C, 2.60°C]`.
   - `GET /api/ocean-data?variable=currents`: HTTP 200, returns scalar speed $\sqrt{u^2 + v^2}$ with $u$ and $v$ matrices.
   - `GET /api/insitu/profiles`: HTTP 200, returns 4 normalized in-situ profiles with QC flags.
2. **Payload Footprint**:
   - Surface slice response: **23.2 KB** (23,756 bytes uncompressed JSON).
   - Fully satisfies the Master Handbook target of **< 50 KB** per sliced transmission.
3. **Latency Benchmarking (10 warm requests)**:
   - Average latency: **8.09 ms**.
   - 95th percentile (p95): **8.41 ms**.
   - Min / Max latency: **7.82 ms / 9.14 ms**.
   - Fully satisfies the Master Handbook target of **sub-second service (< 1000 ms)**.
4. **Land Mask Serialization**:
   - 703 points on Indian landmass serialized strictly as JSON `null`.
   - Verified that `_FillValue = -999.0` never appears in the output array.
5. **Error Rejection**:
   - Unsupported variable (`chlorophyll_a`): HTTP 400 (`"Unsupported variable 'chlorophyll_a'"`).
   - Out-of-range time index (`99`): HTTP 400 (`"time_idx 99 out of range [0..7]"`).
   - Inverted latitude bounds (`min=20, max=5`): HTTP 400 (`"Invalid latitude range: min (20.0) > max (5.0)"`).

## Regression and performance evidence

- Frontend build regression: clean exit 0 (26 modules, 542ms).
- Frontend lint regression: 0 errors, 0 warnings.
- Pre-existing files: 36 entry files preserved with identical SHA-256 hashes.
- Backend startup and dataset pre-load: completes in **< 40ms**.

## Data and scientific decisions

Data mode: **SYNTHETIC / 4D CF-1.8 FORECAST SUBSET**. Served from `backend/sample_data/model_indian_ocean.nc` (3.32 MB).

Conventions and Serialization:
- Coordinate axes: `time` (8 forecast hours from 2026-09-10 00:00:00 UTC), `depth` (9 levels, positive down), `lat` (0° to 25°N), `lon` (65° to 95°E).
- Missing values: Serialized strictly as JSON `null` (None in Python).
- Derived variables: `currents` calculates scalar speed $\sqrt{u^2 + v^2}$ on-the-fly and includes component matrices $u$ and $v$ in the payload for downstream Phase 9 particle streamlines.
- Nearest-depth matching: Maps continuous depth input to closest discrete model layer, returning both `requested_depth` and `selected_depth` for scientific transparency.
- CORS: Local-only access (`localhost:5173`, `127.0.0.1:5173`, `localhost:4175`, `127.0.0.1:4175`). Wildcard credentials disabled.

## Deviations and unresolved gaps

| ID | Requirement/source | Difference | Why | Impact | Decision/owner | Gate effect |
| --- | --- | --- | --- | --- | --- | --- |
| D23 | H04 router structure | Modular FastAPI application layout | Clean separation of concerns; enables TestClient testing without external server processes. | Highly maintainable and testable | D23; Phase 4 resolved | None |
| D24 | H24 backend slicing | Slices 4D array into 2D JSON grid | Prevents transmitting raw multi-GB NetCDF to client. | Achieves 23.2 KB payload (<50 KB target) | D24; Phase 4 resolved | None |

## Handoff

- **Completed capabilities**: FastAPI application with lifespan management, CORS middleware, CF metadata endpoint (`/api/metadata`), on-demand 4D data slicing endpoint (`/api/ocean-data`), in-situ observation endpoint (`/api/insitu/profiles`), healthcheck endpoint (`/api/health`), land-mask `null` serialization, input validation error handling, and comprehensive automated test suite.
- **Required checks passed / failed / not run**: AC01 PASS · AC02 PASS · AC03 PASS · AC04 PASS · AC05 PASS (JSON null mask) · AC06 PASS · AC07 PASS (CORS restricted) · AC08 PASS (23.2 KB payload, 8.09 ms latency) · AC09 PASS · AC10 PASS.
- **Report path**: `docs/phase-reports/phase-04-report.md`
- **Evidence paths**: `docs/evidence/phase-04/` (command logs, test outputs, openapi.json, SHA-256 manifest)
- **Reviewer checks requested**: Run `python backend/tests/test_api.py` to independently verify API responses, numerical agreement with NetCDF, mask serialization, and performance benchmarks. Run `uvicorn backend.app.main:app --reload` and visit `http://127.0.0.1:8000/docs` to inspect interactive Swagger documentation.
- **Known risks or assumptions**: Current service uses local NetCDF file; connecting live OPeNDAP or remote THREDDS servers is a Phase 15 extensibility item.
- **Specific corrections still required**: None. All Phase 4 acceptance criteria satisfied.
- **Next phase prerequisites**: Phase 5 (3D Scalar Temperature Field Rendering) requires Three.js BufferGeometry and custom GPU shaders in `OceanCanvas.jsx` to fetch `/api/ocean-data?variable=temperature` and render the volumetric subsurface thermal field on the globe. Phase 4 endpoints are fully ready for frontend consumption.
- **Advancement**: PENDING REVIEW

---

**Phase 4 is ready for cross-check.**

```
Phase: 4
Implementation: PASS
Review: PENDING
Report: docs/phase-reports/phase-04-report.md
Evidence: docs/evidence/phase-04/
Changed files: backend/app/core/config.py, backend/app/schemas/ocean.py,
               backend/app/services/ocean_service.py, backend/app/routers/ocean.py,
               backend/app/main.py, backend/tests/test_api.py,
               scripts/check-baseline.py, docs/acceptance-phase-04.md,
               docs/decisions.md, docs/phase-status.md
Checks passed: AC01-AC10 all PASS (10/10 test suite sections, 23.2 KB payload,
               8.09 ms latency, JSON null land mask, frontend build/lint regression)
Checks failed: None
Not run: None
Deviations: D23 (modular architecture), D24 (backend slicing for <50KB payload)
Blockers: None
Next: Paste Phase 5 prompt to begin 3D Scalar Temperature Field Rendering
```
