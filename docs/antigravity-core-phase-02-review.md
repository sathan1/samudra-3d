# Codex review: core phase 02

Date: 27 September 2026. Verdict: CHANGES REQUIRED. Phase 03 is not ready to begin.

## Independent verification

Commands run in `frontend`:

- `npm.cmd run lint`: PASS, exit 0.
- `npm.cmd run build`: PASS, exit 0; existing large-bundle warning.
- `npx.cmd playwright test tests/core-phase-01.spec.js tests/core-phase-01-contract-review.spec.js tests/core-phase-02.spec.js`: PASS, exit 0; 27 passed (39.2s).

From the project root, `python -m py_compile backend/app/data/satellite_ingest.py backend/app/routers/ocean.py` passed. Current host Python has FastAPI/numpy but lacks pytest and netCDF4. No backend behavioral or real-NetCDF smoke test was run. Compilation does not establish behavioral correctness.

No application code was changed by this review. Phase 01's 17 tests continue to pass. Metadata startup, point/time refresh, dynamic depth ticks and time forwarding are useful progress.

## Blocking findings

1. **No coherent guarded dataset transition.** `DatasetManagerModal.handleSelectDataset` performs backend selection and invokes its async parent callback without awaiting it. `App.handleDatasetSwitched` immediately publishes the new descriptor, then fetches metadata without request ownership checks or visible failure. Scientific effects can issue requests using old depth/time/variable choices against the new dataset. Rapid selections and delayed metadata can leave old metadata under a newer label. No serialized selection/reconciliation mechanism was added. Startup failures are also console-only and descriptor fallback may describe an unconfirmed dataset.
2. **Cache identity/generation incomplete.** The API cache identity defaults to GLORYS and is updated only after `selectActiveDataset`; already-active startup does not synchronize it. `getDatasetGeneration` is defined but unused. `requestJson` writes late responses into the cache without generation validation. `makeCacheKey` sets a fallback dataset ID then spreads `parts` over it, so an explicit null `dataset_id` can erase the fallback (the volume path accepts null). A generation counter alone does not establish isolation.
3. **Metadata-driven controls are incomplete.** Available variables are stored as `_availableVariables` and discarded; the dock still exposes all three variables regardless of support. OceanCanvas still renders a hardcoded `/8` step count. Metadata errors do not disable controls/scientific requests or expose recovery. `handleDatasetSwitched` sets displayed timestamp to index zero while retaining/clamping the previous index. Unsupported currents are preserved unconditionally.
4. **Derived context incomplete.** FishermanModeModal still uses fixed 0–25 N / 50–100 E bounds, has no dataset prop/dependency or response guard and retains old results after failure. Changing dataset at the same time index need not refetch fronts. In-depth analysis adds dataset dependency but has no close invalidation or cleanup, and selecting a preset starts a direct request followed by an effect that prefers `initialCoords`, potentially restoring the original point. API functions do not accept/forward dataset ID despite the report claiming they do; backend requests currently use the process-wide active registry, so synchronization must be explained and made correct rather than inventing unsupported parameters.
5. **Stale probe/model states are not fully invalidated.** The probe effect returns on deselection without incrementing its request generation and has no cleanup; a pending response can restore probe/model-profile state after closure. It sets loading but retains old arrays during time/dataset refresh. Clear or explicitly mark obsolete state and prevent late responses from updating data/error/loading after context removal.
6. **Tests and report overclaim coverage.** TC-P02-04 performs one immediate A→B switch, with no delay or second selection. TC-P02-03 returns the same values for both datasets and asserts only that a new request exists, not cache/result ownership or a delayed write. TC-P02-06 never opens a model profile; TC-P02-08 checks time forwarding at opening but not dataset/coverage changes or stale derived responses; TC-P02-09 only checks a MAX label, not snapping. The report cites dataset metadata endpoints, distinct values/depths and delayed scenarios not present in these tests. TC-P02-10 opens a profile rather than exercising comparison semantics; Phase 01 tests provide separate coverage.

## Handoff

Complete `docs/antigravity-core-phase-02-corrections.md`. Keep changes focused on the original Phase 02 scope. Strengthen acceptance checks with distinct dataset results and controlled completion order, using actual schemas. Record backend behavioral and real-data checks honestly as blocked/not run if their dependencies are unavailable. Preserve all accepted Phase 01 work and the authorized screenshot deletion.
