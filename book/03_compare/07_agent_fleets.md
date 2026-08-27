# How to coordinate agent fleets?

An agent fleet is a coordinated set of agents or agent roles working on parts of a larger task.
Using the anatomy introduced earlier, a fleet connects several goal-directed observe–decide–act loops rather than creating a new kind of agent.
One agent's artifact or message can become another agent's observation, while the orchestration layer assigns goals, routes results, and controls shared tools and state.
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

This allocation problem has a longer research history.
Mixed-initiative interaction combines direct human control with automation while considering uncertainty, costs, and benefits :citep[horvitz1999mixedinitiative], and the design target is appropriate reliance rather than maximum trust :citep[lee2004trust].
Joint-activity research adds common ground, mutual predictability, and directability :citep[klein2004teamplayer], while human-AI interaction guidance emphasizes making capabilities and likely errors visible and supporting invocation, dismissal, and correction :citep[amershi2019guidelines].

:ref[table:fleet-decision-responsibility]{text="The table below"} gives one concrete allocation of performance, authority, evidence, recovery, and accountability across a feature's decision path.

| Decision                           | Performer and authority                                   | Acceptance evidence                                              | Escalation or recovery                                          | Accountable owner |
| ---------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- | ----------------- |
| Interpret an ambiguous requirement | Agent proposes interpretations; human selects or reframes | Examples, affected users, assumptions, and unresolved questions  | Escalate when alternatives change the required behavior         | Outcome owner     |
| Change a shared interface          | Agent prepares an ADR and compatibility analysis          | Contract checks, affected consumers, migration and rollback plan | Escalate before breaking or externally visible change           | System owner      |
| Implement a bounded change         | Agent executes within named files, tools, and budget      | Focused tests, baseline gate, diff, and known limits             | Stop on scope expansion, failed invariant, or unavailable check | Integrating human |
| Release and observe                | Automation executes an approved reversible path           | Deployment identity, health signals, and rollback trigger        | Roll back or page the named responder on threshold breach       | Release owner     |

::caption[Example allocation of authority, evidence, recovery, and accountability across development decisions.]
::label[table:fleet-decision-responsibility]

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

A project harness, an agent execution loop, fleet orchestration, and a gateway that mediates model or tool requests control different units of work.
One product may combine them, but the design should still distinguish task decisions from resource-access decisions.
A responsibility recorded in a plan without a mandatory enforcement point remains an intention.

For one delegated task, trace:

`originating actor → fleet session → delegated task → model or tool attempt → validation → delegated-run outcome`

Propagate only the necessary identity, scoped authority, task, trace, budget, and policy identifiers, and require each enforcement point to validate the facts it relies on.
Return which resource was actually selected, the policy decision, measurable usage and cost, and an explicit outcome for the delegated run.
A trace identifier connects evidence; it is not proof of identity or permission.

Keep telemetry proportionate.
Capture prompts, source, tool arguments, approval details, or principal data only when the operational question requires them, with redaction, access control, and deliberate retention.
For the B–C comparison, pin the declared base model where possible and record substitutions as confounding factors.

[Appendix D: Agent-system security, control, and traceability](/appendices/agent-system-security/#separate-task-control-from-resource-access) develops the control-plane distinction, enforcement audit, trace reconciliation, bypass checks, and fleet trace debugger.

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

### Reliability and repeated review

Repeating an agent review can reveal variation, but agreement between runs is not independent validation.
Consensus can repeat a shared blind spot, while a rare finding can still identify a real defect.
Deduplicate findings, preserve the fixed code and workflow configuration, and use behavioral evidence and accountable review to decide what is accepted.
[Appendix A](/appendices/evaluating-agentic-workflows/#repeated-review-is-measurement-not-proof) develops the full repeated-review method.

Long workflows create a second reliability question: when every critical step must succeed, small per-step failure probabilities compound.
This series-system model is useful as a design probe, but real steps can share failure causes and later validation can sometimes repair earlier errors.
[Appendix E](/appendices/scalability-models/#lussers-law-and-the-reliability-chain) develops Lusser's Law, separates detection from repair, and includes the reliability-chain lab.

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

An agent's role should define both what it may read and which actions it may take.
A particularly dangerous combination gives an agent private data, exposes it to untrusted content, and lets it communicate externally.
Prompt injection can then turn legitimate permissions into an exfiltration path.

Imported skills, plugins, instructions, code, and configuration are development dependencies.
Record their source and resolved revision, inspect their requested access and update path, and connect their output to independent project checks.
Use a disposable least-privilege sandbox for any approved dynamic verification, without production credentials.

Persistent infrastructure can also become unintended project memory.
Artifacts, caches, queues, logs, temporary storage, and remote workspaces cross a run boundary when one run can leave state that survives, is discoverable, and influences another.
Record who can write and read each channel, how writes are attributed, what may be stored, how long it persists, and how it is cleared.

Break risky combinations where possible: a scout reading untrusted issues may not need secrets or network-writing tools; an implementer may use scoped files without deployment credentials; a publisher may receive a reviewed artifact rather than the private context that produced it.
[Appendix D](/appendices/agent-system-security/#trust-boundaries) contains the capability-adoption procedure, cross-run-memory incident case, and complete security review.

### Upstream work needs a human owner

An issue or patch submitted upstream asks someone else to spend scarce attention on triage, comprehension, review, integration, and follow-up.
:citet[gruhn2026meatproxy] describes a failure mode in which a person forwards model output and routes reviewer feedback back through the model without first understanding and validating the work.
Writing the request in your own words is only a signal of engagement, not proof of correctness, but the submitting human should be able to restate the intent, explain the evidence and limits, answer feedback, and correct or withdraw the change.

:citet[garbutt2026humanity] distinguishes agent-assisted human contributions from end-to-end agent submissions and argues that the latter can transfer effort to maintainers and weaken the relationships through which contributors become maintainers.
His supporting data covers five selected projects, the projected annual changes simply double first-half totals, and the source cannot identify which pull requests were agent-generated; the observations illustrate a plausible cost-transfer mechanism rather than establish causal prevalence or community effects.
Before allowing an agent to publish upstream, require explicit human authorization, follow the project's policy and templates, respect opt-outs and rate limits, disclose material assistance when requested, and measure accepted maintenance value rather than submission volume.

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
Reuse the workflow-evaluation pattern from [Appendix A](/appendices/evaluating-agentic-workflows/): define a small set of representative tasks, add deterministic probes for expected artifacts and validation commands, inspect the failing task, and record cost, latency, and human review time.
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
