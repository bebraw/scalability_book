# ADR-004: Form three-person groups with instructor oversight

**Status:** Accepted

**Date:** 2026-10-05

## Context

The current setup asks the instructor to type group IDs and membership for every phase and permits up to ten members.
The intended course workload assumes groups of three, with some flexibility when cohort size or circumstances require it.
Some students want to form their own groups; others need help finding teammates.
Enrollment must not depend on having an established group.

## Decision

Target three members per group.
Allow a fourth member as an instructor-approved exception when needed, with four as the normal maximum.
An explicitly approved smaller group may continue after a withdrawal when transfer would be impractical; it is not the default formation target.

Open a group formation period with a published deadline before project work.
Offer students **Propose a group** and **Assign me a group**.
Accept partial proposals, such as a pair seeking a third member.
Every proposed member confirms participation; proposing a group does not make the proposer a permanent leader or authorize adding someone without consent.
The instructor reviews proposals and allocates unassigned students, then publishes the approved groups with a short correction window.

Use a limited student directory showing names and opt-in availability to join a group.
Keep email addresses, student IDs, portfolios, and private matching constraints out of the directory.
Collect meeting availability and relevant support constraints privately for instructor allocation rather than introducing a large personality or skills survey.

Generate stable course-scoped identifiers when groups are created, displayed as **Group 01**, **Group 02**, and so on.
Allow an optional display name without changing the identifier.
Keep groups stable across Establish, Challenge, and Compare where practical.
Record instructor-approved membership changes for the affected phase; retain the membership associated with already frozen submissions and assessments.

Late arrivals enter the allocation queue with an agreed catch-up arrangement.
Withdrawals preserve submitted work and history and become visible administrative tasks rather than deleting evidence.
Teams agree briefly on availability, communication, and handling missed commitments; this is a working agreement, not an additional graded deliverable.

## Trigger

The instructor requested three-person groups, later student additions, clearer group IDs, and support for student-led formation.
The subsequent discussion agreed a hybrid proposal/allocation workflow.

## Consequences

**Positive:**

- Students can choose collaborators while the instructor ensures everyone has a workable allocation.
- Stable identifiers connect submissions and audits across phases.
- Membership history protects grading when enrollment changes.

**Negative:**

- The system needs invitation confirmation, allocation state, and instructor exception handling.
- The instructor still resolves difficult schedules, late arrivals, and withdrawals.

**Neutral:**

- Formation deadlines and correction-window dates are configured for each run.
- A student belongs to one approved group per phase; formation proposals do not grant submission access.

## Alternatives considered

### Entirely student-selected groups

This can leave students without a group and provides no clear process for late arrivals or incomplete teams.

### Entirely automatic or random allocation

This ignores voluntary proposals and constraints that the instructor can resolve with limited information.

### Permanently require exactly three members

This cannot handle every cohort size or later withdrawal without unnecessary disruption.

## Implementation and verification

Group proposals, confirmation, generated IDs, and the three/four-member policy are pending.
Verify a full trio, a pair awaiting allocation, an unassigned student, an approved fourth member, and a late arrival.
Verify phase transfers preserve the frozen membership and grade history of earlier work.
Update the [course project introduction](../../../specifications/00_introduction.md) and course-system guide when the workflow is available.

## Open questions

- Institutional handling of withdrawals and final grade export must be confirmed before defining that administrative action.
  Withdrawal must not silently waive passing requirements or erase prior work.

## References

- [ADR-002: focused administration](ADR-002-separate-course-administration-workflows.md).
- [ADR-009: frozen membership and evidence history](../implemented/ADR-009-preserve-evidence-and-control-submission-access.md).
