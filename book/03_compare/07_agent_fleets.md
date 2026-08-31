# When do agent fleets improve web development?

An agent fleet is a coordinated set of independently operating agent executions working on parts of a larger task.
The distinction matters.
Writing four role descriptions into one prompt may help one agent reason, but it does not create four execution contexts, four tool users, or parallel work.
A fleet connects several goal-directed observe–decide–act loops: one agent's artifact or message becomes another agent's observation, while an orchestration layer assigns work, routes results, and controls shared tools and state.

For web development, the attraction is clear.
A feature often spans interaction design, browser behavior, an API contract, persistence, deployment, and verification.
Those concerns create possible parallel work, but they also create seams where a locally reasonable change can break the application as a whole.
The central claim of this chapter is therefore that more agents do not automatically mean more progress.
Agentic development scales only when the work decomposes cleanly, the project teaches agents how to operate inside it, and integration and error correction remain explicit.

Unless stated otherwise, “fleet” here means part of the development system that produces a web application.
An agent deployed inside the application is a runtime component with its own users, data, permissions, latency, evaluation, and operational obligations.
The settings reuse concepts such as tools, traces, workflows, and access control, but they are not the same experiment.

> **Sustainability angle**
>
> Parallel agents multiply compute use.
> A fleet is easier to justify when decomposition improves quality, reduces rework, or saves substantial human time.
> Clear setup, fast tests, stable commands, useful errors, and scoped tasks make each model call more likely to produce reviewable value.

## From one agent to a fleet

A fleet should be an answer to the shape of the work, not the starting assumption.
Begin with the smallest coordination structure that can complete the task.

| Stage                 | Structure                                                       | Useful when                                                           | New cost or risk                                                     |
| --------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| One agent             | One context and action stream                                   | The change is small, coupled, or depends on frequent interpretation   | Limited concurrency; one interpretation can dominate                 |
| Sequential delegation | One agent hands a bounded result to the next                    | Later work genuinely depends on an earlier finding or decision        | Handoff latency and accumulated misunderstanding                     |
| Parallel specialists  | Independent agents work against a settled interface             | Tasks touch different modules and have independently testable outputs | Duplicate exploration, conflicts, and a growing review queue         |
| Integrated fleet      | Orchestration, isolated workspaces, shared contracts, and gates | The workflow repeats often enough to justify explicit infrastructure  | Control, observability, recovery, and integration become system work |

::caption[Progression from a single coding agent to an integrated development fleet.]
::label[table:fleet-progression]

The first useful expansion is often sequential rather than parallel.
A read-only scout maps the relevant routes, components, data flow, and tests; an implementer then receives the compressed findings and a bounded objective.
This keeps noisy reconnaissance out of the implementation context without pretending that dependent work can happen simultaneously.
An implementer followed by a reviewer is another sequential pattern: the reviewer receives a concrete diff and validation evidence rather than guessing what might change.

Parallelism becomes reasonable only after a shared decision has settled the seam between tasks.
For implementation C, one possible dependency graph is:

`reconnaissance → shared domain and API contract → interface work ∥ data work → integration → browser acceptance`

The interface and data branches may run together because both depend on the same contract.
The contract itself, integration, and end-to-end acceptance remain sequential.
If both branches need to reinterpret the lifecycle, edit the same schema, or wait for the same person, their apparent parallelism merely moves waiting and conflict downstream.

### Amdahl's Law and the sequential bottleneck

Amdahl's Law gives a simple upper bound on speedup when only part of the work can run in parallel :citep[amdahl1967validity].
If `p` is the parallelizable share and `N` agents execute that share, the idealized speedup is:

`S(N) = 1 / ((1 - p) + p / N)`

If half of a workflow is inherently sequential, unlimited agents cannot make the whole workflow more than twice as fast.
In web development, framing the feature, settling a shared interface, integrating overlapping edits, reviewing risk, and accepting the browser-visible result often remain sequential.
Real fleets perform below the ideal bound because communication, duplicated exploration, conflicts, and waiting add overhead that the formula does not model.

