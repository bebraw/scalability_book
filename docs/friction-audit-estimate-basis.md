# Friction audit measurement basis

The required friction entry identifies one evidenced bottleneck, a response and rationale, and a check result or justified next step.
It belongs in the existing evidence index and can reuse task and audit records; see [the common specification](../specifications/00_common_project.md#94-engineering-explanation) and [the chapter's recording prompts](../book/02_challenge/05_friction.md#record-one-evidenced-bottleneck).
The friction categories are optional prompts, not a required set of measurements.
The accounting below is an optional way to investigate effort around that finding.
It does not generate stage times, risk labels, or rework counts from friction scores or assistance presets.

## Quantities and boundaries

- Name the bounded task, revisions, configuration, acceptance conditions and observation boundary before comparing baseline and candidate attempts.
- Record observed active person-minutes for the work within that boundary; categories can help locate effort but need not cover an eight-stage workflow.
- Assign each person's time once, including rework.
- Concurrent people's effort adds, but the sum is not elapsed wall time; passive waiting is recorded separately.
- A blank or invalid entry remains missing, while an explicit zero means measured zero effort.
- A total requires complete observations within the declared boundary; a partial subtotal must identify missing work and cannot stand for whole-task effort.
- For comparable boundaries, calculate the observed difference as candidate minus baseline, retaining increases as well as reductions.
- One-off intervention cost is recorded separately and added to the observed difference for the first comparison; ongoing maintenance belongs in the evidence notes.
- Acceptance is an actual check result, not a judgment inferred from lower effort; retain failed or unfinished attempts with their outcomes.
- Link the evidence, hypothesis, changed conditions, limits, and next check or reversal condition in the existing entry.

This arithmetic does not estimate causation, recurring savings, break-even time, or rework risk.
A repeated comparable task, unchanged acceptance conditions, and inspectable timing records are needed to assess a proposed effort improvement.
Practice effects and changing conditions can remain even when both attempts pass.
An unchanged or worse result, or a justified follow-up when measurements are unavailable, can still support the required friction finding.

## Role of the productivity studies

[Peng et al. (2023)](https://arxiv.org/html/2302.06590v1) report a task-time reduction in a controlled HTTP-server task, while [Becker et al. (2025)](https://arxiv.org/html/2507.09089v2) report longer completion times with AI access for experienced developers working in familiar mature repositories.
These are contrasting empirical cases under different conditions, not bounds or calibration data for stage-specific coefficients.
Their aggregate effects cannot supply effort or risk values for a student's task.

The chapter's separate whole-cycle exercise uses explicitly invented sequential timings for arithmetic practice.
It does not claim empirical calibration or predict outcomes for a repository.
