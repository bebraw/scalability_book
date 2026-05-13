# What happens when systems face reality?

Reality is what happens when the assumptions of the first implementation meet real users, real data, real failures, real costs, and real constraints. The Construct project intentionally starts small, but the Reconstruct project changes the environment. This chapter should help students understand why a design that was reasonable earlier can become insufficient later.

The central claim could be: systems rarely fail because one textbook pattern was missing. They fail because their original assumptions no longer match their operating environment.

## Chapter purpose

- Bridge Construct and Reconstruct.
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

## The event tracking system under pressure

Scenario ideas:

- A domain-specific peak happens and thousands of users or devices submit events during the same 20-minute window.
- The network is unreliable, causing clients to retry submissions.
- Users need summaries before the data has fully settled.
- A customer asks to delete personal or sensitive data after the activity has ended.
- Multiple tenants or domain instances run at the same time and one large instance should not slow down another.
- An older client version submits malformed events.

Each scenario can be used to ask:

- What breaks first?
- What data can be lost, delayed, or duplicated?
- What does the user see?
- What does the operator see?
- What design choice from Construct caused or softened the problem?

## Designing from failure

Ideas to develop:

- Accept that failure is normal in distributed systems.
- Prefer idempotent operations where clients may retry.
- Separate ingestion from processing when write spikes matter.
- Use queues or buffers when immediate processing is unnecessary.
- Store raw events before deriving summaries.
- Make delayed correctness explicit.
- Design error states and recovery paths, not only successful paths.

## Reconstruct as a change in assumptions

Reconstruct should not be framed as "make the app bigger" in a vague sense. It is a disciplined response to changed assumptions:

- many concurrent tenants, projects, groups, locations, or other domain instances,
- tens or hundreds of thousands of users,
- high and bursty event volume,
- expected failures,
- eventual correctness over immediate accuracy.

Students should explain which assumptions they are changing and which they are keeping. A good reconstruction makes trade-offs visible instead of trying to solve every possible future problem.

## Exercise ideas

- Run a postmortem for a fictional event tracking outage.
- Ask students to write the top five assumptions in their Construct project and mark which assumptions fail under the Reconstruct brief.
- Have students draw a "pressure map" showing which component is stressed by which new requirement.
- Ask an agent to propose failure scenarios, then have students rank them by likelihood and impact.

## Notes for further development

- Add a concise incident narrative that can be reused in lecture.
- Connect this chapter to benchmarking: measurement reveals some forms of reality before users do.
- Connect this chapter to scaling: the next part should introduce specific techniques only after the pressure is clear.
