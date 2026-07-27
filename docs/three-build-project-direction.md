# Project direction: three implementations of one common brief

## Status

This note records the intended direction for the course projects. It supersedes the earlier idea that groups would primarily extend, hand over, and later receive back one implementation. A first group-facing draft now lives in [`specifications/00_common_project.md`](../specifications/00_common_project.md) with phase overlays in the same folder.

The book parts and project overlays use the same names: **Establish**, **Challenge**, and **Compare**.

## Direction

Each group should implement the same bounded application brief three times. The core requirements and acceptance checks should remain stable enough that the results can be compared. What changes between phases is the AI-assisted development setup:

1. **Establish: locally hosted model, single-agent workflow.** Build the smallest compliant baseline and make the limits of a less capable or less convenient model visible.
2. **Challenge: foundation model, single-agent workflow.** Build a fresh implementation from the same brief and compare what greater model capability changes.
3. **Compare: agent fleet.** Build a third implementation through explicit roles, task boundaries, handoffs, integration, and review. Use a declared base model so orchestration is not confused with model capability.

The implementations should be separate rather than cumulative. Students may reuse knowledge, requirements, tests, and deliberately shared harness artifacts, but should not simply fork the previous implementation. The point is to compare development systems against a common target.

## Pedagogical rationale

- Fast generation makes the first implementation less scarce. Repeating a bounded build creates room to study specification quality, validation, architecture, review, and coordination.
- A common brief provides a control. Differences in output can be discussed with reference to the same required behavior rather than to three unrelated products.
- The progression separates two questions reasonably well: local versus foundation models foregrounds model capability, while single-agent versus fleet work foregrounds orchestration.
- Repetition lets students move from task completion toward judgment. They should become faster at seeing hidden assumptions, generated complexity, weak tests, and avoidable coordination.
- The course can treat AI-assisted development itself as a scalability problem: throughput, latency, cost, context, decomposition, integration, and human review all have limits.

## What should stay constant

The shared specification should define an immutable core:

- the domain and central user workflow;
- required event types, entities, roles, and state transitions;
- observable behavior and acceptance tests;
- minimum run and deployment evidence;
- a small measurement workload;
- reporting units for time, model usage, human intervention, defects, and resource cost.

Small extensions may remain open, but they must not replace the common core. Otherwise groups can change scope between phases and lose the basis for comparison.

## What should vary

- **Establish:** the approved local model and its single-agent environment.
- **Challenge:** the approved foundation model in a comparable single-agent environment.
- **Compare:** the orchestration design: roles, parallelism, handoffs, permissions, integration, and review. The base model must be recorded and should preferably match Challenge when the course wants to isolate orchestration effects.

Tool versions, prompts, context, retries, and model settings should be recorded. They are part of the treatment, not incidental details.

## Evidence across all three builds

Each phase should leave a compact, comparable evidence package:

- elapsed calendar time and estimated active human time;
- model, agent, tool, and orchestration configuration;
- prompt or task log at an appropriate level of detail;
- acceptance-test and benchmark results;
- defects found during human review and how they were corrected;
- architecture and data-flow diagrams;
- setup, deployment, and operational evidence;
- approximate inference cost, token use, latency, and relevant local resource use;
- a short account of what the AI handled well, misunderstood, or could not complete;
- a causal reflection that distinguishes evidence from conjecture.

The comparison should not reward output volume. A smaller implementation can be better if it satisfies the brief with less complexity, review burden, or resource use.

## Role of cross-team work

Remove the full handover-and-return cycle as the main project mechanism. Preserve unfamiliar-system learning through a bounded cross-team audit after each build. Another group should:

1. set up and run the implementation from its documentation;
2. apply the common acceptance checks;
3. identify one hidden assumption or comprehension problem;
4. estimate or attempt one small, standardized change;
5. return a short friction report.

This keeps maintainability and communicability externally tested without making one group's progress depend heavily on another group's code or schedule.

## Threats to a fair comparison

- **Practice effects:** students know the brief better on later attempts. Treat learning as part of the course outcome, but do not attribute every improvement to the model or fleet.
- **Changing scope:** later builds may quietly become more ambitious. Score the common core separately from optional extensions.
- **Different base models:** a fleet comparison becomes ambiguous if model capability and orchestration both change. Record and, where possible, control the fleet's base model.
- **Unequal hardware:** local-model latency and capability depend on available machines. Provide a supported baseline or hosted departmental endpoint and report hardware conditions.
- **Selective reporting:** require the same evidence template after every phase, including failed attempts and human corrections.
- **Copying implementations:** define what may transfer between builds. Requirements, tests, examples, and lessons should transfer; application code should not unless the comparison explicitly studies reuse.
- **Order effects:** all groups following the same order cannot prove that the tools alone caused the differences. The course should frame conclusions as local, evidence-based observations rather than universal rankings. Counterbalancing tools across groups is an optional research-style extension, but it may complicate teaching.

## Relationship to the book's three-part structure

The names can remain, but their meanings shift:

- **Establish** defines the common problem, the first implementation, and the measurement baseline.
- **Challenge** implements the same required behavior again with a different development system, then compares the resulting design and process rather than modifying the original codebase.
- **Compare** combines a fleet-based implementation with analysis across all three builds. Students transform the fleet's execution trace into the workspaces, tasks, actors, states, and events understood by implementation C. The application therefore becomes a trace-based debugging and observability tool for the workflow that produced it. Students explain what model capability and orchestration changed, what remained a human responsibility, and how the three systems would scale.

Runtime scalability must remain a first-class learning target. The AI comparison is the course's experimental spine, not a replacement for architecture, load, failure, data growth, observability, and scalability laws.

## Specification follow-up

The first specification draft now includes:

- a fixed core application brief and acceptance suite;
- phase-specific AI and orchestration constraints;
- a transfer policy between implementations;
- a common evidence template;
- the bounded cross-team audit;
- common evaluation principles.

The next iteration should settle:

- whether the Work Activity Tracker domain is the right balance between comparability and student choice;
- exact model and agent environments;
- the stack proposal and approval process;
- the shared runtime workload and fixture data;
- a small portable fleet-trace example or transformation template;
- three equivalent audit change probes;
- phase rubrics and grading weights;
- expected project and audit time;
- the submission structure used by the learning platform.
