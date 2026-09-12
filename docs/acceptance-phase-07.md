# Phase 07 acceptance checklist

Recorded before implementation. Authority: Master Handbook physical pp. 6-7, 10-11; roadmap p. 10; and `phase-prompts/PHASE-07.md`. Preceding Phase 6 implementation is PASS with explicit user authorization to proceed.

1. **AC01 Phase 6 Gate & Baseline Preservation: [PASS]**
   - Verified Phase 6 implementation passed and is accepted.
   - Dynamic colormaps (`cmocean thermal` and `cmocean haline`), variable selector, and 3D globe renderer intact.
2. **AC02 Interactive Depth Slider in Sidebar Controls (`SidebarControls.jsx`): [PASS]**
   - Enabled `input#depth` with continuous range 0m to 4,000m, tick marks via `<datalist>`, and accessible keyboard controls.
   - Discloses requested depth (`0m` to `4000m`) and snapped model layer whenever non-grid depths are selected.
3. **AC03 Coherent State & Depth Slicing Integration: [PASS]**
   - Single source of truth for requested depth and resolved model depth in `App.jsx`.
   - Propagated depth selection to `OceanCanvas.jsx` and backend `/api/ocean-data?depth=...`.
   - Preserves selected variable (`temperature` vs `salinity`) and time step across depth transitions.
4. **AC04 Radial Movement & Inward Depth Geometry: [PASS]**
   - Subsurface scalar field vertices positioned radially inward: $r = R - depth \times (globeRadius / R_{earth}) \times exaggeration$.
   - Verified $r(4000m) < r(2000m) < r(500m) < r(100m) < r(0m)$ in `tests/test-depth.mjs`.
   - Subsurface geometry remains clearly visible through the semi-transparent Earth globe ocean surface.
5. **AC05 Direct Backend Verification across Vertical Layers: [PASS]**
   - Direct verification of Surface (0m: ~28.5–29.1°C), Thermocline (100m: ~21.4–22.0°C), and Abyss (4000m: ~2.0–2.6°C).
   - Numerical values and color gradients update coherently on the globe, HUD, and legend.
6. **AC06 Debouncing, Cancellation & Race Condition Prevention: [PASS]**
   - Rapid slider dragging debounced with `AbortController` cancellation and sequence ID tracking so stale/delayed network responses cannot overwrite the final requested depth.
   - Variable switching while a depth request is pending executes safely without desynchronization.
7. **AC07 Honest Depth Snapping & Range Disclosure: [PASS]**
   - Selecting non-grid depth (e.g. 75m) displays explicit disclosure: `DEPTH: 75m requested (snapped to 50m model level)`.
   - Never fabricates or extrapolates artificial data outside known model bounds.
8. **AC08 Numerical Validation & Unit Tests (`tests/test-depth.mjs`): [PASS]**
   - Unit test suite verifying inward radial distance calculations, depth snapping logic, and debouncing passed 100%.
9. **AC09 Playwright Browser Test Suite (`tests/depth.spec.js`): [PASS]**
   - End-to-end browser tests verifying slider interactions, HUD depth badges, variable preservation, and rapid dragging.
   - Captured screenshots:
     - `01-surface-0m.png`
     - `02-thermocline-100m.png`
     - `03-abyssal-4000m.png`
     - `04-non-grid-snapping-75m.png`
10. **AC10 Phase 6 Regression & Handoff: [PASS]**
    - `npm run build` and `npm run lint` passed with 0 errors/warnings.
    - All 16 browser tests passed (`tests/colormaps.spec.js`, `tests/depth.spec.js`, `tests/globe.spec.js`, `tests/scalar-field.spec.js`, `tests/shell.spec.js`).
    - Updated `phase-status.md`, `decisions.md`, and wrote `docs/phase-reports/phase-07-report.md`.

