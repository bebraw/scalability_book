# ADR-031: Adapt learning support to the student's current task and understanding

**Status:** Accepted

**Date:** 2026-10-07

## Context

The notebook already provides reading context, selected passages, private initial attempts and student-selected agent help modes.
The agent can ask questions, give hints, explain directly, check reasoning and support reflection under [ADR-027](../implemented/ADR-027-connect-book-learning-to-student-agents-through-a-local-companion.md).
These capabilities make assistance available, but do not establish that the assistance addresses the learner's present difficulty.
A chapter location or self-assessment alone cannot distinguish a missing prerequisite, a misconception, an unclear task or difficulty using a demo.

Vygotsky's Zone of Proximal Development connects independent performance with what becomes achievable through guidance or collaboration.
Later scaffolding research identifies responsiveness to the learner, fading support and transfer of responsibility as central characteristics.
We use these ideas as a design rationale; their application to this course and an LLM companion requires learner evaluation.

## Decision

Make task-specific, responsive assistance an explicit part of the optional notebook learning experience across the published book.
Extend the supporting-agent contract in ADR-027 and connect it to independent practice in [ADR-032](ADR-032-connect-notebook-investigations-to-independent-application.md).

### Adapt assistance from visible student thinking

Invite a brief prediction, explanation or statement of uncertainty about the student's chosen question.
An honest statement of being stuck is a valid starting point; a correct answer or polished initial note is not a condition for help.
Use the current response, chosen goal and deliberately selected evidence to identify a useful next step.
When the difficulty is unclear, ask one focused diagnostic question rather than assuming a learner's general ability from their chapter, writing length or concept judgment.

Offer more explicit support when needed: a question, focused hint, prerequisite explanation, worked step or direct explanation.
When the student demonstrates progress on that task, invite them to take over the next step or try a related case.
Fading means reducing assistance in response to the student's work, with help available again when needed.
It does not mean withdrawing help after a fixed number of turns.

Students retain their question, pace and chosen help mode.
Direct explanations remain available, and students can change mode, skip guidance or stop an investigation.
Do not enforce a compulsory questioning sequence or make the student repeatedly fail before explaining.

### Keep adaptation grounded and bounded

Use authored definitions, assumptions, examples and resource links when suggesting prerequisites or a simpler case.
Separate an agent's interpretation of a difficulty from an authored claim or actual demo observation.
If the evidence does not support a diagnosis, state the uncertainty and offer a concrete check or source to consult.
The existing saved-initial-thinking and student-approval rules continue to govern agent demo changes.

Adaptation is local to the current task and supplied context.
Do not create a hidden learner ability score, certify mastery, set concept judgments automatically or change course assessment.
The student chooses which private notes enter a conversation; adaptation does not authorize reading the rest of the notebook, peer discussion or course records.

### Entry points, state owners and dependency direction

- Enter through Chapter guide or Agent at the current reading, selected passage or investigation.
- Authored book material and shared concept/exploration registries own subject claims and support routes.
- The provider-independent contract in `shared/learning-agent.ts` owns supporting-agent instructions and help modes; provider adapters implement that contract.
- The local companion's conversation owner retains the student's supplied context and chosen mode; the notebook owns only deliberately saved learning records.
- The browser presents the choices and actual demo state; course APIs retain their existing authorization and assessment responsibilities.

Document any new activity or persistence types in shared contracts before extending adapters.
Additional durable state requires explicit ownership, compatible storage/archive handling and recovery guidance; a provider-specific inferred profile must not become a dependency of the notebook.

## Trigger

The user asked how the learning workspace aligns with ZPD and requested ADRs formalizing the resulting development direction.
The review identified adaptation to demonstrated understanding as a gap beyond the existing chapter-aware context and help selector.

## Consequences

**Positive:**

- Students can receive support that addresses their immediate difficulty while retaining control of the interaction.
- The same learning contract applies across providers and connects assistance to later independent practice.

**Negative:**

- An agent can misinterpret student thinking or provide inaccurate help; pedagogical behavior needs evaluation beyond successful API calls.
- Diagnosis can add friction, so prompts must be brief and avoid delaying a requested explanation.

**Neutral:**

- Reading and notebook capture remain usable without a model.
- Concept self-assessment and course grading remain under their existing contracts.

## Alternatives considered

### Keep one fixed sequence of prompts for every learner

A predictable sequence is easy to author, but can repeat material an experienced learner knows or skip prerequisites a beginner needs.
Use authored activity structure with support responsive to the current response.

### Infer a persistent mastery profile and automatically assign difficulty

This would require a separate measurement, privacy and calibration contract.
The current evidence supports task-specific suggestions under student control rather than treating model inference as a learner assessment.

### Require questions and hints before allowing an explanation

This could encourage an initial effort, but can obstruct a learner who needs a clear explanation to proceed.
Preserve help choice and invite application after explaining.

## Implementation and verification

Existing help modes, contextual conversations and agent instructions provide the baseline.
Systematic task diagnosis, responsive changes in support and their observable evaluation remain to be implemented.

Before marking this record Implemented:

- Update the shared agent contract, relevant notebook entry points and owning workspace/setup documentation.
- Verify representative novice, misconception, successful-next-step and unclear-task scenarios, including a request for direct explanation and operation without a provider.
- Check that increased and reduced support follow student responses, that unsupported diagnoses are identified, and that source/observation boundaries are preserved.
- Verify selected-context, saved-initial-thinking and student-approval boundaries with synthetic records; adapter checks alone cannot establish teaching quality.
- Record representative observed provider behavior and extend the voluntary learner evaluation with whether help addressed the difficulty and enabled a later independent attempt.

Software verification establishes the implemented capability.
Learning and course-completion claims require the evidence described in [the evaluation guide](../../learning-workspace-evaluation.md).

## References

- [Learning workspace contract](../../learning-workspace.md).
- [ADR-028: private reflection notebook](../implemented/ADR-028-use-a-private-reflection-notebook-to-support-course-learning.md).
- [Vygotsky: The Problem of Teaching and Mental Development at School Age](https://www.marxists.org/archive/vygotsky/works/1931/school-age.htm), translated by Stanley Mitchell.
- [Van de Pol, Volman and Beishuizen (2010): Scaffolding in Teacher–Student Interaction: A Decade of Research](https://link.springer.com/article/10.1007/s10648-010-9127-6).
