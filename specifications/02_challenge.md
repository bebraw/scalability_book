# Challenge Project

## Implementation B: Comparison Model, Single Agent

The [common project specification](00_common_project.md) applies to this phase.

---

## 1. Purpose

Challenge creates a fresh implementation of the same Work Activity Tracker using a comparison model through a single-agent workflow.

The purpose is to compare implementation B with the local-model baseline.
The approved comparison model must differ from the Establish model; its hosting and harness configuration must be declared.
It may handle the same tasks differently, but higher quality, lower cost, and less review are hypotheses to test.
A model that generates more code may also introduce unnecessary complexity, plausible-looking defects, greater cost, or more demanding review work.

This is a new implementation, not a refactor of implementation A.

Complete and submit implementation B before lecture 7. The public discussion during lecture 7 will compare the Challenge results before the course introduces the fleet workflow for implementation C.

---

## 2. Starting Conditions

Begin in a new repository or clean implementation directory.

Use:

- the same common specification and acceptance scenarios;
- the transfer policy in the common specification;
- the approved comparison model;
- one coding-agent process at a time;
- normally the same primary stack chosen for Establish.

Keeping the primary stack stable makes the comparison easier to interpret.
A group may change it with instructor approval when the change supports a clear learning question.
The final comparison must then treat the stack change as a confounding factor rather than attributing every difference to the model.

---

## 3. Development-System Constraint

You may:

- use the approved comparison model for planning, implementation, testing, explanation, and review;
- begin new agent sessions when needed;
- use ordinary deterministic development tools;
- use the permitted shared artifacts described in the transfer policy.

You may not:

- copy application code or implementation-specific tests from implementation A;
- use an agent fleet, subagents, or parallel coding agents;
- describe implementation B as a comparison-model result without recording substantial manual correction.

The group remains responsible for every submitted decision and line of code, regardless of who or what generated it.

---

## 4. Required Work

### 4.1 Implement the common core again

Complete a fresh implementation of the required domain model, behavior, harness, and acceptance scenarios.

### 4.2 Repeat the evidence collection

Use the same evidence categories and measurement units as Establish.
Preserve failed attempts and human corrections that help explain the result.

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

Do not present correlation as proof.
The group has more domain knowledge during Challenge, and this practice effect is part of the comparison's limitations.

### 4.4 Apply runtime pressure

Repeat the primary pressure selected in Establish against implementation B using the same workload and procedure where practical.
Then select one secondary pressure from the shared catalog that is exposed by an architectural difference or by evidence from A or B.
Analyze how both implementations would respond to that secondary pressure; run it when practical and label projections clearly.

Compare the cumulative pressure evidence for A and B:

- Did the new implementation make different architectural assumptions?
- Does it fail or slow down in a different place?
- Did the comparison model introduce infrastructure or abstractions that the evidence does not justify?
- Which implementation responds better to the pressures studied, and according to what evidence?

For one queue, pool, request path, or other conserved-work boundary in A or B, apply Little's Law over one consistent observation window.
Record average work in progress (`L`), average completion rate (`λ`), and average time in the system (`W`); check whether `L = λW` is approximately coherent; and state whether arrivals and completions were sufficiently balanced for the relationship to be useful.
Use the result to interpret the boundary, not to claim a cause of delay or stability outside the observed conditions.

Connect one failed assumption or approaching limit to a justified response pattern such as an index, derived view, idempotency boundary, bounded queue, partition, quota, backpressure, rate limit, or graceful degradation.
At this phase the response may remain a design hypothesis, but name the new correctness, failure, operational, or recovery obligation it would introduce.

Complete the chapter's documented-case transfer and pressure map as part of this cumulative pressure record.
Link the selected source, separate reported facts from interpretation and project transfer, trace the failure across the relevant web boundaries, and identify the assumption, amplification path, user-visible effect, first useful signal, recovery mode, and evidence that recovery is complete.

---

## 5. Deliverables

Submit the [common submission bundle](/project/#9-common-submission-bundle-and-comparable-evidence) for implementation B plus:

- the architecture hypothesis for implementation B;
- an updated capability ownership card for the main event workflow;
- the documented-case transfer, pressure map, and Little's Law check;
- a concise A–B comparison.

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

- Choose the approved comparison model and agent environment before the phase begins.
- Keep the single-agent boundary operationally clear.
  A tool that silently delegates to several agents may invalidate the intended comparison.
- Require the same primary stack by default, but allow justified exceptions.
  Stack experimentation across groups is desirable; uncontrolled stack changes within one group's comparison are harder to interpret.
- Require the published baseline workload and the group's primary-pressure transformation to remain stable so architectural comparisons include measured behavior.
