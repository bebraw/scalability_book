# Proposal: calibrate the small-model task in stages

**For student discussion — updated 23 October 2026.**

The proposed independent route is the full **5 ECTS / 135-hour course**, assessed on the existing **1–5 scale**.
It retains three fresh builds, maintained specifications and decision records, instructor discussions and the required audits.
Orientation can begin in late October, with kickoff during 2–4 November, final work due on 16 December and grading targeted for 18 December.
The [study agreement](study-agreement.md) gives the proposed calendar, workload and responsibilities.

We would like to calibrate the difficulty before choosing additional technical scope.
A preliminary Qwen3.5 9B attempt showed substantial effort spent reading and rebuilding context around a change involving retries, persistence and concurrency.
The instructor interrupted that attempt before its full time or request allowance; it is an early observation, not a completed comparison or a general result about small models.
A subsequent department-hosted Qwen3.8 27B calibration with thinking disabled implemented the simpler label task and passed 22 independent checks in 6 minutes 24 seconds and 38 requests.
Browser review found an unintended form/API length discrepancy, which led to the explicit label rule and additional checks below.
The subsequent matched pair passed all 24 independent checks in both conditions: one agent took 8m38s and 33 requests; a coordinator with two workers took 9m36s and 64 requests.
The fleet preserved a usable mobile layout, while the single-agent candidate overflowed; it also closed a still-running worker, leaving one request without complete usage accounting.
These are observations from one exploratory pair, with [configuration and measurement limits](../course-tooling.md#completed-matched-pair).

## Start with one small change

On a disposable copy of an already working application, ask the model to add an optional short text label to a work item:

- Enter the label when creating an item.
- Save it and show it beside the item after an ordinary restart.
- Keep existing behavior when the label is omitted.
- Trim edge whitespace; omitted or blank means no label.
- Preserve the same text through the ordinary form and JSON API, with no label-specific character limit within the existing whole-request bound.
- Retain the existing checks and add focused evidence for the new behavior.

Keep the change to this single path through input, storage and display.
Searching, editing labels, new activity-event types and retry handling are outside this first exercise.
Write the intended behavior and acceptance checks before starting, and record one consequential decision afterward.

For an initial single-agent calibration, use a maximum of **20 minutes and 40 inference requests** with the model and tools recorded.
Preserve partial work at the limit, including failed checks and any help needed.
This is a proposal to agree together; it adds no separate submission or grading criterion and should fit within the existing phase budget.

## Increase difficulty after reviewing the evidence

If the first task is manageable, choose one next step: input validation, a filter, or one explicitly specified retry case.
Introduce concurrency and recovery questions separately so each investigation has a clear question and observable checks.
The existing course briefs retain their required investigations; this staged exercise helps choose a suitable task size and optional depth.

The instructor-prepared pair uses the verified department model with thinking disabled and gives each condition twenty minutes and eighty aggregate requests, including all workers and retries.
Review its evidence before adding difficulty: compare correctness, specification/ADR quality, time, requests and coordination problems, and explain what the automated checks missed.
The calibration is separate from the matched pair, and the recorded candidates remain unchanged for analysis.
Further model trials can then help investigate whether a difficulty comes from the task, model configuration or orchestration.
The student's own matched experiment remains optional; the required supplied-trace analysis supports full credit.

## Commitments to agree

The student works independently, maintains concise specifications and ADR-style records, checks model output, and reports approximate hours and blockers each week.
The instructor supplies the supported environment and agreed limits, personally conducts the incoming audits, and uses the planned phase discussions and existing rubric for feedback and grading.
Course feedback and an unsuccessful exploratory result do not themselves lower the grade; assessment follows the published criteria and passing requirements.

Before kickoff, confirm available weekly hours, the supported model and tools, the first calibration task and checks, and the point at which help or a scope adjustment is needed.
The planning assumption is approximately 20–21 student hours per week after kickoff, with 22–25 during the final phase.
Optional exploration can be reduced when workload grows; changes to required outcomes need an explicit agreement.
