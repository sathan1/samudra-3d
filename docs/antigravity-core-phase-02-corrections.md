# Antigravity core phase 02: complete transition and request ownership

Work in `D:\Samudra 3D\samudra-3d`. Read `docs/antigravity-core-phase-02-review.md` and the original Phase 02 instructions. Complete the remaining Phase 02 requirements, update the report and stop for review. Do not begin Phase 03, redesign pages or add unrelated features.

## Efficient execution

Keep the original phase's speed guidance: targeted reads, one shared design, independent checks batched when safe, installed dependencies reused, one final build/preview regression pass after edits. First map every review finding to an implementation change and an assertion; this avoids further rounds caused by omitted requirements. Use controlled response gates and backend-faithful fixtures from the start. Preserve existing work, Phase 01 tests, datasets, auth and `frontend/test-backside.png` deletion. Do not weaken assertions, silently skip cases or rewrite unrelated documentation to save time.

## Corrections

1. **Unify and guard the full dataset transition.** Serialize backend selection mutations (or otherwise reconcile actual final backend identity) and await selection plus metadata reconciliation before declaring success. Include startup/already-active/auto-selected paths. Pause playback and gate scientific requests until confirmed identity and valid controls are ready. Guard metadata and transition results by request ownership; metadata failure needs a visible recoverable state, not console-only fallback. Do not keep old controls/data under a newly published dataset label. Reconcile requested depth, supported variables and time with actual metadata; derive displayed timestamp from the final chosen index, not always index zero.
2. **Complete cache lifecycle.** Synchronize cache identity with confirmed startup metadata/registry, including an already-active non-GLORYS dataset. Ensure null dataset arguments cannot erase the fallback cache identity. Capture dataset generation when starting requests, validate it before cache writes and state updates, and invalidate old entries/requests on transitions. Audit point/profile/slice/region/availability/volume paths. Revisiting A after A→B must not reuse a late stale A-generation response. Use the existing helpers rather than merely adding unused counters.
3. **Finish dynamic controls.** Consume available-variable metadata; enable only supported canonical workflows with clear unavailable states. Do not preserve unsupported currents unconditionally. Remove hardcoded `/8` from the scientific HUD and use actual metadata counts. Empty/missing metadata disables scientific controls and requests until recovery. Retain accurate requested/resolved depth presentation and verify a non-exact requested depth snaps correctly.
4. **Derived views share confirmed context.** Pass dataset identity, metadata coverage and selected time to thermal fronts; refetch on same-time dataset changes. Guard front success/error/loading and invalidate on close; clear/mark old data during refresh and show errors. Physics must also invalidate pending work on close/context change. Fix preset handling so selecting a preset cannot be followed by a request for stale `initialCoords`; avoid duplicate automatic/direct requests. Respect real backend contracts: process-wide registry ownership can be used with a coherent transition gate; do not claim unsupported `dataset_id` query parameters scope endpoints that ignore them.
5. **Invalidate point/model work consistently.** Closing/deselecting a point and changing its location/date/dataset must invalidate old probe work, including success/error/finalization. During refresh clear or explicitly label the old point/model data; an open CTD must refresh or visibly become unavailable, never silently remain at the old date/dataset. Preserve observed-platform profiles and their timestamp semantics.

## Required focused acceptance coverage

Strengthen `frontend/tests/core-phase-02.spec.js` around these cases, preserving prior checks:

- Startup already-active non-default dataset and GLORYS auto-selection: confirmed cache identity, actual metadata and supported controls.
- A→B with different bounds, depth levels, time counts, supported variables and clearly different point/slice/volume values. Assert rendered/result ownership, not just a label or request count.
- Controlled late A scientific/cache response, B response first, then late A; verify B stays correct and revisiting A does not reuse obsolete generation data. Include volume with default/null dataset argument.
- Rapid A→B→A selection/metadata completion using response gates: verify final backend identity, UI metadata, arrays and controls agree. If switches are deliberately serialized, assert serialization and final requested choice instead of pretending requests are concurrent.
- Selection success followed by metadata failure: visible recoverable transition state and no requests using unsupported old controls; test recovery.
- Advance time/playback while a point and model CTD are open: assert current profile timestamp and distinct values. Close point during a delayed probe and release it; no restored state.
- Open fronts/physics then change dataset/date/coordinates; verify actual coverage/time context, delayed-old-result rejection and errors. Select a physics preset different from `initialCoords` and assert final result belongs to the preset.
- Non-exact requested depth resolves to the backend-selected depth with both values displayed. Unsupported variable choices are unavailable.

Use actual `/api/metadata`, dataset and scientific schemas. Assert fixture premises (fleet/data loaded, metadata identity, request started) explicitly. The reviewed report's invented `/api/datasets/metadata/*` verification must be corrected.

## Backend changes and final checks

The thermal-front backend changes need targeted behavioral verification that requested time reaches the adapter and changes the returned field/front calculation. Existing backend tests may use unittest; inspect their runner instead of assuming pytest is mandatory. Host Python currently lacks netCDF4 and pytest. If a configured environment is available use it; otherwise record the exact dependency blocker and design focused tests for execution there. Do not treat compilation as behavioral verification or install unrelated packages silently.

After the final edits run in `frontend`:

- `npm.cmd run lint`
- `npm.cmd run build`
- `npx.cmd playwright test tests/core-phase-01.spec.js tests/core-phase-01-contract-review.spec.js tests/core-phase-02.spec.js`

Run relevant backend checks where dependencies permit. Update `docs/antigravity-core-phase-02-report.md` with READY FOR REVIEW/PARTIAL/BLOCKED, exact results/counts, real-vs-fixture evidence, honest acceptance coverage, remaining blockers and transition/cache ownership design. Screenshots go under `docs/evidence/core-phase-02/`. Do not declare all requirements complete when required assertions or behaviors remain absent.

Stop and ask the user to send `ready for review` to Codex. No commit, push, deployment, authentication change or dataset deletion is authorized.
