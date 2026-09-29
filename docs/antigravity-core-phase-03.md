# Core Phase 03: accurate scientific labels and operational results

Work in `D:\Samudra 3D\samudra-3d`. Read `docs/antigravity-core-phase-02-review-final.md` and the relevant sections of `docs/frontend-redesign-functional-map.md`. Phase 01/02 frontend work is accepted within its documented fixture verification limits. Preserve it, login/register, all regressions and datasets. This is a bounded correctness phase before deciding additional demonstration features and the Lovable redesign.

## Scope and source pointers

Inspect `LocationInspector.jsx`, `Header.jsx`, `FishermanModeModal.jsx`, `CycloneModeModal.jsx`, their App props, and corresponding backend response schemas. Read only relevant dataset/probe/front metadata definitions and existing mock helpers. Confirm actual current code before changing older map findings.

1. **Dataset/source/resolution labels.** LocationInspector currently unconditionally says REAL, defaults to COPERNICUS, and shows 8.3 km regardless of selected dataset. Derive labels from confirmed dataset metadata and actual response provenance where available. Distinguish real local, synthetic/demo, unavailable remote, and unknown. Do not equate catalog availability or REAL_LOCAL with a live feed. Unknown resolution/source must be unavailable/unknown, not a GLORYS fallback. Prefer response identity/provenance when it conflicts with a descriptor and show a clear inconsistency/unavailable state. Keep labels consistent in header, inspector and operational notices. Preserve historical timestamps instead of describing historical data as live.
2. **Missing vs valid zero metrics.** Inspect SST, MLD, D20/D26, TCHP and displayed classifications in inspector/cyclone/fisherman views. Use finite-number checks, preserving genuine zero values. Missing/null/nonfinite metrics show unavailable with no fabricated zero, risk class, success checkmark or confident outcome. Backend-derived classifications may be displayed when their required inputs and provenance exist; preserve computation contracts and units rather than inventing scientific thresholds.
3. **Harbor conditions.** Preserve harbor names/coordinates and focus actions. Remove hardcoded SST/MLD/PFZ condition claims as current scientific results. Either obtain them through an existing supported query with context/ownership guards, or display conditions unavailable and identify the harbor catalog as static reference locations. Do not add external integrations just to populate these cards.
4. **Thermal-front and cyclone descriptions.** Clearly identify active-model-derived fronts and heuristic PFZ score. Do not label a gradient-based score as calibrated probability/confidence or an official MoES/INCOIS bulletin. Preserve existing backend fields/contracts; change presentation labels and remove unsupported authority/live-service claims. Cyclone views must accurately describe existing model-derived column metrics and must not promise official track correlation, prediction, landfall, or live forecasts where no such implementation exists. Match menus/tooltips to actual implemented behavior. Keep explanatory text brief.

## Acceptance and focused verification

Add `frontend/tests/core-phase-03.spec.js` with faithful fixtures and observable results:

- Two different dataset sources/resolutions produce correct distinct inspector/header/operational labels, and a synthetic dataset never displays REAL or the other dataset's resolution. Missing provenance/resolution yields an explicit unknown state.
- Historical model timestamps remain historical. No live/offical-feed claim is introduced for fixture data.
- Null/missing metric fixtures yield unavailable values and no derived risk/confidence classification. Zero and finite positive metric fixtures render valid numbers with correct units. Test actual visible results rather than helper-only mirrors of implementation.
- Harbor cards contain coordinates/focus behavior but no hardcoded current SST/MLD/PFZ values; or validate an existing genuinely queried path if implemented.
- Thermal fronts keep real computed gradient/SST values but label PFZ as heuristic, without official bulletin/confidence claims. Preserve selected time/dataset context and readiness gates.
- Existing profile/comparison contracts and Phase 02 recovery/result guards remain passing.

Run targeted new tests during development, then one final lint/build, `node --test tests/transitionQueue.test.js`, and `npx.cmd playwright test tests/core-phase-01.spec.js tests/core-phase-01-contract-review.spec.js tests/core-phase-02.spec.js tests/core-phase-02-identity-review.spec.js tests/core-phase-03.spec.js`. Do not claim backend/live data verification from fixtures. Run backend checks only if a suitable existing environment is available; otherwise retain NOT RUN with the exact prerequisite. No dependency installation or deployment is required.

## Work efficiently and stop condition

Create a small shared metadata/value presentation helper only if multiple consumers need it; implement each rule once. Reuse current schemas and test fixtures. Batch independent reads/checks, avoid full-repo rereads, reuse dependencies and perform one final verification set after edits. No queue rewrites, auth changes, redesign, new forecast engines, optional anomaly controls, external feeds, Git mutations, dataset deletion or unrelated cleanup.

Write `docs/antigravity-core-phase-03-report.md` with changed files, before/after findings, exact tests/commands/results, fixture vs live verification, and unresolved items. Include a compact remaining-feature list classified as implemented, demonstration candidate, or deferred; do not implement that list in this phase. Stop for Codex review and ask the user to send `ready for review`. Do not start Lovable or the next phase.
