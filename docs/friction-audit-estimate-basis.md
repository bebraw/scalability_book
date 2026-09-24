# Friction audit measurement basis

The audit records observations; it no longer generates stage times, risk labels, or rework counts from friction scores or assistance presets.
The previous coefficients were invented teaching assumptions, and describing them as empirically calibrated was unjustified.

## Quantities and boundaries

- Each stage contains observed active person-minutes for the baseline and candidate attempts.
- A person's time is assigned once; rework belongs to the stage in which it occurs.
- Concurrent people's effort adds, but the sum is not elapsed wall time; passive waiting is recorded separately.
- A blank or invalid entry remains missing, while an explicit zero means measured zero effort.
- Total effort requires all eight stages; the displayed difference is candidate minus baseline, including increases.
- One-off intervention cost is recorded separately and added to the observed difference for the first comparison; ongoing maintenance belongs in the evidence notes.
- Acceptance is a user-recorded check result, not a judgment inferred from lower effort.
- The record retains revisions, configuration, evidence, hypothesis, limits, and the next check or reversal condition.

This arithmetic does not estimate causation, recurring savings, break-even time, or rework risk.
A repeated comparable task, unchanged acceptance conditions, and inspectable timing records are needed to assess a proposed improvement.
Practice effects and changing conditions can remain even when both attempts pass.

## Role of the productivity studies

[Peng et al. (2023)](https://arxiv.org/html/2302.06590v1) report a task-time reduction in a controlled HTTP-server task, while [Becker et al. (2025)](https://arxiv.org/html/2507.09089v2) report longer completion times with AI access for experienced developers working in familiar mature repositories.
These are contrasting empirical cases under different conditions, not bounds or calibration data for stage-specific coefficients.
Their aggregate effects cannot supply this audit's setup, comprehension, editing, review, or risk values.

The separate study-pilot exercise retains explicitly invented, editable sequential timings for arithmetic practice.
It does not claim empirical calibration or predict outcomes for a repository.
