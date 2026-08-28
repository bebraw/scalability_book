---
marp: true
paginate: true
title: "Lecture 6: Assumptions under pressure"
---

# Which web application assumptions fail under pressure?

## Lecture 6 · Challenge

Scaling techniques matter only when they respond to a failed assumption.

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

# Choose one primary and one revealing secondary pressure

**Primary pressure** stays comparable across A and B.

**Secondary pressure** should expose a consequence of an architectural difference.

Possible pressures include concurrency, data growth, retries, partial failure, tenancy, retention, geographical distance, automated abuse, or changing requirements.

Do not run every scenario.
Choose the ones that can change the engineering conclusion.

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

# Little’s Law exposes a queue boundary

Suppose a stable queue contains **L = 120** jobs on average and receives **λ = 8 jobs/s**.

## W = L / λ = 120 / 8 = 15 seconds

The calculation does not explain the delay.

It tells us that the observed work in progress, arrival rate, and time in system must be interpreted together—and that the queue boundary deserves investigation.

<!-- [Sources] book/02_challenge/06_reality.md -->

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

# Complete Challenge with a pressure map

Submit:

- comparable primary-pressure evidence for A and B;
- one focused secondary-pressure analysis;
- architecture and ownership consequences;
- one Little’s Law check at a declared boundary;
- operational evidence and recovery reasoning;
- an evidence-based A-B comparison with limits.

**Question to carry forward:** Can parallel agents reduce accepted-change time without overwhelming integration and review?

<!-- [Sources] course_plan.md; specifications/02_challenge.md -->
