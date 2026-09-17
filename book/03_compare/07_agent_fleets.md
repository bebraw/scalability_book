# When do agent fleets improve web development?

An **agent fleet** coordinates independently operating agents on parts of a larger task.
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

{{ import "exercise:fleets-amdahl" }}

Apply the calculation to one observed fleet task.
Name the sequential work and keep coordination time visible rather than hiding it inside the parallel share.
The difference between the ideal bound and the observed result is evidence about coordination cost, not proof that the law failed.

## What documented web-development cases show

The company-authored accounts below show different ways to organize agentic web development.
Their reported results concern their own systems; the transfer questions identify what to inspect in the event tracker.

| Documented case                                                                                                                        | Practice in the web-development workflow                                          | Reported evidence and important limit                                              | Transfer question                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [GitHub assigns Copilot work in github.com](https://github.blog/ai-and-ml/github-copilot/how-copilot-helps-build-the-github-platform/) | Issues become proposed changes to UI, APIs, migrations, and production code       | One month of task examples; no counts, review time, or defect rate                 | Which decisions may an agent execute, and who accepts the result?        |
| [Vercel teaches agents product design](https://vercel.com/blog/teaching-agents-product-design-at-vercel)                               | Repository skills, linters, and review carry UI and interaction decisions forward | Skills went unused in 56% of separate Next.js eval cases; setup-specific           | How does a web project make product judgment available and maintainable? |
| [Stripe runs parallel Minions](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents)                              | Unattended agents produce pull requests in isolated development environments      | More than 1,000 agent-written PRs merged weekly; no attempt or quality denominator | What infrastructure makes parallel work bounded and reviewable?          |
| [Stripe evaluates web integrations](https://stripe.com/blog/can-ai-agents-build-real-stripe-integrations)                              | Agents modify frontends, backends, databases, and live payment flows              | Eleven realistic environments with UI and API graders; deliberately small suite    | What evidence establishes that the resulting web behavior is correct?    |

::caption[Documented agentic-development cases and their transfer questions.]
::label[table:documented-agentic-development-cases]

For implementation C, connect each delegated task to its acceptance check and integration owner.
The comparison with a single agent must include failed attempts and human review, which the published activity counts do not always expose.

### Field note — Different reviewers expose different blind spots

I have found GPT useful for reviewing implementations, and a colleague's Claude review of one of my pull requests surfaced different issues.
Claude also sometimes overstated an issue or preferred a different design.
The disagreement made assumptions visible; resolving it still required a judgment about the intended behavior and the simpler workable design.

I usually ask the agent to implement a fix once I agree with its reasoning.
Different reviewers can broaden the search, but I remain responsible for accepting the direction.

## Build a small web-development fleet

The examples use Pi because its [reference subagent extension](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts) exposes separate processes, isolated contexts, chains, and parallel tasks.
Inspect and adapt its controls to the project.
Use the [course-assigned environment](https://github.com/bebraw/scalability_book/blob/main/specifications/course_environment.md) for the assessed comparison, preserving the task graph, declared configuration, and acceptance checks.
[Appendix D's dated tool reference](/appendices/agent-system-security/#tool-examples-september-2026) compares coding harnesses, hosted repository tasks, and application orchestration interfaces.

### Prepare the project before adding agents

For the Pi example, follow its [quickstart](https://pi.dev/docs/latest/quickstart), authenticate with the approved provider, and start in a version-controlled project.
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

### Optional exercise — Retrieve guidance after a contract changes

An identifiable old statement may be useful history and wrong guidance for the current implementation.
Keep three questions separate: **provenance** identifies where a claim came from; **validity** concerns whether it still applies; **retrieval** selects material for the present task.

Use a small fixture with two revisions of an event-list endpoint:

1. In the earlier revision, the endpoint returns an array; in the current revision, it returns an object containing `items` and `nextCursor`.
   Preserve both contracts with their source revisions and status, but deliberately leave one searchable summary describing the old response as current.
2. Ask the agent separately what the earlier contract required and how a client should parse today's response.
   Require supporting source revisions and a client check against the current fixture.
3. Compare source inspection alone with source inspection plus retrieved project memory, keeping the task, model, tools, and starting code fixed in fresh sessions.
   Inspect whether the stale summary is retrieved, whether the contradiction is noticed, and which source controls the answer.
4. Record accepted behavior, stale claims, evidence recovered, retrieval cost, and the effort needed to correct or retire the summary.

Keep the historical contract available while preventing it from silently governing current work.
A timestamp or source link helps inspection but does not establish validity by itself.
Judge memory by the work it improves, including its initialization and maintenance cost.

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

CodeCRDT's experiments on six small TypeScript and React tasks achieved textual convergence while preliminary inspection still found semantic conflicts :citep[pugachev2025codecrdt].
A shared document can merge successfully even when interface and data code disagree about the same event.
Keep integrated behavior checks after concurrent work.
[Appendix A](/appendices/evaluating-agentic-workflows/#research-example-coordination-and-integration) examines the study and related coordination evidence, including their limits.

### Map authority and acceptance

Trace the feature through the decision path described by :citet[nissila2026decisionpath]:

> **Need → Define → Design → Implement → Verify → Release → Observe → Adapt**

For each consequential decision, name the performer, accountable owner, and agent authority: `propose`, `prepare`, or `execute`.
Different functions within one task can receive different authority :citep[parasuraman2000automation].

| Decision                           | Agent authority                               | Acceptance evidence                                                | Recovery or escalation                                           | Accountable owner |
| ---------------------------------- | --------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------- | ----------------- |
| Interpret an ambiguous requirement | Propose alternatives                          | User examples, affected behavior, assumptions, and unknowns        | Human selects or reframes before implementation                  | Outcome owner     |
| Change a shared interface          | Prepare a contract and compatibility analysis | Consumer checks, migration implications, and rollback path         | Escalate before a breaking or externally visible change          | System owner      |
| Implement a bounded change         | Execute within named files, tools, and budget | Focused checks, diff, baseline gate, and known limits              | Stop on scope expansion, failed invariant, or unavailable check  | Integrating human |
| Accept the web behavior            | Propose a verdict from the complete evidence  | Browser journey, API and persistence checks, and reviewed failures | Reject, repair, or revert; do not infer acceptance from activity | Outcome owner     |

::caption[Example authority and acceptance boundaries for a web-development fleet.]
::label[table:fleet-decision-responsibility]

For example, an interface agent may discover that a requested field requires changing a shared event schema.
It should present the affected consumers, compatibility checks, and migration choices to the system owner before either branch adopts a new contract.
State which independent tasks may continue while that decision waits and which must stop.

An effective escalation gives the recipient enough information to understand the state, anticipate the effect, and redirect the work—the observability, predictability, and directability emphasized by Coactive Design :citep[johnson2014coactive].
For each approval or stop rule, name the component that enforces it; a marker the producing agent can bypass is insufficient.

Trace one delegated task from originating actor through session, tool attempts, validation, and final outcome.
Grant only the required tools, data, and external access, and preserve the identity and policy evidence needed to reconcile those attempts.
Publishing a patch, deployment, or message requires an accountable human who can explain, correct, or withdraw it.
[Appendix D](/appendices/agent-system-security/) develops enforcement, imported-capability review, and trace reconciliation.

### Optional exercise — Test a human review gate

[Human Todos](https://arsctx.com/blog/human-todos/) proposes marking consequential changes for human review and blocking selected implementation steps until a human resolves them.
The marker makes a decision visible, but an unresolved-marker check cannot detect a marker the producing agent omitted.
Use the pattern to test the authority boundary already defined above.

In a disposable branch or review fixture, declare that changing an existing endpoint's authorization or adding a new endpoint requires human review before acceptance.
Check both cases: a rule limited to modified existing handlers would miss the new endpoint.
The review obligation should come from an independently maintained change-scope rule, with a named owner for ambiguous cases, rather than only the producing agent's annotations.

Try three failures: leave a marker unresolved, omit a required marker, and remove a marker without human approval.
For each, identify the changed behavior, the rule that requires review, and the component that blocks acceptance.
Then supply an approval record tied to the reviewed revision and an authenticated human reviewer; change the relevant code again and confirm that the earlier approval no longer satisfies the gate.
The agent must not be able to satisfy the gate merely by editing its own marker or approval file.

Record missed review obligations, false alarms, review time, and interruptions alongside the accepted behavior.
Code outside a designated core can still expose data or alter permissions, so allocate review by effects as well as file or layer.
Independent scope checks can also be incomplete; passing these seeded cases establishes coverage of those cases, not every consequential change.

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

A focused check can pass while the complete user journey fails.
Repeated agent agreement can also preserve a shared blind spot; resolve findings through behavioral evidence.
[Appendix A](/appendices/evaluating-agentic-workflows/#repeated-review-is-measurement-not-proof) develops repeated review, and [Appendix E](/appendices/scalability-models/#lusser-s-law-and-the-reliability-chain) models detection and repair across a reliability chain.

### Measure accepted throughput

Measure time and cost through acceptance, including failed runs, duplicated exploration, handoffs, merge conflicts, retries, model use, and active human integration and review.
Record reviewer backlog alongside completed tasks to see whether the fleet is exceeding the team's acceptance capacity.

Treat one end-to-end fleet attempt as one trial.
The internal agents, retries, and handoffs are parts of that trial rather than independent samples.
Compare it with one single-agent run over the same brief, base model, acceptance tests, and evidence schema.
The result supports a local decision about this task; reliability claims require predeclared repeated trials.

Finally, transform the execution trace into implementation C.
The fleet run maps to a workspace, delegated tasks to work items, agents and humans to actors, and attempts, validations, failures, reviews, and interventions to activity events.
Use the application's history, filters, summaries, and relationships to answer two questions: where did coordination first fail, and which correction produced accepted behavior?
A [portable fleet-trace example](/downloads/project/fleet-trace-example.zip) provides a small transformation target, mapping guide, redaction record, and repeat-import contract.
Adapt the actual tool export to that level of evidence rather than treating the example as a universal agent-tool schema.
Use the application to inspect the workflow that built it.

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
