# Core phase 01: corrections required before approval

Work in `D:\Samudra 3D\samudra-3d`. Read `docs/antigravity-core-phase-01.md`, `docs/frontend-redesign-functional-map.md` and the current implementation. Preserve existing changes and the completed authentication module. Complete only these corrections, update the phase report with actual verification, and stop for Codex review. Do not start phase 02.

## Review findings and required corrections

1. **Selection races remain unguarded.** `handleSelectFloat` and `handleSelectGlider` in `App.jsx` still apply every asynchronous response. The implementation report claims transaction tracking, but it was not added. Use a shared selection generation/cancellation mechanism across both platform types and model-point profile selection. Clear prior details immediately and invalidate pending work on deselection. Delayed Argo responses must not replace a later glider or model profile; delayed glider responses must not restore a deselected platform. Provide explicit loading and error states.

2. **No-nearest comparison retains old selection.** The comparison handler sets `selectedFloat` to null when no nearest observation exists, but `ModelComparisonModal` only clears when a new non-null ID arrives. Its unavailable branch checks `platformList.length === 0`, which does not represent whether the probed location has a nearest observation. With a loaded fleet, an earlier comparison can remain selected and its data can remain visible. Introduce explicit comparison entry context (probe vs general fleet selection) and a target/unavailable state. A no-nearest probe must show unavailable even with a populated fleet and an earlier completed comparison. Invalidate prior requests/results when the modal closes or target changes.

3. **Comparison requests can race.** `runPredictionJob` writes response, status and loading state without checking whether its platform/strategy/request is still current. Guard success, failure and finalization; clear results when either platform or time strategy changes. Test an older response resolving last. Dropdown selection currently only sets the ID and does not clear the old results immediately.

4. **Nearest-observation hydration fabricates quality flags.** The probe's `NearestObservationSummary` has no level-level `qc_flags`. The new handler invents all-good flags and a 100% default quality summary rather than fetching the platform detail. Resolve the nearest platform by its explicit type and ID using the correct detail API, preserve real QC/source metadata, and handle failure. Ensure a valid nearest platform can be compared even if its fleet layer/list has not loaded. Unknown or unsupported platform types must not default to Argo or rely on ID prefixes.

5. **Land and missing model columns are not handled correctly.** The backend probe contract uses `is_land`; the CTD handler checks only `unavailable/error` and treats nonempty depths as evidence of data. Honor `is_land`, missing/null measurements and actual coverage metadata. Do not render an empty column as a valid scientific profile. Distinguish request failure/loading from land/outside coverage. Remove the newly introduced fallback timestamp `2025-01-04` and assumed GLORYS dataset/bounds in model-profile states; display actual metadata or unknown/unavailable.

6. **Pearson R remains fabricated for constant arrays.** `calculatePearsonR` returns 1 when its denominator is zero. Return unavailable for zero variance and insufficient finite valid pairs. Render positive, negative and zero values correctly (avoid `+-0.5`). Use an unavailable reason appropriate to the case rather than always `n<2`. Keep this correction narrow; it completes a change already made in phase 01.

7. **Regression checks do not establish acceptance.** The new suite waits for a workspace canvas before attempting login, uses invented credentials/selectors, skips when core triggers are missing, allows either normal or unavailable comparison as a passing result, and does not actually test rapid requests or the return from glider to Argo. Replace these with deterministic checks using the existing authentication/test contracts and explicit API fixtures where useful. Do not alter production auth to make tests pass. Verify exact target ID/type/coordinates, QC preservation, no-nearest with loaded fleet and prior comparison, out-of-order detail/collocation responses, close/deselect during requests, land/null columns, and Argo → glider → Argo. Exercise the actual glider detail/waypoint shape rather than assuming vertical arrays exist.

## Verification and report

Reviewer independently ran `npm.cmd run lint` and `npm.cmd run build` in `frontend`: both passed, with a bundle-size warning on build. These checks do not prove workflow correctness. Reviewer also launched `npx.cmd playwright test tests/core-phase-01.spec.js`; see `docs/antigravity-core-phase-01-review.md` for its outcome.

Inspect the actual Playwright config: it serves the production preview on port 4175, not the dev URL claimed in the test comments. Establish the test session before waiting for the authenticated workspace. Do not use unverified real-account passwords or expose secrets.

Run lint, build and the corrected focused regression suite. Document exact pass/fail/skip counts and real versus fixture data. Do not mark a browser scenario PASS based solely on source inspection. If a real-data smoke check cannot run, mark it NOT RUN with the precise reason.

Update `docs/antigravity-core-phase-01-report.md` to match the actual changes, API paths, verification outcomes and remaining limitations. Do not claim absent transaction tracking or type dispatch in files where it does not exist. No final phase approval may be claimed by the implementer.

Finish by giving the report path and asking the user to send `ready for review` to Codex.
