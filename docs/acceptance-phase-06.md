# Phase 06 acceptance checklist

Recorded before implementation. Authority: Master Handbook physical pp. 3, 9-11; roadmap p. 10; and `phase-prompts/PHASE-06.md`. Preceding Phase 5 implementation is PASS with explicit user authorization to proceed.

1. **AC01 Phase 5 Gate & Baseline Preservation: [PASS]** Verified Phase 5 implementation passed and is accepted. 3D scalar field renderer, FastAPI backend, and 3D globe intact.
2. **AC02 Scientific Colormap Engine (`frontend/src/utils/colormaps.js`): [PASS]** Implemented `cmocean thermal` (temperature) and `cmocean haline` (salinity) sequential colormaps. Color interpolation function verified with exact minimum, midpoint, and maximum color stops via `tests/test-colormaps.mjs`.
3. **AC03 Edge Case & Robustness Validation: [PASS]**
   - Out-of-range values clamped to $[0, 1]$ safely without data loss.
   - Constant value arrays guarded against division by zero ($vRange = vMax - vMin || 1.0$).
   - Partially masked arrays and landmass handled cleanly with zero triangles over land.
4. **AC04 Unified State & Variable Switching: [PASS]**
   - Unified state for active variable (`temperature` or `salinity`), units (`°C` vs `PSU`), colormap (`thermal` vs `haline`), and numerical bounds.
   - `SidebarControls.jsx` `select#variable` enabled with options `temperature` and `salinity`.
5. **AC05 Race Condition Prevention: [PASS]**
   - Rapid alternation between variables uses `AbortController` and latest-request ID tracking so outdated responses never overwrite active selections. Verified in `tests/colormaps.spec.js`.
6. **AC06 Dynamic & Fixed Scale Disclosure in Legend (`ColorBarLegend.jsx`): [PASS]**
   - Active palette gradient bar displays variable name, units, min bound, mid bound, max bound, and dynamic/fixed range toggle button.
7. **AC07 Numerical Validation & Unit Tests (`tests/test-colormaps.mjs`): [PASS]**
   - Unit test suite verifying exact RGB values at $t=0.0, 0.5, 1.0$ for both `thermal` and `haline` passed 100%.
   - Clamping and numerical robustness verified (out-of-bounds, NaN, Infinity).
8. **AC08 Playwright Browser Test Suite (`tests/colormaps.spec.js`): [PASS]**
   - Variable switching verified in browser UI (`Potential Temperature` $\to$ `Practical Salinity`).
   - Scalar field colors update on 3D globe.
   - Legend updates to `PSU` with `cmocean haline` palette.
   - Fixed and dynamic scale switching verified.
   - Captured evidence screenshots: `01-thermal-temperature.png`, `02-haline-salinity.png`, `03-haline-fixed-scale.png`.
9. **AC09 Performance & Frame Rate Integrity: [PASS]**
   - Browser rendering measured 126–166 FPS during WebGL scalar mesh and colormap updates.
   - Geometry and materials cleanly disposed on variable changes.
10. **AC10 Phase 5 Regression & Handoff: [PASS]**
    - `npm run build` and `npm run lint` passed with 0 errors/warnings.
    - All 12 browser tests passed (`tests/colormaps.spec.js`, `tests/globe.spec.js`, `tests/scalar-field.spec.js`, `tests/shell.spec.js`).
    - Updated `phase-status.md`, `decisions.md`, and authored `docs/phase-reports/phase-06-report.md`.
