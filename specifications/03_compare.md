# Compare Project

## Implementation C: Agent Fleet and Final Analysis

The [common project specification](00_common_project.md) applies to this phase.

---

## 1. Purpose

Compare creates a third fresh implementation of the Work Activity Tracker through an agent fleet and then analyzes all three implementations and development workflows.

A fleet is an orchestration strategy, not a model category. The central question is whether decomposition, specialization, and parallelism improve the result enough to justify coordination, duplicated work, integration, review, and resource cost.

Complete and submit implementation C before lecture 9. The public discussion and brief recap during lecture 9 use the fleet debugging views and final comparisons as evidence.

---

## 2. Starting Conditions

Begin in a new repository or clean implementation directory.

Use:

- the same common specification and acceptance scenarios;
- the transfer policy in the common specification;
- a declared base model;
- normally the same foundation model and primary stack used for Challenge.

Keeping the model and stack stable makes B–C primarily a comparison of orchestration. If the available fleet tooling requires another model or stack, document the difference and treat it as a limitation.

---

## 3. What Counts as a Fleet

For this project, a fleet must include:

- at least two independently operating agent instances or delegated agent executions;
- explicit responsibility or task boundaries;
- a defined output from each delegated task;
- at least one handoff, integration point, or parallel branch;
- human or agent review before the integrated result is accepted.

Asking one agent to write from several fictional perspectives does not count as a fleet.

More agents are not automatically better. Use the smallest fleet that allows the group to study a real coordination question.

---

## 4. Fleet Plan

Before implementation, record:

- the task graph or workflow;
- each role or delegated responsibility;
- allowed tools, files, or modules where relevant;
- expected output and validation for each task;
- dependencies and possible parallel work;
- who or what owns integration;
- where human approval is required;
- the conditions for reducing or stopping the fleet.

Role names such as scout, planner, implementer, and reviewer are examples, not requirements.

The plan may change. Preserve important changes and explain why they were made.

---

## 5. Required Work

### 5.1 Implement the common core again

Complete implementation C through the documented fleet workflow.

### 5.2 Evaluate coordination

In addition to the common evidence, record where possible:

- number and purpose of delegated tasks;
- work performed in parallel;
- duplicated exploration or implementation;
- handoffs and integration failures;
- conflicts or incompatible assumptions;
- idle time or blocked tasks;
- total model usage across the fleet;
- active human integration and review time;
- defects found after individual agents considered their work complete.

### 5.3 Turn the fleet trace into debugging data

Export or transform evidence from the actual fleet run into a documented machine-readable trace. JSON is recommended, but another portable format is acceptable.

Map the fleet workflow to the application concepts:

- the project or fleet run becomes a workspace;
- delegated tasks become work items;
- agents and human participants become actors;
- task status maps to the documented lifecycle stages;
- delegation, start, completion, handoff, review, failure, retry, validation, and human intervention become activity events where the source trace supports them.

The trace format may contain additional relationships and metadata, such as parent tasks, dependencies, model information, duration, token use, cost, tool calls, validation results, or error details.

Provide a repeatable way to load the transformed trace into implementation C. Use the application to inspect the run and answer at least two debugging questions, such as:

- Where did work stall, fail, or require a retry?
- Which handoff or dependency delayed progress?
- Where did agents duplicate work or make incompatible assumptions?
- Where did validation or review reject apparently completed work?
- Where and why did a human intervene?
- What became the bottleneck as concurrent work increased?

Present the findings through the application's existing feed, filters, summaries, and any small additional view needed to make the evidence understandable. A real-time integration, generic adapter for every agent tool, polished graph editor, and interactive step debugger are not required.

Treat imported traces as potentially sensitive. Remove secrets and unnecessary prompt or source-code content before submission.

### 5.4 Compare one agent with the fleet

Compare implementation C with implementation B:

- Which tasks benefited from delegation?
- Which tasks were too coupled, ambiguous, or small to delegate?
- Where did the fleet increase throughput?
- Where did sequential work or review capacity become the bottleneck?
- Would one careful agent or a human have been preferable for any task?

