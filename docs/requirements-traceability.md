# Requirements traceability

H = controlling handbook, always physical page. S = supporting DOCX/PPTX addition or clarification. U = explicit user execution requirement. D = engineering decision. Future acceptance checks below are planned, not executed. Phase 1 verification is in the report. Assigning an owner does not imply implementation or approval of future expansion.

## Handbook roadmap (H, physical p. 10)

Titles and classifications transcribed in original row order. Phase 1 is the only current implementation.

| ID | Owner phase | Original milestone | Classification | Files / future boundary | Acceptance check |
| --- | --- | --- | --- | --- | --- |
| H01 | 1 | Basic React Shell & Layout Setup | MUST HAVE | frontend/src/App.jsx, frontend/tailwind.config.js | AC01-10: sources, layout, build/lint, browser and handoff |
| H02 | 2 | Three.js 3D Earth Globe & OrbitControls | MUST HAVE | frontend/src/components/OceanCanvas.jsx | Rotate/zoom/resize; geographic anchors +Z/+X/+Y; WebGL fallback and teardown |
| H03 | 3 | Synthetic Ocean NetCDF Generator | MUST HAVE | backend/sample_data/generate_synthetic_data.py | Regenerate and reopen known values, axes, units, masks and provenance |
| H04 | 4 | FastAPI Endpoints (/api/ocean-data, /api/metadata) | MUST HAVE | backend/app/main.py | Slice-to-xarray value agreement; bounds/errors, strict JSON, bytes and latency |
| H05 | 5 | 3D Scalar Temperature Field Rendering | MUST HAVE | OceanCanvas.jsx (BufferGeometry + Shaders) | Known corner gradient/orientation, visible subsurface slice, masks, disposal |
| H06 | 6 | Dynamic Thermal/Haline Color Mapping | MUST HAVE | frontend/src/utils/colormaps.js | Min/mid/max palette agreement with legend; variable units and race handling |
| H07 | 7 | Interactive Depth Slicer (0m to 4,000m) | MUST HAVE | SidebarControls.jsx, api.js | Surface/intermediate/4000m selection against API, inward radius, stale-response checks |
| H08 | 8 | Time Animation Playback Controls | MUST HAVE | SidebarControls.jsx (Auto-play interval hook) | Known time frames, play/pause, UTC labels, buffering and timer cleanup |
| H09 | 9 | 3D Current Vector Particle Streamlines | GOOD TO HAVE | OceanCanvas.jsx (InstancedMesh particles) | East/north/zero fixtures, u=3 v=4 gives speed 5 m/s; frame-independent bounded particles |
| H10 | 10 | Clickable 3D Argo Float Markers | MUST HAVE | OceanCanvas.jsx (Raycaster + Billboard Pins) | Positions/IDs/QC, ray selection and keyboard alternative, occlusion, honest source mode |
| H11 | 11 | Vertical Depth Profile Modal Curves | MUST HAVE | frontend/src/components/ProfileModal.jsx | Observed points against source, depth positive down, units/gaps and modal focus |
| H12 | 12 | Underwater Glider Sawtooth Transects | GOOD TO HAVE | OceanCanvas.jsx, routes_insitu.py | Actual dive/surface coordinates, ordered time, gaps and point/profile identity |
| H13 | 13 | Model vs. Observation Collocation Engine | MUST HAVE | backend/app/services/collocation.py | Analytic affine-field interpolation; masks/tolerances; MODEL - OBSERVED sign and metrics |
| H14 | 14 | 3D Difference Field & Anomaly Heatmap | GOOD TO HAVE | ComparisonPanel.jsx, main.py | Signed diverging colors, known threshold cases, support/coverage holes, traceable inputs |
| H15 | 15 | AI Ocean Assistant & SIH Packaging | ADVANCED | AIAssistantModal.jsx, docker-compose.yml | Grounded fixture-backed answers, full regression, clean setup, container evidence and final audit |

## Detailed handbook requirements beyond roadmap labels

