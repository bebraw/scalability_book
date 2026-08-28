---
marp: true
paginate: true
title: "Lecture 7: Agent fleets"
---

# When do agent fleets improve web development?

## Lecture 7 · Compare

Parallel generation helps only when decomposition, integration, and review can keep up.

<!-- [Sources] course_plan.md; book/03_compare/07_agent_fleets.md -->

---

# A fleet changes the coordination problem

Adding agents can increase:

- work attempted in parallel;
- context boundaries and handoffs;
- duplicated exploration;
- integration conflicts;
- review and validation demand;
- the authority exposed to automated work.

The objective is accepted outcomes per constrained human attention—not maximum activity.

<!-- [Sources] book/03_compare/07_agent_fleets.md -->

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

# Roles should describe authority, not personalities

| Role        | Typical authority                           | Required evidence                  |
| ----------- | ------------------------------------------- | ---------------------------------- |
| Explorer    | Propose alternatives                        | Options, assumptions, unknowns     |
| Implementer | Change a bounded surface                    | Diff and focused checks            |
| Reviewer    | Evaluate against declared criteria          | Findings and verdict               |
| Integrator  | Resolve contracts and combine accepted work | Integrated checks and known limits |
| Operator    | Exercise deployment or recovery             | Run evidence and rollback state    |

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

# Launch Compare with a falsifiable fleet plan

Produce:

- a task graph and critical path;
- role, context, tool, and permission boundaries;
- integration and validation gates;
- a single-agent counterfactual;
- one predicted benefit and one predicted coordination cost;
- a trace that can later explain a failed or corrected task.

**Question to carry forward:** Which scaling response is justified by the application evidence?

<!-- [Sources] course_plan.md; specifications/03_compare.md -->
