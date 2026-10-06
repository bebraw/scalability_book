# ADR-026: Support an approved solo course route

**Status:** Implemented

**Date:** 2026-10-06

## Context

A student wants to take the course while working alone.
The application and three agent-development setups can be studied by one person, while rotating human roles, teammate feedback and cross-team audits require explicit equivalents.
The workspace already permits instructor-approved small groups but its portfolio prompts and audit forms assume teammates and another course group.
Existing published requirement and rubric editions must remain stable for retained runs.

## Decision

Offer an instructor-approved solo route across Establish, Challenge and Compare, recorded on each phase's one-person allocation.
Keep the common application, three fresh implementations, runtime workload, phase evidence, 153-point maximum and passing minima.
Agree a realistic workload/schedule and supported model access before work starts, keeping optional scope small.
Use explicit operator/challenger/validator passes and an instructor discussion in each phase.
Retain an incoming independent human audit of frozen source and an outgoing audit of another group or an instructor-supplied frozen reference with a released bounded probe.
Agents may assist under the published tool policy but do not count as independent human reviewers.

Replace teammate-specific individual criteria with evidence-based self-assessment, useful independent implementation review, response/solo reflection and accountable ownership in the same four score positions.
Keep instructor judgments, recorded lecture participation and all individual minima.
Record missing work explicitly rather than silently waive review or participation requirements.
Do not treat solo evidence as evidence of practiced human teamwork.

Publish requirement edition `2026-10-v2` with rubric `2026-10-solo-equivalence-v2` for new runs.
Retain the legacy edition, rubric, scoring positions and numeric rules without migrating old runs implicitly.
Freeze route/assignment provenance as work is submitted, and invalidate solo assessments when their review/audit evidence changes.

## Trigger

The user accepted the proposed solo adaptations and requested implementation for all three phases.

## Consequences

**Positive:**

- Solo participation preserves the course's application/workflow comparison and independent challenge.
- The existing storage, submission, portfolio and grade flows support the new route without a separate student application.
- Historical requirements and assessments retain their original meaning.

**Negative:**

- Solo students still undertake substantial work and need an explicitly realistic schedule.
- Instructors must arrange reference access and provide or coordinate real human discussion/review in each phase.
- Solo evidence cannot establish human team-collaboration outcomes.

**Neutral:**

- A one-person group does not automatically select the solo rubric: staff explicitly approve the route on a supported run.
- Recorded review evidence is staff attestation, not automated proof of learning or automatic grading.

## Alternatives considered

### Keep the group contract and waive missing peer work informally

This makes expected evidence, available points and passing requirements ambiguous and leaves the interface asking for nonexistent teammates.

### Replace human peers with agent personas

Agents are part of the development-system experiment, but that does not provide independent human review or evidence of human teamwork.

### Build a separate simplified course and workspace

This would duplicate state and assessment logic and weaken comparability across A, B and C.
The approved route changes collaboration evidence within the existing common application and phase boundaries.

## Implementation and verification

[The introduction](../../../specifications/00_introduction.md#approved-solo-route), [common audit/session contract](../../../specifications/00_common_project.md), all three phase briefs and [rubric equivalents](../../../specifications/grading.md#solo-assessment-equivalents) define the route.
[Shared solo contracts](../../../shared/course-solo.ts), [validation](../../../worker/course-solo.ts), [course handler](../../../worker/courses.ts) and [solo interface](../../../site/scripts/course-solo.ts) implement the shared local/Worker behavior.
[Requirement publication](../../../requirements/README.md) retains both editions and their digests.
[API checks](../../../tests/course-solo.test.ts) exercise all three phases, independent review, outgoing audits, portfolios, grade release/export, retained A/B records, locked provenance and reassessment after corrections.
[Browser checks](../../../tests/e2e/course-solo.spec.ts) cover route allocation, independent-review forms, reference audits and solo portfolio/assessment prompts.
Verification passed: all 124 unit checks, TypeScript, the site build and validation of 76 HTML files, plus Chromium checks for the solo route, existing group workspace and retained requirements/evidence.
The solo API walkthrough reaches grade release/export across all three phases; access checks retain private discussion/portfolio evidence while opening technical review to classmates, and corrections require reassessment.
Production deployment and an actual student's allocation/review arrangements are separate operations.

## References

- [Operating guide](../../course-system.md#solo-route-across-all-three-phases).
- [ADR-004: Instructor-supervised groups](../implemented/ADR-004-form-three-person-groups-with-instructor-oversight.md).
- [ADR-008: Mandatory individual credit requirements](../implemented/ADR-008-require-individual-work-for-course-credit.md).
- [ADR-009: Retained evidence and access](../implemented/ADR-009-preserve-evidence-and-control-submission-access.md).
- [ADR-021: Three fresh builds](../implemented/ADR-021-compare-three-fresh-builds-of-one-common-application.md).
- [ADR-023: Bounded audits](../implemented/ADR-023-test-unfamiliar-system-work-through-bounded-audits.md).
