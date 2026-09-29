# Antigravity core phase 02: dataset, date and depth consistency

## Objective and boundaries

Work in `D:\Samudra 3D\samudra-3d`. Read `docs/frontend-redesign-functional-map.md` and the latest Phase 01 approval (`docs/antigravity-core-phase-01-review-final.md`). Preserve the accepted profile/comparison fixes and tests. Complete this phase, verify it, write its report, and stop for Codex review.

Every scientific workspace view must use the confirmed active dataset and selected model date/depth. Dataset changes must refresh metadata and invalidate old results. This phase does not redesign pages, add datasets or missing operational features, change authentication, or alter scientific formulas. Historical phases 01–15 and their reports remain untouched.

## Work efficiently without weakening verification

- Read the named source files and their direct dependencies first; avoid repeatedly exploring the whole repository or rewriting old documentation.
- Record initial `git status --short`. Make a compact checklist of the acceptance cases below before editing. Trace API contracts and shared state once, then implement related changes together.
- Use existing helpers (`clearClientCache`, metadata services, request guards) where appropriate. Choose a simple coherent state flow rather than adding competing copies of date/depth/dataset state.
- Batch independent file reads/searches and independent lint/backend checks where safe. Keep edits, dataset mutations, builds and preview tests sequential when they share artifacts or state. Do not run two preview suites on port 4175 at once.
- Use installed dependencies; do not reinstall packages or run the root build unnecessarily. During development run only checks relevant to the latest change; after the final edit run one complete final verification set. Rerun only after changes or failures warrant it.
- Use actual backend-shaped fixtures, contrasting values for two datasets and controlled request gates. Do not shorten testing by weakening assertions, skipping required flows, using invented schema fields, or claiming source inspection as a browser pass.
- Capture screenshots only where useful for review, not after every click. Write one concise final report with commands and evidence; do not create repeated drafts or reconstruct unrelated phase history.
- If genuinely blocked, finish independent work and state the exact blocker rather than silently expanding scope. Do not sacrifice correctness to meet an arbitrary time limit.

## Entry points and confirmed issues

Inspect `frontend/src/App.jsx`, `frontend/src/services/api.js`, `DatasetManagerModal.jsx`, `OceanCanvas.jsx`, `BottomControlBar.jsx`, `VerticalDepthBar.jsx`, `LocationInspector.jsx`, `InDepthOceanModal.jsx`, and `FishermanModeModal.jsx`, following their actual dependencies.

- Startup GLORYS auto-selection currently returns before fetching metadata.
- Dataset switch currently changes the descriptor and refreshes a probe without fully refreshing date/depth/variable choices.
- Several client cache keys omit dataset identity. Clearing cache alone is insufficient if an older request can repopulate it after a switch.
- Some scalar/render effects do not refetch when dataset identity changes.
- Probe results do not consistently refresh during playback, and point requests can resolve out of order.
- Physics requests use `time_idx: 0`; thermal fronts omit workspace time and use fixed bounds.

Confirm each condition in the current source. Read backend metadata/dataset/ocean schemas and routes before changing assumptions. The backend registry's dataset selection is process-wide; this phase must not pretend it becomes per-user.

## Required implementation

