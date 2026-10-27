## Chapter purpose moved from reader content

In this chapter, we will discuss topics like why systems behave different during development and in production under load with real data and slow networks while there are many concurrent users and failures you might not expect.

## Implemented spine

1. Benchmarking turns a web-system question into a bounded comparison.
2. Goodhart's law, variation, and proxy measures show why measurements can lead students astray.
3. Telemetry and observability help explain where and why measured behavior occurred.
4. The same outcome-versus-trace distinction is then applied to the agentic workflow that produced the application.

Keep the event tracker visible across all four stages.
The accepted application behavior or implementation is the outcome; request traces and agent transcripts are diagnostic evidence rather than proof of correctness.

Possible event tracking benchmarks:

- Record 1,000 domain events.
- Query the latest events while writes are happening.
- Filter events by type with a larger dataset.
- Import a batch of historical events.
- Simulate duplicate submissions from retrying clients.

### From measurements to Little's Law

Measurements become more useful when they can be connected through a model.
Little's Law states that, for a stable system over a suitable observation period, the average number of items in the system equals their average arrival rate multiplied by their average time in the system :citep[little1961proof]:

`L = λW`

For an event pipeline, `L` might be the average number of events being processed or waiting, `λ` the average arrival rate, and `W` the average time from arrival to completion.
If 20 events arrive per second and each spends an average of half a second in the system, the average work in progress is 10 events.
The relationship can also expose an inconsistent measurement: if the observed queue is much larger, the system may not be stable, the time window may be misleading, or important work may be missing from the measurement.

Little's Law does not identify the cause of latency and does not promise that a system can sustain any chosen arrival rate.
Students should record the measurement boundary and check whether arrivals and completions were approximately balanced before using it.
In Lecture 6, the same relationship will be applied to a concrete application bottleneck; later, it can also describe review queues in an agent workflow.

### Measure browser rendering work

Web application performance is not limited to API and database latency.
An interaction can receive a fast response and still feel slow because the browser has too much work to do before it can draw the next frame.
Adding or removing DOM elements, changing attributes or classes, and running animations can trigger style recalculation and sometimes layout.
The cost depends on the complexity of the applicable CSS rules and, often more importantly, how many elements the change invalidates.

This is a useful example of why optimization should begin with evidence.
Chrome DevTools can show `Recalculate Style` events in a Performance recording, including how many elements were affected.
Selector Stats can then help identify selectors that required many matching attempts or consumed disproportionate time.
A complex-looking selector is not automatically the real bottleneck, and replacing it without measuring may have little visible effect.

A small project exercise can use the event list as the workload:

1. Populate the view with an increasing number of events.
2. Record an interaction such as filtering, expanding an event, or changing the theme.
3. Inspect the rendering work and the number of elements whose styles were recalculated.
4. Narrow the affected DOM scope or simplify an expensive selector, then record the same interaction again.
5. Report what changed and what the measurement does not prove.

