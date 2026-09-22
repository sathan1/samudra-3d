# SAMUDRA-3D Data Flow — Coordinate-on-Demand Requests

## 1. Global -> regional -> local -> detailed

```text
GLOBAL EARTH (lightweight)
  -> user clicks -> LAT/LON via Three.js raycasting + cartesianToGeo
  -> GET /api/location/availability?lat=..&lon=..   (metadata only, no values)
  -> user selects variable / depth / time (all from /api/metadata)
  -> GET /api/ocean/point   (single value, target < 10 KB)
  -> GET /api/ocean/profile (depth[] + value[] for the coordinate)
  -> GET /api/ocean/region  (bounded local 3D subset, only when "Load Local 3D" is pressed)
  -> THREE.JS LOCAL VISUALIZATION of the subset
  -> GET /api/collocation/profile/{id} for model-vs-observation comparison
```

## 2. Endpoint reference (see `api-contract.md`)

| Step | Endpoint | Returns | Typical size |
|---|---|---|---|
| Availability | `GET /api/location/availability` | variables, depths, times, observation flags | < 5 KB |
| Point | `GET /api/ocean/point` | single model value + provenance | < 10 KB |
| Profile | `GET /api/ocean/profile` | depth + value arrays | < 50 KB |
| Region | `GET /api/ocean/region` | bounded 3D subset | bounded by grid budget |
| Probe (legacy) | `GET /api/ocean/probe` | full water column + derived metrics | bounded |
| Slice (LOD) | `GET /api/ocean-data?...bounds...` | 2D slice with auto-decimation | auto-LOD |
| Collocation | `GET /api/collocation/profile/{id}` | Bias / MAE / RMSE / R + levels | bounded |

## 3. Request lifecycle

- Frontend: client-side LRU cache on (endpoint + params); AbortController
  cancels superseded selections so only the latest result paints the UI.
- Backend: deterministic disk+memory slice cache keyed by dataset/params.

## 4. Error states

No data / network error / dataset unavailable / invalid coordinate /
outside dataset bounds / unsupported variable / unsupported depth /
unsupported time / too-large request — each returns an explicit error and a
matching UI message.  Never synthetic data.
