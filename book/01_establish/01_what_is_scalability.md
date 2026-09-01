# What does scalability mean for web development?

A web application may cope with more requests while becoming harder to modify, accept more events while making old events too slow to query, or let more agents produce code while overwhelming review and integration.
All of these are examples of how scalability can be a challenging topic.
In this book, **scalability** means a system's ability to continue meeting a stated goal as a named pressure grows or changes.
The goal, pressure, system boundary, and evidence are all part of the claim.
Without them, scalability becomes a vague synonym for “large” or “well engineered.”

This framing is especially useful for the web because one user outcome can cross a browser, a network, an application boundary, persistent data, caches, external services, and operational tooling.
The system also has to keep changing as browsers, consumers, requirements, dependencies, developers, and development agents evolve independently.
Runtime scale and development scale are therefore related without being interchangeable.

The central claim of this chapter is that scalability is a relationship between **pressure** and **maintained behavior**.
Architecture and infrastructure are possible responses to that relationship; they are not themselves the things that grow.

## Begin with the goal that must continue to hold

Consider the event tracker at the center of the course project.
At its smallest useful scale, a consumer records an event, the application validates and authorizes the request, accepted state becomes durable, and a later activity view exposes the result.
A baseline should state which parts of that behavior matter rather than merely report that the application runs.

Different goals produce different scalability claims:

- A successful submission should still create one accepted event when many consumers submit concurrently.
- Recent activity should remain useful as retained history grows.
- A bounded feature change should remain understandable and reviewable as more people or agents contribute.
- An HTTP or data contract should remain evolvable as clients and requirements change independently.

Each claim can be expressed through the same frame:

> As **pressure P** changes within **range or scenario R**, the system within **boundary B** continues to meet **goal G**, as shown by **evidence E**, under **constraints C**.

The frame prevents one successful observation from becoming a universal promise.
A browser measurement says little about database recovery; one load level does not prove behavior at another; and a fast generated change does not prove that another contributor can understand or reverse it.
The [Benchmarking chapter](/chapters/benchmarking/) develops how to produce bounded evidence for these claims.

## Four pressures organize the course

Many taxonomies of scalability are possible.
This book uses four pressures that can be applied consistently to the event tracker and to its three independent implementations: demand, data, contributors, and change.

| Pressure     | What grows or changes                                                                   | Goal that may need to hold                                             | Early signals in a web project                                                     |
| ------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Demand       | Requests, concurrent actions, connected clients, traffic bursts, or geographic distance | Useful responses, accepted writes, latency, fairness, and correctness  | Tail latency, error rate, saturation, queue depth, browser responsiveness          |
| Data         | Stored events, tenants, relationships, event variety, or retention time                 | Durable writes, useful queries, integrity, recovery, and bounded cost  | Storage growth, write latency, query plans, replica lag, recovery time             |
| Contributors | Developers, teams, agents, parallel tasks, or handoffs                                  | Understandable ownership, reviewable changes, and reliable integration | Lead time, review queues, merge conflicts, rework, failed integrations             |
| Change       | Requirements, client versions, schemas, dependencies, policies, or deployment frequency | Compatible evolution, maintained behavior, and safe recovery           | Change fan-out, regression rate, migration effort, failed rollbacks, recovery time |

::caption[Four pressures used to form bounded scalability claims in this book.]
::label[table:web-scalability-pressures]

The dimensions interact without collapsing into one score.
More demand usually creates more data.
More contributors can increase the rate of change.
Frequent schema changes can increase data migration work even when traffic stays constant.
A design can therefore scale well along one axis while approaching a limit on another.

> **Sustainability angle**
>
> Meeting greater demand usually consumes more computation, storage, transfer, or human attention.
> A technically successful response may still be inefficient.
> Record resource use per useful outcome and the work displaced elsewhere instead of treating capacity as the only goal.

### Demand changes the distribution of web behavior

Demand is not only a higher request count.
More consumers create more concurrency, more varied devices and networks, more retries after ambiguous responses, and more opportunities for rare paths to occur.
A browser may remain responsive while the origin saturates, or the server may respond quickly while client rendering stalls on a growing activity view.

People are not the only consumers.
Integrations, crawlers, and authorized agents can call an interface repeatedly and faster than a person operating a screen.
The goal should therefore describe the authoritative outcome and acceptable user experience rather than assume one kind of client behavior.

### Data changes paths as well as volume

Data pressure includes more than disk space.
As event history grows, the useful write, read, analytical, deletion, archival, and recovery paths can diverge.
A query that works for a few hundred events may scan too much history later; an index that accelerates one filter can increase write cost; and keeping every derived view immediately current can make ingestion harder.

The important questions are which state is authoritative, which views can be rebuilt, which results may be stale, and how long information should remain available.
Those choices determine which data goals must be maintained as volume and variety change.

