# Antigravity Core Phase 02 Report: Dataset, Date, and Depth Consistency

- **Status:** READY FOR REVIEW
- **Date:** 2026-09-27
- **Branch/Workspace:** `D:\Samudra 3D\samudra-3d`
- **Scope:** Antigravity Core Phase 02 Corrections & Acceptance (Dataset, Date, Depth Consistency, Unified Serialized Transition Coordinator Queue, Strict Scientific Readiness Lifecycle, and Controlled Pending-Response Identity Verification)

---

## 1. Initial Workspace State and Confirmed Causes

Prior to Phase 02 corrections, the codebase exhibited architectural inconsistencies across dataset transitions, timeline navigation, depth level derivations, and cache boundaries:

1. **Uncoordinated Dataset Transitions & Metadata Hydration (`App.jsx`):**
   - Startup initialization and dataset switching previously lacked a unified transition coordinator. Startup needed guaranteed metadata retrieval (`/api/metadata`) across both auto-selection and pre-active dataset branches while avoiding redundant backend selections when the dataset is already active.
2. **Strict Scientific Readiness Lifecycle & Non-Empty Identity Verification (`App.jsx`):**
   - Scientific readiness is governed by confirmed valid metadata, requiring a non-empty dataset identity matching the active registry dataset (`meta.dataset_id === targetDatasetId`), non-empty depth and time dimensions, no pending transition, and no transition error.
   - Startup begins in the unready state (`isDatasetReady = false`, `isTransitioningDataset = true`). Mismatched or missing dataset identity throws a recoverable error, renders the workspace error banner (`[data-testid="dataset-transition-error-banner"]`), sets timestamp status to `DATASET ERROR`, and blocks scientific controls.
3. **Serialized Transition Mutex Queue (`App.jsx`, `utils/transitionQueue.js`):**
   - Coordinator mutations (`transitionToDataset`) are serialized via a dedicated production async queue module (`frontend/src/utils/transitionQueue.js`, `createAsyncQueue()`). It serializes asynchronous operations with a single active operation guarantee and catches rejections so subsequent operations can proceed. This is verified both via unit testing with deferred promise gates (`frontend/tests/transitionQueue.test.js`) and UI testing.
4. **Comprehensive Scientific Readiness Gating Across All Consumers:**
   - Controls, canvas, modals, and data-fetching effects are gated by scientific readiness:
     - `BottomControlBar`: variable tabs, timeline chips, speed chips, and playback buttons are disabled when unready; timestamp badge displays `SYNCING DATASET...` (or `DATASET ERROR` on failure).
     - `VerticalDepthBar`: discrete depth ticks are disabled when unready.
     - `OceanCanvas`: scalar fetching, probe requests, particle streamline simulation, and 3D volume fetching are suppressed when unready; the draped scalar mesh is hidden when unready.
     - `InDepthOceanModal` & `FishermanModeModal`: requests are blocked and explicit unavailable notices are displayed when unready.
     - `ModelComparisonModal`: in-flight collocations are invalidated and stale results are cleared when unready.
5. **Metadata Retry Recovery (`App.jsx`):**
   - In the event of a `/api/metadata` failure during dataset switching, the error banner's "Retry Metadata" action cleanly recovers the pending target dataset identity (recovering B as B, never relabeling B as A).
6. **Cross-Dataset Cache Invalidation & Ownership (`services/api.js`):**
   - Cache keys are scoped to active dataset identity (`${datasetId}:${cacheKey}`) with generation tracking (`currentDatasetGeneration`) preventing late-resolving responses from writing into cache.
7. **Stale Probe / Model Profile during Playback (`App.jsx`):**
   - Probed points and water column soundings re-query `/api/ocean/probe` when `timeIndex` changes, invalidating stale profile data during active playback or manual stepping, and displaying live loading indicators during updates.
8. **Fisherman Mode Bounds & Identity Confirmation (`FishermanModeModal.jsx`):**
   - Thermal front evaluation validates confirmed coverage bounds (`coverageBounds` / `activeDataset.coverage_bounds`), rendering an explicit unavailable state if bounds are missing, and cancelling in-flight requests on close/unmount (`frontsRequestIdRef`).
