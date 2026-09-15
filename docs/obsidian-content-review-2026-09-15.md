# Obsidian content review — 2026-09-15

## Recommendation

The strongest additions are a worked example of evaluation across successive changes, a small extension to the mutation lab, and a short bridge from coding-task measurements to service delivery outcomes.
An example of rebuilding a derived view is also useful if the architecture chapter needs a more concrete illustration.
These can strengthen existing sections without adding required project deliverables.

This fits the scope advice in [First-run course improvement notes](first-run-course-improvements.md): improve the evidence and explanation around the existing course before expanding its subject matter.

## Review scope

The baseline was repository revision `a10799f` (2026-09-07), which already added review, memory, and evaluation exercises.
Obsidian was accessed through MCP, using recent-file discovery, text and semantic search, the September 15 synthesis and quality audit, six selected source clippings, and experiment entries E8 and E35.
The synthesis reports 23 new sources since its September 7 snapshot; this review assessed their relevance through that synthesis and read the six most pertinent clippings in full, rather than auditing all 383 processed notes.

Primary-source checks covered the SlopCodeBench project page and paper abstract, DORA's guide, Michael Bromley's testing article, the oversight position paper, and Jay Kreps's log article.
No benchmark was reproduced.
“New” below means useful material missing from, or less explicit in, the current book; a recent capture date does not imply a recent publication.

Vault entry points:

- `Clippings/_Analysis/Clipping Analysis 2026-09-15.md`
- `Clippings/_Analysis/Dataset Quality Audit 2026-09-15.md`
- `Clippings/_Analysis/Experiment Backlog.md`, especially E8 and E35

## 1. Evaluate the cost of the next change

**Source:** `Clippings/_Processed/SlopCodeBench.md`; E8, “Code Cleanliness Longitudinal Pair.”

