# Phase 09 acceptance checklist

Recorded before implementation. Authority: Master Handbook physical pp. 3, 6, 10-11; roadmap p. 10; and `phase-prompts/PHASE-09.md`. Preceding Phase 8 implementation is PASS with explicit user authorization to proceed.

1. **AC01 Phase 8 Gate & Baseline Preservation: [PASS]**
   - Verified Phase 8 implementation passed and is accepted.
   - Time animation playback, depth slicer, colormaps, variable selector, and 3D globe renderer remain fully functional without regressions.
2. **AC02 Current Vector Integration & Speed Derivation: [PASS]**
   - Ingests horizontal current velocity components $u$ (eastward) and $v$ (northward) in m/s from `/api/ocean-data?variable=currents`.
   - Derives speed in m/s: $s = \sqrt{u^2 + v^2}$. Verified against known test cases ($u=3, v=4 \implies s=5.0$ m/s, $u=0, v=0 \implies s=0.0$ m/s).
3. **AC03 Spherical Tangent Vector Mapping: [PASS]**
   - Accurately maps horizontal $(u, v)$ velocity components onto the 3D globe tangent basis:
     $\mathbf{e}_{\text{east}}(\lambda) = (\cos\lambda, 0, -\sin\lambda)$
     $\mathbf{e}_{\text{north}}(\phi, \lambda) = (-\sin\phi \sin\lambda, \cos\phi, -\sin\phi \cos\lambda)$
   - Tangent vectors orthonormal ($|\mathbf{e}_{\text{east}}| = 1, |\mathbf{e}_{\text{north}}| = 1, \mathbf{e}_{\text{east}} \cdot \mathbf{e}_{\text{north}} = 0$).
4. **AC04 GPU InstancedMesh Particle System (`particleStreamlines.js`): [PASS]**
   - Pre-allocates single `THREE.InstancedMesh` with bounded budget of 1,500 particles.
   - Updates instance transform matrices and speed-based vertex colors directly via typed `Float32Array` buffers; zero Three.js object allocation during the animation loop.
5. **AC05 Mask Handling, Lifetime & Boundary Respawning: [PASS]**
   - Particles entering land cells (`null` $u, v$) or crossing Indian Ocean domain boundaries ($0^\circ-25^\circ N, 65^\circ-95^\circ E$) are cleanly respawned at valid random ocean coordinates.
   - Staggered particle lifespans ensure smooth continuous visual advection without synchronized batch popping.
6. **AC06 Layer Toggle & Sidebar Controls Integration (`SidebarControls.jsx`): [PASS]**
   - Enabled `Current streamlines` checkbox under `Overlay layers`.
   - Displays real-time status badge: `"Active (1,500 particles)"` when enabled, `"Off"` when unchecked.
   - Toggling checkbox instantly adds/removes particle streamlines from the 3D scene.
7. **AC07 4D Coherence & Multi-Layer Interaction: [PASS]**
   - Streamlines dynamically update velocity fields when vertical depth (0m to 4,000m) or forecast time step (T+00h to T+42h) changes.
   - Streamlines overlay cleanly on top of active scalar fields (Potential Temperature or Practical Salinity) without z-fighting or visual occlusion.
8. **AC08 Viewport HUD Badge & Performance: [PASS]**
   - Real-time HUD badge displays: `STREAMLINES: 1,500 particles active`.
   - Measured WebGL render performance remains >60 FPS (165 FPS measured in browser with particles actively advecting).
9. **AC09 Automated Test Suites (Unit & Playwright): [PASS]**
   - Standalone unit test suite `frontend/tests/test-currents.mjs` verifying tangent mapping, 3-4-5 speed calculation, bilinear interpolation, mask rejection, and frame-rate independence passed 100%.
   - Playwright test suite `frontend/tests/currents.spec.js` passed 100%.
   - Captured 4 visual evidence screenshots in `docs/evidence/phase-09/`:
     - `01-surface-currents-overlay.png`
     - `02-subsurface-100m-currents.png`
     - `03-currents-with-salinity.png`
     - `04-currents-toggled-off.png`
10. **AC10 Phase 8 Regression & Resource Disposal: [PASS]**
    - Repeated toggling cleanly disposes geometry, materials, and instanced mesh without GPU memory leaks.
    - `npm run build` and `npm run lint` clean (0 errors, 0 warnings).
    - Full Playwright suite (23/23 tests) passed with exit code 0.
    - Updated `decisions.md` (D48–D52), `phase-status.md`, `check-baseline.py`, and created `docs/phase-reports/phase-09-report.md`.
