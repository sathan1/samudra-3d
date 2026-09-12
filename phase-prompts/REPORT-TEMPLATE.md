# Phase NN report

Replace all placeholders with actual facts. Do not leave a template heading as evidence of completed work. Do not mark a check PASS unless executed and supported. Preserve superseded reports when revising.

## Identity and status

- Phase number and handbook title:
- Report version and timestamp with timezone:
- Implementation result: PASS / FAIL / BLOCKED
- Independent review result: PENDING
- Current workspace and branch/commit, or non-Git baseline:
- Previous phase review/acceptance reference:
- Handbook physical pages and supporting source references:
- Source file hashes and whether any changed since the previous phase:

## Work and baseline

Describe what existed on entry, what now works and what remains outside this phase. Record runtime/package versions and relevant environment details. Record pre-existing modifications separately from this phase's changes.

## Changed files

| File | Added/modified/deleted | Purpose | Requirement ID | Unrelated prior changes preserved |
| --- | --- | --- | --- | --- |

Attach a relevant Git diff/status or a SHA-256 manifest of implementation/config/test files for non-Git projects. Do not include credentials, virtual environments, node_modules, generated caches or huge datasets in a diff. Identify dataset hashes separately.

## Requirement and acceptance traceability

| Requirement ID | Source and physical page/slide | Acceptance criterion | Implementation file/location | Verification ID | Result |
| --- | --- | --- | --- | --- | --- |

Distinguish source requirements from implementation decisions and supporting-source additions. Include all current-phase checks, not just successful ones.

## Executed checks

| Check ID | Exact command or browser procedure | Fixture/environment | Expected result | Actual result and exit code | PASS/FAIL/NOT RUN | Evidence path |
| --- | --- | --- | --- | --- | --- | --- |

Include the numerical expected values where relevant. For browser checks, include interactions, observed behavior and screenshots. For unexecuted checks, state why and provide the exact next procedure. Summarize logs honestly and link full useful output. A build result cannot substitute for interaction or scientific-correctness checks.

## Regression and performance evidence

List the previous features/tests affected by this phase, their actual recheck outcomes and any reopened gate. Record measured request latency, payload bytes, FPS/frame time or resource trend only where relevant, with hardware/browser, dataset dimensions, workload, sample count and cold/warm context. State handbook targets separately from measurements.

## Data and scientific decisions

Record dataset/source mode, filenames/hashes, raw source/retrieval metadata, units, coordinate/time/depth conventions, QC/masking policies and supported formats. List changes to delta sign, interpolation, matching tolerances, anomaly thresholds or health-score definition. For early UI-only phases, explicitly state data/science checks are not applicable yet.

## Deviations and unresolved gaps

| ID | Requirement/source | Difference or missing input | Why | Impact and affected phases | Decision/owner | Gate effect |
| --- | --- | --- | --- | --- | --- | --- |

Distinguish required failures from optional enhancements. Preserve all blockers and NOT RUN checks. Do not silently downgrade a required acceptance criterion to optional.

## Handoff

- Completed capabilities:
- Required checks passed / failed / not run:
- Report and evidence paths:
- Reviewer checks requested:
- Known risks or assumptions:
- Specific corrections still required:
- Next phase prerequisites:
- Advancement: PENDING REVIEW / BLOCKED

End with a concise copyable summary for the user to paste into the review chat. Do not start the next phase.
