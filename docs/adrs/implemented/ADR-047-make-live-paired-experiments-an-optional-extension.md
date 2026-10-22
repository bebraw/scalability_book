# ADR-047: Make live paired experiments an optional extension

**Status:** Implemented

**Date:** 2026-10-22

**Amends:** The mandatory live-pair requirement and conditional supplied-trace fallback in [ADR-039](../implemented/ADR-039-sequence-model-sizes-and-permit-mixed-fleets.md), while preserving three fresh builds and real fleet work.

## Context

Before this review, Compare required a bounded matched single-agent/fleet experiment, with supplied traces used when matched access or accounting is unavailable.
Establishing identical configurations, fresh copies, aggregate resource accounting and comparable acceptance evidence creates work beyond the two timed attempts.
Group capabilities and task difficulty have not yet been calibrated through the first course run.

The instructor accepted a common required learning core with optional extensions for trace integration in [ADR-046](ADR-046-make-fleet-trace-import-an-optional-extension.md), then selected the same pattern for the paired experiment.

## Decision

Require analysis of instructor-supplied matched single-agent/fleet traces within the existing Compare activity and evidence.
Students examine controls and differences, acceptance outcomes, time, human effort, resources, correction work, missing measurements and interpretation limits.
The instructor supplies provenance, the task brief, configurations, checks and outcomes, with accounting gaps explicit.
Identify synthetic teaching data when used; it cannot establish an empirical effect.
Students must distinguish supplied observations from their own workflow results and avoid generalizing from one pair.

Make execution of the student's own matched pair an optional extension.
Retain the existing controls for that extension: the same frozen revision, brief and checks, small-model configuration and routing, environment, tools, intervention policy and equal predeclared wall-time and aggregate resource limits.
Keep the maximum of 20 minutes per attempt and preserve partial or failed outcomes, all workers and retries, and unavailable accounting.

The required analysis supports full credit, including grade 5.
The optional experiment has no separate point allocation and fits within the existing phase budget.
Keep the 153-point maximum, passing minima, three fresh builds and actual fleet requirement.
Reuse the paired analysis in the existing evidence index rather than adding a report.

## Trigger

During the specification review, the instructor agreed to require supplied matched-trace analysis while making student-run matched experiments optional.

## Consequences

- Every group practices evaluating a controlled contrast without having to establish the experimental infrastructure.
- Groups with capacity can investigate a bounded contrast in their own environment.
- The instructor must prepare and verify a useful supplied evidence package.
- Supplied evidence does not establish an effect in the student's own workflow.
- The actual C fleet run and its analysis remain separate mandatory work.

## Alternatives considered

### Retain live execution as the default and supplied traces only as a fallback

This preserves direct experimental practice for every group with suitable access, but makes the same learning objective depend on uncalibrated setup and accounting effort.

### Remove the paired comparison entirely

This would remove explicit practice in distinguishing controlled contrasts from the confounded A–B–C cases.

## Implementation and verification

The [Compare brief](../../../specifications/03_compare.md), rubric, checklist, fleet chapter, plans, independent activity and pilot agreement now require supplied matched-trace analysis and make a student's live pair optional.
Actual C fleet work and actual-run evidence remain separate requirements, and the optional live procedure retains its matching and resource controls.
The supplied evidence package remains instructor preparation work; contract implementation does not establish that observations or a runnable package have been prepared.

The [scope review verification](../../project-specification-scope-review-2026-10-22.md#verification) records the requirement, build, validation, link and browser checks.
These changes are implemented in the repository and locally reviewed; they have not been deployed.
