# SAMUDRA-3D project source analysis

Assessment date: 11 September 2026. Scope: every original file present in `D:\Samudra 3D` when the request began. This is a requirements and implementation-readiness analysis, not a code audit of an application that already exists.

## Current state

The workspace originally contained exactly three files: the master handbook PDF, a problem-statement DOCX and an idea-presentation PPTX. No frontend, backend, datasets, dependency files, tests, README, AGENTS.md or Git directory were present in the inspected root. Consequently, none of the 15 implementation phases can currently be marked implemented or tested. The `phase-prompts` directory was added for this request; temporary source extraction and inspection files reside under `tmp/source-analysis`.

| Source | Size | What was inspected | Role |
| --- | ---: | --- | --- |
| SAMUDRA-3D_SIH26067_Master_Handbook.pdf | 1,335,462 bytes | All 14 physical pages of text; visual inspection of architecture, roadmap and dashboard pages 6, 10 and 11 | Controlling specification |
| Problem statement.docx | 97,407 bytes | Body and table text extracted from the document XML | Problem scope, supplemental features and positioning |
| SIH2026-IDEA-Presentation.pptx | 5,904,876 bytes | Text from all 7 slides, available notes and embedded raster images, including the workflow image on slide 6 | Supporting proposal, architecture, risks and intended benefits |

The binary source hashes are in SOURCE-MANIFEST.json. The original files were not edited. Layout QA of the DOCX/PPTX was not performed because they are source materials, not outputs being redesigned. Their text and the substantive image workflow were inspected. No remote references were opened, no data sources were authenticated and no external scientific/product/performance claim was independently verified. Statements below about those topics describe supplied requirements or proposed controls, not verified external facts.

## What the project is meant to deliver

The handbook describes a browser-based 3D ocean visualization and analysis application for SIH26067, Team Nexus Nova. Users inspect numerical model fields and in-situ observations together, switch temperature/salinity/current views, navigate depth and time, select Argo/glider observations, inspect vertical profiles and compare model predictions with measurements. It visualizes precomputed ocean model data; it does not solve ocean fluid dynamics in the browser (handbook pp. 3-4).

The preferred stack is React 18 with Vite, Three.js/WebGL, FastAPI/Uvicorn, xarray/netCDF4/SciPy and Chart.js or the handbook's chart alternative (p. 5). The architecture places scientific data loading, subsetting and comparison on the backend and sends bounded display data to the frontend (p. 6). The spherical coordinate formula and 20x-50x visual depth exaggeration are provided on pp. 6-7. The folder layout is on p. 9, the exact 15-phase roadmap on p. 10, and the final dashboard wireframe on p. 11.

The problem-statement document reinforces easy model/observation comparison and explicitly cautions against claiming that no existing solution exists. It additionally calls out observation coverage, a model health score and an assistant. The presentation's slide 6 is a workflow graphic, not text-only content: it specifies ingestion, CF metadata, QC, spatial/temporal alignment, bias/MAE/RMSE, anomaly detection, coverage and AI explanations. Its two broad workflow stages are not a replacement for the handbook's 15 build phases.

## Handbook completeness and conflicts

| Finding and source | Consequence | Resolution used in the prompts |
| --- | --- | --- |
| The PDF contains 14 physical pages. Its contents page points to material through page 53 and appendices A-H. | The listed complete backend/frontend implementations, real-data ingestion chapter, full QA matrix, security/deployment chapters, sprint plan and appendices are not actually supplied in full. | Cite physical pages and visible headings. Mark missing material; define engineering checks as proposed implementation guidance. Do not pretend to have read missing chapters. |
| Section numbering jumps: the roadmap is followed by section 24, then section 16. | Section numbers and contents-page locations are unreliable navigational references. | Pair any heading reference with the physical page. |
| Pages 5-6 define delta as Model - Observed. Page 11's worked example instead uses Observed - Model; its wireframe uses a negative delta for under-prediction. | Signs can disagree among APIs, color bars, charts, alerts and assistant answers. | Proposed project convention: MODEL - OBSERVED. Thus 18.5 - 19.1 = -0.6 means under-prediction. Record this explicit interpretation and test it in Phase 13. |
| Page 3 refers to 4D KD-tree collocation and trilinear interpolation without specifying how time or coordinate distances are handled. | A nearest-neighbor query does not define spatial interpolation, and degrees/metres/seconds cannot be mixed without a policy. | Phase 13 documents candidate search separately from interpolation, temporal policy, tolerances, masks and unsupported grids. Analytical numerical fixtures verify behavior. |
| The p. 7 slicing example claims a bounding-box operation but does not actually implement one; it emits -999 for missing values and can encounter all-missing min/max. | Literal reuse can send oversized data or render missing water as a real extreme. | Phase 4 implements actual subsetting, bounded requests and explicit missing-value serialization; Phase 5 verifies masking. |
| The setup uses a different project path, latest-version scaffolding and a visibly clipped npm install command on p. 8. The tree/quick-start also contain malformed-looking Python init/URL text. | Blind copy/paste is not a reliable installation plan. | Use the actual workspace and valid Python/package syntax, verify compatibility and lock versions. Preserve React 18 unless the user explicitly changes the stack. |
| The troubleshooting table on p. 12 suggests wildcard CORS. | It is too broad as a general production default. | Configure actual allowed development/production origins; log this hardening decision. |
| A full opaque Earth could conceal scalar layers below its radius. | Correct coordinate math alone may produce an unusable subsurface view. | Phase 5 explicitly verifies a visible cutaway/clipping/transparency approach. |
| The p. 11 final wireframe contains model/observed profile curves, but profile charts are Phase 11 and collocation is Phase 13. | Following the wireframe literally in Phase 11 could violate phase order or introduce fake comparisons. | Phase 11 delivers observed curves and an unavailable model-overlay state. Phase 13 activates real computed model curves. |
| Real model/Argo/glider ingestion is central to the vision, but has no dedicated row in the 15-phase build table. | A finished synthetic demonstration could be misrepresented as real-data integration. | Assign supplemental local Argo ingestion to Phase 10, glider ingestion to Phase 12, model adapters/real pair validation to Phase 13, with a final separate readiness gate in Phase 15. This is a proposed allocation, not an additional handbook phase. |
| The wireframe shows a health score of 88.4%, RMSE 0.78 C and fixed observation counts without defining a score formula. | Copying those numbers would fabricate analysis. | Compute error metrics and counts from actual valid pairs. A percentage score requires an explicit experimental formula and scale; otherwise report the widget as deferred. |
| The handbook targets 60 FPS, sub-second matching and JSON slices below 50 KB, and makes impact claims including a 70% SAR search-grid reduction. | Targets and pitch claims are not verified implementation results or scientific evidence. | Benchmark with environment/dataset context, report misses and limit demo claims to supported evidence. Never turn example impact claims into guarantees. |
| Supporting sources list Cesium/D3/OPeNDAP/OGC options; the handbook selects Three.js and lighter chart options for the MVP. | The implementation could drift or claim standards it does not serve. | Keep the handbook's stack. Track OPeNDAP/OGC as unsupported/future until implemented and verified; CF-style metadata alone does not prove full conformance. |

