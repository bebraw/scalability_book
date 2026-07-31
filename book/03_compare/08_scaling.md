# How should systems respond to scaling pressure?

Scaling is the work of changing a system so it can tolerate growth in users, data, traffic, teams, or change.
By this point in the course, students have produced three implementations, inspected their friction, measured their behavior, and seen how reality changes their assumptions.
This chapter applies the same pressures to all three architectures before synthesizing a justified target design.
It develops technical scaling techniques without turning them into a catalog of cloud products.

The central claim could be: scaling is not one move.
It is a sequence of trade-offs made in response to specific pressure.

## Chapter purpose

- Give students a practical vocabulary for scaling web applications.
- Compare how implementations A, B, and C respond to the same scaling pressures.
- Apply formal scalability models to application and development-workflow decisions.
- Show that scaling choices have costs in complexity, consistency, operations, and development speed.
- Prepare the transition from application scaling to development-process fortification.

## Start with the pressure

Before choosing a technique, ask what problem is being solved:

- Are writes too slow?
- Are reads too slow?
- Is the database too large?
- Is one tenant affecting another?
- Is the system failing during traffic spikes?
- Are deployments too risky?
- Are teams blocked by shared ownership?

Development idea: reuse the event tracking system and map each pressure to a possible response, regardless of whether the chosen theme is a conference, shop, workflow, game, or something else.

### Scaling pressure lab

The demonstration below starts from a concrete event-tracking pressure: event writes spike, dashboard reads get slower, and the latest-events query has to stay useful without pretending the system needs every scaling technique at once.

{{ import "site/includes/scaling-pressure-demo.html" }}

The important part is the exported trade-off table.
Students should be able to explain why a chosen technique fits the pressure, what it costs, what failure mode it introduces, and which signal would show whether the design is working.

## Name the saturation boundary

Scaling pressure becomes operationally important when it approaches a limit.
The competence-envelope model introduced in the Challenge part calls the boundary condition **saturation**: the system can no longer absorb the disturbance with its current capabilities :citep[woods2018graceful].
Naming the saturated resource prevents "add more servers" from becoming the default response.

Useful categories include:

| Limit category       | Examples                                                                           | What approaching saturation may look like                                                       |
| -------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Physical resources   | CPU, memory, disk space, storage I/O, network bandwidth                            | Growing wait time, swapping, failed allocations, full disks, or reduced throughput              |
| Virtual resources    | Connection and thread pools, file descriptors, bounded queues, quotas, rate limits | Pool wait, rejected work, `429` responses, queue growth, or quota errors                        |
| Dependency capacity  | Databases, identity providers, third-party APIs, provisioning systems              | Timeouts, blocked callers, correlated downstream errors, or delayed scaling                     |
| Operational capacity | On-call attention, deployment speed, diagnostic access, coordination               | Slow decisions, unsafe workarounds, competing responders, or recovery blocked by normal process |

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
Formal models help students state that limit precisely enough to challenge their own intuition:

- **Little's Law** connects arrival rate, time in the system, and average work in progress :citep[little1961proof].
  It is useful for event ingestion, queues, database connection pools, and review backlogs when the observed system is reasonably stable.
- **Amdahl's Law** bounds the benefit of parallelism when part of the work remains sequential :citep[amdahl1967validity].
  It applies to request paths, batch processing, deployments, and agent workflows.
- **The Universal Scalability Law** extends the parallel-speedup question by accounting for contention and coordination or coherency costs :citep[gunther2008scalability].
  It is useful when measured throughput improves, flattens, and then worsens as concurrency increases.

The project does not require every model.
Students must apply at least one suitable law or formal model to an application-architecture decision and one to the development workflow.
Each application should identify the variables, state the assumptions, show the calculation or reasoning, connect the result to a measured or proposed limit, and explain what the model leaves out.
A formula added after the design decision is not evidence that the formula guided the decision.

### Contention curve lab

Amdahl's Law models a fixed sequential share but does not describe the way shared resources and coordination can become more expensive as concurrency grows.
The Universal Scalability Law models relative capacity as:

`C(N) = N / (1 + α(N - 1) + βN(N - 1))`

Here `α` represents contention or serialization cost and `β` represents coherency or coordination cost.
The curve can rise, flatten, and eventually fall: adding workers may reduce total capacity when coordination grows faster than useful work.

{{ import "site/includes/usl-demo.html" }}

First set both costs to zero and inspect the ideal linear curve.
Then add contention, add coherency cost, and find the first concurrency level after the modeled peak.
The parameters should ultimately be fitted from measured throughput at several concurrency levels; arbitrary sliders illustrate the model's shape but do not predict a real deployment.

## Common scaling techniques

Potential subsections:

