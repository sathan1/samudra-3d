# SAMUDRA-3D: 4D Ocean Digital Twin & Grounded Intelligence Platform

[![SIH 2026](https://img.shields.io/badge/SIH%202026-Problem%20SIH26067-blue.svg)](https://sih.gov.in/)
[![Ministry](https://img.shields.io/badge/Ministry-MoES%20%2F%20INCOIS-teal.svg)](https://incois.gov.in/)
[![Phases](https://img.shields.io/badge/Roadmap-15%2F15%20Phases%20PASS-brightgreen.svg)](docs/phase-status.md)
[![Playwright E2E](https://img.shields.io/badge/Playwright-46%2F46%20Pass%20(13%20Specs)-brightgreen.svg)](docs/final-readiness.md)
[![WebGL FPS](https://img.shields.io/badge/Rendering-60--165%20FPS%20(Three.js)-success.svg)](docs/final-readiness.md)
[![License](https://img.shields.io/badge/License-MIT-lightgrey.svg)](LICENSE)

> **Interactive 3D/4D Visualization of Oceanographic Data and Numerical Model Simulations**  
> Developed for the **Ministry of Earth Sciences (MoES)** and the **Indian National Centre for Ocean Information Services (INCOIS)** by **Team Nexus Nova**.

---

## 🌊 Overview & Mission

The Indian Ocean is one of the most dynamically complex marine ecosystems on Earth, influencing the Indian Summer Monsoon, tropical cyclogenesis, and regional maritime commerce. While INCOIS generates terabytes of high-resolution 4D numerical model forecasts (ROMS / INDOFOS) and maintains extensive in-situ observing networks (Argo floats, underwater gliders, moored buoys), oceanographers, defense operators, and policy makers are often constrained by 2D slice plots or cumbersome command-line scripts.

**SAMUDRA-3D** bridges this critical gap by delivering a **zero-install, browser-native 4D Oceanographic Digital Twin**:
- **Unifies Simulation & In-Situ Reality:** Combines 4D ROMS NetCDF numerical grids with live Argo profiling floats and underwater gliders.
- **Spatio-Temporal Collocation Engine:** Performs trilinear interpolation at exact platform coordinates $(t, \text{lat}, \text{lon}, z)$ to calculate true residuals ($\Delta = \text{MODEL} - \text{OBSERVED}$).
- **3D Discrepancy Heatmap:** Visualizes residual fields on the 3D globe with diverging palettes and traceable threshold alerts.
- **Grounded AI Ocean Assistant:** Non-hallucinatory, deterministic ocean query engine that evaluates live numerical arrays in under 150ms with zero cloud API keys.

---

## 🏛️ System Architecture

```
                                 [ Web Browser Client (Port 80 / 3000 / 5173) ]
                                                        │
                   ┌────────────────────────────────────┴────────────────────────────────────┐
                   ▼                                                                         ▼
       [ React 18 + Tailwind UI ]                                                [ Three.js WebGL Engine ]
   • Header (Theme, Status, AI trigger)                                      • 3D Earth Globe with Bump Map
   • SidebarControls (Layer/Variable/Time/Depth)                             • 4D Scalar Field Surface & Slices
   • ComparisonPanel (Collocation, Anomaly, Alerts)                          • 10,000+ GPU Current Streamlines
   • ProfileModal (CTD Curves, T-S Diagram)                                  • Argo Float Spheres & Raycasting
   • AIAssistantModal (Grounded Ocean Queries)                               • Glider Sawtooth Trajectories (Tubes)
                                                                             • 3D Discrepancy Residual Spheres
                   │                                                                         │
                   └────────────────────────────────────┬────────────────────────────────────┘
                                                        │ REST API (JSON / Typed Float32Array)
                                                        ▼
                                     [ FastAPI Backend Service (Port 8000) ]
   • /api/health & /api/metadata            ── CF-Compliant Dataset Ingestion & Validation
   • /api/ocean/slice & /api/currents       ── 4D ROMS Grid Hyperslab Slicing & GPU Vector Packing
   • /api/insitu/argo & /api/gliders        ── Normalized In-Situ Profiles & Trajectory Waypoints
   • /api/collocation/profile/{id}          ── Exact 4D Trilinear Spatio-Temporal Interpolation
   • /api/anomaly/field & /summary          ── Discrepancy Field (Δ = MODEL - OBS) with Sparse Radii
   • /api/assistant/query & /presets        ── Deterministic Mathematical Query Evaluation
                                                        │
                   ┌────────────────────────────────────┴────────────────────────────────────┐
                   ▼                                                                         ▼
       [ 4D ROMS Numerical Simulation ]                                          [ In-Situ Observation Store ]
   • CF NetCDF4 (`model_indian_ocean.nc`)                                     • Argo GDAC Profiles (Synthetic + Real)
   • Dimensions: time, depth, lat, lon                                       • Glider Sawtooth Missions & Waypoints
   • Variables: temp, salt, u, v, w                                          • WMO Quality Control Flags (1-4)
```

---

## ✨ Core Features & Highlights

### 1. 4D ROMS Digital Twin & Volumetric Slicing
- Seamlessly slice from the sea surface down to 2,000m abyss with radial coordinate scaling.
- Toggle between physical variables: **Sea Water Temperature (°C)** and **Salinity (PSU)**.
- Perceptually uniform, oceanographically standardized colormaps: **cmocean thermal** and **cmocean haline**.
- 4D Time Playback engine: Step forward/backward or loop through 6-hour forecast horizons with lead-hour counters.

### 2. Real-Time GPU Particle Streamlines
- 10,000+ GPU-accelerated current particles advected dynamically via local tangent-basis velocity fields ($u, v$).
- Frame-rate independent Euler integration with dynamic speed color coding (0.0 – 2.0+ m/s).
- Land-mask filtering prevents particles from penetrating continental landmasses.

### 3. Multi-Platform In-Situ Ingestion (Argo & Gliders)
- **Argo Profiling Floats:** Clickable 3D marker spheres with line-of-sight Earth occlusion and drag discrimination.
- **Autonomous Underwater Gliders:** 3D sawtooth yo-yo dive/climb trajectories rendered via 3D `TubeGeometry`.
- **Quality Control (QC) Integrity:** WMO QC flags (1-4) strictly honored. Flagged outliers (flags 3, 4) render visible line-breaks in curves to prevent false scientific interpolation.
- **T-S Correlation Diagrams:** Temperature vs Salinity curves plotted over background isopycnal density contours ($\sigma_\theta = 22 \dots 28\,\text{kg/m}^3$) calculated from UNESCO 1983 Seawater Equation of State (EOS-80).

### 4. 4D Collocation & 3D Anomaly Residual Field
- Exact 4D trilinear interpolation evaluates ROMS forecast values at exact observation space-time coordinates.
- Rigorously adopts physical oceanography standard: $\Delta = \text{MODEL} - \text{OBSERVED}$.
- 3D Diverging difference spheres (blue = under-prediction, red = over-prediction) with documented ~55km support radius.
- Interactive threshold discrepancy slider (|Δ| ≥ threshold) with traceable alert items that deep-link to source CTD curves.

### 5. Grounded AI Ocean Assistant
- **Zero Hallucination:** Deterministic mathematical query engine evaluates queries directly against active NetCDF arrays.
- **Sub-200ms Execution:** In-memory AST evaluation completes in an average of 142ms.
- **Adversarial Security:** Hardened boundary regex sanitizes prompt injections and system override attacks.
### 6. Real Copernicus Marine GLORYS12V1 Integration & Dataset Architecture
- **Verified Real Ocean Physics:** Uses genuine Copernicus Marine GLORYS12V1 global physics reanalysis subset (`cmems_mod_glo_phy_my_0.083deg_P1D-m`) at 0.0833° (~8.3 km) spatial resolution.
- **Configurable Data Root:** Fully externalized data directory (`SAMUDRA_DATA_ROOT` in `.env`) keeping multi-hundred-megabyte NetCDF tensors out of Git version control.
- **Dynamic Runtime Switching:** Switch between Real Copernicus GLORYS12V1 and Synthetic ROMS baseline at runtime via the `📁 Datasets` UI manager or `POST /api/datasets/select`.
- **Scientific Download Size Estimator:** Calibrated volume estimator predicting uncompressed RAM tensor footprint, zlib-deflated NetCDF4 disk size, bandwidth transfer times, and target disk space headroom.
- **Hierarchical Precision Navigation:** Zoom seamlessly across 4 geographic tiers: Macro Basin &rarr; Regional Sub-Basin &rarr; Coastal Maritime Shelf &rarr; Local Harbor / PFZ Sector.
- **Specialized Operational Modes:**
  - **Fisherman Mode & PFZ Advisory:** Thermal front gradient ($\nabla T \ge 0.3^\circ\text{C/km}$), coastal upwelling MLD, and nearest fishing harbor distance/conditions with explicit safety notices.
  - **Cyclone Heat Engine & TCHP:** Upper-ocean heat potential ($>110\,\text{kJ/cm}^2$ Severe / Rapid Intensification threshold) with strict institutional separation from official IMD forecast tracks.
- **Official Open Data Provenance:** Direct verified endpoints for INCOIS LAS, Copernicus Marine, Ifremer Argo GDAC, and Ifremer Gliders.

---

## 🚀 Quick Start Guide

### Option 1: Docker Compose (Recommended)
Prerequisites: Docker Engine 24+ and Docker Compose v2.

```bash
# Clone the repository
git clone https://github.com/nexus-nova/samudra-3d.git
cd samudra-3d

# Launch complete stack (FastAPI Backend + React Nginx Frontend)
docker compose up --build
```
- Open frontend at: **[http://localhost](http://localhost)** or **[http://localhost:3000](http://localhost:3000)**
- FastAPI documentation at: **[http://localhost:8000/docs](http://localhost:8000/docs)**

---

### Option 2: Local Native Setup (Windows / PowerShell)
Prerequisites: Python 3.11+, Node.js 20+ / 22+ LTS.

#### 1. Backend Setup
```powershell
Set-Location -LiteralPath 'D:\Studies\SIH\Samudra 3Dackend'
python -m venv venv
.env\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### 2. Frontend Setup
```powershell
Set-Location -LiteralPath 'D:\Studies\SIH\Samudra 3Drontend'
npm ci
npm run dev
```
Open **[http://127.0.0.1:5173](http://127.0.0.1:5173)** in Google Chrome or Microsoft Edge.

---

## 🧪 Comprehensive Test Suite & Verification

SAMUDRA-3D achieves **100% automated verification** across all architectural layers:

```powershell
# 1. Run Complete 46-Test Playwright E2E Suite (13 Specs)
cd frontend
npm run test:browser

# 2. Run All 13 Frontend Unit Test Suites
cmd /c "node tests/check-environment.mjs && node tests/test-coordinates.mjs && node tests/test-scalar-grid.mjs && node tests/test-colormaps.mjs && node tests/test-depth.mjs && node tests/test-time-animation.mjs && node tests/test-currents.mjs && node tests/test-argo.mjs && node tests/test-profile-charts.mjs && node tests/test-glider-transects.mjs && node tests/test-collocation.mjs && node tests/test-anomaly.mjs && node tests/test-assistant.mjs"

# 3. Run All 7 Backend Test Suites
cd ../backend
cmd /c "python tests/test_synthetic_data.py && python tests/test_api.py && python tests/test_insitu.py && python tests/test_gliders.py && python tests/test_collocation.py && python tests/test_anomaly.py && python tests/test_assistant.py"

# 4. Verify Baseline Integrity
cd ..
python scripts/check-baseline.py
```

---

## 📊 Roadmap & Deliverables Tracking

| Phase | Module | Classification | Status | Evidence & Artifacts |
|---|---|---|---|---|
| **Phase 01** | UI Shell, Theme & Layout Boundaries | MUST HAVE | ✅ PASS | `docs/evidence/phase-01/` |
| **Phase 02** | 3D Earth Globe & OrbitControls | MUST HAVE | ✅ PASS | `docs/evidence/phase-02/` |
| **Phase 03** | 4D ROMS NetCDF CF Synthetic Generator | MUST HAVE | ✅ PASS | `docs/evidence/phase-03/` |
| **Phase 04** | FastAPI 4D Slicing & CF Metadata API | MUST HAVE | ✅ PASS | `docs/evidence/phase-04/` |
| **Phase 05** | 3D Scalar Field Rendering & Meshing | MUST HAVE | ✅ PASS | `docs/evidence/phase-05/` |
| **Phase 06** | Scientific Colormaps (cmocean thermal/haline)| MUST HAVE | ✅ PASS | `docs/evidence/phase-06/` |
| **Phase 07** | Interactive Vertical Depth Slicer | MUST HAVE | ✅ PASS | `docs/evidence/phase-07/` |
| **Phase 08** | 4D Time Playback & Forecast Horizons | MUST HAVE | ✅ PASS | `docs/evidence/phase-08/` |
| **Phase 09** | GPU Particle Streamlines for Currents | GOOD TO HAVE | ✅ PASS | `docs/evidence/phase-09/` |
| **Phase 10** | 3D Argo Float Markers & In-Situ Ingestion | MUST HAVE | ✅ PASS | `docs/evidence/phase-10/` |
| **Phase 11** | Interactive CTD Profile Curves & T-S Charts | MUST HAVE | ✅ PASS | `docs/evidence/phase-11/` |
| **Phase 12** | Underwater Glider Sawtooth Transects | GOOD TO HAVE | ✅ PASS | `docs/evidence/phase-12/` |
| **Phase 13** | 4D Trilinear Collocation & Model Overlays | MUST HAVE | ✅ PASS | `docs/evidence/phase-13/` |
| **Phase 14** | 3D Residual Field & Discrepancy Heatmap | GOOD TO HAVE | ✅ PASS | `docs/evidence/phase-14/` |
| **Phase 15** | Grounded AI Ocean Assistant & SIH Package | ADVANCED | ✅ PASS | `docs/evidence/phase-15/` |

---

## 📖 Key Documentation Links

- **[Final Readiness & Judge Pitch Script](docs/final-readiness.md):** 5-minute hackathon pitch script, operational data integration guide, and technical jury defense Q&A.
- **[Architectural Decisions Log](docs/decisions.md):** Complete log of decisions D01 through D80.
- **[Phase 15 Completion Report](docs/phase-reports/phase-15-report.md):** Detailed Phase 15 implementation and verification report.
- **[Requirements Traceability Matrix](docs/requirements-traceability.md):** Full traceability mapping from SIH problem statement and handbook to codebase.

---

## 👥 Team Nexus Nova (SIH 2026)
- **Problem Statement:** SIH26067
- **Organization:** Ministry of Earth Sciences (MoES) / INCOIS
- **Repository:** SAMUDRA-3D
