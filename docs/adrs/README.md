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

## Proposed

| ADR                                     | Summary                                    |
| --------------------------------------- | ------------------------------------------ |
| [ADR-000](proposed/ADR-000-template.md) | Reusable template; not a product decision. |

## Accepted

| ADR                                                                               | Summary                                                                                              |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [ADR-002](accepted/ADR-002-separate-course-administration-workflows.md)           | Separate students, groups, phase administration, and course settings.                                |
| [ADR-003](accepted/ADR-003-import-students-and-use-email-magic-links.md)          | Import institutional rosters, allow later additions, and use email magic links without registration. |
| [ADR-004](accepted/ADR-004-form-three-person-groups-with-instructor-oversight.md) | Combine student proposals with instructor allocation; target three members and allow up to four.     |
| [ADR-005](accepted/ADR-005-submit-reproducible-source-with-phase-checklists.md)   | Submit minimal reproducible source and display the common and phase-specific requirements.           |
| [ADR-006](accepted/ADR-006-use-cloudflare-for-course-email.md)                    | Send course login mail through Cloudflare and forward incoming mail to Gmail.                        |
| [ADR-007](accepted/ADR-007-provide-an-isolated-teacher-simulation.md)             | Exercise real workflows using isolated mock students in the website and local development.           |

## Implemented

| ADR                                                                               | Summary                                                                                                |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [ADR-001](implemented/ADR-001-record-decisions-and-retain-development-context.md) | Adopt the ADR lifecycle, clear documentation ownership, and focused verification.                      |
| [ADR-008](implemented/ADR-008-require-individual-work-for-course-credit.md)       | Require individual participation and assessments alongside shared project scores.                      |
| [ADR-009](implemented/ADR-009-preserve-evidence-and-control-submission-access.md) | Preserve assessment evidence and history; stage class access while keeping individual records private. |
| [ADR-010](implemented/ADR-010-keep-the-book-core-focused.md)                      | Keep course policies, optional depth, and supporting case studies outside the main reading argument.   |

## Authoring and maintenance

1. Read the owning contract and relevant existing ADRs before drafting a lasting decision.
2. Copy [ADR-000](proposed/ADR-000-template.md) to `proposed/ADR-NNN-short-title.md`, using the next unused sequential ID.
   The next ID after this initial set is **ADR-011**.
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
