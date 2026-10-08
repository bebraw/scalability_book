---
marp: true
paginate: true
title: "Lecture 1: What scalability means"
---

# What does scalability mean for web development?

## Lecture 1 · Establish

Pressure changes.
What must the system continue to do?

<!-- [Sources] course_plan.md; book/01_establish/01_what_is_scalability.md -->

---

# Scalability is a relationship, not a size

**Pressure changes**

Users, data, contributors, or requirements grow or vary.

**Expected behavior remains bounded**

The system preserves an explicit quality, cost, reliability, or change goal.

> “Scales well” is incomplete until both sides of the relationship are named.

<!-- [Sources] book/00_introduction.md; book/01_establish/01_what_is_scalability.md -->

---

# Four pressures organize the course

| Pressure    | What changes?                                | Example question                                          |
| ----------- | -------------------------------------------- | --------------------------------------------------------- |
| Demand      | Requests and useful work                     | Can the application sustain a tenfold traffic burst?      |
| Data        | Volume, velocity, shape, or retention        | Can queries remain useful as history grows?               |
| Contributor | People and agents changing the system        | Can more contributors work without integration collapse?  |
| Change      | Requirements, dependencies, and environments | Can the system evolve without making every release risky? |

<!-- [Sources] course_plan.md; book/01_establish/01_what_is_scalability.md -->

---

# Related qualities answer different questions

**Performance** asks how the system behaves under stated conditions.

**Elasticity** asks how capacity adapts to changing demand.

**Resilience** asks how behavior changes when parts fail.

**Efficiency** asks what resources an accepted outcome consumes.

Scalability connects changing pressure to the behavior that must be maintained.

<!-- [Sources] book/01_establish/01_what_is_scalability.md -->

---

# Mechanisms are responses—not dimensions

Architecture and infrastructure give us response surfaces:

- move or duplicate computation;
- cache, replicate, partition, archive, or delete data;
- isolate failure and ownership boundaries;
- automate validation and deployment;
- change contracts, workflows, or responsibility.

Every response introduces a cost, constraint, or new failure mode.

<!-- [Sources] course_plan.md; book/01_establish/01_what_is_scalability.md -->

---

# Turn an ambition into a bounded claim

> Under **[declared pressure and conditions]**, the system maintains **[observable behavior]** within **[threshold or comparison]**, except for **[known limit]**.

Weak: “The application is scalable.”

Stronger: “With 20 concurrent users creating events, p95 accepted-write latency remains below 500 ms on the declared environment, until the database write path saturates.”

<!-- [Sources] book/01_establish/01_what_is_scalability.md; specifications/01_establish.md -->

---

# One product, three development systems

The course builds the same Work Activity Tracker three times:

1. **Establish:** large model, single-agent workflow.
2. **Challenge:** small model, single-agent workflow.
3. **Compare:** declared fleet using small, large, or mixed models.

The shared behavior stays stable so differences in architecture, evidence, and workflow become discussable.

<!-- [Sources] book/00_introduction.md; specifications/00_common_project.md -->

---

# Establish checkpoint

Before the next lecture, produce:

- two bounded scalability claims;
- the project’s important constraints;
- an initial implementation A hypothesis;
- one pressure map for the application and development system.

**Question to carry forward:** What evidence would make your claim credible?

<!-- [Sources] course_plan.md; specifications/01_establish.md -->
