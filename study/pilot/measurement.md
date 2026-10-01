# Design a useful measurement

## Presentation

```yaml
version: 1
title: Design a useful measurement
```

## Slide: Measure the path you care about

```yaml
id: request-path
type: material
chapter: Read
source: Elements of Scalable Web Development, chapter 3
study:
  explanation: |
    An end-to-end timer and a database timer answer different questions. State where timing starts and stops, which requests are included, and whether failed or timed-out requests are recorded.

    Use a distribution rather than only an average when tail latency matters. A shorter database query does not establish that the user-visible path became faster. Waiting elsewhere can dominate, and a different workload can move the limiting boundary.
```

```mermaid
flowchart LR
  User[User action] --> Browser[Browser]
  Browser --> API[Application]
  API --> DB[Database]
  DB --> API
  API --> Browser
```

[Read the chapter: Measurement and observability](./../../../chapters/benchmarking/)

## Slide: Check averages at one boundary

```yaml
id: little-law
type: material
chapter: Experiment
demo: ./little-law.html
demoPoster: ./little-law.svg
source: Book Little’s Law lab
study:
  explanation: |
    Little’s Law relates average work in progress **L**, throughput **λ**, and average time in the boundary **W**: **L = λW**.

    At 20 completed operations per second and 0.5 seconds per operation, the corresponding average work in progress is 10. Include waiting time if it is inside the chosen boundary.

    The quantities must describe the same work and compatible observation windows. For this steady-state comparison, arrivals and completions must balance over a sufficiently long window; a growing backlog makes a short-window calculation misleading. This relationship checks consistency but does not locate a bottleneck.
  prompt: Keep throughput at 20/s and observed work in progress at 10. Double the average time. What calculated value follows, and what might explain the mismatch?
  answer: |
    At one second, λW is **20 operations**. An observed average of 10 prompts a check of boundaries, windows, omitted waiting, units, and arrival/completion balance. The mismatch alone does not identify a cause. “Match L to λW” sets an illustrative input; it does not take a measurement.
```

Change one average at a time.
Distinguish the calculated value from the observed input.

## Slide: Does the mismatch prove a cause?

```yaml
id: check
type: poll
chapter: Check
room: study-pilot-measurement
poll:
  defaultId: database
  question: You observe L=25, λ=40/s, and W=0.25s. What follows?
  options:
    - { id: database, label: "The database must be the bottleneck" }
    - { id: capacity, label: "Adding workers must fix the mismatch" }
    - {
        id: boundaries,
        label: "Check whether the measurements share a boundary and a stable observation window",
      }
study:
  correctOption: boundaries
  prompt: Calculate λW first, then decide what the result can establish.
  answer: |
    λW is **10**, which differs from the observed 25. These numbers warrant a consistency check. They do not isolate the database or demonstrate that additional capacity will help. Inspect how each quantity was collected before explaining the discrepancy.
```

A consistency check is useful even when it does not identify the cause.

## Slide: Make the before-and-after comparison fair

```yaml
id: comparison
type: material
chapter: Read
study:
  explanation: |
    Decide the comparison rules before changing the system. Keep the workload, dataset, environment, and correctness criteria comparable, and record revisions separately. Repeat measurements and report all repetitions, including failures.

    An improvement that rejects more work or returns stale results may violate the original goal. Resource use and recovery behavior help reveal where the cost moved. An intervention that fails to help is still evidence about the original explanation.
```

| Keep comparable           | Record alongside the result                |
| ------------------------- | ------------------------------------------ |
| Workload and dataset      | Latency distribution and useful throughput |
| Environment and revisions | Errors, resource use, and repetitions      |
| Acceptance criteria       | Correctness and failure/recovery behavior  |

## Slide: Write a bounded experiment

```yaml
id: experiment
type: question
chapter: Apply
study:
  prompt: Write the pressure, workload, environment, measurement boundary, and acceptable result for a request path you know. Which observation would challenge your current explanation?
  answer: |
    One possible design compares a fixed write workload before and after batching, holding the dataset and environment stable. Record accepted throughput, p95 end-to-end latency, errors, resource use, and recovery after an interruption. Reject the claim if throughput rises only by violating the declared latency or correctness bound.

    Other designs can be valid. The important feature is a reproducible comparison with a result that could disconfirm the claim. Keep raw measurements and limitations with the conclusion.
```

[Connect event backlog to review work](./../../../chapters/benchmarking/#exercise-measurement-transfer).
Try the calculation before revisiting the [concept definitions and examples](./../../../concepts/).

[Explore connections across the book](./../../../concepts/?reading=%2Fchapters%2Fbenchmarking%2F).
Explain one connection before opening the definition, then follow it to another reading and check where the analogy stops.

[Revisit scaling pressure](./../scalability/index.html) or [return to the book](./../../../).
