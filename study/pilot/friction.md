# Find the cost around a change

## Presentation

```yaml
version: 1
title: Find the cost around a change
```

## Slide: Editing is one part of accepted change

```yaml
id: costs
type: material
chapter: Read
source: Course book chapter 5; adapted from lecture 05
study:
  explanation: |-
    Setup, comprehension, editing, testing, review, operations, and coordination all consume time. Author familiarity can conceal costs that stop someone new to the repository.

    Observe where work waits, repeats, or loses confidence. A required review may be protective friction; an undocumented setup assumption may add effort without improving acceptance.
```

| Observe                    | Possible evidence                                  |
| -------------------------- | -------------------------------------------------- |
| Setup                      | Time to first run; missing environment assumptions |
| Comprehension and change   | Contracts found; duplicated rules                  |
| Checks and review          | Failure messages; rework; acceptance evidence      |
| Operation and coordination | Recovery work; handoffs and waiting                |

[Read the chapter](./../../../chapters/friction/)

## Slide: Change one part of the workflow

```yaml
id: timings
type: material
chapter: Experiment
source: Course book chapter 5; adapted from lecture 05
demo: ./friction.html
demoPoster: ./friction.svg
study:
  explanation: |-
    The demo starts with invented sequential timings: setup 10 minutes, understanding 15, editing 10, and checks/review 25. The total is 60 minutes.

    These are illustrative inputs, not productivity measurements. Real work can overlap, wait, and repeat. Reducing review by skipping necessary checks is not an equivalent improvement.
  prompt: Halve editing time. Reset, then reduce setup by five minutes. Compare the totals and the evidence each real intervention would require.
  answer: Halving editing saves five minutes, giving 55 minutes total. Reducing setup by five minutes gives the same arithmetic saving. Whether either improvement is useful depends on reproducible evidence, retained acceptance standards, and the cost of maintaining it.
```

Predict the total after halving editing time.

## Slide: How large is the saving?

```yaml
id: check
type: poll
room: study-pilot-friction
chapter: Check
source: Course book chapter 5; adapted from lecture 05
poll:
  question: If editing takes half as long and nothing else changes, what follows?
  options:
    - id: option-0
      label: The whole workflow takes 30 minutes
    - id: option-1
      label: The workflow takes 55 minutes
    - id: option-2
      label: Accepted throughput necessarily doubles
  defaultId: option-0
study:
  answer: "The workflow takes 55 minutes: only five of the original 60 minutes disappear. This is about an illustrative sequential duration, not a calibrated throughput estimate. Rework or additional review could reduce the real saving."
  correctOption: option-1
```

A sequential 60-minute workflow spends 10 minutes editing.

## Slide: Observe a newcomer without rescuing every step

```yaml
id: probe
type: material
chapter: Read
source: Course book chapter 5; adapted from lecture 05
study:
  explanation: |-
    Use a disposable checkout and a bounded change. Record setup separately, then observe a fixed change window once the runnable environment and prompt are available. Capture commands, questions, checks, and the first point of blockage.

    Stop at the declared limit and preserve partial or blocked outcomes. An incomplete attempt can reveal a boundary more clearly than a completed task supported by undocumented author help.
```

| Author expected            | Unfamiliar reviewer observed     |
| -------------------------- | -------------------------------- |
| One setup command          | Missing environment assumptions  |
| An obvious change boundary | Several duplicated rules         |
| A passing check            | No test of the full user journey |

## Slide: Improve one feedback loop

```yaml
id: apply
type: question
chapter: Apply
source: Course book chapter 5; adapted from lecture 05
study:
  prompt: Choose one repeated obstacle. Record a baseline, change one repository feature, and repeat a comparable task. Which acceptance check must remain intact?
  answer: One possible improvement is an executable setup check that explains a missing dependency. Compare successful setup time and unresolved questions before and after, keeping the task and environment comparable. Record remaining limitations and practice effects. Faster completion alone does not establish that the repository caused the gain.
```

[All modules](./../index.html) or [return to the book](./../../../).
