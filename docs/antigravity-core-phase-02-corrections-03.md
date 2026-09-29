# Phase 02: final readiness and identity guards

Read `docs/antigravity-core-phase-02-review-03.md`. Work in `D:\Samudra 3D\samudra-3d`. Preserve accepted work and tests. Complete only the remaining dataset consistency requirements and stop for review.

## Implementation

1. Resolve scientific readiness from confirmed valid metadata, matching registry/dataset identity, no pending transition and no transition error. Begin startup unready. Mismatched identity must throw/show a recoverable failure instead of logging and continuing. Missing/empty required metadata remains unready. Preserve the correct pending-target retry logic. On failure do not re-enable scientific controls using old metadata against a newly selected backend.
2. Thread the ready/unready context through every relevant request/view: scalar, current particles, volume, probe/model CTD, physics and thermal fronts. Cancel/invalidate work when readiness is lost; suppress new requests and clear or visibly mark old results until the confirmed context returns. Do not gate only one OceanCanvas effect. Preserve observed-platform record selection, but ensure model comparison results cannot silently represent an invalid dataset transition.
3. Serialize all coordinator mutations, including startup, modal and retry callers, with one queue/mutex or equivalent explicit policy. A UI button lock alone is insufficient. Frontend generation guards cannot undo a late backend mutation. Await/reconcile final backend and metadata identity before publishing success. Avoid duplicate selection calls in retry/startup when the intended target is already confirmed active.

## Verification that must demonstrate the fix

- Make `frontend/tests/core-phase-02-identity-review.spec.js` pass; preserve its assertion that A registry with B metadata produces an error and disabled controls. Keep it as a regression or merge it faithfully into the main suite.
- Hold startup/catalog/metadata requests with response gates and assert no scientific requests start until valid context exists.
- Select B successfully, fail B metadata, close the dataset modal: timeline/depth/variable controls and scientific views remain unavailable until recovery. Retry must recover B identity, controls and result values.
- Hold metadata pending during a switch while opening a derived view/volume or attempting scientific interactions: no requests use stale context. Release late responses and assert they cannot restore old arrays or clear the new error/loading state.
- Test coordinator serialization across genuinely overlapping intents/startup/retry using controlled gates, asserting backend mutation order and final identity. Do not name a sequential switch test as out-of-order coverage.
- Retain distinct dataset values, faithful schemas, same-bounds front updates, CTD synchronization and accepted Phase 01 behavior. Use actual result/state assertions instead of only mock-route call counts.

Use targeted reads and a single shared readiness predicate; implement the lifecycle once and wire all consumers. Batch independent checks, reuse dependencies and run a single final build/browser set after edits. No unrelated features, auth changes, deployment, Git resets or dataset deletions.

Run from `frontend`: `npm.cmd run lint`, `npm.cmd run build`, and `npx.cmd playwright test tests/core-phase-01.spec.js tests/core-phase-01-contract-review.spec.js tests/core-phase-02.spec.js tests/core-phase-02-identity-review.spec.js`. If merging the review test, document its new location and adjust paths.

Update `docs/antigravity-core-phase-02-report.md` with actual results and limitations. Correct false `dataset_id` query-scoping claims: the backend registry is process-wide, so coordination/gating is the implemented isolation policy. Backend/real-NetCDF checks remain NOT RUN unless actually executed in a suitable environment. Stop and ask the user to send `ready for review` to Codex. Phase 03 remains pending.
