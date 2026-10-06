# ADR-028: Use a private reflection notebook to support course learning

**Status:** Implemented

**Date:** 2026-10-06

## Context

The course already requires learning diaries and private individual portfolios.
Its rubric rewards a concrete idea, failure or trade-off connected to project evidence, a prior assumption or a decision worth revisiting.
Students may be unfamiliar with reflection and need transparent examples and support for gathering enough material.
A conversation transcript or a concept completion mark alone does not explain what a student learned or why their thinking changed.

The user wants a private working space from which students derive their submissions: a virtual notebook or knowledge-management system integrated with their reading and investigations.
The purpose is to support understanding and completion of the course while reducing entry and preparation friction within the existing workload.

## Decision

Make a private notebook the persistent learning record for the whole book.
The local companion in [ADR-027](ADR-027-connect-book-learning-to-student-agents-through-a-local-companion.md) owns its durable storage independently of a particular provider's conversation history.
Students can capture and edit notes without a model connection, browse previous work and export/import their notebook in a portable, versioned format.
Cross-device synchronization is a later choice; it is not required for the first implementation.

### Records and source context

Support short scratch notes and developed reflections, linked to relevant passages, concepts, explorations, demo observations or project evidence.
Retain entry identity, dates, source links and enough quoted/contextual information to interpret a note after the book changes.
Use source revisions where available and distinguish a changed or missing source from a currently verified anchor.
A revision identifier does not imply that the website archives the entire earlier publication.

Students choose which notebook entries to use as agent context and which to share under [ADR-029](ADR-029-support-asynchronous-peer-inquiry-through-opt-in-annotations.md).
Teachers and peers do not gain access to the private notebook through course membership.
The model provider receives only the context selected for the relevant interaction.
Agent suggestions remain identifiable as suggestions until the student accepts or revises them; the agent must not invent the student's experience or observations.
Retain the provenance of accepted assistance alongside the student's revisions.

### Reflection support

Give examples of an initial attempt, a developed reflection, honest confusion, a failed experiment and evidence that supports an unchanged view.
Explain the expected specificity without prescribing the conclusion or grading literary polish.
Suitable introductory guidance is:

> There is no single correct conclusion.
> Confusion, a failed experiment, or an unchanged opinion can all be worth recording.
> Give enough detail that you can later understand what you thought, what you observed, and what you want to investigate next.

A developed example is:

> I expected increasing queue capacity to improve throughput.
> In the demo, more requests waited, but processing stayed limited by the workers.
> I now distinguish buffering from processing capacity.
> I still want to investigate when extra buffering helps with temporary bursts.

Use prompts such as the initial assumption or question, observation/evidence, changed or better-supported explanation, uncertainty and next investigation.
Prompts support student writing rather than requiring identical sections after every interaction.
Examples must identify the demo assumptions and must not imply that one illustrative result establishes a universal claim.

Encourage enough detail through representative examples, a suggested length and a visible character count for written developed reflections.
Short scratch notes remain valid captures, and length is not an automatic measure of understanding or a grade.
The user raised a possible minimum character count; the exact target and whether developed reflections should have a hard minimum remain open for evaluation.
Existing audio/video diary options remain valid when selecting submission material.

### Concept understanding and revisiting

Separate engagement (for example, Studied) from a student's self-assessment (for example, Unsure, Can explain or Can apply).
Let students date and revise those judgments, connect them to evidence and record a next intention.
These are personal navigation and reflection aids, not automatic mastery certifications or shared group verdicts.
Keep them distinct from saved exercise answers and formal course assessment.
Only authored registries establish concept definitions and graph relationships; notebook associations do not create canonical graph edges.

Offer opportunities to return after a delay, explain an idea before rereading and apply it to a changed situation.
Students control the pace; this decision does not require notifications or scheduled study obligations.

### Submissions and workload

Students select, organize and revise notebook material into the existing diary or portfolio requirements.
A submitted copy enters the existing course storage/access contract; it does not grant access to the source notebook.
The student reviews the destination and material before submitting.
Preserve the independence of private individual reflection, shared group findings and technical project evidence.
Raw agent transcripts, concept markers, character counts and note counts are not substitutes for the current rubric.

The notebook adds no required report, activity quota, grade criterion or course checkpoint.
Changes to published assessment expectations require their own student-facing contract and requirement-edition workflow.
Learning and submission preparation should reuse material captured during ordinary course work, within the published time budget.

## Trigger

The user accepted the private working-space model, asked for explicit reflection examples and adequate material, and identified learning and course completion as the primary outcomes.
Whole-book support is acceptable for the first implementation.

## Consequences

**Positive:**

- Students retain their questions, evidence and evolving explanations across conversations and providers.
- Examples make reflection approachable and expectations visible.
- Captured learning can reduce the reconstruction needed for existing submissions.

**Negative:**

