# Establish Project

## Implementation A: Local Single Agent

The [common project specification](00_common_project.md) applies to this phase.

---

## 1. Purpose

Establish creates the first implementation and the comparison baseline.

Build the Work Activity Tracker using a locally hosted model through a single-agent workflow.
The goal is not to demonstrate that local models are inherently weak or strong.
The goal is to experience what this particular model and environment make easy, difficult, fast, slow, private, controllable, or resource-intensive.

Complete and submit implementation A before lecture 4. The public discussion during lecture 4 will use the submitted applications, benchmark results, and architecture diagrams as concrete cases.

Keep the implementation deliberately modest.
A complete common core with clear evidence is more valuable than a large unfinished application.

---

## 2. Development-System Constraint

You must use:

- only the approved local-model endpoint or named departmental local-model service; every other inference route and automatic model fallback must be disabled or fail closed;
- one coding-agent process at a time;
- the model, context, and tool configuration documented in your evidence package.

You may:

- discuss, plan, write, test, and review work as a group;
- use ordinary deterministic development tools;
- restart the agent or begin a new session when needed;
- use non-generative documentation and search tools allowed by the course.

You may not:

- use a foundation model to generate, repair, review, or explain application code;
- delegate work to subagents or run coding agents in parallel;
- copy a prior implementation of the course application.

If the local model cannot complete a task, the group may implement or correct it manually.
Record consequential human intervention instead of hiding it.

---

## 3. Required Work

### 3.1 Implement the common core

Complete the required domain model, behavior, harness, and acceptance scenarios from the common specification.
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

### 3.3 Record the stack hypothesis

In the stack decision record, explain:

- why the chosen stack is suitable for this application;
- what the group wants to learn by using it;
- what setup, deployment, scalability, or maintainability risks it creates;
- how well the local model appears to understand the stack.

### 3.4 Analyze initial scalability

Apply the shared scalability scenarios to implementation A.
You are not expected to add distributed infrastructure.
Identify the likely first bottleneck, one operational signal, one plausible response, and its trade-off.

---

## 4. Deliverables

Submit the [common submission bundle](/project/#9-common-submission-bundle-and-comparable-evidence) for implementation A plus:

- a capability ownership card for the main event workflow;
- a short local-model workflow reflection.

The workflow reflection should answer:

- What did the local model handle well?
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
- the ability to distinguish local-model behavior from hardware, tooling, and project conditions.

Raw generation speed and feature count are not goals.

---

## Instructor Notes

- Define the approved local-model environment before the project begins.
  If groups use different hardware or model variants, provide a reporting template and avoid direct latency rankings.
- Decide which non-generative internet and documentation tools are allowed.
  Students should not have to guess whether looking up framework documentation violates the model constraint.
- Make manual work explicitly legitimate.
  Otherwise students may conceal interventions and make the comparison less useful.
- Check stack proposals early enough to catch unsupported local-model context limits, unavailable compilers, unsuitable deployment targets, or licensing problems.
