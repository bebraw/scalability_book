# ADR-009: Preserve evidence and control submission access

**Status:** Implemented

**Date:** 2026-10-05

## Context

Students should be able to learn from other groups' technical submissions while assigned audits remain bounded and individual assessment stays private.
Assessment must identify the source, membership, and evidence it judged, including later corrections and concurrent updates.

## Decision

Maintain one group submission record per phase.
Freeze the source archive, full implementation revision, archive SHA-256, setup, initial evidence, timestamp, and registered phase membership.
Retain the uploader's attestation that the archive matches the revision; the server does not clone repositories or execute student code to establish that claim.
A correction does not silently replace frozen evidence.

Assigned auditors receive access after the common implementation deadline.
Open the course-only technical gallery to classmates after the audit window closes, including frozen technical bundles, audits, and author responses when available.
Do not expose private portfolios, confidential peer reports, student numbers, or scores through that gallery.
Class access does not authorize copying another implementation; transfer and attribution follow the common course contract.

Private individual records are available only to their owner and course staff.
Students see their own group feedback and individual results after release.
Authorize every download through the API rather than public bucket links.
Course staff permissions are distinct from book feedback moderation.

Record actor, timestamp, reason, and revision history for saved changes.
Use optimistic revision checks to reject stale saves.
Changed evidence makes its previous assessment stale until reassessed, preserving both the old evidence and score.
Frozen membership remains the basis for that phase's shared project score.

## Trigger

The instructor requested a submission system connected to grading and emphasized letting groups inspect other groups' submissions.

## Consequences

**Positive:**

- Classmates can inspect technical work without receiving confidential assessment records.
- Audits and grades can be traced to the evidence and members actually assessed.
- Concurrent changes and corrections remain visible rather than silently overwriting records.

**Negative:**

- Authorized file access, immutable snapshots, and assessment freshness add state-management complexity.
- Historical membership corrections need a separate administrative design rather than direct edits to frozen records.

**Neutral:**

- Public repository publication remains optional for class browsing.
- Final technical-evidence completion extends this baseline through implemented ADR-005 while retaining frozen source and private portfolios.

## Alternatives considered

### Publish all course submissions and assessments

This exposes individual information and makes privacy depend on student choices rather than course access rules.

### Open the general gallery before assigned audits finish

This obscures prior inspection and makes the audit's recorded effort harder to interpret.

### Store only the latest submission and grade

This loses the evidence needed to explain corrections, ownership, and changed assessment results.

## Implementation and verification

The [course API](../../../worker/courses.ts), [storage/history adapters](../../../worker/course-store.ts), [local storage adapter](../../../scripts/lib/local-courses.ts), and [record migration](../../../course-migrations/0001_course_records.sql) implement this baseline.
[API tests](../../../tests/courses.test.ts) cover privacy, timed access, frozen records, stale assessments, and concurrent saves.
The [project introduction](../../../specifications/00_introduction.md) and [course-system guide](../../course-system.md) explain the student and staff workflows.
Implemented status does not mean production storage has been provisioned.

## Historical evidence

- [2026-10-05: define staged submission and class-access policy](https://github.com/bebraw/scalability_book/commit/18adbaddc44a130aa06a4911316030760e771c54).
- [2026-10-05: implement storage history, guarded access, and frozen assessment records](https://github.com/bebraw/scalability_book/commit/e8e48c02766ace4525d6c645a285ec4a2f4c15d7).

## References

- [ADR-004: future group formation and membership changes](../implemented/ADR-004-form-three-person-groups-with-instructor-oversight.md).
- [ADR-005: final technical evidence](ADR-005-submit-reproducible-source-with-phase-checklists.md).
- [ADR-008: grading and release](ADR-008-require-individual-work-for-course-credit.md).
