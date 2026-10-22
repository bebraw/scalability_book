# ADR-048: Require evolving decision records across fresh builds

**Status:** Implemented

**Date:** 2026-10-22

## Context

Before this review, the project harness required a stack decision record, and the book teaches a decision log for consequential choices and their revisit conditions.
During the specification review, the instructor identified maintaining this reasoning layer as a required practice students should learn through use across the projects.
Simplifying other documentation must preserve that practice.

The three fresh builds in [ADR-039](../implemented/ADR-039-sequence-model-sizes-and-permit-mixed-fleets.md) allow written lessons to transfer while keeping application source, implementation-specific tests and configuration fresh.
An evolving log must retain history and distinguish a decision's implementation in one phase from its adoption or verification in another.

## Decision

Require ADRs or an equivalent decision-record approach throughout Establish, Challenge and Compare.
Record consequential choices as work happens, with context, alternatives, decision and rationale, assumptions and consequences, status and owner, supporting evidence, reversibility and a revisit condition.
Use the existing [decision-log guidance](../../../book/02_challenge/05_friction.md#keep-a-decision-log); do not prescribe a tool, directory layout, record count or word count.

Establish creates the initial decision history.
Challenge revisits relevant earlier choices using the fresh implementation, measurements and audit evidence.
Compare uses and updates that reasoning when selecting a scaling response, fleet boundaries and the final architecture and workflow judgment.
Explain why choices are retained, revised or rejected; retaining a supported decision is valid.

Carry the reasoning forward as written lessons and evidence references, preserving earlier records and linking replacements when a choice is superseded.
Scope status and implementation evidence to the applicable phase and revision, and retain phase snapshots for assessment.
Implementation in A does not establish that a choice is implemented or validated in B or C.
The log does not permit copying prior application source, implementation-specific tests or configuration into a fresh build.

Assess the quality and use of the reasoning through the existing architecture, evidence and reflection criteria, with no separate point allocation or reward for record volume.
Keep a current architecture/data-flow explanation alongside the log.
The instructor subsequently confirmed that maintained specifications remain mandatory, with students choosing and evolving their method for capturing agent context.
Specifications describe current intended behavior, acceptance and constraints, while the decision log preserves rationale and history; both may share a tool or document when their roles remain clear.
The short standardized ownership card is retained as the instructor's consistent entry to the existing architecture and ownership evidence, with no additional points.

When a starter template is used, require its source and starting revision, material changes and inherited assumptions in the existing evidence bundle.
Record consequential adoption or adaptation choices in the evolving log.
Make the detailed component-by-component keep, replace later, remove or decide inventory optional, with no grading penalty for omitting it when the required evidence and reasoning are present.
This changes the reporting format, not the permitted-transfer rules for fresh builds; students who do not use a starter have no inventory to produce.

## Trigger

The instructor required ADRs or a similar approach so students can evolve and experience the value of maintaining a reasoning layer across projects.
The instructor subsequently approved optional starter inventories while retaining provenance, material changes, inherited assumptions and consequential decision records.

## Consequences

- The three builds provide opportunities to test and revise earlier assumptions without losing the reasons for past choices.
- Students practice a maintained engineering tool rather than reconstructing a decision essay at submission time.
- The log adds ongoing work that belongs inside the existing project and reflection budget.
- Evidence and status need phase-specific scope to avoid suggesting that a fresh implementation inherits earlier validation.
- Separate document formats can be reviewed without weakening the decision practice.
- Starter evidence retains provenance and consequential reasoning without requiring an exhaustive classification exercise.

## Alternatives considered

### Require only the initial stack decision

This documents the opening choice but does not require students to revisit the reasoning after new implementation and measurement evidence.

### Require a fixed collection of ADRs in each phase

This encourages filling a quota and may reward record volume instead of consequential decisions and useful revision.

### Treat a final architecture note as sufficient

This can explain the final system but does not preserve how choices evolved or require using that history while working.

### Require a classification of every inherited starter component

The inventory can help students plan a safe cleanup, but making it compulsory adds bookkeeping beyond the provenance and consequential reasoning needed for assessment.
It remains available as an optional working method.

## Implementation and verification

The [common harness](../../../specifications/00_common_project.md#6-minimum-project-harness), phase briefs, transfer guidance, rubric, checklist and pilot documents now require maintained specifications and an evolving decision log with readable phase snapshots.
The common harness defines the standard ownership card, and Establish retains starter provenance, material changes and inherited assumptions while making the detailed inventory optional.
Assessment concerns useful reasoning and actual use, without quotas or a separate point allocation.

The [scope review verification](../../project-specification-scope-review-2026-10-22.md#verification) records the requirement, build, validation, link and browser checks.
These changes are implemented in the repository and locally reviewed; they have not been deployed.