### Contributors increase coordination pressure

A codebase that one person understands informally may become difficult to change when several people, teams, or agents work in parallel.
More code output does not automatically increase accepted product output.
Review capacity, integration, ownership, project memory, and the ability to diagnose failed work can become binding limits first.

Agents make this pressure especially visible because they can generate several plausible changes before a person could have implemented one.
Stable contracts, focused tasks, executable checks, and explicit ownership can let contributors work more independently.
They also require maintenance and can become harmful if they preserve rules that no longer serve the product.

### Change makes old commitments visible

A web application changes even when its traffic does not.
Browsers, APIs, integrations, event schemas, authentication rules, libraries, hosting platforms, and user expectations evolve on different schedules.
Once a consumer relies on a response or production data adopts a representation, a change may require compatibility and migration rather than a simple code replacement.

Change scalability is the ability to keep making justified changes without turning every release into a coordinated rewrite.
It depends on visible boundaries, useful tests, staged evolution, and recovery paths, but no design eliminates the need to understand what has already become a commitment.

#### Field note — When agent speed made me the bottleneck

Before AI-assisted development, I thought about scalability mainly through the conventional pressures of demand and data.
Working with agents shifted my attention toward contributors and change.

Agents can implement changes far faster than I can.
That makes my judgment and review capacity a binding limit, but removing that limit is not necessarily desirable.
The pace creates a psychological risk I think of as **speed blindness**: becoming so accustomed to rapid output that I stop asking whether the work still serves the intended direction.

This helps explain why people report such different experiences with AI-assisted development.
Rapid generation can be useful leverage in one context and a source of technical risk in another.
Both accounts can be true.
The outcome depends partly on whether the person retains enough understanding and judgment to direct the work.
Otherwise, they become a proxy for the agent—pulling a slot machine and hoping that the next plausible result is the right one.

This book is an example.
Agents and I are developing it together, but I still own its vision and remain responsible for whether it forms a coherent book for my students.
The agents can help research, draft, restructure, and check it; they cannot take over that responsibility.
For me, scaling agent-assisted work means preserving that ownership while taking advantage of the speed.

## One pressure can cross the whole web system

Suppose a domain-specific event causes many consumers to submit events during the same short interval.
That one demand pressure can affect several boundaries:

1. The browser must keep the interaction responsive and communicate pending, accepted, or failed state.
2. The HTTP boundary must handle concurrency, timeouts, retries, authentication, and request limits.
3. Application execution may exhaust workers, connections, memory, or dependency quotas.
4. The authoritative store must preserve event and workflow invariants under concurrent writes.
5. Queries and cached activity views must expose an acceptable level of freshness.
6. Operators need signals that distinguish user-visible failure from waiting, overload, duplication, or stale derived state.

Adding application servers helps only if application execution is the binding limit and the rest of the path can absorb the new work.
Optimizing the browser helps only the work that occurs there.
The response has to follow the pressure to the first limit that threatens the stated goal.

The same reasoning applies to development pressure.
Adding agents can increase candidate changes while review or integration remains fixed.
The result may be more waiting and rework rather than more accepted behavior.
The scalable unit is therefore the complete path to a useful outcome, not the amount of activity at one stage.

## Separate pressures, responses, and constraints

The earlier taxonomy deliberately names what varies.
Several other concerns shape the response:

- **Architecture** assigns responsibilities, authority, contracts, and allowed dependencies across the system.
- **Infrastructure** supplies execution, storage, networking, deployment, and operational capacity.
- **Product and business priorities** determine which user outcomes matter, which risks are tolerable, and when additional capacity or coordination is worth its cost.
- **Constraints** such as budget, energy use, privacy, regulation, geography, hardware, provider quotas, time, and team expertise narrow the acceptable design space.

These are not secondary concerns.
They explain why two applications facing similar demand may choose different responses.
The distinction simply prevents a mechanism such as cloud infrastructure from being mistaken for the pressure it is meant to address.

A **binding limit** is the condition currently preventing the system from maintaining its goal as pressure increases.
It may be a browser's main thread, network bandwidth, CPU, memory, a connection pool, database coordination, an external-service quota, a review queue, or missing expertise.
Increasing capacity somewhere else can add cost and complexity without moving that limit.

## Distinguish scalability from neighboring properties

Several useful properties are easy to conflate with scalability.
The difference lies in the condition being studied.

