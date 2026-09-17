# Make a conditional engineering decision

## Presentation

```yaml
version: 1
title: Make a conditional engineering decision
```

## Slide: Separate three kinds of statement

```yaml
id: claims
type: material
chapter: Read
source: Course book chapter 9; adapted from lecture 09
study:
  explanation: |-
    An observation reports what a workload or investigation produced. An inference proposes an explanation. A proposal recommends a change under stated goals.

    A single result may support several explanations. Preserve uncertainty by naming what was measured and what remains an interpretation.
```

| Kind        | Illustrative statement                                     |
| ----------- | ---------------------------------------------------------- |
| Observation | Under workload W, revision B had lower p95 latency than A  |
| Inference   | B's batching may explain the difference                    |
| Proposal    | Keep batching if correctness and recovery goals still hold |

[Read the chapter](./../../../chapters/recap/)

## Slide: Comparable does not mean perfectly attributable

```yaml
id: confounds
type: material
chapter: Read
source: Course book chapter 9; adapted from lecture 09
study:
  explanation: |-
    Shared specifications and workloads make differences discussable, but several variables can change together: implementation, stack, environment, tool, reviewer experience, scope interpretation, and failed-attempt reporting.

    Record alternative explanations and choose a next check that can discriminate between them. Narrow the claim when the evidence cannot separate causes.
```

| Difference              | Check before attribution                                 |
| ----------------------- | -------------------------------------------------------- |
| Faster implementation   | Equivalent scope, learning effects, and review standards |
| Better benchmark        | Same workload, environment, errors, and repetitions      |
| More parallel activity  | Accepted completion, integration, and human attention    |
| Fewer reported failures | Same reporting and acceptance rules                      |

## Slide: Which claim fits the evidence?

```yaml
id: check
type: poll
room: study-pilot-judgment
chapter: Check
source: Course book chapter 9; adapted from lecture 09
poll:
  question: Which conclusion is best supported?
  options:
    - id: option-0
      label: The new architecture is universally superior
    - id: option-1
      label: The agent alone caused the improvement
    - id: option-2
      label: B was faster under the recorded conditions; the cause needs further checks
  defaultId: option-0
study:
  answer: B was faster under the recorded conditions; the cause needs further checks. Architecture, experience, scope, and environment can all contribute. Preserve the observation while qualifying the causal explanation and designing a discriminating follow-up.
  correctOption: option-2
```

Implementation B was faster, but its architecture and the team's experience both changed.

## Slide: One response changes several kinds of work

```yaml
id: consequences
type: material
chapter: Read
source: Course book chapter 9; adapted from lecture 09
study:
  explanation: |-
    A queue changes application behavior, development obligations, and coordination contracts. An improvement at one boundary can add waiting or failure elsewhere.

    A conditional decision should name the goal, strongest evidence, rejected alternative, operational owner, and trigger for reconsideration. Include unresolved costs rather than hiding them behind the preferred technique.
```

| A queue changes…     | Consequence                                |
| -------------------- | ------------------------------------------ |
| Application behavior | Backlog, freshness lag, duplicates         |
| Development work     | Worker code, setup, recovery tests         |
| Agent coordination   | Producer/consumer contract and integration |

## Slide: Write the decision and its next check

```yaml
id: apply
type: question
chapter: Apply
source: Course book chapter 9; adapted from lecture 09
study:
  prompt: For a system you know, state a goal and constraints, choose an architecture and development workflow, cite the strongest observation, name an alternative explanation, and identify a trigger for revisiting the choice.
  answer: A useful response might retain a simple deployment while its measured workload meets the goal, with a named owner for recovery and a plan to revisit when queueing or review delay crosses a declared bound. Other decisions can be valid. Explain which finding changed your view and what remains untested; this reflection has no single correct answer.
```

[All modules](./../index.html) or [return to the book](./../../../).