| ID | Source | Requirement / distinction | Owner phase | Acceptance check or documented gap |
| --- | --- | --- | --- | --- |
| H16 | pp. 1,3,5 | React 18/Vite, Three.js/WebGL2, FastAPI/Uvicorn, xarray/netCDF4/SciPy, Chart.js or justified Recharts | 1/2/3/4/11/13 | Actual package/runtime versions; no Cesium/D3 substitution; current frontend AC03 |
| H17 | pp. 1,9,11 | SAMUDRA-3D / SIH26067 / Nexus Nova identity; header/theme/status, left controls, central viewport, right inspector | 1 | AC04/07/08; Header, SidebarControls, OceanCanvas, ComparisonPanel |
| H18 | p. 9 | Component/service/utility boundaries and frontend main/App/styles/config | 1 | All seven named component files plus services/api.js and utils/colormaps.js; future functions unavailable |
| H19 | pp. 8,14 | Windows PowerShell development, setup and runnable frontend | 1 | README clean npm ci/build/dev/preview; actual path; AC03/05 |
| H20 | pp. 3-4 | Visualize precomputed models; never solve fluid physics in browser | 3/4/5/15 | Source provenance and architecture review; no simulator or hazard-prediction claim |
| H21 | pp. 3,6 and architecture diagram | ROMS/NEMO, Copernicus and Argo/glider multi-source ingestion | 10/12/13/15 | Document source/license/time/QC, compare real-file values; currently no real files or credentials |
| H22 | pp. 3,6-7 | Temperature °C, practical salinity, u east/v north in m/s, speed sqrt(u²+v²), lat/lon/depth/time | 3/4/6/9/13 | Known units, axes, UTC, positive-down depth and speed fixtures; reject unsupported conversion |
| H23 | pp. 6-7 | X=r cos(lat) sin(lon), Y=r sin(lat), Z=r cos(lat) cos(lon); r=R-depth×exaggeration; 20-50x visual exaggeration | 2/5/7/12 | Radians, consistent units, axis anchors and inward depth; visual exaggeration never changes science |
| H24 | pp. 6-7,13; diagram | Lazy subsetting/chunking (diagram mentions Zarr), bounded JSON, not raw multi-GB NetCDF to browser; in-memory cache | 4/8/15 | Actual spatial/depth/time slicing; bounds/cache limits, memory and payload measurements. Zarr storage optional implementation choice, not current support |
| H25 | pp. 3,5-6,11,13 | 60 FPS, sub-second service/collocation, JSON <50 KB are targets | 2/4/9/13/15 | Measure dataset/workload/hardware/browser, payload bytes and latency distributions; no current measured science/performance claim |
| H26 | pp. 6,11,13 | 4D collocation, trilinear interpolation, residual and anomaly pipeline | 13/14 | C02/C06; affine-field fixture, explicit time/distance policies, missing data/no extrapolation |
| H27 | pp. 9,11,13 | Model and observed profiles, delta inspector, model health and RMSE | 11/13/14 | Observed curve in 11, real model curve in 13, computed metrics in 14; 88.4% formula gap C05 |
| H28 | p. 12 | Three-person ownership: A frontend, B API/math, C data/QA/docs | 1/15 | Preserve role mapping in source audit; no invented named members or staffing commitments; final file ownership handoff |
| H29 | p. 12 | Environment troubleshooting, CORS, disposal and occupied port handling | 1/2/4/5/15 | Runtime check; alternate port; dispose GPU assets later, configured origins; C10 |
| H30 | pp. 12-13 | Five-minute demo, four supplied Q&As despite 40+ heading, deployment/extensibility claims | 15 | Timed truthful demo tied to final evidence; missing questions recorded C01; no current demo claim |
| H31 | pp. 3-5 | Full 6000m/global water-column volumetrics/raymarching exceeds 4000m slice roadmap | 5/7/15 | MVP slices per H05/H07; full volumetrics and deeper coverage explicit gap C12, final readiness audit |
| H32 | pp. 3-4,13 | CTD/BGC/chlorophyll, HF radar, ADCP, moored buoys and generic CF-NetCDF/GeoJSON expansion | 10/12/15 | Modular observation contract; those extra adapters unimplemented future scope; no arbitrary-format claim |
| H33 | pp. 4,13 | TCHP/26°C isotherm, cyclone warnings, PFZ, SAR/oil spill impact, 70% reduction | 15 | Unverified operational scope gap; no prediction algorithms or outcome claims without scoped implementation and independent validation |
| H34 | pp. 5,13 | Existing-system comparisons and 100% browser access | 1/15 | Run local browser shell; final claims audit must reverify comparisons; no claim that alternatives do not exist |
| H35 | p. 2 vs pp. 1-14 | Missing complete implementation, QA, security, deployment, sprint, appendix material | 1/15 | AC01/02: explicit inventory in source-conflicts.md, no fabricated missing text |

## Supporting-source additions and clarifications

The DOCX body and embedded architecture image and all seven PPTX slides/notes/media were inspected. Duplicates map to handbook rows explicitly; extra obligations below do not change roadmap order/classification.

