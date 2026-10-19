# How can coding agents support scalable development?

Coding agents increase the rate at which requirements become candidate implementations.
Development scales when people can understand, validate, integrate, and maintain those changes as the project evolves.

## What is an agent?

In classical AI, an agent observes an environment, chooses an action, and uses its effects to decide what to do next.
The model applies both to physical robots and to programs acting in information environments :citep[poole2023artificial].

In this book, a **[coding agent](/concepts/#agent)** repeatedly observes a development environment and acts through tools to pursue a requested outcome.
LLM practitioners vary in whether predefined workflows count as agents; this book uses the model-directed action loop as its working definition.
Its Large Language Model (LLM) operates inside an **agent harness** that assembles context, exposes tools, carries state, invokes the model, and returns action results as feedback.
Software-engineering agent research describes related perception, memory, and action modules around the LLM :citep[wang2025agentsse].

:ref[table:coding-agent-anatomy]{text="The table below"} shows the parts a developer can tune.

| Agent concept | Coding agent                                      | What to tune                                             |
| ------------- | ------------------------------------------------- | -------------------------------------------------------- |
| Goal          | Requested outcome and acceptance criteria         | Task examples, priorities, budgets, and stopping rules   |
| Environment   | Repository, terminal, browser, and services       | Workspace setup, sandbox, and available services         |
| Perception    | Instructions, file reads, tool output, and images | Retrieval, provenance, and feedback quality              |
| Controller    | LLM and its observe–decide–act loop               | Model configuration, context assembly, and orchestration |
| Memory        | Session state and durable project knowledge       | Selection, freshness, retention, and source authority    |
| Actions       | Edits, commands, API calls, and messages          | Permissions, validation, rollback, and rate limits       |

::caption[Parts of a coding agent and the development choices that shape them.]
::label[table:coding-agent-anatomy]

Observations can be incomplete, tools can fail, and the stated goal can omit something the user needs.
Improving an agent therefore involves its environment and feedback as well as its model and prompt.

## What changes when agents implement code?

Specifications, executable tests, and iterative feedback predate coding agents.
The change is that a probabilistic tool-using system can perform more of the implementation loop.
:ref[table:development-approaches-history]{text="The table below"} compares three composable patterns, not stages in a maturity ladder.

| Pattern                  | How implementation proceeds                                                        | Where control lives                                                     |
| ------------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Human implementation     | People translate requirements into code through planned stages or short iterations | Design decisions, executable examples, and review                       |
| Deterministic generation | Generators transform declared models into implementation artifacts                 | Model definitions, transformation rules, and supported escape paths     |
| Agent execution          | A model interprets context and chooses tool actions through a harness              | Maintained instructions, scoped tools, checks, and acceptance decisions |

::caption[Three development patterns that can coexist in one project.]
::label[table:development-approaches-history]

[Iterative development](https://agilemanifesto.org/), [model-driven generation](https://www.omg.org/mda/), and [executable behavior examples](https://dannorth.net/introducing-bdd/) can all contribute to an agent-assisted workflow.
The event tracker could use BDD scenarios to define acceptance, generate an API client from a schema, and delegate implementation to an agent.
Across these patterns, a requested outcome still has to become a checked change someone can maintain.

## Loop engineering

**[Loop engineering](/concepts/#loop-engineering)** is the design of control structures that repeatedly direct agent work toward a declared goal, using observations, retained state, bounded actions and resources, and explicit acceptance, stopping, and escalation rules.
A [feedback loop](/concepts/#feedback-loop) describes how effects influence subsequent behavior.
An agent harness runs the model-and-tool cycle; a project harness supplies maintained project knowledge and checks.
Loop engineering connects these controls to decisions about starting work, continuing after an observation, retaining progress, and returning a result for acceptance.

Osmani's practitioner account and IBM's industry explainer frame the practice around systems that direct agent work with less repeated human prompting :citep[osmani2026loop,belcic2026loop].
An exploratory research preprint uses a narrower definition requiring scheduled or event-triggered recurring runs :citep[lulla2026loop].
Here, the term also covers bounded goal-driven iteration within a session, with people participating in feedback and acceptance.
Schedules and fleets are optional choices; neither establishes that a loop is useful.

For each loop, name its trigger, goal, allowed actions, state owner, evidence, resource budget, and conditions for success, unsuccessful termination, or human escalation.
Retained progress should distinguish attempted work from verified outcomes so another iteration does not silently repeat a failed approach or treat an unchecked patch as complete.
The [research discussion in Appendix A](/appendices/evaluating-agentic-workflows/#research-behind-loop-engineering) separates adoption evidence from experiments on refinement and repair.

### Constrain, generate, validate, revise

Agentic development follows a [repeated loop](/concepts/#feedback-loop): constrain the task, generate a candidate, validate it, and revise both the result and the project's durable knowledge.
This is a corrective feedback loop: evidence of a deviation informs the next revision.
Feedback can also reinforce a change, as when timeouts trigger retries that increase load and cause more timeouts; the [Scaling chapter](/chapters/scaling/#name-the-saturation-boundary) examines that case.
Useful [throughput](/concepts/#throughput) is **accepted change**: work that someone can explain, validate against the intended behavior and architecture, integrate, and remain willing to own.

For the event tracker, consider adding CSV export.
The task must settle which events are included, which fields may leave the application, and how the exported values are checked.
A working download button alone leaves those decisions unresolved.

:ref[table:agent-development-loop]{text="The table below"} identifies the evidence needed to advance each stage.

| Stage     | Governing question                          | Main action                                                                  | Exit evidence                                           |
| --------- | ------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------- |
| Constrain | What outcome is wanted, and what may vary?  | State the goal, context, boundaries, budget, and stopping or escalation rule | A bounded task and explicit acceptance criteria         |
| Generate  | Which candidate might satisfy those limits? | Let a chosen model and agent harness act with relevant context and tools     | A candidate artifact plus its trace, cost, and attempts |
| Validate  | Does the candidate satisfy the real need?   | Apply independent checks and inspect the artifact a user will consume        | Acceptance evidence and known unverified properties     |
| Revise    | What should change before the next attempt? | Correct the result and codify learning in durable project material           | An improved artifact and better starting constraints    |

::caption[The constrain–generate–validate–revise loop and the evidence that advances each stage.]
::label[table:agent-development-loop]

**Constrain.** State the outcome, relevant context, allowed variation, budget, forbidden effects, [acceptance criteria](/concepts/#acceptance-criteria), and escalation rule.
Preserve recurring constraints in project instructions such as `AGENTS.md`.
Treat initial requirements as hypotheses that interaction with a prototype may refine :citep[brooks1987silver].
Programming also builds the understanding needed to explain and change the system :citep[naur1985theory].

**Generate.** Choose the model and harness using evidence from representative work.
Runtime configuration, context, tools, hardware, routing, and fallback can change the outcome, cost, and data exposure.
[Appendix A](/appendices/evaluating-agentic-workflows/#qualify-the-served-configuration) explains how to identify the configuration that actually served a task.
Focused retrieval can reduce irrelevant context, but lossy views can hide decisive facts; keep important raw output retrievable and test the reduction policy.

**Validate.** Check the candidate against the intended behavior and inspect the artifact the user will consume.
The [Webernetes case](/case-studies/webernetes/) compares behavior with an independent implementation; [Slideotter](/case-studies/slideotter/) checks geometry and rendered output.
Agent-generated checks need scrutiny too.
In one workshop report, screenshot tests did not exercise the application, supposed passkey authentication accepted a username, and stored data disappeared after restart :citep[talwar2026llms].
Those failures suggest concrete checks: launch the real application, challenge authentication, and verify persistence across restart.

A reversible mutation can strengthen this relationship by checking that a test distinguishes the accepted implementation from one named fault.
That contrast does not prove the mutant is realistic or the broader requirement is satisfied, but it is stronger than coverage alone.
Tests must also tolerate correct changes.
:citet[bromley2026tests] illustrates generated tests that copy implementation logic or accept either outcome; a complementary check is whether the same tests accept a behavior-preserving refactor.
The concern-directed mutation lab lets you apply both checks to authorization, retry, or archived-state behavior: pass the baseline, fail the selected fault, and pass a variant that stores the events differently.
[Study its source](https://github.com/bebraw/scalability_book/tree/main/labs/concern-directed-mutation) or [download the standalone lab](/downloads/labs/concern-directed-mutation.zip).

**Revise.** Correct the candidate and preserve the lesson in requirements, tests, architectural decisions, or project instructions.
The next attempt should begin with better information about the failure.

### Engineer the verification loop

In a practitioner essay, :citet[osmani2026verification] emphasizes giving agents executable feedback during implementation.
Verification is one part of loop engineering: decide what evidence justifies accepting the result.

For CSV export, observing a download establishes less than inspecting its rows against the permitted events and fields.
An agent that writes both the exporter and its checks can repeat the same mistaken access rule in both.
Ground expected results in the agreed contract and ask which plausible wrong outcome each check would reject.
Keep failures reproducible, use focused checks during repair, and run broader checks before integration.

Passing checks still leaves ownership, dependency boundaries, and future change costs to review.
Judge a loop improvement by accepted behavior and the correction effort it requires, including failed attempts.
[Appendix A](/appendices/evaluating-agentic-workflows/#design-the-verification-loop) develops check selection, failure preservation, and the limits of the evidence.

### Constraint feedback loop

The demonstration starts with an underspecified request to add CSV export to an event list.
Generate a candidate, validate it, revise the project memory from failed checks, and begin the next round.
Compare a run with the default constraints with one that selects every constraint before generation.

{{ import "site/includes/constrain-generate-validate-demo.html" }}

The candidate is deterministic teaching data, not model output.
Use validation failures to revise the project's rules and context before the next generation attempt.

## Assign authority and ownership

At each stage of the loop, make **[action authorization](/concepts/#authority)** explicit: decide who may act, which evidence permits the next step, and who owns the result.
For each decision, an agent may **propose** an option, **prepare** an action for approval, or **execute** within explicit limits.
Ambiguous intent, weak evidence, [irreversible commitments](/concepts/#decision-reversibility), and material external effects should narrow that [authority](/concepts/#authority).

For the CSV export, an agent might propose fields, implement the agreed format, and run checks; the accepting person still decides whether the exported data and access rules meet the requirement.
The [Agent Fleets chapter](/chapters/agent-fleets/#map-authority-and-acceptance) extends this allocation across delegated tasks.

:ref[table:trust-questions]{text="The table below"} separates the records needed to explain and stand behind that change.

| Concept        | Question it answers                                                                                         | Record to preserve                                                | Does not prove                         |
| -------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------- |
| Provenance     | Which exact revision or artifact is this, and which inputs, people, and tools produced or transformed it?   | Artifact identity, revision, material inputs, actors, and tools   | That the artifact is correct           |
| Endorsement    | Who stands behind which claim or decision on the final revision, including any reservations?                | Named endorser, endorsed claim, scope, revision, and reservations | That every property was checked        |
| Accountability | Who owns the consequences and must correct, maintain, or retire the result if it becomes wrong or outdated? | Accountable owner and correction or retirement obligation         | That the owner produced the artifact   |
| Evidence       | Which properties were checked on that revision, under what conditions, and what remains unverified?         | Check, environment, result, revision, limits, and omissions       | Universal quality outside those checks |

::caption[Questions that separate an artifact's origin, endorsement, accountability, and evidence.]
::label[table:trust-questions]

Bind acceptance decisions, checks, and known limits to the revision they concern.
Perceived effort can influence quality judgments :citep[kruger2004effort], but time spent does not establish correctness.

### Sustainable throughput requires ownership

The ownership standard should follow the work's consequences and expected lifetime.
A disposable experiment may need little maintenance; shared code makes others inherit the cost of understanding, operating, and correcting it—what Cory Doctorow calls [accretive work](https://pluralistic.net/2026/07/02/canonization/#operate-iterate-improve).
Publishing an issue or patch also creates work for an external maintainer, so someone must own the claim and respond when it is wrong.

> **Sustainability angle**
>
> Count the cost of repeated generation, validation, and human correction alongside accepted changes.
> Smaller tasks and maintained project guidance are useful when they reduce rework without weakening the checks.

### Optional exercise — Move a prototype into shared use

What would turn a working demo into a tool someone can operate and own?
Give your agent the [prototype starting point](/explore/prototype-to-shared-use/agent.md) to investigate one decision at a time, or [read the scenario yourself](/explore/prototype-to-shared-use/).

## The project harness

The **[project harness](/concepts/#harness)** is the versioned material that lets humans and agents change a repository: instructions, specifications, architecture notes, setup, examples, and validation commands.
Project harness is the book's working label for that bundle of repository guidance and executable development controls; harness terminology varies between sources.
It supplies project knowledge to the agent harness introduced earlier.

| Term               | Scope                                   | What it includes                                                                                              | Governing question                                                |
| ------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Agent harness      | One model-and-tool execution loop       | Context assembly, tools, state, permissions, model invocation, and action feedback                            | How can the model observe, decide, and act?                       |
| Project harness    | One repository or maintained codebase   | Instructions, specifications, architecture notes, environments, commands, tests, rules, and examples          | How can a contributor change this project without hidden context? |
| Development system | The process that changes an application | People, agents, agent harnesses, project harnesses, review, integration, ownership, and organizational policy | How does candidate work become accepted and maintainable change?  |

::caption[Three related control layers in agentic development.]
::label[table:agentic-development-control-layers]

A useful project harness lets a new contributor clone the project, locate the relevant behavior, run the checks, and make a small change without oral rescue.
The [common project specification](/project/#6-minimum-project-harness) defines the required artifacts.
[vibe-template](https://github.com/bebraw/vibe-template) provides one example of keeping starter code, instructions, architecture rules, and validation together.
The [Friction chapter](/chapters/friction/) develops fresh-checkout validation and the choice between focused and broader checks.

An analysis of 3,864 public bug reports across Claude Code, Codex CLI, and Gemini CLI attributed 37.3% of root causes to API, integration, or configuration errors :citep[zhang2026pitfalls].
That sample cannot describe every agent failure, but it gives a reason to inspect tool contracts, commands, and configuration when improving the workflow.

### Agents learn patterns from your codebase

Accepted code also becomes context for later work.
:citet[robinson2026maintain] describes allowing duplicated authorization checks on the assumption that an agent could maintain them later; the agent instead copied those shortcuts into subsequent changes.
Review whether a change leaves a pattern worth repeating, as well as whether its present behavior passes.

### Bound probabilistic generation with deterministic controls

Two agent runs may interpret a task differently while obeying the same state transitions, permissions, and acceptance rules.
David Khourshid's [Beyond the Prompt talk](https://www.youtube.com/watch?v=uMvTAF280so) proposes letting an LLM choose among the events a deterministic state machine currently permits.
The demonstration applies that pattern to delivering a code change.

{{ import "site/includes/statechart-boundary-demo.html" }}

{{ import "exercise:development-gates" }}

One cancellation rule covers the active state, tests and human review can proceed independently, and either failure can return the workflow to implementation.
The statechart restricts the available routes; the checks and reviewer still determine whether the code meets the requirement.
Deterministic controls can encode a wrong or incomplete rule.
The [Architecture chapter](/chapters/architecture/) develops the related controls around data representation and durable state changes.

The [Temper case study](/case-studies/temper/) extends this pattern to agent-authored state machines and compares their verification boundary with Datadog's system testing and bounded live optimization.

### Reuse practices without cloning the whole project harness

Copying a complete starter repository into an existing project is usually too coarse.
Package a reusable capability with its fit criteria, files, dependencies, integration instructions, checks, provenance, and update path so a project can adopt the practice without inheriting every source-template decision.

[Modern Web Guidance](/case-studies/modern-web-guidance/) shows how a maintained external capability can package fast-changing domain knowledge with targeted retrieval, compatibility constraints, an update path, and task-level evaluation.
Imported capabilities also create a trust boundary because instructions or bundled code may influence tools operating with the agent's authority.
[Appendix D's imported-capability review](/appendices/agent-system-security/#imported-capabilities-are-development-dependencies) develops these security implications, while the skill-adoption lab provides a bounded review exercise; [study its source](https://github.com/bebraw/scalability_book/tree/main/labs/skill-adoption) or [download the standalone lab](/downloads/labs/skill-adoption.zip).

## When generation outruns comprehension

An agent can increase the arrival rate of candidate changes while comprehension, [review](/concepts/#review-budget), and integration remain constrained.
The resulting backlog appears as large diffs, delayed review, shallow acceptance, rework, or [technical debt](/concepts/#technical-debt).
:ref[table:candidate-production-and-comprehension]{text="The table below"} collects evidence about different parts of that mismatch.

| Evidence                                                                                                                                                                     | What it supports                                                                     | Important limit                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Three field experiments covering 4,867 developers found about 26% more completed tasks with an AI coding assistant :citep[cui2026effects]                                    | Candidate production can increase in some settings                                   | Individual experiments were noisy, and the result does not apply equally to every person or project   |
| A randomized study of 16 experienced developers completing 246 tasks found 19% longer completion time when early-2025 AI tools were allowed :citep[becker2025productivity]   | Assistance can increase task time in a familiar repository                           | Mature open-source projects and early-2025 tools do not establish a current effect for other settings |
| A study of 78 developers across seven projects classified about 58% of observed time as program comprehension :citep[xia2018comprehension]                                   | Understanding already consumed substantial development capacity before generative AI | Two companies using Java and C# do not establish a universal reading-to-writing ratio                 |
| A professional code-review study found that understanding supports knowledge transfer and alternative solutions as well as defect detection :citep[bacchelli2013review]      | Review is broader than checking whether generated code passes                        | The study predates current coding agents                                                              |
| A live LLM-review study at Mozilla and Ubisoft found that generated comments sometimes informed revisions, but reviewers accepted only a minority :citep[olewicki2026review] | AI-assisted review can contribute evidence while still consuming human judgment      | One deployment does not establish the effectiveness of every review agent                             |

::caption[Evidence behind the distinction between candidate production and accepted change.]
::label[table:candidate-production-and-comprehension]

Completed-task counts and time per task measure different outcomes in different populations.
Do not average these productivity estimates into one general AI effect.
METR's February 2026 follow-up reported that selection effects and concurrent-agent timing problems prevented a reliable estimate of the later tools' productivity effect :citep[becker2026productivityupdate].
Keep the study date, task, developer experience, tools, and measurement boundary attached to each result.

Types, tests, small modules, and architectural notes can reduce the work needed to understand a change.
Their value is the uncertainty they resolve.
Evolving software still needs deliberate work to maintain or simplify its structure :citep[lehman1980programs].

### Test an explanation against behavior

An agent can help you approach unfamiliar code through concrete examples, data-flow diagrams, and questions.
The [explain-diff prompts](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524) combine surrounding-code context, intuition, a grouped walkthrough, and a comprehension quiz.
These are proposed aids to inspection; a model that writes both the explanation and its quiz can repeat the same mistaken assumption in both.

For a consequential claim, predict an observable result, inspect the complete relevant code, and check that prediction against behavior.
Separate what the implementation guarantees from conditions the explanation assumes, such as a worker staying alive or a request reaching the same instance.
The [optional explanation challenge](/explore/challenge-an-explanation/) uses a small event recorder to practice finding and correcting an overstatement.

### Field note — Kirjolab

In [Kirjolab](/case-studies/kirjolab/), agents helped me reach a scope and level of integration I would not have attempted alone.
Functional checks made later refactoring safer, but they had not prevented unclear ownership and difficult navigation.
The case study records the development history and the structural feedback I carried into subsequent work.

### Choose what to participate in

A workflow can produce acceptable software and leave its owner able to explain it, while removing an activity they wanted to experience.
Choose assistance according to the result you need, the skills you need to retain, and the activities you want to take part in.

:ref[table:assistance-outcomes]{text="The table below"} separates three outcomes when choosing an assistance mode.

| Outcome              | Question                                                    | Evidence                                            |
| -------------------- | ----------------------------------------------------------- | --------------------------------------------------- |
| Accepted output      | Does the result meet the intended need?                     | Independent behavioral checks and acceptance review |
| Retained competence  | Can the person explain and change it later?                 | Delayed unaided explanation or repair               |
| Valued participation | Which parts of the work does the person want to experience? | Stated purpose, preferences, and reflection         |

::caption[Different outcomes of assistance require different evidence.]
::label[table:assistance-outcomes]

Randomized studies of programmers learning an unfamiliar library and students practicing mathematics found that AI access could reduce subsequent unaided performance :citep[shen2026skill,bastani2025learning].
The tasks and assistance designs differ; [Appendix A](/appendices/evaluating-agentic-workflows/#evaluate-assistance-and-retained-competence) explains what these short-term findings support and leave open.

Learning, investigating with colleagues, and enjoying implementation can be purposes of the work.
Choose what to delegate in light of those purposes as well as the result's quality and cost.
Manual work, agent critique, supervised implementation, and delegation can each fit a different task.
Finishing the agreed work can be a reason to stop, even when the agent has capacity for another task.

These choices also affect the team's future capacity to review and maintain software.
A workflow that relies on experienced reviewers needs opportunities for people to acquire that judgment.
Protected practice and mentoring can make room for predicting behavior, investigating failures, and explaining acceptance decisions.
The [shared engineering sessions](/project/#shared-engineering-sessions) illustrate one approach through individual predictions and rotating responsibilities.
Check later independent explanation or repair before claiming a learning benefit, and ask separately whether people retain meaningful choice and manageable workloads.

[Appendix A's optional Navigator exercise](/appendices/evaluating-agentic-workflows/#optional-exercise-write-with-an-agent-as-navigator) compares agent guidance with delegated implementation, then checks later unaided explanation and repair.

## Project artifact

For [implementation A](/project/establish/), build the [required project harness](/project/#6-minimum-project-harness) alongside the application.
Use the common evidence bundle to show:

- how another group can find the core event workflow, run it, and validate a change;
- one consequential stack or storage decision and its owner;
- one representative AI-assisted task, its configuration and checks, human correction, acceptance decision, and known limits.

These are checkpoints within the [existing submission bundle](/project/#9-common-submission-bundle-and-comparable-evidence), not additional standalone deliverables.

## Summary

The development loop turns a requested outcome into a checked, maintainable change.
Its project harness carries constraints and learning into later work, while people retain responsibility for acceptance and correction.
When generation exceeds review and integration capacity, improve those parts of the loop before increasing output.