9. **Dynamic Depth Ruler & Scientific HUD (`VerticalDepthBar.jsx`, `OceanCanvas.jsx`):**
   - Depth ruler derives discrete depth ticks from active metadata (`depth_levels_m`), displaying both requested and snapped resolved depths. Replaced hardcoded `/8` step count in `OceanCanvas` with `${availableTimes?.length || 1}`.

---

## 2. Changed Files

### Backend
- **`backend/app/data/satellite_ingest.py`**:
  - Added `time_idx: int = 0` parameter to `get_surface_thermal_analysis` and forwarded it directly to `adapter.slice_data(..., time_idx=time_idx)`.
- **`backend/app/routers/ocean.py`**:
  - Added `time_idx: int = Query(0, ge=0)` parameter to `/api/ocean/thermal-fronts` endpoint and passed `time_idx` to `satellite_manager.get_surface_thermal_analysis`.

### Frontend
- **`frontend/src/utils/transitionQueue.js`** *(NEW)*:
  - Extracted production reusable FIFO async queue (`createAsyncQueue`).
  - Implemented `.enqueue(fn)` chaining promises sequentially while catching errors to guarantee execution and recovery of subsequent queued operations.
- **`frontend/tests/transitionQueue.test.js`** *(NEW)*:
  - Fast, dependency-free Node unit test suite executed via `node --test tests/transitionQueue.test.js`.
  - Tested overlapping enqueued operations with deferred gates: verified operation A does not enter while operation B is held, verified maximum simultaneous operations is exactly 1, verified held metadata keeps subsequent operation queued, and verified error rejection in first operation does not prevent recovery of subsequent operations.
  - Verified negative test: tested that replacing serialized chaining with immediate execution causes test failure, confirmed failure, and verified clean pass upon restoring production implementation.
- **`frontend/src/services/api.js`**:
  - Added `currentActiveDatasetId` and `currentDatasetGeneration` state trackers.
  - Implemented `setActiveDatasetId`, `getActiveDatasetId`, and `getDatasetGeneration`.
  - Updated `makeCacheKey` to prevent `null` dataset arguments from erasing active dataset identity fallback.
  - Updated `requestJson` to capture `reqGen` and `reqDatasetId` and validate against `currentDatasetGeneration` and `currentActiveDatasetId` before cache insertion.
  - Cleared cache and incremented generation on `setActiveDatasetId`.
  - Updated `fetchThermalFronts` to accept and pass `time_idx`.
  - Updated `fetchInDepthOceanAnalysis` to pass `time_idx`.
- **`frontend/src/App.jsx`**:
  - Implemented unified serialized `transitionToDataset` coordinator using `createAsyncQueue()` via `transitionQueueRef.current.enqueue(...)`.
  - Added `isDatasetReady` (starts `false`) and `isTransitioningDataset` (starts `true`) lifecycle states.
  - Strict identity validation: raises error if `!meta || !meta.dataset_id || meta.dataset_id !== finalTargetId` or if metadata dimensions are missing.
  - Passed `isDatasetReady`, `isTransitioningDataset`, and `datasetTransitionError` to `OceanCanvas`, `VerticalDepthBar`, `BottomControlBar`, `DatasetManagerModal`, `FishermanModeModal`, `InDepthOceanModal`, and `ModelComparisonModal`.
  - Guarded water column probe sync on `isTransitioningDataset || !isDatasetReady`.
  - Implemented retry metadata recovery restoring `pendingTransitionTargetRef.current`.
  - Handled timeline step navigation dynamically with `availableTimes.length || getTotalForecastSteps()`.
- **`frontend/src/components/BottomControlBar.jsx`**:
  - Evaluated `isBlocked = isTransitioningDataset || !isDatasetReady || Boolean(datasetTransitionError)`.
  - Disabled variable tabs, timeline step chips, speed chips, and playback buttons when `isBlocked`.
  - Displayed `SYNCING DATASET...` or `DATASET ERROR` status in timestamp badge when blocked.
  - Derived time markers and slider bounds dynamically from `availableTimes`.
  - Disabled unsupported variable buttons with clear `[N/A]` indicators based on `availableVariables`.
