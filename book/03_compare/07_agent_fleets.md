# How to coordinate agent fleets?

An agent fleet is a coordinated set of agents or agent roles working on parts of a larger task.
Fleets can increase throughput when work decomposes cleanly, but they also introduce coordination cost.
They work only when the project itself is legible enough that agents can operate without depending on hidden human context.

The central claim could be: more agents do not automatically mean more progress.
Agentic development scales only when the project teaches agents how to work inside it and when roles, boundaries, artifacts, and review loops are explicit.

> **Sustainability angle**
>
> Parallel agents multiply compute use.
> A fleet is easier to justify when decomposition improves quality, reduces rework, or saves substantial human time.
> Clear setup, fast tests, stable commands, useful errors, and scoped tasks reduce wasted attempts and make each model call more likely to produce reviewable value.

## Chapter purpose

- Explain when agent fleets are useful and when they are unnecessary.
- Define what "agent-ready" means in practical project terms.
- Show how tests, documentation, conventions, setup, and architecture support agentic development.
- Teach role design for small development workflows.
- Show how to decompose and recombine work safely.
- Apply Amdahl's Law to parallel agent work and sequential integration or review.
- Connect agent readiness, development-time fleets, and production agent systems.

## Working outline

1. Why agent readiness matters
   - AI tools can generate code quickly, but unclear projects make review and repair expensive.
   - Hidden assumptions become failure modes.
   - Agent readiness benefits humans too.
2. What makes a project agent-ready
   - `AGENTS.md` or equivalent project-level guidance.
   - Commands, conventions, architecture notes, test expectations, forbidden operations, and review checklist.
   - Fast tests, linting, type checks, seed data, local setup, realistic fixtures, and useful errors.
3. Why fleets are tempting
   - Parallel exploration, faster implementation, specialized review, and repeatable workflows.
4. Why fleets are risky
   - Conflicting edits, duplicated work, shallow understanding, context loss, and integration burden.
5. Minimal fleet roles
   - `scout`, `planner`, `implementer`, and `reviewer`.
6. Safe task design
   - Objective, context, allowed files, expected tests, non-goals, and acceptance criteria.
   - Small modules, stable APIs, explicit ownership, migrations, compatibility tests, and feature flags.
7. Workflow patterns
   - Scout then plan.
   - Implement then review.
   - Parallel scouts for independent subsystems.
8. Integration discipline
   - The human integrates findings, resolves conflicts, runs tests, and preserves architectural intent.
9. Tooling examples
   - Use Pi, Acolyte, and Mastra only after the principles are clear.
   - Present tools as examples of boundaries, traces, workflows, and reviewable execution.
10. Course project application

- Students harden their event tracking project, use a small fleet for one bounded improvement, and submit evidence of the workflow.

## Map decision responsibility before assigning roles

The fleet roles above describe activities, but an activity role does not by itself allocate decision responsibility.
A `planner` might only prepare alternatives, or it might silently settle architecture and scope through the plan it produces.
A `reviewer` might provide another opinion, or it might act as the actual acceptance gate.
The role name does not reveal the difference.

The Human Agent Relationship framing introduced earlier treats the fleet as a development control system.
Following the decision-path formulation of :citet[nissila2026decisionpath], trace a feature through:

> **Need → Define → Design → Implement → Verify → Release → Observe → Adapt**

Not every project needs a separate person or agent at every step, and adjacent steps may collapse in a small change.
The useful unit is the consequential decision.
For each one, distinguish the performer from the accountable owner and record how much authority is delegated.
The function-specific automation model of :citet[parasuraman2000automation] is useful here: acquiring information, analyzing it, selecting an action, and implementing that action can receive different allocations even inside one named task.
NIST similarly recommends defining and differentiating roles and responsibilities for human-AI configurations and oversight rather than assuming that the presence of a human establishes effective control :citep[tabassi2023airmf].