- Local ownership requires understandable backup, export/import and recovery workflows.
- Prompts and length cues can add friction if they interrupt every small investigation.
- Self-assessment can be inaccurate and must remain distinguishable from demonstrated independent application.

**Neutral:**

- Current grades, private portfolio access and audio/video diary options are unchanged.
- The first implementation supports the whole book; evaluation can focus on representative journeys without making every page a required activity.

## Alternatives considered

### Store only transcripts or concept completion flags

These capture interaction or navigation but do not reliably preserve a student's interpretation, evidence and next question.
Conversation history may support retrieval, while the notebook holds the selected learning record.

### Make the notebook a teacher-visible course record

The agreed model is a private working space with deliberate selection into submissions or shared discussion.
Course membership alone must not expose tentative notes.

### Require a fixed-length reflection for every paragraph or agent turn

This could produce substantial writing without matching the significance of each interaction.
Support short capture and developed reflection, and evaluate any minimum against useful material and workload.

## Implementation and verification

The private notebook entered in [ea45d67](https://github.com/bebraw/scalability_book/commit/ea45d6764e1087d532416737531f9ec1addcd3bf), with the whole-book capture, reflection, concept judgment, revisit and selective preparation interface in [f1c116b](https://github.com/bebraw/scalability_book/commit/f1c116b7c1f2df7d07c36ea9cde7cb6e89352706).
[7de6ed0](https://github.com/bebraw/scalability_book/commit/7de6ed0d0d55ed5cbb5d8dc50c22a8b5b4ae7d21) adds student-reviewed agent drafts, selected peer reflection and the voluntary evaluation guide.
[The workspace contract](../../learning-workspace.md#notebook-and-portability) owns schema version 1, SQLite storage, revision history, export/import conflicts and recovery.
Saved formative answers remain under [ADR-016](../implemented/ADR-016-version-formative-exercises-and-save-private-answers.md), and submissions remain under [the course operating guide](../../course-system.md).

Verification on 2026-10-06 covered durable capture/editing across restarts, operation without a model connection, versioned export/import, preserved source context, explicit sharing/context selection and selective submission preparation.
Synthetic API/browser records exercised website/companion privacy and existing course submission boundaries.
Private notes do not enter shared APIs, public graph exports or grade calculations by default.
The full unit suite passed 141 tests, notebook and peer journeys passed in Chromium/WebKit, and the real Codex journey retained reviewed assistance provenance.
The suggested 400-character cue is optional; no hard minimum or new grading obligation was introduced.

Evaluate the first whole-book implementation with individual and group learners on three outcomes:

| Outcome         | Evidence                                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Learning        | Initial and revised explanations, evidence supporting the change, and later independent explanation/application in a changed situation.                       |
| Course progress | Progress through existing checkpoints, preparation of existing submissions, completion and reported points of difficulty.                                     |
| Workload        | Student-reported setup, investigation and reflection effort, including whether notebook reuse reduces submission preparation within the existing time budget. |

[The evaluation guide](../../learning-workspace-evaluation.md) provides a representative queue investigation, independent changed-situation/recall tasks and follow-up at existing phase checkpoints.
Learner-outcome evidence remains to be collected; Implemented describes the software and evaluation protocol, not an established learning gain.
Use representative course questions and existing checkpoints where possible rather than adding a parallel assessment programme.
Collect evaluation evidence deliberately; evaluation does not authorize routine access to private notebooks or full conversation logs.
A small pilot can establish usability and identify problems but does not by itself prove a causal effect on course completion.
Report uncertainty and follow actual progress through the course before claiming that outcome.

## Open questions

- Calibrate examples and suggested reflection length, and evaluate whether any hard minimum helps students gather useful material without increasing unnecessary work.
- Adapt representative independent application tasks and practical evaluation checkpoints to learner needs within the existing workload.

## References

- [Current diary and individual assessment rubric](../../../specifications/grading.md#participation-and-learning-diary-3-points-per-lecture).
- [Current course portfolio/submission workflow](../../course-system.md).
- [ADR-008: Individual course evidence](../implemented/ADR-008-require-individual-work-for-course-credit.md).
- [ADR-009: Submitted evidence and access](../implemented/ADR-009-preserve-evidence-and-control-submission-access.md).
- [ADR-017: Authored concept graph](../implemented/ADR-017-export-an-authored-concept-graph-for-reader-agents.md).
- [Choi et al.: Reflection prompts with hints in an online programming course](https://doi.org/10.1016/j.iheduc.2023.100903).
  A field experiment in a four-week online master's course found improved delayed transfer with reflection prompts and hints; it does not establish an optimal character count or whole-course completion for this setting.
- [Dunlosky et al.: Review of learning techniques](https://doi.org/10.1177/1529100612453266).
  Retrieval practice and distributed practice motivate revisiting and independent application; notebook use is not itself evidence that these practices occurred.
