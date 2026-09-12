# Phase 03 report

## Identity and status

- Phase 3 of 15: **Synthetic Ocean NetCDF Generator**, handbook classification MUST HAVE.
- Report version 1, 2026-09-12, 08:53 IST (Asia/Calcutta, UTC+05:30).
- Implementation result: **PASS**. Independent review result: **PENDING**.
- Workspace: `D:\Studies\SIH\Samudra 3D`. Non-Git baseline: `docs/evidence/phase-03/implementation-manifest.json` (48 files, all hashes verified).
- Previous-phase gate: Phase 2 implementation PASS, explicit user authorization received 2026-09-12 to proceed to Phase 3.
- Authority: complete 14-page handbook; roadmap physical p. 10; supporting detail pp. 3-4, 7, 9-10. Supporting sources: Problem statement DOCX, SIH2026-IDEA-Presentation.pptx (all slides and notes).
- Source file hashes verified: 36 entry-inventory files unchanged (`check-baseline.py` PASS). Phase-prompts and reference docs preserved.

## Work and baseline

On entry, Phase 1 dashboard shell and Phase 2 Three.js 3D Earth Globe with OrbitControls were confirmed PASS. The backend directory did not exist yet; no numerical model output or in-situ observation dataset was loaded or generated.

Phase 3 introduces the backend data foundation:
1. Created `backend/sample_data/generate_synthetic_data.py` generating a CF-1.8 compliant 4D NetCDF4 dataset (`model_indian_ocean.nc`) and in-situ profiles (`argo_profiles.json`).
2. Defined rectilinear Indian Ocean 4D grid spanning 8 time steps (48h forecast, 6h interval), 9 vertical depths (0 to 4000m), 50 latitudes (0° to 25°N), and 60 longitudes (65° to 95°E).
3. Implemented physics-grounded parameter fields:
   - Thermocline temperature stratification: warm mixed surface layer (29.07°C), steep vertical thermocline drop (21.96°C at 100m), and cold abyssal floor (2.57°C at 4000m).
   - Stratified practical salinity: capturing high evaporation in the Arabian Sea (~36.2 PSU) versus river-discharge dilution in the Bay of Bengal (~33.8 PSU).
   - Ocean currents: eastward ($u$) and northward ($v$) velocities with surface gyre pattern (0.3–0.6 m/s) decaying exponentially into the deep abyss ($<0.01$ m/s).
   - Subcontinent land masking: 703 points within mainland India polygon masked with standard fill values (`_FillValue = -999.0`).
4. Defined normalized in-situ observation contract (`argo_profiles.json`) containing 4 profiles: 2 Argo profiling floats (`ARGO_2902145` in Bay of Bengal, `ARGO_2902198` in Arabian Sea), 1 Underwater Glider transect (`GLIDER_INCOIS_04` in Lakshadweep Sea), and 1 deliberate outlier test fixture (`ARGO_TEST_QC_OUTLIER` with QC=4).
5. Created automated test suite `backend/tests/test_synthetic_data.py` validating CF metadata, coordinate monotonicity, physical gradients, land masking, and bit-for-bit deterministic regeneration across independent runs.
6. Backend dependency management created in `backend/requirements.txt`. No API routes, HTTP endpoints, or frontend connections implemented yet — those belong to Phase 4.

Runtime: Windows 10.0.26200 x64; Python 3.11.9; `netCDF4` 1.7.4; `numpy` 2.4.6; `scipy` 1.17.1; `fastapi` 0.141.1; `uvicorn` 0.52.4; Node 24.19.0.

## Changed files

