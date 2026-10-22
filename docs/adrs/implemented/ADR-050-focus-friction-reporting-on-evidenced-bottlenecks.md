# ADR-050: Focus friction reporting on evidenced bottlenecks

**Status:** Implemented

**Date:** 2026-10-22

## Context

The [common engineering evidence contract](../../../specifications/00_common_project.md) previously required friction coverage across eight categories in every phase, alongside the largest source of resistance and an improvement or follow-up decision.
The bounded incoming and outgoing audits already provide concrete evidence of setup, comprehension and change work.
The instructor wants focused evidence that is straightforward to assess within the existing course workload.

## Decision

Keep the incoming independent audit and outgoing audit required in every phase under the existing [bounded protocol](../implemented/ADR-023-test-unfamiliar-system-work-through-bounded-audits.md).
Require one concrete development bottleneck in the author's phase evidence, supported by observations, and either a checked improvement or a justified follow-up decision.
Use setup, comprehension, change, testing, review, deployment, operations and coordination as prompts; do not require commentary on every category.

Use one compact entry in the existing evidence index: phase and revision, bottleneck and supporting observations, response and rationale, and check result or justified next step.
Link existing task, audit or validation evidence rather than add a report.
A checked change may leave friction unchanged or worsen it; retain that result and distinguish a proposed follow-up from an improvement already achieved.
Preserve the audit report, actual outcome, setup and probe time boundaries, tool conditions and prior exposure; mark unavailable observations rather than invent measurements.

Assess evidence and reasoning under the existing engineering and phase-specific criteria, without separate points or changes to passing minima.
One well-supported finding and response can satisfy the friction requirement for full credit, including grade 5; exhaustive category coverage is not required.

## Trigger

The instructor approved one evidenced bottleneck and a checked improvement or justified follow-up per phase, with both audits retained and the eight categories used as prompts.

## Consequences

- The grader has one focused finding and response to assess per phase.
- Students still practice unfamiliar-system work and evaluating their own development process.
- Breadth of category coverage is no longer guaranteed; the prompts remain available for further inquiry.
- The numeric rubric, passing minima, audit protocol and phase budgets remain unchanged.

## Alternatives considered

### Keep mandatory coverage of every category

This encourages broader reflection but requires commentary even where the student's strongest evidence concerns one concrete bottleneck.

### Remove the audits or accept an unsupported reflection

This would weaken evidence of unfamiliar-system work and whether a proposed improvement addresses an observed problem.

## Implementation and verification

The [common engineering evidence](../../../specifications/00_common_project.md), affected briefs, rubric, friction chapter, checklist and pilot documents now require one evidenced bottleneck and a checked improvement or justified follow-up per phase.
The eight categories are prompts, and the incoming/outgoing audit protocol and reports remain required.
A proposed follow-up is distinguished from an achieved improvement, and exhaustive category coverage is unnecessary for full credit.

The [scope review verification](../../project-specification-scope-review-2026-10-22.md#verification) records the requirement, build, validation, link and browser checks.
These changes are implemented in the repository and locally reviewed; they have not been deployed.
