# Codex review 04: core phase 01

Date: 27 September 2026. Verdict: one reproduced blocking defect remains. Do not start phase 02 yet.

Independent verification in `frontend`:

- `npm.cmd run lint`: PASS, exit 0.
- `npm.cmd run build`: PASS, exit 0; existing bundle-size warning.
- `npx.cmd playwright test tests/core-phase-01.spec.js`: PASS, exit 0; 16 passed (49.6s).
- Contract variant comparison: `npx.cmd playwright test tests/core-phase-01.spec.js tests/core-phase-01-contract-review.spec.js --grep TC-P01-15`: FAIL, exit 1; original dispatch fixture passed, backend-shaped glider fixture failed (1 passed, 1 failed, 21.9s).

## Reproduced bug: glider detail with depth arrays routes to Argo comparison

The backend's `GliderTransectDetail` in `backend/app/schemas/insitu.py` includes `platform_type: glider`, `depths`, `temperature`, `salinity`, `qc_flags`, `qc_summary` and `waypoints`. The submitted dispatch fixture omitted the glider depth arrays.

`ModelComparisonModal.jsx` independently sets `isGlider` from glider metadata/waypoints and `isArgo` from the presence of `selectedFloat.depths`. A genuine glider detail therefore sets both flags. The branch `else if (isArgo)` then sends it to `fetchProfileCollocation`, which is the Argo endpoint.

The reviewer cloned TC-P01-15 and added only `[10, 40]` depths, matching temperature/salinity arrays and QC fields to the glider detail fixture. The revised test hydrated the glider but failed waiting for its glider collocation request; the original test passed. The original failure was at `gliderCollocRequested` after 5 seconds. Error context: `frontend/test-results/core-phase-01-contract-rev-d24e6-dless-of-ID-spelling-prefix/error-context.md`.

The reproducible variant is retained in `frontend/tests/core-phase-01-contract-review.spec.js`, compacted after execution to keep only the common setup and this dispatch scenario. No application source was changed by the reviewer.

## Required correction

Resolve one authoritative platform type, giving explicit type metadata precedence over payload shape. Depth arrays cannot imply Argo when explicit metadata says glider. Use shape inference only for genuinely absent type metadata and do not silently override unsupported types. Update glider regression fixtures to represent real detail contracts; assert the wrong endpoint was never called.

The other final-pass improvements and tests are accepted as progress. Do not reopen them or expand scope. A minor reporting limitation remains: TC-P01-11's final close occurs after its controlled gates have already been released, so do not claim that step proves close with pending collocation. Retain the implemented close guard and describe the actual evidence accurately.

Real-data smoke verification remains NOT RUN. Next instructions: `docs/antigravity-core-phase-01-corrections-04.md`.