| File | Change | Purpose | Requirement | Prior work preserved |
| --- | --- | --- | --- | --- |
| `backend/requirements.txt` | Added | Pinned native backend dependencies (netCDF4, numpy, scipy, fastapi, uvicorn) | H16 | Yes |
| `backend/sample_data/generate_synthetic_data.py` | Added | CF-1.8 4D NetCDF generator + normalized in-situ observation generator | H03/H20/H22 | Yes |
| `backend/sample_data/model_indian_ocean.nc` | Added | CF-1.8 NetCDF forecast model (3.32 MB; 8×9×50×60 grid) | H03/H22 | Yes |
| `backend/sample_data/argo_profiles.json` | Added | Normalized Argo/Glider in-situ profiles with QC flags (4 profiles) | H03/H21 | Yes |
| `backend/tests/test_synthetic_data.py` | Added | Automated validation: dimensions, monotonicity, thermocline, land mask, regeneration | H03/U03 | Yes |
| `scripts/check-baseline.py` | Modified | Updated scope assertions for Phase 3 backend additions and API deferral | U01/U02 | Yes |
| `scripts/snapshot-baseline.py` | Modified | Support dynamic phase argument and scan backend folder | U06 | Yes |
| `docs/acceptance-phase-03.md` | Added | Pre-implementation acceptance checklist AC01–AC10 | U06 | Yes |
| `docs/decisions.md` | Modified | Added decisions D18–D22 (netCDF4 engine, domain, physics, land mask, schema) | U02 | Yes |
| `docs/phase-status.md` | Modified | Phase 3 updated to PASS/PENDING | U06 | Yes |
| `docs/phase-reports/phase-03-report.md` | Added | This formal report | U06 | Yes |

Non-Git baseline: `docs/evidence/phase-03/implementation-manifest.json` (48 files, all hashes verified). Dataset binaries recorded with SHA-256 below.

## Requirement and acceptance traceability

| Requirement ID | Source and physical page | Acceptance criterion | Implementation file | Verification ID | Result |
| --- | --- | --- | --- | --- | --- |
| H03 | Handbook p. 10 roadmap row 3 | Small synthetic NetCDF generator (lat, lon, depth, time; temp, salinity, u/v currents) | generate_synthetic_data.py | AC02/AC03/AC04 | PASS |
| H16 | Handbook pp. 1,3,5 | Pinned backend stack; netCDF4/numpy/scipy native packages | backend/requirements.txt | AC08 | PASS |
| H20 | Handbook pp. 3-4 | Precomputed model representation; deterministic synthesis | generate_synthetic_data.py | AC07 | PASS |
| H21 | Handbook pp. 3,6 | Argo/glider in-situ profile representation with QC flags | argo_profiles.json | AC06 | PASS |
| H22 | Handbook pp. 3,6-7 | Units: °C (degC), practical salinity (1 / PSU), u/v currents (m/s), positive-down depth (m) | model_indian_ocean.nc | AC03/AC04 | PASS |
| H24 | Handbook pp. 6-7,13 | Lightweight dataset footprint for efficient local slicing | model_indian_ocean.nc (3.32 MB) | AC09 | PASS |
| U03 | User requirement | Automated test suite exiting 0; clean dependency verification | test_synthetic_data.py | AC08 | PASS |
| U05 | User requirement | Bit-for-bit deterministic regeneration across independent runs | test_synthetic_data.py (test 3) | AC07 | PASS |
| D18 | Implementation decision | Direct netCDF4 engine (fallback from xarray/pandas due to host policy) | generate_synthetic_data.py | AC03/AC08 | PASS |

## Executed checks

| Check | Exact command | Working directory | Actual result | Exit code | Evidence |
| --- | --- | --- | --- | --- | --- |
| Generate Synthetic Datasets | `python generate_synthetic_data.py` | `backend/sample_data/` | Generated 3.32 MB NetCDF (8×9×50×60) + 3.9 KB JSON (4 profiles); masked 703 land points | 0 | `20260912-085135-612-generate-synthetic-data.txt` |
| Automated Test Suite | `python backend/tests/test_synthetic_data.py` | `D:\Studies\SIH\Samudra 3D` | 3/3 test sections PASSED: CF dimensions, thermocline, land mask, in-situ profiles, bitwise regeneration | 0 | `20260912-085220-333-test-synthetic-data-clean.txt` |
| Baseline & Scope Check | `python scripts/check-baseline.py` | `D:\Studies\SIH\Samudra 3D` | 36 entry files unchanged; 15 roadmap rows; Phase 3 datasets present; API routes deferred | 0 | `20260912-085235-985-check-baseline-phase03.txt` |
| Frontend Build Regression | `npm run build` | `frontend/` | 26 modules; built in 846ms; dist output verified | 0 | `20260912-085242-268-frontend-regression-build.txt` |
| Frontend Lint Regression | `npm run lint` | `frontend/` | 0 errors, 0 warnings | 0 | `20260912-085247-414-frontend-regression-lint.txt` |
| SHA-256 Manifest Snapshot | `python scripts/snapshot-baseline.py phase-03` | `D:\Studies\SIH\Samudra 3D` | 48 files snapshotted and verified | 0 | `implementation-manifest.json` |

