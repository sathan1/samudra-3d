# Phase 04 independent review

Status: NOT APPROVED. Missing-value handling is substantially improved, but data identity and invalid-depth handling require corrections.

Independent checks: frontend lint PASS, build PASS (existing bundle warning), queue tests 2 PASS; backend depth-analysis plus real-dataset unittest modules ran 16 cases successfully with one genuine GLORYS case skipped (15 passed). Backend API acceptance script PASS against the synthetic sample dataset. All six core browser specs PASS: 44 tests in 1.1 minutes.

Verified blockers:

1. The available `backend/sample_data/model_indian_ocean.nc` is consumed by `SyntheticRomsAdapter`, and API metadata reports `dataset_id=incois_roms_synthetic`, `source_mode=SYNTHETIC`. Actual NetCDF/API integration is useful evidence, but it is not verification of a genuine GLORYS dataset. Existing `test_real_dataset.py` only tests catalog/estimator when its GLORYS case skips. Report claims of real-data verification must distinguish local synthetic NetCDF integration from genuine real-data verification. Nearness to a nearest grid value is not proof of exact bilinear interpolation; retain a reproducible direct interpolation calculation if claimed.
2. Targeted TestClient probe: selecting `cmems_mod_glo_phy_my_0.083deg_P1D-m` returns HTTP 200 with descriptor status UNAVAILABLE; subsequent metadata returns incois_roms_synthetic/SYNTHETIC. Adding an unavailable catalog descriptor must not create a successful selection of an unavailable dataset backed by silent synthetic fallback. Preserve the previously confirmed active dataset on rejected selection. Frontend activation currently checks FILE_NOT_FOUND, not the newly introduced UNAVAILABLE status.
3. Targeted analysis probe: depths `[50,50]`, temperatures `[28,20]`, salinities `[35,35]` returns pycnocline 50, gradient -1 and CONVECTIVELY_UNSTABLE, despite no positive depth interval. Validate strictly increasing distinct depth levels (or deliberately normalize with identical permutation/alignment); do not publish fabricated summaries for duplicate/descending depths. Nonzero first-depth gradient should use actual depth span instead of dividing by bottom depth.

Accepted progress to preserve: missing T/S no longer fabricate 20/35 inputs; all-null and invalid-gap summaries carry unavailable explanations; finite zero is preserved; frontend renders null summaries safely. Do not weaken existing tests to accept the blockers.

Next: `docs/antigravity-core-phase-04-corrections.md`. The two excluded features' removal clarification remains pending. Continue selected work through reviewed phases after these correctness fixes; real-data verification cannot be marked complete without a genuine supported file.
