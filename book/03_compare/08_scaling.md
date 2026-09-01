# How should web applications respond to scaling pressure?

Scaling is the work of changing a system so it can tolerate growth in users, data, traffic, teams, or change.

The central claim is that scaling is not one move.
It is a sequence of trade-offs made in response to specific pressure.

## Start with the pressure

Before choosing a technique, ask what problem is being solved:

- Are writes too slow?
- Are reads too slow?
- Is the database too large?
- Is one tenant affecting another?
- Is the system failing during traffic spikes?
- Are deployments too risky?
- Are teams blocked by shared ownership?

### Scaling pressure lab

The demonstration below starts from a concrete event-tracking pressure: event writes spike, dashboard reads get slower, and the latest-events query has to stay useful without pretending the system needs every scaling technique at once.

{{ import "site/includes/scaling-pressure-demo.html" }}

The important part is the exported trade-off table.
Use it to explain why a chosen technique fits the pressure, what it costs, what failure mode it introduces, and which signal would show whether the design is working.

## Name the saturation boundary

Scaling pressure becomes operationally important when it approaches a limit.
The competence-envelope model introduced in the Challenge part calls the boundary condition **saturation**: the system can no longer absorb the disturbance with its current capabilities :citep[woods2018graceful].
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

Saturation also creates feedback loops.
Retries can amplify load, synchronous fan-out can overload an internal service, and blocked threads can make a CPU-based autoscaler misread demand.
A resource leak may separate the causal change from the eventual failure by hours or months.
These dynamics explain why a locally sensible mechanism can worsen a system-wide incident and why the pressure map must identify both the first limit and what happens after it is reached :citep[hochstein2026saturation].

### Saturation boundary lab

The model below compares one effective event rate with four declared stage limits.
Increase demand until a boundary becomes binding, expand that limit, and observe which constraint becomes visible next.
Then enable backpressure and compare hidden backlog growth with explicit rejection.

{{ import "site/includes/saturation-boundary-demo.html" }}

Treat the rates as a reasoning aid rather than measured capacity.
The lesson is structural: removing one bottleneck changes the system's limiting factor, while retries can consume headroom before useful demand changes.

## Use a formal model before choosing a technique

A scaling technique should respond to an identified limit.
Formal models help you state that limit precisely enough to challenge your own intuition.
:ref[table:scalability-laws]{text="The table below"} states four useful laws explicitly and separates what each can support from what it cannot establish.

| Law                                                      | Exact relationship                                                                                                                | Main assumptions                                                                                 | Useful when                                                                                         | Cannot establish                                                            |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Little's Law :citep[little1961proof]                     | `L = λW`, where `L` is average work in progress, `λ` is average throughput or arrival rate, and `W` is average time in the system | Stable long-run averages, one consistent system boundary, and conserved work                     | Relating queue or review backlog, throughput, and elapsed time                                      | The cause of delay, tail latency, or stability from one snapshot            |
| Amdahl's Law :citep[amdahl1967validity]                  | `S(N) = 1 / ((1 - p) + p/N)`, where `p` is the parallelizable fraction and `N` is the parallel capacity                           | Fixed workload and fractions, with no added parallel overhead in the bound                       | Bounding speedup for request paths, batch work, deployments, or agent workflows                     | Contention, coordination cost, load growth, or the actual parallel fraction |
| Lusser's Law :citep[tait1995lusser]                      | `R_system = ∏ R_i` for independent components that must all succeed in a series system                                            | Every named step is critical and step failures are independent                                   | Checking whether a request, deployment, or agent workflow can meet an end-to-end reliability target | Correlated failures, recovery behavior, or omitted dependency paths         |
| Universal Scalability Law :citep[gunther2008scalability] | `C(N) = N / (1 + α(N - 1) + βN(N - 1))`, where `α` models contention and `β` coordination or coherency cost                       | One workload and configuration, with parameters fitted to representative throughput measurements | Describing capacity that rises, flattens, and then falls as concurrency grows                       | The causal mechanism or safe extrapolation beyond the measured range        |

::caption[Formal scalability models, their assumptions, and suitable application boundaries.]
::label[table:scalability-laws]

The project does not require every model.
Apply at least one suitable law or formal model to an application-architecture decision and one to the development workflow.
Each application should identify the variables, state the assumptions, show the calculation or reasoning, connect the result to a measured or proposed limit, and explain what the model leaves out.
A formula added after the design decision is not evidence that the formula guided the decision.

### Contention beyond Amdahl's bound

Amdahl's Law models a fixed sequential share but does not describe shared resources and coordination becoming more expensive as concurrency grows.
The Universal Scalability Law adds contention and coherency terms, allowing modeled capacity to rise, flatten, and eventually fall.
Its parameters should be fitted from representative throughput measurements rather than selected by intuition.

