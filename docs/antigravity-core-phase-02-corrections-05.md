# Phase 02: prove the remaining concurrency behavior

Read `docs/antigravity-core-phase-02-review-05.md`. Preserve current implementation and accepted regressions. This handoff is limited to completing verification honestly; change production behavior only if a focused test exposes a defect. Stop for Codex review.

## 1. Test the production queue with overlapping calls

`TC-ID-06` is another sequential UI switch test. It awaits B's completed timestamp before requesting A. Replace its concurrency claim with a real test of the production queue.

For a fast, dependency-free route, extract the existing promise-chain queue into a small reusable production module, have App use it, and exercise that same module with `node --test`. Do not copy queue code into a test. Keep the existing UI switch test under an accurate sequential name if useful.

Required test sequence:

1. Enqueue B, wait until its selection operation enters, then hold it with a deferred gate.
2. Enqueue A before releasing B. Record entry/completion events and active-operation count.
3. Assert A has not entered, and maximum simultaneous selection/metadata operations is one.
4. Release B selection but hold its metadata; A must still not enter. Release B metadata, then assert A enters and finally confirms A identity.
5. Add a first-operation failure case: the next queued operation still runs and recovers. No sleeps or duplicate test-only coordinator implementation.

The test must fail if production serialization is replaced with immediate execution. Verify this once using a temporary local mutation, restore the production implementation, and report the expected failure plus restored passing command. Do not retain the mutation.

## 2. Make the held-response assertions meaningful

Strengthen `TC-ID-05`: create explicit `oldRequestStarted`, `oldResponseCompleted` and switch-metadata-entered signals. Await the old request starting before switching. Release it while B metadata is held, await its completion/abort handling, then assert old timestamp/depth/result values remain absent and state remains blocked. After releasing B metadata, assert a distinct B data value or resolved result, not only the metadata badge. Use existing observable UI/state; add a narrowly scoped test seam only if necessary and never expose it as product UI.

Strengthen `TC-ID-04`: record scientific requests after failed B metadata, exercise a physics/front or volume interaction during the error, assert unavailable UI/no new scientific work, then retry and assert an actual distinct B result. `TC-ID-03` currently checks only ocean-data: describe that scope truthfully or extend it to the consumers claimed in the report. Reuse gates/fixtures. Do not add broad redundant tests.

## 3. Report accurately and verify once

Remove the false report statement that current `TC-ID-06` demonstrates overlapping transition calls. Current `TC-ID-05` does not assert stale values, so do not describe it as proving that until strengthened. Preserve the corrected process-wide-registry description. Backend behavior and live NetCDF remain NOT RUN unless actually exercised; no installation or deployment is needed for this handoff.

Run targeted new tests during development, then one final `npm.cmd run lint`, `npm.cmd run build`, `npx.cmd playwright test tests/core-phase-01.spec.js tests/core-phase-01-contract-review.spec.js tests/core-phase-02.spec.js tests/core-phase-02-identity-review.spec.js`, and the production queue test command if added. Update `docs/antigravity-core-phase-02-report.md` with exact results and coverage. Preserve login/register, scientific identity validation, queue policy, cleanup deletion, datasets and docs. No unrelated features, Git mutations, deployment or dependency installation. Stop for `ready for review`; Phase 03 remains pending.
