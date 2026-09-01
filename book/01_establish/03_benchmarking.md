# How can we measure web applications and development workflows?

You cannot evaluate a property of a web application without evidence about it.
A page that feels fast on one developer's machine does not establish how it behaves for other devices, workloads, data volumes, or network conditions.
Benchmarking turns a question about that behavior into a controlled comparison.

Measurement is necessary, but it is not self-explanatory.
A metric can represent the wrong outcome, conceal variation, or become misleading when people and agents optimize for it.
Even a trustworthy result can show that behavior changed without explaining why.
This chapter therefore moves from benchmarking, through the limits of measurement, to observability and finally to evidence about the agentic workflow that produced the application.

## Benchmark to test a claim

A **measurement** assigns evidence to an observed property.
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
The useful lesson is not the simulated number itself: it is that the workload, load, metric, and acceptance threshold have to be stated together.

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

Standard browser metrics deliberately use definitions that work across many kinds of pages.
That makes them comparable, but the element selected for a metric such as LCP is not necessarily the part of the interface that a user came to see.
An event tracker might care when its event list becomes visible; another application might care about a search-results region, product summary, or account overview.
The measurement boundary should follow the question rather than whichever element happens to be largest.

[Element Timing](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceElementTiming) can report when one annotated image or text element rendered.
The experimental [Container Timing API](https://csswizardry.com/2026/07/meaasuring-component-performance-with-the-container-timing-api/) extends that idea to an author-defined DOM region and reports a sequence as new contentful areas inside it are painted.
That sequence can reveal whether a component appeared together or accumulated through several delayed stages, moving the measurement boundary from a browser-selected element toward a user-recognizable product component.

Container Timing does not declare that a component is complete, interactive, accurate, or ready to use.
Those are product claims that may require application instrumentation or interaction measurements in addition to paint evidence.
Because the API is experimental, its immediate value here is the design principle rather than the exact interface: choose a meaningful region, give the signal a stable name, state how an entry is selected from the sequence, sample collection deliberately, and record which browsers and users the dataset represents.

For the course project, choose one user-recognizable region and define what useful evidence would mean for it.
Then decide whether a page-level Web Vital, one Element Timing entry, a sequence of container paints, or an application milestone best supports that claim, and explain what the chosen signal cannot prove.

#### Run a page audit on your own machine

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

Teams that need a repeatable CI gate can use the official `lighthouse` Node module or [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) to collect several runs and assert a budget.
Start with reporting rather than a strict pass/fail threshold, learn the normal variation of the runner, and only then set a budget with enough tolerance to detect a meaningful regression.

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

[Goodhart's law](https://en.wikipedia.org/wiki/Goodhart%27s_law) states: "Any observed statistical regularity will tend to collapse once pressure is placed upon it for control purposes" :citep[goodhart1975monetary].
In plain language, the relationship that made a metric informative can break down when that metric is used as a target.
The familiar shorthand is that a measure tends to stop being a good measure when it becomes the target.
This is especially relevant to software because dashboards and quality gates make measurable proxies easy to optimize.

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

:citet[barrocas2026ecoassist] provide one bounded example of a before-and-after energy study.
On a single M4 MacBook and Chrome testbed, the authors report a mean 13.4% reduction in local CPU and GPU energy, recorded with Powermetrics after EcoAssist optimized 500 standalone webpages selected for a size above 600 KB and at least ten DOM-affecting operations.
The sample therefore emphasizes pages with substantial optimization potential and does not represent arbitrary production applications.
The benchmark compared each optimized page with its own unoptimized baseline, not with another optimizer.

In a separate single-condition lab study, twenty early-career developers generated and optimized portfolio pages and reported low workload.
The study did not compare productivity against a control, and five participants observed removed content or layout changes after optimization.
The reported before-and-after page measurements do not include the optimizing model's full training and inference footprint; the paper estimates that overhead separately, and neither result is a whole-system carbon estimate.
Treat the optimization as a candidate change that must preserve the intended product behavior, not as evidence that a lower energy number is automatically better.

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

Agentic development introduces a second system to observe: the development workflow that produces and changes the web application.
The parallel is useful as long as outcome evidence remains separate from diagnostic traces.
An HTTP trace can explain how a request traveled through the application but does not prove that the user received the correct result; an agent transcript can explain how a change was produced but does not prove that the accepted implementation is correct.

| Evidence role         | Web application                                         | Agentic development workflow                               |
| --------------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| Outcome to protect    | Useful user and operational behavior                    | Accepted implementation and maintained project goal        |
| Controlled comparison | Benchmark run under a declared workload                 | Bounded task or evaluation trial                           |
| Diagnostic evidence   | Logs, metrics, request traces, and profiles             | Prompts, tool calls, diffs, checks, and retries            |
| Configuration         | Revision, deployment, dependencies, and resource limits | Model, agent harness, tools, starting revision, and limits |
| Intervention          | Operator diagnosis, mitigation, and recovery            | Human review, correction, approval, and escalation         |

::caption[Parallel evidence roles in a running web application and its agentic development workflow.]
::label[table:application-agent-workflow-evidence]

For a bounded task, record whether the resulting artifact passed its acceptance checks, how long the work took, what it cost, how many retries occurred, and how much human review or correction it required.
Generated lines of code, transcript length, and nominal hours saved are weak outcome measures because they can move work into review, rework, or maintenance.
Organizations report broad AI adoption and perceived productivity gains, while objective measurement of productivity and quality remains limited :citep[giray2025adoption].

Keep the **task**, one attempted **trial**, its actual **outcome**, and the **trace** that led there distinct.
Grade the outcome when several valid paths can solve the task; use the trace to diagnose failures, account for intervention and cost, and check process requirements such as permission compliance.
A plausible transcript does not prove that the claimed change occurred, while one repository test is usually only one check on the result.

Bind each result to the configuration that produced it: the model and runtime where exposed, the agent harness and tools, the starting revision, relevant resource limits, and any routing or fallback.
Then preserve the same reporting categories across implementations A, B, and C: accepted outcome, checks, elapsed time, retries, cost or resource use, human correction, and known limits.
Treat the comparison as evidence about those tasks and conditions rather than a universal model or workflow ranking.

### Field note — Preserve accepted context, not every interaction

I have not established a practice of preserving complete agent transcripts or detailed workflow telemetry.
When I return to an agent-assisted project, I rely mainly on its code, resulting documentation, and commit history.
The code shows the implemented state, the documentation describes the intended system, and the history preserves how both changed over time.
Together they provide durable context for future human and agent work without requiring every interaction to remain available.

Architecture Decision Records are especially valuable to me.
I let agents draft and amend them, but I prompt and negotiate important decisions with care.
A strong initial prompt can set the project direction and reduce uncertainty by narrowing the space the agent has to interpret.
When I do not yet understand the domain well enough, leaving some details open can be appropriate; implementation and review can then expose what the next decision needs to settle.

[Vibe Template](https://github.com/bebraw/vibe-template) codifies this practice in its [ADR workflow](https://github.com/bebraw/vibe-template/blob/main/docs/adrs/README.md).
A lasting architectural change must add or update an ADR in the same change set.
Proposed, accepted, and implemented decisions have distinct lifecycle states, and an ADR reaches `implemented` only when the repository actually reflects it.
Superseded decisions remain available as history rather than disappearing when the direction changes.

An ADR is still an interpretation.
It records the rationale, alternatives, trade-offs, and decision that I accepted; it is not a neutral transcript of every prompt, disagreement, or abandoned path.
Code, documentation, ADRs, and commit history can therefore preserve accepted project context without fully reconstructing the agentic workflow that produced it.

Tracking prompts, retries, model use, correction effort, cost, or other workflow signals could reveal more.
I have not yet researched that practice deeply enough to know which additional evidence would justify its collection and maintenance cost.

For the Establish project, choose one representative AI-assisted task and preserve its task brief, relevant context, configuration, outcome, checks, trace, corrections, and acceptance decision.
The later implementations can reuse the reporting frame without pretending that one task is a statistically stable benchmark.

For the complete evaluation vocabulary, grader design, configuration qualification, repeated-trial methods, uncertainty, and routing experiments, continue with [Appendix A: Evaluating agentic development workflows](/appendices/evaluating-agentic-workflows/).

## Project artifact

Complete the measurement and observation baseline required by the [Establish project specification](/project/establish/).
Preserve it with implementation A so the same reporting categories can be applied to implementations B and C.
Include:

- one representative runtime workload, load level, system boundary, and predicted result,
- the runtime and browser-visible metrics collected, their acceptance thresholds, and the observed distribution where the values vary,
- one telemetry signal or trace that helps explain the result,
- one bounded AI-assisted task with its configuration, outcome, checks, trace, retries, human correction, and acceptance decision,
- the application revision and relevant environment conditions,
- and one inspected failure, the limits of the evidence, and the first signal that would warn the group that behavior is moving outside the measured conditions.

This is a local baseline for a declared application and development setup, not a universal ranking of models, tools, or architectures.

## Summary

Benchmarking turns a question about web behavior into a disciplined comparison rather than a collection of isolated numbers.
A useful benchmark begins with a decision or prediction, defines a representative workload and system boundary, controls relevant conditions, repeats measurements that vary, and preserves the baseline.
Formal relationships such as Little's Law can check whether observations are mutually consistent, but they do not replace that declared boundary.

The resulting numbers remain partial evidence.
Goodhart's law explains why a proxy can lose its relationship to the intended outcome once it becomes a target, while distributions, counterevidence, and regression checks make that divergence easier to see.
Telemetry and observability address a different limitation: they help investigate where and why measured behavior occurred, including conditions the benchmark did not anticipate.

The same separation applies to agentic development.
The accepted implementation is the outcome to evaluate; the agent trace, configuration, retries, and human interventions are evidence for explaining how that outcome arose.
Neither an application trace nor an agent transcript proves correctness by itself.