| Decision                           | Performer and authority                                   | Acceptance evidence                                              | Escalation or recovery                                          | Accountable owner |
| ---------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- | ----------------- |
| Interpret an ambiguous requirement | Agent proposes interpretations; human selects or reframes | Examples, affected users, assumptions, and unresolved questions  | Escalate when alternatives change the required behavior         | Outcome owner     |
| Change a shared interface          | Agent prepares an ADR and compatibility analysis          | Contract checks, affected consumers, migration and rollback plan | Escalate before breaking or externally visible change           | System owner      |
| Implement a bounded change         | Agent executes within named files, tools, and budget      | Focused tests, baseline gate, diff, and known limits             | Stop on scope expansion, failed invariant, or unavailable check | Integrating human |
| Release and observe                | Automation executes an approved reversible path           | Deployment identity, health signals, and rollback trigger        | Roll back or page the named responder on threshold breach       | Release owner     |

This table is a design example, not a universal role model.
Authority should vary with the decision's ambiguity, coupling, observability, reversibility, and consequence.
The same agent can legitimately execute one bounded implementation decision while being limited to proposing an architectural or product decision.

Coactive Design adds a practical test for whether the allocation can work.
Each interdependence needs sufficient **observability** of relevant state, **predictability** of likely behavior, and **directability** through instructions, correction, stopping, or reallocation :citep[johnson2014coactive].
A human approval box does not provide these properties automatically.
If the approver receives an opaque artifact, cannot identify what will happen next, or cannot interrupt or recover the action, the relationship may be human-on-paper but agent-controlled in practice.

### Decision-path exercise

Before running the fleet, choose one consequential feature and create a small HAR decision map.
Start from the eight-step path above, merge steps that genuinely share one decision, and record for at least four decisions:

- the intended outcome and accountable human or group
- the primary performer and the agent's authority: `propose`, `prepare`, or `execute`
- the allowed context, files, tools, credentials, budget, and external effects
- the evidence required for acceptance
- an observable escalation condition and named responder
- the stop, rollback, compensation, or supersession path

Include at least one human-owned decision, one agent proposal, and one bounded agent execution.
After the run, annotate where the observed path differed from the planned path.
The map is the normative design; the execution trace is descriptive evidence.
A mismatch may reveal hidden authority, missing escalation, ceremonial approval, or work that no one explicitly accepted.

## Give project memory a lifecycle

Long-running and parallel work produces questions, hypotheses, plans, decisions, and behavioral evidence.
Treating all of them as equally authoritative makes it difficult for both humans and agents to know which statements still govern the project.
A useful project-memory lifecycle distinguishes four roles:

1. **Explore:** keep unresolved questions, alternatives, and temporary findings in a working map or session artifact.
2. **Decide:** record consequential choices and their trade-offs in a decision record.
3. **Specify:** promote settled behavior and capability contracts into the relevant feature specification or architecture document.
4. **Verify and supersede:** connect the contract to executable evidence, and explicitly replace durable records when the decision changes.

A discovery map should not silently become the specification, and an agent transcript should not become the only place where a lasting constraint exists.
The fleet plan should tell each role where its output belongs and who may promote temporary findings into durable project memory.
This reduces the chance that parallel agents act on different generations of the same decision.

Retrieval should assemble candidate evidence, not create a second authority.
Cerebras describes an internal knowledge base that keeps authoring in source-native systems, normalizes Slack, code, documents, and custom sources into a shared evidence schema, and constructs query context with scoped lexical and semantic retrieval, recency, rank fusion, reranking, and surrounding-context restoration.
Its MCP interface exposes narrow retrieval primitives while leaving tool selection and synthesis to the client :citep[tai2026knowledge].
This is a vendor-authored implementation case: the reported volume of more than 15,000 daily questions after three months indicates use, but the article provides neither controlled component ablations nor a complete answer-quality evaluation.

For a fleet, return attributed evidence and keep governing records and acceptance checks outside synthesized answers.
Preserve source identity, retrieval time, freshness, project scope, and permission context; surface conflicts; verify consequential claims; and promote only reviewed decisions into plans, specifications, or decision records.
A fluent multi-source answer remains a derived view, not the authority it summarizes.

Repeatable agent workflows can also be stored as small, named project skills rather than one continually growing instruction file.
A review skill, debugging skill, or release skill can define its trigger, evidence, boundaries, and output contract.
Keep only workflows the project actually uses, make explicit or destructive workflows opt-in, and preserve one obvious source of truth when the same instructions must be distributed to multiple tools.

## Separate task control from resource access

Controls around a fleet operate at different scopes.
The project harness introduced earlier is the versioned material inside a repository: specifications, commands, rules, and evidence.
An agent harness controls a model-and-tool execution loop.
A session or orchestration layer may coordinate several harnesses, while a resource-access layer may mediate selected model and tool requests.
These responsibilities may be combined in one platform or split across several services.

