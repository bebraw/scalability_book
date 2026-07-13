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

> **Sustainability angle**
>
> A useful benchmark can report resource use per unit of value, not only speed. For example, compare CPU time per recorded event, database queries per request, bytes transferred per dashboard load, or storage growth per day.

Possible event tracking benchmarks:

- Record 1,000 domain events.
- Query the latest events while writes are happening.
- Filter events by type with a larger dataset.
- Import a batch of historical events.
- Simulate duplicate submissions from retrying clients.

### Measure browser rendering work

Web application performance is not limited to API and database latency. An interaction can receive a fast response and still feel slow because the browser has too much work to do before it can draw the next frame. Adding or removing DOM elements, changing attributes or classes, and running animations can trigger style recalculation and sometimes layout. The cost depends on the complexity of the applicable CSS rules and, often more importantly, how many elements the change invalidates.

This is a useful example of why optimization should begin with evidence. Chrome DevTools can show `Recalculate Style` events in a Performance recording, including how many elements were affected. Selector Stats can then help identify selectors that required many matching attempts or consumed disproportionate time. A complex-looking selector is not automatically the real bottleneck, and replacing it without measuring may have little visible effect.

A small project exercise can use the event list as the workload:

1. Populate the view with an increasing number of events.
2. Record an interaction such as filtering, expanding an event, or changing the theme.
3. Inspect the rendering work and the number of elements whose styles were recalculated.
4. Narrow the affected DOM scope or simplify an expensive selector, then record the same interaction again.
5. Report what changed and what the measurement does not prove.

