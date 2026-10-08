# When do agent fleets improve web development?

An **[agent fleet](/concepts/#agent-fleet)** coordinates independently operating agents on parts of a larger task.
It is a cooperative multi-agent system used for development; fleet is the book's working label for the coordination, integration, and acceptance arrangement described here.
The broader term multi-agent system also covers agents with different goals and agents that do not use LLMs.
Each has its own execution context and tool actions; an orchestration layer assigns work, routes results, and controls shared state.
Writing several roles into one prompt does not create those separate executions.

A web feature can expose parallel work across interface, API, and persistence code, but those parts must agree on the same behavior.
This chapter follows a fleet from task decomposition through integration, correction, and measurement.
“Fleet” here belongs to the development system; agents running inside the delivered application have separate users, data, and operational obligations.

> **Sustainability angle**
>
> Count the fleet's total compute and human review cost.
> Parallel work earns that cost when it improves accepted outcomes, reduces rework, or saves scarce human time.

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
The contract itself, integration, and end-to-end [acceptance](/concepts/#acceptance-criteria) remain sequential.
If both branches need to reinterpret the lifecycle, edit the same schema, or wait for the same person, their apparent parallelism merely moves waiting and conflict downstream.

### Separate agent concurrency from human work in progress

**Agent concurrency** counts agents executing at the same time.
For one integration owner, count **human work in progress** as started changes still awaiting that person's acceptance, including changes waiting for review or correction.
Define what counts as one change before comparing these quantities: interface and data tasks can contribute to the same accepted feature.

Two agents implementing the interface and data path for a CSV export can serve one unfinished change.
If the same two agents move on to a feed filter and a lifecycle change while the export waits for review, the owner now supervises three unfinished changes.
The worker count stayed at two, while human work in progress increased.
Neither count alone establishes accepted throughput, attention cost, or quality.

A worker limit bounds simultaneous execution; a work-in-progress limit bounds how many changes may start before earlier ones are accepted or explicitly abandoned.
An owner can keep several workers on one change, or admit several changes while only some workers execute.
Record both quantities alongside the [review queue](/concepts/#queue) and [review capacity](/concepts/#review-budget).

In a practitioner essay, :citet[snyder2026feweragents] proposes improving the human feedback loop before hiding model latency with more concurrent tasks.
He explicitly reports that one or two agents have not yet matched his many-agent net throughput.
This motivates a local comparison, rather than establishing that fewer agents or a lower work-in-progress limit always improve results.

### Amdahl's Law and the sequential bottleneck

[Amdahl's Law](/concepts/#amdahl-law) gives a simple upper bound on speedup when only part of the work can run in parallel :citep[amdahl1967validity].
If `p` is the parallelizable share and `N` agents execute that share, the idealized speedup is:

`S(N) = 1 / ((1 - p) + p / N)`

If half of a workflow is inherently sequential, unlimited agents cannot make the whole workflow more than twice as fast.
In web development, framing the feature, settling a shared interface, integrating overlapping edits, reviewing risk, and accepting the browser-visible result often remain sequential.
Real fleets perform below the ideal bound because communication, duplicated exploration, conflicts, and waiting add overhead that the formula does not model.

The lab below keeps the workflow at 100 units of work and changes only the parallelizable share and number of agents.
Predict the effect of the next agent before moving the control, then compare the ideal speedup with the infinite-agent ceiling.

{{ import "site/includes/amdahl-law-demo.html" }}

{{ import "exercise:fleets-amdahl" }}

Apply the calculation to one observed fleet task.
Name the sequential work and keep coordination time visible rather than hiding it inside the parallel share.
The difference between the ideal bound and the observed result is evidence about [coordination cost](/concepts/#contention), not proof that the law failed.

Before revealing the worked answer, explain why completion time for one feature and [accepted throughput](/concepts/#throughput) over many features can change differently.
Trace the result through [review capacity](/concepts/#review-budget), the [queue](/concepts/#queue), and [saturation](/concepts/#saturation).
Then change one assumption: suppose some candidates are rejected, or review times vary.
Which rates and waiting times would you measure again, and what evidence would justify adding agents, changing review capacity, or bounding admission?

## What documented web-development cases show

The company-authored accounts below show different ways to organize agentic web development.
Read each account as a snapshot of its stated tasks and configuration, not a current estimate of agent productivity.
The transfer questions identify what to inspect in the event tracker.

| Documented case                                                                                                                        | Practice in the web-development workflow                                          | Reported evidence and important limit                                                     | Transfer question                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [GitHub assigns Copilot work in github.com](https://github.blog/ai-and-ml/github-copilot/how-copilot-helps-build-the-github-platform/) | Issues become proposed changes to UI, APIs, migrations, and production code       | One month of task examples; no counts, review time, or defect rate                        | Which decisions may an agent execute, and who accepts the result?        |
| [Vercel teaches agents product design](https://vercel.com/blog/teaching-agents-product-design-at-vercel)                               | Repository skills, linters, and review carry UI and interaction decisions forward | June 2026 workflow account; no general product-quality effect established                 | How does a web project make product judgment available and maintainable? |
| [Stripe runs parallel Minions](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents)                              | Unattended agents produce pull requests in isolated development environments      | February 2026 report of over 1,000 merged PRs per week; no attempt or quality denominator | What infrastructure makes parallel work bounded and reviewable?          |
| [Stripe evaluates web integrations](https://stripe.com/blog/can-ai-agents-build-real-stripe-integrations)                              | Agents modify frontends, backends, databases, and live payment flows              | March 2026 suite of eleven environments with UI and API graders; limited task coverage    | What evidence establishes that the resulting web behavior is correct?    |

::caption[Documented agentic-development cases and their transfer questions.]
::label[table:documented-agentic-development-cases]

Vercel’s separate [January 2026 Next.js evaluation](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals) reported that an available skill went uninvoked in 56% of cases under its default setup.
That is evidence about guidance retrieval in that evaluation, not the success rate of the later product-design workflow or a universal ranking of skills against instruction files.
The transferable check is to observe whether guidance was loaded before judging whether it was followed.

For implementation C, connect each delegated task to its acceptance check and integration owner.
The comparison with a single agent must include failed attempts and human review, which the published activity counts do not always expose.

### Field note — Different reviewers expose different blind spots

I have found GPT useful for reviewing implementations, and a colleague's Claude review of one of my pull requests surfaced different issues.
Claude also sometimes overstated an issue or preferred a different design.
The disagreement made assumptions visible; resolving it still required a judgment about the intended behavior and the simpler workable design.

I usually ask the agent to implement a fix once I agree with its reasoning.
Different reviewers can broaden the search, but I remain responsible for accepting the direction.

## Build a small web-development fleet

Use the [course-assigned environment](https://github.com/bebraw/scalability_book/blob/main/specifications/course_environment.md) and record its version, model routes, delegation settings, and tool permissions.
The lab requires bounded child tasks, inspectable results, and an explicit integration owner.
[Appendix D's environment guide](/appendices/agent-system-security/#choose-a-delegation-environment) helps you inspect these boundaries and offers optional implementation examples.

### Prepare the project before adding agents

Follow the setup instructions published for the assigned harness and start in a version-controlled project.
Confirm that the single-agent baseline has delegation disabled before enabling the declared fleet configuration.
Before adding subagents, ask one agent to inspect the repository:

> Inspect this project and propose an `AGENTS.md`; do not edit yet.
> Include the project purpose, setup and validation commands, coding conventions, architectural boundaries, forbidden operations, and review checklist.
> Cite the files that support each proposal and mark unknowns.

Review the proposal before saving it.
An instruction file is maintained project policy, not an automatically authoritative summary.
For a web project it should expose at least the development command, unit and browser-test commands, route and persistence locations, styling and accessibility expectations, responsive states, secrets policy, and the definition of done.

Project memory needs a lifecycle.
Keep unresolved questions and temporary findings in a working artifact; record consequential choices in a [decision log](/concepts/#decision-log); promote settled behavior into the relevant specification or architecture document; and connect it to executable checks.
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
Use separate workspaces or worktrees for concurrent writers.
The Challenge small model is the reference configuration; an approved C fleet may assign small models, large models, or a mixture to its roles or tasks.
State the quality, time, or cost hypothesis behind each assignment, preserve the actual model and route used for each attempt, and record substitutions and fallback.
For the required bounded single-agent/fleet pair, pin the same small-model configuration and routing policy so the contrast examines orchestration.
An optional model-assignment pair keeps the fleet's task graph fixed while assigning a large model to one named role; the [Compare specification](/project/compare/#5-4-compare-one-agent-with-the-fleet) defines the limits.

### Research note — A clean merge is not a correct integration

CodeCRDT's experiments on six small TypeScript and React tasks achieved textual convergence while preliminary inspection still found semantic conflicts :citep[pugachev2025codecrdt].
A shared document can merge successfully even when interface and data code disagree about the same event.
Keep integrated behavior checks after concurrent work.
[Appendix A](/appendices/evaluating-agentic-workflows/#research-example-coordination-and-integration) examines the study and related coordination evidence, including their limits.

### Map authority and acceptance

Reuse the [constrain–generate–validate–revise loop](/chapters/scalable-development/#constrain-generate-validate-revise).
Delegation changes who performs the work and where results must come together; it does not remove any stage.
For each consequential decision, name the performer, accountable owner, and whether the agent may **propose**, **prepare**, or **execute**.
[Authority](/concepts/#authority) can differ between decisions within one task :citep[parasuraman2000automation].

| Stage     | Fleet work                                                                    | Authority and acceptance boundary                                                                |
| --------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Constrain | Settle the requirement, shared contract, task graph, and stopping rules       | Agents propose alternatives; the owner resolves ambiguity and authorizes the scope               |
| Generate  | Execute bounded tasks in isolated workspaces and integrate their outputs      | Agents act within declared files, tools, and budgets; the integrator owns the combined candidate |
| Validate  | Check focused results and the complete browser journey                        | Agents provide evidence and a proposed verdict; the accepting owner reviews failures and limits  |
| Revise    | Diagnose a mismatch, assign one correction, and update the contract or checks | The owner resolves any scope change; acceptance requires validation of the corrected revision    |

::caption[The same development loop with explicit fleet responsibilities and authority.]
::label[table:fleet-decision-responsibility]

For example, an interface agent may discover that a requested field requires changing a shared event schema.
It should present the affected consumers, compatibility checks, and migration choices to the system owner before either branch adopts a new contract.
State which independent tasks may continue while that decision waits and which must stop.

An effective escalation gives the recipient enough information to understand the state, anticipate the effect, and redirect the work—the observability, predictability, and directability emphasized by Coactive Design :citep[johnson2014coactive].
For each approval or stop rule, name the component that enforces it; a marker the producing agent can bypass is insufficient.

Trace one delegated task from originating actor through session, tool attempts, validation, and final outcome.
Grant only the required tools, data, and external access, and preserve the identity and policy evidence needed to reconcile those attempts.
Ownership continues through release, observation, and later correction :citep[nissila2026decisionpath].
Publishing a patch, deployment, or message requires an accountable human who can explain, correct, or withdraw it.
[Appendix D](/appendices/agent-system-security/) develops enforcement, imported-capability review, and trace reconciliation.

## Practice failure and correction

The labs expose where a delegated task diverges from its contract and whether the workflow can recover.
Start with one small mismatch whose effect can be checked through the application.

### Field note — Correct the direction before the details

Sometimes I stop an agent session, discard its unaccepted changes by returning to the last known-good Git state, and begin again.
Rebuilding context can be cheaper than repairing work based on the wrong assumptions.

For user-interface work, I inspect the composition and interaction model before asking the agent to polish details.
A discovery prototype can tolerate more inconsistency; a production interface needs earlier review before a weak direction spreads.

Screenshots preserve the rendered state I am discussing.
I am also experimenting with shared browser sessions and feedback captured inside the application: attach my description to the UI state and location where the problem appears.
That remains a direction I am exploring, but it could make correction less dependent on reconstructing what I saw.

### Delegation lab

Use the planner below before running real agents.
Choose a task and project-readiness level, then change the roles and model allocation.
The generated packet is a rehearsal: if the task is vague, boundaries overlap, or the review burden exceeds available capacity, reduce the fleet or harden the project first.

{{ import "site/includes/agent-fleet-demo.html" }}

Translate the packet into a [task graph](/concepts/#task-graph) rather than launching every named role automatically.
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

Apply the same development loop to the seeded fault:

1. **Constrain:** preserve the known-good baseline, settled contract, and expected user journey; name the integration owner and correction scope.
2. **Generate:** integrate the candidate containing the seeded defect and retain the contributing agents' focused results.
3. **Validate:** rerun those checks, then create a workspace and work item, perform valid lifecycle transitions, confirm activity and summary, filter the feed, and refresh to verify persistence.
   Attempt an invalid transition and verify that it changes neither current state nor event history.
4. **Revise:** use the diff and fleet trace to locate the first divergence from the contract, then assign one bounded correction with an explicit hypothesis.
   Avoid several speculative fixers against the same files.
   Preserve the failed attempt and repair in the trace, update the relevant check or contract, and return to validation: both the focused regression check and complete browser journey must pass before acceptance.

A focused check can pass while the complete user journey fails.
Repeated agent agreement can also preserve a shared blind spot; resolve findings through behavioral evidence.
[Appendix A](/appendices/evaluating-agentic-workflows/#repeated-review-is-measurement-not-proof) develops repeated review, and [Appendix E](/appendices/scalability-models/#lusser-s-law-and-the-reliability-chain) models detection and repair across a reliability chain.

### Measure accepted throughput

Measure time and cost through acceptance, including failed runs, duplicated exploration, handoffs, merge conflicts, retries, model use, and active human integration and review.
Record [reviewer backlog](/concepts/#review-budget) alongside completed tasks to see whether the fleet is exceeding the team's acceptance capacity.
For mixed fleets, report usage by model and count every worker, retry, and failed attempt in the total.
State the pricing or departmental resource-cost basis; department-provided access does not establish zero inference cost.
Compare accepted behavior and defects, time through integration and human acceptance, and total cost rather than treating a faster model reply as a completed change.

Treat one end-to-end fleet attempt as one trial.
The internal agents, retries, and handoffs are parts of that trial rather than independent samples.
For a narrower workflow contrast, use the [Compare project's bounded paired task](/project/compare/#5-4-compare-one-agent-with-the-fleet): fresh copies of the same frozen revision, the same brief, model, checks, environment, intervention policy, and aggregate resource limits.
The full B and C builds remain case studies because their design choices and the team's experience differ.
One matched pair supports an exploratory observation about this task; reliability or general effect claims require a justified sampling design and repeated trials.

Finally, transform the execution trace into implementation C.
The fleet run maps to a workspace, delegated tasks to work items, agents and humans to actors, and attempts, validations, failures, reviews, and interventions to activity events.
Use the application's history, filters, summaries, and relationships to answer two questions: where did coordination first fail, and which correction produced accepted behavior?
A [portable fleet-trace example](/downloads/project/fleet-trace-example.zip) provides a small transformation target, mapping guide, redaction record, and repeat-import contract.
Adapt the actual tool export to that level of evidence rather than treating the example as a universal agent-tool schema.
Use the application to inspect the workflow that built it.

## Optional extensions

To investigate a specific boundary further, use Appendix D's exercises on [retrieving changed guidance](/appendices/agent-system-security/#retrieve-guidance-after-a-contract-changes), [checking contract completeness](/appendices/agent-system-security/#check-a-contract-against-its-consumers), or [testing a human review gate](/appendices/agent-system-security/#test-a-human-review-gate).
The walkthrough above provides the required path from decomposition through correction and measured coordination cost.

### Optional exercise — Vary human work in progress

If the fleet trace shows competing review requests, explore admitting fewer unfinished changes with the same worker limit.
Give your agent the [work-in-progress starting point](/explore/human-work-in-progress/agent.md) to plan the comparison, or [read the trial protocol yourself](/explore/human-work-in-progress/).

## Project artifact

In implementation C's existing [Compare evidence package](/project/compare/#6-deliverables), connect the fleet plan to what actually happened:

- declared model and harness configuration, task dependencies, authority, integration ownership, and stopping rules;
- the correction probe and comparable measurements through acceptance;
- the transformed trace loaded into C, with findings that explain coordination failures and successful corrections.

Preserve consequential changes to the plan and link acceptance to the checked revision.
The specification defines the complete submission requirements.

## Summary

A fleet needs independent tasks, settled shared contracts, isolated work, and a path to one checked application.
Its trace should explain failures and corrections as well as successful delegation.
Compare accepted outcomes, latency, total cost, and human review effort with the single-agent workflow before increasing concurrency.
