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

## Measurement traps

Ideas to develop:

- Benchmarking only the easiest path.
- Testing with unrealistic data volume.
- Ignoring database indexes and query plans.
- Looking only at averages.
- Running benchmarks from the same machine as the server without understanding the distortion.
- Treating benchmark numbers as universal instead of environment-specific.
- Adding logs that are too noisy, too vague, or unsafe for privacy.

## Exercise ideas

- Students add one benchmark or load script for their Construct project.
- Students add basic structured logging around event creation and querying.
- Students run one measurement, document the result, and explain what the result does and does not prove.
- Students use the measurement to identify one likely reconstruction pressure.

## Notes for further development

- Add a small tool-neutral example using `curl`, a simple script, or a common load testing tool.
- Include a table of metrics and what each metric can reveal.
- Connect privacy to observability: event tracking systems can easily log sensitive behavior regardless of the chosen theme.
