# ADR-032: Connect notebook investigations to independent application and reflection

**Status:** Accepted

**Date:** 2026-10-07

## Context

The Chapter guide currently connects an initial prediction, an actual demo result and a private reflection.
The notebook also supports revisits and evidence-linked concept judgments under [ADR-028](../implemented/ADR-028-use-a-private-reflection-notebook-to-support-course-learning.md).
Agent instructions and the evaluation guide already encourage independent explanation in a changed situation, and selected book exercises include such questions.
The ordinary notebook investigation does not consistently offer that follow-up.

Completing a task with assistance does not establish that the student can explain or apply the idea independently.
The ZPD/scaffolding rationale in [ADR-031](../implemented/ADR-031-adapt-learning-support-to-the-students-current-task.md) calls for transferring responsibility as support becomes less necessary.
Students also need support for reflection itself, since many are unfamiliar with this practice.

## Decision

Make an independent follow-up and supported reflection easy to choose as part of ordinary notebook investigations across the published book.
Extend ADR-028 with a visible optional sequence: initial thinking, appropriate support and evidence, independent application in a changed situation, then reflection.
Students can stop, resume, skip a step or return for more help; this adds no activity quota or assessment checkpoint.

### Independent application

Offer a related case that changes an assumption, boundary or situation enough to require reasoning rather than copying the preceding answer.
For a queue investigation, a variation might change processing capacity or introduce a growing queue, with the relevant assumptions stated explicitly.
Ask the student to predict or explain before revealing worked reasoning or returning to the agent.
Provide access to help when requested; the independent attempt is an opportunity to learn, not a lock on support or proof that external help was absent.

An authored follow-up should identify the question, assumptions and useful self-check or explanation criteria.
Use existing changed-situation exercises and concept connections where appropriate.
Students may investigate their own related case; identify agent-suggested cases and answers as suggestions, and preserve source and assistance provenance when accepted.
A reading without an embedded demo can use explanation, comparison or a project application rather than inventing a browser observation.

Offer revisiting after a delay, with recall before rereading, through the existing notebook navigation.
Students control the timing; notifications, scheduled study obligations and automatic mastery updates are outside this decision.

### Reflection as a supported learning task

Offer optional prompts and representative examples that connect the initial view, evidence, current explanation and remaining need for help.
Suitable starters include “I expected…”, “The observation showed…”, “I can now explain…”, and “I would still want help with…”.
Support uncertainty, a failed check and an unchanged explanation supported by better evidence.
Free writing and short scratch notes remain available; examples must not prescribe a correct personal conclusion.

Keep the initial attempt, later application and reflection distinguishable and related, rather than replacing the initial view with a polished final account.
Students decide whether evidence warrants revising their own concept judgment.
Agent-written text must not stand in for the student's claimed independent explanation or invent their experience.
Reflection length remains guidance under ADR-028; characters, note counts and model approval do not measure understanding.
Reuse selected material in the existing diary/portfolio workflow, including its audio/video options.

### Entry points, state owners and dependency direction

- Chapter guide is the primary guided entry; Agent can invite a follow-up, and Notes/Revisit can resume it.
- Authored questions, variations, assumptions and self-check criteria belong to the existing shared learning-resource owners and book material, with stable identities and versions when used as persisted activity context.
- The browser owns presentation and unfinished tab drafts; the local notebook owns explicitly saved attempts, evidence, related entries and accepted assistance provenance.
- Shared learning contracts define any new source/activity relationships before storage or provider adapters implement them.
- Selected submission copies enter the existing course submission contract; private investigation records do not become course records by default.

Retain source revisions and activity identity so a later book edit cannot silently reinterpret a saved attempt.
Version any required persistent representation changes and verify export/import compatibility rather than putting provider-thread state into portable learning records.

### Evaluation

Extend the existing voluntary evaluation protocol to examine initial thinking, assisted work, independent application and delayed recall.
Use student-selected excerpts or interviews, including disagreement, continuing difficulty and unsupported agent claims.
In groups, collect each consenting learner's chosen explanation rather than inferring individual understanding from the shared result.
Follow existing course checkpoints and workload, including whether notebook reuse reduces submission preparation.
Routine transcript collection, private notebook inspection and interaction counts are not authorized evaluation methods.

## Trigger

The user requested ADRs after the ZPD review identified independent follow-up as an existing pedagogical intention that should become visible in normal notebook use.
The discussion also identified reflection as a skill needing its own support.

## Consequences

**Positive:**

- Students can distinguish receiving a useful explanation from being able to use the idea themselves.
- Related attempts and reflection preserve evidence of how thinking developed and support existing submissions.

**Negative:**

- Useful variations and self-checks need authoring and review; repeating the same calculation may provide weak evidence.
- Extra prompts can increase workload unless students can skip them and reuse ordinary course work.

**Neutral:**

- Independent attempts and concept judgments remain formative and private.
- Software implementation and evidence of improved learning remain separate milestones.

## Alternatives considered

### End every investigation after saving the demo result and reflection

This captures an observation but leaves independent application largely to student initiative.
Offer a concrete next case as part of the investigation.

### Use a completion badge or automatic mastery score

A saved answer, confident reflection or accepted agent draft does not establish independent application.
Retain evidence-linked student judgments and the existing distinction between formative work and assessment.

### Require a transfer task and fixed-length reflection for every chapter

This would add obligations and could duplicate existing exercises and submissions.
Use optional activities with transparent examples and evaluate their value and workload first.

## Implementation and verification

Current predictions, observations, reflections, revisit records and authored changed-situation exercises provide the baseline.
A consistent notebook follow-up, its authored activity context and reflection support remain to be implemented.

Before marking this record Implemented:

- Connect the guided sequence across reading and demo contexts, reusing canonical exercises without changing their independent checking/grading contract.
- Verify a meaningful authored changed situation, attempt before reveal, requested help, skipping/resuming, and operation without an agent.
- Verify separate related records, retained source/activity versions, student-reviewed assistance and preservation of initial thinking across navigation, restart and portable export/import.
- Verify that free writing, uncertainty and short notes remain valid and that no activity completion or agent reply automatically sets understanding or course credit.
- Update workspace/setup documentation and the evaluation guide with independent application, delayed recall and learner-selected evidence.

Use synthetic records for technical checks and record the actual limits of any provider evaluation.
A working sequence and evaluation protocol are sufficient software implementation evidence; a learning-gain claim requires learner outcomes.

## Open questions

- Which existing authored variations should provide the first representative activities, and where would a new variation add value without duplicating an exercise?
- Which reflection prompt presentation students find useful without turning an investigation into repetitive form filling; evaluate this within the agreed optional sequence.

## References

- [Learning workspace contract](../../learning-workspace.md).
- [Learner evaluation guide](../../learning-workspace-evaluation.md).
- [ADR-016: versioned formative exercises](../implemented/ADR-016-version-formative-exercises-and-save-private-answers.md).
- [ADR-018: optional explorations and separate worked reasoning](../implemented/ADR-018-offer-optional-agent-explorations-with-separate-worked-reasoning.md).
- [Vygotsky: The Problem of Teaching and Mental Development at School Age](https://www.marxists.org/archive/vygotsky/works/1931/school-age.htm).
- [Van de Pol, Volman and Beishuizen (2010): Scaffolding in Teacher–Student Interaction: A Decade of Research](https://link.springer.com/article/10.1007/s10648-010-9127-6).
