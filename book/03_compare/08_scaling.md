# How should web applications respond to scaling pressure?

Scaling is the work of changing a system so it can tolerate growth in users, data, traffic, teams, or change.
By this point in the course, students have produced three implementations, inspected their friction, measured their behavior, and seen how reality changes their assumptions.
This chapter applies the same pressures to all three architectures before synthesizing a justified target design.
It develops technical scaling techniques without turning them into a catalog of cloud products.

The central claim is that scaling is not one move.
It is a sequence of trade-offs made in response to specific pressure.

## Chapter purpose

- Give students a practical vocabulary for scaling web applications.
- Analyze documented production cases without assuming their results transfer unchanged.
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
Formal models help students state that limit precisely enough to challenge their own intuition.
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
Students must apply at least one suitable law or formal model to an application-architecture decision and one to the development workflow.
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
Treat their numbers as evidence about those systems, not as performance promises for another application.

Read each case through the same questions:

1. What did users experience?
2. Which resource or boundary approached saturation?
3. What evidence exposed that boundary?
4. What did the organization change?
5. What improved, and what new trade-off appeared?
6. Which part transfers to the event-tracking project, and which part does not?

:ref[table:documented-scaling-cases]{text="The table below"} previews the evidence and the transfer question in each case.

| Production case                       | Observed pressure                                                    | Intervention described by the source                                     | Reported evidence                                                                 | Transfer question for the tracker                                     |
| ------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| GitHub Issues navigation              | Repeated page visits still paid network and rendering costs          | Persistent client cache, stale-while-revalidate, controlled preheating   | More React navigations became instant, with measured cache divergence             | Which repeated read can tolerate controlled staleness?                |
| Spotify podcast-video ingestion       | Transcoding capacity saturated and queued publication work aged      | More capacity, work prioritization, earlier alerts, planned backpressure | Publication moved from minutes to hours during the incident                       | What does acceptance mean, and how will users see pending work?       |
| Shopify flash-sale request processing | Slow requests and browser refreshes consumed application-worker time | Detect and discard requests whose clients had already disconnected       | Order-of-magnitude spikes, full request queues, and `499` responses exposed waste | Which work should be refused, cancelled, or shed before adding hosts? |

::caption[Documented production pressures and the questions they raise for the project.]
::label[table:documented-scaling-cases]

> **Sustainability angle**
>
> Scaling techniques have resource profiles.
> Caches, queues, replicas, CDNs, shards, and multi-region deployments can improve user experience, but each adds infrastructure and operational cost.
> Ask which pressure justifies the extra resource use.

### Case 1: GitHub Issues made repeated navigation locally fast

GitHub's Issues team found that users repeatedly reopened the same issues, while common navigations still paid for data fetching and rendering.
The team chose a user-facing measure: when the page's highest-priority content appeared.
It classified a navigation below 200 milliseconds as instant rather than relying only on backend latency or a tail percentile.