Apply at least one relevant scalability law or formal model to the workflow. Amdahl's Law, Little's Law, queueing, backpressure, or the Universal Scalability Law may be appropriate.

### 5.5 Analyze the three applications

Compare implementations A, B, and C using the same runtime pressure scenarios.

The final analysis must address:

- functional completeness and defects;
- architecture and data flow;
- scalability, reliability, maintainability, simplicity, and resource efficiency;
- setup, comprehension, change, testing, review, operational, and coordination friction;
- runtime measurements and their limits;
- model and orchestration evidence;
- optional scope;
- the influence of practice, hardware, stack, tools, and other confounding factors.

The final result should support a conditional engineering decision, not declare a universal winner.

Apply at least one scalability law or formal model to an application-architecture decision. Name the variables and assumptions, show the calculation or reasoning, connect the result to runtime evidence or a stated pressure, and explain what the model does not capture. This application analysis is separate from the workflow model required in section 5.4.

### 5.6 Validate one realistic deployment

Select implementation A, B, or C based on the evidence collected so far. Deploy it in an instructor-approved realistic environment outside the author's development process and rerun the shared workload. Record the environment and configuration, operational steps, result, difference from the local run, first observed constraint, and what the run does not prove about larger scale.

---

## 6. Deliverables

Submit:

- implementation C in its own repository or implementation directory;
- the complete common evidence package;
- acceptance-scenario and automated-test results;
- architecture and data-flow diagram;
- scalability pressure map;
- fleet plan or task graph;
- a compact selected execution trace;
- the documented transformed trace and a repeatable way to load it;
- evidence from the fleet debugging view and at least two findings;
- fleet coordination measurements and analysis;
- one application-level formal-model analysis and one workflow-level formal-model analysis;
- deployed workload evidence from one selected implementation;
- the cross-team audit report and a short response from the authors;
- a final A–B–C comparison.

The selected trace should show consequential delegation, validation, integration, failure, or human intervention. Do not submit an uncurated transcript dump in place of analysis.

---

## 7. Final Comparison

The final comparison should answer:

1. What remained stable because the specification was stable?
2. What differed between the three implementations?
3. What evidence suggests that model capability contributed to the A–B differences?
4. What evidence suggests that orchestration contributed to the B–C differences?
5. What alternative explanations remain?
6. Which application architecture responds best to the shared scalability pressures, and why?
7. Under what project constraints would the group choose:
   - a local single agent;
   - a foundation-model single agent;
   - an agent fleet?
8. What remained a human responsibility in every phase?
9. What did the fleet debugging view reveal that was difficult to see from the final code or raw transcript alone?

Use tables and diagrams where they make exact comparisons easier to understand.

---

## 8. Evaluation Emphasis

This phase emphasizes:

- a bounded and inspectable fleet;
- successful integration and validation;
- a useful self-observation loop in which implementation C exposes the workflow that produced it;
- evidence about coordination cost as well as throughput;
- application of scalability concepts to both software and workflow;
- causal humility in the three-way comparison;
- a defensible conditional decision rather than a tool ranking.

Fleet size, transcript length, generated code volume, and architectural complexity do not earn credit by themselves.

---

## Instructor Notes

- Use the Challenge model as the fleet base model when tooling and access allow it.
- Clarify whether sequential delegation counts. It can be pedagogically valid when the handoffs are explicit, although at least one parallel branch gives stronger evidence about integration and review pressure.
- Set a practical upper bound on fleet size or total model budget if resource use could become excessive.
- Require compact evidence. Raw multi-agent traces can become too large to review and may contain sensitive information.
- Provide a small example trace or transformation template if the approved fleet tools do not expose a usable export. Grade the mapping and the debugging reasoning rather than adapter complexity.
- Keep live ingestion and advanced graph visualization optional. The required learning outcome is trace-based understanding of the fleet, not integration with a particular agent platform.
- Align the final comparison with the course learning outcomes and the 30-point project rubric when the rubric is finalized.