[SlopCodeBench](https://www.scbench.ai/) evaluates successive specification checkpoints while leaving internal architecture open.
The [paper abstract, version 2](https://arxiv.org/abs/2603.24755v2) separates functional success from structural erosion and redundant code.
The useful contribution is the evaluation shape: early implementation choices affect later work.
Its quality metrics remain proxies; the live leaderboard and paper describe different evaluation snapshots, so their figures should not be combined.

**Current coverage:** [Appendix A](../book/04_appendices/A_evaluating_agentic_workflows.md#capability-and-regression-evals) distinguishes capability and regression evaluation.
The course also has bounded change probes.
It does not yet provide a worked sequence showing how change cost accumulates within the same implementation.

**Suggested insertion:** An optional worked example after “Capability and regression evals.”
Use a small non-course application with three successive changes.
At each checkpoint preserve the revision, accepted behavior, regressions, human review time, repair effort, and total attempt cost.
Use invented, explicitly labeled data to show two implementations with similar initial correctness but different later change costs.
Complexity and duplication can help explain a difference; they should not decide maintainability alone.

Keep the A–B–C clean-start design and existing audit probes intact.
The example teaches a different comparison: successive changes within one implementation.
Do not present three dependent checkpoints as three independent tasks or add an entire longitudinal benchmark to the required submission.

## 2. Good tests must also tolerate correct changes

**Source:** `Clippings/_Processed/The Problem With Your AI Tests.md`; E35, “Generated-Test Defect Sensitivity.”

[Bromley's article](https://www.michaelbromley.co.uk/blog/the-problem-with-your-ai-tests/) illustrates tests disconnected from production behavior, copied implementation logic, weak assertions, and branches that accept either outcome.
These are useful examples, not a controlled estimate of how often generated tests fail.
E35 adds a complementary check: correct implementations and harmless refactors should still pass.

**Current coverage:** [Chapter 2](../book/01_establish/02_scalable_development.md#constrain-generate-validate-revise) already treats generated tests as candidate artifacts.
The [mutation lab](../labs/concern-directed-mutation/README.md) already requires a passing baseline and a meaningful assertion failure for the selected mutant.
Another general warning about green tests would repeat existing material.

**Suggested extension:** Add one behavior-preserving implementation variant to the existing lab.
The same test should pass the baseline, fail the named defect, and pass the harmless refactor.
This makes sensitivity to faults and dependence on implementation details separately visible.

For an optional evaluation exercise, reserve additional defects that were not shown while improving the tests.
Distinguish assertion failures from broken fixtures, and label equivalent mutants explicitly.
Keep valid mocks and property assertions where they match the intended contract.

## 3. Connect coding-task evidence to delivery outcomes

**Source:** `Clippings/_Processed/DORA’s software delivery performance metrics.md`.

[DORA's guide](https://dora.dev/guides/dora-metrics/) currently defines five metrics: change lead time, deployment frequency, failed deployment recovery time, change fail rate, and deployment rework rate.
They describe delivery for an application or service, with throughput and instability interpreted together.
This is a useful external reference for the book's concern with accepted outcomes.

**Current coverage:** [Chapter 3](../book/01_establish/03_benchmarking.md#observe-the-agentic-workflow-too) records task acceptance, elapsed time, retries, cost, and human correction, but does not introduce DORA.

**Suggested insertion:** A short box distinguishing a task trial from a delivery period.
An agent completing a patch faster does not establish that changes reach production sooner or require less recovery and rework.
DORA lead time begins at a commit; the course's task clock may begin earlier.
Keep those boundaries explicit.

Use a fictional deployment timeline for interpretation rather than requiring students to build telemetry integrations.
Short projects may have too few deployments or incidents for stable rates.
Avoid individual rankings and causal claims about AI from an uncontrolled before/after comparison.

## 4. Optional: rebuilding a view is different from repeating effects

**Source:** `Clippings/_Processed/Kappa Architecture - Where Every Thing Is A Stream.md`.

The clipping collects references on an authoritative log and derived serving views.
[Kreps's primary article](https://www.linkedin.com/blog/engineering/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying) explains deterministic processing of ordered history and the relationship between logs and derived state.
The reference collection's service list should not be treated as a current product comparison.

**Current coverage:** [Chapter 4](../book/02_challenge/04_architecture.md#data-limits-how-freely-responsibility-can-move) already separates events, current state, and summaries.
[Appendix F](../book/04_appendices/F_durable_workflows.md#durable-execution-preserves-coordination-progress) separates domain authority from workflow coordination and explains retry-safe effects.
The opportunity is a worked connection between those sections.

**Suggested example:** Recompute a workspace activity summary from a retained event fixture after changing the aggregation rule.
Explain why that replay must not resend historical notifications.
Name the required event fields, ordering, retention, schema interpretation, rebuild lag, and effect boundary.
A minimal activity log is not automatically complete enough to reconstruct every application state.
This can be a short prose example without introducing a streaming platform or changing the common project architecture.

## Sources that mostly reinforce existing coverage

### Human oversight

`AI Agents Push Humans Out of the Loop.md` reinforces Chapter 2's retained judgment and unaided performance discussion, Chapter 7's treatment of human gates, and Appendix A's exercise in declaring review questions before seeing the agent's view.
Add the [position paper](https://arxiv.org/html/2608.23642v3) as supporting reading if useful.
Its proposals for interface and organizational support are not new controlled evidence of universal skill loss.

### Latency

`lessons in latency.md` overlaps Chapters 3 and 8 on mean/tail behavior, Little's Law, and latency budgets.
Preserve the book's stronger caveats: an average relation does not establish capacity, and UX thresholds need workload-specific evidence.

### Memory and generated documentation

The new tools in the September 15 synthesis overlap Chapter 7's provenance and freshness exercise, including stale context and maintenance cost.
Prefer the existing exercise over adding product names without comparative evidence.

### Long autonomous coding sessions

The case in the September 15 synthesis reinforces accepted outcomes, failed-attempt costs, review inventory, and stopping rules already covered in Chapters 2, 3, and 7 and Appendix A.
Use it only if a concrete case is needed; avoid model-wide conclusions from one account.

### AI-writing detection

The September 15 synthesis's largest new cluster primarily concerns authorship inference and population measurement.
Keep it outside the core scalability narrative.
The existing evidence and reflection approach already provides a better course fit.

## Implemented for review

The four candidates above were incorporated on September 15:

- [Appendix A](../book/04_appendices/A_evaluating_agentic_workflows.md#evaluate-the-cost-of-the-next-change) now has a three-checkpoint parcel-quotation example with explicitly invented review, repair, regression, and cost data.
- [Chapter 2](../book/01_establish/02_scalable_development.md#constrain-generate-validate-revise) and the [mutation lab](../labs/concern-directed-mutation/README.md) now pair defect detection with a correct storage refactor.
- [Chapter 3](../book/01_establish/03_benchmarking.md#observe-the-agentic-workflow-too) now distinguishes a coding task from service delivery using DORA and a fictional timeline.
- [Chapter 4](../book/02_challenge/04_architecture.md#rebuild-a-view-without-repeating-its-effects) now illustrates summary replay, cutover, and the separate notification-effect boundary.

The new material adds no required project deliverables and preserves the existing A–B–C clean-start comparison.
The source assessments above record the reasoning behind these additions; the remaining overlapping sources were not added to the chapters.
