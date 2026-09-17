# Which web application assumptions fail under pressure?

A web application that works locally has shown that one implementation can satisfy one workload in one controlled environment.
Production changes the environment: browser applications and integrations retry, networks delay or lose responses, live data accumulates, shared dependencies slow down, deployments change running systems, and operators have to recover without discarding authoritative state.

Production failures expose architectural assumptions that do not hold under actual operating conditions.
Reconstruct the failure chain, locate the earliest useful signal, and identify a path back to useful service.

## Local correctness leaves production assumptions untested

Production is not simply a larger version of a developer's laptop.
It contains independently changing consumers, intermediaries, services, data stores, providers, and operational tools.
A failure can cross several of these boundaries before a user sees an error.

Consider five assumptions that local development can easily hide:

- **Consumer behavior:** a browser, integration, or agent may retry after an ambiguous timeout or reconnect in a synchronized burst.
- **Network behavior:** a request can reach the authority even when its response never reaches the consumer.
- **Dependency behavior:** a slow identity, storage, payment, or messaging service can hold resources and spread waiting through otherwise healthy components.
- **Data behavior:** replicas can lag, writes can conflict, queues can age, and a restored endpoint can still return stale or incomplete state.
- **Operational behavior:** the dashboard, deployment system, credentials, status page, or rollback mechanism may depend on the service being repaired.

These are architectural assumptions because they determine where authority, waiting, retries, and recovery live.
Testing the happy path proves none of them.

> **Sustainability angle**
>
> Production pressure often exposes waste that local development hides: retry storms, polling, failed jobs, duplicated events, abandoned data, and oversized logs.
> Backoff, deduplication, retention, and load shedding can reduce both failure amplification and unnecessary resource use.

### Field note — When caching complexity became an availability risk

In a commercial Next.js project, GitHub effectively served as the backend for most of the site's meaningful data.
Two sections used Next.js caching incorrectly, causing production page requests to repeatedly reach the GitHub API.
This remained invisible during local development because our traffic never approached the API quota.

Under high production load, the repeated requests exhausted the quota.
Because the site could not present useful content without GitHub, a rate limit on one external dependency became a site-wide outage.
During the incident, I debugged the behavior with LLM assistance and found one faulty caching path.
After the quota reset, traffic exposed a second path with the same problem, causing another period of downtime.

We eventually removed the GitHub dependency because it had also become unstable for our needs.
In retrospect, load testing should have revealed that site traffic was being amplified into API traffic, while monitoring should have warned us before the quota became an availability boundary.

{{ import "site/includes/dependency-failure-figure.html" }}

