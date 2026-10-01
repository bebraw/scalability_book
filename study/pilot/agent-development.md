# Make agent work reviewable

## Presentation

```yaml
version: 1
title: Make agent work reviewable
```

## Slide: Constrain, generate, validate

```yaml
id: loop
type: material
chapter: Read
source: Course book chapter 2; adapted from lecture 02
study:
  explanation: |-
    Faster generation is only one part of development. State observable behavior, the allowed change surface, and the commands that establish acceptance before requesting a change. Review the resulting artifact and use concrete failures to guide correction.

    For a state transition, acceptance includes the new state and its activity event staying consistent. A plausible diff or a passing compilation alone does not establish that invariant.
```

| Before generation                        | After generation                          |
| ---------------------------------------- | ----------------------------------------- |
| Required behavior and prohibited effects | Inspect the diff against those boundaries |
| Runnable environment and checks          | Record commands, failures, and correction |
| Owner of acceptance                      | Explain why the evidence is sufficient    |

[Read the chapter](./../../../chapters/scalable-development/)

## Slide: Tests and review progress independently

```yaml
id: gates
type: material
chapter: Experiment
source: Course book chapter 2; adapted from lecture 02
demo: ./acceptance-statechart.html
demoPoster: ./acceptance-statechart.svg
study:
  explanation: |-
    This is the book’s delivery workflow, not the application's work-item lifecycle. Tests and review are independent gates: both must complete before release becomes available. A failed check or requested change returns the work to implementation.

    The model records declared events; clicking TESTS PASS does not execute real tests. In a project, each event needs evidence from the actual revision.
  prompt: Approve a plan, submit a patch, and pass tests. Try requesting changes during review. Then complete both gates on a new attempt.
  answer: Tests alone leave release unavailable. Start review and request changes to return to implementation. On the next attempt, passing tests and approving review makes RELEASE legal. Changed work needs renewed validation.
```

Predict which event becomes available after tests pass while review is still waiting.

## Slide: What supports acceptance?

```yaml
id: check
type: poll
room: study-pilot-agent-development
chapter: Check
source: Course book chapter 2; adapted from lecture 02
poll:
  question: What is the strongest next step?
  options:
    - id: option-0
      label: Accept because generation finished
    - id: option-1
      label: Check the required behavior and review the changed boundaries
    - id: option-2
      label: Run compilation again and skip behavior checks
  defaultId: option-0
study:
  answer: Check the required behavior and review the changed boundaries. Compilation catches some representation errors; it does not prove authorization, persistence, error handling, or the intended user outcome. Select checks that could expose the actual failure.
  correctOption: option-1
```

A patch compiles and the agent says the work is complete.

## Slide: Bound authority and preserve ownership

```yaml
id: authority
type: material
chapter: Read
source: Course book chapter 2; adapted from lecture 02
study:
  explanation: |-
    Provenance records who or what produced an artifact. It does not prove correctness or transfer accountability. Authority should match the clarity of the task, consequences, and ability to recover.

    If a change repeatedly fails, inspect missing context, unclear requirements, slow checks, or poor failure messages. Changing a prompt will not repair an unavailable test environment.
```

| Situation                           | Useful authority boundary                       |
| ----------------------------------- | ----------------------------------------------- |
| Intent is ambiguous                 | Propose alternatives and identify unknowns      |
| Consequential action needs approval | Prepare a reviewable result                     |
| Scope and limits are clear          | Execute within those limits and retain evidence |

## Slide: Specify one bounded change

```yaml
id: apply
type: question
chapter: Apply
source: Course book chapter 2; adapted from lecture 02
study:
  prompt: Choose a small change. Write the behavior, prohibited effects, editable boundary, acceptance command, and correction owner. Which failure would reject the patch?
  answer: For example, adding a transition requires one authorized state change and one matching activity event. Reject a result that duplicates an event on retry, accepts an invalid transition, or changes another user's item. Keep the setup, evidence, and decision with the revision. This is a reflection exercise; several valid designs are possible.
```

[Explore connections across the book](./../../../concepts/?reading=%2Fchapters%2Fscalable-development%2F).
Explain one connection before opening the definition, then follow it to another reading and check where the analogy stops.

[All modules](./../index.html) or [return to the book](./../../../).
