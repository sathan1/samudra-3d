# Phase 04: real local data verification and missing physics inputs

Read `docs/selected-features-plan.md`, `docs/antigravity-core-phase-03-review-final.md`, then the relevant source/tests below. Work in `D:\Samudra 3D\samudra-3d`. User selected all eight remaining items except saved locations/analyses and live external feeds. Complete only this first bounded phase, preserve the rest on the plan, and stop for Codex review.

## 1. Fix missing-data physics without inventing inputs

Inspect `backend/app/services/depth_analysis.py`, `backend/tests/test_depth_analysis.py`, `/api/ocean/in-depth-analysis` response construction/schema, and `frontend/src/components/InDepthOceanModal.jsx`. Current analysis substitutes 20 Celsius and 35 PSU for missing samples.

Replace invented inputs with explicit invalid/unavailable outputs. Preserve genuine zero and finite measurements. Keep depth/value alignment; validate nonfinite values and inconsistent array lengths. Sound speed/density/water-mass outputs must be unavailable when required inputs are missing. Stratification/gradient summaries must not bridge invalid gaps as if continuous measured data existed. Preserve genuinely supported metrics that require fewer inputs. Derived axes/pycnocline/heatwave summaries must explain insufficient valid coverage rather than choose fabricated extrema. Do not change valid-data formulas, units or introduce scientific thresholds.

Update the frontend to handle null/partial arrays and unavailable summaries with visible, concise states; never render NaN, fake curves, zero-risk outcomes or default water masses. Preserve readiness, request ownership, confirmed dataset/time and finite-zero formatting from accepted phases.

Meaningful backend tests: all-null; missing only temperature or salinity; one invalid middle level; nonfinite values; insufficient levels/misaligned arrays; genuine zero inputs; a finite reference column preserving expected computations. Frontend fixture tests must assert actual unavailable values/charts and valid results for a finite column. Use faithful backend schemas.

## 2. Verify actual local ocean files

Find the existing configured data roots and available NetCDF files using targeted path discovery. Do not print secrets, entire environment files, credentials, or raw configuration contents. Inspect existing Python environments/dependencies first. Use existing project requirements; an isolated project virtualenv is acceptable if needed, recording setup commands and dependency results. Do not alter global Python packages or download a large scientific dataset just to obtain a passing run.

If supported local files are available, run the actual backend and verify: confirmed dataset identity/metadata; a finite ocean slice at a supported date/depth; a profile/probe at a supported ocean coordinate; land/outside/missing-cell behavior where available; deep-physics missing/finite contract; time changes; and model/observation comparison if compatible local observations exist. Compare at least one known file value/coordinate/time directly with the API result using the documented sampling/interpolation rule. Record file identity and bounds without copying large files or private paths outside needed evidence.

Add a short unmocked browser smoke test where feasible to confirm actual results reach inspector/profile/physics views. Real scientific verification is not demonstrated by screenshots alone or labels that merely say REAL. Backend fixture tests remain distinct from real-file checks.

If prerequisites prevent real-file verification, report exactly what was inspected, what is missing and which scenarios are NOT RUN. Do not mark real-data verification complete. Still finish the missing-input fix and its available backend/frontend tests. No live-feed integration is authorized.

## Verification and speed

Read the core function and consumers once; use shared validity logic rather than repeated fallbacks. Run focused backend/new browser tests while editing, batch independent checks, then one final verification set. Reuse dependencies and schemas. Keep regression tests that assert outcomes; no mock-only substitute for real data, no weakened assertions or arbitrary sleeps.

From `frontend`: lint, production build, `node --test tests/transitionQueue.test.js`, and `npx.cmd playwright test tests/core-phase-01.spec.js tests/core-phase-01-contract-review.spec.js tests/core-phase-02.spec.js tests/core-phase-02-identity-review.spec.js tests/core-phase-03.spec.js tests/core-phase-04.spec.js`. Run the focused backend depth-analysis tests and relevant API contract tests with the verified environment; record exact command/results. Preserve all accepted regressions.

Write `docs/antigravity-core-phase-04-report.md`: changes, test outputs, finite/missing input contract, real-file evidence vs fixture evidence, setup, unrun cases, prerequisites and limitations. Update Phase 04 statuses in `docs/selected-features-plan.md` as READY FOR REVIEW or BLOCKED verification, never independently approved.

Do not implement later selected features in this phase. Do not remove excluded-feature backend code while the clarification in the plan is pending. No Git staging/commits/push/deployment, auth changes, database deletion, dataset deletion, broad cleanup, new remote integrations or redesign. Stop and request `ready for review`.