1. **One confirmed dataset transition flow.** Refresh metadata after initial selection, including auto-selection, and after each successful dataset switch. Confirm backend identity before showing a new descriptor as usable. Use request generations/cancellation and serialize or reconcile process-wide selection mutations so rapid switches cannot leave the frontend describing a dataset different from the backend's final active dataset. Do not rely only on suppressing a late UI response to solve out-of-order backend mutations. On failure show a clear state; do not mix a new label with old scientific arrays.
2. **Metadata drives controls.** Date choices, playback count, available depths, variable choices and coverage come from the active metadata. Preserve a selection only when valid in the new dataset; otherwise choose and explain a deterministic supported fallback. Clamp time indices safely, pause/reconcile playback during transitions and show the actual timestamp. Display backend-resolved slice depth distinctly from requested depth. No hardcoded eight-step timeline, GLORYS depth maximum or assumed dataset bounds in affected controls.
3. **Prevent cross-dataset cache/results.** Audit caches for slice, point, profile, region, volume and availability. Key by confirmed dataset identity/generation or invalidate comprehensively with generation-safe writes. Invalidate pending responses on a switch so earlier data cannot refill the new cache or renderer. Clear/reload stale overlays, volume data, point/model profile and derived analysis as appropriate; do not wipe unrelated account state or observation records. Keep metadata-fetch errors visible and scientific requests gated until selections are valid.
4. **Point/time synchronization.** Refresh the selected point on model date changes, including playback, and on dataset changes. Latest location/date/dataset owns the result, loading and errors. Clear or visibly mark old data during refresh; reopening CTD must use the current point/date. An already open model profile must refresh or be explicitly invalidated, rather than silently retaining obsolete data.
5. **Derived views use workspace context.** Pass confirmed dataset and main time index into physics and thermal-front workflows. Recompute open panels when relevant context changes; use actual coverage bounds for fronts. Respect backend-supported parameters and response provenance. Observation collocation still follows the observation timestamp, not playback time; do not change that scientific contract.

Backend changes should be limited to correctness gaps genuinely necessary for these flows (for example cache invalidation or supported context parameters). Preserve API compatibility where possible, and run relevant backend checks for any backend edit.

## Acceptance cases (build these before claiming completion)

| Case | Required observable result |
|---|---|
| Startup, already active dataset and auto-selected dataset | Both branches fetch metadata and expose actual choices; no early-return gap |
| Switch A to B with different depths/times/variables/bounds and distinct values | Controls, labels, arrays, point and volume all belong to B; unsupported old selections are reconciled |
| Same location/depth/time requested on A, then B | B cannot return A's cached values; a delayed A response cannot repopulate B's cache/view |
| Rapid A/B switches with out-of-order request completions | UI metadata and final backend active identity agree; stale mutations/responses do not leave mixed state |
| Switch or metadata request failure | Clear recoverable state; no falsely successful switch or invented choices |
| Advance/playback with a selected point and open model profile | Point/model profile show current timestamp and values, or an explicit refresh/unavailable state |
| Change locations rapidly, then date/dataset | Final context owns point data/loading/error, even if earlier responses resolve last |
| Open physics/fronts, then change date/dataset | Requests/results use current time and valid coverage; older derived responses ignored |
| Requested depth snaps to stored depth | Both requested and resolved depth are accurate; slider/range derives from metadata |
| Preserve observed comparison | Argo/glider routing and observation timestamp semantics retain Phase 01 behavior |

Add focused checks in `frontend/tests/core-phase-02.spec.js` using existing Playwright setup. Use faithful `/api/...` schema fixtures with distinct dataset identities and data; control completion order explicitly. Inspect the actual renderer/cache behavior, not just labels. Test unsupported/missing metadata instead of supplying invented defaults.

## Final verification and handoff

From `frontend`, run:

- `npm.cmd run lint`
- `npm.cmd run build`
- `npx.cmd playwright test tests/core-phase-01.spec.js tests/core-phase-01-contract-review.spec.js tests/core-phase-02.spec.js`

If the contract test has been merged and its duplicate intentionally removed, use the actual remaining suite paths and explain that in the report. Run relevant backend tests if backend code changes. Do not claim fixtures certify local NetCDF availability. Perform a bounded unmocked local smoke check if the backend/dataset is available; otherwise mark NOT RUN with the reason.

Create `docs/antigravity-core-phase-02-report.md` with READY FOR REVIEW/PARTIAL/BLOCKED status, initial workspace state, confirmed causes, changed files, selection reconciliation policy, cache/request ownership design, exact commands and counts, acceptance-case outcomes, evidence paths, real-vs-fixture verification and limitations. Keep screenshots under `docs/evidence/core-phase-02/`. Describe what was actually tested; no inferred PASS or absent implementation claims.

Preserve existing changes, scientific data, review files and the cleanup deletion of `frontend/test-backside.png`. Do not reset/clean Git, commit, push, deploy or expose secrets. Stop after phase 02 and ask the user to send `ready for review` to Codex. Phase 03 (scientific labels and remaining essential controls), demonstration feature selection and Lovable design follow later.