### Numerical and Physical Validation Results (`test_synthetic_data.py`)

1. **Grid Dimensions & Extents**:
   - `time`: 8 forecast time steps: `[0.0, 6.0, 12.0, 18.0, 24.0, 30.0, 36.0, 42.0]` hours since 2026-09-10 00:00:00 UTC.
   - `depth`: 9 vertical levels: `[0, 10, 50, 100, 200, 500, 1000, 2000, 4000]` m (`positive = "down"`).
   - `lat`: 50 points from 0.0° to 25.0°N (equator to northern Arabian Sea / Bay of Bengal).
   - `lon`: 60 points from 65.0° to 95.0°E (Somali Basin edge to Andaman Sea).
2. **Thermocline Profile (Open Ocean at 5°N, 85°E)**:
   - Surface (0m): **29.07°C** (warm tropical mixed layer).
   - 10m: **28.27°C**.
   - 100m: **21.96°C** (steep thermocline gradient).
   - 200m: **16.73°C**.
   - 500m: **8.07°C**.
   - 1000m: **3.71°C**.
   - 4000m: **2.57°C** (abyssal cold layer).
   - Temperature monotonically decreases with depth ($T_{0} > T_{100} > T_{500} > T_{4000}$).
3. **Salinity Stratification**:
   - Arabian Sea (west, 65°E): ~36.2 PSU (high evaporation basin).
   - Bay of Bengal (east, 90°E): ~33.8 PSU (river runoff dilution).
4. **Current Velocity Decay**:
   - Surface current ($u$): **0.334 m/s**.
   - Deep ocean (4000m) current ($u$): **0.000 m/s** (exponential decay verified).
5. **Land Masking**:
   - Grid point (18°N, 76°E) inside Maharashtra/Telangana mainland: correctly masked (`_FillValue = -999.0`).
   - 703 points total masked (~23.4% of domain).
6. **In-Situ Observation Dataset (`argo_profiles.json`)**:
   - `ARGO_2902145` (Bay of Bengal, 12.48°N, 82.03°E): 14 depth points, surface 29.1°C to 2000m 2.4°C, all QC=1.
   - `ARGO_2902198` (Arabian Sea, 16.52°N, 71.85°E): 14 depth points, surface 28.2°C to 2000m 2.3°C, all QC=1.
   - `GLIDER_INCOIS_04` (Lakshadweep Sea, 10.15°N, 76.50°E): 9 depth points (0 to 1000m), all QC=1.
   - `ARGO_TEST_QC_OUTLIER` (Test fixture, 5.00°N, 88.00°E): 4 depth points including 200m outlier 99.9°C with QC=4.
7. **Deterministic Bit-for-Bit Regeneration**:
   - Regenerated dataset in temporary directory with seed 42.
   - `np.testing.assert_array_equal()` confirmed 100% bitwise equality across all variables (`temperature`, `salinity`, `u_current`, `v_current`, `time`, `depth`, `lat`, `lon`) and JSON profiles.

## Regression and performance evidence

- Frontend build regression: clean exit 0 (26 modules, 846ms).
- Frontend lint regression: 0 errors, 0 warnings.
- Dataset generation duration: **< 1.2 seconds**.
- Test suite execution duration: **< 1.8 seconds**.
- File sizes:
  - `model_indian_ocean.nc`: **3,481,817 bytes** (3.32 MB), well within the <10 MB local loading target.
  - `argo_profiles.json`: **3,902 bytes** (4 profiles).

## Data and scientific decisions

Data mode: **SYNTHETIC / REPRODUCIBLE TEST DOMAIN**. All data is explicitly flagged with global attribute `synthetic = "true"` and seed `42`. No claim is made that these synthetic fields replace operational INCOIS ROMS forecast runs or physical satellite/Argo telemetry.

Dataset Provenance:
- File: `backend/sample_data/model_indian_ocean.nc`
  - Bytes: 3,481,817
  - SHA-256: `E6C2E82613FF17FE466650B3FC8B3DD51218D1E4A3C6A6EAA8AA556465A9F92D`
  - Generator: `backend/sample_data/generate_synthetic_data.py` (v1.0.0, seed 42)