- **Vertical scaling**: use a larger machine; simple but limited.
- **Horizontal scaling**: add more instances; requires statelessness or shared state discipline.
- **Load balancing**: distribute traffic and handle unhealthy instances.
- **Caching**: reduce repeated work; introduces freshness and invalidation problems.
- **Database indexing**: improve query performance; affects write cost and storage.
- **Read replicas**: scale reads; introduces replication lag.
- **Queues and background jobs**: absorb bursts and decouple ingestion from processing.
- **Partitioning and sharding**: split data; adds routing, migration, and query complexity.
- **CDNs and edge delivery**: reduce latency for static or cacheable content.
- **Rate limiting and backpressure**: protect the system from overload.
- **Bulkheads and isolation**: prevent one failure or tenant from spreading.
- **Feature flags and staged rollout**: reduce deployment risk.
- **Dynamic configuration and recovery controls**: change limits, shed optional work, disable features, scale a dependency, or redirect traffic without first building new tooling during an incident.

> **Sustainability angle**
>
> Scaling techniques have resource profiles.
> Caches, queues, replicas, CDNs, shards, and multi-region deployments can improve user experience, but each adds infrastructure and operational cost.
> Ask which pressure justifies the extra resource use.

### Orchestration as a control loop

Horizontal scaling is not merely the instruction to "run more servers".
An orchestrator repeatedly compares a declared desired state with the state it observes and takes action to close the gap.
A Deployment can declare a replica count and a pod template; controllers create and remove pods until that state is reached.
A Service then gives clients a stable route while the individual pods behind it change.

The lab below runs [Webernetes](https://github.com/ngrok/webernetes), a partial browser-based port of Kubernetes intended for interactive teaching.
Change the desired replica count, send requests through a service, terminate a pod, and perform a rolling update.
Watch for the distinction between the operator's instruction, the temporary mismatch, and the controller action that restores the declared state.

{{ import "site/includes/orchestration-demo.html" }}

This is a mechanism demonstration, not a capacity benchmark or a production Kubernetes environment.
The browser runs compatible control logic and a simulated network, but it does not execute real container images or model persistent volumes, resource limits, autoscaling, and the full production networking stack.
The useful question is therefore not "how many requests did this cluster handle?" but "which component noticed the mismatch, what action did it take, and which scaling problem remains unsolved?"

Replica orchestration cannot make every component horizontally scalable.
If each application instance depends on one saturated database, holds incompatible local state, or performs the same expensive downstream work, adding pods may simply move or amplify the bottleneck.
The pressure still has to justify the technique.

The same caution applies to autoscaling signals.
A downstream dependency can slow requests until application threads block; if the scaling policy watches only CPU, lower utilization may incorrectly suggest that fewer instances are needed.
The control loop should observe a signal that represents the actual pressure, respect downstream limits, and have a bounded response.

## Scaling the event pipeline

For the project, the most natural scaling story is the event path:

1. Client submits an event.
2. Ingestion API authenticates and validates it.
3. Raw event is durably stored or placed on a queue.
4. Background processing enriches, validates, aggregates, or routes it.
5. Read models support dashboards and queries.
6. Operators observe the pipeline through logs, metrics, traces, and alerts.

Design questions:

- Should event recording wait for all processing to finish?
- How are duplicate events detected?
- How are events partitioned by tenant, project, group, location, or another domain boundary?
- What happens when processors fall behind?
- Which views need real-time accuracy and which can lag?
- How can raw events be replayed if aggregation logic changes?

## Latency and geography

Ideas to develop:

- Latency has physical limits.
- Users, servers, and databases may be far apart.
- The fastest code still waits on network distance and round trips.
- Edge caching helps some workloads but not all writes.
- Multi-region systems introduce consistency, routing, failover, and data residency problems.

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

Important trade-offs to make explicit:

- Simplicity vs capacity.
- Consistency vs availability.
- Real-time accuracy vs eventual correctness.
- Low latency vs operational complexity.
- Shared infrastructure vs tenant isolation.
- Fast feature delivery vs strict contracts.
- Automation vs human control.

> **Sustainability angle**
>
> Sustainability is also a trade-off.
> Keeping raw data forever, precomputing every possible summary, or running capacity for rare peaks can be reasonable in some domains, but the decision should be named and justified.

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

## Exercise ideas

- Students choose two scaling techniques for a justified target design and explain why they did not choose three others.
- Students draw the event pipeline for all three implementations and for the proposed target design.
- Students identify the first metric that would reveal overload.
- Students explain one failure mode introduced by their own scaling design.
- Students name one plausible saturation boundary and demonstrate or describe a prepared recovery action that does not require inventing a new tool during the incident.

## Project artifact

Students should produce a three-way scaling comparison and one justified target design.
The comparison should apply the same pressure set to implementations A, B, and C and distinguish what is observed in running code from what is proposed.
It should include one formal model applied to an application decision and one applied to the development workflow.
Each row in the target design's trade-off table should name a pressure, the limit being approached, the chosen technique, the benefit, the cost, the new failure mode, the operational signal to watch, at least one prepared recovery action, and the reason a simpler alternative was not enough.
