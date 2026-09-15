# How can we measure web applications and development workflows?

A page that feels fast on one developer's machine may behave differently under another workload, device, or network.
Benchmarking makes that comparison explicit; observability helps investigate the result.
Both need checks that the measured property still represents the outcome people want.

## Benchmark to test a claim

A **measurement** records a value for a property using a stated procedure.
A **benchmark** uses declared conditions to compare that property across workloads, systems, or revisions.
Begin with the decision the comparison should support: for example, whether the event tracker still records events within an agreed latency objective as concurrent demand increases.

Define the protocol before selecting a runner:

- **Decision and claim:** What comparison or threshold would change an engineering decision?
- **Workload:** Which event-recording, querying, filtering, or browser actions are performed, and in what mix?
- **Load:** How many users, requests, events, or concurrent sessions apply the workload, and for how long?
- **Boundary and conditions:** Which application revision, environment, data volume, cache state, dependencies, and client conditions are included?
- **Metrics and distribution:** Which latency, throughput, error, resource, or queue measurements answer the question, and which percentiles or ranges preserve important variation?
- **Acceptance and limits:** What result would support or challenge the claim, and what does the setup leave untested?

Tools such as [Artillery](https://www.npmjs.com/package/artillery) and [k6](https://k6.io/) can generate load, schedule scenarios, and collect observations from that protocol.
They cannot decide whether the workload represents real use, whether the boundary matches the question, or whether the comparison supports a statistically defensible conclusion.
An agent can help draft a script, but the generated workload, metrics, thresholds, and interpretation still have to be reviewed against the intended decision.

### Simulated benchmark lab

The demonstration below models 60 requests to an event-recording endpoint.
Change the number of concurrent clients, the share of requests that take a slow storage path, and the p95 latency objective.
The values are deterministic and run only in the browser, so this is a teaching model rather than a capacity test.

{{ import "site/includes/benchmark-simulation-demo.html" }}

Predict the default result before running the simulated workload, then compare the average with p95.
Treat the first result as a baseline, change one condition, and predict again before recording the comparison.
Record the workload, load, metric, and acceptance threshold together.

Synthetic benchmarks deliberately simplify reality.
They can omit workload mixes, client behavior, cache histories, data shapes, provider quotas, dependency contention, and failure combinations that appear in production.
A result therefore supports a claim only for its declared conditions.
Compare synthetic evidence with field telemetry where available, and revise the protocol when real behavior exposes a missing condition.

### Benchmark browser journeys with Playwright and Lighthouse

Server latency does not describe the whole user experience.
A browser still has to download resources, parse and execute JavaScript, calculate styles, lay out the page, paint it, and respond to input.
Three related tools expose different parts of that work:

- The browser's [Performance APIs](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API) can measure marks, durations, resources, and selected rendering events in the page itself.
- [Playwright](https://playwright.dev/) drives a real browser through a repeatable user journey and checks whether the expected behavior occurred.
- [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/) audits a page in a controlled lab setup and reports performance metrics and diagnostics.

These tools are complementary rather than interchangeable.
A Playwright test can prove that filtering the event list produces the expected rows, but its elapsed test time is not a Web Vital.
A Lighthouse navigation can diagnose initial page load, but it does not prove that the application's business flow works.
Lighthouse user flows can audit interactions, although they require browser automation outside the page; a normal web page cannot grant itself the required browser-control privileges.

#### Browser performance workbench

The workbench below runs completely in the current page.
It builds and filters an event list either as one uninterrupted task or in batches that yield to the browser.
It measures from the start of the work until the next painted frame, repeats the same flow five times, and reports both total time and the longest JavaScript slice observed by its own instrumentation.

{{ import "site/includes/browser-performance-workbench.html" }}

Before each measurement, predict which strategy will finish sooner and which will leave the main thread available sooner.
Run both strategies with the same number of events.
Then increase the workload and check whether the conclusion remains the same.

This is a real measurement, but it is deliberately narrow.
The timer includes work performed by this demo on this browser and device; it is not a Lighthouse score, INP measurement, or claim about other users.
The chunked strategy may take longer overall because it waits between batches while still improving responsiveness by avoiding one long uninterrupted task.
This distinction between throughput and responsiveness is often more useful than asking which version is simply "faster."

For client-side collection in a real application, the small [web-vitals](https://github.com/GoogleChrome/web-vitals) library implements LCP, INP, CLS, FCP, and TTFB using browser APIs and follows the same measurement rules used by Google's web-performance tools.
Those measurements describe actual page visits.
Lighthouse instead provides synthetic lab evidence under declared conditions.

#### From page metrics to product metrics

A page-level metric may describe a different element from the one the user came to see.
For the event tracker, define a milestone such as the event list becoming visible and usable.
[Element Timing](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceElementTiming) can report rendering of a supported annotated element; application instrumentation and interaction checks can establish the remaining behavior.
Choose the signal from the product question, name its collection rule, and record the browsers and users represented.
Paint evidence alone cannot establish that a region is interactive or correct.

#### Audit a representative page

Use [PageSpeed Insights](https://pagespeed.web.dev/) for the lowest-setup version of the exercise.
It runs Lighthouse remotely, so the target page must be deployed at a publicly reachable URL; a development server at `localhost` is not reachable by the service.

1. Choose one representative public route and state why it matters to a user.
2. Select the mobile profile and run the same URL five times without changing the application.
3. Record LCP, TBT, CLS, transferred bytes, and the overall performance score for every run.
4. Report the median and the fastest-to-slowest range for each time-based metric.
5. Select one Lighthouse diagnostic, make one change, deploy it, and repeat the five runs under the same conditions.
6. State the narrow conclusion supported by the comparison and at least one factor it does not control.

The PageSpeed Insights result can include Lighthouse lab data and, for sufficiently popular public pages, field data derived from real Chrome visits.
Keep those sources separate: lab and field measurements use different populations and conditions.

If the application is not public, open it in Chrome, select **Developer Tools → Lighthouse**, choose the mobile profile, and generate a report locally.
Close unrelated applications where practical, do not run audits concurrently, and keep the browser version, profile, URL, application version, and machine consistent.

Performance values vary even when the application has not changed because the browser, client hardware, resource contention, network, and server introduce noise.
:citet[hericko2021representative] found that five consecutive Lighthouse runs aggregated with the median greatly reduced variability in their experiment.

#### Study a repeatable Playwright journey

PageSpeed Insights is convenient for navigation audits, but it cannot exercise a private or multi-step project flow.
The standalone Playwright lab separates a small event-filter fixture from the browser journey that exercises it, so you can inspect locators, interaction, assertions, and trace collection without first adapting the example to a framework.
[Study the source](https://github.com/bebraw/scalability_book/tree/main/labs/playwright-journey) or [download the standalone lab](/downloads/labs/playwright-journey.zip).

The example establishes that filtering produces the expected visible row.
It does not measure application loading, network behavior, or Web Vitals because it opens a local fixture.
After it passes, replace the fixture URL with the project's real route and adapt the accessible names while preserving the same user-visible contract.
Inspect the trace to verify what was acted on and rendered, then use Lighthouse or another suitable performance tool separately; the flow can be correct but slow, or appear fast because it failed to perform the intended work.

For a repeatable CI gate, [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) can collect runs and assert a budget; measure the runner's normal variation before choosing its threshold.

### Check measurements against a model

Measurements become more useful when they can be checked against a model.
Little's Law states that, for a stable system over a suitable observation period, average work in progress (`L`) equals the average arrival rate (`λ`) multiplied by average time in the system (`W`) :citep[little1961proof]:

`L = λW`

For an event pipeline, `L` can be the average number of events waiting or being processed, `λ` the average arrival rate, and `W` the average time from arrival to completion.
If 20 events arrive per second and each spends half a second in the system, the expected average work in progress is 10 events.

#### Queue balance lab

Use the lab below to check whether three observed averages are mutually consistent.
Change one value at a time and explain whether the mismatch suggests overload, incompatible measurement windows, or a missing boundary.

{{ import "site/includes/little-law-demo.html" }}

The law does not identify the cause of latency, prove that a queue is healthy, or promise that the system can sustain any chosen arrival rate.
Before applying it, state the system boundary and check that arrivals and completions were approximately balanced during the observation window.
A large mismatch is a reason to inspect the measurement setup or system stability, not permission to force the numbers to fit.

## Measurements can lead you astray

Goodhart's law describes how a metric can stop tracking the desired outcome when it becomes a target :citep[goodhart1975monetary].
Software dashboards and quality gates make such proxies easy to optimize.

Consider a few examples:

- Test coverage can reveal unexercised code, but a coverage target can reward assertions that execute lines without checking meaningful behavior.
- A Lighthouse score can direct attention to performance problems, but optimizing only the score can remove valuable functionality or tune a page for the audit rather than its users.
- Mean latency can improve while tail latency or error rate becomes worse.
- Agent task pass rate can rise because tasks, judges, or outputs become tailored to the evaluation set rather than because the workflow handles new work better.
- Commit count, generated lines, and closed tickets can all increase while review and maintenance costs grow elsewhere.

Goodhart's law does not imply that targets or metrics are useless.
It means that the measurement system changes once people or agents can adapt to it.
A quality gate should therefore be treated as a partial model of the desired outcome, not as the outcome itself.

For an important target, record four things:

1. **Outcome:** What user or operational result is the metric intended to represent?
2. **Proxy:** Why should the chosen measure move with that outcome under the current conditions?
3. **Gaming path:** How could the number improve without the outcome improving?
4. **Counterevidence:** Which second signal, failure review, or qualitative check would expose that divergence?

Keep raw distributions and failed examples available instead of retaining only an aggregate score.
Review the proxy when the workload, system, incentives, or development process changes.
An effective metric is not permanently valid; it is a hypothesis that must survive contact with the behavior it influences.

### Field note — Slideotter

[Slideotter](/case-studies/slideotter/) let me test whether a local language model could support presentation authoring.
Using Qwen3.5-9B through the project's generation harness, I found that it could usually produce semantically sensible drafts: the slides contained information related to the requested topic and formed a recognizable presentation.
That established adequacy, not excellence.
Some slides remained weak or misunderstood my intent.

This conclusion came from my editorial review rather than a separate evaluation.
The observed result belonged to the complete configuration—model, prompts, schemas, validators, and review workflow—so I could not confidently attribute poor outputs to the model rather than the harness.
Structural and rendering checks could establish that a deck was valid; they could not establish that it was a good response to what I meant.

### Goodhart pressure test

The challenge below turns that four-part review into two decisions.
First choose a proxy and predict how an optimizer will respond when the number becomes a target.
Then inspect the displaced cost and revise the gate so that improving the proxy cannot compensate for losing the intended outcome.
The scenarios use deterministic illustrative values to make the feedback loop visible; they are not empirical comparisons between tools or teams.

{{ import "site/includes/goodhart-challenge-demo.html" }}

Try at least two targets.
Notice that monitoring the proxy is still useful after the repair, but it no longer decides success alone.

### Resource proxies are not the outcome

Energy use is harder to measure than latency or transferred bytes, and neither of those proxies is an automatic substitute for it :citep[kalliola2025energy].

EcoAssist illustrates the need to check the product alongside resource use :citep[barrocas2026ecoassist].
Its before-and-after benchmark reported reduced local CPU and GPU energy on selected standalone webpages using one M4 MacBook and Chrome testbed.
In a separate lab study, some participants observed removed content or changed layouts after optimization.
The measurements concern those pages and that device, exclude the optimizing model's full footprint, and are not a whole-system carbon estimate.
An optimization must preserve the intended behavior as well as improve the selected resource measure.

Run one bounded optimization experiment:

1. Choose one representative Playwright journey and preserve its baseline.
2. Make one targeted AI-assisted frontend optimization.
3. Run the same journey under the same declared conditions before and after the change.
   If the chosen signal varies, repeat each condition at least five times.
4. Record direct energy only if the platform exposes a defensible measure.
   Otherwise label transferred bytes, JavaScript or asset size, CPU time, or long-task time as **resource proxies**, not energy or carbon.
5. For a deterministic measure such as built asset size, report one value per condition.
   For a run-varying measure, report the median and range.
6. Re-run the functional checks, inspect for visual or accessibility regressions, note rejected suggestions or regressions, and state what the comparison cannot establish.

## Measurement alone cannot explain behavior

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

## Observe the agentic workflow too

Observe the development workflow as well as the application.
In both, outcome checks establish what worked and traces help explain the path to that result.

| Evidence role         | Web application                                         | Agentic development workflow                               |
| --------------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| Outcome to protect    | Useful user and operational behavior                    | Accepted implementation and maintained project goal        |
| Controlled comparison | Benchmark run under a declared workload                 | Bounded task or evaluation trial                           |
| Diagnostic evidence   | Logs, metrics, request traces, and profiles             | Prompts, tool calls, diffs, checks, and retries            |
| Configuration         | Revision, deployment, dependencies, and resource limits | Model, agent harness, tools, starting revision, and limits |
| Intervention          | Operator diagnosis, mitigation, and recovery            | Human review, correction, approval, and escalation         |

::caption[Parallel evidence roles in a running web application and its agentic development workflow.]
::label[table:application-agent-workflow-evidence]

Keep the **task**, one attempted **trial**, its actual **outcome**, and the **trace** that led there distinct.
Grade the outcome; use the trace to diagnose failures, account for cost and intervention, and check requirements such as permission compliance.
Bind the result to the model and runtime where exposed, harness, tools, starting revision, resource limits, and routing or fallback.

Use the same reporting categories across A, B, and C: accepted outcome, checks, elapsed time, retries, cost or resource use, human correction, and known limits.
Generated lines and transcript length can hide work shifted into review or maintenance; they do not replace these outcome measures.
[Appendix A](/appendices/evaluating-agentic-workflows/) develops grader design, repeated trials, uncertainty, and configuration qualification.

> **From a coding task to software delivery**
>
> A faster patch is only one part of getting a useful change into production.
> DORA's five delivery metrics cover change lead time, deployment frequency, failed deployment recovery time, change fail rate, and deployment rework rate :citep[harvey2026dorametrics].
> Interpret them together for one application or service over a declared period.
> They describe delivery throughput and instability, while the task record above describes one attempt at producing a change.
>
> Consider an invented timeline: work starts at 09:00, a patch is committed at 09:20, and it reaches production at 15:00.
> The twenty-minute interval ends at a commit; DORA change lead time runs from that commit to deployment, five hours and forty minutes later.
> If the deployment fails and service recovers at 15:30, record the thirty-minute recovery separately.
> Failed and incident-driven deployments also belong in the period's failure and rework counts, with their denominators stated.
>
> A short project may have too few deployments or failures for stable rates.
> Use this timeline to interpret the measurement boundaries; individual rankings and an uncontrolled before/after chart cannot establish an AI effect.

### Field note — Preserve accepted context, not every interaction

I have not established a practice of preserving complete agent transcripts or detailed workflow telemetry.
When returning to a project, I rely mainly on code, documentation, and commit history to recover the implemented state and accepted intent.

Architecture Decision Records are especially useful.
[Vibe Template's ADR workflow](https://github.com/bebraw/vibe-template/blob/main/docs/adrs/README.md) keeps proposed, accepted, implemented, and superseded decisions distinct.
I let agents draft records, but negotiate important choices carefully; implementation can then expose what an unresolved decision still needs to settle.

Those records preserve the rationale I accepted, not every prompt, disagreement, retry, or abandoned path.
They cannot reconstruct the complete agent workflow.
For the course comparison, preserve the selected task's trace and correction record while the work happens, rather than trying to infer them later from the accepted repository.

## Project artifact

Add implementation A's measurement baseline to the [Establish evidence bundle](/project/establish/):

- the representative runtime workload, load, conditions, prediction, thresholds, and results, including distributions for varying measurements;
- one explanatory telemetry signal and inspected failure, with the first warning that behavior is leaving the measured conditions;
- one representative AI-assisted task and its configuration, trace, checks, retries, correction, cost or resource use, and acceptance decision.

Tie the records to the application revision and retain the reporting frame for B and C.
State what each comparison leaves untested.

## Summary

A benchmark tests a claim under declared conditions; telemetry helps investigate the behavior it reveals.
Preserve variation and check that an improved proxy still represents the desired outcome.
For agent-assisted work, evaluate the accepted artifact and use configuration, attempts, and interventions to explain how it arose.
