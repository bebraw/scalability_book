# ADR-018: Offer optional agent explorations with separate worked reasoning

**Status:** Implemented

**Date:** 2026-10-05

**Recorded retrospectively:** Task-based starting points introduced on 2026-10-02.

## Context

Long optional exercises interrupted the chapters, while an agent given only a general resource guide could begin with an unfocused explanation.
Students need a concrete starting activity and room to predict, inspect evidence, and revise their own explanation.

## Decision

Keep optional investigations under `/explore/`, linked from short chapter invitations, course tasks, and relevant concept cards.
Maintain stable activity metadata in a shared registry, scenarios/prompts in Markdown, and worked reasoning in separate discussion files.
Generate a reader page, a self-contained `agent.md` starting point, and a separately retrievable `discussion.md` resource for each activity.

The conversation guidance asks for one relevant first question and a pause for the student.
Use hints, evidence checks, and changed assumptions before revealing worked reasoning, unless the student requests it.
Treat agreement with the discussion as learning feedback, not a grade.
The resources are public; separating the discussion supports pacing rather than hiding an assessment answer.

Offer interactive explanations when the student's client supports them and they help the current question.
Preserve the authored quantities, assumptions, citations, and ordinary activity/demo link.
Distinguish retrieved HTML, browser execution, and inline rendering: fetching a demo page does not perform its experiment.
Require observations from actual runs, or label an agent-created diagram/model as illustrative.
Provide images, links, and text conversation as fallbacks.

The site supplies guidance to external agents; it does not enforce their behavior or host a conversation client.
These activities add no mandatory deliverables or separate progress system.

## Trigger

October commits moved optional exercises to task-oriented starting points and added guidance for interactive explanations.

## Consequences

**Positive:**

- Chapters stay concise while students can enter a focused investigation directly.
- Prediction and observation remain distinguishable from an agent's generated explanation.

**Negative:**

- External clients can interpret the guidance differently and require practical test drives.
- Scenario, discussion, resource metadata, and demo behavior must remain consistent.

**Neutral:**

- Optional activity completion is not evidence of measured project results or a new assessment obligation.

## Alternatives considered

### Embed every extended exercise in the core chapters

The implemented task pages preserve the exercise while reducing interruption of the reading argument.

### Put the worked answer directly in every agent starting prompt

Separate resources support a student attempt before worked reasoning without pretending the answer is secret.

## Implementation and verification

[Exploration registry](../../../shared/explorations.ts), [activity sources](../../../explorations/), [renderer](../../../scripts/lib/exploration-html.ts), and [shared presentation guidance](../../../shared/agent-presentation.ts) implement the resources.
[Resource documentation](../../agent-learning-resources.md) owns the client contract and its limits.
[Exploration tests](../../../tests/explorations.test.ts) and [browser checks](../../../tests/e2e/explorations.spec.ts) verify publication and separation; they do not prove every external agent follows the prompts.

## Historical evidence

- [2026-10-02: move activities to task-based starting points](https://github.com/bebraw/scalability_book/commit/71eafb48bf0c6d02541cde0dfb25747a2e64466e).
- [2026-10-02: offer optional interactive explanations](https://github.com/bebraw/scalability_book/commit/3a58be07ea26283a6700f6b4813d107368dce144).

## References

- [ADR-010: focused book core](ADR-010-keep-the-book-core-focused.md).
- [ADR-017: authored graph and retrieval](ADR-017-export-an-authored-concept-graph-for-reader-agents.md).
