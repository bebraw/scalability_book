# ADR-005: Submit reproducible source with phase checklists

**Status:** Implemented

**Date:** 2026-10-05

**Later revision:** [ADR-039](ADR-039-sequence-model-sizes-and-permit-mixed-fleets.md) revises the phase model assignments and replaces the unused pre-course editions and legacy fallback recorded here.

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

The [common contract's packaging instructions](../../../specifications/00_common_project.md#9-5-package-the-source) and submission interface ask for a small complete archive, document exclusions and necessary artifact exceptions, and require a supported unpack/install/initialize/run/validate path.
Repository URLs are optional; archive integrity and the full implementation revision remain recorded.
The server stores and streams uploads without executing them.

The [shared checklist](../../../shared/course-requirements.ts) indexes the full common evidence categories and each phase's distinct requirements beside preparation/final-evidence forms and technical review.
Students locate evidence, explicitly declare missing work or leave entries unindexed; these markers do not award points.
New runs pin an edition; legacy runs without a pin retain the fixed first edition.
The [versioning workflow](../../../requirements/README.md) retains archived readable briefs/downloads and checks document/checklist digests during builds, rejecting silent drift.

The [submission domain](../../../worker/course-submission.ts) validates staged technical evidence, attachments and A/B record references.
Evidence drafts remain private to the group and staff.
Submitted final evidence follows timed auditor/class access while preserving frozen source, setup, initial evidence/checklist and membership.
Private portfolio files cannot be attached; later revisions make prior assessments stale until reviewed.
Compare links the existing A and B frozen records and opens read-only technical views instead of requiring duplicate archives.
All revision snapshots and reasons remain stored.

API checks verify incomplete submissions, optional repository links, private draft/file access, rejected private attachments, deadline/correction rules, immutable frozen fields/history, stale assessments and exact earlier references without duplicate archives.
Requirement checks resolve every checklist link to its archived owner and reject changed live sources, archived sources and checklist digests.
The controlled [source fixture](../../../tests/fixtures/course-source/README.md) is ZIP-packaged, unpacked cleanly, installed offline, initialized and validated; its documented HTTP path and restart persistence were also checked locally.
It is a limited synthetic fixture, not a complete assessed project.
The three-phase browser flow verifies indexed/missing evidence, technical drafts/attachments, separate Compare models, A/B navigation, archived pages, mobile layout and accessibility.
The local D1/R2 Worker check verifies streamed final attachments, retained initial checklists/source, read-only records and existing authorization/history.

The [operating guide](../../course-system.md#run-requirements-and-evidence-checklists) and student instructions describe the implemented workflow.
Verification passed: 93 unit tests, four course browser tests, type checking, site build/HTML validation and the local Worker check.
This status records repository behavior; it does not claim production deployment or that student work has been judged complete by automated presence checks.

## Implementation choices

- Author and review concise checklist entries against the detailed requirement owners, retain immutable editions and reject digest drift; do not try to infer every obligation from Markdown headings.
- Provide packaging guidance using ordinary archive tools and a clean-directory check rather than a filename-based safety or correctness verdict.
  Installed or generated exceptions remain documented instructor judgments.