The team added a persistent IndexedDB cache and used stale-while-revalidate behavior: render locally available issue data first, request current data in the background, and reconcile the interface when the representations differ.
In its [production account of the work](https://github.blog/engineering/architecture-optimization/from-latency-to-instant-modernizing-github-issues-navigation-performance/), GitHub reports that, after the initial broad rollout, approximately 22% of React navigations were instant compared with 4% before launch.
The cache-hit ratio was about 33%, and the measured divergence between server and cached data was about 4.7%.

Those numbers make both the benefit and the accepted inconsistency visible.
The same account also describes rejecting eager prefetching because high-fan-out pages could create N+1-style requests and spend capacity on pages a user might never open.
GitHub instead rate-limited lower-priority preheating and stopped when usable data was already cached.
The lesson is not that every data-heavy page needs IndexedDB.
It is that repeated access, perceived latency, origin load, hit rate, and divergence can be measured together before a cache policy is accepted.

#### Transfer the case to the tracker

The event tracker has a different workload and cannot inherit GitHub's result.
Begin by observing whether people actually revisit the same feed or work item, which navigation path feels slow, and whether an older representation remains safe while revalidation runs.
If the activity feed slows as history grows, the same request may examine more rows, sort more data, transfer a larger response, or ask the browser to maintain more interface elements.
"The feed is slow" still does not identify one boundary.
Measure the database query, response size, network time, server serialization, browser rendering, and repeated-access ratio separately before selecting a response.

#### Bound the query and representation

The required feed filters by workspace and event type and uses a documented deterministic order.
A representative latest-activity query might be:

```sql
SELECT id, event_type, workspace_id, work_item_id, actor, occurred_at
FROM activity_events
WHERE workspace_id = ?
ORDER BY occurred_at DESC, id DESC
LIMIT ?;
```

The identifier resolves equal timestamps into one stable order.
The query also places a deliberate bound on returned rows.
Without that bound, a faster database can still produce an oversized HTTP response and an expensive browser view.

Pagination turns the bound into a navigable contract.
Offset pagination is easy to expose, but a large offset may still require the database to compute and skip the earlier rows.
It can also show duplicates or omissions when new events arrive between requests.
Cursor or keyset pagination can continue after the last `(occurred_at, id)` pair instead.
That avoids walking through every earlier page, although the cursor format, ordering fields, direction, filters, and behavior when rows change become API commitments.
In either approach, the order must be unique; the [PostgreSQL `LIMIT` and `OFFSET` documentation](https://www.postgresql.org/docs/current/queries-limit.html) makes both the ordering requirement and large-offset cost explicit.

#### Index the access path that was measured

An index should match a real filtering and ordering path rather than a field that merely looks important.
For the query above, a database that supports ordered multicolumn indexes may benefit from an index beginning with `workspace_id` and continuing with `occurred_at` and `id` in the requested order.
A feed that also filters heavily by event type may justify a different composite index.
Adding both without evidence increases storage and makes every insert maintain more structures.

Inspect the actual plan and representative data before and after the change.
For PostgreSQL, `EXPLAIN` shows the selected plan and `EXPLAIN ANALYZE` executes the statement and reports observed work; the [database documentation](https://www.postgresql.org/docs/current/indexes-examine.html) recommends checking index use against the real query workload rather than assuming an index will be selected.
The equivalent tool and terminology differ by database, but the questions remain the same:

- How many rows were examined and returned?
- Was a sort required?
- Which index or scan was selected?
- Did storage reads, execution time, and tail latency improve?
- What additional time and storage did writes and index maintenance consume?

#### Separate current state from historical summaries

The project summary can be calculated from the event history while that query remains cheap.
When repeated aggregation becomes the binding read cost, maintain a derived summary or read model keyed by workspace.
The write path or a background consumer can update counts that the dashboard reads directly.

This changes the correctness contract.
If the summary is updated in the same transaction as the authoritative state, writes perform more work and contend on the summary rows.
If it is updated asynchronously, the dashboard can lag and needs a rebuild or replay procedure.
The interface should reveal when the value was computed if that delay matters to a user.

#### Choose the cache boundary after the path is understood

GitHub cached issue-query payloads in the browser because repeated navigation and network-bound rendering were the measured opportunity.
The tracker might instead justify an in-memory browser cache, an HTTP cache, or a server-side cache depending on where repeated work occurs and who can safely share the representation.
Each location creates a different freshness, invalidation, privacy, and failure boundary.

A response cache helps when many requests can safely reuse the same representation.
It is less useful when every response is private, highly personalized, or invalidated by almost every event.
Reuse therefore needs a cache key, freshness duration, invalidation or validation policy, and evidence of origin work avoided.
The [cache-control material in the architecture chapter](/chapters/architecture/#cache-control-is-application-policy) develops the HTTP boundary; the scaling question is whether repetition at that boundary is the measured pressure.

A read replica can move suitable query work away from the primary after efficient queries still saturate it.
It does not repair an unbounded feed or a missing index.
Asynchronous replication also creates a read-after-write decision: a user may record an event through the primary and briefly fail to see it through a replica.
PostgreSQL's [hot-standby documentation](https://www.postgresql.org/docs/current/hot-standby.html) describes this delay and the possibility that primary and standby queries temporarily return different results.
Route consistency-sensitive reads to an authoritative path or make tolerated staleness explicit.

Partitioning or sharding is a later response when one storage authority cannot meet the measured capacity, isolation, locality, or retention need.
The tracker has a possible partition key in `workspace_id`, but choosing it makes cross-workspace queries, workspace migration, rebalancing, uniqueness, backup, and recovery more difficult.
Partition only after naming the operation that becomes cheaper and the operation that becomes harder.

#### Escalation evidence: GitHub partitioned its central database

GitHub's earlier database history shows how much evidence may be needed before that later response is justified.
Its primary production account describes a main MySQL cluster that stored data for users, repositories, issues, and pull requests.
GitHub had already added read replicas, reduced primary connections through a proxy, and repeatedly moved to larger machines, but the cluster remained a shared capacity and failure boundary.

The [database-partitioning account](https://github.blog/engineering/infrastructure/partitioning-githubs-relational-databases-scale/) describes creating schema domains and query and transaction linters before physically separating data.
The migration moved 130 busy tables, while tooling exposed cross-domain queries and transactions whose earlier consistency assumptions would no longer hold.
GitHub reports that the tables' combined average query rate grew from about 950,000 queries per second in 2019 to 1.2 million in 2021 while average load per database host was halved.

This result does not imply that partitioning alone caused every reliability improvement or that the tracker's `workspace_id` is therefore a good shard key.
It demonstrates a narrower point: partitioning followed an observed central limit and required application boundaries, migration machinery, and explicit treatment of transactions before the physical move.

For the tracker transfer, preserve the repeated-access distribution, user-facing latency measure, hit rate, origin work avoided, and any observed divergence when testing a cache.
If database work is the boundary, preserve the before-and-after query plan, representative data size, returned rows and bytes, latency distribution, and write impact instead.
That evidence can justify one index, query bound, or cache policy without pretending that every deployment needs a replica and shard.

### Case 2: Spotify's ingestion backlog delayed publication

Publishing a video podcast to Spotify starts a processing pipeline that includes transcoding and content analysis.
On June 24, 2026, the video-transcoding infrastructure reached maximum capacity.
Spotify's [incident report](https://engineering.atspotify.com/2026/7/content-ingestion-and-podcast-video-incident-report) states that episodes normally published within minutes were delayed for hours as queued work accumulated.
Some creators uploaded their episodes again because the product had not confirmed that the first upload was received and queued.
That understandable user action added more work to the saturated pipeline.

The report attributes the incident to interacting conditions rather than one broken component: insufficient burst headroom, a batch job competing with new publication, a quality improvement that had increased the processing cost of each item, and a scheduler bug that left about 10% of available compute unused.
Spotify stopped the batch job, repaired the scheduler, and added processing capacity until the backlog cleared.
It reports subsequently increasing capacity by approximately 67% and planning earlier capacity alerts, priority for new publication over background work, stronger rate limiting and backpressure, and better status communication to creators.

This incident gives the queue a user-visible meaning.
Admission was not completion, backlog age mattered more than the mere existence of queued items, and missing status encouraged demand amplification.
It also shows why nominal worker capacity is not one stable number: the workload mix, cost per item, scheduling efficiency, and headroom for recovery all change useful throughput.

#### Transfer the case to the tracker

The tracker does not transcode media, and its background work is likely much cheaper.
The transferable question is whether a burst can make accepted work wait longer than the product promise and whether the interface distinguishes received, pending, succeeded, and failed work.
The event path has two different rates: the rate at which the application accepts work and the rate at which the complete pipeline finishes it.
A queue can separate those rates temporarily, but it cannot make the completion capacity unlimited.
If work arrives faster than consumers finish it for long enough, waiting grows until a storage, age, cost, or user-expectation limit is reached.

For the project, the path can be decomposed as follows:

1. Client submits a command or event.
2. Ingestion authenticates the caller, validates input, and enforces the lifecycle rule.
3. The authoritative state change, activity record, and reusable idempotency result are committed atomically where the operation requires them.
4. Optional enrichment, notification, aggregation, export, or routing work enters a durable queue.
5. Background consumers process that work and update derived views.
6. Operators observe request acceptance, backlog, completion, failure, and recovery.

#### Keep the synchronous correctness boundary small

Moving work to a queue begins by deciding what success means.
For a work-item transition, the UI may require confirmation that the authoritative state and activity event were committed together.
Authentication, authorization, transition validation, and that atomic write therefore remain on the synchronous path.
Email, analytics, exports, and rebuildable summaries can often finish later.

Another API may accept a command without completing its domain effect immediately.
It can return an operation identifier and expose pending, succeeded, and failed states; in HTTP, `202 Accepted` is one possible response for that contract.
The status must describe reality rather than presenting queue admission as completed business work.

Retries make the acceptance boundary part of correctness.
Use a stable application idempotency key for one intended mutation and store the key, mutation, and reusable result atomically at the authority that decides the effect.
A transport request ID or message ID is not automatically the same business identity.

#### Bound waiting and push overload back to callers

A durable queue absorbs a finite burst when consumers can catch up afterward.
Declare its maximum useful depth, storage or retention bound, and oldest acceptable work age.
Queue depth alone can mislead because ten slow items and ten fast items create different recovery times.
Track arrivals, successful completions, retries, terminal failures, oldest-item age, and consumer capacity together.

Backpressure makes overload visible before hidden waiting exhausts the system.
At the HTTP boundary, this may mean limiting concurrent ingestion, enforcing a per-workspace or per-actor rate, returning `429 Too Many Requests` with a documented retry policy, or temporarily shedding an optional operation.
Clients need bounded retries with backoff and a stable idempotency key; immediate unbounded retries turn rejection into more load.

Tenant-aware admission and separate worker pools can act as bulkheads when one workspace would otherwise consume every connection or queue slot.
Isolation protects other tenants but reserves or fragments capacity, so measure both fairness and utilization.

[NATS](https://docs.nats.io/concepts/jetstream) makes one version of the communication trade-off concrete: Core NATS provides ephemeral publish-subscribe communication, while JetStream adds stored, replayable streams and consumer state.
Selecting durable messaging introduces retention, acknowledgment, redelivery, consumer progress, and recovery decisions that an ephemeral notification path does not have.

#### Durable coordination does not make effects exactly-once

A queue can preserve pending work, while an explicit state machine or replay-based workflow can preserve progress across process failure.
Neither mechanism guarantees exactly-once external effects.
If a receiver accepts a webhook and the worker crashes before recording completion, recovery may repeat the call.

Use a stable business idempotency key across attempts and require the effect owner to record that key atomically with the effect.
When no component at the effect boundary can deduplicate, duplicate delivery remains possible and compensation or manual repair may be the honest recovery path.
Bound retry time and cost, classify permanent failures, expose terminal states, and remember that cancellation may not stop or undo an in-flight effect.

[Appendix F: Durable workflows and retry-safe effects](/appendices/durable-workflows/) compares explicit and replay-based coordination, develops the crash-after-effect boundary, and contains the durable retry lab.

For this case, record accepted and completed event rates, request latency, queue depth and oldest age, retry and duplicate counts, consumer utilization, terminal failures, and recovery time after the burst ends.
Then state which work became asynchronous and what the user observes while it is incomplete.

### Case 3: Shopify discarded requests abandoned during flash sales

Shopify reported that customer flash sales could produce traffic spikes an order of magnitude above its typical rate.
As application servers slowed, shoppers refreshed their browsers.
The refresh closed the original connection and submitted a new request, but the Rails application could discover the disconnection only after a Unicorn worker had rendered the abandoned page.
Workers could therefore spend scarce capacity producing responses that nobody would receive.
Longer response times encouraged more refreshes, and the feedback loop further reduced availability.

The [Shopify engineering account](https://shopify.engineering/17489012-what-does-your-webserver-do-when-a-user-hits-refresh) identifies concrete evidence at the web boundary.
Pending connections filled the socket backlog between Nginx and Unicorn, a full backlog caused new requests to receive `502` responses, and Nginx recorded `499` when a client disconnected before the application returned a result.
Shopify and the Unicorn maintainer changed the server to test the connection before invoking the application and discard a closed connection with little work.

The account documents the mechanism and the patch but does not publish a controlled before-and-after capacity result.
It therefore supports the claim that abandoned work consumed application capacity, not a numeric claim about how much the patch would improve another server stack.
It is also deliberately a case about removing waste before adding infrastructure: a load balancer or another host could distribute the abandoned work without removing the feedback loop.

#### Transfer the case to the tracker

Modern runtimes and proxies expose different cancellation behavior, so the tracker should not copy the Unicorn patch.
Instead, trace what happens when a browser navigates away, retries a mutation, closes a streaming response, or times out while the server continues working.
Then distinguish necessary completion from work that can be cancelled, rejected, coalesced, or made idempotent.
Useful evidence includes accepted and active request counts, queue wait, disconnects, timeout status, work completed after cancellation, and database activity caused by those requests.

Once avoidable work has been addressed, a larger instance is often the smallest safe response to a measured CPU, memory, or local I/O limit.
Vertical scaling preserves the application shape and may buy time for investigation, although it has a capacity ceiling, can increase failure impact, and does not repair inefficient work.
Record which resource changed, the cost, and whether useful throughput or latency improved before treating the larger machine as the solution.

Horizontal scaling becomes appropriate when several application instances can perform the same request work independently.
That requires more than starting extra processes:

- Request interpretation cannot depend on hidden memory owned by one instance.
- Sessions, uploads, durable jobs, locks, and mutable files need an explicit shared or partitioned authority.
- Deployments with two versions active at once need compatible APIs, schemas, and message formats.
- Per-instance connection pools, caches, and background workers multiply their demand on shared dependencies.
- A stable routing layer must select an instance that is ready to accept new work.

A load balancer distributes eligible traffic; it does not create database capacity or make instances interchangeable.
Measure the distribution of requests, errors, and latency per instance and at the external endpoint.
An even request count can still produce uneven work when some requests are more expensive or long-lived.

#### Health and shutdown are routing contracts

A process being alive is different from its ability to accept a new request.
A liveness check asks whether restarting the process may help.
A readiness check asks whether the routing layer should send it new work.
Making liveness fail whenever a shared database is briefly slow can restart every otherwise healthy instance and amplify the incident.

During deployment or scale-down, an instance should stop receiving new work and receive a bounded opportunity to finish or hand off in-flight work before termination.
The [Kubernetes probe documentation](https://kubernetes.io/docs/concepts/workloads/pods/probes/) distinguishes liveness, readiness, and startup checks, while its [termination-flow documentation](https://kubernetes.io/docs/tutorials/services/pods-and-endpoint-termination-flow/) shows how terminating endpoints become unavailable for ordinary routing.
Other platforms expose different mechanisms, but the application obligations remain: declare readiness honestly, stop admission, drain or cancel safely, and make interrupted work recoverable.

#### Orchestration is a control loop

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
The [Horizontal Pod Autoscaler documentation](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/) shows that a controller can use resource or custom metrics; selecting the metric and safe minimum, maximum, and rate of change remains an application decision.

Scaling the application tier stops helping when another boundary becomes saturated.
Ten instances with ten database connections each can turn one ten-connection workload into one hundred competing connections.
An overloaded identity provider, database, or third-party API may require a concurrency limit, cache, request coalescing, admission control, or isolation rather than more callers.
Partitioning by workspace or tenant can contain a noisy neighbor, but it adds routing and rebalancing obligations and may reduce shared capacity efficiency.

For this case, compare one and several instances under the same workload.
Record per-instance and end-to-end throughput, latency and errors, resource use, connection counts, readiness transitions, rollout behavior, and the first shared dependency that stops improving.
The result should say whether horizontal scaling increased useful capacity, improved availability during change, or merely moved the bottleneck.

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

- Students reconstruct one documented case as a chain of user experience, saturation boundary, evidence, intervention, reported outcome, limitation, and transferable principle.
- Students identify which statements in that case are source-reported facts, which are interpretations, and which are proposals for the tracker.
- Following the GitHub case, students measure repeated access and one user-facing latency distribution before proposing a cache; if the measured pressure is instead database work, they generate representative history, inspect the query plan, and test one query bound or index.
- Following the Spotify case, students mark the synchronous correctness boundary, identify deferrable work, and define the acceptance status, backlog-age, retry, terminal-failure, and recovery signals a queue would require.
- Following the Shopify case, students identify work that continues after a client disconnects or times out, then identify the local state and first shared dependency that additional application instances would stress.
- Students choose one of these transfers, preserve a baseline, apply the smallest justified response, and compare evidence before and after.
- Students choose two scaling techniques for a target design and explain why they did not choose three others.
- Students draw the event pipeline for all three implementations and for the proposed target design.
- Students identify the first metric that would reveal overload.
- Students explain one failure mode introduced by their own scaling design.
- Students name one plausible saturation boundary and demonstrate or describe a prepared recovery action that does not require inventing a new tool during the incident.
- Students use the waterbed lens to identify where a selected scaling technique displaced complexity.

## Project artifact

Students should produce a three-way scaling comparison and one justified target design.
The comparison should apply the same pressure set to implementations A, B, and C and distinguish what is observed in running code from what is proposed.
For at least one pressure, connect the proposed response to a documented production account.
Separate what the source directly reports from the student's interpretation and from the transfer proposed for the project; do not assume that the source's scale, result, or accepted trade-off carries over.
It should include one formal model applied to an application decision and one applied to the development workflow.
Each row in the target design's trade-off table should name a pressure, the limit being approached, the chosen technique, the benefit, the cost, the new failure mode, the operational signal to watch, at least one prepared recovery action, and the reason a simpler alternative was not enough.
It should also state where the technique displaced complexity, such as into clients, data freshness, background operations, routing, migration, or incident response.
If the target design contains asynchronous multi-step work that can perform an external side effect, include one crash-after-side-effect audit.
Record the last durable coordination fact, the external effect that may already have occurred, the timeout and retry rule, the retry-safety or deduplication mechanism and its owner, any stable key it uses, the terminal-state behavior, and the evidence available to an operator.
If no component at the effect boundary can deduplicate, state that duplicate delivery remains possible.

## Summary

Scaling begins with a pressure and an approaching limit, not with a preferred technique.
Formal models can expose bounds and inconsistencies, while measurements show which boundary the running system is actually approaching.
The production cases make those relationships concrete: GitHub measured repeated navigation and accepted controlled cache staleness, Spotify connected queue age to delayed publication and missing user feedback, and Shopify removed abandoned request work that amplified flash-sale overload.
None of those responses transfers automatically; each begins a question that the project must answer with its own workload and evidence.
For growing reads, bound and inspect the access path before adding caches, replicas, or partitions.
For bursty writes, preserve the synchronous correctness boundary and make waiting, rejection, retry, and recovery explicit.
For application-tier saturation, remove avoidable work, make instances interchangeable, and inspect shared dependencies before expecting load balancing or autoscaling to create capacity.
Caching, queues, replicas, partitioning, rate limits, background work, and isolation create capacity or resilience by accepting new costs, failure modes, and operational obligations.
Latency, geography, consistency, sustainability, and human coordination therefore belong in the same trade-off analysis as throughput.
A credible target design explains why each mechanism is needed, where it moves complexity, which signal reveals trouble, and how the system can degrade, recover, or adapt when its assumptions fail.
