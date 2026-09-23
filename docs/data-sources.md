# SAMUDRA-3D Data Sources & Ingestion Matrix

## 1. Data Source Inventory

SAMUDRA-3D ingests both numerical model reanalysis outputs and in-situ ocean observations. Each dataset is classified by its source mode, geographic bounds, depth coverage, and verification status.

| Dataset / Source | Provider | Format | Variables | Source Mode | Spatial Bounds | Depth Coverage | Temporal Coverage | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Copernicus Marine GLORYS12V1** | Copernicus Marine Service / Mercator Ocean | NetCDF-4 (CF-1.4) | `thetao` (Temp), `so` (Salinity), `uo`, `vo` (Currents) | `REAL_LOCAL` | $0.0^\circ\text{N} - 25.0^\circ\text{N}$, $50.0^\circ\text{E} - 100.0^\circ\text{E}$ (~8.3 km grid) | **0.49 m – 92.33 m** (22 vertical levels) | 2025-01-01 to 2025-01-07 (7 daily timesteps) | **VALIDATED REAL REANALYSIS** |
| **Argo Profiling Floats (GDAC)** | INCOIS / Coriolis Global Data Assembly Centre | NetCDF-3/4 (WMO v3.1) | `PRES`, `TEMP`, `PSAL`, Quality Flags (`*_QC`) | `REAL_LOCAL` & `REMOTE_LIVE` | Indian Ocean Basin ($20^\circ\text{S} - 25^\circ\text{N}$, $45^\circ\text{E} - 100^\circ\text{E}$) | **0.0 m – 2,000.0 m** (Continuous profiling) | Multi-year profile archive (e.g. Float 2902210) | **VALIDATED REAL IN-SITU** |
| **Autonomous Underwater Gliders** | OceanGliders / IFREMER / IMOS Australia | NetCDF-4 Trajectory | Pressure, Temperature, Practical Salinity | `REAL_LOCAL` | Regional Transects (e.g. Ningaloo Reef, Bay of Bengal) | **0.0 m – 1,000.0 m** (Sawtooth dive/climb) | Mission trajectory waypoints | **VALIDATED REAL IN-SITU** |
| **INCOIS OMNI Moored Buoy Network** | INCOIS / MoES | NetCDF-4 / ASCII | Sea Surface Temp, Thermistor Chain ($z = 1, 5, 10, 15, 20, 30, 50, 75, 100\text{ m}$) | `REAL_LOCAL` | Arabian Sea & Bay of Bengal (AD01, AD06, BD08, BD10, CB02) | **0.0 m – 100.0 m** (Fixed inductive chain) | Continuous time-series | **VALIDATED REAL IN-SITU** |
| **INCOIS ROMS Synthetic Ocean Model** | MoES / INCOIS Research Model Specification | NetCDF-4 (CF-1.8) | `temperature`, `salinity`, `u_current`, `v_current` | `SYNTHETIC` | $0.0^\circ\text{N} - 25.0^\circ\text{N}$, $65.0^\circ\text{E} - 95.0^\circ\text{E}$ (0.5° grid) | **0.0 m – 4,000.0 m** (9 synthetic levels) | 2026-09-10 to 2026-09-11 (6-hourly forecast) | **TEST FIXTURE & OFFLINE FALLBACK** |

---

## 2. Source Modes & Provenance Tagging

To ensure complete scientific transparency during jury evaluation, SAMUDRA-3D enforces strict runtime provenance tagging:

1. **`REAL_LOCAL`**:
   - Genuine, verified scientific data stored on local disk or volume mounts.
   - Sourced from official marine data providers (Copernicus, INCOIS, Coriolis GDAC).
   - Displayed in the UI with a prominent blue badge: `[REAL • COPERNICUS]` or `[REAL • ARGO]`.
   - **Never falls back silently to synthetic data.** If a `REAL_LOCAL` file is missing, the backend returns an explicit HTTP 503 degraded error.

2. **`REMOTE_LIVE`**:
   - Active REST/OpenDAP endpoints polled on demand for real-time observation feeds.
   - Marked with an amber badge: `[LIVE • REMOTE]`.

3. **`REMOTE_CHUNKED`**:
   - Asynchronous chunked downloads orchestrated via `copernicusmarine subset` CLI.
   - Managed with byte size threshold gates (`SAFE`, `CONFIRMATION_REQUIRED`, `BLOCKED`).

4. **`SYNTHETIC`**:
   - Synthetically generated CF-1.8 NetCDF fixtures adhering strictly to numerical ocean model physics (thermocline decay, Coriolis deflection, Ekman spiral).
   - Used **exclusively** for automated continuous integration (CI) tests, developer offline workstations, and regression fixtures.
   - Displayed in the UI with a distinct grey badge: `[SYNTHETIC • TEST FIXTURE]`.

---

## 3. Real Demonstration Depth Scope & Architecture

### Real Copernicus GLORYS12V1 Demonstration File
- **File**: `SAMUDRA_DATA/raw/cmems_mod_glo_phy_my_0.083deg_P1D-m_thetao-so-uo-vo_50.00E-100.00E_0.00N-25.00N_0.49-92.33m_2025-01-01-2025-01-07.nc`
- **File Size**: 222.9 MB
- **Horizontal Resolution**: 0.0833° (~8.3 km rectilinear grid, 301 latitude × 601 longitude cells)
- **Vertical Levels (22 levels)**:
  $0.494, 1.541, 2.646, 3.819, 5.078, 6.440, 7.929, 9.573, 11.405, 13.460, 15.811, 18.576, 21.699, 25.244, 29.257, 33.784, 38.877, 44.601, 51.023, 58.220, 66.277, 75.280, 85.318, 92.326\text{ m}$.
- **Depth Truth**:
  The validated local Copernicus demonstration dataset covers the upper ocean column ($0.49\text{--}92.33\text{ m}$), which encompasses the critical sea surface temperature (SST), mixed layer depth (MLD), and upper thermocline dynamics. The SAMUDRA-3D volume renderer and CTD extraction pipelines are dynamically dataset-driven; ingesting deeper Copernicus or INCOIS NetCDF files ($0\text{--}2000\text{ m}$) requires zero code modification.

---

## 4. Ingestion Security & Download Safety Thresholds

The download management pipeline (`download_manager.py`) validates bounding parameters and prevents unbounded queries:
- **`SAFE` (< 1 GB)**: Routine regional subsets; execution permitted.
- **`CONFIRMATION_REQUIRED` (1 – 10 GB)**: Regional sub-basin requests; user prompt required.
- **`EXPLICIT_CONFIRMATION_REQUIRED` (10 – 100 GB)**: Basin-scale extracts; admin confirmation required.
- **`CRITICAL_WARNING` (> 100 GB)**: Manual review mandated.
- **`BLOCKED` (> 1 TB or insufficient local disk space)**: Execution automatically halted to protect host resources.
- **Cryptographic Verification**: Every downloaded file is verified with SHA-256 and cataloged into `SAMUDRA_DATA/manifests/`.
