---
marp: true
paginate: true
title: "Lecture 3: Measurement and evidence"
---

# How can we measure web applications and development workflows?

## Lecture 3 · Establish

A number becomes evidence only after its question and boundary are clear.

<!-- [Sources] course_plan.md; book/01_establish/03_benchmarking.md -->

---

# Should the tracker rank contributors?

A team lead asks the Work Activity Tracker to rank each person's contribution by counting the items they marked finished.
In a fictional week, Ari marked three items finished and Kim marked one.
Kim also reviewed and helped unblock all three of Ari's items outside the tracker.

What does the count establish?
What would you ask the lead before agreeing to build the ranking?

If the lead wants to know where to offer help this afternoon, what could the item states and timestamps tell them?
What would they still need to ask someone?

<!-- [Sources] book/01_establish/03_benchmarking.md#should-the-tracker-rank-contributors -->

---

# Runtime evidence needs shared vocabulary

| Concept      | Meaning                                                  |
| ------------ | -------------------------------------------------------- |
| Load         | Work offered to the system                               |
| Throughput   | Work completed per unit of time                          |
| Latency      | Time one unit of work spends in the system               |
| Errors       | Work that fails or produces an unacceptable result       |
| Saturation   | A constrained resource approaches or reaches its limit   |
| Resource use | CPU, memory, storage, network, energy, or spend consumed |

<!-- [Sources] book/01_establish/03_benchmarking.md -->

---

# Which requests counted?

| Run | Outcomes for 20 offered requests               |
| --- | ---------------------------------------------- |
| A   | 18 responses in 40 ms, two responses in 240 ms |
| B   | 18 responses in 40 ms, two timeouts at 300 ms  |

The dashboard uses nearest-rank p95 for completed responses.
Users want a response in under 120 ms.
Calculate p95 and count how many requests met the goal in each run.

An assistant summarizes these results as “The change improved service for users.”
Would you publish that conclusion?
Write one sentence the measurements support.

<!-- [Sources] book/01_establish/03_benchmarking.md#which-requests-counted -->

---

# Logs, metrics, and traces answer different questions

**Logs** preserve discrete events and explanations.

**Metrics** summarize behavior over time.

**Traces** connect work across boundaries and dependencies.

Observability is the ability to investigate relevant internal state from available signals—not the number of dashboards installed.

<!-- [Sources] book/01_establish/03_benchmarking.md -->

---

# Little’s Law checks whether averages agree

## L = λW

If 20 events arrive each second and each spends 0.5 seconds in the system:

**L = 20 × 0.5 = 10 events in progress on average**

Use the relationship only over a stable observation window with a clearly defined boundary.

It checks consistency; it does not identify the cause of delay.

<!-- [Sources] book/01_establish/03_benchmarking.md -->

---

# A repeatable protocol makes later comparison possible

Keep constant where practical:

- acceptance behavior and workload;
- warm-up and repetition rules;
- dataset shape and size;
- environment and tool versions;
- collected signals and reporting format.

Record differences rather than hiding them when perfect control is impossible.

<!-- [Sources] book/01_establish/03_benchmarking.md; specifications/00_common_project.md -->

---

# Complete Establish with a baseline

Submit:

- a reproducible implementation A;
- a repeatable runtime workload;
- development-workflow evidence;
- operational run evidence;
- the two bounded claims and their current support;
- an explicit statement of what the baseline does not prove.

**Question to carry forward:** Which architectural assumption created the observed behavior?

<!-- [Sources] course_plan.md; specifications/01_establish.md -->
