# Challenge Project

## Implementation B: Small Model, Single Agent

**Deadline:** submit implementation B before lecture 7.

**Development setup:** approved small model, one coding agent at a time.
The [common project specification](00_common_project.md) applies throughout.
Follow the [staged submission process](00_introduction.md#submit-each-phase-in-stages), including your private individual portfolio.

## What to do and submit

Use one [common submission bundle](/project/#9-common-submission-bundle-and-comparable-evidence) for implementation B.
Index these additions in the same bundle:

- **Build and validate fresh B:** implement the common core and repeat the shared evidence collection under the small-model constraint.
- **Explain the architecture:** include B’s architecture hypothesis and updated capability ownership card for the main event workflow.
- **Extend the pressure record:** repeat A’s primary pressure, add one secondary pressure, and include the documented-case transfer, pressure map, justified response, and Little’s Law check defined in [Apply runtime pressure](#apply-runtime-pressure).
- **Compare A and B:** use the [two-workflow comparison](#compare-the-two-single-agent-workflows) to separate observed differences, plausible explanations, alternatives and confounding factors, and what the evidence cannot establish.
- **Complete the shared evidence:** include the [engineering session](/project/#shared-engineering-sessions), independent audit, and author response.

---

## Purpose

Challenge creates a fresh implementation of the same Work Activity Tracker using a small model through a single-agent workflow.

The purpose is to compare implementation B with the large-model baseline.
The approved small model must differ from the Establish model; its hosting and harness configuration must be declared.
The department may host both models; large and small describe the assigned model configurations, not where inference runs.
Use the domain knowledge and permitted lessons from A to investigate which specifications, task boundaries, and validation practices help with B.
It may handle the same tasks differently, but higher quality, lower cost, and less review are hypotheses to test.
A model that generates more code may also introduce unnecessary complexity, plausible-looking defects, greater cost, or more demanding review work.

This is a new implementation, not a refactor of implementation A.

The public discussion during lecture 7 compares the Challenge results before the course introduces the fleet workflow for implementation C.

---

## Starting Conditions

Begin in a new repository or clean implementation directory.

Use:

- the same common specification and [acceptance scenarios](/concepts/#acceptance-criteria);
- the transfer policy in the common specification;
- the approved small model;
- one coding-agent process at a time;
- normally the same primary stack chosen for Establish.

Keeping the primary stack stable makes the comparison easier to interpret.
A group may change it with instructor approval when the change supports a clear learning question.
The final comparison must then treat the stack change as a confounding factor rather than attributing every difference to the model.

---

## Development-System Constraint

You may:

- use only the approved small-model route for planning, implementation, testing, explanation, and review; disable unapproved routes and automatic model fallback or make them fail closed;
- begin new agent sessions when needed;
- use ordinary deterministic development tools;
- use the permitted shared artifacts described in the transfer policy.

You may not:

- copy application code or implementation-specific tests from implementation A;
- use an agent fleet, subagents, or parallel coding agents;
- describe implementation B as a small-model result without recording substantial manual correction.

The group remains responsible for every submitted decision and line of code, regardless of who or what generated it.

---

## Required Work

### Implement the common core again

Complete a fresh implementation of the required domain model, behavior, harness, and acceptance scenarios.

### Repeat the evidence collection

Use the same evidence categories and measurement units as Establish.
Preserve failed attempts and human corrections that help explain the result.

### Compare the two single-agent workflows

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
This is a comparison of two engineering cases, not an estimate of the effect of changing the model alone.
The group has more domain knowledge during Challenge, and this practice effect is part of the comparison's limitations.

### Apply runtime pressure

Repeat the primary [pressure](/concepts/#pressure) selected in Establish against implementation B using the same workload and procedure where practical.
Then select one secondary pressure from the shared catalog that is exposed by an architectural difference or by evidence from A or B.
Analyze how both implementations would respond to that secondary pressure; run it when practical and label projections clearly.

Compare the cumulative pressure evidence for A and B:

- Did the new implementation make different architectural assumptions?
- Does it fail or slow down in a different place?
- Did the small model introduce infrastructure or abstractions that the evidence does not justify?
- Which implementation responds better to the pressures studied, and according to what evidence?

For one queue, pool, request path, or other conserved-work boundary in A or B, apply [Little's Law](/concepts/#little-law) over one consistent observation window.
Record average work in progress (`L`), average completion rate (`λ`), and average time in the system (`W`); check whether `L = λW` is approximately coherent; and state whether arrivals and completions were sufficiently balanced for the relationship to be useful.
Use the result to interpret the boundary, not to claim a cause of delay or stability outside the observed conditions.

Connect one failed assumption or approaching limit to a justified response pattern such as an index, derived view, idempotency boundary, bounded queue, partition, quota, backpressure, rate limit, or graceful degradation.
At this phase the response may remain a design hypothesis, but name the new correctness, failure, operational, or recovery obligation it would introduce.

Complete the chapter's documented-case transfer and pressure map as part of this cumulative pressure record.
Link the selected source, separate reported facts from interpretation and project transfer, trace the failure across the relevant web boundaries, and identify the assumption, amplification path, user-visible effect, first useful signal, recovery mode, and evidence that recovery is complete.
For an optional recovery investigation, choose a [Challenge exploration starting point](/explore/#phase-challenge).

---

## Evaluation Emphasis

This phase emphasizes:

- a genuinely fresh and complete implementation;
- consistent evidence across both phases;
- careful comparison rather than model enthusiasm;
- architectural and scalability reasoning;
- awareness of practice effects, scope changes, and human review.

A larger implementation B is not automatically a better implementation.

## Solo route

Build a fresh B under the same transfer policy with the approved small model and one-agent boundary.
Keep the required common behavior, baseline workload and primary-pressure procedure comparable with A.
Retain the architecture hypothesis, secondary pressure, documented-case transfer, Little's Law check, ownership card, friction audit and A–B interpretation.
Report growing domain knowledge and solo human review effort as comparison limitations.

For the engineering session, predict two clients' concurrent transition outcome, challenge the relevant consistency assumption, validate it and discuss the result with the instructor.
Receive an independent audit of B and perform the assigned reference or cross-group audit with the same tool policy and separate setup/probe timings.
Complete the solo portfolio equivalents and ordinary lecture activities; improvements in personal speed do not establish general model superiority.

---

## Instructor Notes

- Choose the approved small model and agent environment before the phase begins.
- Keep the single-agent boundary operationally clear.
  A tool that silently delegates to several agents may invalidate the intended comparison.
- Require the same primary stack by default, but allow justified exceptions.
  Stack experimentation across groups is desirable; uncontrolled stack changes within one group's comparison are harder to interpret.
- Require the published baseline workload and the group's primary-pressure transformation to remain stable so architectural comparisons include measured behavior.
