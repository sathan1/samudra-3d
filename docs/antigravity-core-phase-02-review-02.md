# Codex review 02: core phase 02

Date: 27 September 2026. Verdict: CHANGES REQUIRED; phase 03 remains pending.

Independently ran in `frontend`: lint PASS, build PASS (existing bundle-size warning), and the combined Phase 01/contract/Phase 02 browser suite PASS: 27 tests (38.9s). Checks are fixture-backed. No backend behavioral or real-NetCDF check was performed. No application code was changed by this review.

Progress confirmed: startup synchronizes cache ID; cache keys preserve fallback identity and cache writes check generation; available variables now reach the dock; HUD count is dynamic; probe/physics/fronts have more request guards; errors are displayed and preset handling improved. Accepted Phase 01 behavior remains covered.

## Remaining blocking findings

1. **Transition readiness is still not used.** `App.jsx:65` stores `_isTransitioningDataset` and discards it. Scientific views/controls do not consume readiness. The backend selection happens before parent reconciliation starts, so scientific requests can continue against a changed registry with old control/descriptor state. Metadata failure still leaves them enabled. Generation guards on metadata writes do not solve this.
2. **Dataset mutations are not serialized or reconciled.** `selectActiveDataset` remains a direct fetch; DatasetManagerModal only disables the button for `switchingId`, not every competing selection. Awaiting the parent callback is useful but does not serialize multiple backend mutations. TC-P02-04 now performs B then A after B has completed; it does not test rapid or out-of-order completion.
3. **Metadata retry can publish the wrong dataset identity.** After selecting B succeeds but metadata fails, App retains A as `activeDataset`. Its Retry Metadata button calls `handleDatasetSwitched(activeDataset)`, i.e. A. It fetches process-wide B metadata, then explicitly calls `setActiveDatasetId(A)` and `setActiveDataset(A)`. This can present/cache B data as A. Preserve the pending confirmed backend target or refetch the registry before retry; verify metadata identity agrees before publishing readiness. Startup fallback should likewise not describe a dataset whose activation failed.
4. **Thermal-front identity is missing from dependencies.** FishermanModeModal receives `activeDataset`, but its `loadFronts` dependencies are only time and bounds. Two datasets with identical bounds and time indices do not trigger a refresh. It also uses fixed fallback bounds instead of an unavailable state when coverage is unconfirmed. Add confirmed dataset identity/readiness to request ownership.
5. **Verification remains weaker than report claims.** The cache test has different values now, but records fixture responses rather than asserting final rendered/cache results; it has no delayed response or revisit test. The rapid-switch test is sequential, with no controlled delay. The report still claims A→B→A out-of-order, specific profile values, non-exact depth snapping and dataset query forwarding beyond what these tests establish. The API function signatures still lack `dataset_id`; process-wide gating is valid if implemented, but cannot be reported as query scoping. Missing backend dependencies are a limitation, not a behavioral PASS.

## Next action

Use `docs/antigravity-core-phase-02-corrections-02.md`. Implement one coherent transition coordinator and its acceptance tests rather than adding another unused status flag. Keep the existing successful cache/guard/control changes. Review historical findings against current source; the items above describe the current blockers.