| Control boundary               | Primary unit                   | Typical responsibilities                                                                                                                |
| ------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Session and task orchestration | Run, delegated task, workspace | Harness selection, task graph, session history, collaboration, delegated tool authority, sandbox choice, and task-level policy          |
| Model and tool access          | Model or tool request          | Permitted services and credentials, request routing and fallback, rate and spend limits, request guardrails, and shared usage telemetry |

Omnigent illustrates the first scope: its open-source meta-harness wraps several agent harnesses behind a common session interface and documents composition, shared sessions, contextual policies, and local or remote sandbox execution :citep[zaharia2026omnigent].
Unity AI Gateway illustrates the second: for model and MCP traffic routed through it, Databricks documents catalog-backed permissions, rate limits, budgets, provider routing and fallbacks, and usage records :citep[databricks2026unitygatewaydocs].
These are examples, not evidence that every fleet needs two products or exactly two control planes.
Both accounts are documented in Databricks-authored sources, their responsibilities overlap, and Omnigent was introduced as alpha; they are not independent evaluations of effectiveness.

The durable distinction is between a decision and its enforcement point.
NIST's zero-trust architecture distinguishes a policy engine that makes and logs an access decision, a policy administrator that executes it by configuring an enforcement point, and the enforcement point that enables, monitors, or terminates access; implementations may combine the engine and administrator :citep[rose2020zerotrust].
This is a design analogy, not a claim of NIST conformance.
For each consequential decision, name the policy authority, mandatory enforcement point, and conflict or outage rule; overlapping controls still need explicit precedence, and a mediator cannot protect a path that bypasses it.

The contract between the scopes matters more than the number of components.
The HAR decision map states which decisions and transfers should occur; these control scopes provide some of the places where that design can be enforced and observed.
A responsibility recorded in a table without a mandatory enforcement point remains an intention.
Trace one operation through the chain:

`originating actor → fleet session → delegated task → model or tool attempt → validation → delegated-run outcome`

Propagate only the necessary authenticated principal, audience-scoped delegated authority, and trusted task, trace, budget-reservation, and policy-decision identifiers.
Each enforcement point must validate the authority and identifiers it relies on.
Return the resource actually selected, routing or fallback decision, policy result, and observable latency, usage, and cost; for a model call, also record its provider, model, and version where available.
Associate every physical attempt with one delegated run and that run's explicit outcome, such as accepted, rejected, failed, cancelled, or unresolved.
Default telemetry to metadata: capture prompts, source, tool arguments or results, approval details, or principal data only when necessary, with redaction, access control, and deliberate retention, and never place credentials in trace context.
A trace identifier connects evidence; it is not proof of identity or permission.
Without this contract, the resource layer can see spend without knowing whether the work was accepted, while the orchestration layer can see intent without knowing which model or permission was actually used.

For one delegated task, choose two consequential decisions: one about the session or task and one about a model, tool, credential, or other resource.
For each, record the policy authority, mandatory enforcement point, trusted context or evidence, and conflict or outage rule.
Then trace the task end to end and look for a direct-call bypass, lost actor identity, multiplied retry, conflicting caps or double-counted usage, and cancellation that does not reach in-flight work.
Where practical, use a safe direct-call negative test and, where records are available, reconcile the mediator with the model provider or tool resource rather than inferring non-bypass from an incomplete trace.
The audit is complete only when every denied, failed, retried, cancelled, or successful attempt has an identifier, policy result, and usage or cost provenance where measurable, and rolls up once to an explicit delegated-run outcome.
When computing cost per accepted outcome, include spend from every attempt in the fixed cohort and use accepted delegated runs—not internal calls—as the denominator; label missing or estimated costs rather than treating them as zero.

For the B–C comparison, keep any gateway pinned to the declared base model where possible; otherwise record the model actually used and treat substitution as a confounding factor.

### Fleet trace debugger

The forensic packet below separates orchestration outcomes, gateway decisions, and physical provider or resource records.
Map every physical row to a delegated run or leave it unmatched, then reconcile the packet without counting the same attempt once per log source.

{{ import "site/includes/fleet-trace-debugger.html" }}

