# ADR-004: Form three-person groups with instructor oversight

**Status:** Implemented

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
Following the instructor’s clarification on 2026-10-06, withdrawn students receive no final grade and do not require assessment before releasing active students’ results.
Exports retain a clearly marked withdrawn row with blank grade and totals, rather than assigning grade 0.
The instructor records private group/audit arrangements and can reverse an erroneous withdrawal without waiving ordinary requirements.
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

The formation API and staff/student interface implement deadlines, partial proposals, individual confirmations, assignment requests, opt-in names, private matching notes, instructor allocation and publication/correction dates.
Three members is the default; new/changed groups are limited to four, with an explicit instructor exception for any other size.
Stable generated IDs and optional display names can be reused across phases.
Later-phase transfers preserve frozen membership and assessment history.
Shared working agreements are private group records and are not graded.
Their API requires an existing group even for staff saves; student reads and writes require published membership.
Removing an unused allocation retains the staff-visible agreement history without granting students access to an absent group.
Student mutation responses acknowledge a save without exposing the private course snapshot.

API/browser checks cover a confirmed pair completed into a trio, a four-member exception, unassigned students, deadline closure, stale/unauthorized confirmations, privacy, publication/access separation, working agreements and retained frozen evidence/grades after transfers.
Agreement API regression checks verify unknown-group rejection without records/history, unpublished read/write denial, published-team access and retained staff history after an unused allocation is removed.
The [project introduction](../../../specifications/00_introduction.md#shared-work-and-individual-assessment) and [operating guide](../../course-system.md#instructor-group-allocation) describe the workflow.

New arrivals after formation or frozen work have recorded enrollment dates and a late-arrival flag, enter the unassigned queue, and receive a staff review task until a catch-up plan is recorded.
The instructor records the agreed plan with a private reason; the student sees only their own plan.
Roster corrections retain this metadata, while unknown historical arrival dates remain unknown.
API/browser checks verify late-arrival detection, review tasks, plan privacy, stale and unauthorized saves, retained history and unchanged frozen work, grades, deadlines and passing requirements.
The [catch-up operating guide](../../course-system.md#late-arrivals-and-catch-up) describes the implemented workflow.

Withdrawal, private group-review notes and reinstatement use the existing staff enrollment endpoint, Students fingerprint and course history.
Active-student/group projections govern allocation, new assessments and release; frozen membership and existing evidence/grades remain unchanged.
Withdrawn students retain read-only access under existing privacy/time rules, and cannot submit or upload new work.
Roster corrections preserve the state, pending invitations cannot gain new consent, and approved allocation corrections retain their original proposal provenance.
Later-phase reuse excludes withdrawn members and requires fresh approval for a changed group size.

API and browser checks exercise departure/review/reinstatement, retained source and assessment history, no-grade exports, active-only release, privacy, stale/unauthorized changes, future allocation and ordinary requirements after reinstatement.
The local Worker check verifies this enrollment state and history with actual D1/R2 bindings.
See the [withdrawal operating guide](../../course-system.md#withdrawals-and-reinstatement).
This implementation does not provision a production course or establish an institutional records-retention schedule.

## References

- [ADR-002: focused administration](../implemented/ADR-002-separate-course-administration-workflows.md).
- [ADR-009: frozen membership and evidence history](../implemented/ADR-009-preserve-evidence-and-control-submission-access.md).
