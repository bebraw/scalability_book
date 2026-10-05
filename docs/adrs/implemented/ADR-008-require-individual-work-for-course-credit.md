# ADR-008: Require individual work for course credit

**Status:** Implemented

**Date:** 2026-10-05

## Context

Shared project scores could otherwise let a student pass without participating in lectures or submitting meaningful individual assessment.
The course needs a transparent passing rule and a manageable instructor gradebook, including pending assessments and approved individual arrangements.

## Decision

Keep shared project scores and individual scores separate.
The current versioned rubric, `2026-10-individual-minima-v1`, offers 153 points: 90 from projects, 27 from lecture participation/diaries, and 36 from self- and peer-assessment.

A passing result requires all of the following:

- At least 10/30 for each phase project.
- Two fully completed lecture activities out of three in each phase, counting live participation or its equivalent remote activity with diary evidence.
  Each full activity earns the three criteria for participation, a concrete idea, and a connection to evidence.
- A submitted self- and peer-assessment in every phase, earning at least 6/12 with at least 1/3 for contribution.
- At least 50% of the available total; passing grade thresholds are 50/60/70/80/90% for grades 1–5.

High project points cannot compensate for unmet mandatory individual work.
Contribution is an instructor judgment supported by evidence; peer reports are not automatic grade votes.

Unassessed or stale records are pending, not assumed zero.
Missing work requires an explicit assessment and reason.
An incomplete assessment leaves the final grade blank; an assessed failure is grade zero.
Students and exports use released assessments, while the instructor can inspect provisional totals.
Release requires current assessments for all registered groups and students in the phase.

Allow approved individual arrangements with a private reason and recorded replacement requirements/available points.
The self- and peer-assessment submission itself remains mandatory.
Retain the run's rubric version and assessment history when later rubrics change.

## Trigger

The instructor objected to a passing result without participation and explicitly selected two of three lecture activities in each phase as mandatory.

## Consequences

**Positive:**

- Passing represents both shared technical work and demonstrated individual engagement.
- Students can see the same unmet requirements the instructor uses.
- Pending and failed results remain distinguishable in grade export.

**Negative:**

- The gradebook must track minima as well as total points.
- Individual arrangements require explicit instructor judgment and private records.

**Neutral:**

- The exact published rubric remains authoritative for criterion wording.
- Institutional export integration is not yet implemented.

## Alternatives considered

### Use only a total-points threshold

This permits project marks to offset missing participation and assessment, which the instructor rejected.

### Require attendance at every lecture

The agreed rule allows two of three activities per phase and an equivalent remote path supported by diary evidence.

### Convert ungraded work directly to zero

This makes an unfinished assessment look like a deliberate failing judgment and hides outstanding instructor work.

## Implementation and verification

The [published grading contract](../../../specifications/grading.md), [shared rubric and grade calculation](../../../shared/course.ts), [course API](../../../worker/courses.ts), and [course interface](../../../site/scripts/course.ts) implement this decision.
[Course API tests](../../../tests/courses.test.ts) cover mandatory minima, pending/released results, and approved arrangements; the [course browser test](../../../tests/e2e/course-workspace.spec.ts) covers scoring, release, and CSV export.
The [course-system guide](../../course-system.md) documents the current workflow.
Implemented status describes repository behavior, not confirmation of production course bindings or an institutional grade integration.

## Historical evidence

- [2026-10-05: publish staged submissions and mandatory individual assessment](https://github.com/bebraw/scalability_book/commit/18adbaddc44a130aa06a4911316030760e771c54).
- [2026-10-05: implement the rubric, gradebook, release checks, and export](https://github.com/bebraw/scalability_book/commit/e8e48c02766ace4525d6c645a285ec4a2f4c15d7).
