# Core phase 01: fix the reproduced glider contract defect

Work in `D:\Samudra 3D\samudra-3d`. Read `docs/antigravity-core-phase-01-review-04.md`. Preserve all existing work, authentication and the authorized deletion of `frontend/test-backside.png`. This pass has one functional objective: real backend glider detail records must use glider collocation, including when they contain both vertical arrays and waypoints.

1. Inspect `GliderTransectDetail` in `backend/app/schemas/insitu.py` and the current type resolution in `ModelComparisonModal.jsx`. Replace independently conflicting Argo/glider booleans with an authoritative resolved type. Explicit type metadata owns dispatch; arrays or ID spelling must never override it. Handle unknown/unsupported types explicitly. Preserve dropdown-selected target ownership and request race guards.
2. Update regression glider detail fixtures to include their real backend fields, especially depth/temperature/salinity arrays alongside waypoints and QC. Incorporate or retain the reviewer's regression `frontend/tests/core-phase-01-contract-review.spec.js`. Assert the glider endpoint is used and Argo collocation is not requested for the same glider. Keep all 16 prior cases passing. Verify nearest-glider and fleet/dropdown-glider entry flows.
3. Update the phase report to document this root cause and actual verification. Do not claim that the current final close step in TC-P01-11 exercises an in-flight request: it closes after gates have been released. Describe its actual coverage, or add a real pending-close assertion without broadening functionality.

Run from `frontend`:

- `npm.cmd run lint`
- `npm.cmd run build`
- `npx.cmd playwright test tests/core-phase-01.spec.js tests/core-phase-01-contract-review.spec.js`

If the reviewer test is merged into the primary suite, remove the duplicate file only after preserving its contract scenario and document the resulting command/count. Update `docs/antigravity-core-phase-01-report.md`, capture useful evidence and stop. Do not start phase 02, redesign pages or change backend scientific algorithms. Ask the user to send `ready for review` to Codex.
