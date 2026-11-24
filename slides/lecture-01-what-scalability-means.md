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

# Would you keep the cache?

A team added a cache to its workspace summary.
It now reuses a saved copy and the team reports that the page loads twice as fast.

> What would you need to know before recommending that they keep the cache?

Take five minutes on your own, before using an agent or discussing the case.
In your private lecture diary, record your provisional recommendation, what you would measure first and why.
Save this entry for Lecture 9.

<!-- [Sources] lecture_plan.md -->

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

An example to test: “As we increase concurrency from four clients to twenty, at least 95% of valid work-item creations finish within 500 ms.
Each creates one activity event.”

<!-- [Sources] book/01_establish/01_what_is_scalability.md; specifications/01_establish.md -->

---

# One product, three development systems

Make three fresh implementations of the same Work Activity Tracker.

1. **Establish (A).** Use the approved large model, one coding agent at a time.
2. **Challenge (B).** Use the approved small model, one coding agent at a time.
3. **Compare (C).** Declare the fleet and its approved model assignments.

In A and B, teammates can plan, test and correct the work together.
Record consequential manual corrections.
Use only the approved inference route for each build.

<!-- [Sources] book/00_introduction.md; specifications/00_common_project.md -->

---

# How course credit works

| Work in each phase                   | Points | Minimum to pass each phase                                             |
| ------------------------------------ | -----: | ---------------------------------------------------------------------- |
| Shared group project                 |     30 | 10 points                                                              |
| Individual participation and diaries |      9 | Two of three lecture activities at 3/3 each                            |
| Private self- and peer-assessment    |     12 | 6 points, including 1/3 for reliable contribution and shared ownership |

A 3-point lecture activity combines live participation or the announced remote equivalent, one concrete idea, and a connection to evidence, an assumption, or a decision.

Meet these minima in **every phase** and earn at least **50% overall**. [Assessment rubric](https://scalableweb.dev/project/grading/)

<!-- [Sources] specifications/grading.md; specifications/00_introduction.md -->

---

# Establish checkpoint

Start two claims in your group's evidence index for implementation A:

- one about runtime demand or data;
- one about contributors or change.

Use the [pressure record](https://scalableweb.dev/project/#pressure-record-template) to say where each claim applies and what evidence could challenge it.
Use the runtime claim to choose one pressure you can repeat on B and C.

**Question to carry forward:** What evidence would make your claim credible?

<!-- [Sources] course_plan.md; specifications/01_establish.md -->
