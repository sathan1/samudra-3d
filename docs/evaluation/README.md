# SAMUDRA-3D Coordinate-on-Demand Architecture — Evaluation Evidence

This folder records **measured** evidence for the SIH26067 evaluation, in line
with the audit that governs the SAMUDRA-3D restructure:

> Do not load the ocean into the globe; use the globe to query the ocean.

No invented numbers are recorded here.  If a metric has not been measured on
hardware the reviewer can reproduce, the entry is marked **NOT MEASURED** and a
reproduction procedure is documented instead.

## Documents

- `architecture.md` — what the globe loads, and what it never loads.
- `data-flow.md` — the coordinate-on-demand request/response sequence.
- `performance.md` — measured payload budgets with reproduction steps.
- `scientific-validation.md` — real-data collocation methods and measured skill numbers.
- `dataset-provenance.md` — dataset identities, licenses, and manifest records.
- `requirement-matrix.md` — SIH26067 requirement coverage with evidence links.
- `api-contract.md` — bounded endpoint reference with request examples and error cases.