The incident also reinforced my preference for simpler web primitives.
For this kind of site, I consider Next.js's interacting rendering and caching mechanisms more complex than the product warranted.
If rebuilding it today, I would use a [multi-page application with hypermedia-driven fragments](/chapters/architecture/#rendering-moves-work-across-time-and-place) and View Transitions for the interactive portions.

That architecture would not eliminate the need for caching, monitoring, fallbacks, and bounded external dependencies.
Its advantage would be making page requests, fragment requests, and data access paths more explicit—and therefore easier to understand before production traffic tests them.

## What documented web incidents reveal

The four accounts below were published by the organizations that experienced the incidents.
They provide concrete timelines, observations, and recovery choices, but they are not controlled experiments or independent audits.
Treat each reported number as evidence about that system and use the transfer question to decide what, if anything, applies to the event tracker.

| Incident                                                                                                  | Failure chain                                                                                           | Assumption exposed                                                                      | First useful signal and recovery                                                                                          | Transfer question for the tracker                                               |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [Discord authentication outage](https://discord.com/blog/authentication-outage)                           | Zonal maintenance, a degraded disk, cold row caches, limited capacity, timeouts, and retries compounded | Zonal redundancy and a successful short test provided enough margin to continue         | HTTP success collapsed; downstream-service time and saturation led to load shedding while capacity returned               | Which optional actions can stop before retries overwhelm a shared dependency?   |
| [GitHub database partition](https://github.blog/news-insights/company-news/oct21-post-incident-analysis/) | A network partition triggered failover, leaving writes in two data-center histories                     | Automated database failover would produce a topology the application could safely use   | Replication topology and faults exposed divergence; GitHub degraded features, failed forward, rebuilt, and drained queues | Which state must remain authoritative even if availability has to be reduced?   |
| [Fastly global outage](https://www.fastly.com/blog/summary-of-june-8-outage)                              | A valid customer configuration activated a latent software bug across the edge network                  | A valid configuration change could not trigger a platform-wide failure                  | Monitoring detected global disruption within one minute; disabling the triggering configuration restored most service     | How small is the blast radius of one valid configuration or deployment change?  |
| [Cloudflare Workers KV incident](https://blog.cloudflare.com/cloudflare-incident-on-october-30-2023/)     | Deployment automation selected the wrong build; KV and tools depending on KV failed together            | Tested rollback, authentication, and deployment tooling would remain usable during loss | Immediate alerting identified failure, but recovery required a break-glass route to the previous known-good build         | Can the application be recovered when its ordinary control path is unavailable? |

::caption[Documented web incidents interpreted as failed assumptions and recovery questions.]
::label[table:documented-web-reality-cases]

Use one incident to identify the earliest point where a prepared control could have interrupted propagation.
Then test that reasoning against a smaller event-tracker failure.

## Trace one failure across the web boundary

The [Architecture chapter](/chapters/architecture/) separated consumer, representation, execution, and authority.
A production failure becomes understandable when the same roles are traced over time rather than inspected as a static diagram.

Consider a deliberately small event-tracker scenario:

1. A browser sends `POST /events` without a stable idempotency key.
2. The origin validates the request and commits the event to the authoritative store.
3. The response is lost after the commit, so the browser sees a timeout.
4. Client application logic retries because it cannot tell whether the action completed.
5. Another application instance accepts the retry and records a second event.
6. A cached activity view briefly shows neither event and later shows both.
7. Request-success metrics look healthy even though one user intent produced duplicate durable state.

No individual observation explains the whole failure.
The timeout is a consumer symptom, the lost response is a network event, the retry is a policy, the duplicate is an authority failure, and the stale view is a derived-state delay.
Useful evidence has to connect them through a stable command identifier, request trace, commit result, cache status, and user-visible outcome.

The corrective design is similarly cross-boundary.
The consumer reuses one idempotency key, the authority stores the mutation and reusable result atomically, and the interface makes a pending or confirmed outcome visible.
Retries may then recover from transport ambiguity without inventing a second domain action.

## From failed assumptions to useful signals

A system has a **competence envelope**: the range of conditions it can handle with its current resources, architecture, procedures, tools, and expertise.
Ordinary disturbances move the system around inside that envelope.
Saturation occurs when pressure reaches a binding limit and pushes the system to or beyond the boundary of what it can currently handle :citep[woods2018graceful].

The limit is not necessarily a server at 100 percent CPU.
It may be physical, such as memory or network bandwidth; deliberately imposed, such as a bounded queue, connection pool, quota, or rate limit; or organizational, such as responders unable to diagnose several interacting failures quickly enough.
Software, infrastructure, operators, deployment paths, and operational tools all affect where the boundary lies :citep[hochstein2026saturation].

A useful incident view needs several kinds of evidence:

- **User outcome:** success rate, error state, latency, duplication, stale data, or unavailable capability.
- **Binding limit:** CPU, disk, connection pool, database quorum, dependency quota, queue capacity, or responder attention.
- **Amplification:** retries, reconnects, fan-out, cache misses, synchronized jobs, or backlog replay.
- **Integrity:** authoritative write result, replication position, invariant violation, or reconciliation status.
- **Recovery:** rollback state, restored capacity, backlog age, replica lag, and whether user-visible behavior has settled.

This framing turns “Will it scale?” into four more useful questions:

1. Which limit is the pressure approaching?
2. Which signal reveals that the remaining margin is shrinking?
3. What failure or feedback loop begins at saturation?
4. Which prepared recovery actions can return the system to a useful state?

## Connect failed assumptions to response patterns

For the lost-response example, the response is an idempotent command: preserve one operation identity and return its recorded result on retry.
The new obligation is atomic storage of the state change and reusable result.
Other pressures call for different responses; [Chapter 8's response guide](/chapters/scaling/#start-with-the-pressure) connects them to the operating contracts they introduce.
First check whether the measurements describe a coherent failure.

The Little's Law relationship introduced in the [Benchmarking chapter](/chapters/benchmarking/#check-measurements-against-a-model) can check one queue or in-flight boundary.
If a stable event-processing stage contains an average of 120 waiting or active events and completes an average of 8 events per second, the implied average time in the stage is `W = L / λ = 120 / 8 = 15 seconds`.
That calculation does not explain the delay, but it can expose incompatible measurements or show that a claimed user-visible completion time cannot fit the observed backlog and throughput.
If arrivals and completions are not approximately balanced during the observation window, record the system as changing or overloaded instead of forcing the averages into the law.

For implementations A and B, select one queue, pool, request path, or other conserved-work boundary.
State its boundary, estimate or measure average work in progress, completion rate, and average time in the system over one consistent window, then explain whether `L = λW` is approximately coherent and what the relationship leaves unexplained.

## Recovery is part of the architecture

Recovery is not a generic command executed after diagnosis.
The available response depends on what has already become externally visible or durably authoritative.

| Recovery mode         | What it protects                                        | Required preparation                                                    | Main risk                                                              |
| --------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Reject or shed load   | Remaining capacity and core operations                  | Admission rules, retry guidance, and an explicit non-critical boundary  | Rejected work may be retried immediately or lost silently              |
| Degrade functionality | Data integrity or one essential user path               | Features that can be paused independently and clear user states         | Hidden dependency means the supposedly optional work is still required |
| Roll back             | A known-good code or configuration path                 | Compatible state, retained artifact, health gate, and reachable control | Durable writes or migrations may make reversal unsafe                  |
| Fix forward           | Accepted state that cannot safely be discarded          | Reconciliation plan, bounded change, and strong observation             | Recovery takes longer while the system remains degraded                |
| Rebuild and replay    | Authoritative history and deferred effects              | Backups, logs, replayable work, ordering, and deduplication             | Backlog load can trigger another saturation cycle                      |
| Break glass           | Recovery when the ordinary control plane is unavailable | Independent access, narrow authority, audit, and regular testing        | Emergency power can bypass normal safeguards                           |

::caption[Recovery modes and the preparation each requires before an incident.]
::label[table:web-recovery-modes]

Two boundaries deserve particular attention.
First, recovery tooling should not depend entirely on the component it is meant to repair.
Second, **service restored** and **recovery complete** are different states.
Traffic may succeed while replicas lag, caches remain stale, queues grow, notifications wait, and user-visible inconsistencies still require reconciliation.

### Pressure map lab

The incident challenge below turns changed assumptions into a pressure map over three rounds.
Investigate one signal and commit one response before time advances.
The consequences persist: a response may protect one boundary while moving waiting, cost, correctness risk, or operational work somewhere else.

{{ import "site/includes/pressure-map-demo.html" }}

{{ import "exercise:pressure-retries" }}

Try one path, inspect the debrief, and replay with a different response.
Use the exported brief to connect the operating pressure to the stressed component, binding limit, likely failure, first signal, and prepared recovery.
The values are deterministic teaching inputs rather than measured capacity, so the useful evidence is the causal explanation and not the final number.

## Challenge assumptions without changing the common core

Implementation B should not be framed as “make the app bigger” or as an extension of implementation A.
Apply the same production pressures to both independent implementations while keeping their required behavior stable:

- many concurrent tenants, projects, groups, locations, or other domain instances,
- tens or hundreds of thousands of users,
- high and bursty event volume,
- client retries and dependency failure,
- eventual correctness where immediate accuracy is unnecessary,
- and a deployment or configuration change that must be stopped or reversed.

Choose one documented case and reconstruct it as a chain of trigger, latent condition, propagation, user effect, first useful signal, recovery choice, and residual work.
Then transfer only the structure of that chain to the event tracker.
Do not claim that the project has reproduced the source company's scale, infrastructure, or result.

Explain which assumptions differ between implementations A and B and which remain shared.
A good reconstruction makes failure and recovery obligations visible without trying to solve every possible future problem.
Use that diagnosis to choose and test a response in the [Scaling chapter](/chapters/scaling/).

## Project artifact

Produce a documented-case transfer and a pressure map for implementations A and B.
The artifact should:

- link the selected source and separate its reported facts from your interpretation,
- trace one failure across consumer, network, execution, authority, and operational boundaries,
- name the assumption, binding limit, first useful signal, amplification path, and user-visible effect,
- apply Little's Law to one declared queue, pool, request path, or other conserved-work boundary and interpret its limits,
- connect the failed assumption to one justified response pattern and the new obligation that response would introduce,
- identify a prepared recovery mode and the evidence that would show recovery is complete,
- and explain what differs between the two implementations without changing the common acceptance core.

## Summary

Trace a failure from trigger and latent condition through propagation, user effect, and recovery.
Use the first useful signal to locate the broken assumption and evaluate a response with its new obligations.
Recovery must protect authoritative state and remain possible when ordinary tools fail; successful requests can resume before reconciliation and deferred work are complete.
