---
marp: true
paginate: true
title: "Lecture 9: Engineering judgment"
---

# What do three implementations teach us about scalability?

## Lecture 9 · Compare

Evidence supports a conditional decision—not a universal winner.

<!-- [Sources] course_plan.md; book/03_compare/09_recap.md -->

---

# Three builds create contrast, not a controlled ranking

Between A, B, and C, several things may change:

- model and harness;
- stack and architecture;
- student knowledge and practice;
- scope interpretation;
- hardware and deployment environment;
- orchestration and review process.

The shared specification and protocol make differences discussable, not perfectly attributable.

<!-- [Sources] book/00_introduction.md; book/03_compare/09_recap.md -->

---

# Build one evidence matrix across both systems

Compare each implementation across:

- required behavior and correctness;
- runtime pressure and resource use;
- architecture and failure recovery;
- setup, change, test, review, and operational friction;
- AI assistance and human correction;
- deployment and maintenance obligations;
- cost, sustainability, and known limits.

Missing evidence should remain visible.

<!-- [Sources] book/03_compare/09_recap.md; specifications/03_compare.md -->

---

# Separate observation, inference, and proposal

**Observation**

What happened on the submitted revision under declared conditions?

**Inference**

What explanation is consistent with the evidence, and what alternatives remain?

**Proposal**

What should be changed or chosen next, given the goal and constraints?

Do not write an inference as though it were measured fact.

<!-- [Sources] book/03_compare/09_recap.md -->

---

# Name the threats to attribution

Before claiming that a tool or architecture caused a result, consider:

- practice effects between phases;
- unequal implementation scope;
- stack and dependency differences;
- hardware and service variation;
- measurement noise;
- missing failed attempts;
- review standards that changed over time.

A narrower claim is often the more useful engineering claim.

<!-- [Sources] book/03_compare/09_recap.md -->

---

# Defend a conditional decision

Use this structure:

> For **[goal and constraints]**, choose **[architecture and development workflow]** because **[strongest evidence]**.
> Reject **[alternative]** because **[trade-off or unsupported assumption]**.
> Revisit the decision when **[pressure or boundary]** changes.

The decision should name who owns its operational and correction obligations.

<!-- [Sources] book/03_compare/09_recap.md -->

---

# A strong defense answers uncomfortable questions

- Which result surprised you?
- Which claim has the weakest evidence?
- What did the scaling response make worse?
- Where did agents create review or integration load?
- Which difference cannot be attributed confidently?
- What would you measure next before committing more architecture?

<!-- [Sources] book/03_compare/09_recap.md; specifications/03_compare.md -->

---

# Finish with the next boundary

The final package should contain:

- three reproducible implementations;
- comparable runtime and workflow evidence;
- one implemented and remeasured scaling response;
- a conditional architecture and workflow decision;
- rejected alternatives and remaining uncertainty;
- the next pressure, boundary, and measurement.

Scalability is not a finish line.
It is a disciplined way to reason about change.

<!-- [Sources] course_plan.md; book/03_compare/09_recap.md; specifications/03_compare.md -->
