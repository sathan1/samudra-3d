# Phase 02 focused verification completion

Read `docs/antigravity-core-phase-02-review-04.md` and complete only its remaining gaps. Work in `D:\Samudra 3D\samudra-3d`; preserve accepted Phase 01 behavior, current readiness guards, queue, login/register, and all existing regressions. Stop for Codex review.

## Required work

1. In App's metadata validation require a nonempty dataset identity matching the confirmed target before publishing readiness. Missing identity must show recoverable error and leave scientific controls blocked. Extend the identity-review spec with this case.
2. Add controlled-response tests, using reusable gates rather than arbitrary sleeps:
   - Hold startup metadata. Assert timeline/depth controls are unavailable and scalar/current/volume/probe/physics/front/model-comparison requests do not start against an unconfirmed context. Release valid metadata and assert recovery with actual context/results.
   - Select B successfully, fail its metadata, close the modal, and assert controls remain unavailable and scientific requests remain suppressed. Retry B; assert confirmed B metadata and distinct B result values.
   - Hold switch metadata and an older scientific response. Attempt derived/volume interactions while unready; assert no stale-context work starts. Release the old response and demonstrate it cannot restore results or overwrite failure/loading state. Add request ownership guards if the test exposes a defect.
   - Demonstrate the shared queue with genuinely overlapping coordinator intents and controlled completion gates. Prefer a focused coordinator unit test if disabled UI intentionally prevents a browser path. If extracting the coordinator for testing, retain production use of that same code; do not duplicate it in a test. Assert execution order, no simultaneous backend selection mutations, and final confirmed identity. Rename existing sequential TC-P02-04 honestly.
3. Correct the report's false dataset query-scoping claims for physics/fronts. Explain that the process-wide registry plus serialized selection/readiness is the policy. Distinguish tested results, source inspection, and NOT RUN backend/live NetCDF checks. No blanket completion claim until the required scenarios actually run.

## Work efficiently

Read the coordinator, existing phase02 mock helpers, and readiness effects once. Reuse fixtures and a single deferred-response helper; implement each guard once. Do not repeat already passing feature work or add unrelated features. Run focused new tests while developing, then one final lint/build/regression set. Do not replace result assertions with route-count-only assertions, skip failing cases, or introduce sleeps to hide races.

From `frontend`, run `npm.cmd run lint`, `npm.cmd run build`, and `npx.cmd playwright test tests/core-phase-01.spec.js tests/core-phase-01-contract-review.spec.js tests/core-phase-02.spec.js tests/core-phase-02-identity-review.spec.js` plus any new coordinator test using its appropriate runner. Update `docs/antigravity-core-phase-02-report.md` with exact commands/results and limits. No dependency installations, unrelated cleanup, auth changes, Git mutations, deployment or dataset deletion. Stop and request `ready for review`.
