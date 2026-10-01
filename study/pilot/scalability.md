# Understand scaling pressure

## Presentation

```yaml
version: 1
title: Understand scaling pressure
```

## Slide: Name the pressure and the outcome

```yaml
id: pressure
type: material
chapter: Read
source: Elements of Scalable Web Development, chapter 1
study:
  explanation: |
    A scalability claim connects a changing pressure to behavior that stays within a stated bound.
    Requests, stored data, contributors, and the rate of change can expose different limits.
    Specify one pressure and one observable outcome before selecting a technical response.

    “The system is fast” hides the workload and environment. A useful claim lets another person test the same conditions and disagree using evidence.
```

Under **what pressure** should the system preserve **which behavior**?

For example: “At 20 concurrent users, p95 accepted-write latency remains below 500 ms in this environment.” This is an illustrative target, not a measured result.

[Read the chapter: What is scalability?](./../../../chapters/what-is-scalability/)

<!-- speaker-notes -->

PRIVATE_STUDY_NOTE: This source is a reviewed publication deck.
Presenter guidance must stay out of the generated bundle.

## Slide: Connect a response to evidence

```yaml
id: evidence
type: material
chapter: Read
source: Book figure, pressure to evidence
study:
  explanation: |
    Follow one claim through the figure. Increased write traffic is a pressure; a saturated database may be the binding limit. Batching is one possible response, with waiting time and failure handling as trade-offs.

    Check throughput, latency, errors, and correctness under a comparable workload. If the result does not support the claim, revisit the suspected limit or the response. The arrows describe reasoning, not a guarantee that every change helps.
```

![Pressure, binding limit, response, trade-off, and evidence, with feedback to the original claim](./pressure-evidence.svg)

## Slide: More workers, same sequential work

```yaml
id: amdahl
type: material
chapter: Experiment
demo: ./amdahl.html
demoPoster: ./amdahl.svg
source: Amdahl teaching model, adapted from the book
study:
  explanation: |
    Amdahl’s law models a fixed workload with ideal parallel execution:
    **S(N) = 1 / ((1 − p) + p/N)**.

    With 80% parallel work and four workers, speedup is 2.5×. At 16 workers it is 4×. The remaining 20% sequential work limits ideal speedup to 5× even with arbitrarily many workers.

    The model assumes perfect division of parallel work and no coordination overhead. For an agent workflow, review and integration may remain sequential. Measure these costs before treating the prediction as an achievable result.
  prompt: Predict the speedup at 16 workers with 80% parallel work. Then change the controls and explain the gap from 16×.
  answer: |
    The result is **4×**, from 1 / (0.2 + 0.8/16). Adding workers shrinks only the parallel portion. Reducing sequential work changes the ceiling; adding workers alone does not.
```

Start at 80% parallel work and four workers.
Increase workers to 16, then change the parallel portion.
Reset restores the starting example.

## Slide: Which claim follows from the model?

```yaml
id: check
type: poll
chapter: Check
room: study-pilot-scalability
poll:
  defaultId: linear
  question: What is the ideal speedup with 80% parallel work and four workers?
  options:
    - { id: linear, label: "4×: four workers make it four times faster" }
    - { id: bounded, label: "2.5×: sequential work still takes time" }
    - { id: measured, label: "2.5× is guaranteed in the real system" }
study:
  prompt: Use the model assumptions, then distinguish a prediction from a measurement.
  correctOption: bounded
  answer: |
    **2.5×** follows from 1 / (0.2 + 0.8/4). It is an ideal prediction, not a production guarantee. Scheduling, communication, duplicated work, and review can reduce the actual gain.
```

Explain why the other two statements do not follow.

## Slide: Apply the distinction

```yaml
id: transfer
type: question
chapter: Apply
study:
  prompt: Choose a workflow you know. What part could run concurrently, what part must remain sequential, and which measurement would test your estimate?
  answer: |
    There is no single correct split. A useful answer names concrete work, such as independent implementations followed by shared integration. Record elapsed time for the same accepted outcome, including review and rework. Compare the measured speedup with the model and investigate the difference.
```

[Explore connections across the book](./../../../concepts/?reading=%2Fchapters%2Fwhat-is-scalability%2F).
Explain one connection before opening the definition, then follow it to another reading and check where the analogy stops.

[Continue with measurement](./../measurement/index.html) or [return to the book](./../../../).

## Slide: Classroom-only context

```yaml
id: classroom
type: material
study:
  exclude: true
```

PRIVATE_CLASSROOM_ONLY: Group formation, schedules, and grading belong in the university lectures, not this public sequence.
