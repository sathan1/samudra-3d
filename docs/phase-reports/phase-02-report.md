# Phase 02 report

## Identity and status

- Phase 2 of 15: **Three.js 3D Earth Globe & OrbitControls**, handbook classification MUST HAVE.
- Report version 1, 2026-09-12, 08:45 IST (Asia/Calcutta, UTC+05:30).
- Implementation result: **PASS**. Independent review result: **PENDING**.
- Workspace: `D:\Studies\SIH\Samudra 3D`. No Git repository; non-Git baseline: `docs/evidence/phase-01/implementation-manifest-20260912-084358.json` (42 files, all hashes verified).
- Previous-phase gate: Phase 1 implementation PASS, explicit user acceptance received 2026-09-12.
- Authority: complete 14-page handbook; roadmap physical p. 10; supporting detail pp. 6-7, 9-11. Supporting sources: Problem statement DOCX, SIH2026-IDEA-Presentation.pptx (all slides and notes).
- Source file hashes verified: 36 entry-inventory files unchanged (`check-baseline.py` PASS). Phase-prompts and reference docs preserved.

## Work and baseline

On entry, Phase 1 shell (React 18 + Vite + Tailwind) was confirmed PASS with `OceanCanvas.jsx` holding only a viewport placeholder boundary (no Three.js). No `three` package was installed.

Phase 2 implements the interactive 3D WebGL Earth globe with realistic offline bathymetric texturing centered on the Indian Ocean basin, with OrbitControls, WebGL fallback, resource cleanup, and responsive resizing. No ocean scalar fields, Argo observations, depth slicer, or backend data connections are implemented — those belong to Phases 3–7.

Runtime: Windows 10.0.26200 x64; PowerShell 7.6.5; Node 24.19.0; npm 11.17.0; React/react-dom 18.3.1; Vite 8.3.0; **three 0.168.0**; OrbitControls (three/examples/jsm); @playwright/test 1.63.0; Edge 153.0.4234.32 (Chromium headless). Python 3.x for source/baseline scripts only.

## Changed files

| File | Change | Purpose | Requirement | Prior work preserved |
| --- | --- | --- | --- | --- |
| `frontend/package.json` | Modified | Add `three 0.168.0` runtime dependency | H02/H16 | Yes |
| `frontend/src/utils/coordinates.js` | Added | Geographic ↔ Cartesian conversion, vertical exaggeration policy | H23 | Yes |
| `frontend/src/utils/earthTexture.js` | Added | Procedural offline 2048×1024 bathymetric texture + atmosphere shader | H02/H16 | Yes |
| `frontend/src/components/OceanCanvas.jsx` | Modified | Three.js scene, WebGLRenderer, camera, OrbitControls, lights, globe, teardown | H02 | Yes |
| `frontend/src/App.jsx` | Modified | Phase label updated PHASE 02 / 3D EARTH GLOBE; status notice updated | H17 | Yes |
| `frontend/src/index.css` | Modified | Viewport canvas container, HUD badge, HUD button, globe wrapper CSS | H17 | Yes |
| `frontend/playwright.config.js` | Modified | Channel changed from `chrome` to `msedge` (Chrome not installed; D16) | U03/U05 | Yes |
| `frontend/tests/globe.spec.js` | Added | Phase 2 E2E: globe render, rotate, zoom, resize, teardown, WebGL fallback | U05 | Yes |
| `frontend/tests/shell.spec.js` | Modified | Regression for Phase 1 layout/focus/theme; Tab sequence updated for Reset View button | U05 | Yes |
| `frontend/tests/test-coordinates.mjs` | Added | Unit tests for coordinate anchors, depth mapping, exaggeration policy, roundtrip | H23 | Yes |
| `scripts/check-baseline.py` | Modified | Updated dependency assertion to permit `three` (D17) | U01/U02 | Yes |
| `scripts/record-command.ps1` | Modified | Made phase and working-directory configurable via parameters | U06 | Yes |
| `docs/acceptance-phase-02.md` | Added | Pre-implementation acceptance checklist AC01–AC10 | U06 | Yes |
| `docs/decisions.md` | Modified | Added D12–D17 for three pin, coordinates, exaggeration, texture UV, browser channel | U02 | Yes |
| `docs/phase-status.md` | Modified | Phase 2 updated to PASS/PENDING | U06 | Yes |
| `docs/phase-reports/phase-02-report.md` | Added | This report | U06 | Yes |

