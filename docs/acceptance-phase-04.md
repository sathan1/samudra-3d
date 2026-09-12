# Phase 04 acceptance checklist

Recorded before implementation. Authority: Master Handbook physical pp. 5-10, 12, 14; roadmap p. 10; and `phase-prompts/PHASE-04.md`. Preceding Phase 3 implementation is PASS with explicit user authorization to proceed.

1. **AC01 Phase 3 Gate & Baseline Preservation:** Verify Phase 3 implementation passed and is accepted. NetCDF dataset `model_indian_ocean.nc` (3.32 MB) and `argo_profiles.json` remain intact.
2. **AC02 FastAPI App & Health Endpoint (`/api/health`):** FastAPI app with lifespan event loading dataset into memory. Returns HTTP 200 with service status, dataset presence, and timestamp.
3. **AC03 Dataset Metadata Endpoint (`/api/metadata`):** Returns complete dataset dimensions, variables (`temperature`, `salinity`, `u_current`, `v_current`, `currents`), units, domain extents (lat: 0–25°N, lon: 65–95°E), exact depth levels (0m to 4000m), and forecast time stamps.
4. **AC04 Ocean Data Slicing Endpoint (`/api/ocean-data`):** Slices 4D array on the backend by variable, time index, depth (with nearest-depth resolution disclosure), and optional spatial bounding box. Returns 2D scalar/vector grid, coordinates, shape, and value bounds.
5. **AC05 Mask & Null Serialization Integrity:** Land points and missing data serialized strictly as JSON `null`, never as `-999.0` or raw fill values. Prevents NaN/Infinity in JSON output.
6. **AC06 Input Validation & Error Handling:** Rejects unsupported variables, out-of-range time indices, invalid depth values, or malformed bounding boxes with HTTP 400 Bad Request and descriptive error details.
7. **AC07 CORS & Security Configuration:** Configured CORS middleware restricting access to local frontend origins (`http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:4175`, `http://127.0.0.1:4175`).
8. **AC08 Performance & Payload Measurement:** Measure response payload bytes and query latency. Compare against handbook targets (<50 KB JSON payload, sub-second service).
9. **AC09 Automated Test Suite (`backend/tests/test_api.py`):** Comprehensive automated test suite using FastAPI TestClient / HTTP client validating status codes, response schemas, edge cases, error handling, and numerical agreement with direct NetCDF reads.
10. **AC10 Phase 3 Regression & Documentation:** Frontend build and lint remain clean. Save command logs and evidence under `docs/evidence/phase-04/`. Update `phase-status.md`, `decisions.md`, and write `docs/phase-reports/phase-04-report.md`.

Final outcome (2026-09-12): AC01-AC10 PASS, independent review PENDING. FastAPI endpoints (/api/health, /api/metadata, /api/ocean-data, /api/insitu/profiles) fully operational. Backend slices 4D arrays on-demand before transmission. Payload measured at 23.2 KB (<50 KB handbook target). Latency measured at 8.09 ms average (sub-second target). Land mask serialized strictly as JSON null. All error inputs properly rejected with HTTP 400. Complete evidence in docs/phase-reports/phase-04-report.md.
