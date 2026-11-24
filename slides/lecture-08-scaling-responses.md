---
marp: true
paginate: true
title: "Lecture 8: Scaling responses"
---

# How should web applications respond to scaling pressure?

## Lecture 8 · Compare

Implement the smallest response that can be justified and remeasured.

<!-- [Sources] course_plan.md; book/03_compare/08_scaling.md -->

---

# Which limit justifies a change?

Start with an observed limit or a credible projection you can test.

1. What pressure changes?
2. Which part of the system reaches its limit first?
3. What would a user see when it does?
4. How would the proposed change help, and what would it cost?

If the limit is projected, say what observation would confirm or challenge it.

<!-- [Sources] book/03_compare/08_scaling.md -->

---

# Different bottlenecks justify different mechanisms

| Observed boundary             | Candidate response                           |
| ----------------------------- | -------------------------------------------- |
| Repeated expensive reads      | Index, cache, or derive                      |
| One authoritative write path  | Partition, serialize, batch, or reduce work  |
| Slow non-critical work        | Queue and process asynchronously             |
| Dependency overload           | Limit, isolate, shed, or degrade             |
| Read locality or availability | Replicate with an explicit consistency model |
| Unequal tenants or consumers  | Quotas, admission control, and isolation     |
| Geographical latency          | Move suitable reads or computation closer    |

<!-- [Sources] book/03_compare/08_scaling.md -->

---

# Choose the smallest justified response

Prefer a bounded change such as:

- one missing index;
- one cache with an invalidation rule;
- one idempotency boundary;
- one admission or rate policy;
- one queued effect;
- one isolation boundary;
- one graceful-degradation path.

Choose A, B, or C.
Preserve its accepted revision and baseline measurements.

<!-- [Sources] book/03_compare/08_scaling.md -->

---

# Did the change relieve the pressure?

Run the common acceptance scenarios and the selected pressure before and after the change.
Keep the dataset, workload, environment, warm-up and repetition rules fixed.

For claims about sustained demand, queue growth or admission control, [schedule arrivals independently of completions](https://scalableweb.dev/project/#7-3-arrival-controlled-overload-and-recovery) and observe recovery as the load drains.

Compare latency, throughput, errors, correctness and your resource-efficiency measure.
Link every repetition to its revision, including runs where the change made things worse.

Did the measurements support your prediction, challenge it or leave the question open?

<!-- [Sources] book/03_compare/08_scaling.md; specifications/03_compare.md -->

---

# Choose a model for each decision

**Application decision**

Would a larger connection pool help?
Suppose 40 checkouts finish per second and each holds a connection for 0.2 seconds on average.
In a stable interval, Little’s Law gives 8 busy connections on average.
Check the pool limit and observed waits before resizing it.

**Development-workflow decision**

Would another agent shorten delivery?
If review takes 30% of a fixed task and must stay sequential, Amdahl’s Law caps ideal speedup at about 3.3×. If the question is how fast patches accumulate, model the review queue.

Choose a model for each decision in your project.
Show the reasoning and where its assumptions limit your conclusion.

<!-- [Sources] book/03_compare/08_scaling.md; specifications/03_compare.md#compare-one-agent-with-the-fleet; specifications/03_compare.md#analyze-the-three-applications -->

---

# Every response creates a new operational obligation

Examples:

- a cache needs invalidation and cold-start behavior;
- a queue needs retry, deduplication, visibility, and backlog recovery;
- replication needs freshness and conflict rules;
- partitioning needs routing and rebalancing;
- rate limiting needs identity, fairness, and useful rejection behavior.

Exercise one failure or recovery case the change introduces.
For a cache, what does a reader see immediately after an update?

<!-- [Sources] book/03_compare/08_scaling.md -->

---

# Compare checkpoint

- Repeat the primary pressure on C.
  Compare the result with A and B.
- Link the application and workflow model analyses to the decisions they informed.
- For the response you tried on A, B or C, show the before-and-after measurements and what happened when you exercised its new failure or recovery case.
- Deploy the revision you select after the experiment in an instructor-approved, realistic environment outside your development process.
  Rerun the shared baseline workload and explain what differed from the local run.

Use this evidence in your [final matrix and decision narrative](https://scalableweb.dev/project/compare/#final-comparison).
Which architecture and workflow would you choose, and what measurement would change your mind?

<!-- [Sources] course_plan.md; specifications/03_compare.md -->
