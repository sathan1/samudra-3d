# SAMUDRA-3D REST API Reference

The SAMUDRA-3D backend is built on FastAPI, providing asynchronous, OpenAPI-documented REST microservices for oceanographic data delivery.

Base URL: `http://localhost:8000` (or configured API gateway)  
Interactive OpenAPI UI: `http://localhost:8000/docs`

---

## 1. System Health & Metadata

### `GET /api/health`
Checks backend service availability and confirms whether the numerical NetCDF model is loaded and ready.
- **Response `200 OK`**:
  ```json
  {
    "status": "healthy",
    "dataset_loaded": true,
    "variables_available": ["temperature", "salinity", "currents", "u_current", "v_current"],
    "dataset_path": "SAMUDRA_DATA/raw/cmems_mod_glo_phy_my_0.083deg_P1D-m_....nc",
    "timestamp": "2026-09-23T18:00:00Z"
  }
  ```

### `GET /api/metadata`
Returns native grid dimensions, coordinate bounds, depth levels, and temporal coverage of the active dataset.
- **Response `200 OK`**:
  ```json
  {
    "dataset_id": "cmems_mod_glo_phy_my_0.083deg_P1D-m",
    "dataset_name": "Copernicus GLORYS12V1 Global Ocean Reanalysis",
    "provider": "Copernicus Marine Service",
    "source_mode": "REAL_LOCAL",
    "lat_range": [0.0, 25.0],
    "lon_range": [50.0, 100.0],
    "depth_levels_m": [0.494, 1.541, 2.646, ..., 92.326],
    "time_steps": ["2025-01-01T00:00:00Z", ..., "2025-01-07T00:00:00Z"],
    "variables": ["temperature", "salinity", "currents", "u_current", "v_current"]
  }
  ```

---

## 2. Bounded Ocean Spatial Data

### `GET /api/ocean-data`
Slices a 2D horizontal ocean field.
> **Mandatory Spatial Bounding**: To prevent accidental transfer of full multi-hundred-megabyte grids, `lat_min`, `lat_max`, `lon_min`, and `lon_max` are **mandatory**. Unbounded requests are rejected with `HTTP 400 Bad Request`.

- **Query Parameters**:
  - `variable` (string, default: `"temperature"`): Variable name.
  - `time_idx` (int, default: `0`): Time index.
  - `depth` (float, default: `0.0`): Depth level in metres.
  - `lat_min`, `lat_max`, `lon_min`, `lon_max` (float, **required**): Geographic bounding box.
- **Response `200 OK`**:
  ```json
  {
    "variable": "temperature",
    "depth_m": 0.494,
    "time_iso": "2025-01-01T00:00:00Z",
    "lats": [10.0, 10.083, 10.166],
    "lons": [75.0, 75.083, 75.166],
    "values": [[28.45, 28.51, null], [28.41, 28.49, 28.55]],
    "min_value": 27.8,
    "max_value": 29.2,
    "source_mode": "REAL_LOCAL"
  }
  ```

---

## 3. 3D Volumetric Ocean Block

### `GET /api/ocean/volume`
Extracts a 3D regular voxel grid `values[depth][lat][lon]` for regional WebGL volumetric block rendering via Three.js `InstancedMesh`.

- **Query Parameters**:
  - `dataset_id` (string, optional): Specific dataset ID override.
  - `variable` (string, default: `"temperature"`): Target variable.
  - `time_idx` (int, default: `0`): Forecast or reanalysis timestep.
  - `min_lon`, `max_lon`, `min_lat`, `max_lat` (float, optional): Bounding box.
  - `depth_min`, `depth_max` (float, optional): Depth range filter.
  - `max_lon_samples` (int, default: `48`, range: 4–100): Horizontal sample cap.
  - `max_lat_samples` (int, default: `48`, range: 4–100): Horizontal sample cap.
  - `max_depth_samples` (int, default: `24`, range: 2–50): Vertical sample cap.
- **Response `200 OK`**:
  ```json
  {
    "dataset_id": "cmems_mod_glo_phy_my_0.083deg_P1D-m",
    "variable": "temperature",
    "shape": [22, 48, 48],
    "dimensions": ["depth", "latitude", "longitude"],
    "coordinates": {
      "longitude": [65.0, ..., 95.0],
      "latitude": [0.0, ..., 25.0],
      "depth": [0.494, ..., 92.326]
    },
    "values": [[[28.4, 28.5], [28.3, 28.4]], [[27.8, 27.9], [27.7, 27.8]]],
    "source_mode": "REAL_LOCAL",
    "timestamp": "2025-01-01T00:00:00Z"
  }
  ```

---

## 4. Point Probing & Vertical Transects

### `GET /api/ocean/probe`
Evaluates the vertical water column at a specific coordinate $(lat, lon)$. Computes Sea Surface Temperature (SST), Sea Surface Salinity (SSS), Mixed Layer Depth (MLD), Thermocline depth ($D_{20}$), Upper Ocean Heat ($D_{26}$, TCHP), and collocates the nearest in-situ observation if within 200 km.
- **Query Parameters**: `lat` (float, required), `lon` (float, required), `time_idx` (int, default: `0`).

### `GET /api/ocean/transect`
Computes an Ocean Data View (ODV)-style vertical 2D cross-section between two geographic coordinates $(lat_1, lon_1)$ and $(lat_2, lon_2)$. Interpolates 100 equidistant horizontal points across all vertical depth levels.
- **Query Parameters**: `lat1`, `lon1`, `lat2`, `lon2` (float, required), `variable` (string), `time_idx` (int).

---

## 5. Model-Observation Collocation & Anomaly

### `GET /api/collocation/match`
Executes spatio-temporal collocation matching between the numerical ocean model and active in-situ observations (Argo floats and gliders).
- **Query Parameters**:
  - `variable` (string, default: `"temperature"`)
  - `max_dist_km` (float, default: `200.0`): Maximum Haversine matching distance.
  - `max_time_hours` (float, default: `24.0`): Maximum temporal window.
- **Response `200 OK`**:
  Returns array of collocated pairs with model-interpolated value, observed value, and computed residual $\Delta = \text{MODEL} - \text{OBSERVED}$.

### `GET /api/collocation/profile/{profile_id}`
Returns the comprehensive vertical collocation comparison for a specific in-situ platform, including layer-by-layer residuals, WMO QC inclusion/exclusion reasons, and aggregate statistical metrics (Bias, MAE, RMSE).

### `GET /api/anomaly/field`
Returns the 3D spatial anomaly residual field for rendering difference spheres on the globe. Supports discrepancy threshold filtering ($|\Delta| \ge \text{threshold}$).

---

## 6. Dataset Registry & Ingestion

### `GET /api/datasets`
Lists all registered ocean datasets, including local real Copernicus subsets, synthetic fallback fixtures, and remote data descriptors.

### `POST /api/datasets/select`
Switches the platform's active ocean numerical dataset at runtime.
- **Request Body**: `{"dataset_id": "cmems_mod_glo_phy_my_0.083deg_P1D-m"}`
- **Error Behavior**: If the requested real dataset is unmounted or missing, returns `HTTP 503 Service Unavailable`. Silent fallback to synthetic data is strictly prohibited.

### `POST /api/datasets/estimate-size`
Calculates uncompressed RAM footprint, estimated compressed NetCDF4 transfer size, and verifies available host disk space before download initiation.

### `POST /api/datasets/generate-command`
Generates a verified, bounds-checked `copernicusmarine subset` CLI command with safety validation levels (`SAFE`, `CONFIRMATION_REQUIRED`, `BLOCKED`).
