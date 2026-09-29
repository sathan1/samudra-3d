# Core phase 01: second correction pass

Work in `D:\Samudra 3D\samudra-3d`. Read the original phase instructions and `docs/antigravity-core-phase-01-review-02.md`. Preserve the current changes and authentication implementation. Complete this bounded correction pass, verify it, update the implementation report, and stop for Codex review. Do not start phase 02.

## Remaining corrections

1. **Use the requested comparison target immediately.** Probe comparison opens before fetching the nearest platform detail, retaining the previously selected platform. The modal ignores `comparisonContext.platformId/platformType` and chooses from `selectedFloat` or the first fleet item. Make the comparison target independent of the previously selected profile. While target detail loads, show loading for that target and do not issue a collocation request for another platform. On detail failure show an error/retry state instead of silently substituting the probe summary. Clear stale details when entering this flow. Dispatch from explicit platform type, removing the `startsWith('GLIDER')` fallback for unknown types.

2. **Complete selection request invalidation.** The profile close callback directly calls `setSelectedFloat(null)` instead of invalidating the selection generation. Closing a summary profile during its detail request can restore that selection later. Comparison close also does not invalidate pending nearest-detail hydration. Route close/deselect actions through centralized guarded handlers. Audit the other direct `setSelectedFloat` writers (assistant navigation, anomaly selection, sensor registration and dataset change) so older detail requests cannot overwrite newer selections. Ensure Argo selection clears obsolete glider selection too. Model-point selection must participate in the same invalidation mechanism.

3. **Render actual platform loading/error states.** `const [, setIsPlatformLoading]` and `const [, setPlatformLoadError]` discard the state values; nothing displays them. Read and render these states in the profile/nearest-comparison flows, with close and retry controls. Failed detail loading must not leave a misleading empty-profile or permanently loading view. Clear/guard these states on every target change and close.

4. **Expand the focused regression checks to the remaining acceptance cases.** Keep the five passing tests, but add deterministic coverage for:
   - Select Argo, then glider, then Argo using actual detail shapes, asserting identity, correct endpoint type, charts and preserved bad QC levels.
   - Delay Argo and glider details so older responses resolve last, and verify final target ownership.
   - Close/deselect a profile while detail loading, then release the response; verify no restored selection or reopened modal.
   - Start from an earlier selected platform, probe a different nearest platform, delay its detail response, and assert no collocation request for the old platform or first fleet entry.
   - Close nearest comparison during hydration, then release the response; verify no restored selection.
   - Delay collocation responses across dropdown/strategy changes and close; verify old data/error/loading never replace current results.
   - Complete a comparison, then probe a point without a nearest observation with fleet actually loaded; assert unavailable and no reused result/request.
   - Detail API failure with visible error/retry, all-null model column, absent metadata, and Pearson zero variance/negative/zero values.

   The current TC-P01-05 title claims Argo/glider transitions but its body only selects Buoy and All. Implement those transitions or rename it and add dedicated tests. TC-P01-03 currently checks that metric elements are visible; assert actual expected values, target identity and observation timestamp instead. Explicitly load/assert the fleet for tests whose premise requires it. Distinguish fixture data from real dataset verification.

5. **Make the report accurate.** The current report claims seeded authentication and `/api/v1/...` interception, but the current tests contain neither seeded auth nor these URLs; they use `/api/...` contracts. It also claims discarded loading/error state is displayed and that all corrections are verified despite absent race/transition checks. Update the report from actual source and command results. Record real-data smoke checks as NOT RUN if unavailable, rather than claiming no limitations.

## Verification and handoff

Run `npm.cmd run lint`, `npm.cmd run build` and `npx.cmd playwright test tests/core-phase-01.spec.js` from `frontend`. Update `docs/antigravity-core-phase-01-report.md` with exact counts, evidence, remaining limitations and changes. Capture useful evidence under `docs/evidence/core-phase-01/`. No application auth change, deployment, commit, dataset deletion or unrelated redesign is authorized by this file.

The reviewer verified the current five fixture-backed tests pass, along with build/lint; preserve that progress. A passing happy-path suite does not replace checks for the remaining request races and target errors.

Stop after this correction pass and ask the user to send `ready for review` to Codex.
