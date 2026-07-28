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

## Measuring browser journeys with Playwright and Lighthouse

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

### Browser performance workbench

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

### From page metrics to product metrics

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

### Run a page audit on your own machine

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

### Add a repeatable Playwright journey

PageSpeed Insights is convenient for navigation audits, but it cannot exercise a private or multi-step project flow.
Start with the standalone test below so the first Playwright exercise does not depend on a framework, development server, or route that may not exist.
Save it as `performance-flow.spec.ts` in a project created with `npm init playwright@latest`:

```ts
import { expect, test } from "@playwright/test";

test("filters recorded events", async ({ page }) => {
  await page.setContent(`
    <label>
      Filter events
      <input type="search" data-filter />
    </label>
    <ul aria-label="Events">
      <li>event.created</li>
      <li>storage.retry</li>
      <li>event.observed</li>
    </ul>
    <script>
      const filter = document.querySelector("[data-filter]");
      const events = [...document.querySelectorAll("li")];

      filter.addEventListener("input", () => {
        const query = filter.value.toLowerCase();
        for (const event of events) {
          event.hidden = !event.textContent.toLowerCase().includes(query);
        }
      });
    </script>
  `);

  await page.getByRole("searchbox", { name: "Filter events" }).fill("retry");
  await expect(page.locator("li:visible")).toHaveText(["storage.retry"]);
});
```

Run the journey visibly:

```sh
npx playwright test performance-flow.spec.ts --headed --trace on
```

Because `page.setContent()` creates the fixture inside the browser, this test works without `localhost` or network access.
It teaches locators, interaction, assertions, and trace inspection, but it does not measure application loading or network behavior.
After the standalone version passes, replace `page.setContent()` with the project's real route and adapt the accessible names while preserving the same user-visible contract.

Inspect the Playwright trace to verify what was clicked, requested, and rendered.
Use Lighthouse or PageSpeed Insights separately on a real local or deployed URL for performance metrics; the temporary page created by `page.setContent()` is not a Lighthouse audit target.
Keeping the functional assertion and the performance evidence separate makes a failure easier to interpret: the flow can be correct but slow, or fast because it failed to do the intended work.

Teams that need a repeatable CI gate can use the official `lighthouse` Node module or [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) to collect several runs and assert a budget.
Start with reporting rather than a strict pass/fail threshold, learn the normal variation of the runner, and only then set a budget with enough tolerance to detect a meaningful regression.

## From measurements to Little's Law

Measurements become more useful when they can be checked against a model.
Little's Law states that, for a stable system over a suitable observation period, average work in progress (`L`) equals the average arrival rate (`λ`) multiplied by average time in the system (`W`) :citep[little1961proof]:

`L = λW`

For an event pipeline, `L` can be the average number of events waiting or being processed, `λ` the average arrival rate, and `W` the average time from arrival to completion.
If 20 events arrive per second and each spends half a second in the system, the expected average work in progress is 10 events.

### Queue balance lab

Use the lab below to check whether three observed averages are mutually consistent.
Change one value at a time and explain whether the mismatch suggests overload, incompatible measurement windows, or a missing boundary.

{{ import "site/includes/little-law-demo.html" }}

The law does not identify the cause of latency, prove that a queue is healthy, or promise that the system can sustain any chosen arrival rate.
Before applying it, state the system boundary and check that arrivals and completions were approximately balanced during the observation window.
A large mismatch is a reason to inspect the measurement setup or system stability, not permission to force the numbers to fit.
