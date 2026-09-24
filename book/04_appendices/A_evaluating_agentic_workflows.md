# Evaluating agentic development workflows

Use this appendix to design, run, or critique an agentic-development evaluation.
The [Benchmarking chapter](/chapters/benchmarking/) defines the course baseline.

## Apply the method selectively

Begin with representative tasks, checked outcomes, preserved failures, and a declared workflow configuration.
Read [evaluation anatomy](#anatomy-of-an-agent-evaluation), [task selection](#capability-and-regression-evals), and [grader design](#the-eval-suite-is-also-software) for that minimal path.
Add other sections when the decision requires them:

- [Uncertainty](#report-uncertainty-not-only-point-estimates) for repeated, multi-task comparisons.
- [Served configuration](#qualify-the-served-configuration) for model, environment, and context-reduction controls.
- [Cost denominators](#read-a-harness-benchmark-s-cost-denominator) and [routing](#from-evaluation-to-routing) for efficiency decisions.
- [Compressed evidence](#compressed-evidence-and-repeated-review) and [repeated review](#repeated-review-is-measurement-not-proof) for review workflows.
- Research examples on [judges](#research-example-evaluating-the-evaluator) and [coordination](#research-example-coordination-and-integration) for interpreting published comparisons.

## Anatomy of an agent evaluation

A software test usually invokes known code with controlled inputs and checks the result.
An agent evaluation must also define the situation in which a model acts, because tool access, instructions, the starting repository, resource limits, and intermediate state can all change the result.
The following vocabulary helps keep those layers separate :citep[grace2026demystifying]:
:ref[table:agent-evaluation-vocabulary]{text="The table below"} locates each term within one evaluation.

| Term                | Unit or scope                 | What it records or does                                                                                                   | Common confusion                                      |
| ------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Task                | One declared problem          | Defines inputs and success criteria                                                                                       | A repeated attempt is not a new independent task      |
| Trial               | One attempt at one task       | Runs the task once so repeated trials can expose behavioral variation                                                     | Trial count is not task diversity                     |
| Outcome             | End state of one trial        | Preserves the resulting patch, database state, generated artifact, or other effect                                        | The final claim is not necessarily the actual outcome |
| Trace or transcript | Path through one trial        | Records outputs, tool calls, intermediate results, and relevant interventions                                             | A plausible trace does not prove a correct outcome    |
| Grader              | One evaluated property        | Checks an aspect of the outcome or trace through code, a model-based rubric, or human judgment                            | One grader is not the whole evaluation                |
| Agent harness       | Model-and-tool execution loop | Supplies context, tools, state, and control for one agent run                                                             | It need not provision or score the evaluation         |
| Evaluation harness  | Evaluation infrastructure     | Provisions tasks and environments, invokes the agent harness, preserves evidence, applies graders, and aggregates results | It is distinct from the agent being evaluated         |
| Evaluation suite    | A declared set of tasks       | Groups tasks intended to measure a capability or behavior                                                                 | A shared benchmark is one kind of suite               |

::caption[Vocabulary for the nested objects and responsibilities in an agent evaluation.]
::label[table:agent-evaluation-vocabulary]

These terms describe different measurement objects.
A repository test is often one deterministic grader inside an agent evaluation rather than the entire evaluation.
A public benchmark is a shared evaluation suite designed for comparison across systems, while a local product or project evaluation should represent the work and failure modes that matter in its own setting.
An RL environment additionally exposes a reward signal for optimization or training.
Treating these as synonyms hides differences in task selection, incentives, and supported claims.

Prefer grading the outcome when several valid paths can solve the task.
Use the trace to diagnose failures, account for cost and intervention, and check process requirements that genuinely matter, such as permission compliance or a mandatory approval.
Rigidly requiring one anticipated sequence of tool calls can reject a valid solution, while accepting only the final statement can miss that the claimed change never occurred.

## Capability and regression evals

A **capability eval** asks whether the workflow can perform work that is currently difficult.
Its initial pass rate may be low because it is intended to reveal a boundary and provide room for improvement.
A **regression eval** asks whether the workflow still handles previously accepted work and should normally pass almost all trials :citep[grace2026demystifying].
When a capability task becomes reliably solvable, preserve it as a regression task rather than discarding the evidence and starting over.

Start with tasks already checked manually, consequential failures, and representative project changes.
For each task, keep a reference solution or known passing run to show that the stated problem is solvable and the graders can accept at least one correct outcome.
Everything required by a grader should be justified by the task brief or a declared invariant; an agent should not fail because the evaluator silently assumed a filepath, output format, or environmental resource.
Balance positive and negative cases so optimizing one behavior does not produce its opposite failure elsewhere.

### Evaluate the cost of the next change

An initial pass does not show how easily an implementation can be extended.
SlopCodeBench addresses this by asking agents to extend their own solutions through successive specification checkpoints, leaving internal structure open and measuring structural erosion and redundant code alongside functional correctness :citep[orlanski2026slopcodebench].
Preserving the implementation lets earlier decisions affect later work.
Its structural measures are diagnostic proxies; human comprehension and maintenance effort still need their own evidence.

Consider two implementations, X and Y, of a small parcel-quotation tool.
Each receives the same three changes in the same order:

1. Quote one domestic parcel using a fixed rate and reject invalid weights.
2. Accept a batch, preserving input order and reporting invalid parcels individually.
3. Accept configurable rates while preserving the original rate when configuration is omitted.

The following numbers are **invented teaching data**, not SlopCodeBench results or measurements from a course project.
Suppose the fictional trace shows X duplicating rate logic in its batch path, while Y reuses the single-parcel calculation.
At checkpoint 3, X accidentally removes the default from the batch path, breaking a previously passing check.
Both implementations eventually pass all current and retained acceptance checks after any repairs.

:ref[table:successive-change-cost]{text="The table below"} records what that final pass alone would hide.
Each paired cell gives **X / Y**; times are active human minutes for that checkpoint, with review and repair recorded separately.
Agent spend includes every attempt and retry through acceptance, including calls made during repairs, but excludes human time.

| Checkpoint             | Regressions found before repair | Review minutes | Repair minutes | Agent spend (USD) |
| ---------------------- | ------------------------------- | -------------- | -------------- | ----------------- |
| 1 — Single quote       | 0 / 0                           | 6 / 6          | 0 / 0          | 0.40 / 0.40       |
| 2 — Batch quotes       | 0 / 0                           | 12 / 8         | 0 / 0          | 0.80 / 0.70       |
| 3 — Configurable rates | 1 / 0                           | 24 / 9         | 18 / 0         | 2.40 / 0.90       |

::caption[Invented checkpoint evidence for two implementations that eventually pass the same acceptance checks.]
::label[table:successive-change-cost]

Both implementations finish three checkpoints, but X consumes 60 human minutes of review and repair and USD 3.60 in agent spend; Y consumes 23 minutes and USD 2.00.
The fictional trace suggests where to investigate the difference: a duplicated rule made a later change harder to propagate.
A real comparison would still need to distinguish architecture from task difficulty, reviewer familiarity, model variation, and other changed conditions.
Fewer lines or duplicated blocks would not establish the explanation by themselves.

Use the [task and grader controls](#capability-and-regression-evals) with a frozen change sequence, served configuration, per-checkpoint budgets, and stopping rules.
Retain revisions, checks, pre-repair failures, acceptance decisions, human effort, and all-attempt cost, including unfinished trajectories.
Checkpoints depend on earlier work; repeat fresh trajectories to study variation rather than counting checkpoints as independent trials.

This optional design studies successive changes within one implementation.
The course's A–B–C builds start fresh, while cross-team probes examine another group's ability to understand and change each build.

## The eval suite is also software

Terminal-Bench provides a concrete example of a versioned agent benchmark whose tasks combine instructions, container environments, resource limits, reference solutions, and executable tests.
Terminal-Bench 2.1 changed 26 tasks from the earlier suite to repair bugs, adjust timeouts or resources, and improve robustness against reward hacking :citep[terminalbench2026v21].
Its `fix-code-vulnerability` task, for example, pins a Bottle source revision and Python image, specifies CPU, memory, storage, and time limits, requires both a patch and a structured report, and checks the result with original and security-focused tests.

The measurement instrument can be wrong.
Ambiguous instructions, incomplete graders, leaked state, shared caches, resource contention, and permissive reference matching can create failures or passes unrelated to the intended capability.
Record the suite version and environment with every result, validate a reference solution, start trials from clean state, and read selected traces before trusting an aggregate score.
When a task or grader changes materially, do not silently compare the new score with results from the previous instrument.

For this course, inspecting one packaged benchmark task is more useful than running the entire public suite.
Identify its claimed capability, starting state, visible instructions, hidden or external assumptions, graders, reference solution, resource boundary, and plausible gaming paths.
Then state what a passing result would and would not establish.

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

A separate [research example](#research-example-evaluating-the-evaluator) examines what happens when a judge supplies both training rewards and the headline evaluation.

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

## Report uncertainty, not only point estimates

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

Report:

- the independent task count and task source;
- one predeclared primary outcome;
- the observed paired difference;
- a suitable paired interval and its method, when a course-provided or otherwise justified method fits the outcome.

Before inspecting results, define the signed difference and the practical boundary or bounds that would change the decision.
One conservative, predeclared rule is to require a suitable interval wholly beyond the practical boundary before claiming the required effect.
Under that rule, overlap leaves the effect claim inconclusive, while statistical separation can still describe a difference too small to matter.
An interval containing zero is not proof that the candidates are equal.

An engineering action also depends on consequences, cost, and reversibility.
A cheap reversible trial with monitoring and a rollback condition may be justified while the effect remains uncertain; an expensive irreversible migration may warrant more evidence.
State the decision rule and its rationale separately from the claim about the measured effect.

Treat other metrics and unplanned slices as descriptive or exploratory unless their joint decision rule and multiple-comparison treatment were declared in advance.
When no defensible interval is available, show the raw paired outcomes, label the comparison exploratory, and restrict the claim to those tasks.
An interval describes uncertainty conditional on the sample and scoring process; it cannot repair unrepresentative tasks, judge bias or contamination, or account for a change to the agent or evaluation harness.

**Paired comparison check.**
For one predeclared binary acceptance result per independent task, count tasks accepted by both candidates, only the first, only the second, or neither.
Use an instructor-supplied interval or a justified paired method to interpret those counts against the predeclared decision boundary; do not compare two separate error bars.
The single representative project task above remains a case comparison; use this check with a multi-task project cohort or instructor-provided data.

## Qualify the served configuration

A model name or local endpoint is not a capability result.
Bind an accepted outcome to the configuration that served it: resolved model revision or digest and quantization, runtime version, allocated context, prompt and tool scaffold, and relevant hardware and accelerator residency or CPU/GPU offload where exposed.
When an approved service does not expose a field, mark it unavailable and name the evidence source or service operator rather than estimating it.

In a study of 9.7K test examples across long-input and long-form-output benchmarks, quantization effects varied by method, model, task, context length, and language :citep[mekala2025quantization].
The study used vLLM on datacenter GPUs and did not test coding agents, Ollama, or consumer-device deployments, so one quantized build should not inherit another build's score.
Hardware constrains which configurations fit and their latency, throughput, and resource use; it does not establish task capability.

Keep capability, hardware fit, and data location as separate claims.
Running inference locally identifies where model computation occurs, not the data boundary of tools, telemetry, storage, or network calls.
A fallback can select a different model or configuration and change the capability, latency, cost, and data boundary.
Ollama, for example, exposes an installed model's [digest and quantization](https://docs.ollama.com/api/tags) and a running model's [allocated context and server-reported model VRAM bytes](https://docs.ollama.com/api/ps).
It can also forward cloud-model requests while callers continue using its local API, so `localhost` alone does not prove local execution ([cloud models](https://docs.ollama.com/cloud)).

Assign a stable identifier to each served configuration in the evaluation.
Record its exposed model, runtime, context, scaffold, tools, hardware boundary, outbound paths, and fallback policy, then link every attempt and acceptance result to that identifier.
For an opaque departmental service, use operator- or instructor-supplied metadata; otherwise mark unavailable fields and name the evidence source.
Qualify the configuration against a predeclared representative task and deterministic check, and treat the result as evidence for that task rather than a general ranking of local and hosted models.

Context selection and output reduction are also configuration decisions.
Long tool outputs and interaction histories consume context and can increase latency or cost, which has motivated command-aware filters such as [rtk](https://github.com/rtk-ai/rtk) and model-generated summaries.
A shorter agent-facing view does not by itself establish a lower total bill or an unchanged task outcome.
In a SWE-agent workshop study, observation masking and model-generated summaries reduced cost in most of five tested model configurations, but its paired analysis found that both significantly lowered solve rate in one reasoning-model configuration :citep[lindenbauer2025complexity].
On controlled long-horizon tool-use benchmarks, ACON reduced peak input tokens while largely retaining task performance :citep[kang2026acon].
Neither study validates every command filter; together they show that context reduction is a behavior change to test, not free efficiency.

> **Compact the working view; preserve the raw record**
>
> Treat compressed output as a working view, not as the evidence record.
> Keep raw output retrievable during the run and preserve the producer's exit status independently.
> For bounded qualification cases and consequential failures, retain the original command or query, working directory, separate output streams, pagination or continuation metadata, and explicit omission markers under a stable handle.
> Apply the underlying system's data-minimization, secret-handling, residency, access, and deletion rules; disable archival where those rules cannot be met.
> Prefer native structured output as a comparison baseline, make capture failures visible, and treat retrieved output as untrusted text rather than embedded instructions.
>
> Qualify each important compression policy with the same task cohort and acceptance checks used for the uncompressed view.
> Include compression calls, raw retrievals, retries, and failed attempts when reporting total cost per accepted outcome.
> A reduction in shell-output bytes is only a component metric.

**Tool-output preflight.**
Use instructor-supplied or synthetic non-sensitive raw artifacts for one passing command and one deliberately tricky output: an exit-zero warning, a failing diagnostic, or an unusual line in a repetitive log.
Production and secret-bearing output are outside this exercise.
If the policy claims to handle pagination, add one paginated artifact.

Before generating compact views, list the critical facts in each raw artifact and require every compact fixture to mark at least one explicit omission.
Record the command and tool version, reduction-policy version, configuration, and content hash.
Verify that source status, separate output-stream provenance, critical facts, omission markers, retrieval handle, and pagination metadata survive.
Report critical facts retained over critical facts present, false or materially misleading facts, and any policy-safe fallback.
Passing this preflight can reject an obviously lossy or unsafe policy; claims about cost or task effectiveness require paired end-to-end outcomes.

## Read a harness benchmark's cost denominator

FrontierHarness v1.0 compares 12 configurations across 30 software-development and terminal tasks, using one Kimi K3 model and one attempt per task–configuration cell :citep[zhu2026frontierharness].
Its authors describe interactions among the harness, model, gateway, and caching behavior, and explicitly decline to attribute the cost gap to the harness alone.
Use it as a benchmark-reading exercise: identify the tested configuration and cost population before interpreting a ranking.
A single attempt per cell does not measure repeated-run reliability.

The following numbers are invented teaching data, not FrontierHarness results.
Suppose four distinct tasks each receive one attempt: two accepted attempts cost $1 and $3, while two failed attempts cost $8 and $12.
The total measured execution spend is $24, the acceptance rate is 2/4, and there are no retries or missing usage records.
:ref[table:harness-cost-denominators]{text="The table below"} derives three different summaries from this same cohort.

| Measure                        | Calculation                  | Question answered                                               |
| ------------------------------ | ---------------------------- | --------------------------------------------------------------- |
| Median successful-attempt cost | Median of $1 and $3 = $2     | What did a typical successful attempt cost?                     |
| Mean attempted-task cost       | $24 / 4 attempted tasks = $6 | What did an attempted task cost on average, including failures? |
| Total spend per accepted task  | $24 / 2 accepted tasks = $12 | What did all attempted work cost per accepted task?             |

::caption[Different cost populations produce different answers from the same invented task cohort.]
::label[table:harness-cost-denominators]

Calling all three numbers "cost per task" hides the distinction.
If retries are allowed, include their spend while counting each accepted task once; label missing costs rather than treating them as zero.
Report human review and other unpriced resources separately when they are outside the measured execution spend.

For the published benchmark, also distinguish the median cache-hit rate across runs from the fraction of all input tokens served from cache.
A few long runs can dominate token-weighted usage, and a high cache-hit rate can coexist with expensive failures.
Before transferring a ranking to your project, test representative tasks with repeated fresh trials and the model, gateway, and cache conditions you intend to use.

## From evaluation to routing

A lower per-request price does not necessarily make a model cheaper for a task.
An inexpensive attempt that fails may have to be repeated with a model that succeeds more often on that task, while still consuming context, validation, and review time.
Conversely, always selecting the strongest available model can waste capacity when a smaller model can reliably clear the same acceptance bar.
The useful comparison is therefore cost per accepted outcome, not token price or first-attempt cost.

Research distinguishes **routing**, which selects one model before it produces an answer, from **cascading**, which begins with one model and escalates when evidence indicates that its answer is insufficient.
Both depend on an accurate quality estimate; :citet[dekoninck2025routing] identify estimator quality as a critical condition for improving the cost-performance trade-off.
In their SWE-Bench experiment, the post-generation estimator could use the task's ground-truth test outcomes.
The result therefore shows what a strong verifier can enable, not how well the approach works for tasks without one.
Databricks presents routing as an emerging coding-agent cost-control technique and reports an internal benchmark result, but publishes too little about that router evaluation to predict savings in another codebase :citep[wendell2026codingcosts].
This motivates a local experiment, not a promised saving.

When access rules permit both models—or when instructor-provided outputs are available—choose two models with different measured cost and task-success profiles within the same declared agent harness and assemble a small set of representative tasks.
Keep near-duplicates and tasks from the same module in the same partition, using one partition to define the policy and reserving the other for held-out evaluation.

Define two evidence layers before running the comparison.
The **policy-visible gate** may use deployable signals such as public tests, builds, or static checks to decide whether a cascade should escalate.
The **final adjudicator** uses held-out tests or blinded human review that the policy cannot see; only this layer decides whether the final outcome is accepted.
A policy that stops after passing its visible gate but fails final adjudication is a false acceptance.

On the first partition, define and freeze either a routing rule that uses only facts available before generation or a cheap-first cascade that uses the policy-visible gate after its first result.
Freeze the task features, thresholds, prompts, versions of the model and agent harness, budgets, retry rules, and exclusion rules before inspecting the held-out results.
Compare the policy with always using either model and, when the task set permits it, random selection at the same stronger-model call rate.
The random baseline tests whether the policy selects useful cases rather than benefiting only from its mixture of models.

Report accepted outcomes over all attempted tasks, stronger-model calls, end-to-end latency, human correction, and total cost per accepted outcome.
Count timeouts, tool failures, missing patches, and budget exits as attempted failures.
Include policy decisions, quality estimation, rejected attempts, fallbacks, repeated context, validation, review, and rework in the cost; report unpriced resources separately.
If both model arms are run to reveal counterfactual mistakes, keep that one-time evaluation expense separate from each policy's simulated operating cost.
That comparison can expose false acceptances and unnecessary escalations; without both arms, label the missing counterfactuals as unknown rather than inferring them from an average.

The result supports a local decision only if the policy meets a predeclared quality and risk threshold while improving the chosen cost or latency measure.
After using held-out results to change the policy, evaluate again on fresh tasks.
High-risk work can bypass the router or retain mandatory review, and the policy should be recalibrated when models, prices, agent harnesses, or the task distribution change.

## Compressed evidence and repeated review

Use compact views to direct attention and repeated reviews to search for missed defects.
Keep a common acceptance protocol:

1. Preserve the full artifact and independent checks, and inspect omitted material at consequential decisions.
2. Confirm each finding through a reproduction, reachable path, or violated invariant before judging its impact.
3. Record triage and repair effort, and look for a common cause when several findings recur.
4. Stop against a declared risk threshold; decompose a change that remains too large or coupled to understand.

The cases below show why these controls matter.

> **A reading diff routes attention**
>
> Large changes may repeat the same migration across call sites or include generated and mechanically forced edits.
> [`meat`](https://github.com/boldsoftware/meat) is an experimental tool that asks a model to choose rows to remove, fold, or elide, then mechanically checks and applies that plan to the immutable original diff.
> The surviving code is therefore source-derived rather than regenerated by the model.
>
> The view is still lossy.
> An [author-run analysis of the Python-only diffs from three selected commits](https://github.com/boldsoftware/meat/blob/f39f41dfe7b5b37a12b35fdfbaecc7e779855bd3/analysis/python-famous-commits-2026-08-02/REPORT.md) records an aggregate 30.1% byte reduction; it also documents cases where the output hid decisive test outcomes and made an old/new default inversion look like a one-sided addition.
> The report illustrates the mechanism and its failure modes; it does not measure reviewer effectiveness.
> In a different task, a mutation-based preprint found that GPT-4 and GPT-5.2 summaries of 12 controlled synthetic Python programs and 50 human-written benchmark programs sometimes described familiar algorithmic intent while missing mutated behavior; it did not study diffs or human reviewers :citep[khatib2026summarization].

> **When findings become inventory**
>
> Continued review creates reports that still require verification and a repair decision.
> In a live study at Mozilla and Ubisoft, reviewers directly accepted 8.1% and 7.2% of generated comments, respectively, while another 14.6% and 20.5% were marked useful as review or development tips.
> At Ubisoft, the median instrumented interval for evaluating generated comments was about 43 seconds per patch, an upper bound on active evaluation time.
> The study measured adoption rather than defect-detection accuracy, but it shows that suggestions still consume attention :citep[olewicki2026review].

### Review-evidence exercise

Choose one bounded representative change.
Before opening a compact or agent-produced review view, predeclare two or three behavior or architecture questions.
Record provisional answers after that view, then inspect the complete artifact and relevant checks and record every correction, omitted or misleading critical detail, and the time spent in each stage.
For agent findings, record candidate, independently confirmed, duplicate, and rejected findings together with triage and repair time.
Apply the acceptance protocol above when deciding which findings to repair and when to stop.

## Repeated review is measurement, not proof

Repeating an agent review can reveal variance, but agreement between runs is not independent validation.
VulnBench repeated identical security-review tasks five times across ten small JavaScript and Express fixtures.
Of 158 unique findings that matched its Snyk Code reference, 134 appeared in every repetition; among 161 unmatched findings, 80 appeared only once and 22 appeared in every repetition :citep[tal2026vulnbench].
The recurrence difference is useful for triage, but reference overlap measures agreement with Snyk Code rather than ground-truth accuracy.

Treat each model review as one sample.
Deduplicate repeated findings, record recurrence separately from deterministic-reference overlap, and preserve rare findings for case-level adjudication rather than automatically discarding them.
Consensus can repeat a shared blind spot, while a low-frequency report can still identify a real defect.
Behavioral tests, invariants, deterministic analysis, and accountable review remain the acceptance evidence.

Repeated review also consumes the same scarce integration capacity that bounds the fleet.
If you repeat an agent review, record the fixed code, prompt, agent harness, and model configuration; the number of runs; unique and recurring findings; reviewer time; and cost per accepted finding.
More review samples are justified only when they improve accepted outcomes or allocate human attention better than a single review.

## Research example: evaluating the evaluator

:citet[falck2026training] offer a useful case in which evaluation becomes supervision.
Their Replica setup trains a 27B agent on 242 figure-replication tasks using auto-generated per-task rubrics, three judge samples, and turn-level credit assignment, then scores it on 68 held-out AI-for-science tasks.
The rubric judge was more repeatable than a generic judge in the paper's repeated-sampling analysis.
In a blinded study of ten training tasks selected because the judges disagreed, its Kendall rank correlation with expert rankings was 0.19 rather than 0.15 for the generic judge; on disputed pairs, experts sided with the rubric judge 63% of the time, a difference that was not statistically significant (`p = 0.109`).
Because the same judge design supplied training rewards and the headline evaluation, the task holdout did not make the scoring process independent.
The evidence supports a bounded claim about a lower-noise training signal and improved scores under this judge, not that the judge is ground truth or that the system performs open-ended scientific innovation.

## Research example: coordination and integration

The experiments below separate three properties that are easy to collapse: concurrent writing, coordination, and accepted behavior.
CodeCRDT used a shared CRDT document and an observation-driven claim protocol so agents could edit concurrently without locks.
Across 600 evaluations of six small TypeScript and React tasks with Claude Sonnet 4.5, every run converged without a textual merge failure, yet preliminary inspection still found semantic conflicts in roughly 5–10% of results.
Raw completion time ranged from a 21.1% speedup to a 39.4% slowdown depending on the task :citep[pugachev2025codecrdt].
The coordination substrate solved document convergence; it did not make independently reasonable changes semantically compatible or guarantee useful parallelism.

AgentRoom evaluated a separate coordination design that paired a CRDT-backed shared filesystem with explicit file claims, agent status, and message broadcasts :citep[cho2026agentroom].
For the CLI-stable models in its evaluation, two-agent rooms reduced a specific one-file abandonment mode and lowered run-to-run variation relative to solo execution.
At matched compute on one task, its primary LLM-judge composite favored AgentRoom over independent parallel generation followed by post-hoc file union.
A separate seven-run bundle probe ordered the full system above shared-only and prompt-only partial conditions, but the interval for the coordination-layer step included zero.
The result remains preliminary.
The paper was a recent preprint, its headline tasks shared one Express and TypeScript environment, agents authored their own tests, and the main quality comparison did not use a held-out execution oracle.

Repository-scale evidence shows why this distinction matters outside a controlled shared document.
AgenticFlict selected 142,652 open or closed-but-unmerged agent-authored pull requests from the AIDev dataset; deterministic merge simulation succeeded for 107,026, and 27.67% of that restricted sample produced textual conflicts :citep[ogenrwot2026agenticflict].
The dataset does not isolate fleets or establish that agents caused the conflicts; it measures agent-authored changes colliding with the repository state into which they would be merged.
It nevertheless documents a substantial collection of integration failures that a fleet design should not treat as an incidental cleanup concern.

Together, these studies support a bounded conclusion.
A shared substrate can prevent some textual collisions, and an explicit coordination interface can reduce some duplicated or abandoned work, but neither replaces a settled contract or end-to-end acceptance evidence.
Parallelize only work whose ownership and dependencies are clear, then test the integrated behavior through the web boundary.

## Field note — Let repeated failures shape the first evals

My practical threshold for codifying an eval is when I begin to see a pattern and trust my judgment enough to describe it.
I do not yet have enough experience to claim a general method for designing strong eval suites, however.
So far, I have mostly allowed development models to propose the evaluators, then complained about obvious weaknesses I found while reviewing their code.

[Slideotter](/case-studies/slideotter/) provides the clearest example of where this still became useful.
The repository preserves the resulting [generation fuzz harness](https://github.com/bebraw/slideotter/blob/main/scripts/fuzz-lmstudio-generation.ts).
I asked a stronger development model to mutate presentation scenarios and exercise the smaller local models through that harness.
The mutations explored combinations and failure cases I would not have devised on my own.

Some outputs failed in surprising ways.
Those failures became new regression scenarios, stronger validators, and improvements to the surrounding prompts, schemas, and generation scaffolding.
The resulting loop helped me extract more useful behavior from weaker local models.

This was closer to mutation-based probing than an independent evaluation of presentation quality.
The development model could introduce its own blind spots, and model-generated evaluators could reward the same assumptions that shaped the implementation.
Structural and rendering checks could establish that a presentation was valid under the tested scenarios; they could not establish that it communicated the topic well.

I therefore treat generated evals as a way to discover and preserve recurring failure patterns, not as an automatic source of ground truth.
Editorial judgment remains necessary until repeated observations become clear enough to encode and the evaluator itself has been challenged against known successes and failures.
