# SAMUDRA-3D System Architecture

## 1. Architectural Overview & Design Philosophy

SAMUDRA-3D is an oceanographic data visualization and model-observation analysis platform engineered for the Indian National Centre for Ocean Information Services (INCOIS) and Ministry of Earth Sciences (MoES) under Smart India Hackathon problem statement **SIH26067**.

The platform is designed around a single core principle:
**The 3D globe is a spatial coordinate index, not a monolithic container for multi-gigabyte ocean tensors.**

Rather than streaming unmanageable multi-gigabyte NetCDF grids to the web browser, SAMUDRA-3D enforces bounded, on-demand coordinate queries and server-side scientific hyperslab extraction. The backend ingests CF-compliant NetCDF datasets, normalizes them into structured physical fields, and provides high-performance spatial-temporal slices and downsampled 3D volumetric blocks directly to a browser-native WebGL client.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. OCEAN DATA SOURCES                           │
│  • Copernicus Marine GLORYS12V1 (REAL_LOCAL: 0.49–92.33m, 8.3 km grid) │
│  • Argo GDAC Profiles (REAL_LOCAL / WMO NetCDF: 0–2000m, QC flags 1-4) │
│  • Autonomous Underwater Gliders (REAL_LOCAL / IFREMER NetCDF)         │
│  • INCOIS OMNI Moored Buoys (REAL_LOCAL / Multi-depth Thermistors)     │
│  • INCOIS ROMS Synthetic Model (TEST_FIXTURE_AND_OFFLINE_FALLBACK)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   2. INGESTION & BOUNDED SUBSETTING                    │
│  • NetCDF-4 C API Engine (`netCDF4.Dataset`)                           │
│  • Dimensional Validation (lat, lon, depth, time)                      │
│  • Bounded Spatial Window Clamping (min_lat, max_lat, min_lon, max_lon)│
│  • Safety Gate & Download Command Generator (Safe < 1GB, Blocked > 1TB)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   3. SCIENTIFIC PROCESSING ENGINE                      │
│  • NumPy Array Hyperslab Extractor (Vectorized Slicing)                 │
│  • SciPy `RegularGridInterpolator` (4D Trilinear Interpolation)        │
│  • Physical Oceanography Metrics:                                      │
│    - Mixed Layer Depth (MLD: ΔT = 0.5°C threshold)                     │
│    - Thermocline Depth (D20 = 20.0°C isotherm)                         │
│    - Tropical Cyclone Heat Potential (TCHP: Upper-Ocean Thermal Depth) │
│  • Spatio-Temporal Collocation Engine (Observation vs Model Matrix)    │
│  • Discrepancy Residuals (Δ = MODEL - OBSERVED: Bias, MAE, RMSE)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               4. COMMON METADATA & PERSISTENCE LAYER                   │
│  • PostgreSQL 16 (Institutional Primary Production Database)           │
│  • PostGIS 3.4 (Geospatial Indexing & Bounding-Box Intersections)      │
│  • SQLite Engine (Local Developer & Continuous Integration Test Bed)   │
│  • In-Memory Dataset Registry & Cryptographic SHA-256 Manifest Store   │
│  • Role-Based Access Control (Admin, Scientist, Public)                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    5. FASTAPI REST MICROSERVICES                       │
│  • `/api/health` & `/api/metadata` (CF Grid Discovery)                 │
│  • `/api/ocean-data` (2D Slices with Mandatory Spatial Bounds)         │
│  • `/api/ocean/volume` (3D Regular Voxel Grid: values[z][y][x])        │
│  • `/api/ocean/probe` & `/api/ocean/transect` (Vertical Columns & ODV) │
│  • `/api/collocation/match` & `/profile/{id}` (Platform Collocation)   │
│  • `/api/anomaly/field` & `/summary` (Model-Observation Residuals)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON & Float32 Typed Arrays
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              6. THREE.JS / WEBGL CLIENT VISUALIZATION                  │
│  • View Mode 1: Global 3D Interactive Ocean Globe                      │
│    - WGS-84 Sphere (Radius 100, 192×192 Segments)                      │
│    - NASA Blue Marble Surface Texture & Custom Ocean Shaders           │
│    - 3D Argo Platform Markers with Depth Profiling Stems               │
│    - 3D Glider Sawtooth Trajectory Tubes (`TubeGeometry`)              │
│    - Diverging Collocation Residual Spheres                            │
│  • View Mode 2: Regional 3D Volumetric Ocean Block                     │
│    - GPU-Accelerated `InstancedMesh` Volumetric Voxel Rendering        │
│    - Perceptually Uniform Scientific Colormaps (cmocean thermal/haline)│
│    - Exact Coordinate Mapping [depth, lat, lon]                        │
│    - Depth-Aware Scaling & Transparent Seafloor Bathymetry Base        │
│  • Precision Ocean Probe Pin with Camera Distance LOD Clamping         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              7. SCIENTIFIC ANALYSIS & INTERACTION PANELS               │
│  • Location Inspector (SST, SSS, MLD, D20 Cards with Checkmarks)       │
│  • CTD Vertical Water Column Profiles & Oceanographic T-S Diagrams     │
│  • Model vs Observation Residual Comparison Panel                      │
│  • Interactive Discrepancy Alert Threshold Slider                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Details

### A. Data Ingestion & Storage Architecture
- **Production Persistence**: PostgreSQL 16 serves as the institutional data store for user authentication, spatial observations index, download job manifests, and audit provenance. PostGIS 3.4 enables fast spatial range searches (`ST_DWithin`, `ST_MakeEnvelope`).
- **Test / Offline Persistence**: SQLite is embedded for zero-dependency local testing, CI test automation, and standalone field deployments. SQLAlchemy 2.0 provides an agnostic ORM layer supporting both database dialects seamlessly.
- **External Data Root**: NetCDF tensors reside in `SAMUDRA_DATA_ROOT` outside source control. Downloaded files are verified via SHA-256 manifests.

### B. Scientific Processing Core
- **Engine**: Pure Python using `netCDF4`, `numpy`, and `scipy.interpolate.RegularGridInterpolator`.
- **4D Hyperslab Slicing**: Bounded queries extract sub-arrays along `(time, depth, lat, lon)` axes. Slices exceeding safe transfer limits (100,000 cells) are rejected with HTTP 400.
- **3D Volumetric Downsampling**: The volume endpoint extracts a 3D sub-volume `values[z][y][x]` downsampled to browser-safe dimensions (default: 48×48 horizontal, 24 vertical) with missing/land values serialized as `null`.

### C. 3D WebGL / Three.js Rendering Pipeline
- **Global Globe**: An interactive sphere with realistic ocean specular reflectance, bathymetric texture, geographic graticules (5°/10° latitude-longitude lines), and coastline overlays.
- **Volumetric Block**: Uses Three.js `InstancedMesh` where each cell represents an ocean voxel positioned at its true geographic and vertical location. The shader colors each instance using standard `cmocean` colormap palettes (thermal, haline, speed).
- **Camera-Compensated Scale**: Screen-space elements like probe pins and graticule place labels scale dynamically with camera distance to prevent perspective ballooning when zooming in close to the sea surface.
