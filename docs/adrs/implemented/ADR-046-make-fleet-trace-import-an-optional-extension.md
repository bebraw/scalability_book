# ADR-046: Make fleet trace import an optional extension

**Status:** Implemented

**Date:** 2026-10-22

**Amends:** The mandatory application-import requirement in [ADR-039](../implemented/ADR-039-sequence-model-sizes-and-permit-mixed-fleets.md), while preserving three fresh builds and the model progression.

## Context

Before this review, Compare required students to transform a real fleet trace, load it into implementation C and use the application to answer debugging questions.
The importer adds export, schema mapping, redaction, provenance and repeat-import work to a phase that also contains a fresh build, scaling experiment, deployment and final analysis.
The first course run has not yet established how difficult the tasks are for groups with different capabilities.

The instructor selected three fresh builds and an optional course benchmark runner, with student-built runners also permitted under the shared protocol.
The trace integration needs a similar distinction between required learning evidence and optional application scope.

## Decision

Require analysis of the actual fleet run, supported by a compact redacted execution record and at least two debugging findings.
Students identify the relevant tasks, actors, handoffs, validation, integration, correction or human intervention and explain the evidence and its limits.
A curated excerpt or table can support this analysis without a normalized trace schema or application importer.

Make trace transformation, repeatable import into C and application-based debugging views an optional extension.
Groups choosing the extension retain trace provenance, redaction, coherent lifecycle mapping and an explicit repeat-import policy that avoids duplicate records.
Live ingestion, universal exporters and elaborate visualizations remain optional.

The required path supports full credit, including grade 5.
Optional integration may provide evidence for existing criteria, but has no separate point allocation, does not replace required analysis and is not a hidden condition for the highest grade.
Retain the existing phase budgets, 153-point maximum and passing minima.
Keep the three fresh builds and real fleet requirement.

## Trigger

During the pre-course specification review, the instructor chose optional trace integration to accommodate variation in group capabilities while task difficulty remains untested.

## Consequences

**Positive:**

- Every group investigates real coordination and correction evidence without needing an application importer.
- Groups with capacity can explore a concrete connection between their application and its development workflow.
- The pilot can distinguish analysis difficulty from integration and export friction.

**Negative:**

- The application no longer necessarily becomes a debugging tool for its own construction.
- Assessment wording must make the full-credit required path explicit and compare evidence fairly across the two paths.

**Neutral:**

- The portable trace example and relevant book demonstrations can remain as extension resources.
- The unused pre-course owners, checklist and snapshots are revised together; editions used by real runs must remain immutable afterward.

## Alternatives considered

### Require the importer for every group

This preserves the self-observation exercise but couples required learning evidence to integration work whose difficulty is not yet calibrated.

### Remove fleet-trace work entirely

This would discard evidence about actual handoffs, review, integration and correction that the fleet phase is intended to examine.

## Implementation and verification

The [Compare brief](../../../specifications/03_compare.md), [rubric](../../../specifications/grading.md), [checklist](../../../shared/course-requirements.ts), affected book checkpoints, plans, operating guidance and pilot documents now distinguish required actual-run analysis from optional trace import.
The unused `2026-10-v2` snapshots were regenerated together after the instructor confirmed that no existing runs need preservation.
The required path can satisfy the full-credit wording without an importer; importing data cannot replace the actual-run findings.

The [scope review verification](../../project-specification-scope-review-2026-10-22.md#verification) records the requirement, build, validation, link and browser checks.
These changes are implemented in the repository and locally reviewed; they have not been deployed.
