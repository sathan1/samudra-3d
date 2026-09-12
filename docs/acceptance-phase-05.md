# Phase 05 acceptance checklist

Recorded before implementation. Authority: Master Handbook physical pp. 6-7, 9-11; roadmap p. 10; and `phase-prompts/PHASE-05.md`. Preceding Phase 4 implementation is PASS with explicit user authorization to proceed.

1. **AC01 Phase 4 Gate & Baseline Preservation:** Verify Phase 4 implementation passed and is accepted. FastAPI endpoints, NetCDF dataset, and Phase 2 Three.js globe remain intact.
2. **AC02 REST API Integration Service (`frontend/src/services/api.js`):** Implement client API service to fetch `/api/metadata` and `/api/ocean-data` with AbortController signal support, error handling, and configurable API base URL.
3. **AC03 Corner Gradient & Grid Orientation Verification:** Verify coordinate mapping prevents row-flipping or axis mirroring:
   - South-West corner: $lat=0^\circ, lon=65^\circ\text{E}$ (index `[0, 0]`)
   - South-East corner: $lat=0^\circ, lon=95^\circ\text{E}$ (index `[0, 59]`)
   - North-West corner: $lat=25^\circ\text{N}, lon=65^\circ\text{E}$ (index `[49, 0]`)
   - North-East corner: $lat=25^\circ\text{N}, lon=95^\circ\text{E}$ (index `[49, 59]`)
   - Ensure $Y > 0$ for northern latitudes and $X, Z$ match spherical formulas.
4. **AC04 BufferGeometry & Land Mask Preservation:** Build Three.js `BufferGeometry` from the 2D grid. Triangles with any masked vertex (`null` / land) are discarded, ensuring zero triangles bridge over the Indian subcontinent or missing cells.
5. **AC05 3D Scalar Field Rendering:** Render the temperature field mesh on the Three.js globe using smooth vertex colors mapped to an oceanographic thermal palette (blue $\to$ cyan $\to$ yellow $\to$ orange $\to$ coral). Confirm at least 3 sampling locations match backend values.
6. **AC06 Subsurface Visibility & Depth Positioning:** Field is positioned at radius $r = R_0 - \text{depth} \times \text{scale}$. Base Earth globe supports transparency so subsurface fields are clearly visible without being obscured by an opaque sphere.
7. **AC07 Honest UI State Handling:** Implement clear UI states:
   - Loading indicator while fetching slice
   - Error state with user-friendly retry button if backend is unreachable
   - Display active variable, units, forecast timestamp, and depth level
8. **AC08 Resource Teardown & Leak Prevention:** Ensure previous field geometry, material, and vertex attributes are properly disposed before mounting a new slice or unmounting the component. Cancel pending requests via AbortController.
9. **AC09 Build, Lint & Automated Test Suite:**
   - Coordinate and geometry unit test script (`tests/test-scalar-grid.mjs`) passes 100%.
   - Playwright browser test (`tests/scalar-field.spec.js`) verifies rendered mesh, API data display, error fallback, and captures screenshots.
   - `npm run build` and `npm run lint` exit 0 with 0 warnings.
10. **AC10 Traceability, Evidence & Phase Status:** Record screenshots, command logs, and SHA-256 baseline under `docs/evidence/phase-05/`. Update `phase-status.md`, `decisions.md`, and write `docs/phase-reports/phase-05-report.md`.

Final outcome (2026-09-12): AC01-AC10 PASS, independent review PENDING. 3D scalar temperature field successfully generated from FastAPI backend /api/ocean-data and rendered on the Three.js Earth globe. All 10 Playwright browser tests passed across 5 viewports. Thermal colormap, strict land-mask skipping (zero triangles over Indian subcontinent), OrbitControls rotation, and API error/retry states verified. Complete evidence in docs/phase-reports/phase-05-report.md.