SHA-256 baseline: `docs/evidence/phase-01/implementation-manifest-20260912-084358.json` (42 files, all hashes verified at generation). Phase 1 original evidence directory remains intact and unchanged.

## Requirement and acceptance traceability

| Requirement ID | Source and physical page | Acceptance criterion | Implementation file | Verification ID | Result |
| --- | --- | --- | --- | --- | --- |
| H02 | Handbook p. 10 roadmap row 2 | Three.js globe + OrbitControls; rotate, zoom, resize; Indian Ocean orientation | OceanCanvas.jsx | AC04 | PASS |
| H16 | Handbook pp. 1,3,5 | three.js installed, correct version, no substitute framework | frontend/package.json; check-environment | AC03 | PASS |
| H17 | Handbook p. 9 | Header, phase label, canvas occupying viewport slot | App.jsx, OceanCanvas.jsx | AC04 | PASS |
| H23 | Handbook pp. 6-7 | `X=r·cos(lat)·sin(lon)`, `Y=r·sin(lat)`, `Z=r·cos(lat)·cos(lon)` in radians; depth reduces radius; 20–50× visual exaggeration | coordinates.js | AC02 | PASS |
| H25 | Handbook p. 6 | 60 FPS is a handbook target; measured and reported honestly | Browser perf measurement | AC08 | PASS (165 FPS measured, target noted separately) |
| H29 | Handbook p. 12 | WebGL unavailable → readable fallback; no crash | OceanCanvas.jsx fallback branch | AC05 | PASS |
| U03 | User requirement | Production build exits 0; lint exits 0; locked install | `npm run build`, `npm run lint` | AC09 | PASS |
| U05 | User requirement | Browser tests including rotate, zoom, resize, teardown, fallback | globe.spec.js, shell.spec.js | AC04/AC06/AC07 | PASS (8/8) |
| D16 | Implementation decision | `msedge` channel recorded as deviation; Chrome absent; Edge valid | playwright.config.js, evidence | AC10 | PASS (recorded) |

## Executed checks

| Check | Exact command | Working directory | Actual result | Exit code | Evidence |
| --- | --- | --- | --- | --- | --- |
| Install three 0.168.0 | `npm install --prefer-offline` | `frontend/` | 1 package added, 214 packages audited, 0 vulnerabilities | 0 | `20260911-115529-337-install-three.txt` |
| Coordinate unit tests | `node tests/test-coordinates.mjs` | `frontend/` | 7/7 anchors and policies verified; ALL PASSED | 0 | `20260911-115619-290-coordinate-tests.txt` |
| Environment check | `node tests/check-environment.mjs` | `frontend/` | All 11 direct pins match installed+lock; React 18.3.1; three 0.168.0 | 0 | `20260911-120030-787-check-environment.txt` |
| Lint (final) | `npm run lint` | `frontend/` | No problems, zero warnings | 0 | `20260911-120551-795-lint-clean-check.txt` |
| Production build (final) | `npm run build` | `frontend/` | 26 modules; CSS 15.14 kB gzip 4.36; JS 652.22 kB gzip 174.41; 807ms | 0 | `20260911-120650-143-build-production-final.txt` |
| Playwright suite (8 tests) | `npm run test:browser` | `frontend/` | 8/8 passed: 3 globe tests + 5 shell regression tests; 47.8s total | 0 | `20260911-121743-801-playwright-browser-suite-2.txt` |
| Browser FPS measurement | `page.evaluate(rAF loop 1s)` | Headless Edge 153 | 165 FPS measured; avgFrameTime 6.04ms; 166 frames | PASS | `performance-measurements.json` |
| Source preservation | `python scripts/check-baseline.py` | `D:\Studies\SIH\Samudra 3D` | 36 entry hashes unchanged; 15 roadmap rows; 55 IDs; PASS | 0 | `20260912-...check-baseline-phase02.txt` |
| SHA-256 baseline | `python scripts/snapshot-baseline.py` | `D:\Studies\SIH\Samudra 3D` | 42 files snapshotted and verified | 0 | `implementation-manifest-20260912-084358.json` |