The purpose is not to teach students to avoid expressive CSS. It is to show that client-side cost can grow with the size and structure of the rendered page, and that the relevant unit of work may be affected elements rather than requests. See [Reduce the scope and complexity of style calculations](https://web.dev/articles/reduce-the-scope-and-complexity-of-style-calculations) for a practical walkthrough.

## Model evals as benchmarks

If students use different AI models during the project, they should treat model choice as something that can be measured rather than guessed. A model eval is a benchmark for an AI-assisted workflow: given the same task, context, constraints, and expected evidence, how well does each model perform?

The goal is not to rank models universally. A useful course eval should be local to the work students actually do. For example, students might compare models on tasks such as:

- Explaining the event tracking data model from the codebase.
- Finding one likely scaling bottleneck.
- Proposing a benchmark plan from a short project README.
- Writing or repairing a small test.
- Summarizing an incident trace or log excerpt.
- Reviewing a scaling trade-off table for missing failure modes.

Model capability and tool reliability are also separate variables. In [Better Models: Worse Tools](https://lucumr.pocoo.org/2026/7/4/better-models-worse-tools/), Armin Ronacher documents newer models completing the reasoning for an edit correctly while emitting arguments that violated a nested tool schema. The failures depended on the conversation history, client behavior, schema shape, and whether strict tool invocation was enabled. A model eval should therefore exercise the real harness and tools rather than test only a model's prose in isolation.

Each eval should define:

- The input context given to the model.
- The expected output or rubric.
- The scoring method, such as exact checks, human pass/fail review, rubric scoring, or an LLM judge that has been checked against human labels.
- The cost and latency of each attempt.
- The limits of the result, including sample size and whether the tested tasks represent the real project work.

> **Sustainability angle**
>
> Model evals should include cost and resource awareness. A stronger model may reduce rework, but it may also cost more, run slower, or consume more compute. A weaker model may be acceptable if the task is well-scoped, the feedback loop is strong, and the human review burden stays reasonable.

Development ideas:

- Compare two models on the same five project-specific prompts and require students to inspect the failures, not only the score.
- Include at least one deterministic check where possible, such as whether the answer names required files, produces valid JSON, or passes a test.
- Use human review for quality judgments that require understanding of the project.
- Ask students to report confidence carefully: "model A did better on these tasks" is defensible; "model A is better" is usually not.
- Discuss how a model can score well on a generic benchmark but still fail in a local codebase with missing context, unclear instructions, or weak tests.

A practitioner benchmark of [frontier and local models on structured voice-note analysis](https://tej.as/blog/note-app-ai-benchmark-apple-intelligence-sucks) illustrates both the value and limits of this approach. Models were compared on the actual summaries, action items, and questions needed by the application, and a less prestigious model outperformed several frontier models on that task. Since the comparison used a small task set and one pass per model, it should not be generalized into a universal ranking. Its defensible lesson is that product-specific output quality, latency, and cost have to be measured together.

### Small eval demonstration

A simple classroom demonstration can be interactive. The point is to show that an eval is a controlled comparison, not a magic score. Students can change the task, inspect the shared prompt and context, score two model attempts, and notice how the conclusion changes when quality, latency, and cost are considered together.

{{ import "site/includes/model-eval-demo.html" }}

This is not enough data to declare a universal winner. It is enough to support a local decision such as: "For open-ended diagnosis, the stronger model saved review time. For checklist-style benchmark plans, the smaller model may be acceptable if a human verifies the result." To make the exercise more engineering-like, add deterministic checks: did the answer name a real file, include all required headings, or produce valid JSON? To make it more statistically careful, run more examples and compare failure patterns instead of relying on one average score.

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

### Observability signal picker

The demonstration below asks students to choose evidence for a concrete operational symptom. The useful signal depends on the question: the right first signal for stale summaries is not always the right first signal for missing events or a slow dashboard.

{{ import "site/includes/observability-signal-demo.html" }}

Use the result as a starting point for an observability plan. A good plan names the symptom, the first signal to inspect, and what that signal can or cannot prove.

> **Sustainability angle**
>
> Observability is not free. Logs, metrics, traces, dashboards, and retained telemetry consume storage and processing. The goal is enough evidence to operate and improve the system, not unlimited data collection.

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

> **Sustainability angle**
>
> Carbon estimates can be useful, but they are often harder to verify than direct resource measurements. Start with what you can observe: work done, data transferred, storage retained, and infrastructure kept running.

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
- Students run a small model eval comparing two approved models on the same project-specific task set, then explain one failure pattern and one limitation of the eval.
- Students use the measurement to identify one likely reconstruction pressure.
- Students add one efficiency observation, such as resource use per event, database queries per request, bundle size, storage growth, or repeated background work.
- Students propose one sustainability-oriented improvement and explain the trade-off it introduces.

## Project artifact

Students should create a measurement, model eval, and observability plan. It should define one workload, one load level, the metrics collected, one small model-evaluation task set if AI assistance is used, the result, what the result does not prove, and which signal would warn them first that the system is under pressure.

## Notes for further development

- Add a small tool-neutral example using `curl`, a simple script, or a common load testing tool.
- Include a table of metrics and what each metric can reveal.
- Add a small tool-neutral model eval example. A simple version could be a CSV with columns for `model`, `task`, `input`, `score`, `cost`, `latency`, and `review_note`.
- Connect privacy to observability: event tracking systems can easily log sensitive behavior regardless of the chosen theme.
- Add references on green software engineering, resource efficiency, carbon-aware computing, and cloud provider sustainability reporting.
- Obsidian candidate: `Clippings/_Processed/Correlation charts Connect the dots between site speed and business success.md` could support the point that metrics should connect to user-visible or stakeholder-visible outcomes. Adapt the idea from page speed to event tracking: latency, freshness, failed submissions, or dashboard load time should be connected to the value the system claims to provide.
- Obsidian candidate: `Clippings/_Processed/Durable Execution Solutions.md` could support examples where observability must cover long-running or retrying work, not only request/response latency.
- Obsidian candidate: `Clippings/_Processed/Statistics for LLM Evals.md` is directly relevant for warning students against eyeballing average scores. It can support a short treatment of sample size, confidence intervals, and careful model comparisons.
- Obsidian candidate: `Clippings/_Processed/Building eval systems that improve your AI product.md` can support the error-analysis-first framing: start by looking at actual failures, then design evaluators around those failure modes rather than generic scores.
- Obsidian candidate: `Clippings/_Processed/hamelsmuevals-skills Skills for AI Evals to compliment the course AI Evals For Engineers & PMs.md` can provide a checklist of eval design concerns: eval audits, error analysis, synthetic data, judge prompts, evaluator validation, RAG evaluation, and review interfaces.
- Obsidian candidate: `Clippings/_Processed/harbor evaluate agents in sandboxed environments.md` could be useful if the course later evaluates agentic tasks in isolated environments.
- External candidate: OpenAI Evals (`https://github.com/openai/evals`) is useful as a framework and registry reference for evaluating LLMs and LLM systems.
- External candidate: Inspect AI (`https://github.com/UKGovernmentBEIS/inspect_ai`) is useful as a model-evaluation framework reference, especially if the chapter needs a more formal eval harness example.
- External candidate: LangSmith evaluation concepts (`https://docs.langchain.com/langsmith/evaluation-concepts`) gives accessible vocabulary for datasets, examples, experiments, evaluator scores, and traces.
- External candidate: Statistics for LLM Evals (`https://statsforevals.com/`) can support statistical interpretation of eval results and model comparisons.
