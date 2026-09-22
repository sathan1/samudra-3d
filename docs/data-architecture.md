# SAMUDRA-3D — Data Architecture & Oceanographic Ingestion Pipeline

## 1. Overview
SAMUDRA-3D ingests, slices, and collocates both 4D numerical model reanalysis datasets and in-situ observational platforms within the Indian Ocean basin ($0^\circ\text{N} - 25^\circ\text{N}$, $50^\circ\text{E} - 100^\circ\text{E}$).

To adhere to the core tenet:
> **The globe is a coordinate/data-navigation layer, not a giant container holding the entire ocean dataset.**

the backend serves structured, bounded data slices and localized water-column probes rather than transferring massive 4D volumes to the client.

---

## 2. Primary Numerical Datasets
### 2.1 Copernicus Marine Service (CMEMS) GLORYS12V1 Reanalysis
- **Dataset Identifier**: `cmems_mod_glo_phy_my_0.083deg_P1D-m`
- **Product Format**: NetCDF-4 / CF-1.7 convention compliant
- **Spatial Resolution**: $1/12^\circ \approx 0.083333^\circ$ (~8.3 km at equator)
- **Spatial Extent**: Latitude $0.0^\circ\text{N}$ to $25.0^\circ\text{N}$, Longitude $50.0^\circ\text{E}$ to $100.0^\circ\text{E}$
- **Grid Dimensions**: 301 latitude cells $\times$ 601 longitude cells = **180,901 horizontal grid cells per slice**
- **Temporal Coverage**: 7 daily timesteps (2025-01-01 to 2025-01-07)
- **Depth Levels**: 22 discrete vertical levels:
  `[0.494m, 1.541m, 2.646m, 3.819m, 5.078m, 6.443m, 7.930m, 9.560m, 11.360m, 13.354m, 15.571m, 18.048m, 20.826m, 23.957m, 27.495m, 31.501m, 36.041m, 41.196m, 47.056m, 53.729m, 61.332m, 70.000m, ..., 92.326m]`
- **Physical Variables**:
  - `thetao` ($^\circ\text{C}$): Sea water potential temperature
  - `so` (PSU): Sea water salinity
  - `uo` ($\text{m/s}$): Eastward sea water velocity
  - `vo` ($\text{m/s}$): Northward sea water velocity

### 2.2 Synthetic 4D ROMS Digital Twin (Development/Fallback)
- **File**: `backend/sample_data/model_indian_ocean.nc`
- **Dimensions**: 50 latitude $\times$ 70 longitude $\times$ 9 depth levels $\times$ 8 timesteps
- **Usage**: Automated unit testing, local offline development, and instant smoke-test verification.

---

## 3. In-Situ Observational Ingestion
SAMUDRA-3D supports heterogeneous observational platforms through unified JSON/NetCDF adapters in `backend/app/services/insitu_service.py`:

### 3.1 Argo Profiling Floats (INCOIS-DAC)
- **Real INCOIS Floats**: Ingested from `backend/sample_data/real_argo_sample.json` (e.g., `ARGO_2902210_REAL` in the Andaman Sea).
- **Physical Measurements**: CTD vertical profiles of temperature ($^\circ\text{C}$), practical salinity (PSU), and derived potential density ($\sigma_\theta$) from surface down to 2000m depth.
- **Quality Control**: WMO QC flags (1 = Good, 2 = Probably Good, 3 = Suspect, 4 = Bad). Any measurement with QC flag 4 is strictly excluded from collocation statistics.

### 3.2 Autonomous Underwater Gliders (INCOIS-Seaglider)
- **Platform**: `GLIDER_BOB_SG01` / `GLIDER_REAL_INCOIS_SG02`
- **Mission Trajectory**: High-resolution saw-tooth undulating dives (0 to 1000m) with 25–40 waypoints across the Bay of Bengal ($14.2^\circ\text{N}, 88.6^\circ\text{E}$).

### 3.3 Moored OMNI Buoys (MoES/NIOT)
- **Platforms**: `BD08`, `BD09`, `BD10`, `AD01`, `AD02`
- **Sensors**: Surface meteorological measurements paired with subsurface inductive thermistor chains down to 500m.

---

## 4. API Endpoints & Transport Payloads
| Endpoint | Method | Purpose | Typical Response Size |
| :--- | :--- | :--- | :--- |
| `/api/metadata` | `GET` | Dataset dimensions, depth levels, time bounds, variable ranges | ~2.5 KB |
| `/api/ocean-data` | `GET` | 2D horizontal scalar field for selected depth, time, variable | ~1.04 MB (JSON) |
| `/api/currents` | `GET` | $u, v$ vector arrays for particle streamline advection | ~1.8 MB |
| `/api/ocean/probe` | `GET` | 9-depth vertical column sounding at exact lat/lon + MLD/D20 | ~1.2 KB |
| `/api/ocean/transect` | `GET` | 100-point 2D interpolated distance-depth cross section (ODV) | ~18 KB |
| `/api/ocean/collocation/profile` | `GET` | 4D trilinear collocation of Argo profile vs model grid | ~8 KB |
| `/api/ocean/in-depth-analysis` | `GET` | Acoustic sound velocity, Brunt-Väisälä, water mass classification | ~12 KB |
| `/api/datasets/manifests` | `GET` | SHA-256 integrity manifests for stored NetCDF datasets | ~1.5 KB |
