# Phase 03 acceptance checklist

Recorded before implementation. Authority: Master Handbook physical pp. 3-4, 7, 9-10; section 11 roadmap p. 10; and `phase-prompts/PHASE-03.md`. Preceding Phase 2 implementation is PASS with explicit user authorization to proceed.

1. **AC01 Phase 2 Gate & Source Integrity:** Verify Phase 2 implementation passed and is accepted. Pre-existing entry sources, Phase 1 artifacts, and Phase 2 Three.js globe remain intact.
2. **AC02 Rectilinear 4D NetCDF Domain:** Define rectilinear Indian Ocean grid with axes `time` (8 forecast steps, 6-hour interval), `depth` (9 depth layers from 0m surface down to 4000m abyss), `lat` (0° to 25°N), and `lon` (65° to 95°E).
3. **AC03 CF-1.8 Compliant Coordinates & Variable Metadata:**
   - Standard CF-1.8 attributes, coordinates, and standard names.
   - `time` (hours since 2026-09-10 00:00:00 UTC, proleptic_gregorian).
   - `depth` (units: metres, `positive="down"`).
   - Variables: `temperature` (degC), `salinity` (PSU / 1), `u_current` (m/s eastward), `v_current` (m/s northward).
   - Global provenance metadata: `Conventions="CF-1.8"`, `synthetic="true"`, `seed="42"`, `generator_version="1.0.0"`.
4. **AC04 Thermocline & Oceanographic Profile Modeling:**
   - Realistic thermocline model: warm surface mixed layer (28°C–29°C), steep thermocline drop between 50m and 200m, abyssal cold (~2°C at 4000m).
   - Stratified halocline (practical salinity 33.5–36.5).
   - Ocean currents with peak surface speed and depth decay.
5. **AC05 Land Mask & Sentinel Error Fixtures:**
   - Landmass points (Indian subcontinent coordinates) masked with standard fill values (`_FillValue = -999.0` / NaN).
   - Deliberately tagged sentinel fixtures for later error handling and outlier tests.
6. **AC06 Normalized In-Situ Observation Contract (`argo_profiles.json`):**
   - Structured JSON schema containing Argo floats and Underwater Glider observations.
   - Stable IDs (`ARGO_2902145`, `ARGO_2902198`, `GLIDER_INCOIS_04`), UTC timestamps, positions within domain.
   - Strictly monotonic positive-down depths with temperature, salinity, and quality flags (QC=1 good, QC=4 test bad).
   - Extensible normalized schema ready for Phase 10 (Argo pins) and Phase 12 (Glider sawtooth).
7. **AC07 Deterministic Regeneration:**
   - Generating the dataset twice produces bitwise identical decoded numerical arrays (dimensions, coordinates, and variable values match exactly).
8. **AC08 Backend Dependency Management & Automated Test Suite:**
   - Create `backend/requirements.txt` with verified direct package versions (`netCDF4`, `numpy`, `scipy`, `fastapi`, `uvicorn`).
   - Create `backend/tests/test_synthetic_data.py` testing NetCDF4 creation, shape, monotonicity, thermocline gradient, land mask, and observation contract.
9. **AC09 Compact File Footprint & Performance:**
   - Dataset file size under 10 MB for rapid slicing and lightweight local loading.
   - Generation script completes in < 5 seconds.
10. **AC10 Traceability, Evidence & Phase Status:**
    - Record exact commands and test output under `docs/evidence/phase-03/`.
    - Update `phase-status.md`, `decisions.md`, and generate `docs/phase-reports/phase-03-report.md`.

Final outcome (2026-09-12): AC01-AC10 PASS, independent review PENDING. Bit-for-bit deterministic regeneration verified. All 4D dimensions, CF-1.8 attributes, monotonic coordinates, thermocline profiles, land mask, and in-situ observation contracts validated. See docs/phase-reports/phase-03-report.md for complete evidence.
