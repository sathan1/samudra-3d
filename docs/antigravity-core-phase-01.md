# Antigravity instructions: Core functionality, phase 01

## Goal and workflow

Work in `D:\Samudra 3D\samudra-3d`. Fix the profile and observation comparison interactions before the Lovable redesign. Implement the changes, verify them, and write the review report described below. Stop after this phase; Codex will review the work when the user says `ready for review` and prepare the next instructions.

Read `docs/frontend-redesign-functional-map.md` in full first. It is a source review, not proof that an issue still exists or that old tests pass. Inspect the current implementation and reproduce or trace each issue before changing it. Read any applicable `AGENTS.md` instructions.

This core-fix series is separate from the existing historical roadmap phases 01–15. Do not overwrite their reports or acceptance files.

## Scope of this phase

1. **CTD from an ocean point:** The inspector's CTD action must open the vertical model profile for the selected location. It must not depend on a selected Argo float or display an earlier observation by accident. Label it as a model profile, include its actual location, dataset, time and available depths, and handle missing/outside-coverage data explicitly. Keep the existing observation profile workflow working.
2. **Comparison from an ocean point:** Select and hydrate the nearest observation identified by the probe before opening model comparison. Respect the returned platform type and identifier. If no usable nearby observation exists, show an informative unavailable state instead of choosing an arbitrary or sample platform. Comparison uses the observation timestamp; make that distinction clear from the workspace date.
3. **Observation selection:** Trace drawer selection, focus, profile and comparison actions for both Argo and gliders. Dispatch to the correct detail and collocation endpoints. Switching between types must not retain the previous platform's details or show stale responses after a later selection.
4. **Buoy filter:** Check whether buoy records have a supported list/detail/profile contract. If that capability exists, connect it using the existing contract. Otherwise make the unsupported filter explicit or disable it with an explanation. Do not invent buoy measurements, add a fake list or create a new ingestion subsystem in this phase.

Read the relevant contracts in `frontend/src/services/api.js` and backend routes/services. Likely frontend entry points are `App.jsx`, `LocationInspector.jsx`, `ObservationDrawer.jsx`, `ProfileModal.jsx` and `ModelComparisonModal.jsx`; follow their dependencies rather than assuming these are the only files involved.

## Implementation requirements

- Preserve the completed login/register module, authentication integration, existing Python backend contracts and scientific rendering utilities. Keep the current visual design except for small changes required to explain states or make these actions work.
- Represent model point profiles and observed platform profiles distinctly. Preserve observation quality flags and correct units; do not turn invalid levels into valid chart curves or fabricated comparison pairs.
- Use existing scientific calculations and adapters. Missing model data must remain unavailable. A deep observed profile does not extend the model's supported depth range.
- Handle loading, empty data, request failure and unsupported platform states. Ensure asynchronous selection cannot display a response for a previously selected point/platform.
- Record the initial git status and preserve unrelated local changes, especially `docs/frontend-redesign-functional-map.md`. Do not reset, clean, delete datasets, publish, deploy or commit as part of this task.
- Do not expose credentials, tokens or passwords in reports, terminal captures or screenshots.
- If a necessary dependency or contract is missing, complete independent work and document the precise blocker. Do not silently expand the phase into a large backend rewrite.

## Verification and acceptance

Run the frontend build and lint from `frontend` using its actual scripts (`npm.cmd run build`, `npm.cmd run lint`). Do not use the root build merely to reinstall dependencies. Record any existing failures separately from failures introduced by your changes.

Add or update focused regression checks for these functional changes, using the repository's existing test setup. Inspect the Playwright configuration and available fixtures before choosing commands. If backend code changes, run the relevant backend checks as well. Do not claim fixture-backed checks prove that the real local datasets work.

Exercise these scenarios in the browser if available:

| Scenario | Required result |
|---|---|
| Select an observed profile, then probe a different ocean point and click CTD | Model profile belongs to the new point; no stale observation |
| Open CTD without first selecting any observation | Model profile opens or explains the actual data unavailability |
| Compare a point with a supported nearest observation | Correct platform is selected and comparison follows its timestamp |
| Compare a point with no usable nearest observation | Clear unavailable state; no sample/arbitrary substitute |
| Select Argo, then glider, then Argo | Correct details, charts and comparison requests for each type |
| Rapidly select different points/platforms | Only the final selection's data is presented |
| Empty lists, failed requests, unsupported buoy capability | Clear and recoverable UI state |

Use real local data for a smoke check when available; record the dataset and conditions. If a service, browser or dataset prevents a check, mark that check NOT RUN with its reason. Do not mark the phase fully verified based solely on source inspection or old reports.

## Required review artifacts

Create `docs/antigravity-core-phase-01-report.md` containing:

1. Status: READY FOR REVIEW, PARTIAL or BLOCKED. This is not final reviewer approval.
2. Initial workspace state and confirmed root causes, including issues already fixed or not reproducible.
3. Changed files and the resulting behavior, with a short explanation of any contract changes.
4. Exact verification commands, outcomes, relevant output and whether data was real or mocked. Identify checks not run.
5. Browser scenario results and evidence paths where captured. Keep evidence under `docs/evidence/core-phase-01/`.
6. Remaining issues, limitations and concrete blockers; identify any acceptance condition that remains unmet.
7. A brief handoff for Codex to reproduce the review.

End your response with the report path and ask the user to send `ready for review` to Codex. Do not start phase 02.

## Planned subsequent phases (not authorized by this file)

- Phase 02: Dataset switching, metadata, cache consistency and workspace date/depth synchronization, including derived views and point refresh.
- Phase 03: Trustworthy scientific results and labels: unavailable comparison metrics, missing physics inputs, provenance, hardcoded operational values and heuristic labeling; remaining essential layer/anomaly wiring.
- Phase 04: Agree with the user on missing features required for the demonstration and implement only the selected features.
- Phase 05: Prepare the Lovable homepage/workspace specification around verified workflows and the user's design preferences, preserving login/register.

Codex may adjust these boundaries after reviewing each phase. No frontend redesign is part of phase 01.
