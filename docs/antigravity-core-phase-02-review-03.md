# Codex review 03: core phase 02

Date: 27 September 2026. Verdict: CHANGES REQUIRED.

Independent checks: frontend lint PASS; build PASS with existing bundle-size warning; submitted combined regression suite PASS (27 passed, 51.7s). Additional reviewer identity test FAIL: metadata for B while registry confirms A did not produce the required error banner. No application code was changed. The failing test is retained at `frontend/tests/core-phase-02-identity-review.spec.js`.

## Remaining blockers

1. `transitionToDataset` detects `meta.dataset_id !== finalTargetId` but only warns, then publishes the target descriptor/cache identity with conflicting metadata. The additional browser check reproduces this; identity mismatch must block readiness and offer recovery.
2. Failure sets `isTransitioningDataset` false, while there is no separate valid/ready predicate. Controls/scientific requests therefore become enabled even if selection changed the backend and metadata reconciliation failed. Startup begins with transition false until after catalog retrieval too. Empty metadata can also be accepted as ready. Readiness must require valid confirmed metadata and no transition error, rather than merely absence of a pending request.
3. Gating is partial: scalar fetch and probe consume the transition flag, but currents/volume and open physics/fronts do not. Their requests can run against the changed process-wide backend before reconciled context is committed. Old data must be explicitly unavailable/refreshing while context is invalid.
4. The coordinator still has no mutation queue/mutex. DatasetManager disables buttons during a switch, which helps normal modal interactions, but startup and retry can independently invoke `transitionToDataset`. Its frontend generation only suppresses late UI writes; it does not serialize backend mutations. TC-P02-04 performs completed B then completed A; it cannot establish overlapping-operation safety. Serialize all coordinator entry points and test the actual policy.

Progress accepted: coordinator ownership of modal selection, correct pending retry target, control disabling during successful transitions, thermal-front dataset/bounds dependencies and prior cache/response guards. Do not rework these unnecessarily.

The report still claims dataset query forwarding that the API helpers do not implement and stronger delayed cache/rapid-switch scenarios than the tests contain. Describe process-wide context ownership accurately and add controlled failure/concurrency coverage rather than copying PASS text. Backend behavioral and real-data checks remain NOT RUN due to missing dependencies.

Next instructions: `docs/antigravity-core-phase-02-corrections-03.md`.
