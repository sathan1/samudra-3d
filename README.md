# SAMUDRA-3D: 3D/4D Oceanographic Data & Numerical Model Platform

[![SIH 2026](https://img.shields.io/badge/SIH%202026-Problem%20SIH26067-blue.svg)](https://sih.gov.in/)
[![Ministry](https://img.shields.io/badge/Ministry-MoES%20%2F%20INCOIS-teal.svg)](https://incois.gov.in/)
[![Backend Tests](https://img.shields.io/badge/Backend%20Tests-59%2F59%20PASS-brightgreen.svg)](docs/validation.md)
[![Rendering](https://img.shields.io/badge/3D%20Rendering-Three.js%20WebGL-success.svg)](docs/architecture.md)
[![Data Engine](https://img.shields.io/badge/Scientific%20Data-NetCDF4%20%2F%20NumPy%20%2F%20SciPy-informational.svg)](docs/scientific-methods.md)
[![License](https://img.shields.io/badge/License-MIT-lightgrey.svg)](LICENSE)

> **Interactive 3D/4D Visualization of Oceanographic Data and Numerical Model Simulations**  
> Developed for the **Ministry of Earth Sciences (MoES)** and the **Indian National Centre for Ocean Information Services (INCOIS)** by **Team Nexus Nova** for Smart India Hackathon (Problem ID: **SIH26067**).

---

## 1. Problem Statement (SIH26067)

The Indian National Centre for Ocean Information Services (INCOIS) generates massive volumes of high-resolution numerical ocean model outputs and collects continuous in-situ observations across the Indian Ocean basin (Argo profiling floats, underwater gliders, moored buoy arrays). However:
- Traditional oceanographic workflows rely heavily on static 2D slice plots, offline desktop software (ODV), or custom scripting that obscures complex three-dimensional circulation and thermal structures.
- Comparing numerical model forecasts with heterogeneous in-situ observations requires complex data munging, manual coordinate alignment, and interpolation across disparate data formats (NetCDF, BUFR, ASCII).
- Existing web viewers often attempt to transfer multi-gigabyte raw model tensors directly to web browsers, resulting in excessive bandwidth consumption, sluggish frame rates, and frequent client crashes.

**SIH26067 mandates**: A browser-native 3D/4D visualization system that ingests standardized multi-format oceanographic data, co-visualizes numerical models with in-situ platforms, provides intuitive depth/variable controls, enables quantitative model-observation comparison, and adheres to open standards.

---

## 2. Solution Overview

**SAMUDRA-3D** delivers a zero-install, browser-native 3D ocean intelligence platform that bridges the gap between numerical simulation and real-world in-situ observations:
- **Spatial Index Architecture**: The interactive 3D globe acts as a spatial coordinate index. Ocean fields are extracted server-side using bounded coordinate-on-demand queries, transferring only lightweight, screen-safe JSON payloads to the browser.
- **Dual 3D Visualization Modes**:
  1. *Global 3D Earth Globe*: Seamless navigation across the Indian Ocean basin with bathymetric relief, surface scalar contours, vertical Argo profiling stems, and 3D glider trajectories.
  2. *Regional 3D Ocean Volume Block*: GPU-accelerated volumetric voxel grid (`InstancedMesh`) showcasing subsurface temperature/salinity stratification from sea surface down through the thermocline.
- **Quantitative Model–Observation Analysis**: Automatic 4D spatio-temporal collocation between model grids and observational platforms, calculating exact residuals ($\Delta = \text{MODEL} - \text{OBSERVED}$) alongside Bias, MAE, and RMSE.
- **Physical Oceanography Core**: Server-side calculation of Mixed Layer Depth (MLD), Thermocline depth ($D_{20}$), Upper Ocean Heat ($D_{26}$, TCHP), and water column stability.

---

## 3. Scientific Data Architecture

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
│  • Mandatory Spatial Bounding Box Filter (min_lat, max_lat, etc.)      │
│  • Download Safety Gate (Safe < 1GB, Blocked > 1TB)                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   3. SCIENTIFIC PROCESSING ENGINE                      │
│  • NumPy Array Hyperslab Extractor (Vectorized Slicing)                 │
│  • SciPy `RegularGridInterpolator` (4D Trilinear Interpolation)        │
│  • Dynamic Ocean Metrics (MLD, D20, D26, TCHP)                         │
│  • Residual Discrepancy Engine (Δ = MODEL - OBSERVED: Bias, MAE, RMSE) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               4. COMMON METADATA & PERSISTENCE LAYER                   │
│  • PostgreSQL 16 + PostGIS 3.4 (Institutional Primary Database)        │
│  • SQLite Compatibility (Local Developer & CI Automated Testing)       │
│  • In-Memory Dataset Registry & Cryptographic Manifest Store           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    5. FASTAPI REST MICROSERVICES                       │
│  • `/api/health`, `/api/metadata`, `/api/ocean-data`                   │
│  • `/api/ocean/volume`, `/api/ocean/probe`, `/api/ocean/transect`      │
│  • `/api/collocation/match`, `/api/anomaly/field`                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON & Float32 Typed Arrays
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              6. THREE.JS / WEBGL CLIENT VISUALIZATION                  │
│  • Global 3D Interactive Ocean Globe (WGS-84 Sphere, Custom Shaders)   │
│  • Regional 3D Volumetric Ocean Block (`InstancedMesh` Voxel Grid)     │
│  • Standardized Oceanographic Colormaps (`cmocean thermal / haline`)   │
│  • Precision Ocean Probe Pin with Camera Distance LOD Clamping         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              7. SCIENTIFIC ANALYSIS & INTERACTION PANELS               │
│  • Location Inspector (SST, SSS, MLD, D20 Cards with Checkmarks)       │
│  • CTD Vertical Profiles & Oceanographic T-S Diagrams                  │
│  • Model vs Observation Residual Comparison Panel                      │
│  • 3D Discrepancy Heatmap with Dynamic Threshold Filtering             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Real Data Sources & Demonstrated Datasets

SAMUDRA-3D enforces strict runtime provenance tagging. Real ocean data and synthetic fixtures are never conflated:

| Dataset / Source | Provider | Format | Variables | Source Mode | Depth Coverage | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Copernicus Marine GLORYS12V1** | Copernicus Marine Service / Mercator Ocean | NetCDF-4 (CF-1.4) | `thetao` (Temp), `so` (Salinity), `uo`, `vo` (Currents) | `REAL_LOCAL` | **0.49 m – 92.33 m** (22 vertical levels, 8.3 km grid) | **VALIDATED REAL REANALYSIS** |
| **Argo Profiling Floats** | INCOIS / Coriolis GDAC | NetCDF-3/4 (WMO v3.1) | `PRES`, `TEMP`, `PSAL`, Quality Flags (`*_QC`) | `REAL_LOCAL` & `REMOTE_LIVE` | **0.0 m – 2,000.0 m** (Continuous profiling) | **VALIDATED REAL IN-SITU** |
| **Autonomous Underwater Gliders** | OceanGliders / IFREMER | NetCDF-4 Trajectory | Pressure, Temperature, Practical Salinity | `REAL_LOCAL` | **0.0 m – 1,000.0 m** (Sawtooth dive/climb) | **VALIDATED REAL IN-SITU** |
| **INCOIS OMNI Moored Buoys** | INCOIS / MoES | NetCDF-4 / ASCII | SST, Thermistor Chain ($z=1\dots100\text{ m}$) | `REAL_LOCAL` | **0.0 m – 100.0 m** (Fixed inductive depths) | **VALIDATED REAL IN-SITU** |
| **INCOIS ROMS Synthetic Ocean Model** | MoES / INCOIS Specification | NetCDF-4 (CF-1.8) | `temperature`, `salinity`, `u_current`, `v_current` | `SYNTHETIC` | **0.0 m – 4,000.0 m** (9 synthetic levels) | **TEST FIXTURE & OFFLINE FALLBACK** |

> **Scientific Depth Truth**:
> The currently validated local demonstration subset of Copernicus Marine GLORYS12V1 encompasses $0.49\text{--}92.33\text{ m}$ (22 vertical levels, 7 daily timesteps). This captures the critical sea surface, mixed layer, and upper thermocline dynamics. The volume renderer, vertical probe, and transect services are dynamically dataset-driven; ingesting deeper Copernicus or INCOIS NetCDF files ($0\text{--}2000\text{ m}$) requires zero code modification.
> If a real dataset file is unmounted or missing, the backend returns an explicit `HTTP 503 Service Unavailable` error; **silent synthetic fallback is strictly prohibited**.

---

## 5. Processing Pipeline

1. **Ingestion & Subsetting**: The NetCDF-4 C API (`netCDF4.Dataset`) opens numerical files and validates CF coordinates (`time`, `depth`, `latitude`, `longitude`).
2. **Bounded Spatial Slicing**: Mandatory bounding coordinates clamp queries to visible viewing windows, preventing unbounded memory spikes.
3. **Trilinear Interpolation**: SciPy `RegularGridInterpolator` performs exact 4D interpolation to arbitrary observation coordinates $(t, z, y, x)$.
4. **Physical Metrics Derivation**:
   - Mixed Layer Depth (MLD) via the de Boyer Montégut $0.5^\circ\text{C}$ criterion.
   - Thermocline Depth ($D_{20}$) via vertical isotherm root-finding.
   - Upper Ocean Heat Potential (TCHP) via vertical numerical integration down to $26.0^\circ\text{C}$.
5. **Quality Control Filtering**: In-situ profiles are checked against WMO QC flags (1-4); flags 3 and 4 are excluded from statistical metrics.

---

## 6. 3D WebGL / Three.js Visualization Architecture

- **Global 3D Globe**: Rendered as a WGS-84 sphere with custom GLSL shaders, NASA Blue Marble textures, bathymetric depth relief, and 5°/10° latitude-longitude graticules.
- **3D Ocean Volume Block**: Slices an ocean rectangular slab rendered via GPU `InstancedMesh`. Thousands of individual ocean voxel cells are colored with `cmocean` colormaps in real time.
- **Camera-Distance Scale Clamping**: Probe needles and geographic place labels compute Euclidean distance to the camera lens (`camera.position.distanceTo(target)`), maintaining consistent screen-space sharpness without ballooning during close surface zoom.
- **Observation Platforms**: Argo floats render with vertical profiling stems descending into the water column; gliders render 3D sawtooth mission paths via `TubeGeometry`.

---

## 7. Model–Observation Comparison & Anomaly Detection

- **Collocation Protocol**: Numerical model fields are collocated with observation profiles within a 200 km spatial radius and a 24-hour temporal window.
- **Sign Convention**: Rigorously follows physical oceanography standards:
  $$\Delta = \text{MODEL} - \text{OBSERVED}$$
  - $\Delta > 0$ (Warm / Salty Bias): Model over-prediction (rendered in red on 3D difference spheres).
  - $\Delta < 0$ (Cold / Fresh Bias): Model under-prediction (rendered in blue on 3D difference spheres).
- **Statistical Residual Metrics**: Calculates Mean Bias, Mean Absolute Error (MAE), and Root Mean Square Error (RMSE).
- **Discrepancy Threshold Filtering**: Interactive slider enables ocean forecasters to isolate significant anomalies ($|\Delta| \ge \text{threshold}$) across the basin.

---

## 8. Current Implementation Status

| Feature / Capability | Status | Implementation Details |
| :--- | :--- | :--- |
| **Interactive 3D Earth Globe** | **IMPLEMENTED** | Three.js WebGL, WGS-84 sphere, OrbitControls, graticules, coastline overlays. |
| **3D Volumetric Ocean Block** | **IMPLEMENTED** | GPU `InstancedMesh` voxel grid, dataset-driven depth levels, `cmocean` palettes. |
| **Real Copernicus GLORYS12V1 Ingestion** | **IMPLEMENTED** | CF NetCDF-4 adapter, 22 depth levels, temperature, salinity, $u/v$ currents. |
| **In-Situ Ingestion (Argo, Gliders, Buoys)** | **IMPLEMENTED** | NetCDF WMO v3.1 parser, QC flags 1-4, 3D stems, sawtooth trajectory tubes. |
| **4D Spatio-Temporal Collocation** | **IMPLEMENTED** | SciPy `RegularGridInterpolator`, residual calculation ($\Delta = \text{MODEL} - \text{OBS}$). |
| **Residual Discrepancy Heatmap** | **IMPLEMENTED** | 3D diverging difference spheres, dynamic threshold slider, traceable alerts. |
| **Scientific Metric Calculations** | **IMPLEMENTED** | MLD ($0.5^\circ\text{C}$), $D_{20}$ thermocline, $D_{26}$, TCHP, sound speed (Mackenzie 1981). |
| **Download Safety & Command Generator** | **IMPLEMENTED** | Parameter validator, threshold gating (`SAFE` to `BLOCKED`), SHA-256 manifests. |
| **Role-Based Access Control & Auth** | **IMPLEMENTED** | JWT tokens, bcrypt hashing, Admin/Scientist/Public permission roles. |
| **Docker Compose Multi-Container Stack** | **IMPLEMENTED** | FastAPI Python 3.11 backend + Nginx React 18 frontend + PostgreSQL. |
| **Deep GLORYS Expansion ($> 100\text{ m}$)** | **PLANNED** | Extensible architecture ready to ingest $0\text{--}2000\text{ m}$ subsets upon disk allocation. |
| **Marching Cubes Isosurface Extraction** | **PLANNED** | Target enhancement for future release using GPU Compute / WebGL raymarching. |

---

## 9. Quick Start & Local Setup

### Prerequisites
- Python 3.11+
- Node.js 20+ LTS
- System libraries: `libnetcdf-dev`, `libhdf5-dev` (Linux/macOS) or pre-built NetCDF4 wheels (Windows)

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install sqlalchemy alembic "psycopg[binary]" pydantic httpx pytest

# Start FastAPI development server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be available at: **http://127.0.0.1:8000/docs**

### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Launch Vite development server
npm run dev
```
Client application will be accessible at: **http://localhost:5173**

---

## 10. Automated Testing & Verification

SAMUDRA-3D includes an extensive automated test suite covering scientific algorithms, API contracts, and browser workflows:

```bash
# Run all backend unit & integration tests (59 tests across 14 suites)
python -m unittest discover backend/tests -v

# Verify frontend static analysis (zero warnings enforced)
cd frontend
npm run lint

# Compile production frontend bundle
npm run build
```

Full verification results and benchmark figures are documented in [`docs/validation.md`](docs/validation.md).

---

## 11. Deployment

### Docker Compose (Recommended)
```bash
# Clone the repository
git clone https://github.com/sathan1/samudra-3d.git
cd samudra-3d

# Build and start services
docker compose up -d --build
```
- Frontend: **http://localhost** (Port 80)
- Backend API: **http://localhost:8000**
- API Docs: **http://localhost:8000/docs**

Comprehensive deployment instructions for Docker, Render, Vercel, and PostgreSQL are detailed in [`docs/deployment.md`](docs/deployment.md).

---

## 12. Known Limitations & Scientific Boundaries

1. **Demonstration Dataset Depth Coverage**: The validated local Copernicus GLORYS12V1 subset currently spans $0.49\text{--}92.33\text{ m}$ (22 vertical levels). The volume block renderer operates within this real physical range. Loading deeper operational subsets ($0\text{--}2000\text{ m}$) requires data storage allocation rather than code modification.
2. **Grid Sampling in 3D Block View**: To ensure smooth 60 FPS WebGL rendering on commodity laptops without dedicated GPUs, the 3D volume block downsamples horizontal grids to a default maximum of 48×48 sample points.
3. **Observation Latency**: In-situ Argo and glider profiles are ingested from GDAC archives and local files; live streaming depends on external satellite uplink availability and institutional telemetries.
4. **Isosurface Extraction**: Volumetric data is currently rendered as regular voxel cells via Three.js `InstancedMesh`. Arbitrary polygonal isosurface mesh extraction (Marching Cubes) is identified as a planned enhancement.

---

## Documentation Index

- [System Architecture](docs/architecture.md)
- [Data Sources & Ingestion Matrix](docs/data-sources.md)
- [Scientific Methods & Formulas](docs/scientific-methods.md)
- [REST API Reference](docs/api.md)
- [Validation & Verification](docs/validation.md)
- [Deployment Guide](docs/deployment.md)
- [Technical Defense Walkthrough](docs/demo.md)

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.  
Developed for the **Smart India Hackathon 2026** under Problem Statement **SIH26067**.