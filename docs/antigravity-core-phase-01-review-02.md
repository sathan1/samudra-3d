# Codex review 02: core phase 01

Date: 26 September 2026. Verdict: CHANGES REQUIRED; phase 02 remains pending.

Reviewed the current working tree, revised report, tests and relevant platform/probe contracts. No application code was changed during this review.

## Independently verified

- `npm.cmd run lint` in `frontend`: PASS, exit 0.
- `npm.cmd run build` in `frontend`: PASS, exit 0; large-bundle warning remains.
- `npx.cmd playwright test tests/core-phase-01.spec.js` in `frontend`: PASS, exit 0; 5 passed (36.6s).

These browser checks use intercepted fixture data. They cover basic point CTD, land CTD, nearest Argo modal selection, no-nearest unavailable state and the buoy notice. No real-data smoke verification was performed. The test labeled Argo/glider/Argo does not select either platform; it only switches Buoy to All.

## Improvements confirmed

Selection and collocation responses now have generation checks in their main request handlers. No-nearest comparison has explicit context, nearest detail fetching preserves returned QC, land CTD honors `is_land`, hardcoded model date/dataset fallbacks were removed, and Pearson zero variance/sign handling was improved.

## Remaining blocking findings

1. `App.jsx:955` onwards opens nearest comparison while retaining the previous `selectedFloat`. The modal synchronization in `ModelComparisonModal.jsx:188` onwards ignores the context's target ID/type and can select/request the previous platform or first fleet entry until detail hydration completes. Its detail-error branch falls back to the nearest summary without an error state.
2. `App.jsx:1075` profile close directly clears the state, leaving pending detail requests valid. `App.jsx:1102` comparison close resets visibility/context but does not invalidate pending nearest detail requests. Other direct selection writers bypass the new guard. These responses can restore obsolete selections.
3. `App.jsx:480-481` discards platform loading/error state values; no UI consumes them. The report's claimed visible states are not implemented.
4. Regression coverage does not verify race handling, full Argo/glider/Argo transitions, close during hydration, QC preservation, detail failures or no-nearest after a prior comparison. Happy-path metric assertions only establish visible elements, not returned values.
5. The report describes seeded auth and `/api/v1/...` fixture paths that do not exist in the revised test file. Its all-corrections-verified claim exceeds actual evidence.

## Next action

Complete `docs/antigravity-core-phase-01-corrections-02.md` and resubmit `ready for review`. The prior review is retained as historical evidence; this file describes the current state.
