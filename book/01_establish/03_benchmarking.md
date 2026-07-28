# How to measure and observe web applications?

If you want to understand your application and its characteristics in detail, you will have to both measure and observe it.
While it was important before the agentic era of web development, it has become even more important now that we might be running code in production we do not fully understand or did not have time to verify.
It can be argued that this was always the case as it is not uncommon that any software of sufficient complexity has issues we are not aware of and for this reason we should measure and observe regardless of how our software was developed.

In this chapter, we will discuss topics like why systems behave different during development and in production under load with real data and slow networks while there are many concurrent users and failures you might not expect.
Before you can design for large scale, it is good to understand how to measure and observe since ideally you can test certain characteristics of your application before pushing towards production.
Measuring requires conscious design, and it is worth considering what and how to measure.

## How to get started with measurements?

To give you a simple example, consider tools like [artillery](https://www.npmjs.com/package/artillery) or [k6](https://k6.io/).
These tools encapsulate best practices around load testing in various ways while giving statistically valid results.
I have used k6 for some of my papers and found it an invaluable tool for gaining insights.
Often an agent can help you to come up with these kinds of measurements, although it is important to validate what they emit and consider what you are measuring and why as there are many things you could measure, some of which are more relevant than others.

To give you some idea, consider the following points:

- Define workload: what actions are being simulated?
- Define load: how many users, requests, events, or concurrent sessions?
- Define metrics: latency, throughput, error rate, resource usage, queue depth, database time.
- Distinguish average latency from percentiles.
- Distinguish cold start, warm cache, and sustained load behavior.

### Simulated benchmark lab

The demonstration below models 60 requests to an event-recording endpoint.
Change the number of concurrent clients, the share of requests that take a slow storage path, and the p95 latency objective.
The values are deterministic and run only in the browser, so this is a teaching model rather than a capacity test.

{{ import "site/includes/benchmark-simulation-demo.html" }}

Predict the default result before running the simulated workload, then compare the average with p95.
Treat the first result as a baseline, change one condition, and predict again before recording the comparison.
The useful lesson is not the simulated number itself: it is that the workload, load, metric, and acceptance threshold have to be stated together.

It is important to note that while synthetic benchmarks like these are useful, they can be limited by their nature since they might omit factors visible in a production environment.
For example, it can be difficult to simulate what happens under load when many users are performing certain kinds of actions you cannot anticipate.
It is possible that real usage will exercise portions of your system you did not think to benchmark especially if your application is complex.
Under these conditions, you may hit third-party limitations you might not expect or there might be something in your infrastructure that breaks under specific kind of loads.
It is for this reason learning chaos engineering can be useful since it tests exactly what happens when a piece of infrastructure breaks since that is exactly what can happen in practice at the worst possible moment.

## Evaluating agentic workflows

The development workflow is also a system that can be benchmarked.
For a bounded task, record whether the result passed its acceptance checks, how long it took, what it cost, how many retries occurred, and how much human review or correction it required.
Generated lines of code and nominal hours saved are weak outcome measures because they can move work into review, rework, or maintenance.
This distinction matters in practice: organizations report broad AI adoption and perceived productivity gains, while objective measurement of productivity and quality remains limited :citep[giray2025adoption].

Some outcomes can be checked deterministically through tests, schemas, or expected artifacts.
Others require a rubric or human judgment.
When a model acts as a judge, test whether answer order, verbosity, confidence, or the judge's own style changes its scores; LLM judges have documented position and self-enhancement biases :citep[zheng2023mtbench].
Keep a small human-reviewed calibration set and report disagreement rather than treating the judge as ground truth.

The demonstration below separates deterministic probes from a rubric score.
Use it to inspect a failing task and decide whether the problem lies in the result, the rubric, or the evaluation setup.

{{ import "site/includes/model-eval-demo.html" }}

Literal task completion is not enough for an agent that can take actions.
The proposed "Genie coefficient" asks how far an agent's behavior departs from a reasonable interpretation of the user's intent :citep[raghavan2026genie].
It is a conceptual framework rather than a validated metric, but it suggests a useful evaluation split: score task success, permission compliance, unnecessary actions, side effects, and clarification quality separately.

For the course project, evaluate one representative AI-assisted task twice: once for the correctness of the produced artifact and once for the quality of the workflow that produced it.
Preserve the prompt or task brief, relevant context, model and tool versions, execution trace, checks, human corrections, and final acceptance decision.

## Observability and telemetry

A benchmark can reveal that the request distribution changed, but it does not necessarily explain why one request was slow.
Telemetry provides evidence about a running system through signals such as traces, metrics, and logs.
Observability is the broader capability to use that evidence to investigate system behavior, including failures you did not predict in advance.

[OpenTelemetry](https://opentelemetry.io/docs/what-is-opentelemetry/) is a vendor-neutral framework for generating, processing, and exporting telemetry.
It supplies APIs, SDKs, semantic conventions, and a Collector, but it is not itself a storage or visualization backend.
That distinction matters: instrumenting an application creates evidence, while operating the pipeline and asking useful questions turns that evidence into an observability practice.

### Simulated OpenTelemetry trace lab

The trace explorer below reuses the event-recording request from the benchmark demonstration.
Switch between a healthy write, a slow write, and a successful request that required a retry.
Select individual spans to inspect their duration, status, source, and attributes.
A span represents one timed unit of work and carries its own span ID, while every span in the same trace shares a trace ID.
The spans are not necessarily sent as separate network messages: an SDK can batch completed span records into one OTLP export request before a Collector processes and routes them.

{{ import "site/includes/otel-trace-demo.html" }}

The slow trace localizes most of the request time to connection waiting and event storage.
That is a stronger lead than the end-to-end latency alone, but it still does not establish root cause.
The next investigation might inspect database saturation, pool configuration, query behavior, or competing workloads.
Also notice that useful domain spans and attributes require conscious instrumentation, while generic HTTP spans can often be produced automatically.

> **Sustainability angle**
>
> It turns out measuring the energy consumption of web applications is difficult.
> You can learn more about the topic from the article _Challenges Related to Approximating the Energy Consumption of a Website_ :citep[kalliola2025energy].

## Observability with OpenTelemetry (OTEL)

Explanation should go here.

Demo should go here.

## Playwright and Lighthouse

Likely it would be a good idea to demonstrate the usefulness of Playwright and Lighthouse.
The idea is to show how to measure user flows through those and I have a paper doing this.
There's also a point to be made about variability (Herivcko et al.).

## Little's law

Explanation should go here.
Find also other related laws.

## References

::bibliography[]