- **`frontend/src/components/VerticalDepthBar.jsx`**:
  - Evaluated `isBlocked = isTransitioningDataset || !isDatasetReady || Boolean(datasetTransitionError)`.
  - Disabled depth tick buttons when `isBlocked`.
  - Dynamically computed depth levels via `useMemo` from `availableDepths`.
  - Derived max depth from max depth level of active dataset metadata.
  - Distinct display of requested depth vs. resolved slice depth.
- **`frontend/src/components/OceanCanvas.jsx`**:
  - Evaluated `isDatasetBlocked = isTransitioningDataset || !isDatasetReady || Boolean(datasetTransitionError)`.
  - Suppressed scalar fetching, probe requests, particle streamline simulation, and 3D volume fetching when `isDatasetBlocked`.
  - Hidden scalar draped mesh when `isDatasetBlocked`.
  - Replaced hardcoded `/8` in scientific HUD badge with `${availableTimes?.length || 1}`.
  - Added `data-testid="hud-layer-badge"` to the layer HUD badge for direct scientific range and result assertions.
- **`frontend/src/components/InDepthOceanModal.jsx`**:
  - Blocked physics queries and displayed unavailable notice when unready (`isTransitioningDataset || !isDatasetReady`).
  - Added request ID cancellation cleanup on close/unmount (`analysisRequestIdRef`).
- **`frontend/src/components/FishermanModeModal.jsx`**:
  - Blocked thermal front evaluation when unready (`isTransitioningDataset || !isDatasetReady`).
  - Added `coverageBounds` and `activeDataset` props.
  - Validated confirmed bounds and rendered explicit error message if unconfirmed bounds.
  - Added `frontsRequestIdRef` guard and cleaned up ESLint dependency array.
- **`frontend/src/components/ModelComparisonModal.jsx`**:
  - Blocked collocation queries and displayed unavailable notice when unready (`isTransitioningDataset || !isDatasetReady`).
  - Cleared stale collocation data and invalidated pending queries when transition starts or readiness is lost.
- **`frontend/src/components/DatasetManagerModal.jsx`**:
  - Routed selection through parent `onSelectDataset={transitionToDataset}` coordinator.
  - Disabled "Activate Dataset" buttons when `isTransitioning` or `switchingId` is active, displaying `Transitioning...` status.
- **`frontend/tests/core-phase-01.spec.js` & `frontend/tests/core-phase-01-contract-review.spec.js`**:
  - Updated metadata mocks in `beforeEach` to include `dataset_id: 'cmems_mod_glo_phy_my_0.083deg_P1D-m'` to adhere to the strict matching identity contract.
- **`frontend/tests/core-phase-02.spec.js`**:
  - Renamed sequential switch mutation test `TC-P02-04` accurately.
  - Strengthened `TC-P02-05` to assert that controls remain blocked and the timestamp badge shows `DATASET ERROR` prior to retry recovery.
- **`frontend/tests/core-phase-02-identity-review.spec.js`**:
  - Comprehensive controlled-response test suite with deferred promise gates verifying:
    - `TC-ID-01`: Mismatched metadata `dataset_id` blocks readiness and displays error banner.
    - `TC-ID-02`: Missing or empty metadata `dataset_id` blocks readiness and displays error banner.
    - `TC-ID-03`: Controlled startup gate suppresses scientific data requests (scalar ocean-data, probe, and volume) until confirmed metadata arrives.
    - `TC-ID-04`: Failed metadata on switch leaves controls blocked and suppressed, asserts `.legend-placeholder` is visible and scalar HUD badges are hidden, exercises Fisherman thermal fronts modal during failure asserting unavailable notice and zero scientific requests, then recovers via retry with confirmed B metadata and asserts actual consumed B scientific results (`hud-layer-badge` displaying `24.2 to 24.2 °C`, `color-bar-legend` displaying `24.2 °C`, `hud-depth-badge` displaying `0m requested (Surface level)`, `hud-time-badge` displaying `2025-01-10`).
    - `TC-ID-05`: Held switch metadata and late older scientific response: uses explicit gates (`oldRequestEnteredGate`, `delayedOceanDataGate`, `switchMetadataEnteredGate`, `switchMetadataGate`), awaits old request starting before switching, releases old request while B metadata is held, asserts old timestamp, depth, and temperature (`28.5`) values remain absent while state remains blocked with `SYNCING DATASET...` (with `.legend-placeholder` visible and `hud-layer-badge`, `color-bar-legend`, `hud-depth-badge`, and `hud-time-badge` not visible), and upon releasing B metadata gate, awaits and asserts actual B scientific result consumption (`hud-layer-badge` displaying `24.2 to 24.2 °C`, `color-bar-legend` displaying `24.2 °C`, `hud-depth-badge` displaying `0m requested (Surface level)`, `hud-time-badge` displaying `2025-01-10`).
    - `TC-ID-06`: Accurately titled `TC-ID-06: Sequential UI dataset switches execute in order and reflect final confirmed identity`, verifying sequential UI switch triggers execute in order and resolve to final confirmed dataset identity.

