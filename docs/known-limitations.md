# SAMUDRA-3D — Known Limitations, Scientific Assumptions & Boundaries

## 1. Domain & Spatial Coverage Limits
1. **Geographic Extent**:
   - The primary numerical reanalysis grid (Copernicus GLORYS12V1) covers the **Northern Indian Ocean basin**: Latitude $0.0^\circ\text{N}$ to $25.0^\circ\text{N}$, Longitude $50.0^\circ\text{E}$ to $100.0^\circ\text{E}$.
   - Probing or collocating coordinates outside this bounding polygon (e.g., Southern Ocean, Atlantic, Pacific) cleanly returns an explicit HTTP 400 / `DATA UNAVAILABLE` response. No synthetic extrapolation is performed across out-of-domain coordinates.
2. **Horizontal Grid Spacing**:
   - The numerical grid has an $8.3\text{ km}$ ($1/12^\circ$) spatial resolution. Sub-mesoscale ocean features (eddies $< 10\text{ km}$, localized estuarine plumes) are unresolved by the hydrostatic model and require nested hydrodynamic models (e.g., ROMS or FVCOM).

---

## 2. Vertical & Temporal Limits
1. **Vertical Depth Coverage**:
   - The Copernicus GLORYS sample reanalysis slice dataset contains 22 discrete vertical levels from $0.494\text{ m}$ to $92.326\text{ m}$. Deep abyssal fields ($> 100\text{ m}$ to $4000\text{ m}$) are visualised via bathymetric relief and in-situ Argo profiling floats (which extend to $2000\text{ m}$).
2. **Temporal Window**:
   - The current bundled reanalysis covers a 7-day hindcast window (2025-01-01 to 2025-01-07) with 24-hour temporal resolution. Real-time live forecasting requires an active Copernicus Marine Service API token configured in the backend environment (`COPERNICUS_USERNAME`, `COPERNICUS_PASSWORD`).

---

## 3. Observational Platform Constraints
1. **Argo Drift Dynamics**:
   - Argo profiling floats drift passively with subsurface currents at a parking depth of ~1000m between 10-day surfacing cycles. Trajectories between surface fixes are linearly interpolated for visualization.
2. **Quality Control Flagging**:
   - Observations flagged with WMO QC Flag 4 ("Bad Data") or containing fill values ($-999.0$, $\text{NaN}$) are strictly omitted from statistical calculations (RMSE, MAE, Pearson $R$). This may result in fewer paired points at deep vertical levels.

---

## 4. Hardware & Client Runtime Requirements
1. **WebGL 2.0 / GPU Acceleration**:
   - Rendering 180,901 grid vertices and 1,500 velocity streamline particles requires a WebGL-capable browser (Chrome 90+, Firefox 88+, Edge 90+, Safari 15+).
   - Systems lacking hardware acceleration will experience reduced frame rates (< 30 FPS). An automated WebGL availability check gracefully alerts users if hardware rendering is unsupported.
2. **Memory Footprint**:
   - The frontend JavaScript bundle requires ~120 MB RAM during 3D scene execution. The backend Python FastAPI server requires ~350 MB RAM to hold the NetCDF-4 dataset in memory for sub-millisecond trilinear slicing.
