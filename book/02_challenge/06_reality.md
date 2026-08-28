# Which web application assumptions fail under pressure?

Reality is what happens when implementation assumptions meet real users, real data, real failures, real costs, and real constraints.
The common functional scope remains stable across the three builds, but shared pressure scenarios reveal where each design would become insufficient.

## Pressures that expose assumptions

:ref[table:scaling-pressures]{text="The table below"} turns six forms of growth into assumptions to challenge, signals to watch, and responses to prepare.

| Pressure              | Assumption it exposes                                                | First signals                                                      | Prepared response                                                               |
| --------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| More users            | Request handling and identity services absorb concurrent peaks       | Tail latency, `429` responses, authentication failures, abuse load | Load-test peaks; define admission control, rate limits, and degradation         |
| More events           | Data can grow without changing query cost or retention needs         | Slow queries, storage growth, index maintenance, stale summaries   | Index measured access paths; define aggregation, archival, and retention        |
| More domain instances | Shared capacity remains isolated, configurable, and fairly allocated | Noisy-neighbor latency, uneven queues, permission exceptions       | Enforce tenant boundaries, quotas, partitioning rules, and scoped configuration |
| More failures         | A timed-out or retried operation does not create a new side effect   | Duplicates, retry storms, growing queues, delayed work             | Use idempotency, bounded backoff, failure isolation, and observable recovery    |
| More stakeholders     | The original data, access model, and ownership satisfy later needs   | Manual exports, access exceptions, audit gaps, ownerless incidents | Name owners; define reporting, access-control, audit, and support contracts     |
| More change           | Producers, consumers, schemas, and dependencies evolve together      | Version skew, failed migrations, repeated compatibility breakage   | Design compatible evolution, staged migration, verification, and rollback       |

::caption[Scaling pressures that expose assumptions in the event-tracking system.]
::label[table:scaling-pressures]

> **Sustainability angle**
>
> Production reality often reveals waste that local development hides: retries, bots, polling dashboards, failed jobs, duplicated events, abandoned data, and oversized logs.
> Systems that can back off, deduplicate, expire data, and shed load are often both more reliable and less wasteful.

## From changed assumptions to saturation

A system has a **competence envelope**: the range of conditions it can handle with its current resources, architecture, procedures, tools, and expertise.
Ordinary disturbances move the system around inside that envelope.
Saturation occurs when pressure reaches a binding limit and pushes the system to or beyond the boundary of what it can currently handle :citep[woods2018graceful].

That limit is not necessarily a server running at 100 percent CPU.
It may be physical, such as memory or network bandwidth; deliberately imposed, such as a bounded queue, connection pool, quota, or rate limit; or organizational, such as an on-call team unable to diagnose several interacting failures quickly enough.
The relevant system is therefore sociotechnical: software, infrastructure, operators, deployment paths, and operational tools all affect where its boundary lies :citep[hochstein2026saturation].

This framing turns a vague question such as "Will it scale?" into four more useful questions:

1. Which limit is the pressure approaching?
2. Which signal reveals that the remaining margin is shrinking?
3. What failure or feedback loop begins at saturation?
4. Which prepared recovery actions could return the system to a useful state?

### Pressure map lab

The incident challenge below turns changed assumptions into a pressure map over three rounds.
Investigate one signal and commit one response before time advances.
The consequences persist: a response may protect one boundary while moving waiting, cost, correctness risk, or operational work somewhere else.

{{ import "site/includes/pressure-map-demo.html" }}

Try one path, inspect the debrief, and replay with a different response.
Use the exported brief to connect the operating pressure to the stressed component, binding limit, likely failure, first signal, and prepared recovery.
The values are deterministic teaching inputs rather than measured capacity, so the useful evidence is the causal explanation and not the final number.

Use this challenge before choosing scaling techniques.
If the pressure is unclear, the response is likely to be fashionable rather than useful.

## Scaling bridge for the comparison

Before students complete implementation B, they need a compact vocabulary for responding to pressure.

Useful bridge concepts:

- **Write path and read path**: recording events and viewing summaries may need different designs.
- **Raw events and derived views**: store what happened before computing summaries that can be rebuilt.
- **Queues and background work**: absorb bursts when immediate processing is not required.
- **Idempotency and deduplication**: make retries safe when clients or networks fail.
- **Partitioning by domain boundary**: separate tenants, projects, groups, locations, or other units of scale.
- **Backpressure and rate limiting**: protect the system when demand exceeds capacity.
- **Graceful degradation**: decide what can be delayed, approximated, or temporarily disabled.
- **Operational optionality**: prepare safe ways to shed work, change a limit, disable a feature, scale a dependency, roll back, or fix forward.
- **Operational signals**: define which metric would show overload first.

## Challenging assumptions without changing the core

Implementation B should not be framed as "make the app bigger" or as an extension of implementation A.
The following shared pressure scenarios challenge both implementations without changing the common acceptance core:

- many concurrent tenants, projects, groups, locations, or other domain instances,
- tens or hundreds of thousands of users,
- high and bursty event volume,
- expected failures,
- eventual correctness over immediate accuracy.

Students should explain which assumptions they are changing and which they are keeping.
A good reconstruction makes trade-offs visible instead of trying to solve every possible future problem.

## Project artifact

Students should produce a challenged-assumptions list and a pressure map.
The map should connect each shared pressure scenario to the part of implementations A and B it stresses, the limit being approached, the likely failure mode, the first signal that would reveal the problem, one possible scaling response, and at least one prepared recovery action.

## Summary

Production pressure reveals assumptions that were easy to overlook while a system was small and reliable.
Growth, dependency failure, changing correctness needs, and operational constraints push components toward saturation, where latency, queues, errors, and recovery cost begin to rise.
Designing from failure means naming the limit, the first useful signal, the expected failure mode, and a prepared response before choosing a scaling technique.
Implementation B should challenge selected assumptions without abandoning the common acceptance core or pretending to solve every future problem.
The pressure map turns that reasoning into an explicit bridge from observed limits to the later comparison and scaling decisions.
