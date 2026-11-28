---
marp: true
paginate: true
title: "Lecture 9: Engineering judgment"
---

# What do three implementations teach us about scalability?

## Lecture 9 · Compare

Present your team's choice of architecture and development workflow for a specific situation.
Which observation most influenced that choice?

<!-- [Sources] lecture_plan.md#9-compare-presentations-and-course-reflection; specifications/03_compare.md#final-comparison -->

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

# What did the fleet record explain?

- Present one debugging finding from the actual fleet run that produced C.
  What would a reader of the final code have missed?
- Which observation supports your explanation?
  What else could account for it?
- Which part of your target design still needs testing?
  What would you measure next?

Use the supplied matched pair to discuss what changed under its recorded conditions.
Keep those results separate from your team's B–C comparison.

<!-- [Sources] lecture_plan.md#9-compare-presentations-and-course-reflection; specifications/03_compare.md#final-comparison -->

---

# Complete the Compare record

C was due before class.
Add the independent audit report and your response to the group record.

| Evidence index         | What to link                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Implementation         | Frozen C revision, common checks, engineering session, audit and response, A and B records                               |
| Fleet                  | Plan, run record, two debugging findings, coordination measures, B–C comparison, supplied trace analysis, workflow model |
| Scaling and deployment | Application model, scaling change, before/after results, new failure or recovery check, deployed workload rerun          |
| Decision               | A–B–C matrix, target architecture, trade-offs, owner, when to revisit                                                    |

<!-- [Sources] specifications/00_introduction.md#submit-each-phase-in-stages; specifications/03_compare.md#what-to-do-and-submit -->

---

<!-- in-class-only -->

# Would you keep the cache?

A team added a cache to its workspace summary.
It now reuses a saved copy and the team reports that the page loads twice as fast.

> What would you need to know before recommending that they keep the cache?

Take two minutes on your own, before using an agent or rereading any earlier entry.
In your private lecture diary, record your provisional recommendation, what you would measure first and why.

<!-- [Sources] lecture_plan.md -->

---

<!-- in-class-only -->

# What changes at handover?

During shift handover, completed items sometimes still appear as active in the summary.

Would you keep the cache?
What would you measure next, and how would the result affect your decision?

Take three minutes to finish your diary response on your own.
For discussion, compare with your Lecture 1 reasoning if you have it, or name one uncertainty the handover observation raised.

<!-- [Sources] lecture_plan.md -->

---

# Which idea changed for you?

Revisit the opening word cloud.
Which word would you keep, replace or add after the three builds?

Submit your **private Compare portfolio** by the published deadline.
Label each diary entry by lecture.
In your self- and peer-assessment, link the evidence for a decision you challenged, tested or reviewed and explain the outcome.
Check that your submitted portfolios include diary entries for at least **seven different lectures**.
An idea from today’s discussion or a connection to your project can be your Lecture 9 entry.

<!-- [Sources] lecture_plan.md#9-compare-presentations-and-course-reflection; specifications/grading.md#mandatory-individual-work; specifications/grading.md -->
