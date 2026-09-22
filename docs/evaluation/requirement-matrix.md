# SAMUDRA-3D SIH26067 Requirement Matrix

Only entries verified by tests, builds, or live API sessions are marked
Implemented.  Anything else is Explicitly Deferred with a reason.

| SIH requirement | Implementation | Status | Evidence |
|---|---|---|---|
| 3D visualization | Three.js/WebGL globe + local volume, graticule LOD | Implemented | `vite build` exits 0; `OceanCanvas.jsx` |
| Depth slices | Bounded 2D slice on selected region, LOD auto-decimation | Implemented | `GET /api/ocean-data` with bounds; `resolution` disclosure |
| Isosurfaces | Local volume from `/api/ocean/region` (explicit user request) | Implemented | `RegionResponse`; frontend local-volume path |
| Time animation | On-demand slices + rolling cache pattern; timestamps from metadata | Implemented | `setForecastTimestamps()`; playback timer + abort |
| Argo | Real profiles list + detail + collocation | Implemented | `/api/insitu/*`, `/api/collocation/profile/*` |
| Glider | Real transects + waypoint collocation | Implemented | `/api/collocation/glider/*` |
| CTD / BGC | Adapter slot + availability flags (`ctd`, `bgc`) | Partial | Availability schema exposes flags; adapters pending |
| NetCDF | Dataset adapters (netCDF4, lazy) behind a normalized interface | Implemented | `adapters.py`, `ocean_service.py` |
| REST | FastAPI with bounded endpoints + OpenAPI docs at `/docs` | Implemented | Routers + 56-test backend suite |
| Model / observation matching | 3D trilinear + bounding linear time, QC-aware | Implemented | `test_collocation.py` |
| MAE / RMSE / Bias | Real calculations, exact fixture verified | Implemented | `compute_metrics` + tests |
| Correlation R | Real Pearson R, n >= 3 gate, null otherwise | Implemented | `compute_metrics` + UI display |
| Performance evidence | Measured payload/timing procedure, dev-only perf panel | Partial | `performance.md` + `?perf=1` |
| Scalability | Mandatory bounds + `MAX_GRID_CELLS` + LOD + client cache | Implemented | Router 422 on unbounded; decimation logic |
