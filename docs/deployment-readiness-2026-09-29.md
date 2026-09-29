# Git and deployment preparation, 29 September 2026

Status: PREPARED, NOT PUBLISHED. The user asked to wait for Antigravity/Phase 04 review before publishing. No Git staging, commit, push, merge, deploy or remote configuration change has occurred in this preparation.

## Current verified state

- Local branch: `main`, current local HEAD `eaf8ab3`.
- Remote: `origin=https://github.com/sathan1/samudra-3d.git`; remote `main` HEAD at preparation `9ba2bd6`. Read-only fetch succeeded. Local main is 9 commits behind and 0 ahead.
- Upstream changed 475 paths, with 12 tracked file paths overlapping current local edits: `backend/app/data/registry.py`, `backend/app/routers/ocean.py`, `frontend/src/App.jsx`, `BottomControlBar.jsx`, `Header.jsx`, `LocationInspector.jsx`, `ModelComparisonModal.jsx`, `ObservationDrawer.jsx`, `OceanCanvas.jsx`, `ProfileModal.jsx`, `VerticalDepthBar.jsx`, `frontend/src/services/api.js`. This requires integration and tests; do not force-push or discard either side.
- Working tree has the cumulative reviewed Phase 01-03 work and unreviewed Phase 04 corrections in progress, plus untracked handoff/report/test/evidence files. Preserve all until review. `git diff --check` had no whitespace errors; it reported only line-ending normalization warnings.
- Frontend uses Vercel rewrite `/api/*` to `https://samudra-3d-backend.onrender.com/api/*`; Render service spec is `samudra-3d-backend` with Python build and FastAPI start command. GitHub Actions runs backend unit tests, frontend lint/build and config validation on `main` pushes. These files were inspected locally and on fetched remote main.
- `backend/sample_data/model_indian_ocean.nc` is tracked. It is a synthetic simulation sample, not genuine GLORYS. Full-size GLORYS is not tracked. Phase 04 review identified an unavailable-selection identity bug, so production publication should wait for correction and independent review.
- Vercel project linkage/production deployment trigger and Render dashboard permissions were not established by local files. Do not claim CI validation is a successful deployment; verify actual frontend and backend URLs after publication.

## Publication sequence after Phase 04 review

1. Confirm Antigravity stopped editing; take a final status/hash inventory and review Phase 04 corrections. Confirm the user's pending excluded-feature backend removal scope before deleting anything related to live feeds or saved analyses. Decide whether the selected remaining phases are meant to ship together or whether an approved subset should deploy; currently waiting for the user's choice to wait for review, so do not publish WIP.
2. Make an isolated integration checkout/worktree from the latest `origin/main`. Apply the reviewed local changes while preserving upstream work. Resolve the 12 overlapping paths deliberately. Treat upstream deleted files/docs carefully; include only necessary reviewed handoff and evidence artifacts, and never secrets, `.venv`, generated builds, caches or large raw data.
3. Run backend focused/full checks, frontend lint/build, queue tests, and Phase 01-04 Playwright regressions on the *integrated checkout*. Validate deployment config and any backend data/status behavior. The old branch's green results do not cover upstream integration.
4. Commit the reviewed result, push via a normal non-force path or reviewable PR according to the integrated branch state, and check GitHub Actions. Confirm which Vercel/Render project is connected; observe actual build/deploy status and smoke-test production frontend and `/api/health`, metadata identity, one supported scientific result, and auth route without exposing credentials. Record commit SHA/URLs/results.

No authorization has been inferred to merge or publish unreviewed Phase 04 changes. No deployment is complete yet.