### Visual QA (Playwright screenshots, all in `docs/evidence/phase-02/`)

| Screenshot | Content observed | Pass/Fail |
| --- | --- | --- |
| `01-desktop-indian-ocean.png` | 1440px: Indian Peninsula, Arabian Sea, Bay of Bengal, Indian Ocean Basin labels clearly visible; Indian Ocean centered; HUD with "Centered: Indian Ocean Basin (5°N, 75°E)" | PASS |
| `02-rotated-globe.png` | Globe rotated ~150px left/50px down; different longitude slice visible | PASS |
| `03-zoomed-globe.png` | Globe zoomed in; India/Arabian Sea fill larger portion of viewport | PASS |
| `04-reset-view.png` | Camera returned to Indian Ocean default after Reset View click | PASS |
| `05-light-theme.png` | Globe renders correctly in light theme (dark ocean background maintained inside canvas) | PASS |
| `06-laptop-1024.png` | 1024px: Globe visible; responsive layout; no overflow | PASS |
| `07-tablet-768.png` | 768px: Dashboard reflows to 2-column; globe visible | PASS |
| `08-mobile-390.png` | 390px: Single-column; canvas present and sized | PASS |
| `09-webgl-fallback.png` | WebGL disabled: "WebGL Acceleration Unavailable" fallback message shown | PASS |

### Coordinate anchor verification (`test-coordinates.mjs`)

| Anchor | Expected | Verified |
| --- | --- | --- |
| `geoToCartesian(0, 0, 0)` | `(0, 0, 100)` = +Z | ✔ |
| `geoToCartesian(0, 90, 0)` | `(100, 0, 0)` = +X | ✔ |
| `geoToCartesian(90, 0, 0)` | `(0, 100, 0)` = +Y (North Pole) | ✔ |
| `geoToCartesian(-90, 0, 0)` | `(0, -100, 0)` = -Y (South Pole) | ✔ |
| Depth 4000m at r=100 globe | `r = 98.116` (delta 1.884 units) | ✔ |
| Roundtrip Cartesian↔Geographic (4 Indian Ocean coords) | All lat/lon within 1e-4°, depth within 0.1m | ✔ |
| Exaggeration policy 20×–50× | 4000m subsurface r stays within visual bracket | ✔ |

## Regression and performance evidence

Phase 1 regression: all 5 shell tests (1440/1024/768/390/320px) passed with the updated Tab sequence (Reset View button now in DOM tab order). Canvas count was updated from 0 to expect 1 visible WebGL canvas. No Phase 1 style, layout, accessibility, or theme behaviour was changed.

Performance measurements (headless Edge 153, Chromium, 16 hardware threads, Windows 10):
- **Measured FPS: 165** (166 frames in 1003ms)
- **Average frame time: 6.04ms**
- Handbook target: 60 FPS. Measured value exceeds target in headless context. GPU workload in real browser may vary; no claim of GPU-accelerated production FPS is made from this headless run.
- Three.js draw calls per frame: captured in renderer.info.render.calls (live HUD displayed in app).
- JS bundle: 652.22 kB (174.41 kB gzip). This is larger than the Phase 1 149 kB due to Three.js core being included.

## Data and scientific decisions

Data mode: **NONE / NOT CONNECTED**. No synthetic datasets, real NetCDF files, Argo profiles, API endpoints, or model outputs exist. The globe texture is procedurally generated in browser from hard-coded geographic polygon coordinates; it is a visual aid and carries no scientific accuracy claims.

Coordinate convention: `X = r·cos(lat)·sin(lon)`, `Y = r·sin(lat)`, `Z = r·cos(lat)·cos(lon)` in radians, as specified in handbook pp. 6-7. Depth is positive downward (increasing from surface at 0m).

Vertical exaggeration: 30× applied only to 3D scene geometry. Physical depth values stored and served in true metres. Future phases must use `geoToCartesian(lat, lon, depthMeters)` with the same exaggeration constant to maintain visual consistency.

Delta sign convention: `MODEL – OBSERVED` (from Phase 1 D05). No delta computation in this phase.

## Deviations and unresolved gaps

