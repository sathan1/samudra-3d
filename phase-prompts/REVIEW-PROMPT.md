# Reusable phase cross-check prompt

Review the SAMUDRA-3D phase report I am sharing. Determine the phase number from the report; if it is ambiguous, resolve it before assessing readiness. Work in `D:\Samudra 3D` when available. Do not implement the next phase or modify application code during this review.

Use `SAMUDRA-3D_SIH26067_Master_Handbook.pdf` as the controlling project specification. Read the actual relevant physical pages, the full current phase prompt in `phase-prompts/PHASE-NN.md`, supporting source material where relevant, requirements/decisions/conflicts, previous review findings and current report/evidence. The supplied handbook has 14 physical pages and incomplete/mismatched contents references. Do not invent missing text. Use the accepted MODEL - OBSERVED convention unless the user has explicitly revised it.

Perform an independent evidence-based review:

1. Establish the reported source hashes, commit/diff or file-hash baseline and compare it with current files. Identify changes after the reported checks. Confirm the previous phase's gate and any accepted exceptions. Check phase scope and whether future features were implemented prematurely.
2. Map every current acceptance criterion and relevant handbook requirement to actual implementation and execution evidence. Read the changed code, data contracts, numerical logic and tests; do not accept the report's PASS labels by themselves.
3. Rerun the focused scientific/API/build/regression checks relevant to the changes and inspect the running UI when required. Include adversarial edge cases appropriate to the phase: missing/QC data, invalid bounds, units, coordinate orientation, race conditions, cleanup, matching tolerances and residual signs. Save actual review evidence under `docs/evidence/phase-NN/review/` if the workspace is available.
4. Check that synthetic/live/real-source claims, metrics, performance targets, interpolation methods, coverage, anomalies, health scores and AI answers match their evidence. Identify unsupported claims and gaps in real-data or deployment validation. Check source/requirement drift and whether older tests need to be invalidated.
5. For each actionable finding, assign a stable ID such as PNN-R01, severity (critical/high/medium/low), exact file and location, requirement/source, reproduction procedure, expected versus actual result, impact, concrete fix and required retest. Separate observed defects from suspected risks and missing evidence. Do not invent bugs or style-only blockers.
6. If you have only the report and cannot inspect the files or execute required checks, state that limitation clearly. Review the report's internal consistency, request the specific missing evidence and mark code verification BLOCKED. Never imply independent verification happened from a narrative summary alone.

Write `docs/phase-reviews/phase-NN-review.md` with the reviewed baseline, requirement matrix, checks actually performed, evidence, findings, unresolved/not-run checks and a verdict:

- PASS: all required current-phase criteria have credible independent verification, no blocking findings remain, and affected prior gates are intact.
- CHANGES REQUIRED: reproducible defects, material omissions, inconsistent claims or insufficient recorded implementation evidence require correction.
- BLOCKED: necessary code, source, tool, data or execution access prevents the required review.

Use a versioned review filename or preserve the previous review when repeating this process. A proposed optional improvement alone is not a blocker. Any accepted exception must cite the user's decision and its limitations; it is not proof that the waived check passed.

End with a concise shareable result: phase, verdict, findings by severity, what was actually rechecked, exact required corrections and retests, and whether the next phase is technically ready. If changes are required, provide a focused repair instruction the user can paste into the implementation chat. Stop after this review; the user will provide the next phase prompt.