---

## 3. Selection Reconciliation Policy

When switching from Dataset A to Dataset B:
1. **Depth Reconciliation:**
   - If current `requestedDepth` exists in Dataset B's `availableDepths`, it is preserved.
   - If not, `requestedDepth` snaps to the nearest available discrete depth level in Dataset B.
2. **Variable Reconciliation:**
   - If current `selectedVariable` is present in Dataset B's `availableVariables`, it is preserved.
   - Otherwise, `selectedVariable` falls back deterministically to the first available variable in Dataset B (e.g., `thetao` / `temp`), and `showCurrents` is disabled if velocity vectors are absent.
3. **Time Reconciliation:**
   - Timeline `timeIndex` is clamped to `[0, availableTimes.length - 1]`.
   - The timeline slider maximum and discrete tick markers update dynamically based on Dataset B's timestamp array.
   - Active timestamp badge reflects `availableTimes[clampedIndex]`.
4. **Playback State:**
   - Timeline animation playback is paused during dataset transitions to prevent race conditions during metadata loading.

---

## 4. Cache, Concurrency, and Process-Wide Backend State Architecture

1. **Process-Wide Backend Isolation Policy:**
   - The backend dataset registry maintains a single process-wide active dataset (`active_dataset`). Endpoints such as `/api/ocean/thermal-fronts` and `/api/ocean/in-depth-analysis` accept temporal (`time_idx`) and spatial query parameters rather than query-scoped dataset identifiers.
   - Because changing active dataset changes global server state for subsequent queries, client-side serialized coordinator queue (`transitionQueueRef` using `createAsyncQueue`) combined with strict scientific readiness gating (`isDatasetReady`, `isTransitioningDataset`, `datasetTransitionError`) acts as the enforced isolation policy.
2. **Serialized Coordinator Queue (`utils/transitionQueue.js` & `transitionQueueRef`):**
   - Extracted into a dedicated reusable module (`createAsyncQueue`).
   - Mutations across startup, user clicks in modal, and retry callers are serialized through the FIFO queue.
   - Enqueue guarantees at most one active transition operation at any time. If an operation fails, the rejection is caught so that subsequent enqueued transitions continue and recover cleanly.
   - Tested directly with overlapping calls and deferred gates in `transitionQueue.test.js` (including negative mutation verification proving concurrency failure when serialization is removed).
3. **Dataset-Scoped Client Cache (`api.js`):**
   - Cache keys are prefixed with `${dataset_id}:${endpoint_key}`.
   - `makeCacheKey` uses `datasetId || currentActiveDatasetId || 'default'`, ensuring `null` arguments cannot corrupt the cache key.
   - Cache invalidation on dataset activation purges stale scientific arrays and increments `currentDatasetGeneration`.
   - `requestJson` checks `reqGen === currentDatasetGeneration && reqDatasetId === currentActiveDatasetId` before writing to cache.
4. **Probe & Derived View Request Ownership:**
   - `probeRequestIdRef`, `analysisRequestIdRef`, and `frontsRequestIdRef` discard pending responses whenever the coordinate, time step, or dataset context changes.

---

## 5. Acceptance Test Verification

### Production Transition Queue Unit Suite (`frontend/tests/transitionQueue.test.js`)
| Test Name | Status | Observable Verification Details |
|---|---|---|
| `createAsyncQueue serializes overlapping calls with single active operation` | **PASS** | Enqueued B and held selection with deferred gate; enqueued A before releasing B; asserted A has not entered and active operations count == 1; released B selection while holding B metadata (A still not entered); released B metadata; asserted A entered and confirmed A identity in FIFO order. |
| `createAsyncQueue continues execution and recovers when first operation fails` | **PASS** | First queued operation rejects; error caught; second queued operation executes and recovers cleanly. |
| **Negative Mutation Verification** | **VERIFIED** | Temporarily mutated `transitionQueue.js` to execute `fn()` immediately without promise chaining: `node --test tests/transitionQueue.test.js` failed as expected (`assert.equal(aEntered, false)` failed). Restored production implementation cleanly (both tests pass). |

