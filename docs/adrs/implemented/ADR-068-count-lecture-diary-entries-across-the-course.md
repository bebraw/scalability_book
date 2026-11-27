# ADR-068: Count lecture diary entries across the course

**Status:** Implemented

**Date:** 2026-11-26

## Context and trigger

When reviewing the welcome slides, the instructor found that a single weak phase could outweigh strong project work.
The earlier rubric required six full-credit lecture activities and a minimum score for assessment and contribution in every phase. [ADR-008](ADR-008-require-individual-work-for-course-credit.md)

## Decision

For new runs, require 10/30 on each of the three projects, a submitted diary entry for seven of nine distinct lectures across the course, and 50% of the available total points.
Entries can earn partial credit and the seven can come from any combination of phases.
A lecture counts when its submitted portfolio slot contains an idea, a connection or a reference to an audio or video entry in either field.
Attendance has its own scoring criterion.

Keep the 153-point maximum, the published grade bands, and the 36 points available for self- and peer-assessment.
Peers provide feedback and the instructor awards points.
Approved individual arrangements can record an adjusted entry count and available points.

## Alternatives and consequences

A lower score threshold in every phase would still let a single weak assessment override three successful builds.
A points-only pass would allow shared project marks to cover the whole individual requirement.
Counting entries gives students and staff a check they can reproduce while keeping the quality of reflection and feedback visible in the point score.
Six excellent entries can still leave the individual requirement unmet, so the gradebook shows the entry count and the rubric points students to the published correction arrangements.

The numerical thresholds are course choices.
Aalto recommends assessing against the published learning outcomes.
Monash’s assessment guidance reserves mandatory thresholds for evidence of essential capabilities. [Aalto assessment guidance](https://www.aalto.fi/en/teachers-handbook/learning-assessment-at-aalto-university) · [Monash guidance on assessment hurdles](https://www.monash.edu/learning-teaching/teachhq/Assessment/designing-assessment-regimes/how-to/use-hurdles-in-assessment)

## Implementation and verification

New runs pair requirements `2026-11-v2` with rubric `2026-11-individual-evidence-v3`; older runs keep their pinned rules and existing private arrangements.
The [published rubric](../../../specifications/grading.md) and [shared grade calculation](../../../shared/course.ts) define the rule used for staff review, released grades and CSV export.
The [course tests](../../../tests/courses.test.ts) and [teacher rehearsal](../../../tests/e2e/course-simulation-walkthrough.spec.ts) cover the grading workflow with synthetic students.