The lab below keeps the workflow at 100 units of work and changes only the parallelizable share and number of agents.
Predict the effect of the next agent before moving the control, then compare the ideal speedup with the infinite-agent ceiling.

{{ import "site/includes/amdahl-law-demo.html" }}

Apply the calculation to one observed fleet task.
Name the sequential work and keep coordination time visible rather than hiding it inside the parallel share.
The difference between the ideal bound and the observed result is evidence about coordination cost, not proof that the law failed.

## What documented web-development cases show

The shift is visible in web delivery.
Vercel [reported in April 2026](https://vercel.com/blog/agentic-infrastructure) that coding agents initiated more than 30% of deployments on its platform, up 1,000% over six months.
That is vendor telemetry from one platform rather than an industry-wide measurement, but it shows that agentic web development is no longer limited to editor experiments.

The four company-authored accounts below are more useful for examining how the work changes.
Each describes its author's own tools and measurements; none is a controlled comparison showing that the result will transfer to the course project.

| Documented case                                                                                                                        | Practice in the web-development workflow                                          | Reported evidence and important limit                                              | Transfer question                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [GitHub assigns Copilot work in github.com](https://github.blog/ai-and-ml/github-copilot/how-copilot-helps-build-the-github-platform/) | Issues become proposed changes to UI, APIs, migrations, and production code       | One month of task examples; no counts, review time, or defect rate                 | Which decisions may an agent execute, and who accepts the result?        |
| [Vercel teaches agents product design](https://vercel.com/blog/teaching-agents-product-design-at-vercel)                               | Repository skills, linters, and review carry UI and interaction decisions forward | Skills went unused in 56% of separate Next.js eval cases; setup-specific           | How does a web project make product judgment available and maintainable? |
| [Stripe runs parallel Minions](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents)                              | Unattended agents produce pull requests in isolated development environments      | More than 1,000 agent-written PRs merged weekly; no attempt or quality denominator | What infrastructure makes parallel work bounded and reviewable?          |
| [Stripe evaluates web integrations](https://stripe.com/blog/can-ai-agents-build-real-stripe-integrations)                              | Agents modify frontends, backends, databases, and live payment flows              | Eleven realistic environments with UI and API graders; deliberately small suite    | What evidence establishes that the resulting web behavior is correct?    |

::caption[Documented agentic-development cases and their transfer questions.]
::label[table:documented-agentic-development-cases]

Four lessons transfer without retelling each case.

First, **execution and acceptance are separate**.
Assigning an issue to an agent changes the primary performer; it does not automatically transfer the authority to merge, release, or declare the result correct.
Second, **making guidance available is not the same as applying it**.
Repository instructions, product-design skills, examples, and linters can make hidden web conventions legible, but retrieval and correct application remain distinct failure modes.
Third, **parallel activity is not accepted throughput**.
Isolated environments and automated checks make more concurrent attempts possible, yet review, integration, and failed attempts still consume time and compute.
Fourth, **web correctness has to be tested through the web boundary**.
Component, API, and database checks matter, but they do not replace a browser journey that crosses the layers the user actually experiences.

Implementation C turns those lessons into a local comparison.
Build the common event-tracking application through a bounded fleet workflow, load the execution trace into the application, and compare the accepted outcome with a single-agent counterfactual.

## Build a small web-development fleet

Pi is the primary teaching environment because its small core makes the orchestration visible.
Its [quickstart](https://pi.dev/docs/latest/quickstart) documents installation, authentication, project-level `AGENTS.md`, and the initial tool set.
Pi's [extension API](https://pi.dev/docs/latest/extensions) can add tools and lifecycle controls, while the repository's [reference subagent extension](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts) demonstrates separate processes, isolated contexts, sequential chains, parallel tasks, and structured output.
The reference is a starting point to inspect and adapt, not evidence that every project should use its exact role or security model.

You may use another agent harness or hosted environment if you preserve the same task graph, evidence, and acceptance boundary.
The tools below solve related but different problems, so compare their unit of delegation before comparing feature lists.
Pi, Hermes, and Claude Code expose agent harnesses that may also coordinate subagents; their processes consume the repository's project harness.
GitHub Copilot exposes a hosted issue-to-pull-request workflow, while the OpenAI Responses example concerns orchestration inside an application.
The table classifies the layer exposed to you rather than every component inside each product.

| Environment                                                                                                                                                                                     | Unit and coordination model                                                                | Isolation or control to inspect                                                          | Best fit in this chapter                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [Pi](https://pi.dev/docs/latest/quickstart) plus its [reference subagent extension](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts) | Local agent processes in single, sequential-chain, or parallel modes                       | Project trust, extension code, agent tools, contexts, and process output                 | Primary hands-on agent-harness lab because you can see and modify the mechanism                 |
| [Hermes Agent](https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation)                                                                                                       | Parent delegates fresh-context children singly or in parallel; nested delegation is opt-in | Inherited toolsets, separate terminals, optional worktrees, iteration and timeout limits | Broader multi-provider agent-harness comparison with built-in delegation and persistent memory |
| [Claude Code](https://code.claude.com/docs/en/agents)                                                                                                                                           | Subagents, parallel sessions, and experimental agent teams                                 | Tool permissions, separate contexts, optional worktree isolation                         | Integrated agent-harness comparison when you want several built-in fleet patterns               |
| [GitHub Copilot cloud agent](https://docs.github.com/en/copilot/how-tos/use-copilot-agents)                                                                                                     | Asynchronous repository task that researches, changes code, and opens a pull request       | Repository policy, hosted environment, checks, and pull-request review                   | Issue-to-pull-request comparison rather than a transparent local fleet                         |
| [OpenAI Responses multi-agent](https://developers.openai.com/api/docs/guides/latest-model#what-is-new)                                                                                          | A model coordinates parallel subagents and synthesizes their results                       | API tools, prompts, application policy, usage, and returned evidence                     | Application-level orchestration comparison rather than an agent-harness lab                    |

::caption[Current paths for trying delegation; verify the linked documentation because these products evolve quickly.]
::label[table:fleet-tool-options]

Hermes is broader than a coding copilot: it includes persistent memory, reusable skills, remote terminal backends, and messaging entry points.
For the course comparison, restrict it to the repository workflow, declare whether persistent memory was available, and enable worktree isolation for concurrent writers.

Production-agent frameworks are outside this table.
They help teams deploy agent workflows inside applications, whereas the chapter's primary question is how agents build and verify a web application.

### Prepare the project before adding agents

Install Pi following its current quickstart, authenticate with a provider, and start in a version-controlled project.
Before adding subagents, ask one agent to inspect the repository:

> Inspect this project and propose an `AGENTS.md`; do not edit yet.
> Include the project purpose, setup and validation commands, coding conventions, architectural boundaries, forbidden operations, and review checklist.
> Cite the files that support each proposal and mark unknowns.

Review the proposal before saving it.
An instruction file is maintained project policy, not an automatically authoritative summary.
For a web project it should expose at least the development command, unit and browser-test commands, route and persistence locations, styling and accessibility expectations, responsive states, secrets policy, and the definition of done.

Project memory needs a lifecycle.
Keep unresolved questions and temporary findings in a working artifact; record consequential choices in a decision record; promote settled behavior into the relevant specification or architecture document; and connect it to executable checks.
A discovery transcript should not silently become the specification, and parallel agents should not work from different generations of the same contract.
Repeatable review or debugging workflows can become small project skills, while clear mechanical rules belong in linters or tests.

### Define the web task graph

The fleet produces the complete common core of implementation C rather than four unrelated features.
Settle the domain vocabulary, lifecycle transitions, event schema, API shapes, error semantics, and browser acceptance journey before starting parallel implementation.
Then assign bounded work such as:

| Task                    | Web-specific responsibility                                                                            | Boundary and required output                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Contract scout          | Map routes, domain transitions, events, UI states, storage, and existing checks                        | Read-only; return file references, unknowns, and proposed contract decisions      |
| Interface implementer   | Build forms, loading, empty, success, and error states; preserve accessibility and responsive behavior | Own named UI files; return focused checks and screenshots or browser observations |
| Data implementer        | Implement persistence, valid transitions, event atomicity, API responses, and idempotency              | Own named server and data files; return API, migration, and invariant checks      |
| Verifier and integrator | Integrate both branches and exercise the complete user journey                                         | May repair only assigned integration defects; return browser evidence and limits  |

::caption[A minimal fleet bound to cross-layer concerns in implementation C.]
::label[table:web-fleet-tasks]

Role names are illustrative.
Grade whether every task has an objective, allowed files and tools, expected output, validation commands, non-goals, owner, and stopping condition.
If two roles must edit the same shared contract, resolve that decision before they branch or reduce the fleet.
Use separate workspaces or worktrees for concurrent writers, and pin the same declared base model for the single-agent and fleet runs where possible.
Record any substitution as a confounding factor.

### Research note — A clean merge is not a correct integration

Recent experiments separate three properties that are easy to collapse: concurrent writing, coordination, and accepted behavior.
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

### Map authority and acceptance

Names such as `scout`, `implementer`, and `reviewer` allocate activity, not decision responsibility.
Following the decision-path formulation of :citet[nissila2026decisionpath], trace the feature through:

> **Need → Define → Design → Implement → Verify → Release → Observe → Adapt**

For each consequential decision, distinguish the performer from the accountable owner and allocate authority as `propose`, `prepare`, or `execute`.
The function-specific automation model of :citet[parasuraman2000automation] is useful because gathering information, analyzing it, selecting an action, and executing it can receive different allocations inside one task.
NIST similarly recommends defining roles, responsibilities, and oversight for human–AI configurations rather than assuming that the presence of a human creates effective control :citep[tabassi2023airmf].

| Decision                           | Agent authority                               | Acceptance evidence                                                | Recovery or escalation                                           | Accountable owner |
| ---------------------------------- | --------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------- | ----------------- |
| Interpret an ambiguous requirement | Propose alternatives                          | User examples, affected behavior, assumptions, and unknowns        | Human selects or reframes before implementation                  | Outcome owner     |
| Change a shared interface          | Prepare a contract and compatibility analysis | Consumer checks, migration implications, and rollback path         | Escalate before a breaking or externally visible change          | System owner      |
| Implement a bounded change         | Execute within named files, tools, and budget | Focused checks, diff, baseline gate, and known limits              | Stop on scope expansion, failed invariant, or unavailable check  | Integrating human |
| Accept the web behavior            | Propose a verdict from the complete evidence  | Browser journey, API and persistence checks, and reviewed failures | Reject, repair, or revert; do not infer acceptance from activity | Outcome owner     |

::caption[Example authority and acceptance boundaries for a web-development fleet.]
::label[table:fleet-decision-responsibility]

Claim Plane illustrates how an orchestration system could enforce this allocation before writing begins.
Each worker declares a versioned change intent containing its base revision, resources, dependencies, and committed or contingent operations; a deterministic control plane admits compatible intents, serializes unresolved overlap, and rejects undeclared mutation.
Its six-pair mechanism check is deliberately too small for comparative performance claims, but it demonstrates the difference between asking an agent to respect a boundary and making that boundary an enforced admission rule :citep[nikolaev2026claimplane].

Coactive Design offers a compact test for this allocation.
Each dependency needs enough **observability** of relevant state, **predictability** of likely behavior, and **directability** through correction, stopping, or reallocation :citep[johnson2014coactive].
A human approval box is ceremonial if the approver cannot see what happened, anticipate the next action, or recover from it.

The dark- and twilight-factory framing adds a routing question to this control design :citep[mollick2026agency].
In a **dark factory**, people specify and accept work while agents perform most of the production loop with little human involvement.
In a **twilight factory**, agents still perform most of the work, but the workflow proactively involves people when their participation would improve the decision or its consequences.
For software development, treat this as an escalation responsibility rather than another global autonomy level.
A facilitator need not be a separate agent: an orchestration policy or task instruction can require the workflow to look up when an action needs approval, relevant expertise is missing, several agents may share a blind spot, or removing the decision from people would weaken the judgment needed to own and correct the system.
Routine, reversible, independently checkable implementation may continue unattended; consequential or formative decisions need an observable trigger, a named recipient, enough evidence to respond, and safe behavior while the workflow waits.

For one delegated task, mark where the workflow should look up for approval, expertise, an independent perspective, or retention of human judgment.
For each point, state the observable trigger, who receives the escalation, what context and evidence they receive, what the agent may do while waiting, and how the boundary is enforced.

Task control and resource access also remain separate.
For one delegated task, trace:

`originating actor → fleet session → delegated task → model or tool attempt → validation → delegated-run outcome`

Propagate only the necessary identity, authority, task, trace, budget, and policy identifiers.
An agent that reads untrusted issues should not automatically receive secrets or external write access; an implementer does not need deployment credentials; a publisher should receive a reviewed artifact rather than all private context.
Treat imported extensions, skills, instructions, and configuration as executable project dependencies: inspect their source and requested access, pin a revision when practical, and use disposable least-privilege environments.
Publishing an issue, patch, deployment, or message externally requires an explicitly accountable human who can explain the intent and evidence, respond to feedback, and correct or withdraw it.
[Appendix D](/appendices/agent-system-security/#separate-task-control-from-resource-access) develops the enforcement and traceability model.

## Practice failure and correction

Small cross-layer mismatches make fleet risk easier to understand than abstract warnings.
The goal of the labs is not to prove that four agents are better than one.
It is to expose where decomposition, integration, validation, or correction fails.

### Delegation lab

Use the planner below before running real agents.
Choose a task and project-readiness level, then change the roles and model allocation.
The generated packet is a rehearsal: if the task is vague, boundaries overlap, or the review burden exceeds available capacity, reduce the fleet or harden the project first.

{{ import "site/includes/agent-fleet-demo.html" }}

Translate the packet into a task graph rather than launching every named role automatically.
Run three small patterns before the complete implementation: scout then plan, implement then review, and parallel scouts over independent subsystems.
For each pattern, state why the tasks are sequential or independent and who integrates the result.

### Correction lab

After the fleet integrates implementation C, select one seeded defect from the table below.
The instructor can supply a faulty branch, or you can introduce the fault after saving a known-good baseline.
Do not reveal the chosen fault to the diagnosing agent.

| Seeded defect                                       | Why local work may look correct                      | Web-visible or state-visible failure                                     |
| --------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------ |
| UI and API use different event or field names       | Each side's focused tests use its own vocabulary     | A user action appears successful but activity or summary does not update |
| An event is written before transition validation    | The valid-transition test remains green              | A rejected action still changes event history or derived counts          |
| A retried mutation has no idempotency boundary      | One request produces the expected record             | A network retry duplicates an event or transition                        |
| Interface and data agents changed the same contract | Both branches pass before integration                | The merged browser journey fails or displays a stale state               |
| The verifier runs unit checks but no browser probe  | Components, handlers, and queries pass independently | The complete user journey cannot finish                                  |

::caption[Small faults that expose fleet integration and correction problems.]
::label[table:fleet-correction-faults]

Use one correction loop throughout the lab:

> **delegate → integrate → observe → diagnose → correct → revalidate**

1. Run every focused check reported by the contributing agents and record which checks are green.
2. Exercise the application through its web boundary: create a workspace and work item, perform valid lifecycle transitions, confirm activity and summary, filter the feed, refresh to verify persistence, and attempt one invalid transition.
3. Verify that the invalid action changes neither current state nor event history.
4. Use the diff and fleet trace to locate the first divergence between the settled contract and observed behavior.
5. Assign one bounded correction task with an explicit hypothesis.
   Avoid launching several speculative fixers against the same files.
6. Run the focused regression check and the complete browser journey again.
   A correction is accepted only when both pass and the trace records the failed attempt and repair.

This lab makes error correction part of the architecture rather than an afterthought.
A green unit check can be accurate within its boundary and still fail to protect the user journey.
Likewise, agreement between repeated agent reviews is not independent validation: several runs can repeat the same blind spot.
Preserve the fixed code and workflow configuration, deduplicate findings, and decide acceptance from behavioral evidence and accountable review.
[Appendix A](/appendices/evaluating-agentic-workflows/#repeated-review-is-measurement-not-proof) develops the repeated-review method, while [Appendix E](/appendices/scalability-models/#lussers-law-and-the-reliability-chain) models detection and repair across a reliability chain.

### Measure accepted throughput

An agent run, branch, pull request, or generated file is activity.
It becomes useful throughput only when the declared acceptance boundary accepts the result.
Count failed runs, duplicated exploration, handoffs, merge conflicts, retries, total model use, elapsed time, active human integration time, and reviewer backlog.
Fleet size should follow task independence and review capacity, not the number of available agents.

Coordination mechanisms can remove one bottleneck without removing the others.
The research note above showed that textual convergence, explicit coordination, and integrated correctness require different evidence.

Treat one end-to-end fleet attempt as one trial.
The internal agents, retries, and handoffs are parts of that trial rather than independent samples.
Compare it with one single-agent run over the same brief, base model, acceptance tests, and evidence schema.
The result supports a local decision about this task; reliability claims require predeclared repeated trials.

Finally, transform the execution trace into implementation C.
The fleet run maps to a workspace, delegated tasks to work items, agents and humans to actors, and attempts, validations, failures, reviews, and interventions to activity events.
Use the application's history, filters, summaries, and relationships to answer two questions: where did coordination first fail, and which correction produced accepted behavior?
A [portable fleet-trace example](/downloads/project/fleet-trace-example.zip) provides a small transformation target, mapping guide, redaction record, and repeat-import contract.
Adapt the actual tool export to that level of evidence rather than treating the example as a universal agent-tool schema.
The goal is not to build a universal agent platform.
It is to make the workflow that built the web application inspectable through the web application itself.

## Project artifact

Produce implementation C and the bounded fleet workflow required by the [Compare project specification](/project/compare/).
The artifact should make delegation, authority, integration, validation, and correction inspectable rather than merely showing that several agents ran.
Include:

- the declared base model, agent harness, and relevant execution configuration,
- the task graph, roles, boundaries, dependencies, and expected outputs,
- the authority map, human approval points, and accountable integration owner,
- validation commands, review criteria, and the stopping or reduction conditions for the fleet,
- one deterministic workflow probe and measurements comparable with the earlier implementations,
- and a transformed fleet trace loaded into implementation C, together with debugging findings that identify where coordination failed and which correction produced accepted web behavior.

Preserve consequential changes to the fleet plan and the evidence behind acceptance.
The fleet configuration and trace are part of the submitted development system, not background process trivia.

## Summary

Agent fleets grow usefully from one agent only when the task contains real independent work.
Documented web-development cases show the enabling pattern: legible project guidance, isolated execution, explicit acceptance, and end-to-end evidence.
Pi provides a transparent path for building a small fleet, while the alternatives demonstrate that local agent harnesses, hosted pull-request agents, and application-level orchestration should not be treated as interchangeable.
Implementation C binds delegation to interface, API, persistence, and browser concerns, then requires you to repair a small cross-layer fault.
Judge the fleet by accepted web behavior, correction quality, latency, cost, coordination, and human review effort—not by how many agents appeared busy.