| Property    | Question                                                                | Example evidence from the event tracker                                       |
| ----------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Performance | How does the system behave under one stated set of conditions?          | Latency and resource use for one activity-view workload                       |
| Scalability | How does maintained behavior change as a named pressure changes?        | Latency, correctness, and resource curves across increasing concurrent writes |
| Elasticity  | Can supplied capacity expand and contract as demand changes over time?  | Provisioning delay, backlog, and cost during and after a traffic burst        |
| Resilience  | Can the system preserve or recover useful service when something fails? | Accepted events and recovery time when storage or a dependency is unavailable |
| Efficiency  | How much resource or coordination produces one useful outcome?          | Compute, transfer, storage, or review time per accepted event or change       |

::caption[Scalability and related system properties answer different questions.]
::label[table:scalability-related-properties]

A system can perform well at its current load but degrade sharply as demand grows.
It can add capacity automatically yet reproduce a correctness error on every instance.
It can survive a dependency failure through expensive overprovisioning.
No single metric establishes all five properties.

## Reason from pressure to evidence

Use one causal chain before choosing a scaling technique:

`pressure → binding limit → response → trade-off → evidence`

- **Pressure:** name what changes and the plausible range or scenario.
- **Binding limit:** identify what first prevents the maintained goal from holding.
- **Response:** change the application, architecture, infrastructure, workflow, or scope at that limit.
- **Trade-off:** state which cost, latency, complexity, consistency, autonomy, or recovery obligation moved elsewhere.
- **Evidence:** repeat a representative observation that could challenge the claim.

{{ import "site/includes/pressure-evidence-figure.html" }}

For a runtime example, concurrent event submissions may exhaust the database connection pool before CPU becomes scarce.
Admission control or buffering might protect accepted writes, but it can add waiting and require an explicit pending state.
A useful evaluation would inspect success, duplication, tail latency, queue age, and recovery as the workload changes rather than only count server instances.

For a development example, parallel agent tasks may produce changes faster than people can review them.
Smaller task boundaries, executable contracts, and automated checks might move repeatable findings earlier, but maintaining those controls also consumes time.
Evidence should cover accepted outcomes, review delay, rework, failed integrations, and human intervention rather than generated lines of code.

This chain does not guarantee the correct response.
It makes the hypothesis explicit enough to test and revise.

## Constraints prevent premature scaling

Scalability is not a requirement to prepare every component for unlimited growth.
An implementation that serves its likely demand, preserves its data, and remains understandable to its owners can be more appropriate than a distributed design built for a hypothetical future.
Every additional cache, queue, replica, service, region, contract, and automation layer creates a new operating and change obligation.

Premature scaling begins when a solution is selected before the pressure, goal, or limit is known.
Preparation is still valuable when it preserves a cheap path to learn: keep authority clear, avoid irreversible coupling without a reason, collect a baseline, and identify the signal that would justify the next move.
The aim is not to predict the final architecture.
It is to make the next decision from evidence rather than from a generic idea of scale.

For the course project, time, available hardware, privacy, model access, team expertise, and implementation scope are legitimate design inputs.
A bounded local implementation can be a strong baseline precisely because its constraints are visible.
Later implementations can test different hypotheses without pretending that newer or more distributed means better.

## Scalability dimensions lab

The demonstration below applies four pressures to the event tracker.
Select the scenarios that matter and observe which dimensions receive the greatest relative strain.
The weights are deterministic teaching inputs, not measurements of a real application, so use the result to form a claim rather than to select an architecture.

{{ import "site/includes/scalability-dimensions-demo.html" }}

Choose one leading dimension and write its pressure, maintained goal, likely first limit, and first useful signal.
Then select a second pressure and inspect how the conclusion changes.
If several dimensions rise together, preserve them as separate claims instead of averaging them into a single scalability score.

## Project artifact

Produce two bounded scalability claims for implementation A: one about runtime demand or data, and one about contributors or change.
For each claim, record:

- the goal that must continue to hold,
- the pressure and plausible range or scenario,
- the system boundary and relevant constraints,
- the likely first binding limit and signal,
- one candidate response and its expected trade-off,
- the evidence that would support or challenge the claim,
- and one dimension intentionally left outside the claim.

These claims become inputs to the shared measurement protocol in the [Benchmarking chapter](/chapters/benchmarking/).
They should be revised when evidence reveals a different limit, not protected as predictions that must appear correct.

## Summary

Scalability describes whether a system can continue meeting a stated goal as a named pressure grows or changes.
Demand, data, contributors, and change provide four reusable pressures for examining the event tracker and its development system.
Architecture and infrastructure are responses; product priorities and constraints determine which responses are acceptable.

Performance describes one set of conditions, scalability describes change across conditions, elasticity describes capacity adaptation, resilience describes behavior under failure, and efficiency relates useful outcomes to consumed resources or coordination.
None substitutes for the others.

A useful scalability argument follows pressure to a binding limit, proposes a response, exposes the resulting trade-off, and names evidence that could disprove it.
This turns “Can it scale?” from a slogan into a bounded engineering question.