### Identity & Readiness Review Suite (`core-phase-02-identity-review.spec.js`)
| Test ID | Test Name | Status | Observable Verification Details |
|---|---|---|---|
| `TC-ID-01` | Mismatched metadata dataset_id blocks readiness | **PASS** | `dataset_id: different-dataset-B` against active `Dataset A` displays error banner, disables timeline step buttons, and shows `DATASET ERROR`. |
| `TC-ID-02` | Missing/empty metadata dataset_id blocks readiness | **PASS** | Omitted `dataset_id` in `/api/metadata` response displays error banner, disables timeline step buttons, and shows `DATASET ERROR`. |
| `TC-ID-03` | Controlled startup gate suppresses scientific requests | **PASS** | Held startup metadata gate keeps controls disabled and `SYNCING DATASET...` visible; scalar ocean-data, probe, and volume requests are suppressed until confirmed metadata arrives. |
| `TC-ID-04` | Failed metadata on switch blocks controls until retry | **PASS** | Failed metadata on Dataset B leaves controls blocked and suppresses scientific requests; `.legend-placeholder` is visible and scalar HUD badges are absent; opening Fisherman fronts during failure displays unavailable notice and issues 0 scientific requests; Retry recovers Dataset B with confirmed metadata and distinct consumed scientific results (`hud-layer-badge` has `24.2 to 24.2 °C`, `color-bar-legend` has `24.2 °C`, `hud-depth-badge` has `0m requested (Surface level)`, `hud-time-badge` has `2025-01-10`). |
| `TC-ID-05` | Late older scientific response cannot overwrite invalidation | **PASS** | Explicit gates ensure old request starts before switch; old request resolves while B metadata is held; asserts old values (`28.5`, `0.494m`, `2025-01-01`) remain absent from UI and controls remain blocked; releasing B metadata gate confirms distinct B scientific results consumed (`hud-layer-badge` has `24.2 to 24.2 °C`, `color-bar-legend` has `24.2 °C`, `hud-depth-badge` has `0m requested (Surface level)`, `hud-time-badge` has `2025-01-10`). |
| `TC-ID-06` | Sequential UI dataset switches execute in order and reflect final confirmed identity | **PASS** | Sequential UI dataset switches execute in order and reflect final confirmed identity (`Dataset A`). Production queue concurrency is verified by `transitionQueue.test.js`. |

### Dataset, Date, and Depth Consistency Suite (`core-phase-02.spec.js`)
| Test ID | Test Name | Status | Observable Verification Details |
|---|---|---|---|
| `TC-P02-01` | Startup initialization in auto-activation and pre-active branches | **PASS** | Startup loads metadata for active dataset; depths (`[0.0, 10.0, 25.0, 75.0, 150.0, 300.0, 500.0]`) and timestamps populate controls. |
| `TC-P02-02` | Dataset switch A -> B reconciles controls, labels, and metadata | **PASS** | Switching from GLORYS to INCOIS ROMS reconciles depth ruler (`0` to `500m`), time slider (`2` steps), variable choices, and disables unsupported currents. |
| `TC-P02-03` | Client cache isolation across datasets prevents cross-dataset pollution | **PASS** | Point queries return `28.5°C` on Dataset A and `24.2°C` on Dataset B without cross-pollution on revisit. |
| `TC-P02-04` | Sequential dataset switch mutations reconcile correctly | **PASS** | Sequential switches between Dataset B and Dataset A resolve cleanly to final active dataset identity (`Dataset A`). |
| `TC-P02-05` | Dataset switch failure displays error banner and recovers upon retry | **PASS** | 500 metadata error shows error banner with blocked controls; Retry Metadata recovers Dataset B as Dataset B. |
| `TC-P02-06` | Timeline step advance live-synchronizes probed point and model profile | **PASS** | Advancing timeline steps (`timeIndex` 0 -> 1) triggers `/api/ocean/probe` with `time_idx=1`, dynamically updating profile modal. |
| `TC-P02-07` | Rapid location probe clicks ensure final coordinate owns state | **PASS** | Rapid clicks across coordinates resolve with final clicked point `(14.5, 88.5)` owning modal state; delayed responses from prior clicks are ignored. |
| `TC-P02-08` | Derived Views forward active time_idx | **PASS** | Fisherman thermal fronts and Deep Ocean physics modals forward active `time_idx=1` in API requests. |
| `TC-P02-09` | Depth selector derives discrete levels from metadata | **PASS** | Depth bar displays discrete ticks from metadata (`0.494m`, `5m`, `10m`, `20m`, `50m`, `92.3m`); requested depth `45m` snaps to resolved depth `50m`. |
| `TC-P02-10` | Preserves Phase 01 in-situ observed comparison semantics | **PASS** | Argo and Glider in-situ collocation retains Phase 01 behavior using observation timestamps, preserving correlation scorecard calculations. |

