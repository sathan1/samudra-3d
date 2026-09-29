# SAMUDRA-3D 8-Step Technical Defense Walkthrough

This concise 8-step script is optimized for a 5-minute technical jury evaluation during Smart India Hackathon (SIH26067).

---

### Step 1: Open Global Interactive Globe
- **Action**: Launch SAMUDRA-3D in any modern browser (`http://localhost:5173` or deployed URL).
- **Visual**: The 3D Earth globe loads with smooth OrbitControls rotation, realistic bathymetry texturing, 5° geographic graticules, and active in-situ observation markers.
- **Jury Talking Point**:
  > *"SAMUDRA-3D is a zero-install, browser-native 3D oceanographic visualization platform. The globe serves as a spatial coordinate index, enabling users to explore ocean data without transferring monolithic multi-gigabyte tensors into browser memory."*

### Step 2: Select Location & Query Coordinate-on-Demand
- **Action**: Click anywhere on the Northern Indian Ocean (e.g. Arabian Sea or Bay of Bengal).
- **Visual**: A small, camera-distance-scaled precision needle pin drops at the clicked coordinate. The **Location Inspector** card opens showing clean metric tiles for SST, SSS, Mixed Layer Depth (MLD), and Thermocline Depth ($D_{20}$) with emerald checkmarks (`✓`).
- **Jury Talking Point**:
  > *"Clicking the ocean initiates a bounded coordinate-on-demand query. The backend evaluates the vertical water column in under 15ms, calculating physical parameters like MLD using the de Boyer Montégut 0.5°C criterion."*

### Step 3: Verify Real Ocean Data Provenance
- **Action**: Point out the provenance badge on the top bar and inspector: `[REAL • COPERNICUS GLORYS12V1]`. Open the `📁 Datasets` catalog.
- **Visual**: Dataset catalog lists registered real datasets alongside the synthetic development fixture with explicit metadata, file sizes, and source modes.
- **Jury Talking Point**:
  > *"Our active model dataset is Copernicus Marine GLORYS12V1 global physical reanalysis at 0.0833° (~8.3 km) resolution. The system strictly separates real ocean data from synthetic development fixtures; silent synthetic fallbacks are strictly prohibited."*

### Step 4: Inspect Depth Stratification
- **Action**: Click the depth chips on the left HUD (`0m Surface`, `10m`, `50m`, `92m`).
- **Visual**: The 2D scalar temperature/salinity contours update smoothly, showing thermal stratification and subsurface cooling.
- **Jury Talking Point**:
  > *"The vertical depth controls are dynamically populated from the active dataset's actual CF coordinates. Our current validated real demonstration subset spans 0.49 to 92.33 m across 22 levels, covering the critical mixed layer and thermocline."*

### Step 5: Open In-Situ Observation Platform
- **Action**: Click on an active Argo profiling float sphere (e.g., `ARGO_2902210_REAL` in the Andaman Sea) or glider trajectory.
- **Visual**: The 3D float stem highlights, and the **Profile Inspector** opens displaying the authentic CTD temperature and salinity sounding curves down to 2,000 m.
- **Jury Talking Point**:
  > *"The platform ingests authentic WMO v3.1 Argo GDAC NetCDF files and underwater glider missions. WMO Quality Control flags (1-4) are strictly honored; bad or suspect measurements are excluded from interpolation."*

### Step 6: Model vs Observation Collocation
- **Action**: Switch to the **Model Comparison** panel or click *Collocate with Model*.
- **Visual**: The collocated model CTD curve renders overlaid on the Argo sounding. The system displays calculated residuals ($\Delta = \text{MODEL} - \text{OBSERVED}$) alongside aggregate statistics: **Bias**, **MAE**, and **RMSE**.
- **Jury Talking Point**:
  > *"We perform 4D spatio-temporal collocation using SciPy RegularGridInterpolator on the model hypercube within a 200 km radius. Adhering to physical oceanography standards, residuals are defined as Model minus Observed, revealing local model warm or cold biases."*

### Step 7: Visualize 3D Anomaly Residual Field
- **Action**: Toggle the **3D Discrepancy Heatmap** layer on the top bar and adjust the discrepancy threshold slider.
- **Visual**: 3D diverging difference spheres appear at observation locations: blue spheres indicate model under-prediction ($\Delta < 0$), while red spheres indicate over-prediction ($\Delta > 0$).
- **Jury Talking Point**:
  > *"The discrepancy field surfaces model forecast errors directly on the 3D globe. Adjusting the threshold isolates significant hydrographic anomalies for ocean forecasters and data assimilation teams."*

### Step 8: Switch to 3D Regional Volumetric Ocean Block
- **Action**: Toggle the view mode in the top bar from `[🌍 Global Globe]` to `[📦 3D Ocean Volume Block]`.
- **Visual**: The scene transitions into a 3D rectangular ocean slab for the Northern Indian Ocean. The volume is rendered using GPU `InstancedMesh` voxels colored with `cmocean thermal` colormaps, showcasing depth stratification and seafloor relief.
- **Jury Talking Point**:
  > *"In 3D Block Mode, the backend slices a regular [depth, latitude, longitude] voxel grid. Using Three.js InstancedMesh, thousands of ocean cells are rendered in real time at 60 FPS, providing oceanographers with an intuitive volumetric perspective of subsurface water mass structure."*
