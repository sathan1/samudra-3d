# Reusable phase correction prompt

Apply the phase review findings I am sharing to SAMUDRA-3D in `D:\Samudra 3D`. Determine the phase from the report/review and work only on that phase plus necessary repairs to its existing dependencies. Do not start the next phase.

Read the original handbook as the controlling source, the current phase prompt, implementation report, reviewer findings, acceptance criteria, decisions and current changed files. Preserve original reference documents and unrelated user edits. Use PowerShell and the actual workspace path. Respect accepted scientific conventions and data provenance. If a finding conflicts with the handbook or an explicit user decision, explain the conflict with exact references instead of silently changing the requirement.

For each finding, reproduce it before modifying the implementation where possible. Record whether it is confirmed, already fixed, not reproducible with evidence, or blocked by missing inputs. Implement the smallest complete correction and update the relevant test or evidence. Do not merely rewrite the report to hide a failing check or weaken the acceptance criteria. Keep synthetic and real-source readiness distinct.

Rerun the finding-specific checks and affected earlier regressions. Inspect the UI if its behavior changed. Preserve previous logs/reports, save new evidence, and record before/after outcomes. Update requirement mappings and decisions if the correction changes a contract. If a change affects an earlier accepted phase, mark its relevant checks for re-verification and carry out those checks.

Write a versioned correction report under `docs/phase-reports/`, update the current phase report as an explicitly versioned revision, and include:

| Finding ID | Original issue | Reproduction result | Files changed | Correction | Retest and evidence | Fixed/open/blocked |
| --- | --- | --- | --- | --- | --- | --- |

Include the new code baseline or file hashes, all remaining failures/NOT RUN checks, actual test commands/results and any new limitations. Set independent review status to PENDING RE-REVIEW; do not self-approve the independent review.

End with a short handoff for re-review and the report/evidence paths. Stop after corrections and verification. Do not proceed to another phase until the review passes or the user explicitly accepts a documented exception and supplies the next phase instruction.
