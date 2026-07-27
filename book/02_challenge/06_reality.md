# What happens when assumptions meet reality?

Reality is what happens when implementation assumptions meet real users, real data, real failures, real costs, and real constraints.
The common functional scope remains stable across the three builds, but shared pressure scenarios reveal where each design would become insufficient.
This chapter helps students challenge implementation A while they form and evaluate the architectural hypothesis behind implementation B.

The central claim could be: systems rarely fail because one textbook pattern was missing.
They fail because their original assumptions no longer match their operating environment.

## Chapter purpose

- Bridge the comparison from implementation A to implementation B.
- Help students identify what breaks first when scale and uncertainty increase.
- Introduce failure modes that appear outside local development.
- Teach students to reason from pressure rather than from fashionable architecture patterns.

## Pressures that expose assumptions

Possible subsections:

- **More users**: concurrency, rate limits, authentication load, abusive clients, peak traffic.
- **More events**: storage growth, slow queries, indexes, archiving, aggregation.
- **More domain instances**: tenancy, isolation, configuration, permissions, noisy neighbors.
- **More failures**: retries, duplicates, timeouts, network partitions, delayed processing.
- **More stakeholders**: reporting, compliance, support, product analytics, operational ownership.
- **More change**: schema evolution, API compatibility, migrations, dependency upgrades.

> **Sustainability angle**
>
> Production reality often reveals waste that local development hides: retries, bots, polling dashboards, failed jobs, duplicated events, abandoned data, and oversized logs.
> Systems that can back off, deduplicate, expire data, and shed load are often both more reliable and less wasteful.

## The event tracking system under pressure

Scenario ideas:

- A domain-specific peak happens and thousands of users or devices submit events during the same 20-minute window.
- The network is unreliable, causing clients to retry submissions.
- Users need summaries before the data has fully settled.
- A customer asks to delete personal or sensitive data after the activity has ended.
- Multiple tenants or domain instances run at the same time and one large instance should not slow down another.
- An older client version submits malformed events.
- In a workflow-platform domain, many workflow runs start at once, long-running nodes block synchronous execution, tool calls fail or rate-limit, and users need traceable run history rather than immediate success.

Each scenario can be used to ask:

- What breaks first?
- What data can be lost, delayed, or duplicated?
- What does the user see?
- What does the operator see?
- What design choice from implementation A caused or softened the problem?

### Pressure map lab

The demonstration below turns changed assumptions into a pressure map.
The goal is to connect a new reality to the part of the system it stresses, the likely failure mode, the first signal that would reveal the problem, and a response that fits the pressure.

{{ import "site/includes/pressure-map-demo.html" }}

Use this before choosing scaling techniques.
If the pressure is unclear, the response is likely to be fashionable rather than useful.

## Designing from failure

Ideas to develop:

- Accept that failure is normal in distributed systems.
- Prefer idempotent operations where clients may retry.
- Separate ingestion from processing when write spikes matter.
- Use queues or buffers when immediate processing is unnecessary.
- Store raw events before deriving summaries.
- Make delayed correctness explicit.
- Design error states and recovery paths, not only successful paths.

## Scaling bridge for the comparison

Before students complete implementation B, they need a compact vocabulary for responding to pressure.
This chapter introduces the ideas lightly; the later scaling chapter applies them consistently across all three implementations.

Useful bridge concepts:

- **Write path and read path**: recording events and viewing summaries may need different designs.
- **Raw events and derived views**: store what happened before computing summaries that can be rebuilt.
- **Queues and background work**: absorb bursts when immediate processing is not required.
- **Idempotency and deduplication**: make retries safe when clients or networks fail.
- **Partitioning by domain boundary**: separate tenants, projects, groups, locations, or other units of scale.
- **Backpressure and rate limiting**: protect the system when demand exceeds capacity.
- **Graceful degradation**: decide what can be delayed, approximated, or temporarily disabled.
- **Operational signals**: define which metric would show overload first.

The goal is not for students to apply every technique.
The goal is for them to complete implementation B with enough vocabulary to explain why one pressure deserves one response and not another.

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

## Exercise ideas

- Run a postmortem for a fictional event tracking outage.
- Ask students to write the top five assumptions in implementation A and mark which are challenged by the shared pressure scenarios.
- Have students draw a "pressure map" showing which component is stressed by which new requirement.
- Ask an agent to propose failure scenarios, then have students rank them by likelihood and impact.

## Project artifact

Students should produce a challenged-assumptions list and a pressure map.
The map should connect each shared pressure scenario to the part of implementations A and B it stresses, the likely failure mode, the first signal that would reveal the problem, and one possible scaling response.

## Notes for further development

- Add a concise incident narrative that can be reused in lecture.
- Connect this chapter to benchmarking: measurement reveals some forms of reality before users do.
- Connect this chapter to scaling: the next part should introduce specific techniques only after the pressure is clear.
- Keep changed assumptions as a shared thought experiment or pressure test applied to all three implementations.
  Do not make them a license to change the common functional scope of implementation B.
- Distinguish the immutable acceptance core from scalability scenarios.
  The implementation must satisfy the former; students use the latter to explain what would fail and how the architecture could respond.
- Ask students to compare whether the local and foundation-model implementations exposed different failure assumptions, and whether those differences came from architecture, generated defaults, or team decisions.
- Preserve identical pressure-map headings across phases so the final analysis can compare event volume, concurrency, storage growth, retries, partial failure, and eventual correctness directly.
- Add one prompt about development reality: what happens when model access, latency, privacy requirements, cost, or human review capacity changes?