---

## 6. Test Suite Execution & Output

### 1. ESLint Check
```bash
$ npm.cmd run lint
> samudra-3d-frontend@0.1.0 lint
> eslint . --max-warnings 0
# Exit code: 0 (0 errors, 0 warnings)
```

### 2. Production Build Check
```bash
$ npm.cmd run build
> samudra-3d-frontend@0.1.0 build
> vite build

vite v8.3.0 building client environment for production...
transforming...
✓ 55 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                     0.73 kB │ gzip:   0.44 kB
dist/assets/index-B3nLPHfP.css     77.11 kB │ gzip:  14.83 kB
dist/assets/index-BNE2iGG4.js   1,079.98 kB │ gzip: 273.62 kB

✓ built in 1.32s
# Exit code: 0
```

### 3. Transition Queue Unit Test Suite (Node Test Runner)
```bash
$ node --test tests/transitionQueue.test.js
✔ createAsyncQueue serializes overlapping calls with single active operation (1.8415ms)
✔ createAsyncQueue continues execution and recovers when first operation fails (0.5363ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 81.3069
# Exit code: 0
```

### 4. Playwright Full Regression Suite (33 / 33 Tests Passed)
```bash
$ npx.cmd playwright test tests/core-phase-01.spec.js tests/core-phase-01-contract-review.spec.js tests/core-phase-02.spec.js tests/core-phase-02-identity-review.spec.js

Running 33 tests using 1 worker

  ok  1 tests\core-phase-01-contract-review.spec.js:97:3 › Core Phase 01: Profile and Observation Validation Regression Suite › TC-P01-15: Platform dispatch uses explicit platform_type metadata regardless of ID spelling prefix (2.0s)
  ok  2 tests\core-phase-01.spec.js:97:3 › Core Phase 01: Profile and Observation Validation Regression Suite › TC-P01-01: Probed ocean point CTD builds Model Water Column Profile (1.1s)
  ok  3 tests\core-phase-01.spec.js:156:3 › Core Phase 01: Profile and Observation Validation Regression Suite › TC-P01-02: Land coordinate renders explicit unavailable state in ProfileModal (1.1s)
  ok  4 tests\core-phase-01.spec.js:201:3 › Core Phase 01: Profile and Observation Validation Regression Suite › TC-P01-03: Compare from probe with nearest observation hydrates platform and runs comparison with exact metrics (1.2s)
  ok  5 tests\core-phase-01.spec.js:310:3 › Core Phase 01: Profile and Observation Validation Regression Suite › TC-P01-04: Compare from probe with no nearest observation shows unavailable panel even with loaded fleet (1.1s)
  ok  6 tests\core-phase-01.spec.js:354:3 › Core Phase 01: Profile and Observation Validation Regression Suite › TC-P01-05: Observation Fleet drawer supports Buoy filter notice (1.0s)
  ok  7 tests\core-phase-01.spec.js:376:3 › Core Phase 01: Profile and Observation Validation Regression Suite › TC-P01-06: Fleet drawer handles full Argo -> Glider -> Argo transitions with distinct detail shapes and preserved bad QC (1.3s)
  ok  8 tests\core-phase-01.spec.js:465:3 › Core Phase 01: Profile and Observation Validation Regression Suite › TC-P01-07: Out-of-order platform detail responses maintain final target ownership (1.8s)
  ok  9 tests\core-phase-01.spec.js:533:3 › Core Phase 01: Profile and Observation Validation Regression Suite › TC-P01-08: Deselecting or closing profile during detail loading prevents stale modal reopen or selection restoration (1.7s)
  ok 10 tests\core-phase-01.spec.js:577:3 › Core Phase 01: Profile and Observation Validation Regression Suite › TC-P01-09: Probe nearest comparison isolates target from prior selection without old-platform collocation request (1.7s)
  ok 11 tests\core-phase-01.spec.js:711:3 › Core Phase 01: Profile and Observation Validation Regression Suite › TC-P01-10: Closing comparison modal during nearest platform hydration invalidates pending response (2.0s)
  ok 12 tests\core-phase-01.spec.js:786:3 › Core Phase 01: Profile and Observation Validation Regression Suite › TC-P01-11: Genuine out-of-order collocation responses across platform dropdown, strategy switches, and close invalidation do not overwrite newer results (2.6s)
  ok 13 tests\core-phase-01.spec.js:1020:3 › Core Phase 01: Profile and Observation Validation Regression Suite › TC-P01-12: Probe point without nearest platform after completed comparison asserts unavailable state and no reused result (1.4s)
  ok 14 tests\core-phase-01.spec.js:1101:3 › Core Phase 01: Profile and Observation Validation Regression Suite › TC-P01-13: Detail API failure displays visible error panel and retry action recovers cleanly (1.0s)
  ok 15 tests\core-phase-01.spec.js:1156:3 › Core Phase 01: Profile and Observation Validation Regression Suite › TC-P01-14: Scorecard metrics calculate Pearson correlation accurately across negative, zero, zero-variance, and insufficient pairs (1.2s)
  ok 16 tests\core-phase-01.spec.js:1270:3 › Core Phase 01: Profile and Observation Validation Regression Suite › TC-P01-15: Platform dispatch uses explicit platform_type metadata regardless of ID spelling prefix (1.4s)
  ok 17 tests\core-phase-01.spec.js:1492:3 › Core Phase 01: Profile and Observation Validation Regression Suite › TC-P01-16: All-null model columns and absent model metadata show explicit unavailable states rather than synthetic fallbacks (1.3s)
  ok 18 tests\core-phase-02-identity-review.spec.js:64:3 › Core Phase 02: Scientific Readiness Lifecycle and Identity Verification › TC-ID-01: Metadata for a different dataset must block scientific readiness (715ms)
  ok 19 tests\core-phase-02-identity-review.spec.js:115:3 › Core Phase 02: Scientific Readiness Lifecycle and Identity Verification › TC-ID-02: Metadata with missing or empty dataset identity must block scientific readiness (688ms)
  ok 20 tests\core-phase-02-identity-review.spec.js:150:3 › Core Phase 02: Scientific Readiness Lifecycle and Identity Verification › TC-ID-03: Controlled startup gate suppresses scientific data requests until confirmed metadata arrives (772ms)
  ok 21 tests\core-phase-02-identity-review.spec.js:234:3 › Core Phase 02: Scientific Readiness Lifecycle and Identity Verification › TC-ID-04: Failed metadata on switch leaves controls blocked and suppressed until retry recovery (1.4s)
  ok 22 tests\core-phase-02-identity-review.spec.js:371:3 › Core Phase 02: Scientific Readiness Lifecycle and Identity Verification › TC-ID-05: Held switch metadata and late older scientific response cannot overwrite invalidation state (1.2s)
  ok 23 tests\core-phase-02-identity-review.spec.js:515:3 › Core Phase 02: Scientific Readiness Lifecycle and Identity Verification › TC-ID-06: Sequential UI dataset switches execute in order and reflect final confirmed identity (1.1s)
  ok 24 tests\core-phase-02.spec.js:145:3 › Core Phase 02: Dataset, Date and Depth Consistency Suite › TC-P02-01: Startup initialization fetches metadata in both auto-activation and pre-active branches (861ms)
  ok 25 tests\core-phase-02.spec.js:187:3 › Core Phase 02: Dataset, Date and Depth Consistency Suite › TC-P02-02: Switching dataset from A to B reconciles controls, labels, and fetches new metadata (1.0s)
  ok 26 tests\core-phase-02.spec.js:250:3 › Core Phase 02: Dataset, Date and Depth Consistency Suite › TC-P02-03: Client cache isolation across datasets prevents cross-dataset pollution (1.6s)
  ok 27 tests\core-phase-02.spec.js:342:3 › Core Phase 02: Dataset, Date and Depth Consistency Suite › TC-P02-04: Sequential dataset switch mutations reconcile correctly with active backend identity (968ms)
  ok 28 tests\core-phase-02.spec.js:404:3 › Core Phase 02: Dataset, Date and Depth Consistency Suite › TC-P02-05: Dataset switch failure displays error banner and recovers upon retry (1.1s)
  ok 29 tests\core-phase-02.spec.js:476:3 › Core Phase 02: Dataset, Date and Depth Consistency Suite › TC-P02-06: Advancing timeline steps live-synchronizes active probed point and model profile (1.2s)
  ok 30 tests\core-phase-02.spec.js:555:3 › Core Phase 02: Dataset, Date and Depth Consistency Suite › TC-P02-07: Rapid location probe clicks ensure final coordinate owns state without race conditions (847ms)
  ok 31 tests\core-phase-02.spec.js:620:3 › Core Phase 02: Dataset, Date and Depth Consistency Suite › TC-P02-08: Derived Views (Fisherman Fronts and Physics Analysis) forward active time_idx and dataset (1.4s)
  ok 32 tests\core-phase-02.spec.js:761:3 › Core Phase 02: Dataset, Date and Depth Consistency Suite › TC-P02-09: Depth selector derives discrete levels from metadata and displays resolved depth correctly (933ms)
  ok 33 tests\core-phase-02.spec.js:799:3 › Core Phase 02: Dataset, Date and Depth Consistency Suite › TC-P02-10: Preserves Phase 01 in-situ observed comparison semantics without regression (1.0s)

  33 passed (44.9s)
# Exit code: 0
```

