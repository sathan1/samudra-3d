# Phase 02 acceptance checklist

Recorded before implementation. Authority: Master Handbook physical pp. 6-7, 9-11; section 11 roadmap p. 10; and `phase-prompts/PHASE-02.md`. Preceding Phase 1 implementation is PASS with explicit user acceptance.

1. **AC01 Phase 1 Gate & Preserved State:** Verify Phase 1 implementation passed and is accepted. Pre-existing entry sources and Phase 1 artifacts remain intact.
2. **AC02 Coordinate Conversion & Trigonometry Anchors:** Implement `src/utils/coordinates.js` using radians with exact formula:
   $$X = r \cdot \cos(\text{lat}) \cdot \sin(\text{lon})$$
   $$Y = r \cdot \sin(\text{lat})$$
   $$Z = r \cdot \cos(\text{lat}) \cdot \cos(\text{lon})$$
   Verify mathematical anchors: $(0^\circ, 0^\circ) \to +Z$, $(0^\circ, 90^\circ) \to +X$, North Pole $(90^\circ, \text{any}) \to +Y$, South Pole $(-90^\circ, \text{any}) \to -Y$.
   Verify depth mapping reduces radius ($r = R - d \times \text{exaggeration}$) with consistent units, documenting the $20\times - 50\times$ visual-only policy.
3. **AC03 Procedural Offline Bathymetric Globe:** Procedural canvas texture generator in `src/utils/earthTexture.js` creating high-resolution (2048×1024) realistic bathymetry, coastlines (India, Arabian Sea, Bay of Bengal, Indian Ocean), continental shelves, and graticules with zero mandatory network downloads.
4. **AC04 Interactive 3D Canvas & OrbitControls:** Three.js scene, camera, renderer with device pixel ratio limits (max 2), ambient/sun lighting, smooth damping OrbitControls with zoom limits ($115 - 350$), and initial camera position focused on the Indian Ocean basin ($lat \approx 5^\circ\text{N}, lon \approx 75^\circ\text{E}$).
5. **AC05 WebGL Capability Detection & Graceful Fallback:** Test WebGL context availability. If unsupported or disabled, display an accessible, clear fallback banner within the viewport boundary.
6. **AC06 Resource Cleanup & Remount Stability:** On component unmount or React 18 StrictMode remount, cancel animation frames, dispose geometries, materials, textures, controls, remove event/resize listeners, and force WebGL context loss to prevent duplicate canvases or memory leaks.
7. **AC07 Responsive Reflow & Resizing:** Test viewport across desktop ($1440\times1000$), laptop ($1024\times900$), tablet ($768\times1024$), and mobile ($390\times844$, $320\times900$). Ensure canvas resizes seamlessly with aspect ratio preservation and no horizontal overflow.
8. **AC08 Performance Measurement:** Measure actual frame rate (FPS), frame render duration (ms), and draw calls in a real browser context. Report measured values honestly; do not claim handbook target 60 FPS as an unverified achievement.
9. **AC09 Build & Lint Cleanliness:** Locked production build (`npm run build`) exits 0; ESLint (`npm run lint`) exits 0 with 0 warnings.
10. **AC10 Phase 1 Regression & Traceability:** Regress Phase 1 layout, theme toggling, and accessibility. Save command logs, browser evidence, and SHA-256 baseline in `docs/evidence/phase-02/`. Update `phase-status.md`, `requirements-traceability.md`, and generate `docs/phase-reports/phase-02-report.md`.
