# Reviewed core release, 29 September 2026

Status: Published and smoke-tested. This record covers reviewed core Phases 01-04, not the selected missing-feature implementation phases.

- GitHub `main` received merge commit `072e8e70924ef7c6e6bbc6307d6d2014000334f1`. It includes reviewed core commit `fbc66115e3ccc9ff497a59ddfeb4ba14ed4b5d33` and upstream `9ba2bd6691736186c05d6c1c37ca47521a558050` without a force push.
- Integrated local checks: backend unit suite 75 passed, 2 skipped; frontend lint and production build passed; transition queue 2 passed; all 45 Phase 01-04 Playwright tests passed. `git diff --cached --check` passed before the merge commit.
- [GitHub Actions run](https://github.com/sathan1/samudra-3d/actions/runs/36607628149) completed successfully for the published commit. GitHub reported four successful Vercel production deployments for the same commit.
- Public frontend [samudra-3d.vercel.app](https://samudra-3d.vercel.app) returned HTTP 200 with the SAMUDRA-3D title and a JavaScript asset that returned HTTP 200. Its `/api/health` proxy reported `healthy` and `dataset_loaded: true`.
- Production `/api/metadata` identified the active dataset as `incois_roms_synthetic`. A live `/api/ocean/probe?lat=0&lon=80&time_idx=0` request returned `is_land: false`, SST `29.1`, and nine depths.
- The Vercel build-specific deployment URLs returned Vercel login pages to an unauthenticated visitor. The public production alias above served the app. The Render backend health endpoint also returned HTTP 200 and identified its active file as `backend/sample_data/model_indian_ocean.nc`.

The active production data is synthetic. A genuine GLORYS file was unavailable for Phase 04 verification, so no claim of real-data acceptance is made. Live external feeds and saved locations/analyses remain excluded by the user's feature selection. The scope of removing their backend routes or persistence code is still awaiting clarification; no such deletion was included in this release. The remaining selected feature phases have not been completed or accepted.