---

## 7. Evidence Artifacts

Visual evidence screenshots captured under `docs/evidence/core-phase-02/`:

- `docs/evidence/core-phase-02/01_startup_metadata_initialized.png`: Shows initial GLORYS metadata loaded with accurate depth and timeline markers.
- `docs/evidence/core-phase-02/02_dataset_switched_reconciled.png`: Shows reconciled depth ruler, timeline slider, and dataset badge after switching to INCOIS ROMS.
- `docs/evidence/core-phase-02/05_dataset_switch_failure_recovered.png`: Demonstrates error notification and clean fallback retention upon switch failure.
- `docs/evidence/core-phase-02/06_probe_sync_on_time_advance.png`: Displays model profile updating live with the current timeline step temperature.
- `docs/evidence/core-phase-02/08_derived_views_context_forwarding.png`: Displays in-depth ocean physics modal reflecting current dataset and time index.
- `docs/evidence/core-phase-02/09_metadata_depth_ruler.png`: Shows vertical depth bar rendering discrete depth levels derived from metadata.
- `docs/evidence/core-phase-02/10_insitu_comparison_preserved.png`: Demonstrates in-situ Argo comparison modal with correlation metrics preserved.

---

## 8. Real-vs-Fixture Verification & Limitations

- **Frontend & Integration Verification:** Complete (**100% pass across 33 browser tests and 2 Node unit tests**).
- **Backend Test Runner Smoke Check:** `NOT RUN` (pytest and netCDF4 are not installed in the host Python environment `C:\Python314\python.exe` and no local backend virtualenv exists).
- **Fixtures vs Real NetCDF:** Playwright tests use faithful JSON/binary schema fixtures matching FastAPI router schemas (`/api/metadata`, `/api/ocean/probe`, `/api/ocean-data`, `/api/ocean/thermal-fronts`, `/api/collocation/*`, `/api/insitu/*`). Real NetCDF dataset verification requires active server deployment with configured raw NetCDF data files and is reported honestly as `NOT RUN`.

---

## 9. Conclusion

Antigravity Core Phase 02 corrections, production transition queue verification, and strengthened identity and scientific value assertions are **COMPLETE** and **READY FOR REVIEW**.
