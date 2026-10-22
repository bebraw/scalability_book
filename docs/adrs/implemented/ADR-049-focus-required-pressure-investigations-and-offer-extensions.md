# ADR-049: Focus required pressure investigations and offer extensions

**Status:** Implemented

**Date:** 2026-10-22

**Amends:** The compulsory additional Challenge pressure in [ADR-022](../implemented/ADR-022-use-a-shared-runtime-protocol-and-bounded-pressure-experiments.md), while preserving the shared measurement protocol and three fresh builds.

## Context

The earlier design repeated one primary pressure across the builds and added a secondary pressure in Challenge, alongside the engineering-session correctness question, model reasoning and final scaling experiment.
The instructor selected a focused required investigation with optional exploration to accommodate capability differences while preserving interesting implementation comparisons.
The first run has not yet established the actual difficulty of the work.

## Decision

Require the following progression within the existing phase budgets and evidence:

- **Establish:** establish the shared baseline, select one application pressure and define a repeatable workload transformation.
- **Challenge:** repeat that pressure and investigate one bounded correctness or recovery case, such as concurrent work-item transitions, using the existing engineering session where appropriate.
- **Compare:** repeat the pressure on C, implement one justified scaling response in A, B or C, measure before and after, and check a failure or recovery obligation introduced by the response.

The Challenge correctness or recovery investigation replaces the compulsory additional secondary-pressure analysis.
Further pressure scenarios are optional explorations.
Keep the required application and workflow model reasoning, realistic deployment and deployed baseline rerun.
Keep the three fresh builds, existing numeric rubric and passing minima.

Assess documented-incident transfer through the existing chapter 6 activity, using its activity and diary criteria.
Keep a compact explanation of the failed assumption, observable signal, response and recovery obligation relevant to B, separating source facts from interpretation and proposed transfer.
Link that activity entry from the project evidence index and remove the additional detailed incident pressure-map requirement from the project record.
This retains the conceptual transfer work without requiring another implementation or experiment, changing the point allocation or adding a passing minimum.
Assess the project's own pressure investigation through the existing project criteria.

Use one evolving record with a consistent structure: hypothesis, conditions and constraints, procedure, results and evidence links, interpretation and limits, and response, trade-offs and recovery obligations.
Retain the actual measurement boundary, repetitions and outcomes, including failed or partial results, and distinguish projections from observations.
The existing arrival-controlled procedure still applies to claims about sustained arrivals, backlog or admission control; optional scope does not justify weaker evidence for a chosen claim.

The required path supports full credit, including grade 5.
Optional scenarios have no separate point allocation, remain inside the project budget and do not compensate for missing required evidence.

Keep the common baseline for comparison across implementations and repeat the same primary procedure within a group's A–B–C investigation.
Groups may choose different pressures and extensions.
Mark required and optional findings in the existing final comparison matrix, with environments, scope and conditions visible.
Do not treat uncontrolled differences between groups as model effects or rank quality by raw latency alone.

## Trigger

The instructor approved the focused pressure progression and optional explorations, emphasizing the interest of comparing the resulting implementations.
The instructor also approved using the chapter 6 activity as the assessment location for documented-incident transfer, removing the additional project pressure map.

## Consequences

- Every group produces comparable baseline and within-group pressure evidence plus a concrete correctness or recovery investigation.
- Groups with capacity can explore additional scenarios without making them a hidden condition for the highest grade.
- The shared comparison remains interpretable only when conditions, scope and missing measurements stay visible.
- The rubric and checklist must distinguish the new required investigation from optional additional pressure analysis.
- Incident transfer has one assessment location, with only modest workload savings because the conceptual work remains.

## Alternatives considered

### Keep an additional secondary-pressure analysis compulsory

This retains broader scenario coverage but competes with the existing correctness investigation, scaling response and other phase evidence.

### Let groups choose all their measurement work independently

This would weaken the common basis for comparing implementations and could leave required scalability outcomes unexamined.

### Retain the detailed incident transfer in the project pressure record

The earlier contract permitted shared artifacts and links, so it did not necessarily require two reports.
It still required a detailed project pressure map in addition to the activity's conceptual work; the activity alone provides a clear assessment location for the transfer outcome.

## Implementation and verification

The [common pressure protocol](../../../specifications/00_common_project.md), phase briefs, rubric, checklist, plans, affected chapter checkpoints and pilot materials now implement the focused progression and optional additional scenarios.
The chapter 6 activity owns the incident-transfer assessment, linked from the project index without an additional detailed incident pressure map or new passing minimum.
The conditional arrival-controlled procedure, measurement repetitions, formal models, deployment and honest failed-outcome accounting remain required where applicable.

The [scope review verification](../../project-specification-scope-review-2026-10-22.md#verification) records the requirement, build, validation, link and browser checks.
These changes are implemented in the repository and locally reviewed; they have not been deployed.
