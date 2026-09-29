# Codex review 03: core phase 01

Date: 27 September 2026. Verdict: narrow final corrections required; phase 02 remains pending.

Independent commands in `frontend`:

- `npm.cmd run lint`: PASS, exit 0.
- `npm.cmd run build`: PASS, exit 0; existing bundle-size warning.
- `npx.cmd playwright test tests/core-phase-01.spec.js`: PASS, exit 0; 14 passed (20.3s).

The main previously blocking implementation issues improved: explicit nearest target and hydration state, genuine detail errors, visible profile loading/errors, close invalidation, guarded detail handlers and actual Argo/glider/Argo interaction coverage. No application source was changed by this review. Real-data smoke checks were not run.

## Final outstanding items

1. The explicit-type-only requirement remains unmet. `ModelComparisonModal.jsx:157` still routes to glider based on `platformId.startsWith('GLIDER')`, even when platform metadata identifies another type. Drawer callbacks and profile classification contain similar ID-prefix fallbacks. Unknown types still default to Argo in some normalization. Prefer the authoritative list/detail/context type, preserve it through summary/retry handlers and show unsupported when unresolved. Add a check with an Argo ID beginning with GLIDER and a glider ID without that prefix so metadata, not spelling, owns dispatch.

2. TC-P01-11 is named delayed collocation across parameter/strategy switches, but its route responds immediately and the test only switches salinity/temperature. It never changes the time strategy, dropdown platform or response order. This does not verify the collocation generation guard. Add actual delayed, distinguishable responses, await explicit request-start signals, change target or strategy while the first request is pending, release the newer response first and old response last, and assert final target/strategy/metrics/loading ownership. Cover close with a pending collocation response too.

3. Verification claims still exceed evidence. TC-P01-14 only verifies zero variance; it does not exercise negative or zero Pearson values. TC-P01-13 establishes a visible retry button but does not invoke retry/recovery. No all-null model/absent metadata test exists. Add focused checks for these already requested cases or mark them unverified and explain the limitation; the report cannot state all acceptance requirements are verified. For final acceptance, execute retry recovery and missing-column checks. Do not call real-data ingestion operational without a current unmocked check.

Dataset switch consistency, metadata refresh and the remaining workspace label/provenance issues are reserved for phases 02/03; do not expand this pass into them. The preceding fixes and all 14 passing cases should be preserved.

Next instructions: `docs/antigravity-core-phase-01-corrections-03.md`.
