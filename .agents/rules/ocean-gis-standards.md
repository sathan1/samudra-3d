# SAMUDRA-3D: Oceanographic & GIS Domain Standards

This rule document establishes architectural and domain standards for SAMUDRA-3D, adhering to MoES (Ministry of Earth Sciences) and INCOIS operational protocols.

---

## 1. Coordinate System & Spatial Reference
* **Geodetic Datum**: WGS-84 (EPSG:4326).
* **Primary Operational Domain**: Northern Indian Ocean
  * Latitude: 0.0°N to 25.0°N
  * Longitude: 65.0°E to 95.0°E
* **Vertical Coordinate**: Depth in meters below sea surface ($z \ge 0$, downward-positive).
* **Standard Depth Levels**: 0m (surface), 10m, 25m, 50m (mixed layer), 100m (thermocline), 200m, 500m (intermediate), 1000m, 2000m (abyssal).

---

## 2. 3D Globe & Oceanographic Visualization Rules
* **3D Earth Representation**:
  * Default globe radius: 100 units.
  * Earth sphere uses photorealistic Blue Marble texture with continental relief.
  * Scalar ocean data layer floats at `r = 100.8` (or with vertical bathymetric exaggeration up to `102.5`).
* **Spherical Coordinate Graticules**:
  * Equator (0°): High-visibility cyan (`#38bdf8`, 0.85 opacity).
  * Major Parallels (Tropic of Cancer 23.5°N, 10°N, 20°N) and Central Meridians (70°E, 80°E, 90°E): Sky blue (`#0284c7`).
  * Standard 10° Grid Parallels & Meridians: Slate navy (`#334155`).
* **Ocean Feature & Basin Badges**:
  * Key marine geographic regions (Arabian Sea, Bay of Bengal, Equatorial Indian Ocean, Lakshadweep Sea, Andaman Sea, Carlsberg Ridge, Ninety East Ridge, Chagos Basin) must be marked with 3D canvas sprites.
* **Scientific Contour Isolines**:
  * Temperature: Isolines demarcated at 1.0°C intervals.
  * Salinity: Isolines demarcated at 0.25 PSU intervals.

---

## 3. Accessibility & UI Invariants (Strict Playwright Shell Guard)
* **Form Control Budget**:
  * The `aside.controls` container must maintain an exact count of **14 form controls** (`input`, `select`, `button`).
  * Exactly **2 disabled controls** are permitted:
    1. Base layer checkbox (`<input type="checkbox" disabled />`).
    2. Profile modal trigger when no platform is selected (`<button disabled>View depth profile</button>`).
* **Canvas HUD Controls**:
  * Any auxiliary controls overlaid on the 3D canvas (e.g. Zoom In/Out, Graticules toggle, Basin labels toggle, Quick Zoom presets) **MUST use `<span role="button" tabIndex={-1}>`**.
  * Never place native `<button>` or `<input>` inside canvas overlays without accounting for the form control budget and Tab sequence.
* **Layout Non-Overlap**:
  * All top-level children of `.dashboard` (`aside.controls`, `section.viewport`, `aside.inspection`) must have strictly non-overlapping bounding boxes across all responsive viewports (1440px, 1024px, 768px, 390px, 320px).

---

## 4. In-Situ Oceanographic Observation Platforms
* **Argo Profiling Floats**: Rendered with 3D vertical profiling stems extending down to 2000m. Status: Active (green), Delayed Mode (amber).
* **Autonomous Underwater Gliders**: Rendered along sawtooth profiling trajectories.
* **Research Vessels (ORV Sagarkanya / Sagar Nidhi)**: Rendered at underway CTD sampling coordinates.
* **Quality Control (QC)**: Values flagged with QC > 2 or flagged as spikes must be excluded from validation collocations.