These resolutions preserve the handbook as the scope authority while making internal contradictions visible. A later user decision can revise a convention; the change must identify affected phases, update tests and invalidate stale evidence.

## Phase allocation and required proof

| Phase | Deliverable | Primary completion evidence |
| --- | --- | --- |
| 1 | Source inventory, requirements/decision logs, React dashboard shell | Build, dependency check, responsive/keyboard/browser inspection and complete phase mapping |
| 2 | Earth and camera controls | Geographic anchor checks, rotate/zoom/resize, resource cleanup |
| 3 | Reproducible synthetic model and profile data | Reopened NetCDF values, units/axes/masks, repeatability and known fixture checks |
| 4 | Model metadata and slice API | Response-to-xarray comparisons, error cases, bounds, strict JSON and measured bytes/latency |
| 5 | Visible 3D temperature slice | Known gradient orientation, masked cells, API failure states and screenshots |
| 6 | Temperature/salinity palettes and legend | Palette/legend agreement, units, edge cases and variable-switch race checks |
| 7 | Depth navigation | Actual selected depth, radial direction and out-of-order request checks |
| 8 | Time playback | Known time changes, timer cleanup, slow API behavior and synchronized labels |
| 9 | Current particles | Known east/north/zero fields, 3-4-5 speed check and measured rendering performance |
| 10 | Clickable Argo observations | Position/ID/QC/selection checks; separate real-ingestion status |
| 11 | Observed vertical profiles | Values against source records, depth orientation, gaps and accessible selection/modal behavior |
| 12 | Glider transects | Real depth geometry, ordering/gaps/selection checks; separate real-ingestion status |
| 13 | Collocation, model curves and error metrics | Analytical interpolation tests, sign convention, exclusions, metrics and separate real-pair validation |
| 14 | Residual/anomaly/coverage views | Residual colors, thresholds, sparse support, valid counts and traceable anomaly records |
| 15 | Grounded assistant and packaged demo | Fixture-backed answers, full regression journey, clean setup, deployment checks and final requirement audit |

The handbook classifies Phases 1-8, 10, 11 and 13 as MUST HAVE; 9, 12 and 14 as GOOD TO HAVE; and 15 as ADVANCED. This pack includes all phases as requested. A classification is not permission to skip a phase without recording the user's decision.

## Scientific and integration boundaries

The first demonstrable pipeline should use reproducible synthetic data so rendering and numerical checks have known answers. That does not establish support for arbitrary real-world grids. Each real-source adapter must declare supported coordinate names, units, pressure/depth treatment, time handling, quality flags and grid geometry. Reject unhandled cases explicitly instead of silently coercing them.

Difference maps derived from sparse observations need a stated spatial support policy. No-data regions must remain visible as no-data. A residual threshold identifies a model-observation discrepancy; it does not by itself validate a marine heatwave, cyclone risk, SAR forecast or other operational decision. The assistant can explain computed results and their limits, but cannot invent coverage or causes.

The full-ocean volumetric/raymarching language in the vision is broader than the roadmap's depth-slice implementation. This pack implements the explicit slice roadmap and requires Phase 15 to record whether true volumetric rendering remains absent. Similarly, TCHP calculation, PFZ prediction, oil-spill modelling, OGC service implementation, new sensor families and production INCOIS deployment are not silently added to the 15 phases merely because they appear as potential uses or extensibility claims.

## Report and review contract

Each implementation phase must leave an acceptance checklist, actual test evidence, changed-file inventory, requirement mapping, decisions, limitations and a shareable report. Reports begin as review PENDING. A reviewer checks the current code/data as well as the report, reruns relevant tests and gives PASS, CHANGES REQUIRED or BLOCKED. Missing evidence is not evidence of failure, but it also cannot establish a passing required gate.

If a review finds an issue, use the correction prompt to repair only the affected scope, preserve the old report and rerun affected checks. A later code or source change invalidates the relevant earlier evidence until rechecked. Advancement happens only after a passing review or the user's explicit acceptance of a documented exception. This is the phase-by-phase control requested by the user, not an automatic approval rule from the source documents.