- File: `backend/sample_data/argo_profiles.json`
  - Bytes: 3,902
  - SHA-256: `37513DD691B97C03F0452ECF10DC42A1498CBB66566D915999E5C0103F9AE997`

Conventions and Units:
- NetCDF conventions: CF-1.8.
- Time: Hours since 2026-09-10 00:00:00 UTC (proleptic_gregorian).
- Depth: Metres below sea surface, `positive = "down"`.
- Temperature: °C (`degC`), potential temperature.
- Salinity: Practical salinity unit (CF standard unit `1`, display shorthand `PSU`).
- Current vectors: $u$ (eastward) and $v$ (northward) in m/s.
- Missing value: `_FillValue = -999.0` (IEEE 32-bit float).

## Deviations and unresolved gaps

| ID | Requirement/source | Difference | Why | Impact | Decision/owner | Gate effect |
| --- | --- | --- | --- | --- | --- | --- |
| D18 | H16 backend stack (xarray/netCDF4) | Direct `netCDF4` engine used for dataset generation and testing | Windows Application Control policy blocks `pandas` C-extension DLLs on this host; `netCDF4` (v1.7.4) is officially listed in handbook stack, runs natively without error, and writes pure CF-1.8 files. | Zero scientific impact; format is 100% CF-1.8 NetCDF4 standard readable by xarray, netCDF4, or any OGC/CF tool. | D18; Phase 3 resolved | None |
| D19 | Physical domain selection | 0–25°N, 65–95°E chosen as representative Indian Ocean subdomain | Balances high spatial resolution (0.5°) and vertical resolution (9 levels) with lightweight local file size (3.32 MB). | Suitable for sub-second slicing in Phase 4; full global domain remains Phase 15 gap. | D19; Phase 3 resolved | None |

## Handoff

- **Completed capabilities**: Deterministic CF-1.8 NetCDF forecast generator, 4D rectilinear Indian Ocean test dataset (`model_indian_ocean.nc`), normalized in-situ observation profile dataset (`argo_profiles.json`), thermocline physics modeling, land polygon masking, automated numerical validation test suite, and backend dependency definition.
- **Required checks passed / failed / not run**: AC01 PASS · AC02 PASS · AC03 PASS · AC04 PASS · AC05 PASS · AC06 PASS · AC07 PASS (bit-for-bit regeneration verified) · AC08 PASS · AC09 PASS (3.32 MB footprint) · AC10 PASS.
- **Report path**: `docs/phase-reports/phase-03-report.md`
- **Evidence paths**: `docs/evidence/phase-03/` (command logs, test outputs, SHA-256 manifest)
- **Reviewer checks requested**: Run `python backend/tests/test_synthetic_data.py` to independently verify NetCDF CF metadata, thermocline gradients, land masking, and bit-for-bit deterministic regeneration.
- **Known risks or assumptions**: Dataset is synthetic for hackathon development and testing; real INCOIS ROMS NetCDF files and live OMM glider telemetry ingestion belong to Phase 15.
- **Specific corrections still required**: None. All Phase 3 acceptance criteria satisfied.
- **Next phase prerequisites**: Phase 4 (FastAPI Endpoints: `/api/metadata`, `/api/ocean-data`, `/api/health`) requires `backend/app/main.py` consuming `model_indian_ocean.nc` and serving sliced JSON responses. Phase 3 datasets are fully ready for ingestion.
- **Advancement**: PENDING REVIEW

---

**Phase 3 is ready for cross-check.**

```
Phase: 3
Implementation: PASS
Review: PENDING
Report: docs/phase-reports/phase-03-report.md
Evidence: docs/evidence/phase-03/
Changed files: backend/requirements.txt, backend/sample_data/generate_synthetic_data.py,
               backend/sample_data/model_indian_ocean.nc, backend/sample_data/argo_profiles.json,
               backend/tests/test_synthetic_data.py, scripts/check-baseline.py,
               scripts/snapshot-baseline.py, docs/acceptance-phase-03.md,
               docs/decisions.md, docs/phase-status.md
Checks passed: AC01-AC10 all PASS (3/3 test suite sections, bitwise regeneration,
               frontend build regression, frontend lint regression, source preservation)
Checks failed: None
Not run: None
Deviations: D18 (netCDF4 engine fallback from xarray/pandas due to host policy)
Blockers: None
Next: Paste Phase 4 prompt to begin FastAPI Endpoints (/api/metadata, /api/ocean-data)
```
