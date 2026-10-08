# Establish Project

## Implementation A: Large Model, Single Agent

The [common project specification](00_common_project.md) applies to this phase.

---

## 1. Purpose

Establish creates the first implementation and the comparison baseline.

Build the Work Activity Tracker using an approved large model through a single-agent workflow.
The assigned large model provides the starting environment for learning to specify, validate, measure, and own a working application.
Its ability to make that work easier is a hypothesis to check with the supported course configuration.
The goal is to experience what this particular model and environment make easy, difficult, fast, slow, private, controllable, or resource-intensive.

Complete and submit implementation A before lecture 4. The public discussion during lecture 4 will use the submitted applications, benchmark results, and architecture diagrams as concrete cases.

Keep the implementation deliberately modest.
A complete common core with clear evidence is more valuable than a large unfinished application.

---

## 2. Development-System Constraint

You must use:

- only the approved large-model endpoint or named departmental service; every other inference route and automatic model fallback must be disabled or fail closed;
- one coding-agent process at a time;
- the model, context, and tool configuration documented in your evidence package.

You may:

- discuss, plan, write, test, and review work as a group;
- use ordinary deterministic development tools;
- restart the agent or begin a new session when needed;
- use non-generative documentation and search tools allowed by the course.

You may not:

- use a model or inference route outside the approved Establish configuration to generate, repair, review, or explain application code;
- delegate work to subagents or run coding agents in parallel;
- copy a prior implementation of the course application.

If the large model cannot complete a task, the group may implement or correct it manually.
Record consequential human intervention instead of hiding it.

---

## 3. Required Work

### 3.1 Implement the common core

Complete the required domain model, behavior, [harness](/concepts/#harness), and acceptance scenarios from the common specification.
Before expanding optional scope, describe the first closed product loop and list the capabilities deliberately deferred until that loop produces evidence.

If the implementation begins from a starter template, record the template source and starting revision before pruning it.
Classify inherited material as:

- **keep** because it protects the closed product loop or its development harness;
- **replace later** because it is still the only working seam;
- **remove** because it is distribution-only material with no current owner; or
- **decide** because removal would settle a product or architecture question that remains open.

Review the exact removal set before editing, especially when automation or an agent performs the pruning.
The template is a distribution artifact, not the finished architecture of the product.

### 3.2 Establish the evidence baseline

Record the comparable evidence fields in the common submission bundle while the work is happening.
Do not attempt to recreate model usage, failed attempts, or human intervention at the end.
For optional practice in checking explanations and ownership, choose an [Establish exploration starting point](/explore/#phase-establish).

### 3.3 Record the stack hypothesis

In the stack [decision record](/concepts/#decision-log), explain:

- why the chosen stack is suitable for this application;
- what the group wants to learn by using it;
- what setup, deployment, scalability, or maintainability risks it creates;
- how well the large model appears to understand the stack;
- which choices remain [cheap to revise](/concepts/#decision-reversibility), what dependencies would make them harder, and what evidence would trigger a review.

The [decision-log example](/chapters/friction/#keep-a-decision-log) shows how to record reversibility and a revisit condition alongside the rationale.

### 3.4 Analyze initial scalability

Produce two bounded scalability claims: one about runtime demand or data and one about contributors or change.
For each, name the maintained goal, pressure, range or scenario, boundary, constraints, likely first limit, first useful signal, candidate response, expected trade-off, supporting or challenging evidence, and one intentionally excluded dimension.

Choose one primary pressure from the shared catalog that is likely to expose an important limit in implementation A.
Use the runtime or data claim as the starting hypothesis for that choice, and retain the contributor or change claim for the later friction and development-workflow comparison.
Define it as a documented transformation of the [shared baseline workload](/project/#7-1-shared-baseline-workload) that can be repeated for implementations B and C.
Run it where the available workload and environment allow; otherwise mark the result as a reasoned projection.

Identify the likely first bottleneck, the resource or dependency approaching its limit, the first useful operational signal, one plausible response or recovery action, and the trade-off it introduces.
You are not expected to add distributed infrastructure.

---

## 4. Deliverables

Submit the [common submission bundle](/project/#9-common-submission-bundle-and-comparable-evidence) for implementation A plus:

- a capability ownership card for the main event workflow;
- a short large-model workflow reflection.

The workflow reflection should answer:

- What did the large model handle well?
- Where did it require smaller tasks, more context, correction, or manual work?
- Which limitation came from the model, which from the harness, and which from the project itself?
- What evidence supports those interpretations?

---

## 5. Evaluation Emphasis

This phase emphasizes:

- completion of the common behavioral core;
- a reproducible project harness;
- appropriate scope and technical clarity;
- honest baseline evidence;
- the ability to distinguish large-model behavior from hardware, tooling, and project conditions.

Raw generation speed and feature count are not goals.

## Solo route

For an instructor-approved solo allocation, implement the full common core with the approved large-model single-agent setup.
Agree hardware/model access and a realistic schedule first; keep optional extensions deferred.
Record the same baseline, two bounded scalability claims, ownership card and large-model workflow reflection.
For the contributor/workflow claim, distinguish observed solo work from a projection about a future contributor; use the independent audit as evidence of unfamiliar-reader friction.

In the solo engineering session, predict whether a work-item transition produces exactly the intended activity event, identify a failure case, run the acceptance check and explain the result in the instructor discussion.
Disclose consequential human corrections and retain the large-model constraint; an instructor discussion does not authorize an unapproved inference route.
Receive an independent audit of A and audit the assigned frozen reference or other group under the common protocol.
Complete the solo portfolio equivalents and the ordinary lecture activities.

---

## Instructor Notes

- Define the approved large-model environment before the project begins.
  If groups use different hardware or model variants, provide a reporting template and avoid direct latency rankings.
- Decide which non-generative internet and documentation tools are allowed.
  Students should not have to guess whether looking up framework documentation violates the model constraint.
- Make manual work explicitly legitimate.
  Otherwise students may conceal interventions and make the comparison less useful.
- Check stack proposals early enough to catch unsupported large-model context limits, unavailable compilers, unsuitable deployment targets, or licensing problems.
