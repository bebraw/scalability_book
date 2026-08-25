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

## When a measure becomes a target

[Goodhart's law](https://en.wikipedia.org/wiki/Goodhart%27s_law) warns that a statistical relationship used for observation can break down when pressure is applied to it as a control target :citep[goodhart1975monetary].
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

### Goodhart pressure test

The challenge below turns that four-part review into two decisions.
First choose a proxy and predict how an optimizer will respond when the number becomes a target.
Then inspect the displaced cost and revise the gate so that improving the proxy cannot compensate for losing the intended outcome.
The scenarios use deterministic illustrative values to make the feedback loop visible; they are not empirical comparisons between tools or teams.

{{ import "site/includes/goodhart-challenge-demo.html" }}

Try at least two targets.
Notice that monitoring the proxy is still useful after the repair, but it no longer decides success alone.

## Evaluating agentic workflows

The development workflow is also a system that can be benchmarked.
For a bounded task, record whether the result passed its acceptance checks, how long it took, what it cost, how many retries occurred, and how much human review or correction it required.
Generated lines of code and nominal hours saved are weak outcome measures because they can move work into review, rework, or maintenance.
This distinction matters in practice: organizations report broad AI adoption and perceived productivity gains, while objective measurement of productivity and quality remains limited :citep[giray2025adoption].

### Anatomy of an agent evaluation

A software test usually invokes known code with controlled inputs and checks the result.
An agent evaluation must also define the situation in which a model acts, because tool access, instructions, the starting repository, resource limits, and intermediate state can all change the result.
The following vocabulary helps keep those layers separate :citep[grace2026demystifying]:

- A **task** is one problem with declared inputs and success criteria.
- A **trial** is one attempt at that task.
  Repeated trials expose variation in the agent's behavior; they do not create new independent tasks.
- The **outcome** is the state left at the end of a trial, such as a working patch, updated database, or generated artifact.
- The **trace** or **transcript** records the path to that state, including outputs, tool calls, intermediate results, and relevant interventions.
- A **grader** checks one aspect of the outcome or trace through code, a model-based rubric, or human judgment.
- The **agent harness** runs the model-and-tool loop, while the **evaluation harness** provisions tasks and environments, invokes the agent harness, preserves evidence, applies graders, and aggregates results.
- An **evaluation suite** groups tasks intended to measure a declared capability or behavior.

These terms describe different measurement objects.
A repository test is often one deterministic grader inside an agent evaluation rather than the entire evaluation.
A public benchmark is a shared evaluation suite designed for comparison across systems, while a local product or project evaluation should represent the work and failure modes that matter in its own setting.
An RL environment additionally exposes a reward signal for optimization or training.
Treating these as synonyms hides differences in task selection, incentives, and supported claims.

Prefer grading the outcome when several valid paths can solve the task.
Use the trace to diagnose failures, account for cost and intervention, and check process requirements that genuinely matter, such as permission compliance or a mandatory approval.
Rigidly requiring one anticipated sequence of tool calls can reject a valid solution, while accepting only the final statement can miss that the claimed change never occurred.

### Capability and regression evals

A **capability eval** asks whether the workflow can perform work that is currently difficult.
Its initial pass rate may be low because it is intended to reveal a boundary and provide room for improvement.
A **regression eval** asks whether the workflow still handles previously accepted work and should normally pass almost all trials :citep[grace2026demystifying].
When a capability task becomes reliably solvable, preserve it as a regression task rather than discarding the evidence and starting over.

Start with tasks already checked manually, consequential failures, and representative project changes.
For each task, keep a reference solution or known passing run to show that the stated problem is solvable and the graders can accept at least one correct outcome.
Everything required by a grader should be justified by the task brief or a declared invariant; an agent should not fail because the evaluator silently assumed a filepath, output format, or environmental resource.
Balance positive and negative cases so optimizing one behavior does not produce its opposite failure elsewhere.

### The eval suite is also software

Terminal-Bench provides a concrete example of a versioned agent benchmark whose tasks combine instructions, container environments, resource limits, reference solutions, and executable tests.
Terminal-Bench 2.1 changed 26 tasks from the earlier suite to repair bugs, adjust timeouts or resources, and improve robustness against reward hacking :citep[terminalbench2026v21].
Its `fix-code-vulnerability` task, for example, pins a Bottle source revision and Python image, specifies CPU, memory, storage, and time limits, requires both a patch and a structured report, and checks the result with original and security-focused tests.

The revisions make a methodological point more important than a leaderboard position: the measurement instrument can be wrong.
Ambiguous instructions, incomplete graders, leaked state, shared caches, resource contention, and permissive reference matching can create failures or passes unrelated to the intended capability.
Record the suite version and environment with every result, validate a reference solution, start trials from clean state, and read selected traces before trusting an aggregate score.
When a task or grader changes materially, do not silently compare the new score with results from the previous instrument.

For this course, inspecting one packaged benchmark task is more useful than running the entire public suite.
Identify its claimed capability, starting state, visible instructions, hidden or external assumptions, graders, reference solution, resource boundary, and plausible gaming paths.
Then state what a passing result would and would not establish.
The exercise teaches benchmark anatomy without replacing the project's local tasks with a heterogeneous and potentially expensive leaderboard workload.

> **Advanced option: derive candidate tasks from repository history**
>
> Repo2RLEnv can mine merged pull requests or commits, reconstruct repository states in Docker, and emit Harbor-compatible tasks whose primary runtime signal comes from the repository's own tests :citep[huggingface2026repo2rlenv].
> Its runtime pipelines use the familiar fail-to-pass and pass-to-pass shape: tests associated with the change should begin failing and pass under the reference patch, while previously passing behavior should remain intact.
> This can help an instructor or a mature project turn reviewed changes into candidate evaluation data, but it is not a course baseline and does not make every repository an informative RL environment.
> History records changes that happened, not a representative sample of future work; tests can omit intended behavior; generated instructions can leak or distort the problem; and similarity to an oracle diff can penalize a different valid patch.
> An executable reward is verifiable under its grader, not automatically complete ground truth.

Some outcomes can be checked deterministically through tests, schemas, or expected artifacts.
Others require a rubric or human judgment.
When a model acts as a judge, test whether answer order, verbosity, confidence, or the judge's own style changes its scores; LLM judges have documented position and self-enhancement biases :citep[zheng2023mtbench].
Keep a small human-reviewed calibration set and report disagreement rather than treating the judge as ground truth.

:citet[falck2026training] offer a useful case in which evaluation becomes supervision.
Their Replica setup trains a 27B agent on 242 figure-replication tasks using auto-generated per-task rubrics, three judge samples, and turn-level credit assignment, then scores it on 68 held-out AI-for-science tasks.
The rubric judge was more repeatable than a generic judge in the paper's repeated-sampling analysis.
In a blinded study of ten training tasks selected because the judges disagreed, its Kendall rank correlation with expert rankings was 0.19 rather than 0.15 for the generic judge; on disputed pairs, experts sided with the rubric judge 63% of the time, a difference that was not statistically significant (`p = 0.109`).
Because the same judge design supplied training rewards and the headline evaluation, the task holdout did not make the scoring process independent.
The evidence supports a bounded claim about a lower-noise training signal and improved scores under this judge, not that the judge is ground truth or that the system performs open-ended scientific innovation.

The demonstration below separates deterministic probes from a rubric score.
Use it to inspect a failing task and decide whether the problem lies in the result, the rubric, or the evaluation setup.

{{ import "site/includes/model-eval-demo.html" }}

[Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance/get-started#how-is-accuracy-ensured) provides a concrete example of evaluating an imported agent capability.
Its evaluation harness first checks browser assertions against both a reference implementation and a deliberately flawed implementation, then compares agent runs with and without the guidance.
A project can reproduce the smaller experimental shape: hold the task, model, starting repository, and acceptance checks constant; change whether the capability is available; and compare correctness, retries, cost, and human correction.
The resulting difference measures performance on that task and those checks, not whether the guidance makes every application better in production.

Literal task completion is not enough for an agent that can take actions.
The proposed "Genie coefficient" asks how far an agent's behavior departs from a reasonable interpretation of the user's intent :citep[raghavan2026genie].
It is a conceptual framework rather than a validated metric, but it suggests a useful evaluation split: score task success, permission compliance, unnecessary actions, side effects, and clarification quality separately.

For the course project, evaluate one representative AI-assisted task twice: once for the correctness of the produced artifact and once for the quality of the workflow that produced it.
Preserve the prompt or task brief, relevant context, model and tool versions, execution trace, checks, human corrections, and final acceptance decision.

### Report uncertainty, not only point estimates

An evaluation observes a finite set of tasks under declared conditions.
A difference in average score or acceptance rate is therefore an estimate, not a stable ranking of two models or workflows.
In a systematic review of 445 new or substantially modified LLM benchmark papers, only 16.0% used uncertainty estimates or statistical tests to compare results :citep[bean2025measuring].
Earlier work on NLP evaluations likewise found that small test sets can lack the power to distinguish plausible improvements and that effects detected by underpowered studies can be exaggerated :citep[card2020littlepower].

When possible, run both candidates on the same task IDs and predeclare how repeated calls become one task-level result.
Repeated calls reveal variation within a task; they do not turn one task into many independent tasks.
If many tasks are variants of one template, repository, or issue family, disclose that dependence and narrow the claim.

When a protocol permits `k` trials per task, name the reliability question before selecting a summary.
**Pass@k** asks whether at least one of the `k` trials succeeds and is useful when several attempts are genuinely available and one accepted solution is enough.
**Pass^k** asks whether all `k` trials succeed and is useful when users need the behavior to be dependable every time :citep[grace2026demystifying].
More attempts make pass@k easier to satisfy and pass^k harder, so the same workflow can look increasingly capable by one measure and increasingly unreliable by the other.
Predeclare `k`, budgets, stopping rules, and whether failed attempts remain in latency and cost totals; do not use pass@k to imply first-attempt reliability.

Report the independent task count, task source, one predeclared primary outcome, and observed paired difference.
If a course-provided or otherwise justified paired interval method fits the outcome, include the interval and name the method.
Before inspecting results, define the signed difference and the practical boundary or bounds that would change the decision.
Only an interval wholly on the required side of a boundary supports that local decision; overlap leaves it inconclusive, and statistical separation can still describe a difference too small to matter.
An interval containing zero is not proof that the candidates are equal.
Treat other metrics and unplanned slices as descriptive or exploratory unless their joint decision rule and multiple-comparison treatment were declared in advance.
When no defensible interval is available, show the raw paired outcomes, label the comparison exploratory, and restrict the claim to those tasks.
An interval still describes uncertainty conditional on the sample and scoring process; it cannot repair unrepresentative tasks, judge bias, contamination, or a changed harness.

**Paired comparison check.**
For one predeclared binary acceptance result per independent task, count tasks accepted by both candidates, only the first, only the second, or neither.
Use an instructor-supplied interval or a justified paired method to interpret those counts against the predeclared decision boundary; do not compare two separate error bars.
The single representative project task above remains a case comparison; use this check with a multi-task project cohort or instructor-provided data.

### From evaluation to routing

A lower per-request price does not necessarily make a model cheaper for a task.
An inexpensive attempt that fails may have to be repeated with a stronger model, while still consuming context, validation, and review time.
Conversely, always selecting the strongest available model can waste capacity when a smaller model can reliably clear the same acceptance bar.
The useful comparison is therefore cost per accepted outcome, not token price or first-attempt cost.

Research distinguishes **routing**, which selects one model before it produces an answer, from **cascading**, which begins with one model and escalates when evidence indicates that its answer is insufficient.
Both depend on an accurate quality estimate; :citet[dekoninck2025routing] identify estimator quality as a critical condition for improving the cost-performance trade-off.
In their SWE-Bench experiment, the post-generation estimator could use the task's ground-truth test outcomes.
The result therefore shows what a strong verifier can enable, not how well the approach works for tasks without one.
Databricks presents routing as an emerging coding-agent cost-control technique and reports an internal benchmark result, but publishes too little about that router evaluation to predict savings in another codebase :citep[wendell2026codingcosts].
This motivates a local experiment, not a promised saving.

When access rules permit both models—or when instructor-provided outputs are available—choose an efficient and a stronger model within the same declared harness and assemble a small set of representative tasks.
Keep near-duplicates and tasks from the same module in the same partition, using one partition to define the policy and reserving the other for held-out evaluation.

Define two evidence layers before running the comparison.
The **policy-visible gate** may use deployable signals such as public tests, builds, or static checks to decide whether a cascade should escalate.
The **final adjudicator** uses held-out tests or blinded human review that the policy cannot see; only this layer decides whether the final outcome is accepted.
A policy that stops after passing its visible gate but fails final adjudication is a false acceptance.

On the first partition, define and freeze either a routing rule that uses only facts available before generation or a cheap-first cascade that uses the policy-visible gate after its first result.
Freeze the task features, thresholds, prompts, model and harness versions, budgets, retry rules, and exclusion rules before inspecting the held-out results.
Compare the policy with always using either model and, when the task set permits it, random selection at the same stronger-model call rate.
The random baseline tests whether the policy selects useful cases rather than benefiting only from its mixture of models.

Report accepted outcomes over all attempted tasks, stronger-model calls, end-to-end latency, human correction, and total cost per accepted outcome.
Count timeouts, tool failures, missing patches, and budget exits as attempted failures.
Include policy decisions, quality estimation, rejected attempts, fallbacks, repeated context, validation, review, and rework in the cost; report unpriced resources separately.
If both model arms are run to reveal counterfactual mistakes, keep that one-time evaluation expense separate from each policy's simulated operating cost.
That comparison can expose false acceptances and unnecessary escalations; without both arms, label the missing counterfactuals as unknown rather than inferring them from an average.

The result supports a local decision only if the policy meets a predeclared quality and risk threshold while improving the chosen cost or latency measure.
After using held-out results to change the policy, evaluate again on fresh tasks.
High-risk work can bypass the router or retain mandatory review, and the policy should be recalibrated when models, prices, harnesses, or the task distribution change.

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

### Test an energy-aware change

Energy use is harder to measure than latency or transferred bytes, and neither of those proxies is an automatic substitute for it :citep[kalliola2025energy].

:citet[barrocas2026ecoassist] provide one bounded example of a before-and-after energy study.
On a single M4 MacBook and Chrome testbed, the authors report a mean 13.4% reduction in local CPU and GPU energy, recorded with Powermetrics after EcoAssist optimized 500 deliberately resource-heavy standalone webpages.
The pages were selected for a size above 600 KB and at least ten DOM-affecting operations, so the sample does not represent arbitrary production applications.
The benchmark compared each optimized page with its own unoptimized baseline, not with another optimizer.

In a separate single-condition lab study, twenty early-career developers generated and optimized portfolio pages and reported low workload.
The study did not compare productivity against a control, and five participants observed removed content or layout changes after optimization.
The reported before-and-after page measurements do not include the optimizing model's full training and inference footprint; the paper estimates that overhead separately, and neither result is a whole-system carbon estimate.
Treat the optimization as a candidate change that must preserve the intended product behavior, not as evidence that a lower energy number is automatically better.

Reuse one representative Playwright journey and the repeated-measurement discipline above.
Preserve the baseline, make one targeted AI-assisted frontend optimization, and run the same journey under the same declared conditions.
Repeat it at least five times before and after when the chosen signal varies from run to run.
Record direct energy if the platform exposes a defensible measure; otherwise label transferred bytes, JavaScript or asset size, CPU time, or long-task time as **resource proxies**, not energy or carbon.
For deterministic measures such as built asset size, record one before-and-after value; for run-varying measures, report the median and range.
Re-run the functional checks, inspect for visual or accessibility regressions, note any rejected suggestion or regression, and state what the comparison cannot establish.

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
