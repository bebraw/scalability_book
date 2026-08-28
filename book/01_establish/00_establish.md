# Establish — Build and measure a baseline

A baseline is a bounded point of comparison, not an implementation assumed to be correct or an architecture that later work must imitate.
It gives the next two builds stable behavior, questions, and evidence against which meaningful differences can be discussed.
In this part, you define what should remain true under pressure, establish a controlled agent-assisted development process, and measure the first implementation of the shared web application.

## From scalability claims to comparable evidence

The three chapters form one progression:

1. [What does scalability mean for web development?](/chapters/what-is-scalability/) identifies the maintained goal, relevant pressures, constraints, and evidence a scalability claim would need.
2. [How can coding agents support scalable development?](/chapters/scalable-development/) treats the application and its development harness as one controlled system, with explicit constraints, validation, correction, and ownership.
3. [How can we measure web applications and development workflows?](/chapters/benchmarking/) turns runtime behavior and the development process into a repeatable evidence baseline.

By the end of Establish, implementation A should be modest, complete enough to exercise the common behavior, and bound to a declared revision and evidence package.
Its value is not that it predicts the final design.
Its value is that later comparisons do not have to rely on memory or impressions.

## Implementation A — Work Activity Tracker

The [Establish project specification](/project/establish/) shows what you should implement during this part of the book.
You will implement the shared project through a single-agent workflow backed by the approved locally hosted model.
The purpose is to experience what that particular model, harness, and environment make easy or difficult while producing a baseline that can be inspected and measured.

The specification leaves many decisions open deliberately, and you can customize the domain to your liking while choosing your own technical stack, rendering approach, storage, architecture, deployment path, and one specific implementation question worth investigating.
There is no single required architecture, and the first choice does not need to be final.
Record assumptions and trade-offs so the later builds can reveal which differences matter under the shared requirements and pressures.

The following parts begin from fresh implementations.
You may carry forward the common specification, permitted acceptance material, technology-neutral lessons, and the reporting method, but not application code or implementation-specific tests.
This preserves learning while keeping the three development setups meaningfully comparable.

## Implementation discovery lab

Use this lab to turn the [shared specification](/project/) into a direction to explore.
It produces a first project-direction document that you can refine as implementation creates evidence.

{{ import "site/includes/project-fit-checker.html" }}
