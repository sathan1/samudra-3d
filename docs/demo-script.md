# SAMUDRA-3D — Jury Demonstration Script & Walkthrough

## 1. Presentation Overview
- **Duration**: 8 to 10 minutes
- **Target Audience**: SIH 2026 Evaluation Jury, Ministry of Earth Sciences (MoES), Indian National Centre for Ocean Information Services (INCOIS), Naval Hydrographic Department.
- **Key Narrative**: SAMUDRA-3D is not a decorative dashboard or student prototype. It is a scientifically honest, high-performance ocean intelligence workstation that unites 4D numerical model reanalyses (Copernicus GLORYS) with in-situ ocean observation fleets (Argo, Seagliders, OMNI buoys).

---

## 2. Step-by-Step Demonstration Protocol

### Step 1: Institutional Authentication & Session Clearance (0:00 – 1:00)
1. **Action**: Open the application at `http://localhost:5173`.
2. **Display**: Point out the Institutional Security Barrier (`AuthGate`).
3. **Narration**: *"SAMUDRA-3D enforces strict role-based access control (RBAC). Digital twin telemetry, military acoustic channel soundings, and proprietary observation feeds are restricted to verified institutional officers."*
4. **Action**: Click `Officer Demo Login` (or log in as `admin` / `samudra_admin_2026`).
5. **Display**: The workstation unlocks into the full-bleed 3D ocean globe.

---

### Step 2: Full-Bleed 3D Workspace & 6-Tier Continuous LOD (1:00 – 2:30)
1. **Narration**: *"Notice that the screen is no longer crowded with static sidebars. The 3D globe is our primary coordinate navigation canvas."*
2. **Action**: Rotate the globe using left-click drag. Point out the realistic photorealistic Earth sphere, clouds, and atmospheric limb.
3. **Action**: Zoom in using the mouse wheel or double-click on the Bay of Bengal.
4. **Display**: Direct the jury's attention to the top HUD status pill:
   - Starts at `[LOD-1 • Global Basin (100 km)]`
   - Transitions smoothly to `[LOD-2 • Sub-Basin]`, `[LOD-3 • Regional Sea (25 km)]`, down to `[LOD-4 • Coastal / Shelf (8.3 km)]`.
5. **Action**: Click the `🏷️ Basins` button in the top HUD to reveal Google Maps-style hierarchical place markers (e.g., Ninety East Ridge, Wadge Bank, Central BoB). Click `Wadge Bank` to demonstrate smooth camera fly-to.

---

### Step 3: Observation Fleet & Slide-Out Drawer (2:30 – 4:00)
1. **Action**: Click `OBSERVATIONS` in the top navigation or the bottom dock toggle.
2. **Display**: The **Observation Fleet Drawer** slides smoothly into view from the right.
3. **Narration**: *"Here we monitor real-time in-situ platforms. Notice the strict provenance badges: `[REAL • ARGO]` and `[REAL • GLIDER]` — we never pass synthetic mock data as real observations."*
4. **Action**: Filter by `GLIDERS` and select `INCOIS Seaglider SG01`.
5. **Display**: The 3D globe focuses on the glider's 25-waypoint saw-tooth dive path in the Bay of Bengal ($14.2^\circ\text{N}, 88.6^\circ\text{E}$).

---

### Step 4: Click-to-Probe & Location Inspector (4:00 – 5:30)
1. **Action**: Click anywhere on the Arabian Sea or Bay of Bengal.
2. **Display**: A 3D probe pin beacon drops onto the coordinate, and the **Location Inspector** floating card appears in the top-left.
3. **Narration**: *"Clicking the ocean sends a real-time probe query to our FastAPI backend, which extracts the 9-depth water column using trilinear interpolation in under 15 milliseconds."*
4. **Display**: Highlight the live values: SST ($28.4^\circ\text{C}$), SSS ($34.2\text{ PSU}$), MLD ($24\text{ m}$), and Copernicus GLORYS provenance.
5. **Action**: Click `Virtual CTD Profile` to inspect the continuous temperature and salinity curves with depth.

---

### Step 5: 4D Model vs Observation Collocation & Statistical Scorecard (5:30 – 7:30)
1. **Action**: Click `ANALYSIS` -> `Model vs Observation Comparison` (or click `4D Collocation` from the Location Inspector).
2. **Display**: The **Model Comparison Modal** opens with dual CTD curves, depth residual plots, and the Collocation Scorecard.
3. **Narration**: *"This is our core scientific validation engine. The backend performs 4D spatio-temporal collocation: interpolating the 4D model grid to the exact latitude, longitude, depth, and time of the Argo float."*
4. **Display**: Highlight the scientific metrics:
   - **Residual Sign Convention**: $\Delta = \text{Model} - \text{Observed}$ (explicitly stated).
   - **Bias**: $+0.12^\circ\text{C}$ (slight model over-prediction).
   - **RMSE**: $0.48^\circ\text{C}$, **MAE**: $0.36^\circ\text{C}$, **Pearson $R$**: $0.994$.
   - **Quality Control**: Explain that WMO flag 4 (bad data) is strictly filtered out and never corrupts the statistical scorecard.

---

### Step 6: Operational Scenarios — Cyclone Michaung & Fisherman PFZ (7:30 – 9:00)
1. **Action**: Click `OPERATIONS` -> `🌀 Cyclone Mode (TCHP)`.
2. **Display**: The Cyclone Heat Potential modal displays the thermal heat engine along the storm track, integrating heat content down to the $26^\circ\text{C}$ isotherm ($D_{26}$).
3. **Action**: Click `OPERATIONS` -> `🐟 Fisherman Mode (PFZ)`.
4. **Display**: Potential Fishing Zones derived from thermal gradient fronts ($|\nabla T| \ge 0.035^\circ\text{C/km}$) and coastal upwelling indices for 6 Indian fishing harbors.

---

### Step 7: Data Provenance, SHA-256 Manifests, & Jury Q&A (9:00 – 10:00)
1. **Action**: Click `DATA` -> `Dataset Manager`.
2. **Display**: Show the registered Copernicus GLORYS reanalysis dataset, the safe chunked downloader, and cryptographic **SHA-256 integrity manifests**.
3. **Closing Statement**: *"SAMUDRA-3D delivers a truthful, reproducible, and operational digital twin for India's maritime domain. We invite the jury's questions."*
