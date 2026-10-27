# How should web applications respond to scaling pressure?

Scaling changes a system in response to a specific [pressure](/concepts/#pressure).
Each response should relieve an identified limit while making its new costs and failure modes visible.

## Start with the pressure

Use the primary-pressure and bounded correctness or recovery evidence from Challenge to select a response hypothesis.
:ref[table:scaling-response-patterns]{text="The table below"} connects common pressures to the contracts each response adds.

| Pressure or failed assumption                               | Response pattern worth considering                                   | New obligation and evidence                                                                  |
| ----------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Writes and reads compete for one path                       | Separate the authoritative write path from derived read views        | Define freshness, rebuild, and reconciliation; measure write completion and read usefulness  |
| A burst contains work that need not finish synchronously    | [Queue](/concepts/#queue) or buffer bounded background work          | Expose pending and terminal states, queue age, retry behavior, and worker saturation         |
| A request may be repeated after an ambiguous result         | Use a stable idempotency key and authoritative deduplication         | Store the mutation and reusable result atomically; test a retry after a lost response        |
| One tenant or domain instance consumes shared capacity      | Partition, quota, or isolate work by a meaningful domain boundary    | Define routing, fairness, cross-partition operations, and migration                          |
| Incoming work exceeds the rate at which it can be completed | Apply backpressure, admission control, rate limits, or load shedding | Make rejection explicit, bound waiting, guide retries, and preserve the essential path       |
| Optional work threatens a core operation                    | Degrade a named capability while preserving the core                 | Define the degraded user state, dependency boundary, recovery trigger, and completion signal |
| History grows beyond the useful query or retention path     | Add a measured index, derived summary, archival, or deletion path    | Account for write cost, staleness, rebuild, retention policy, and restored-state checks      |

::caption[Scaling response hypotheses and the obligations they introduce.]
::label[table:scaling-response-patterns]

Combine techniques only where the pressure requires them.
A queue can duplicate effects without idempotency, and controlled rejection can amplify load if clients immediately retry.

### Prepare one scaling decision

Use the response patterns above to frame the existing before-and-after project experiment.
Copy these prompts into the specification or decision record you maintain:

```text
Observed limit, revision and supporting record:
One response to test and expected observable benefit:
Simpler alternative and why it is insufficient:
Same-workload comparison and acceptance checks:
New failure, freshness or recovery obligation:
Result, uncertainty and reversal condition:
```

For example, a slow workspace feed may justify testing an index that matches its filter and ordering.
Inspect the query plan and repeat the declared workload; also check result ordering and the added write or storage cost.
The existence of an index is not evidence of useful improvement.

Each accepted work-item creation or transition must preserve its state change and matching activity event together.
Queueing may defer derived summaries after that commit; a faster acknowledgment must not conceal a pending core operation.
For optional practice with a particular mechanism, the [course workspace](/downloads/labs/course-workspace.zip) contains `http-cache/` and `persisted-retry/` with fixed checks.
Choose one when it answers your question; completing extra exercises is not an additional grading requirement.

## Name the saturation boundary

Scaling pressure becomes operationally important when it approaches a limit.
The competence-envelope model introduced in the Challenge part calls the boundary condition [**saturation**](/concepts/#saturation): the system can no longer absorb the disturbance with its current capabilities :citep[woods2018graceful].
Naming the saturated resource prevents "add more servers" from becoming the default response.
:ref[table:saturation-limit-categories]{text="The table below"} groups common limits by the evidence that reveals their approach.

| Limit category       | Examples                                                                           | What approaching saturation may look like                                                       |
| -------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Physical resources   | CPU, memory, disk space, storage I/O, network bandwidth                            | Growing wait time, swapping, failed allocations, full disks, or reduced throughput              |
| Virtual resources    | Connection and thread pools, file descriptors, bounded queues, quotas, rate limits | Pool wait, rejected work, `429` responses, queue growth, or quota errors                        |
| Dependency capacity  | Databases, identity providers, third-party APIs, provisioning systems              | Timeouts, blocked callers, correlated downstream errors, or delayed scaling                     |
| Operational capacity | On-call attention, deployment speed, diagnostic access, coordination               | Slow decisions, unsafe workarounds, competing responders, or recovery blocked by normal process |

::caption[Categories of saturation limits and their observable signals.]
::label[table:saturation-limit-categories]

Saturation can create reinforcing [feedback loops](/concepts/#feedback-loop): overload causes timeouts, timeouts cause retries, and retries add load.
Synchronous fan-out can overload an internal service, and blocked threads can make a CPU-based autoscaler misread demand.
A resource leak may separate the causal change from the eventual failure by hours or months.
These dynamics explain why a locally sensible mechanism can worsen a system-wide incident and why the existing pressure record should identify both the first limit and what happens after it is reached :citep[hochstein2026saturation].

### Saturation boundary lab

The model below follows offered, admitted and completed rates through four declared stage limits.
Increase demand until a boundary becomes binding, expand that limit, and observe which constraint becomes visible next.
Then enable [backpressure](/concepts/#backpressure) and distinguish the excess that queues from the excess explicitly rejected.
Name a real observation that could confirm the limiting stage; the model's entered capacities do not establish it.

{{ import "site/includes/saturation-boundary-demo.html" }}

{{ import "exercise:scaling-bottleneck" }}

Treat the rates as a reasoning aid rather than measured capacity.
The lesson is structural: removing one bottleneck changes the system's limiting factor, while retries can consume headroom before useful demand changes.

## Use a formal model before choosing a technique

Formal models help challenge an intuition about the limit.
Choose the question before the equation:

| Question                                        | Model and worked treatment                                                                   |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Do backlog, throughput, and average time agree? | [Little's Law](/chapters/benchmarking/#check-measurements-against-a-model)                   |
| How much speedup can the parallel part provide? | [Amdahl's Law](/chapters/agent-fleets/#amdahl-s-law-and-the-sequential-bottleneck)           |
| How do failures across critical steps combine?  | [Series reliability](/appendices/scalability-models/#lusser-s-law-and-the-reliability-chain) |
| Can coordination make added concurrency slower? | [Universal Scalability Law](/appendices/scalability-models/#contention-curve-lab)            |

::caption[Questions that guide the choice of a formal model.]
::label[table:scalability-model-questions]

[Appendix E](/appendices/scalability-models/#choose-a-model) collects the equations, assumptions, and limits.

Before opening the concept references, choose between [Little's Law](/concepts/#little-law) and [Amdahl's Law](/concepts/#amdahl-law) for each question below.
Explain your choice before checking the arithmetic.

{{ import "exercise:scaling-model-choice" }}

What would you still need to measure before recommending more workers?
Connect the answer to [throughput](/concepts/#throughput), [latency](/concepts/#latency), and the assumptions of the chosen model.

The project does not require every model.
Apply at least one suitable law or formal model to an application-architecture decision and one to the development workflow.
Each application should identify the variables, state the assumptions, show the calculation or reasoning, connect the result to a measured or proposed limit, and explain what the model leaves out.
A formula added after the design decision is not evidence that the formula guided the decision.

### Contention beyond Amdahl's bound

Amdahl's fixed sequential share omits [coordination costs](/concepts/#contention) that grow with concurrency.
The [contention curve in Appendix E](/appendices/scalability-models/#contention-curve-lab) makes that difference visible and examines a production case of limiting admitted work.
Fit its parameters to representative throughput measurements before using it for a capacity claim.

## Three documented cases of web scaling pressure

Scaling techniques become useful in combinations rather than as isolated vocabulary.
The cases below begin with published production accounts from GitHub, Spotify, and Shopify.
They provide observed pressures, interventions, and outcomes that a fictional scenario cannot.
They are still company-authored retrospectives rather than controlled experiments: they report what each organization measured in its own system, and several changes may have occurred together.
Treat their reported outcomes as evidence about those systems, not as performance promises for another application.

Read each case through the same questions:

1. What did users experience?
2. Which resource or boundary approached saturation?
3. What evidence exposed that boundary?
4. What did the organization change?
5. What improved, and what new trade-off appeared?
6. Which part transfers to the event-tracking project, and which part does not?

:ref[table:documented-scaling-cases]{text="The table below"} previews the evidence and the transfer question in each case.

| Production case                                                                                                                                                 | Observed pressure                                                    | Intervention described by the source                                     | Reported evidence                                                                 | Transfer question for the tracker                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [GitHub Issues navigation](https://github.blog/engineering/architecture-optimization/from-latency-to-instant-modernizing-github-issues-navigation-performance/) | Repeated page visits still paid network and rendering costs          | Persistent client cache, stale-while-revalidate, controlled preheating   | More React navigations became instant, with measured cache divergence             | Which repeated read can tolerate controlled staleness?                |
| [Spotify podcast-video ingestion](https://engineering.atspotify.com/2026/7/content-ingestion-and-podcast-video-incident-report)                                 | Transcoding capacity saturated and queued publication work aged      | More capacity, work prioritization, earlier alerts, planned backpressure | Publication moved from minutes to hours during the incident                       | What does acceptance mean, and how will users see pending work?       |
| [Shopify flash-sale request processing](https://shopify.engineering/17489012-what-does-your-webserver-do-when-a-user-hits-refresh)                              | Slow requests and browser refreshes consumed application-worker time | Detect and discard requests whose clients had already disconnected       | Order-of-magnitude spikes, full request queues, and `499` responses exposed waste | Which work should be refused, cancelled, or shed before adding hosts? |

::caption[Documented production pressures and the questions they raise for the project.]
::label[table:documented-scaling-cases]

> **Sustainability angle**
>
> Scaling techniques have resource profiles.
> Caches, queues, replicas, CDNs, shards, and multi-region deployments can improve user experience, but each adds infrastructure and operational cost.
> Ask which pressure justifies the extra resource use.

## Orchestration maintains declared capacity

Horizontal scaling is not merely the instruction to "run more servers".
An orchestrator repeatedly compares a declared desired state with the state it observes and takes action to close the gap.
A Deployment can declare a replica count and pod template, while a Service gives clients a stable route as individual pods change.

### Orchestration control-loop lab

The lab below runs [Webernetes](https://github.com/ngrok/webernetes), a partial browser-based port of Kubernetes intended for interactive teaching.
Change the desired replica count, send requests through a service, terminate a pod, and inspect a rolling update.
Watch for the distinction between the operator's instruction, the temporary mismatch, and the controller action that restores the declared state.
The deliberately broken release adds a second question: can the replica count converge while application requests fail?
Inspect the response evidence and roll back, keeping running replicas separate from accepted application outcomes.

{{ import "site/includes/orchestration-demo.html" }}

This is a mechanism demonstration, not a capacity benchmark or a production Kubernetes environment.
The browser runs compatible control logic and a simulated network, but it does not execute real container images or model persistent volumes, resource limits, autoscaling, and the full production networking stack.
Ask which component noticed the mismatch, what action it took, and which scaling problem remains unsolved.

Replica orchestration cannot make every component horizontally scalable.
If each application instance depends on one saturated database, holds incompatible local state, or performs the same expensive downstream work, adding pods may move or amplify the bottleneck.
Treat the replica count as a response hypothesis and measure whether useful capacity or availability improves.

## Latency and geography

Geography becomes a scaling pressure when physical distance, regional failure, data residency, or a geographically distributed user base approaches an application requirement.
The fastest handler still waits for network propagation and every sequential round trip consumes more of the latency budget.

Static assets and public cacheable responses can often move closer to users through a CDN or edge cache without moving the authoritative write path.
Personalized data and mutations are harder: executing code at the edge does not remove the distance to a single authoritative database.
Moving or replicating that authority introduces routing, failover, [consistency](/concepts/#consistency), conflict, and residency decisions.
Measure which bytes and round trips dominate before treating multi-region deployment as the inevitable final stage of scaling.

### Partitions force an operational choice

For a distributed read-write object in an asynchronous network, a network [partition](/concepts/#partition) can prevent a design from guaranteeing both linearizability and an available response from every non-failing node :citep[gilbert2002brewer].
**Linearizability** requires one operation order that respects real time: a read starting after a completed write must see that value or a later write.
**Availability** requires every request to a non-failing node eventually to return a response allowed by the object's contract; it sets no latency bound.

For the tracker, suppose Alice and Bob send different start commands for the same initial work item to regions that cannot communicate.
If both regions accept the transition locally, both clients receive success even though the lifecycle permits only one initial-to-active transition.
Reconciliation can repair stored state, but it cannot retract the success already observed by either client.
A majority-quorum design can keep one accepted history by making the isolated minority delay or reject the request.

Choose which operations may be stale, rejected, delayed, merged, compensated, or repaired without violating the domain.
[Appendix C's CAP proof and partition lab](/appendices/advanced-web-boundaries/#partitions-and-replicated-state) develop the reasoning and compare the two policies.

In some project themes, geography may matter very little.
In others, a platform serving users or devices in different regions may need to consider latency, data residency, or regional failure.
Justify multi-region architecture against the project's latency, availability, and operating requirements.

### Latency budget lab

The demonstration below treats latency as a budget.
Some of the budget is bounded by physics: a signal cannot cross distance instantly, and real networks add routing and protocol overhead.
Some of the budget is architectural: every sequential database round trip adds another wait.
Choose distances independently of the server and database execution times; each timing is a stated hypothetical input unless you supply a sourced observation.
Distance alone does not determine a primary/replica design or a hardware class.

{{ import "site/includes/latency-budget-demo.html" }}

The point is not to memorize exact numbers.
Real latency depends on providers, routing, congestion, TLS, database load, and query plans.
The useful lesson is the shape of the problem: distance creates a lower bound, and repeated sequential database access multiplies that bound.

## Trade-offs

For each mechanism, explain what becomes simpler and what becomes harder:

- Caching reduces repeated computation but adds freshness and invalidation decisions.
- Queues shorten synchronous work but add backlog, retries, idempotency, and delayed completion.
- Partitioning reduces shared-resource pressure but adds routing, migration, and cross-partition queries.

The “waterbed” metaphor describes this movement of complexity :citep[randal2003perl6]; it is a review question, not a law that complexity must remain constant.
Ask what pressure justifies the mechanism, why a simpler design is insufficient, and which new failure would make you reconsider.

> **Sustainability angle**
>
> Retaining raw data, precomputing summaries, and reserving peak capacity consume resources even when they protect a useful goal.
> State that goal and measure the recurring cost.

## Implement the smallest justified response

A target diagram shows that a group can reason about a possible architecture.
It does not yet show that the response works in the selected application, preserves required behavior, or moves the expected limit.
Complete one bounded implementation experiment before finalizing the target design.

### Field note — Thesis Journey Tracker

[Thesis Journey Tracker](/case-studies/thesis-journey-tracker/) serves only two people, so runtime scale was not the problem.
The goal was to deliver the project quickly while keeping it easy to maintain and adjust as the supervision workflow changed.
I deliberately chose a lightweight, server-rendered interface instead of a conventional single-page application.
The [first agent-generated version](https://github.com/bebraw/thesis-journey-tracker/commit/246884b5e84f99f09c63800b76d1ca6942548b29) rendered complete pages, but less than two hours later the agent introduced a narrow [HTML-fragment endpoint for the student panel](https://github.com/bebraw/thesis-journey-tracker/commit/e895c2ace4).
A small browser script replaced that panel without a full refresh and retained ordinary navigation as a fallback.
This provided responsiveness where it mattered without requiring a client-side application architecture for the whole system.

Select implementation A, B, or C and one pressure for which the group has runtime evidence or a credibly projected limit that the available environment can exercise.
Preserve the accepted revision and its workload result, then implement the smallest response that addresses that limit.
Suitable experiments include a measured query index, a bounded cache, an idempotency boundary, admission control, a queue with an explicit pending state, tenant isolation, or another technique justified by the evidence.
Distributed infrastructure is not required.

Keep the workload, fixture, correctness checks, and measurement procedure unchanged where the response is intended to affect them.
After the change:

1. rerun the common acceptance scenarios and inspect for behavior displaced by the response;
2. rerun the selected pressure and report every repetition rather than only the best result;
3. compare latency, throughput, errors, correctness, and the chosen resource-efficiency proxy before and after;
4. exercise one failure or recovery obligation introduced by the response, such as stale data, a duplicate retry, a full queue, a rejected request, or an unavailable worker;
5. state whether the result supported, challenged, or left the original hypothesis unresolved.

An unsuccessful intervention remains useful evidence when the baseline, change, and failure are preserved.
Do not replace a negative result silently with a more elaborate design.
The target architecture can retain the response, revise it, or reject it, but it should distinguish this implemented evidence from its remaining proposals.

## Prepare to be surprised

Design can expand the competence envelope, but finite systems always retain another boundary.
Graceful degradation keeps selected functions useful when capacity is constrained.
**Graceful extensibility** is a complementary idea: when an unanticipated condition exceeds the designed envelope, the sociotechnical system can adapt its capabilities and recover :citep[woods2018graceful].

That ability requires optionality prepared before the incident:

- dynamic configuration and feature flags that expose understood controls;
- fast, practiced paths to restart, scale, shed work, roll back, or fix forward;
- diagnostic access and telemetry that remain useful under pressure;
- people who understand the system and have authority to act;
- exercises that keep rarely used recovery paths discoverable and safe.

More controls are not automatically better.
An undocumented switch or unsafe manual path creates another failure mode.
The goal is to balance work that prevents known failures with work that improves the ability to respond when the design encounters a surprise.

## Project artifact

Connect these three elements in the existing Compare evidence index:

1. **Three-way comparison.** Compare the shared primary pressure across implementations A, B, and C using the same workload and procedure where practical.
   Link the measured results and B's bounded correctness or recovery case from the existing pressure record.
   Further scenarios are optional; distinguish their measurements and projections from the required evidence, and make missing measurements explicit.
2. **Implemented response.** In one selected implementation, preserve the before-and-after revisions, unchanged workload and acceptance checks, measured result, new failure or recovery obligation, and conclusion.
   A proposed improvement does not replace this experiment; an unsuccessful measured response remains useful evidence.
3. **Target design.** Justify the selected responses and explain why simpler alternatives are insufficient.

Across the package:

- connect at least one pressure and proposed response to a documented production account;
- separate what the source reports, your interpretation, and the transfer you propose for the project; do not assume that the source's scale, result, or trade-off carries over;
- apply one formal model to an application decision and one to the development workflow.

Use one trade-off table row for each response in the target design.
Record:

- the pressure and approaching limit;
- the technique, intended benefit, cost, and new failure mode;
- the operational signal and at least one prepared recovery action;
- where complexity moved, such as into clients, data freshness, background operations, routing, migration, or incident response;
- why a simpler alternative was not enough.

If the target design contains asynchronous multi-step work that can perform an external side effect, include one [crash-after-side-effect audit](/appendices/durable-workflows/#audit-the-effect-boundary).
Record:

- the last durable coordination fact and the external effect that may already have occurred;
- the timeout and retry rule;
- the retry-safety or deduplication mechanism, its owner, and any stable key it uses;
- the terminal-state behavior and evidence available to an operator.

If no component at the effect boundary can deduplicate, state that duplicate delivery remains possible.

## Summary

Choose a scaling response from the pressure and first binding limit.
Use a suitable model to bound expectations, implement the smallest justified change, and repeat the workload through the real deployment.
Judge both the improvement and the consistency, recovery, resource, and ownership costs it introduces.