[Appendix E](/appendices/scalability-models/#contention-curve-lab) develops the model, provides the interactive contention curve, and examines a production case in which limiting admitted concurrency protected useful throughput.

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
Change the desired replica count, send requests through a service, terminate a pod, and perform a rolling update.
Watch for the distinction between the operator's instruction, the temporary mismatch, and the controller action that restores the declared state.

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
Moving or replicating that authority introduces routing, failover, consistency, conflict, and residency decisions.
Measure which bytes and round trips dominate before treating multi-region deployment as the inevitable final stage of scaling.

### Partitions force an operational choice

The CAP result is narrower than a general slogan about balancing consistency and availability.
For a distributed read-write object in an asynchronous network, a network partition can prevent a design from guaranteeing both atomic consistency and an available response from every non-failing node :citep[gilbert2002brewer].
Here **atomic consistency** means operations appear in one current order, while **availability** means every request to a non-failing node eventually receives a non-error response.
The partition is the condition that makes those guarantees collide; it is not a feature that an application can disable after communication has already failed.

A system that requires a majority quorum may preserve one history by rejecting or delaying a request that reaches an isolated minority.
A system that accepts writes on both sides may keep responding, but the replicas can diverge and later need domain-specific reconciliation.
Neither label chooses the right policy on its own.
The decision depends on which operations may be stale, rejected, delayed, merged, compensated, or repaired without violating the domain.

#### CAP partition lab

Split one region from a two-region majority and apply the same two work-item transitions under both policies.
Inspect the replies before healing the network: reconciliation can change stored state, but it cannot retract a success that a user already observed.

{{ import "site/includes/cap-partition-lab.html" }}

The lab models one write invariant and a fixed topology.
Real systems need explicit definitions for reads as well as writes, failure detection and timeouts, quorum membership, leases, conflict resolution, and the consistency guarantee exposed to clients.

In some project themes, geography may matter very little.
In others, a platform serving users or devices in different regions may need to consider latency, data residency, or regional failure.
This is a good place to teach restraint: not every project needs multi-region architecture.

### Latency budget lab

The demonstration below treats latency as a budget.
Some of the budget is bounded by physics: a signal cannot cross distance instantly, and real networks add routing and protocol overhead.
Some of the budget is architectural: every sequential database round trip adds another wait.

{{ import "site/includes/latency-budget-demo.html" }}

The point is not to memorize exact numbers.
Real latency depends on providers, routing, congestion, TLS, database load, and query plans.
The useful lesson is the shape of the problem: distance creates a lower bound, and repeated sequential database access multiplies that bound.

## Trade-offs

> **Simplicity makes deficiencies visible**
>
> “I conclude that there are two ways of constructing a software design: One way is to make it so simple that there are obviously no deficiencies and the other way is to make it so complicated that there are no obvious deficiencies.
> The first method is far more difficult.” :citep[hoare1981emperor]{locator="p. 81"}
>
> Hoare was writing about overambitious programming-language design, not distributed systems.
> The contrast is about inspectability, not proof that a simple design is defect-free.
> Applied to scaling, it becomes a review test: **what pressure justifies each added mechanism, what new failure mode does it introduce, and why is the simpler design insufficient?**

Important trade-offs to make explicit:

- Simplicity vs capacity.
- Consistency vs availability.
- Real-time accuracy vs eventual correctness.
- Low latency vs operational complexity.
- Shared infrastructure vs tenant isolation.
- Fast feature delivery vs strict contracts.
- Automation vs human control.

> **The waterbed effect**
>
> The waterbed theory of complexity uses a physical metaphor: pushing complexity down in one place may make it rise somewhere else rather than remove it from the system :citep[randal2003perl6].
> In a scaling design, caching moves repeated computation into invalidation and freshness decisions; queues move request latency into backlog, retries, idempotency, and delayed correctness; and partitioning moves shared-resource pressure into routing, migration, and cross-partition queries.
> This is not a formal law that every simplification must preserve a fixed quantity of complexity.
> It is a review question that complements the distinction between essential and accidental difficulty :citep[brooks1987silver]: **what became simpler, and where did the displaced complexity reappear?**

> **Sustainability angle**
>
> Sustainability is also a trade-off.
> Keeping raw data forever, precomputing every possible summary, or running capacity for rare peaks can be reasonable in some domains, but the decision should be named and justified.

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

Produce three connected deliverables:

1. **Three-way comparison.** Apply the same pressure set to implementations A, B, and C. Mark each result as observed in running code or proposed.
2. **Implemented response.** Preserve the before-and-after revisions, unchanged workload and acceptance checks, observed result, new failure or recovery obligation, and conclusion.
3. **Target design.** Justify the selected responses and explain why simpler alternatives are insufficient.

Across the package:

- connect at least one pressure and proposed response to a documented production account;
- separate what the source reports, your interpretation, and the transfer you propose for the project; do not assume that the source's scale, result, or trade-off carries over;
- apply one formal model to an application decision and one to the development workflow.

Use one trade-off table row for each response in the target design. Record:

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

Scaling begins with a pressure and an approaching limit, not with a preferred technique.
Formal models can expose bounds and inconsistencies, while measurements show which boundary the running system is actually approaching.
The linked production cases make those relationships concrete through controlled cache staleness, queued publication work, and the removal of abandoned requests.
None of those responses transfers automatically; each begins a question that the project must answer with its own workload and evidence.

Orchestration can maintain declared application capacity, but it cannot make a saturated dependency or incompatible local state scale horizontally.
Caching, queues, replicas, partitioning, rate limits, background work, and isolation can create capacity or resilience only by accepting new costs, failure modes, and operational obligations.

Latency, geography, consistency, sustainability, and human coordination therefore belong in the same trade-off analysis as throughput.
A credible target design explains why each mechanism is needed, where it moves complexity, which signal reveals trouble, and how the system can degrade, recover, or adapt when its assumptions fail.
