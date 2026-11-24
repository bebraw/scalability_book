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

# Run the shared baseline on A, B and C

| Closed-loop profile | Operations | Concurrent workers | Repetitions  |
| ------------------- | ---------: | -----------------: | ------------ |
| Warm-up             |        100 |                  1 | 1 unmeasured |
| Steady              |        500 |                  4 | 3 measured   |
| Higher concurrency  |        200 |                 16 | 3 measured   |

Reset and reseed after warm-up and before each measured repetition.
Keep the operation mix, timing boundary and deadlines consistent.
Record environment differences, outcomes, and the resource proxy alongside latency. [Shared workload and reporting rules](https://scalableweb.dev/project/#7-1-shared-baseline-workload)

<!-- [Sources] book/01_establish/03_benchmarking.md; specifications/00_common_project.md -->

---

# Freeze A before Lecture 4

**Group.** One member submits the source archive, full revision, setup and checks, and available evidence.
Include the shared baseline and two claims.
Define one repeatable primary pressure.
Run it if feasible and label any projection.

**After the freeze.** Audit the assigned revision.
Add the audit evidence, your response to the audit of A, and the completed index to the same group record by the evidence deadline.

**Individual.** Submit your lecture diaries and self- and peer-assessment in your private portfolio by its published deadline.

[Establish checklist](https://scalableweb.dev/project/establish/) · [Submission stages](https://scalableweb.dev/project/introduction/#submit-each-phase-in-stages)

<!-- [Sources] specifications/01_establish.md; specifications/00_introduction.md#submit-each-phase-in-stages; specifications/00_common_project.md#9-common-submission-bundle-and-comparable-evidence -->
