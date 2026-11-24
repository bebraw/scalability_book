---
marp: true
paginate: true
title: "Lecture 6: Assumptions under pressure"
---

# Which web application assumptions fail under pressure?

## Lecture 6 · Challenge

Which assumption would you revisit when a queue keeps growing or a retry produces a second event?

<!-- [Sources] course_plan.md; book/02_challenge/06_reality.md -->

---

# Pressure reveals hidden assumptions

Common examples:

- requests do not overlap;
- retries are rare or harmless;
- one instance owns the relevant state;
- data remains small and uniformly useful;
- dependencies fail together or recover quickly;
- every tenant behaves similarly;
- automated demand is cooperative;
- delayed work eventually completes once.

<!-- [Sources] book/02_challenge/06_reality.md -->

---

# Repeat the primary pressure and investigate correctness

Repeat A’s **primary pressure** on B with the same workload and procedure where practical.
Record any difference that limits the comparison.

For one bounded **correctness or recovery case**, predict the outcome and check what actually happens.
Would you accept the result?
Evidence from the engineering session can serve here.

For example, two clients attempt the same transition.
Which state and activity events should they observe?

<!-- [Sources] book/02_challenge/06_reality.md; specifications/02_challenge.md -->

---

# Failed assumptions point toward response patterns

| Failed assumption                    | Candidate response                            |
| ------------------------------------ | --------------------------------------------- |
| Reads and writes need the same path  | Separate read and write models                |
| A request can wait for all work      | Queue or defer non-critical work              |
| Retries are harmless                 | Idempotency and deduplication                 |
| All consumers deserve equal capacity | Quotas, admission control, or isolation       |
| Demand remains below capacity        | Backpressure, rate limiting, or load shedding |
| Every feature must remain available  | Graceful degradation                          |
| All historical data stays hot        | Index, derive, archive, or delete             |

<!-- [Sources] book/02_challenge/06_reality.md -->

---

# What can B learn from a documented incident?

Choose a published incident report, such as one from [the chapter’s incident table](https://scalableweb.dev/chapters/reality/#what-documented-web-incidents-reveal).
Use three short notes for the lecture activity or announced equivalent.

- **Source facts.** What signal did the operators observe?
  How did they respond?
- **Your interpretation.** Which assumption failed?
  What still had to happen for recovery?
- **Transfer to B.** Where could that assumption fail in your tracker?
  What would you need to check or recover?

Link the source in the activity entry and the entry in B’s evidence index.

<!-- [Sources] book/02_challenge/06_reality.md#what-documented-web-incidents-reveal; specifications/02_challenge.md#apply-runtime-pressure; specifications/grading.md#participation-and-learning-diary-3-points-per-lecture -->

---

# Does the observed wait fit Little’s Law?

Suppose a queue averaged **120 waiting jobs** and **8 jobs started service per second**.
If arrivals and starts balanced over that window, the implied average wait is **120 ÷ 8 = 15 seconds**.

In A **or** B, choose one boundary.
For the same window, record average work in progress (_L_), average completion rate (_λ_) and average time observed inside (_W_).

Were arrivals and completions balanced?
Does _L ≈ λW_ fit your observations?

<!-- [Sources] book/02_challenge/06_reality.md; specifications/02_challenge.md#apply-runtime-pressure -->

---

# Retry safety belongs at the effect boundary

Retries can duplicate externally visible effects even when the request handler looks correct.

Trace:

**request identity → command identity → attempt → effect receiver → recorded outcome**

Ask where duplicate work can be recognized, which operation is safe to repeat, and how a late success is reconciled after a timeout.

<!-- [Sources] book/02_challenge/06_reality.md; book/04_appendices/F_durable_workflows.md -->

---

# Compare A and B without inventing attribution

Separate:

- **observation:** what the evidence shows;
- **plausible explanation:** what may have produced the difference;
- **alternative explanation:** stack, hardware, scope, learning, or noise;
- **next check:** evidence that would discriminate between explanations.

Two implementations do not establish a universal model or tool ranking.

<!-- [Sources] book/02_challenge/06_reality.md; specifications/02_challenge.md -->

---

# Bring the A–B comparison to lecture 7

Freeze B before lecture 7 with its setup instructions, validation steps and available evidence.

Which result changed your view of B’s architecture?
Use the repeated pressure or correctness case to explain one response you would choose and the new failure or recovery obligation it brings.
In B, the response may still be a design hypothesis.

What else could explain the difference between A and B?

<!-- [Sources] lecture_plan.md#7-challenge-presentations-and-compare-launch; specifications/02_challenge.md#apply-runtime-pressure; specifications/00_introduction.md#submit-each-phase-in-stages -->
