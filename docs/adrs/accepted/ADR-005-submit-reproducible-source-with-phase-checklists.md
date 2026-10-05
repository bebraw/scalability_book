# ADR-005: Submit reproducible source with phase checklists

**Status:** Accepted

**Date:** 2026-10-05

## Context

Students need clear requirements for each phase, and auditors need a small, usable copy of the assessed implementation.
Installed dependencies and generated output increase upload and review costs without normally contributing useful evidence.
Requirements already live in the common contract, phase briefs, and rubric, but the submission interface does not yet present their full phase-specific checklist.

The current system freezes source, setup, and initial evidence, then allows an author response.
The course's staged evidence flow also needs a clear way to complete technical evidence while preserving the original submission.

## Decision

Ask for the smallest complete source bundle that another group can reproduce.
Include application source, relevant tests, small synthetic fixtures, dependency manifests and lockfiles, migrations, setup scripts, example configuration, and curated technical evidence.
Exclude installed dependencies such as `node_modules` and `.venv`, `.git`, caches, reproducible build output, model weights, secrets, and personal data.
Document exceptions for necessary vendored or generated artifacts rather than imposing a source-file-only rule.

The supported instructions must cover unpacking, dependency installation, fixture initialization, running the application, and validation.
Retain the full implementation revision and the archive's integrity record.
Uploaded source provides the stable course copy; access must not depend on a public GitHub repository or a classmate's personal credentials.
Repository links may provide useful context without replacing the submitted archive.

Show the common and selected phase requirements beside submission and review forms.
The [common contract](../../../specifications/00_common_project.md), [phase briefs](../../../specifications/README.md), and [rubric](../../../specifications/grading.md) remain the requirement owners.
One clearly indexed artifact may satisfy several requirements; do not require duplicate files for chapter checkpoints.
Compare should link earlier A and B submission records rather than require redundant archive copies.

The checklist must make the following distinctions visible without replacing the detailed briefs:

| Phase         | Evidence emphasis                                                                                                                                                                                                                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All phases    | Required application behavior, setup and validation, shared workload/resource baseline, architecture and development setup, representative AI-use evidence, bounded claims and limits, audit and response.                                                                                                                       |
| Establish — A | Fresh common-core implementation; approved local-model single-agent workflow; stack hypothesis, runtime and contributor claims, primary pressure transformation, ownership card, and local-workflow reflection.                                                                                                                  |
| Challenge — B | Fresh implementation with an approved comparison model; repeat the baseline and primary pressure, test a secondary architectural pressure, check Little's Law with a conserved workload window, justify a response and its obligations, and provide case transfer, ownership, and A–B comparison evidence.                       |
| Compare — C   | Fresh implementation using real delegated fleet work; indexed C/common evidence with A/B links, fleet plan and curated trace/debugging evidence, bounded single-agent/fleet comparison and workflow model, a separate application model, implemented scaling response and deployment evidence, and a conditional A–B–C decision. |

Respect three stages: freeze the implementation and initial evidence, complete the assigned audit, then complete technical evidence and the author response by the evidence deadline.
Later evidence appends as a revision without replacing frozen source, setup, initial evidence, or membership.
Changes relevant to assessment make prior assessments stale until reviewed.
Private individual portfolios remain separate from the class technical gallery.

Presence checks help students locate evidence; they do not determine its quality or replace instructor judgment.
Students can submit honestly incomplete work, with missing measurements or artifacts declared explicitly.
Do not execute uploaded code on the course server to validate completeness.

## Trigger

The instructor requested guidance against submitting dependencies and a clear explanation of what each phase expects.

## Consequences

**Positive:**

- Smaller archives are easier to store, download, inspect, and reproduce.
- Students and instructors can identify the same required evidence before submission and grading.
- Later evidence remains connected to the original assessed implementation.

**Negative:**

- Checklists need to stay synchronized with the published briefs and rubric.
- Supporting final technical evidence requires extending the current post-freeze record flow.
- Packaging guidance must accommodate different stacks and justified artifact exceptions.

**Neutral:**

- Existing file limits remain operating constraints until separately revised; a small bundle does not establish a new size limit.
- A packaging helper or archive warning can assist students, but its design is an implementation choice.

## Alternatives considered

### Upload an entire working directory

This includes avoidable dependencies, caches, and potentially sensitive data while still not proving reproducibility.

### Require only a repository URL

Private access, later edits, and removed repositories undermine a stable course record and equal auditor access.

### Add a separate upload for every chapter artifact

This multiplies submissions and duplicates evidence that the course explicitly allows students to combine.

## Implementation and verification

Archive freezing and staged audit access already exist, but source exclusions, phase checklists, and completion of technical evidence beyond the author response remain pending.
Verify a representative minimal bundle can be reproduced from its instructions and a checklist can locate all common and phase-specific evidence.
Verify final evidence cannot replace the frozen implementation and cannot expose a private portfolio.
Before implementation is complete, update student instructions and course-system documentation together.

## Open questions

- Choose how the interface derives and versions checklist entries so they cannot silently drift from a course run's published requirements.
- Define archive warnings and any packaging helper without treating a filename heuristic as proof of safety or correctness.
