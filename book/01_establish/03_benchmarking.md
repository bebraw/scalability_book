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

It is important to note that while synthetic benchmarks like these are useful, they can be limited by their nature since they might omit factors visible in a production environment.
For example, it can be difficult to simulate what happens under load when many users are performing certain kinds of actions you cannot anticipate.
It is possible that real usage will exercise portions of your system you did not think to benchmark especially if your application is complex.
Under these conditions, you may hit third-party limitations you might not expect or there might be something in your infrastructure that breaks under specific kind of loads.
It is for this reason learning chaos engineering can be useful since it tests exactly what happens when a piece of infrastructure breaks since that is exactly what can happen in practice at the worst possible moment.

> **Sustainability angle**
>
> It turns out measuring the energy consumption of web applications is difficult.
> You can learn more about the topic from the article _Challenges Related to Approximating the Energy Consumption of a Website_ :citep[kalliola2025energy].

## References

::bibliography[]