| ID | Supporting source | Requirement / claim | Owner phase | Acceptance check or documented gap |
| --- | --- | --- | --- | --- |
| S01 | DOCX problem/needs; slides 1-3 | Browser 3D, rotate/zoom, variable/depth/time, clickable observations and profiles, INCOIS focus | 1/2/5-13 | AC04 and H02/H05-H13; combined model/observation journey in 15 |
| S02 | DOCX existing solutions | Honest positioning: existing solutions do exist; simplify comparison | 1/15 | No 'first/only/no existing system' claims; final claims audit |
| S03 | DOCX technical table/image; slides 3/6 | React, Three/Cesium, FastAPI/xarray/NetCDF, Chart/D3, REST/OPeNDAP, OGC/CF | 1/3/4/11/15 | H16 governs stack; REST in 4; CF metadata tests in 3/13; OGC WMS/WCS and OPeNDAP unsupported gap audited 15 |
| S04 | DOCX unique features; slide 6 comparison graphic | Bias, MAE, RMSE on aligned model/observed pairs | 13 | Residuals [-1,0,2]: bias 1/3, MAE 1, RMSE sqrt(5/3); per variable units/count/scope |
| S05 | DOCX unique features; slide 6 anomaly graphic | Automatic anomaly detection with statistical baseline and regional observation coverage | 14 | Known threshold and insufficient-sample tests, sparse support/coverage holes; discrepancy is not a proven hazard |
| S06 | DOCX model health | Overall model performance score | 14/15 | H27/C05: formula or explicit deferred gap; never copy illustrative percentage |
| S07 | DOCX AI example; slide 6 AI graphic | Largest temperature difference and natural-language explanations from structured results | 15 | Grounded extremum/count/provenance fixtures, unavailable/unsupported/provider error checks; label deterministic fallback |
| S08 | Slide 2 | Argo/glider tracking, unified real-time instruments and low hardware needs | 10/12/15 | IDs/paths/provenance/time-window tests; Argo trajectory beyond markers explicit gap, no measured low-hardware/live claim yet |
| S09 | Slide 4 | Chunking, LOD and GPU rendering for large data | 4/5/9/15 | Bounded payload/resolution, geometric/particle budgets and representative resource measurements; LOD policy documented |
| S10 | Slides 4/6 | QC filtering, CF unit/coordinate/time standardization; spatial/temporal alignment | 3/4/10/12/13 | Known invalid/QC flags, units, pressure/depth, timestamp and grid rejection fixtures |
| S11 | Slide 5 | Forecasters, disaster managers, researchers, students/policymakers; fisheries/navigation/rescue/environment benefits; open source/low infrastructure | 15 | Evidence-backed user/demo and deployment audit; marine heatwaves, storm surge, route planning and impact claims unvalidated future scope |
| S12 | Slide 6 workflow diagram | Two conceptual integration/analysis stages, model + Argo/glider through quality, alignment, metrics, anomaly, AI | 3/4/10-15 | End-to-end provenance/QC/known-metric journey; retain 15 engineering phases, C15 |
| S13 | Slide 7 references | INCOIS LAS, Copernicus GLOBAL_MULTIYEAR_PHY_001_030, Ifremer Argo GDAC, OceanGliders v2 | 10/12/13/15 | Verify access, attribution, actual format/coverage and source hashes on ingestion. No retrieval/authentication performed in Phase 1 |
| S14 | DOCX hosting; slide 5 | Cloud/on-prem INCOIS infrastructure | 15 | Local/container readiness separate from actual deployment; infrastructure/credentials currently absent, no publishing authorized |

## User acceptance and current-phase implementation mapping

| ID | Kind | Owner phase | Requirement / files | Check |
| --- | --- | --- | --- | --- |
| U01 | User | 1 | All sources/AGENTS/prior work audit; docs/evidence/phase-01/entry-inventory.json and source audit | AC01 |
| U02 | User | 1 | Requirements/conflicts/decisions/status and complete owner/check coverage | AC02 |
| U03 | User | 1 | Compatible React18/Vite/Tailwind, lock, README/.env.example/.gitignore | AC03/05/06 |
| U04 | User | 1 | Responsive keyboard-accessible shell, truthful status and disabled future controls | AC04/07/08 |
| U05 | User | 1 | Browser console, refresh, screenshots and actual style checks | AC07/08/09 |
| U06 | User | 1 | Evidence, exact commands, template report, non-Git hashes, review PENDING, stop after phase | AC10 |

No source requirement is marked completed merely because a table row exists. H02-H15 and future H/S checks remain NOT STARTED; explicitly named gaps remain OPEN until their owner phase resolves or the user accepts a deferral.
