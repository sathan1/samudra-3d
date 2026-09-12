# Phase 08 acceptance checklist

Recorded before implementation. Authority: Master Handbook physical pp. 6-7, 9-11; roadmap p. 10; and `phase-prompts/PHASE-08.md`. Preceding Phase 7 implementation is PASS with explicit user authorization to proceed.

1. **AC01 Phase 7 Gate & Baseline Preservation: [PASS]**
   - Verified Phase 7 implementation passed and is accepted.
   - Interactive depth slicer (0m to 4000m), dynamic colormaps (`cmocean thermal` and `cmocean haline`), variable selector, and 3D globe renderer remain fully functional without regressions.
2. **AC02 Metadata Integration & Timestamp Formatting: [PASS]**
   - Ingests model time steps (8 forecast time steps, 0h to 42h at 6h intervals, `2026-09-10T00:00:00Z` to `2026-09-11T18:00:00Z`).
   - Formats timestamps accurately in UTC with forecast lead hours (e.g. `2026-09-10 12:00 UTC (T+12h)`).
   - Clear simulation disclosure: "FORECAST PLAYBACK (SIMULATION)" distinguishing browser forecast animation from live telemetry.
3. **AC03 Interactive Time Controls in Sidebar (`SidebarControls.jsx`): [PASS]**
   - Enabled continuous range slider `input#time` (`min="0"`, `max="7"`, `step="1"`) with `<datalist id="time-ticks">`.
   - Manual stepping buttons: Step Backward (`⏮`), Play/Pause (`▶ Play` / `⏸ Pause`), Step Forward (`⏭`).
   - Speed selector supporting `0.5×` (2,000ms), `1×` (1,000ms), `2×` (500ms).
   - Loop toggle (`Loop Playback` checkbox/toggle).
   - Accessible keyboard controls and ARIA attributes (`aria-label`, `aria-live="polite"`).
4. **AC04 Unified Playback State & Communication Engine (`timeAnimation.js`): [PASS]**
   - Single managed timer with clean pause and unmount teardown (zero timer leaks).
   - Handles single-frame dataset edge cases (disables play button if `totalSteps <= 1`).
5. **AC05 End-of-Sequence & Loop Behavior: [PASS]**
   - When loop is enabled (`loop === true`), automatically wraps from step 7 (T+42h) back to step 0 (T+00h).
   - When loop is disabled (`loop === false`), automatically pauses when step 7 (final frame) is reached.
6. **AC06 Loading / Buffering Protection & Queue Bounding: [PASS]**
   - If network loading is slower than playback speed, playback delays advancing until the in-flight frame completes, preventing unbounded request queues.
   - Stale/out-of-order response rejection with `AbortController` and sequence counter (`fetchIdRef`), ensuring scalar field mesh and HUD time badge never desynchronize.
7. **AC07 Variable & Depth Coherence: [PASS]**
   - Preserves active variable (`temperature` / `salinity`) and active depth (`0m` to `4000m`) during playback.
   - Modifying variable or depth during playback immediately updates subsequent frames at the new setting without stalling or crashing.
8. **AC08 Viewport HUD Time Readout (`OceanCanvas.jsx`): [PASS]**
   - Real-time HUD badge displays active UTC timestamp, forecast lead time, and step indicator: `TIME: 2026-09-10 12:00 UTC (T+12h) [STEP 3/8]`.
   - WebGL render performance remains >60 FPS (166 FPS measured in browser).
9. **AC09 Automated Test Suites (Unit & Playwright): [PASS]**
   - Unit test suite `frontend/tests/test-time-animation.mjs` verifying timestamp formatting, speed interval math, loop wrapping, and state transitions passed 100%.
   - Playwright test suite `frontend/tests/time.spec.js` passed 100%.
   - Captured 4 visual evidence screenshots in `docs/evidence/phase-08/`:
     - `01-initial-time-00h.png`
     - `02-step-forward-12h.png`
     - `03-playing-state-24h.png`
     - `04-loop-end-or-final-42h.png`
10. **AC10 Phase 7 Regression & Phase 8 Handoff: [PASS]**
    - `npm run build` and `npm run lint` clean (0 errors, 0 warnings).
    - Full Playwright suite (20/20 tests) passed with exit code 0.
    - Updated `decisions.md` (D43–D47), `phase-status.md`, `check-baseline.py`, and created `docs/phase-reports/phase-08-report.md`.
