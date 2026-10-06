# Architecture Decision Records

ADRs record decisions that shape future work on the book, its website, and course administration.
Use them for lasting constraints, choices between credible alternatives, meaningful trade-offs, and decisions that replace earlier ones.
Small, reversible implementation choices do not need an ADR.

This workflow adapts [bebraw/vibe-template's ADR guide](https://github.com/bebraw/vibe-template/blob/27b3fb0571c421a1aacaf7908e2ef333ddb0d4d2/docs/adrs/README.md) and its separation of documentation responsibilities.
The reviewed source revision is `27b3fb0571c421a1aacaf7908e2ef333ddb0d4d2`.
Local numbering starts afresh; upstream ADR numbers are not our decision identifiers.

## Lifecycle

| Directory      | Status      | Meaning                                                                               |
| -------------- | ----------- | ------------------------------------------------------------------------------------- |
| `proposed/`    | Proposed    | A draft requiring discussion; includes the reusable template.                         |
| `accepted/`    | Accepted    | Agreed direction, with some or all implementation still outstanding.                  |
| `implemented/` | Implemented | The repository implements the decision and the record identifies supporting evidence. |

Acceptance is not evidence of implementation or production deployment.
Move a record only when its status changes, and update its links and this index in the same change.
Mark a replaced decision **Superseded by ADR-NNN**, link the replacement in both directions, and retain the old record in its last lifecycle directory.
Never reuse or renumber an assigned ID.

Dates identify when a record was written or accepted.
The initial records dated 2026-10-05 capture earlier discussion; their implementation evidence distinguishes existing behavior from planned work.

## Retrospective records

ADRs 011–024 recover significant prior work from version history and current contracts.
Their date is the recording date, and each names its historical introduction and links the supporting commits.
They document the implemented outcome rather than invent an earlier formal approval event.
Unless an original source explicitly discusses alternatives, the alternatives and trade-offs are retrospective analysis of the chosen design, not a claim about conversations that Git cannot establish.
Implemented status may describe a published course protocol or software capability; it does not establish production provisioning, a completed course run, or external-client compliance.

Related historical notes remain available as rationale.
Current behavior belongs in the owning contract and operating guide; old follow-up lists do not independently authorize or require new features.

## Proposed

| ADR                                     | Summary                                    |
| --------------------------------------- | ------------------------------------------ |
| [ADR-000](proposed/ADR-000-template.md) | Reusable template; not a product decision. |

## Accepted

No accepted decisions await implementation.

## Implemented

| ADR                                                                                                 | Summary                                                                                                                                       |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [ADR-001](implemented/ADR-001-record-decisions-and-retain-development-context.md)                   | Adopt the ADR lifecycle, clear documentation ownership, and focused verification.                                                             |
| [ADR-002](implemented/ADR-002-separate-course-administration-workflows.md)                          | Separate enrollment, group consent/allocation, phase administration and settings with independent saves.                                      |
| [ADR-003](implemented/ADR-003-import-students-and-use-email-magic-links.md)                         | Import institutional rosters, preserve record ownership and use course-scoped email sessions.                                                 |
| [ADR-004](implemented/ADR-004-form-three-person-groups-with-instructor-oversight.md)                | Combine consent and instructor allocation; retain history through late arrival, withdrawal and group corrections.                             |
| [ADR-005](implemented/ADR-005-submit-reproducible-source-with-phase-checklists.md)                  | Retain versioned requirements and indexed/missing evidence, small reproducible source and staged technical completion.                        |
| [ADR-006](implemented/ADR-006-use-cloudflare-for-course-email.md)                                   | Use Cloudflare sending and Worker forwarding with private address configuration and verified instructor-controlled delivery.                  |
| [ADR-007](implemented/ADR-007-provide-an-isolated-teacher-simulation.md)                            | Exercise real workflows using isolated mock students in the website and local development.                                                    |
| [ADR-008](implemented/ADR-008-require-individual-work-for-course-credit.md)                         | Require individual participation and assessments alongside shared project scores.                                                             |
| [ADR-009](implemented/ADR-009-preserve-evidence-and-control-submission-access.md)                   | Preserve assessment evidence and history; stage class access while keeping individual records private.                                        |
| [ADR-010](implemented/ADR-010-keep-the-book-core-focused.md)                                        | Keep course policies, optional depth, and supporting case studies outside the main reading argument.                                          |
| [ADR-011](implemented/ADR-011-publish-markdown-through-a-static-worker-site.md)                     | Publish repository Markdown through a static site with Worker application APIs.                                                               |
| [ADR-012](implemented/ADR-012-use-scholarmark-with-trusted-host-extensions.md)                      | Use ScholarMark semantics and sanitization with explicit trusted host extensions.                                                             |
| [ADR-013](implemented/ADR-013-keep-reader-feedback-private-and-sync-moderation-explicitly.md)       | Keep reader feedback private and synchronize moderation through explicit commands.                                                            |
| [ADR-014](implemented/ADR-014-isolate-and-atomically-rebuild-local-previews.md)                     | Isolate draft previews, preserve complete builds, and recover interrupted swaps.                                                              |
| [ADR-015](implemented/ADR-015-use-typed-client-modules-and-load-demos-on-demand.md)                 | Use typed browser modules, scoped demo loading, and compatibility checks.                                                                     |
| [ADR-016](implemented/ADR-016-version-formative-exercises-and-save-private-answers.md)              | Version canonical formative questions and keep saved answers private and separate from grading.                                               |
| [ADR-017](implemented/ADR-017-export-an-authored-concept-graph-for-reader-agents.md)                | Publish authored concept navigation and read-only resources for students' own agents.                                                         |
| [ADR-018](implemented/ADR-018-offer-optional-agent-explorations-with-separate-worked-reasoning.md)  | Offer task-based optional explorations, prediction-led guidance, and separate worked reasoning.                                               |
| [ADR-019](implemented/ADR-019-publish-self-study-through-a-pinned-public-exporter.md)               | Build public self-study modules through a pinned exporter without hosting its authoring service.                                              |
| [ADR-020](implemented/ADR-020-generate-reading-and-lecture-pdfs-from-versioned-sources.md)          | Regenerate portable reading and lecture artifacts from reviewed sources.                                                                      |
| [ADR-021](implemented/ADR-021-compare-three-fresh-builds-of-one-common-application.md)              | Compare fresh local-model, comparison-model, and fleet builds of a stable application brief.                                                  |
| [ADR-022](implemented/ADR-022-use-a-shared-runtime-protocol-and-bounded-pressure-experiments.md)    | Use a shared measurement protocol and bounded, cumulative pressure experiments.                                                               |
| [ADR-023](implemented/ADR-023-test-unfamiliar-system-work-through-bounded-audits.md)                | Test setup and change friction through equivalent, time-bounded cross-team audits.                                                            |
| [ADR-024](implemented/ADR-024-make-prose-reviewable-and-derive-chapter-dates-from-git.md)           | Keep prose changes inspectable and derive publication dates from complete source history.                                                     |
| [ADR-025](implemented/ADR-025-fingerprint-published-site-css-and-javascript.md)                     | Fingerprint compiled site CSS/JS and revalidate HTML and stable asset URLs.                                                                   |
| [ADR-026](implemented/ADR-026-support-an-approved-solo-course-route.md)                             | Preserve all three phases through an approved solo route with independent review and equivalent assessment evidence.                          |
| [ADR-027](implemented/ADR-027-connect-book-learning-to-student-agents-through-a-local-companion.md) | Connect the whole book to students' own agents through a local companion, shared context and bounded demo actions.                            |
| [ADR-028](implemented/ADR-028-use-a-private-reflection-notebook-to-support-course-learning.md)      | Keep a portable private notebook with supported reflection, revisable concept self-assessment and selected material for existing submissions. |
| [ADR-029](implemented/ADR-029-support-asynchronous-peer-inquiry-through-opt-in-annotations.md)      | Add opt-in group/cohort inquiry after individual work, preserving private feedback and deliberate public curation.                            |
| [ADR-030](implemented/ADR-030-distribute-the-learning-companion-with-guided-student-setup.md)       | Distribute the standalone npm companion with guided setup, stable storage, explicit migration, recovery and verified releases.                |

[The learning workspace guide](../learning-workspace.md) records current companion and peer behavior, rollout requirements and learner-evaluation limits.

## Authoring and maintenance

1. Read the owning contract and relevant existing ADRs before drafting a lasting decision.
2. Copy [ADR-000](proposed/ADR-000-template.md) to `proposed/ADR-NNN-short-title.md`, using the next unused sequential ID.
   Find the highest assigned ID across all lifecycle directories rather than keeping a separate next-ID counter.
3. Describe the concrete problem, decision, trigger, consequences, and credible alternatives.
   Separate agreed constraints from unresolved implementation questions.
4. Move an approved decision to `accepted/` and update the index.
   Existing discussion can establish acceptance; an ADR does not introduce a new approval step.
5. Implement the decision within the authorized task, update the owning behavior and operating documents, and record relevant verification and remaining limits.
6. Move it to `implemented/` only when the full recorded decision is reflected in the repository.
   If deployment or external setup remains, state that boundary explicitly.
7. Preserve historical rationale when a later decision supersedes it.

Keep rationale here, current composition in [ARCHITECTURE.md](../../ARCHITECTURE.md), and development commands in [development.md](../development.md).
Use [course-system.md](../course-system.md) for implemented course workflows and [specifications/](../../specifications/README.md) for student-facing requirements.

Search examples:

```bash
rtk rg 'Status:|Superseded by' docs/adrs
rtk rg 'identity|group|submission|simulation' docs/adrs
```
