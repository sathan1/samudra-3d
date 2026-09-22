# SAMUDRA-3D Performance Evidence — Measured Only

> Replace performance claims with measured evidence.  Numbers here are produced
> by the reproduction procedures below; invent nothing.

## 1. Real GLORYS grid (from the audit, verified in test logs)

- Grid per 2D slice: **301 x 601 = 180,901 values**.
- Full-resolution slice is ~1.04 MB JSON — it is **never transferred** because
  bounds are mandatory and the backend auto-decimates to `MAX_GRID_CELLS = 100_000`.

## 2. Measured through the new bounded architecture

### 2.1 Bounded Bay of Bengal window (backend test, GLORYS)

Request: `variable=temperature&time_idx=0&depth=50&lat_min=10&lat_max=12&lon_min=80&lon_max=82`

- Response shape: **[25, 25]** (625 cells, native 8.3 km resolution, no decimation).
- Status: 200.  Verified in an interactive backend session during development.
- Reproduction: run the backend and issue the request above; the `shape`
  field in the JSON response is the measurement.

### 2.2 Point request

- Response keys: lat, lon, depth, time, variable, value, unit, nearest_depth,
  interpolation_method, source, dataset_id. Example measured value:
  `lat=11, lon=81, depth=50 -> value=25.929 degC, nearest_depth=47.374 m`.
- Target: **< 10 KB**.  Reproduction: measure `len(response.content)` on the
  wire; the schema above is small by construction.

### 2.3 Availability request

- Returns variables, 22 dataset depths, 7 dataset timestamps, and observation
  flags.  Status 200 in both synthetic and GLORYS sessions above.
- Target: **< 5 KB**.  Reproduction: same `len(response.content)` procedure.

### 2.4 Full test suite (unit, backend, reproducible)

- Backend unittest suite: **56 tests run, 0 failures, 0 errors**
  (`backend/tests/`, synthetic fixture + real GLORYS slice/probe/transect).
- Phase-4 API suite (`test_api.py::test_api_suite`): **all checks PASS**,
  including `23.3 KB` surface slice payload, `11.22 ms` average latency over
  10 warm requests (measured on the development machine, see logs in the PR).

### 2.5 Frontend build

- Production build: **vite build exits 0** (`frontend/dist/`).
- Developer-only perf panel: open the app with `?perf=1` to view live
  Render FPS / Draw Calls / current field shape.  Disabled by default.

## 3. What is NOT measured yet

- Browser FPS distributions per window size / GPU class: **NOT MEASURED**.
  Reproduce with `?perf=1` on target hardware and append results here.
- 25 km window payload bytes on a real user machine: **NOT MEASURED**.
  The 200 KB target is an acceptance target, not a claim.
- Full time-series rolling-cache timings: **NOT MEASURED**.

## 4. Payload budget (targets, not claims)

- Point: < 10 KB.  Profile: bounded (< 50 KB).  Local 25 km slice: < 200 KB target.
- Every scientific response carries its dataset identity and units so the
  reviewer can verify, not assume.
