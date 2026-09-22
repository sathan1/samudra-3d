# SAMUDRA-3D Scientific Validation — Real Data Only

## 1. Data sources (real, preserved)

- Copernicus GLORYS12V1 reanalysis (NetCDF): variables thetao / so / uo / vo,
  mapped to temperature / salinity / u_current / v_current / currents.
- Argo GDAC profiles, IMOS Ningaloo Gliders, OceanSITES moorings (see provenance doc).
- Synthetic fixture `backend/sample_data/model_indian_ocean.nc` is **test-only**
  and is only activated when the process detects a test environment.

## 2. Scientific truth guarantees

- Depths/times/variables come from `GET /api/metadata`:
  - GLORYS: **22 depth levels 0.494–92.326 m**, **7 daily timestamps 2025-01-01..2025-01-07**,
    **301 lat x 601 lon** grid at ~8.3 km.
  - Any request outside the domain returns an explicit error; nothing is
    extrapolated silently and no depth is mislabelled (e.g. 2000 m never
    silently resolves to a 92 m level — bounds + metadata always disclose).
- Interpolation is declared in every response:
  `interpolation_method: "trilinear"` (model field via RegularGridInterpolator-linear),
  `time_strategy: "linear" | "nearest"` for collocation.
- QC discipline: Argo/Glider QC flags 3/4 reject a level (`BAD_QC_FLAG`);
  masked land cells reject a level (`MASKED_LAND`); outside-domain rejects
  with named codes (`OUT_OF_BOUNDS_LAT/LON/DEPTH/TEMPORAL`).

## 3. Collocation method

`delta = MODEL - OBSERVED` (negative = under-prediction).  Per-profile:

1. observation timestamp -> forecast hours relative to the dataset's first time step;
2. each valid level matched in 3D (bounding indices + trilinear blend over
   valid ocean corners) and in time (linear between bounding slices);
3. level metrics aggregated into **Bias / MAE / RMSE / Pearson R** over valid pairs.
4. Analytical affine field `f(lat,lon,depth) = 10 + 0.5*lat - 0.2*lon + 0.004*depth`
   verified trilinear exactness: **max error 0.00002** (< 1e-3 gate).

## 4. Measured skill (backend suite, `test_collocation.py`)

- Handbook residual fixture `[-1, 0, 2]` (pairs `(10,11),(10,10),(12,10)`):
  bias `1/3`, MAE `1.0`, RMSE `sqrt(5/3)` — exact.
- Sign convention: `(18.5,19.1) -> bias -0.6 (under-prediction)`;
  `(19.1,18.5) -> bias +0.6 (over-prediction)`.
- ARGO_2902145 collocated with `ACCEPTABLE` health; QC outliers rejected;
  real Argo + Glider collocated; glider BOB_SG01 matched 25 waypoints.
- Pearson R: computed when `n >= 3` valid pairs, else `null`.  The UI shows
  `R = … (n pairs)` or `n = … — insufficient samples`; invalid R is never displayed.
