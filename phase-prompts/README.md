# SAMUDRA-3D phase prompt pack

Start with [PHASE-01.md](PHASE-01.md). Copy its entire contents into another Codex chat opened in this project. It includes the source audit and then builds only Phase 1. No application development was performed while preparing this prompt pack.

After each phase, bring its report back to this chat together with [REVIEW-PROMPT.md](REVIEW-PROMPT.md). A reviewer with project access should inspect the actual files and rerun relevant checks. If you can share only the report, the reviewer must mark code verification as unavailable. Use [CORRECTION-PROMPT.md](CORRECTION-PROMPT.md) in the implementation chat if changes are required, then repeat the review. Proceed to the next numbered prompt after a PASS review. Every phase prompt stops after its own report.

The handbook is the controlling project source. The [source analysis](PROJECT-ANALYSIS.md) explains its incomplete contents, contradictions, supporting-document differences and proposed resolutions. Detailed acceptance criteria and reporting rules in this pack are implementation guidance inferred from the project requirements, not missing handbook text.

| Order | Copy this prompt | Handbook classification |
| --- | --- | --- |
| 1 | [React shell and layout](PHASE-01.md) | MUST HAVE |
| 2 | [Earth globe and orbit controls](PHASE-02.md) | MUST HAVE |
| 3 | [Synthetic NetCDF generator](PHASE-03.md) | MUST HAVE |
| 4 | [FastAPI ocean and metadata endpoints](PHASE-04.md) | MUST HAVE |
| 5 | [3D temperature field](PHASE-05.md) | MUST HAVE |
| 6 | [Temperature and salinity color mapping](PHASE-06.md) | MUST HAVE |
| 7 | [Depth navigation](PHASE-07.md) | MUST HAVE |
| 8 | [Time playback](PHASE-08.md) | MUST HAVE |
| 9 | [Current particles](PHASE-09.md) | GOOD TO HAVE |
| 10 | [Clickable Argo markers](PHASE-10.md) | MUST HAVE |
| 11 | [Vertical profile charts](PHASE-11.md) | MUST HAVE |
| 12 | [Glider transects](PHASE-12.md) | GOOD TO HAVE |
| 13 | [Model versus observation comparison](PHASE-13.md) | MUST HAVE |
| 14 | [Difference field and anomaly heatmap](PHASE-14.md) | GOOD TO HAVE |
| 15 | [Ocean assistant and SIH packaging](PHASE-15.md) | ADVANCED |

The handbook's optional classifications are preserved, but all 15 prompts are included as requested. A phase must not be skipped automatically because its classification is GOOD TO HAVE or ADVANCED.

Other files:

- [All 15 prompts in one file](ALL-PHASE-PROMPTS.md), if you prefer one document. Copy only the current phase section.
- [Report template](REPORT-TEMPLATE.md), used by every implementation phase.
- [Review prompt](REVIEW-PROMPT.md), reused after every phase.
- [Correction prompt](CORRECTION-PROMPT.md), reused when a review requests changes.
- [Source manifest](SOURCE-MANIFEST.json), for detecting changes to the original three documents.

Reports will be created by the implementation chat under `docs/phase-reports/`; review reports under `docs/phase-reviews/`; supporting evidence under `docs/evidence/`. These do not exist yet and this pack does not claim any phase has passed.

The handoff cycle is: implement one phase, run its checks, save its report, independently cross-check, fix and re-check if necessary, then start the next phase. The reviewer reports technical readiness; your next phase prompt supplies authorization to continue.
