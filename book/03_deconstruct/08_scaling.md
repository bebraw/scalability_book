# How to scale web applications?

Scaling is the work of changing a system so it can tolerate growth in users, data, traffic, teams, or change. By this point in the course, students have built a small system, inspected its friction, measured parts of it, seen how reality changes the assumptions, and used a compact scaling vocabulary during Reconstruct. This chapter should synthesize and deepen the main technical scaling techniques without turning into a catalog of cloud products.

The central claim could be: scaling is not one move. It is a sequence of trade-offs made in response to specific pressure.

## Chapter purpose

- Give students a practical vocabulary for scaling web applications.
- Connect scaling techniques to the Reconstruct project.
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

The important part is the exported trade-off table. Students should be able to explain why a chosen technique fits the pressure, what it costs, what failure mode it introduces, and which signal would show whether the design is working.

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

> **Sustainability angle**
>
> Scaling techniques have resource profiles. Caches, queues, replicas, CDNs, shards, and multi-region deployments can improve user experience, but each adds infrastructure and operational cost. Ask which pressure justifies the extra resource use.

### Orchestration as a control loop

Horizontal scaling is not merely the instruction to "run more servers". An orchestrator repeatedly compares a declared desired state with the state it observes and takes action to close the gap. A Deployment can declare a replica count and a pod template; controllers create and remove pods until that state is reached. A Service then gives clients a stable route while the individual pods behind it change.

The lab below runs [Webernetes](https://github.com/ngrok/webernetes), a partial browser-based port of Kubernetes intended for interactive teaching. Change the desired replica count, send requests through a service, terminate a pod, and perform a rolling update. Watch for the distinction between the operator's instruction, the temporary mismatch, and the controller action that restores the declared state.

{{ import "site/includes/orchestration-demo.html" }}

This is a mechanism demonstration, not a capacity benchmark or a production Kubernetes environment. The browser runs compatible control logic and a simulated network, but it does not execute real container images or model persistent volumes, resource limits, autoscaling, and the full production networking stack. The useful question is therefore not "how many requests did this cluster handle?" but "which component noticed the mismatch, what action did it take, and which scaling problem remains unsolved?"

Replica orchestration cannot make every component horizontally scalable. If each application instance depends on one saturated database, holds incompatible local state, or performs the same expensive downstream work, adding pods may simply move or amplify the bottleneck. The pressure still has to justify the technique.

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

In some project themes, geography may matter very little. In others, a platform serving users or devices in different regions may need to consider latency, data residency, or regional failure. This is a good place to teach restraint: not every project needs multi-region architecture.

### Latency budget lab

The demonstration below treats latency as a budget. Some of the budget is bounded by physics: a signal cannot cross distance instantly, and real networks add routing and protocol overhead. Some of the budget is architectural: every sequential database round trip adds another wait.

{{ import "site/includes/latency-budget-demo.html" }}

The point is not to memorize exact numbers. Real latency depends on providers, routing, congestion, TLS, database load, and query plans. The useful lesson is the shape of the problem: distance creates a lower bound, and repeated sequential database access multiplies that bound.

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
> Sustainability is also a trade-off. Keeping raw data forever, precomputing every possible summary, or running capacity for rare peaks can be reasonable in some domains, but the decision should be named and justified.

## Exercise ideas

- Students choose two scaling techniques for their Reconstruct design and explain why they did not choose three others.
- Students draw the event pipeline before and after reconstruction.
- Students identify the first metric that would reveal overload.
- Students explain one failure mode introduced by their own scaling design.

## Project artifact

Students should revise their Reconstruct design into a scaling trade-off table. Each row should name a pressure, the chosen technique, the benefit, the cost, the new failure mode, the operational signal to watch, and the reason a simpler alternative was not enough.

## Notes for further development

- Add a table mapping pressure, technique, benefit, and cost.
- Include a short warning against premature scaling.
- Connect the end of the chapter to the recap: once architecture grows, scalability becomes a technical, organizational, and development-process concern.
- Obsidian candidate: `Clippings/_Processed/Durable Execution Solutions.md` could support concrete scaling trade-offs around queues, retries, timers, durable state, and workflow visibility. Use it to ask what new operational responsibilities appear when asynchronous processing is introduced.
- Obsidian candidate: `Clippings/_Processed/Correlation charts Connect the dots between site speed and business success.md` could support a "measure what matters" reminder: scaling work should name the user or operational outcome it improves, not only the infrastructure metric it moves.
