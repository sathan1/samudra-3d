# Core phase 01: bounded final correction and verification pass

Work in `D:\Samudra 3D\samudra-3d`. Read `docs/antigravity-core-phase-01-review-03.md` and the existing phase instructions. Preserve the current implementation and all passing tests. Complete only the three outstanding review items, update the report, then stop. Do not start phase 02 or redesign the UI.

## Tasks

1. Remove ID-prefix-based platform dispatch in the modified profile/drawer/comparison flows. Resolve explicit `platform_type`/`type`/context type from authoritative list/detail records, carry the type into loading/retry descriptors and reject unresolved/unsupported types with a clear state. Do not change backend contracts. Verify an Argo whose ID begins with GLIDER still uses the Argo endpoints, and a glider with another ID spelling uses glider endpoints. Preserve QC and actual profile shape.

2. Replace or extend TC-P01-11 with genuine out-of-order collocation tests. Use controlled response gates and request-start events rather than only arbitrary sleeps. Exercise platform dropdown and linear/nearest strategy changes while requests are pending; return different metrics for each request, release the newer response first and old response last, and prove old results/errors/finalization cannot change the final target, strategy, metrics or loading state. Also close with a collocation request in flight and verify it cannot affect a later reopened target. Keep parameter-switch coverage, but describe it accurately.

3. Complete the remaining narrow verification gaps: invoke failed-detail retry and assert recovery; verify all-null model columns and absent model metadata show unavailable/unknown rather than invented data; exercise negative and zero Pearson results along with zero variance and insufficient pairs. Use fixture-backed checks and make their nature explicit. Correct report/test titles that claim scenarios the test bodies do not exercise. Mark real-data smoke checks NOT RUN unless actually performed, and remove unsupported claims that the real backend pipeline was verified operational.

## Deliverables

- Run `npm.cmd run lint`, `npm.cmd run build`, and `npx.cmd playwright test tests/core-phase-01.spec.js` from `frontend`.
- Update `docs/antigravity-core-phase-01-report.md` with actual changed files, exact test count/outcomes and remaining limitations. Provide READY FOR REVIEW status; do not claim reviewer approval.
- Keep evidence under `docs/evidence/core-phase-01/` and preserve existing Antigravity/Codex review files.
- Leave datasets, authentication, Git configuration, deployment configuration and unrelated code alone. The deletion of `frontend/test-backside.png` was an authorized cleanup and must remain intact.
- End with the report path and ask the user to send `ready for review` to Codex.
