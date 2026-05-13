# How to benchmark and observe web applications?

Benchmarking and observability are ways to replace assumptions with evidence. A system that feels simple during development may behave differently under load, with real data, slow networks, concurrent users, or partial failures. Before students redesign for scale, they need some way to see what is actually happening.

The central claim could be: you cannot reason responsibly about scalability without measurement, but measurement itself has to be designed.

## Chapter purpose

- Explain why "it works" is not the same as "it works under pressure".
- Introduce basic benchmarking concepts for web applications.
- Introduce observability as the ability to understand system behavior from emitted signals.
- Prepare students to discuss their Construct project before beginning Reconstruct.

## Benchmarking basics

Ideas to develop:

- Define workload: what actions are being simulated?
- Define load: how many users, requests, events, or concurrent sessions?
- Define metrics: latency, throughput, error rate, resource usage, queue depth, database time.
- Distinguish average latency from percentiles.
- Distinguish cold start, warm cache, and sustained load behavior.
- Explain why synthetic benchmarks are useful but limited.

Possible event tracking benchmarks:

- Record 1,000 domain events.
- Query the latest events while writes are happening.
- Filter events by type with a larger dataset.
- Import a batch of historical events.
- Simulate duplicate submissions from retrying clients.

## Observability basics

Potential subsections:

- **Logs**: discrete records of what happened.
- **Metrics**: numerical signals over time.
- **Traces**: request paths across components.
- **Errors**: structured failure information that helps debugging.
- **Dashboards and alerts**: ways to turn signals into operational awareness.

Important distinction:

- Monitoring tells you whether known conditions are healthy.
- Observability helps you investigate unknown conditions.

## What to measure in the project

Prompts:

- How long does event recording take?
- What happens when invalid events are submitted?
- What happens when two users submit events at the same time?
- Which endpoint or query becomes slow first?
- What information would you need during an incident?
- Can you reconstruct what happened after the fact?

## Efficiency and green computing

Benchmarking can also support sustainability work. A scalable system is not only one that can handle more load; it should also avoid wasting computation, memory, storage, bandwidth, and energy. Green computing gives students a broader reason to care about efficiency: inefficient software can increase infrastructure cost and environmental impact at the same time.

This section should stay concrete. Students do not need to calculate exact carbon emissions to learn useful lessons. It is enough to connect system behavior to resource consumption and ask whether the same user value can be delivered with less waste.

Ideas to develop:

- Measure resource use alongside latency and throughput: CPU, memory, disk I/O, network transfer, database queries, and storage growth.
- Compare efficiency per unit of work, such as CPU time per recorded event, database queries per page view, or bytes transferred per dashboard load.
- Discuss overfetching, polling, excessive logging, unbounded retention, inefficient queries, oversized client bundles, and unnecessary background jobs as sustainability issues.
- Explain that caching can reduce repeated work but can also increase memory use and staleness complexity.
- Discuss right-sizing infrastructure: overprovisioning may hide performance problems while wasting resources.
- Introduce carbon-aware thinking carefully: region, energy mix, time of computation, and provider reporting may matter, but exact numbers are often hard to verify.

Possible event-oriented examples:

- A dashboard refreshes every second even when no events have changed.
- The application stores every raw event forever even when older data could be aggregated or archived.
- A listing page downloads all events when it only displays the latest 50.
- A benchmark shows acceptable latency, but each request performs many unnecessary database queries.
- A background job recomputes all summaries instead of updating only affected aggregates.

Student prompts:

- What is the cheapest useful measurement of resource consumption for your project?
- Which feature does the most work relative to the value it provides?
- What data can be retained, aggregated, archived, or deleted?
- What would you optimize first if your goal was to reduce cloud cost?
- Would that optimization also reduce environmental impact, or would it merely move the cost elsewhere?

## Measurement traps

Ideas to develop:

- Benchmarking only the easiest path.
- Testing with unrealistic data volume.
- Ignoring database indexes and query plans.
- Looking only at averages.
- Running benchmarks from the same machine as the server without understanding the distortion.
- Treating benchmark numbers as universal instead of environment-specific.
- Adding logs that are too noisy, too vague, or unsafe for privacy.
- Treating "faster" as automatically greener. A faster system can still waste resources if it does unnecessary work at high volume.
- Optimizing for sustainability claims without measuring the underlying resource behavior.

## Exercise ideas

- Students add one benchmark or load script for their Construct project.
- Students add basic structured logging around event creation and querying.
- Students run one measurement, document the result, and explain what the result does and does not prove.
- Students use the measurement to identify one likely reconstruction pressure.
- Students add one efficiency observation, such as resource use per event, database queries per request, bundle size, storage growth, or repeated background work.
- Students propose one sustainability-oriented improvement and explain the trade-off it introduces.

## Notes for further development

- Add a small tool-neutral example using `curl`, a simple script, or a common load testing tool.
- Include a table of metrics and what each metric can reveal.
- Connect privacy to observability: event tracking systems can easily log sensitive behavior regardless of the chosen theme.
- Add references on green software engineering, resource efficiency, carbon-aware computing, and cloud provider sustainability reporting.
