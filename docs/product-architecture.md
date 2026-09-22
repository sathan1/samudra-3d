# SAMUDRA-3D — Product Architecture & Interaction Model

## 1. Executive Summary & Vision
**SAMUDRA-3D** is an operational, jury-ready ocean digital twin and scientific workstation developed for SIH 2026. Designed for marine scientists, oceanographers, duty forecasters (MoES/INCOIS), and naval operators, SAMUDRA-3D transforms complex 4D numerical model reanalysis grids and heterogeneous in-situ oceanographic observations into an intuitive, high-performance spatial-temporal analysis environment.

The design philosophy firmly establishes:
> **The globe is a coordinate and data-navigation layer, not a giant container holding the entire ocean dataset.**

Permanent 3-column screen-crowding layouts (`SidebarControls` + center viewport + `ComparisonPanel`) have been eliminated. In their place, SAMUDRA-3D provides a **full-bleed 3D ocean globe workspace** with floating, dockable, contextual HUD interfaces that reveal depth, temporal evolution, and localized water column profiles on demand.

---

## 2. Primary Navigation Model
The top navigation bar provides unified, mission-focused workflows across 5 primary operational domains:

```
+---------------------------------------------------------------------------------------------------------+
| [SAMUDRA-3D]  |  [EXPLORE]  [OBSERVATIONS]  [ANALYSIS]  [DATA]  [OPERATIONS]  |  [🔍 Search...]  [User: ADM] |
+---------------------------------------------------------------------------------------------------------+
```

### 2.1 Navigation Domains
1. **EXPLORE**:
   - Primary 3D Earth Globe view with photorealistic Blue Marble/Black Marble textures, clouds, atmospheric limb glow, and coordinate graticules.
   - 3D Regional Ocean Volume Block (Northern Indian Ocean 0–25°N, 65–95°E) with 4 vertical boundary depth curtains from surface down to 4000m seabed bathymetry.
   - Quick basin focus presets: Full Basin, Arabian Sea, Bay of Bengal, Wadge Bank Fishery Grounds, Andaman Sea, Equatorial Indian Ocean.
2. **OBSERVATIONS**:
   - Slide-out **Observation Fleet Drawer** displaying real-time and historical in-situ platforms.
   - Filtering by platform type: **Argo Floats** (INCOIS-DAC), **Underwater Seagliders** (SG01/SG02), and **Moored OMNI Buoys**.
   - Direct spatial fly-to, profile inspection, and model-observation collocation invocation.
3. **ANALYSIS**:
   - **4D Model vs Observation Comparison**: Trilinear collocation engine, dual CTD curves, depth residual plots, and rigorous scientific error scorecards (RMSE, MAE, Bias, Pearson $R$).
   - **Virtual CTD Sounding**: Click-to-probe continuous water column sounding with temperature, salinity, sound velocity, and density profiles.
   - **In-Depth Ocean Acoustics**: SOFAR acoustic channel axis detection, sonic layer depth, mixed layer depth (MLD), and thermocline gradient ($D_{20}$).
4. **DATA**:
   - **Dataset Management & Provenance**: Active NetCDF-4/Zarr catalog, atomic chunked downloader with SHA-256 integrity manifests, Copernicus subset generator, and memory footprint estimator.
   - Explicit scientific honesty: strict provenance badges (`[REAL • COPERNICUS]`, `[REAL • ARGO]`, `[REAL • GLIDER]`, `[REAL • BUOY]`).
5. **OPERATIONS**:
   - **Cyclone & Ocean Heat Engine (TCHP)**: Tropical Cyclone Heat Potential integration along storm tracks (e.g., Cyclone Michaung), cyclogenesis vulnerability indices, and thermal energy reservoirs ($Q > 26^\circ\text{C}$).
   - **Fisherman Mode & Thermal Fronts**: Potential Fishing Zones (PFZ), SST thermal gradient fronts ($|\nabla T| \ge 0.035^\circ\text{C/km}$), coastal upwelling zones, and fishing harbor forecasts (Veraval, Kochi, Wadge Bank, Kasimedu, Vizag, Paradip).

---

## 3. 6-Tier Continuous Level of Detail (LOD) System
To prevent rendering stalls and network saturation while navigating 180,901 grid points per depth slice, SAMUDRA-3D implements a 6-tier continuous LOD system driven by camera altitude:

| LOD Tier | Camera Distance ($R$) | Code | Label | Spatial Resolution | Render Elements |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tier 1** | $d \ge 280$ | `LOD-1` | Global Basin | ~100 km (1.00°) | Solid Earth, atmospheric limb, macro basin labels |
| **Tier 2** | $190 \le d < 280$ | `LOD-2` | Sub-Basin | ~50 km (0.50°) | Graticules (10°), major seas, active Argo cluster markers |
| **Tier 3** | $130 \le d < 190$ | `LOD-3` | Regional Sea | ~25 km (0.25°) | Scalar thermal/salinity field, velocity streamlines |
| **Tier 4** | $80 \le d < 130$ | `LOD-4` | Coastal / Shelf | ~8.3 km (0.083°) | Full GLORYS grid, glider tracks, coastal bathymetry |
| **Tier 5** | $35 \le d < 80$ | `LOD-5` | Local Sector | ~4 km (0.04°) | Harbor pins, thermal fronts, high-res current vectors |
| **Tier 6** | $d < 35$ | `LOD-6` | Observation Point | Station / In-situ | 3D profiling stems, CTD beacon, sensor metadata |

The active LOD tier is displayed in the top HUD status pill (`[LOD-3 • Regional Sea (25 km)]`), automatically updating during orbital camera manipulation and double-click navigation.

---

## 4. Application Shell & Floating Docks
The interface employs glassmorphic dark-theme floating panels anchored to viewport boundaries:
- **Top Bar**: Search, primary navigation, institutional clearance status, theme toggle.
- **Vertical Depth Bar** (Left Edge): Dataset-driven discrete depth chips derived from NetCDF vertical coordinate metadata (`0.494m` to `92.326m`).
- **Bottom Control Bar** (Bottom Edge): Variable tabs (`TEMP`, `SALINITY`, `CURRENTS`), layer toggles (`OBSERVATIONS`, `ANOMALIES`), and continuous 7-day forecast timeline scrub bar with play/pause and step controls.
- **Location Inspector** (Floating Top-Left): Appears dynamically upon clicking any ocean point or place marker, displaying precise coordinates, Copernicus GLORYS provenance, SST/SSS/MLD values, and one-click actions (`Virtual CTD`, `4D Collocation`, `Acoustic Sounding`).
- **Observation Fleet Drawer** (Right Slide-out): 420px drawer with search, type filters, and real-time sensor status badges.
