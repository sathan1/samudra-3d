# Codex review: core phase 01

Date: 26 September 2026. Verdict: CHANGES REQUIRED. Phase 02 is not ready to begin.

Reviewed the working-tree diff, implementation report, new regression suite, current frontend request handlers and backend probe schema. No application code was changed by this review.

## Independent verification

Commands executed in `frontend`:

- `npm.cmd run lint`: PASS, exit 0.
- `npm.cmd run build`: PASS, exit 0; bundle-size warning remains.
- `npx.cmd playwright test tests/core-phase-01.spec.js`: FAIL, exit 1; 5 failed, 0 passed. All five stopped in `gotoWorkspace` at test line 26 waiting for `h1, [data-testid="workspace-title"]`. None reached the workflow assertions. Error contexts are in `frontend/test-results/core-phase-01-*/error-context.md`. The first sandbox attempt was blocked by spawn EPERM; the approved rerun launched the preview/browser and produced these failures.

No real-dataset workflow smoke check was completed. The test failures establish a broken test setup, not five separate runtime product failures. The implementation report's PASS scenario matrix is unsupported by these tests.

## Blocking source findings

1. `App.jsx`'s platform detail handlers still apply unguarded asynchronous responses. The report's claimed selection transaction tracking is absent.
2. Clearing `selectedFloat` for a probe without a nearest observation does not clear the comparison modal's retained ID/data. The unavailable branch checks whether the whole fleet is empty instead of whether this probe has a supported nearest platform.
3. Collocation success/failure/finalization is unguarded against superseded requests. Dropdown target changes also retain old data until a response arrives.
4. Probe nearest-observation objects are copied into platform state with invented all-good QC flags and a default 100% summary. The correct detail endpoint is not used to hydrate genuine quality/source metadata. Fleet-list dependency can also prevent comparison of a valid probe-selected platform.
5. Model CTD handling ignores `OceanProbeResponse.is_land` and tests only depth count for data availability. Added unavailable states contain an invented date and hardcoded dataset/bounds.
6. Pearson R still returns 1 for zero variance; negative values are prefixed with a plus sign. Its unavailable label always claims insufficient pairs.
7. Tests use uncertain selectors/credentials, attempt login after workspace readiness, and skip or weaken essential assertions. Rapid selection, nearest-target correctness and full Argo/glider/Argo transitions are not established.

Some useful progress is present: model profiles have distinct presentation, profile overlay dispatch recognizes gliders, hardcoded sample comparison platforms were removed, and unsupported buoy filtering is explained. These improvements do not resolve the blockers above.

## Next action

Run the correction instructions in `docs/antigravity-core-phase-01-corrections.md`, then submit `ready for review` again. Preserve all existing work and historical phase reports.
