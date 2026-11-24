---
marp: true
paginate: true
title: "Lecture 7: Agent fleets"
---

# When do agent fleets improve web development?

## Lecture 7 · Compare

Present the difference that mattered most between A and B.
Then use it to plan the fresh fleet build, C.

<!-- [Sources] lecture_plan.md#7-challenge-presentations-and-compare-launch; specifications/02_challenge.md; specifications/03_compare.md -->

---

# What did the second build reveal?

Present one consequential difference between large-model A and small-model B.
Both used a single agent.

- Show evidence from both builds.
  You might compare the same workload, the effort to get a change accepted, or the behavior you observed under failure.
- What might explain the difference?
  Which other explanation also fits?

B's revision was due before this lecture.
The assigned audit uses that frozen revision.
Add the audit and your response to the same group record on the announced schedule.

<!-- [Sources] lecture_plan.md#7-challenge-presentations-and-compare-launch; specifications/02_challenge.md#compare-the-two-single-agent-workflows; specifications/00_introduction.md#submit-each-phase-in-stages -->

---

# Decompose around contracts and evidence

Good delegated tasks have:

- one observable outcome;
- a bounded change surface;
- explicit inputs and dependencies;
- an acceptance check;
- a named integrator or owner;
- a stop or escalation condition.

Splitting by files alone can distribute code while leaving the real design decision shared and unresolved.

<!-- [Sources] book/03_compare/07_agent_fleets.md -->

---

# Use the same development loop with explicit owners

| Stage     | Fleet responsibility                    | Acceptance boundary                           |
| --------- | --------------------------------------- | --------------------------------------------- |
| Constrain | Settle contracts and dependencies       | Owner resolves ambiguity and scope            |
| Generate  | Delegate, implement, and integrate      | Agents execute within declared limits         |
| Validate  | Check focused work and the full journey | Accepting owner reviews evidence and failures |
| Revise    | Diagnose, correct, and update checks    | Revalidate the corrected revision             |

For each decision, state whether an agent may **propose**, **prepare**, or **execute**.

<!-- [Sources] book/03_compare/07_agent_fleets.md -->

---

# The task graph—not agent count—sets the speed limit

Map:

- independent branches;
- sequential prerequisites;
- shared resources and contracts;
- integration gates;
- human decisions on the critical path.

Parallel tasks that all wait for one ambiguous interface do not create parallel progress.

<!-- [Sources] book/03_compare/07_agent_fleets.md -->

---

# Amdahl’s Law bounds ideal speedup

If 80% of the work can be parallelized, the sequential 20% remains.

## S(N) = 1 / ((1 - 0.8) + 0.8 / N)

With four workers, ideal speedup is **2.5×**, not 4×.

As N grows, maximum ideal speedup approaches **5×**—before coordination, integration, and review overhead.

<!-- [Sources] book/03_compare/07_agent_fleets.md -->

---

# Integration is part of the fleet design

Before parallel work begins, define:

- shared contracts and invariants;
- branch or workspace isolation;
- validation gates for delegated tasks;
- how failures and conflicts are surfaced;
- who can accept the integrated revision;
- which external actions require human approval.

The fleet is not complete until its outputs converge into one reviewable artifact.

<!-- [Sources] book/03_compare/07_agent_fleets.md -->

---

# Launch C with a fleet plan

Build the tracker afresh with at least two independently operating agents or delegated executions.

- Give each task a defined output.
  Show where work passes between agents or joins for review.
- Declare the approved model for each task or role and any routing or fallback rules.
  B's small model is the reference.
  C may use small models, large models, or a mixture.
- Predict what delegation will improve, where someone may have to wait, and who will check the integrated result.

<!-- [Sources] specifications/03_compare.md#what-counts-as-a-fleet; specifications/03_compare.md#fleet-plan -->

---

# Which evidence comes from which run?

**Your fleet build.** Keep a compact, redacted record.
Use it to explain at least two debugging findings, including the checks, corrections or human interventions that support them.

**The supplied matched traces.** Analyze the single-agent and fleet attempts on the same task.
Compare accepted behavior, elapsed time, human effort, model use and corrections.
Link the activity analysis in the fleet evidence section.

Running your own matched pair and importing the trace into C are optional.

<!-- [Sources] specifications/03_compare.md#fleet-evidence; specifications/03_compare.md#supplied-matched-single-agent-fleet-analysis -->
