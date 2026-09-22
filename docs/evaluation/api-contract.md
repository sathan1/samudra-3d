# SAMUDRA-3D API Contract — Bounded Endpoints

Base: `/api` (local) or `/api` (Vercel proxy).  Units: degC, PSU, m/s, metres.

## GET /api/health

Readiness + dataset path + timestamp.

## GET /api/metadata

`time_timestamps` (real), `depth_levels_m` (real), `variables` (real),
`lat_bounds`, `lon_bounds`, `spatial_resolution`, provenance.  The UI must
populate every selector from this payload.

## GET /api/location/availability?lat&lon

Lightweight first request.  Never returns field values.

```json
{ "latitude": 15.2034, "longitude": 82.4012, "model": true,
  "dataset_id": "cmems_mod_glo_phy_my_0.083deg_P1D-m",
  "observations": {"argo": true, "glider": false, "ctd": false, "bgc": false},
  "variables": ["temperature","salinity","uo","vo"],
  "depths": [0.494, 5.078, "...", 92.326], "times": ["2025-01-01T00:00:00Z", "..."] }
```

## GET /api/ocean/point?lat&lon&variable&depth&time_idx

Single interpolated value + `nearest_depth` disclosure + provenance.
Target: < 10 KB.  400 on out-of-domain / unsupported inputs.

## GET /api/ocean/profile?lat&lon&variable&time_idx

`depth[]` + `value[]` for the coordinate only.

## GET /api/ocean/region?center_lat&center_lon&radius_km(≤500)&variable&depth_min&depth_max&time_idx

Bounded 3D subset for the local visualization.  Only on explicit user request.

## GET /api/ocean-data?variable&time_idx&depth&lat_min&lat_max&lon_min&lon_max

**Bounds are REQUIRED.**  Missing bounds → HTTP 422.  Over-budget requests are
auto-decimated to `MAX_GRID_CELLS = 100_000` with the effective resolution
returned in the `resolution` field; requests that still exceed the budget
return HTTP 400 with a remediation message.

## GET /api/ocean/probe?lat&lon&time_idx and /api/ocean/transect

Legacy bounded probes retained: full-column probe with MLD/D20/D26/TCHP, and
100-point distance–depth transect matrices.

## Errors

- `422`: FastAPI validation (missing required bounds).
- `400`: `ValueError` — unsupported variable, out-of-range time/depth,
  outside-domain coordinates, inverted bounds, over-budget requests.
- `503`: dataset file missing.  `500`: unexpected backend error.
- The frontend converts every error into a **DATA UNAVAILABLE + retry** panel;
  synthetic data is never substituted.
