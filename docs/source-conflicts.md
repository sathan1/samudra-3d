# Source conflicts and missing material

Authority: original handbook, physical pages 1-14. Supporting DOCX and PPTX do not override it. The Phase 01 user instruction supplies truthful-state and verification requirements. Original files remain unchanged.

| ID | Source finding | Resolution / owner | State |
| --- | --- | --- | --- |
| C01 | Contents p. 2 advertises 53+ pages and appendices A-H; supplied file has 14 pages. | Use physical pages. See missing-section inventory below. Owner: all phases, final audit 15. | Recorded gap |
| C02 | pp. 5-6 use MODEL - OBSERVED; p. 11 worked example reverses this. Negative wireframe delta denotes under-prediction. | MODEL - OBSERVED throughout, as explicitly requested. 18.5 - 19.1 = -0.6 °C. Numerical verification belongs to 13, downstream 14-15. | Resolved convention |
| C03 | p. 8 scaffolds latest React and shows clipped install text ending `aut`; Tailwind init syntax is for v3. | Manually scaffold React 18.3.1, Vite 8.3.0, plugin-react 6.1.1, Tailwind 3.4.17 + PostCSS/autoprefixer. No clipped package name copied. D01. | Resolved in 1 |
| C04 | pp. 8-9,14 use D:\Studies example path. | Use D:\Samudra 3D; frontend only now. Do not initialize backend/venv early. D02. | Resolved in 1 |
| C05 | p. 11 shows active ROMS, 24 floats, 6 gliders, fixed timestamp, example RMSE and 88.4% score. No corresponding data exists. | Explicit unavailable states. Later values must come from actual data. Percentage formula remains undefined; owner 14/15. | Shell resolved; formula gap |
| C06 | p. 3 4D KD-tree and pp. 6,13 trilinear language do not specify time/scaling/tolerances. | Document candidate search separately from interpolation; no mixing raw degrees, metres, seconds. Analytical field tests in 13. | Future decision |
| C07 | p. 7 example claims bounding-box slicing but has none; sentinel -999 and all-missing min/max are unsafe; 'zero RAM' is an overstatement. | Actual bounded subsetting, null/mask handling and measured resource use in 4/5; do not copy example as complete service. | Future repair of source example |
| C08 | Real ingestion is central to pp. 3,6,13 but lacks its own roadmap phase. | Allocate Argo to 10, gliders 12, model adapters/real matched pair 13; separate integration readiness in 15. Synthetic demo cannot close real-source gap. | Allocation decision |
| C09 | DOCX and slides 3/6 list Cesium/D3, OPeNDAP, OGC WMS/WCS. Handbook p. 5 selects Three.js and Chart.js/Recharts. | Preserve Three.js + Chart.js. OPeNDAP/OGC tracked as unsupported scope gaps with phase 15 audit; no conformance claims. | Resolved stack; integration gap |
| C10 | p. 12 suggests wildcard CORS and killing any process on port 5173. | Future explicit allowed origins (4/15); use another free port instead of killing unrelated processes (1). | Implementation decisions |
| C11 | p. 11 wireframe combines model/observed curves before roadmap collocation phase 13. | Observed profiles in 11; computed model overlay in 13. Shell opens no modal and invents no curve. | Resolved order |
| C12 | Vision says 6,000m (p. 3), science example 5,000m, roadmap 0-4,000m. Full raymarching language exceeds slice roadmap. | Roadmap 0-4,000m is MVP envelope; respect actual dataset bounds. Full volumetric raymarching/deeper coverage remain explicit scope gaps, audited 15. | Recorded scope gap |
| C13 | p. 4 claims 70% SAR reduction; p. 13 pitch claims real-time integration, performance and deployment. Slides 2/5 claim low hardware needs and operational benefits. | Treat as aspirations, not verified capability. Benchmarks and validated impact evidence required before claims (15). | Unverified claims |
| C14 | Prior planning suggests malformed Python init/URLs from extracted text. Actual rendered pp. 9,14 show valid `__init__.py` and `http://` text. | This is an extraction artifact, not a handbook defect. Preserve correct syntax in future implementation. | Corrected planning interpretation |
| C15 | Slide 6 calls its two workflow stages 'PHASE 1' and 'PHASE 2'. | These are conceptual stages, not replacements for the 15 roadmap rows. | Resolved |
| C16 | PPTX slide 7 footer says 6; slide 1 includes an old 2022 SIH logo alongside 2026 branding. | Refer to physical slide order 1-7. Use text identity SIH26067 / Nexus Nova, no copied year-inconsistent logos. | Resolved presentation reference |

## Missing-section inventory

| Contents entry on p. 2 | Actual supplied coverage | Owner and handling |
| --- | --- | --- |
| 12 Complete backend implementation | Absent; only p. 7 slicer sample and p. 9 tree | 3/4/10/12/13/14: engineer and test from actual requirements |
| 13 Complete frontend implementation | Absent; tree, roadmap and wireframe only | 1/2/5-15: implement incrementally |
| 14 Real ocean ingestion | No dedicated chapter; vision/diagram and slide 7 references only | 10/12/13/15: provenance and separate integration gate |
| 15 Collocation | Brief explanation exists under heading 16 on physical p. 11 | 13: explicit algorithm policy and independent tests |
| 16 Performance guide | No dedicated guide; targets and disposal hint pp. 6,12 | 2/4/5/9/13/15: measured tests |
| 18 QA matrix | Absent | Every phase: acceptance checklist from user instructions; 15 final audit |
| 19 '20+ scenarios' | Five rows on p. 12 | 1/4/15: record actual issues and fixes, no invented source scenarios |
| 20 Security / 21 Deployment | Dedicated chapters absent | 4/15: explicit engineering decisions; no current readiness claim |
| 23 '40+ questions' | Only four on physical p. 13 | 15: evidence-backed Q&A, clearly authored additions |
| 25 Checklist and 7-day sprint | Absent | 1: phase status; 15: audit. No fabricated sprint commitments |
| Appendices A-H | Absent | 15: preserve gap; request missing originals only if necessary |

No missing content prevents a Phase 1 shell. Mapping a future gap does not waive its eventual acceptance requirement.
