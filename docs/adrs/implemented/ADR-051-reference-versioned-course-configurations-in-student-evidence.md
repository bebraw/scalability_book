# ADR-051: Reference versioned course configurations in student evidence

**Status:** Implemented

**Date:** 2026-10-22

## Context

The course publishes supported model, harness and environment configurations, while the common evidence contract asks students to describe much of the same setup.
Repeating unchanged details creates reporting work without establishing what actually ran.

## Decision

Publish each course configuration with a version, date and stable retained snapshot.
Students link that exact version, confirm the models, assignments, routes and environment actually used, and record deviations, substitutions and fallback.
The configuration reference and deviations together retain the required tool, capability, orchestration, resource, data-path and operational provenance.
Add exposed settings when material to a claim and mark unavailable details honestly; an unavailable observation is not confirmation of a default.
Unchanged published details may be referenced without being rewritten.

Keep the existing numeric rubric, passing minima and actual fleet resource accounting.
This decision changes evidence access and reporting, without prescribing model products or asserting that the pilot environments are ready.

## Trigger

The instructor approved exact configuration references, actual-use confirmation, deviations, material settings and honest accounting of unavailable details.
The instructor also confirmed that no existing course runs need preservation, allowing the unused requirement edition to be revised in place.

## Consequences

- Students and graders can trace evidence to one retained configuration while focusing on actual conditions and exceptions.
- Instructors must retain earlier configuration versions when assignments change.
- A configuration link alone cannot establish actual execution or hide fallback and accounting gaps.

## Alternatives considered

### Repeat all configuration fields in every submission

This keeps each report self-contained but duplicates maintained course information and creates opportunities for copied defaults to be mistaken for observations.

### Accept an unversioned link without actual-use confirmation

Later edits could change the interpretation of earlier results, and a declared route would not establish which route ran.

## Implementation and verification

The [common setup evidence](../../../specifications/00_common_project.md), [environment publication rule](../../../specifications/course_environment.md), checklist, operating guidance and pilot documents now support exact retained configuration references with actual-use confirmation and deviations.
The unused `2026-10-v2` snapshots were regenerated in place with the instructor's confirmation that no existing runs need preservation; the numeric rubric remains `2026-10-solo-equivalence-v2`.
Actual model assignments and publication of the run-specific configuration versions remain instructor preparation work.

The [scope review verification](../../project-specification-scope-review-2026-10-22.md#verification) records the requirement, build, validation, link and browser checks.
These changes are implemented in the repository and locally reviewed; they have not been deployed.
