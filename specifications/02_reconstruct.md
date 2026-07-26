# Reconstruct Project

## Implementation B: Foundation-Model Single Agent

The [common project specification](00_common_project.md) applies to this phase.

---

## 1. Purpose

Reconstruct creates a fresh implementation of the same Work Activity Tracker using a foundation model through a single-agent workflow.

The purpose is to compare implementation B with the local-model baseline. A more capable model may generate more code, infer more context, or recover from problems differently. It may also introduce unnecessary complexity, plausible-looking defects, greater cost, or more demanding review work.

This is a new implementation, not a refactor of implementation A.

Complete and submit implementation B before lecture 7. The public discussion during lecture 7 will compare the Reconstruct results before the course introduces the fleet workflow for implementation C.

---

## 2. Starting Conditions

Begin in a new repository or clean implementation directory.

Use:

- the same common specification and acceptance scenarios;
- the transfer policy in the common specification;
- the approved foundation model;
- one coding-agent process at a time;
- normally the same primary stack chosen for Construct.

Keeping the primary stack stable makes the comparison easier to interpret. A group may change it with instructor approval when the change supports a clear learning question. The final comparison must then treat the stack change as a confounding factor rather than attributing every difference to the model.

---

## 3. Development-System Constraint

You may:

- use the approved foundation model for planning, implementation, testing, explanation, and review;
- begin new agent sessions when needed;
- use ordinary deterministic development tools;
- use the permitted shared artifacts described in the transfer policy.

You may not:

- copy application code or implementation-specific tests from implementation A;
- use an agent fleet, subagents, or parallel coding agents;
- describe implementation B as a foundation-model result without recording substantial manual correction.

The group remains responsible for every submitted decision and line of code, regardless of who or what generated it.

---

## 4. Required Work

### 4.1 Implement the common core again

Complete a fresh implementation of the required domain model, behavior, harness, and acceptance scenarios.

### 4.2 Repeat the evidence collection

Use the same evidence categories and measurement units as Construct. Preserve failed attempts and human corrections that help explain the result.

### 4.3 Compare the two single-agent workflows

Compare implementations A and B in terms of:

- acceptance-scenario completion;
- architecture and codebase shape;
- test quality and known defects;
- setup and audit friction;
- elapsed and active human time;
- model latency, usage, cost, or local resource use where measurable;
- amount and type of human intervention;
- optional scope completed.

Do not present correlation as proof. The group has more domain knowledge during Reconstruct, and this practice effect is part of the comparison's limitations.

### 4.4 Apply runtime pressure

Apply the same shared scalability scenarios to implementation B. Compare its pressure map with implementation A:

- Did the new implementation make different architectural assumptions?
- Does it fail or slow down in a different place?
- Did the foundation model introduce infrastructure or abstractions that the evidence does not justify?
- Which implementation is easier to scale, and according to what evidence?

---

## 5. Deliverables

Submit:

- implementation B in its own repository or implementation directory;
- the complete common evidence package;
- acceptance-scenario and automated-test results;
- architecture and data-flow diagram;
- updated stack decision record;
- scalability pressure map;
- a concise A–B comparison;
- the cross-team audit report and a short response from the authors.

The A–B comparison should distinguish:

- observed differences;
- plausible explanations;
- alternative explanations and confounding factors;
- what the available evidence cannot establish.

---

## 6. Evaluation Emphasis

This phase emphasizes:

- a genuinely fresh and complete implementation;
- consistent evidence across both phases;
- careful comparison rather than model enthusiasm;
- architectural and scalability reasoning;
- awareness of practice effects, scope changes, and human review.

A larger implementation B is not automatically a better implementation.

---

## Instructor Notes

- Choose the approved foundation model and agent environment before the phase begins.
- Keep the single-agent boundary operationally clear. A tool that silently delegates to several agents may invalidate the intended comparison.
- Require the same primary stack by default, but allow justified exceptions. Stack experimentation across groups is desirable; uncontrolled stack changes within one group's comparison are harder to interpret.
- Consider supplying the same small runtime workload used in Construct so architectural comparisons include measured behavior.