The purpose is not to teach students to avoid expressive CSS.
It is to show that client-side cost can grow with the size and structure of the rendered page, and that the relevant unit of work may be affected elements rather than requests.
See [Reduce the scope and complexity of style calculations](https://web.dev/articles/reduce-the-scope-and-complexity-of-style-calculations) for a practical walkthrough.

## Model evals as benchmarks

If students use different AI models during the project, they should treat model choice as something that can be measured rather than guessed.
A model eval is a benchmark for an AI-assisted workflow: given the same task, context, constraints, and expected evidence, how well does each model perform?

The goal is not to rank models universally.
A useful course eval should be local to the work students actually do.
For example, students might compare models on tasks such as:

- Explaining the event tracking data model from the codebase.
- Finding one likely scaling bottleneck.
- Proposing a benchmark plan from a short project README.
- Writing or repairing a small test.
- Summarizing an incident trace or log excerpt.
- Reviewing a scaling trade-off table for missing failure modes.

Model capability and tool reliability are also separate variables.
In [Better Models: Worse Tools](https://lucumr.pocoo.org/2026/7/4/better-models-worse-tools/), Armin Ronacher documents newer models completing the reasoning for an edit correctly while emitting arguments that violated a nested tool schema.
The failures depended on the conversation history, client behavior, schema shape, and whether strict tool invocation was enabled.
A model eval should therefore exercise the real agent harness and tools rather than test only a model's prose in isolation.

Each eval should define:

- The input context given to the model.
- The expected output or rubric.
- The scoring method, such as exact checks, human pass/fail review, rubric scoring, or an LLM judge that has been checked against human labels.
- The cost and latency of each attempt.
- The limits of the result, including sample size and whether the tested tasks represent the real project work.

> **Sustainability angle**
>
> Model evals should include cost and resource awareness.
> A model that scores better on these tasks may reduce rework, but it may also cost more, run slower, or consume more compute.
> A lower-cost model may be acceptable if it meets the same acceptance criteria and the human review burden stays reasonable.

Development ideas:

- For an optional comparison, define a small set of project-specific tasks during implementation A and record the large-model baseline.
  Rerun the same tasks with permitted small-model and fleet workflows when those environments become available, within the existing phase budget.
- Use instructor-provided actual outputs with retained provenance when a lecture demonstration needs a comparison outside the currently assigned environment.
- Include at least one deterministic check where possible, such as whether the answer names required files, produces valid JSON, or passes a test.
- Use human review for quality judgments that require understanding of the project.
- Ask students to report confidence carefully: "model A did better on these tasks" is defensible; "model A is better" is usually not.
- Discuss how a model can score well on a generic benchmark but still fail in a local codebase with missing context, unclear instructions, or weak tests.

### Make failures diagnosable

An aggregate score can show that a workflow became better or worse, but it does not explain the failure.
A useful eval should let a student move from "the score fell" to a concrete diagnosis: which input failed, which required property was missing, and whether the problem came from the model, prompt, context, tool use, or evaluator.

Build that diagnostic path from the cheapest reliable checks upward:

1. Choose a small dataset of representative project tasks and preserve the exact input context for each one.
2. Add deterministic probes for properties that code can check, such as valid JSON, required headings, named files, test results, or allowed tool calls.
3. Use human review for judgments that require project understanding.
4. Add an LLM judge only for genuinely fuzzy properties, give it a specific rubric and the relevant answer key, and record its explanation alongside its score.
5. Test the judge itself.
   Swap the order of compared answers, repeat selected cases, and compare its labels with a small set of human labels before relying on it at scale.
6. Inspect failing rows instead of reporting only the average.
   Preserve important real failures as regression cases that can be rerun after a prompt, model, tool, or agent-harness change.

LLM judges can favor an answer because of its position, length, or similarity to the judge's own style rather than because it is correct.
These are properties of the measurement instrument, so changing to a more capable judge does not remove the need for calibration.
The paper _Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena_ documents several of these biases and mitigation strategies :citep[zheng2023mtbench].

[Your Evals Are Lying To You](https://github.com/TejasQ/basically-agent-evals) provides a compact TypeScript companion for this progression.
Its useful core for this course is the path from a dataset and checker to judge-bias experiments, deterministic probes, failing-row inspection, and a CI gate.
The repository also includes RAG and diagnostic-console examples, but those are optional extensions rather than required parts of the scalability project.

A practitioner benchmark of [frontier and local models on structured voice-note analysis](https://tej.as/blog/note-app-ai-benchmark-apple-intelligence-sucks) illustrates both the value and limits of this approach.
Models were compared on the actual summaries, action items, and questions needed by the application, and a less prestigious model outperformed several frontier models on that task.
Since the comparison used a small task set and one pass per model, it should not be generalized into a universal ranking.
Its defensible lesson is that product-specific output quality, latency, and cost have to be measured together.

### Calibrate a rubric on actual attempts

Use [Appendix A’s actual-attempt rubric](/appendices/evaluating-agentic-workflows/#calibrate-a-rubric-on-actual-attempts) for a bounded classroom comparison with sourced outputs.
Freeze the task, shared context and rubric before inspecting two permitted attempts; retain the exact prompt, responses, configuration, source records, corrections and acceptance decisions.
Where another person prepares the records, conceal model identities until scoring is complete.
Compare criterion-level evidence and preserve disagreement rather than treating an authored answer as the only acceptable wording.
Without model access, use the supplied matched-trace records and retain their stated provenance and missing evidence.

Two attempts support a comparison of those outputs, not a general model ranking or a reliable success-rate estimate.
Record elapsed time, cost and review effort only when observed with a stated boundary and source; missing observations remain unknown.
Run deterministic checks separately where useful: did the answer name a real file, include all required headings, or produce valid JSON?
To make it more statistically careful, run more examples and compare failure patterns instead of relying on one average score.

### Short eval lab

As optional practice, use the actual-attempt activity above or a small script to evaluate three to five outputs from one real project task.
Keep the lab within about 20–30 minutes of existing study time:

1. Freeze the task, shared context, expected evidence, and one narrow rubric before generating or inspecting outputs.
2. Write at least one deterministic probe before adding any fuzzy scoring.
3. Score two attempts, then inspect the lowest-scoring row and name the property that failed.
4. If an LLM judge is available, reverse the order of the attempts and run the judgment again.
   A changed verdict is evidence about the judge, not the attempts.
5. Retain all attempts and corrections, save a meaningful failure as a regression fixture, and write one local conclusion that the evidence supports.

A defensible conclusion is specific: "the smaller model omitted confirming measurements in three of five benchmark plans." A claim such as "the larger model is better" exceeds the evidence.
If the class uses the companion repository, its offline mock mode is sufficient for demonstrating the judge traps; no API key or RAG system is needed.

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

### Choose evidence before inspecting a trace

Use the chapter's prediction prompt to choose evidence for a concrete operational symptom before opening the simulated OpenTelemetry trace explorer.
The useful signal depends on the question: the right first signal for stale summaries is not always the right first signal for missing events or a slow dashboard.

Ask which specific log, metric or trace observation could distinguish the proposed explanations.
Inspect the trace and its parent-child relationships before choosing a response; retain the earlier failed attempt even when the final HTTP response succeeds.
For optional local practice, instrument one operation, retain original and changed records, and check trace IDs, links and timer boundaries as described in the chapter.

Use the result as a starting point for an observability plan.
A good plan names the symptom, the first signal to inspect, and what that signal can or cannot prove.

> **Sustainability angle**
>
> Observability is not free.
> Logs, metrics, traces, dashboards, and retained telemetry consume storage and processing.
> The goal is enough evidence to operate and improve the system, not unlimited data collection.

## What to measure in the project

Use the [common submission bundle and comparable evidence fields](/project/#9-common-submission-bundle-and-comparable-evidence) as the stable reporting frame for all three implementations.
The measurements below help turn that frame into an operational protocol rather than a collection of isolated numbers.

Prompts:

- How long does event recording take?
- What happens when invalid events are submitted?
- What happens when two users submit events at the same time?
- Which endpoint or query becomes slow first?
- What information would you need during an incident?
- Can you determine what happened after the fact?

## Efficiency and green computing

Benchmarking can also support sustainability work.
A scalable system is not only one that can handle more load; it should also avoid wasting computation, memory, storage, bandwidth, and energy.
Green computing gives students a broader reason to care about efficiency: inefficient software can increase infrastructure cost and environmental impact at the same time.

This section should stay concrete.
Students do not need to calculate exact carbon emissions to learn useful lessons.
It is enough to connect system behavior to resource consumption and ask whether the same user value can be delivered with less waste.

> **Sustainability angle**
>
> Carbon estimates can be useful, but they are often harder to verify than direct resource measurements.
> Start with what you can observe: work done, data transferred, storage retained, and infrastructure kept running.

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
- Treating "faster" as automatically greener.
  A faster system can still waste resources if it does unnecessary work at high volume.
- Optimizing for sustainability claims without measuring the underlying resource behavior.

## Exercise ideas

- Students add one benchmark or load script for implementation A and preserve it for equivalent runs against implementations B and C.
- Students add basic structured logging around event creation and querying.
- Students run one measurement, document the result, and explain what the result does and does not prove.
- Students define a small model-eval task set, run the permitted large-model baseline, and preserve the inputs for equivalent runs against implementations B and C.
- Students use the measurement to identify one likely reconstruction pressure.
- Students add one efficiency observation, such as resource use per event, database queries per request, bundle size, storage growth, or repeated background work.
- Students propose one sustainability-oriented improvement and explain the trade-off it introduces.

## Notes for further development

- Add a small tool-neutral example using `curl`, a simple script, or a common load testing tool.
- Include a table of metrics and what each metric can reveal.
- Add a small tool-neutral model eval example.
  A simple version could be a CSV with columns for `model`, `task`, `input`, `score`, `cost`, `latency`, and `review_note`.
- Make this chapter the methodological center of the three-build comparison.
  State explicitly that the course is performing a local evaluation of complete development workflows, not establishing a universal model leaderboard.
- Define two linked benchmark layers: the same runtime workload for each web application and the same reporting schema for each AI-assisted development workflow.
- Expand the workflow schema to include active human time, failed attempts, interventions, acceptance-test pass rate, defects found in review, setup friction, and approximate resource use.
  Raw token or speed figures alone are insufficient.
- Explain the two comparisons separately: A–B compares model setups; B–C also changes orchestration and may change model assignment.
  Require the fleet's model set, assignments, actual routes and configuration to be declared; the matched small-model probe studies orchestration separately.
- Add practice effects, optional feature scope, hardware differences, and selective reporting to the measurement-traps section.
- Require the evidence template to be completed after every phase, not recreated from memory in the final week.
- Make the implementation A public discussion use benchmark evidence.
  Groups should arrive at lecture 4 able to show at least one result and explain its limits.
- Keep the sample sizes and claims modest.
  The final wording should favor “in our tasks and environment” over universal rankings of models or orchestration patterns.
- Connect privacy to observability: event tracking systems can easily log sensitive behavior regardless of the chosen theme.
- Add references on green software engineering, resource efficiency, carbon-aware computing, and cloud provider sustainability reporting.
- Obsidian candidate: `Clippings/_Processed/Correlation charts Connect the dots between site speed and business success.md` could support the point that metrics should connect to user-visible or stakeholder-visible outcomes.
  Adapt the idea from page speed to event tracking: latency, freshness, failed submissions, or dashboard load time should be connected to the value the system claims to provide.
- Obsidian candidate: `Clippings/_Processed/Durable Execution Solutions.md` could support examples where observability must cover long-running or retrying work, not only request/response latency.
- Obsidian candidate: `Clippings/_Processed/Statistics for LLM Evals.md` is directly relevant for warning students against eyeballing average scores.
  It can support a short treatment of sample size, confidence intervals, and careful model comparisons.
- Obsidian candidate: `Clippings/_Processed/Building eval systems that improve your AI product.md` can support the error-analysis-first framing: start by looking at actual failures, then design evaluators around those failure modes rather than generic scores.
- Obsidian candidate: `Clippings/_Processed/hamelsmuevals-skills Skills for AI Evals to compliment the course AI Evals For Engineers & PMs.md` can provide a checklist of eval design concerns: eval audits, error analysis, synthetic data, judge prompts, evaluator validation, RAG evaluation, and review interfaces.
- External candidate: OpenAI Evals (`https://github.com/openai/evals`) is useful as a framework and registry reference for evaluating LLMs and LLM systems.
- External candidate: Inspect AI (`https://github.com/UKGovernmentBEIS/inspect_ai`) is useful as a model-evaluation framework reference, especially if the chapter needs a more formal evaluation-harness example.
- External candidate: LangSmith evaluation concepts (`https://docs.langchain.com/langsmith/evaluation-concepts`) gives accessible vocabulary for datasets, examples, experiments, evaluator scores, and traces.
- External candidate: Statistics for LLM Evals (`https://statsforevals.com/`) can support statistical interpretation of eval results and model comparisons.