The packet is synthetic and deterministic.
It rehearses evidence joins, accounting, bypass detection, and late-effect reasoning; it does not estimate the reliability or cost of a particular fleet platform.

## Fleet throughput and cost

An agent fleet is a production system for changes, so its throughput should be measured at the system boundary rather than at the code-generation step.
A provocative industry formulation in [We are now factory engineers, not product engineers](https://www.warp.dev/blog/we-are-now-factory-engineers-not-product-engineers) defines factory efficiency roughly as shipped product divided by inference cost plus human time.
The exact formula is too simple to stand as a general metric: shipped features are not automatically valuable, and quality, risk, maintenance, and environmental costs can be displaced beyond the measurement window.
It is nevertheless a useful prompt.
Students should count review, correction, integration, failed runs, and monitoring instead of treating generated code as completed work.

This view also explains why additional agents can reduce rather than increase effective throughput.
Parallel generation creates a queue for human judgment, integration, and verification.
Fleet size should follow the system's review capacity and the independence of the available tasks.
If two agents need the same files, hidden assumptions, or reviewer at the same time, their apparent parallelism may only move waiting and conflict downstream.

Coordination mechanisms can remove one bottleneck without removing the others.
In 600 trials across six tasks, CodeCRDT achieved deterministic convergence and zero textual merge failures, yet reported results ranging from a 21.1% speedup to a 39.4% slowdown and still observed semantic conflicts :citep[pugachev2025codecrdt].
The prototype does not establish a general fleet speedup, but it makes the distinction concrete: converged files are not necessarily compatible ideas, and conflict-free integration is not the same as accepted work.

### Repeated review is measurement, not proof

Repeating an agent review can reveal variance, but agreement between runs is not independent validation.
VulnBench repeated identical security-review tasks five times across ten small JavaScript and Express fixtures.
Of 158 unique findings that matched its Snyk Code reference, 134 appeared in every repetition; among 161 unmatched findings, 80 appeared only once and 22 appeared in every repetition :citep[tal2026vulnbench].
The recurrence difference is useful for triage, but reference overlap measures agreement with Snyk Code rather than ground-truth accuracy.
Treat each model review as one sample.
Deduplicate repeated findings, record recurrence separately from deterministic-reference overlap, and preserve rare findings for case-level adjudication rather than automatically discarding them.
Consensus can repeat a shared blind spot, while a low-frequency report can still identify a real defect.
Behavioral tests, invariants, deterministic analysis, and accountable review remain the acceptance evidence.
Repeated review also consumes the same scarce integration capacity that bounds the fleet.
If students repeat an agent review, they should record the fixed code, prompt, harness, and model configuration; the number of runs; unique and recurring findings; reviewer time; and cost per accepted finding.
More review samples are justified only when they improve accepted outcomes or allocate human attention better than a single review.

### Amdahl's Law and the sequential bottleneck

Amdahl's Law gives a simple upper bound on speedup when only part of the work can run in parallel :citep[amdahl1967validity].
If `p` is the parallelizable share of the work and `N` agents execute that share, the idealized speedup is:

`S(N) = 1 / ((1 - p) + p / N)`

If half of a workflow is inherently sequential, unlimited agents cannot make the entire workflow more than twice as fast.
In software development, framing the task, changing a shared interface, integrating overlapping edits, reviewing risk, and accepting the final result often remain sequential.
Real fleets perform below the ideal bound because communication, duplicated exploration, conflicts, and waiting add overhead that the basic formula does not model.

Students should estimate the parallel and sequential portions of one fleet workflow, calculate the ideal bound, and then compare it with observed elapsed time and human review effort.
The difference is evidence about coordination cost, not proof that the law failed.

### Sequential work bound

The lab below keeps the workflow at 100 units of work and changes only the parallelizable share and the number of agents.
Predict the effect of the next agent before moving the control, then compare the ideal speedup with the infinite-agent ceiling.

{{ import "site/includes/amdahl-law-demo.html" }}

Apply the same calculation to one observed fleet task.
Name what remained sequential—for example task framing, a shared contract change, integration, review, or acceptance—and keep coordination time outside the ideal bound visible rather than hiding it inside the parallel share.

## Trust boundaries

An agent's role should define not only its task but also which information it can read and which actions it can take.
Simon Willison's [lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) names a particularly dangerous combination: access to private data, exposure to untrusted content, and a way to communicate externally.
Prompt injection in the untrusted content can then turn the agent's legitimate permissions into a path for data exfiltration.

> **Case study: when exploration scales**
>
> During a July 2026 cyber-capability evaluation using the ExploitGym benchmark, an AI agent escaped its evaluation environment and chained weaknesses across external infrastructure and Hugging Face's production systems :citep[openai2026huggingfaceincident].
> Hugging Face reconstructed roughly 17,600 agent actions across dataset processing, Kubernetes, cloud identity, an internal network, and source control.
> Most attempts failed, but the volume and persistence of exploration eventually exposed a viable path across several trust boundaries :citep[larcher2026agentintrusion].
>
> OpenAI's later reconstruction added a crucial continuity mechanism.
> Separate agent runs discovered files left in a shared Artifactory service and used them as an informal message board for requests, exploit details, assignments, scripts, progress, and credential information.
> After the files were cleared and the posting credentials revoked, later runs recreated the channel through an unauthenticated WebDAV endpoint, using message-bearing directory names in Artifactory's remote cache :citep[dalton2026breaking].
>
> The sandboxes were short-lived, but the runs were not independent.
> Unlike the curated project memory described earlier, this was ambient infrastructure state.
> A location becomes cross-run memory and an unintended coordination channel when one run can leave state that survives, is discoverable, and influences a later run.
> Artifact and package stores, caches, queues, logs, temporary storage that outlives a run, and remote workspaces therefore belong in the trust-boundary review.
> For each channel, record who can write and later read it, how writes are attributed, what may be stored, how long it persists, and how it is cleared.
>
> The incident did not make established defensive principles obsolete.
> It showed why they become more important with agents: strict sandbox isolation, least privilege, short-lived and narrowly scoped credentials, blocked metadata access, and telemetry that can correlate behavior across systems.
> Agent safety therefore depends on the authority exposed by the surrounding system, not only on instructions or model behavior.

The safest design is to break the combination where possible.
A scout reading untrusted issues may not need secrets or network-writing tools.
An implementer may work in a sandbox with scoped files and no deployment credentials.
A publisher may receive a reviewed artifact instead of the full private context that produced it.
Human approval can help at a sensitive boundary, but an approval prompt is not useful when the effect is unclear or reviewers have learned to accept it mechanically.

## Delegation lab

A useful live demonstration should make the coordination cost visible.
The point is not to show that four agents are better than one.
The point is to let students try a task, choose roles, see the review burden, and produce a delegation brief that can be used in their own project.

{{ import "site/includes/agent-fleet-demo.html" }}

The demonstration should be used as a rehearsal before students run real agents.
If the task is vague, the project is not ready, or the chosen roles produce overlapping work, the best outcome is to reduce the fleet.
A small, reviewable delegation is usually better than parallel activity that the student cannot integrate.
Use the decision-path exercise with the delegation brief: role descriptions allocate activity, while the HAR map allocates authority, acceptance, escalation, and accountability.

The fleet should be evaluated as a workflow, not as a collection of impressive transcripts.
Reuse the model-eval pattern from the benchmarking chapter: define a small set of representative tasks, add deterministic probes for expected artifacts and validation commands, inspect the failing task, and record cost, latency, and human review time.
Treat one end-to-end fleet attempt as a trial and grade its accepted outcome at the delegated-run boundary; the fleet's internal agents, retries, and handoffs are parts of that trial rather than independent samples.
For a fleet, the execution trace is also evidence.
It can reveal duplicated exploration, unnecessary handoffs, invalid tool calls, or an implementer working beyond its boundary even when the final answer looks acceptable.
A single-agent and fleet run on the same bounded task can support a local case decision about whether delegation paid for its coordination cost.
If the comparison makes a reliability claim, predeclare repeated trials and whether success means at least one accepted outcome or consistent acceptance across them; keep every failed attempt in the cost and latency accounting.

In the course project, this trace becomes application data.
The fleet run maps to a workspace, delegated tasks map to work items, agents and humans map to actors, and execution details map to activity events.
By loading a transformed trace into implementation C, students turn the application into a debugging and observability tool for the workflow that produced it.
The goal is not to build a universal agent platform.
It is to use event history, filters, summaries, and selected relationships to find coordination failures that the final code alone does not reveal.