| ID | Requirement/source | Difference | Why | Impact | Decision/owner | Gate effect |
| --- | --- | --- | --- | --- | --- | --- |
| D16 | U05/U03 browser testing | Edge (msedge) used instead of Chrome | Chrome not installed on machine; Edge 153 is Chromium-based and provides equivalent runtime | Minimal; same Blink/V8 engine. No known rendering difference for Three.js canvas. | D16; Phase 2 resolved | None |
| D17 | check-baseline.py guard | Assertion updated to allow `three` | Phase 1 guard was intentionally strict to prevent premature library addition. Phase 2 authorises Three.js per H16. | Clarifies expected scope growth; still blocks any unauthorised additional packages | D17; Phase 2 resolved | None |
| C02 | H23 vertical exaggeration visual-only policy | 30× default chosen within 20–50× band | No specific value mandated; 30× produces visible subsurface layers without extreme distortion | Visual appearance; future depth slices in Phase 7 must use same constant | D14; owner Phase 7 | No blocker |
| C01 | Missing handbook chapters (demo Q&A, full volumetrics, operational predictions) | Not in scope of Phase 2 | Explicit Phase 15 gap; Phase 2 only owns H02 | No Phase 2 impact | D08; Phase 15 | No blocker |

## Handoff

- **Completed capabilities**: Interactive 3D Earth globe centred on the Indian Ocean. Rotate, zoom, pan via OrbitControls. Procedural offline bathymetric texture (India, Arabian Sea, Bay of Bengal, Indian Ocean Basin, East Africa, Southeast Asia, Australia, ridges, graticules). Atmospheric rim glow. Reset View HUD button. Responsive resizing (desktop → mobile). WebGL unavailable fallback banner. Clean resource teardown on unmount. Reusable geographic coordinate conversion utilities for all future phases.
- **Required checks passed / failed / not run**: AC01 PASS · AC02 PASS · AC03 PASS · AC04 PASS · AC05 PASS · AC06 PASS · AC07 PASS · AC08 PASS (165 FPS measured; handbook 60 FPS is a target) · AC09 PASS · AC10 PASS.
- **Report path**: `docs/phase-reports/phase-02-report.md`
- **Evidence paths**: `docs/evidence/phase-02/` (9 screenshots, performance-measurements.json, all command logs, commands.jsonl)
- **Reviewer checks requested**: Open browser to development server (`npm run dev`) and verify: (a) Indian Ocean visible on load; (b) drag to rotate, scroll to zoom, right-click to pan function smoothly; (c) "Reset View" restores default orientation; (d) window resize maintains globe aspect ratio; (e) disabling WebGL in DevTools shows readable fallback.
- **Known risks or assumptions**: Measured 165 FPS is in headless Chromium context. GPU-accelerated rendering on end-user machine may differ. Production bundle is ~174 kB gzip due to Three.js core.
- **Specific corrections still required**: None. All AC checks passed.
- **Next phase prerequisites**: Phase 3 (Synthetic NetCDF Generator) requires Python backend directory at `backend/sample_data/generate_synthetic_data.py`. Backend directory does not exist yet. Phase 1/2 gate is fully satisfied.
- **Advancement**: PENDING REVIEW

---

**Phase 2 is ready for cross-check.**

```
Phase: 2
Implementation: PASS
Review: PENDING
Report: docs/phase-reports/phase-02-report.md
Evidence: docs/evidence/phase-02/
Changed files: frontend/package.json, src/utils/coordinates.js, src/utils/earthTexture.js,
               src/components/OceanCanvas.jsx, src/App.jsx, src/index.css,
               playwright.config.js, tests/globe.spec.js, tests/shell.spec.js,
               tests/test-coordinates.mjs, scripts/check-baseline.py,
               scripts/record-command.ps1, docs/acceptance-phase-02.md,
               docs/decisions.md, docs/phase-status.md
Checks passed: AC01-AC10 all PASS (8/8 browser tests, 7/7 coordinate unit tests, build, lint, source preservation)
Checks failed: None
Not run: None
Deviations: D16 (msedge instead of chrome), D17 (check-baseline updated)
Blockers: None
Next: Paste Phase 3 prompt to begin Synthetic NetCDF Generator
```
