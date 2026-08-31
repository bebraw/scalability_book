# How can coding agents support scalable development?

As systems evolve, existing requirements and code constrain later change.
Agentic coding can amplify that pressure by increasing the rate at which Large Language Models (LLMs), tools, and environmental feedback produce candidate implementations.
The abstraction level has shifted, but the central engineering problem remains: requirements still have to become one of many possible concrete implementations that people can validate and maintain.

## What is an agent?

The agent concept predates LLMs.
In classical AI, an agent is situated in an environment: sensors turn stimuli into percepts, a controller chooses what to do, and actuators turn its commands into actions.
A purposive agent chooses actions in relation to goals or preferences.
This literature explicitly uses robots as a motivating example while treating computer programs as agents in information environments under the same model :citep[poole2023artificial].

In this book, a **coding agent** is a goal-directed software system that repeatedly observes a development environment, chooses a next action, performs it through available tools, and uses the result to continue, change direction, stop, or escalate.
An LLM by itself is not the whole agent.
The model operates inside an **agent harness** that assembles observations, exposes tools, carries state between steps, invokes the model, and returns the effects of actions to the next step.
A survey focused on software-engineering agents uses the closely related modules of perception, memory, and action, with the LLM as their cognitive core :citep[wang2025agentsse].

Within this system, the controller repeats an observe–decide–act loop as actions change the environment and create new observations.
:ref[table:coding-agent-anatomy]{text="The table below"} maps the parts of that loop from a physical robot to a coding agent and shows which development choices tune each part.

| Agent concept        | Robot                                        | Coding agent                                                                                 | What to tune                                                                       |
| -------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Goal or preference   | Reach a destination while avoiding hazards   | Requested outcome, acceptance criteria, constraints, budget, and stopping conditions         | Task specification, examples, graders, priorities, and escalation rules            |
| Environment          | A room, road, or factory floor               | Repository, filesystem, terminal, browser, remote services, and collaborating people         | Sandbox, workspace setup, available services, and environmental determinism        |
| Sensors / perception | Camera, microphone, or proximity sensor      | Prompt and instructions, file reads, search results, tool output, test failures, and images  | Context selection, retrieval, observation format, provenance, and feedback quality |
| Controller / brain   | Control software that selects motor commands | LLM plus the agent-harness loop that constructs context and interprets model outputs         | Model and runtime configuration, instructions, planning policy, and orchestration  |
| State / memory       | A map, state estimate, and recent readings   | Context window, session history, task state, retrieved documents, and durable project memory | Selection, summarization, retention, freshness, and source-of-truth rules          |
| Actuators / actions  | Wheels, arms, speaker, or display            | File edits, shell commands, browser interaction, API calls, and messages                     | Tool design, permissions, approvals, validation, rollback, and rate limits         |

::caption[Agent anatomy mapped from a physical robot to a coding agent.]
::label[table:coding-agent-anatomy]

The analogy is a design model, not a claim that a coding agent has a body, desires, or a human-like mind.
Its observations can be incomplete, its internal model can be wrong, its tool calls can fail, and its stated goal can be an inadequate proxy for the outcome people actually want.
Developing an agent therefore means more than changing the prompt or swapping the LLM.
You can improve what it can observe, how it decides and remembers, what actions it may take, how action effects return as feedback, and how its goal is translated into checks and stopping conditions.
The [constrain–generate–validate–revise loop](#constrain-generate-validate-revise) later in this chapter is one practical way to tune these parts together.

## How did development control change before and after agents?

Coding agents did not introduce specifications, executable tests, model-driven generation, or iterative feedback.
The distinctive change is that a probabilistic, tool-using system can now perform much more of the implementation loop and produce candidate changes at a rate that may exceed human comprehension, review, and integration.
Earlier engineering artifacts consequently reappear as machine-readable context, constraints, and feedback.

:ref[table:development-approaches-history]{text="The table below"} uses representative milestones rather than claiming that a broad practice was invented in one year.
The approaches overlap and can be combined; the chronology is not a progression from worse to better.

| Representative milestone | Approach                                                                                            | Primary artifact                                                         | Implementation loop                                                               | Main control and trade-off                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1970                     | [Staged, plan- and design-led development](https://www.praxisframework.org/files/royce1970.pdf)     | Requirements, architecture, interface, and test plans                    | Humans implement through planned stages with feedback between them                | Documentation and staged verification create traceability; discoveries arriving late can invalidate expensive commitments       |
| 2001                     | [Iterative and agile development](https://agilemanifesto.org/)                                      | Working increments, a backlog, and stakeholder feedback                  | Humans build and review small slices repeatedly                                   | Short feedback supports learning; architecture and cross-cutting quality require continuous stewardship                         |
| 2001                     | [Model-Driven Architecture](https://www.omg.org/mda/)                                               | Platform-independent and platform-specific models                        | Deterministic generators transform models into implementation artifacts           | A model can create repeatable leverage across platforms; escape paths and generator constraints can become expensive            |
| Early 2000s              | [Test-Driven and Behavior-Driven Development](https://dannorth.net/introducing-bdd/)                | Executable examples and tests                                            | Humans implement through short behavior and test feedback loops                   | Evidence moves close to implementation; checks cover only the properties and examples they encode                               |
| February 2025            | [Vibe coding](https://x.com/karpathy/status/1886192184808149383)                                    | Conversational intent and the running result                             | An agent generates while a person observes and redirects visible behavior         | Exploration becomes fast; traceability and control of hidden contracts, data, security, and maintenance remain weak             |
| August–September 2025    | [Spec-Driven Development](https://github.com/github/spec-kit/blob/main/docs/history.md)             | Specification, plan, tasks, and implementation artifacts                 | Agents work through durable phases with review between them                       | Intent survives one session or agent; artifact maintenance and drift from runtime behavior become new work                      |
| February 2026            | [Harness engineering](https://openai.com/index/harness-engineering/)                                | Project harness: repository structure, instructions, tools, and tests    | Agents repeatedly act inside encoded boundaries                                   | Mechanized feedback supports repeated high-throughput work; building and maintaining the project-specific environment is costly |
| April 2026               | [Shift-Up](https://arxiv.org/abs/2604.20436)                                                        | Executable BDD requirements, C4 models, and ADRs                         | Agents implement while people focus on requirements, architecture, and acceptance | Established design knowledge becomes a persistent guardrail; the current evaluation is exploratory and adds upfront work        |
| April 2026               | [Structured Prompt-Driven Development](https://martinfowler.com/articles/structured-prompt-driven/) | Version-controlled business, domain, design, task, and safeguard context | Agents generate within a reviewed prompt boundary                                 | Prompts become governable and reusable team artifacts; keeping them aligned becomes development work                            |

::caption[Representative milestones in the movement from human implementation and deterministic generation toward agent-executed development workflows.]
::label[table:development-approaches-history]

For the event tracker, every approach could produce the same visible event form and activity view.
The difference is where intent and control live: a staged design can describe the complete request and data path, an iterative team can deliver it as a vertical slice, BDD can express its accepted behavior, a model can generate schemas or clients, and an agentic workflow can interpret repository context and act across all of those artifacts.
A working browser view alone still does not establish authorization, HTTP compatibility, durable persistence, retry behavior, or safe evolution.

Shift-Up makes the historical reuse explicit by treating BDD requirements, C4 models, and ADRs as agent guardrails.
Its initial evaluation compared unstructured vibe coding, structured prompting, and a partial Shift-Up workflow while building a full-stack snack-bar web application :citep[lipsanen2026shiftup].
Treat that comparison as an exploratory example rather than a universal ranking of the approaches.

In this book, the same bounded project is first implemented with a local model, then a foundation model, and finally a fleet of agents.
The phases do not prescribe one row of the table.
They hold required web behavior stable so you can compare how different models, constraints, validation, and orchestration affect the path from a candidate change to accepted work.

### When generation outruns comprehension

Greater code-production capacity does not make software development scale by itself.
The evidence below describes different parts of the resulting capacity mismatch rather than one universal productivity law.

| Evidence                                                                                                                                                                     | What it supports                                                                     | Important limit                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Three field experiments covering 4,867 developers found about 26% more completed tasks with an AI coding assistant :citep[cui2026effects]                                    | Candidate production can increase in some settings                                   | Individual experiments were noisy, and the result does not apply equally to every person or project |
| A study of 78 developers across seven projects classified about 58% of observed time as program comprehension :citep[xia2018comprehension]                                   | Understanding already consumed substantial development capacity before generative AI | Two companies using Java and C# do not establish a universal reading-to-writing ratio               |
| A professional code-review study found that understanding supports knowledge transfer and alternative solutions as well as defect detection :citep[bacchelli2013review]      | Review is broader than checking whether generated code passes                        | The study predates current coding agents                                                            |
| A live LLM-review study at Mozilla and Ubisoft found that generated comments sometimes informed revisions, but reviewers accepted only a minority :citep[olewicki2026review] | AI-assisted review can contribute evidence while still consuming human judgment      | One deployment does not establish the effectiveness of every review agent                           |

::caption[Evidence behind the distinction between candidate production and accepted change.]
::label[table:candidate-production-and-comprehension]

An agent can increase the arrival rate of candidate changes more readily than a team can increase its comprehension, review, and integration capacity.
A generated diff is therefore inventory, not completed work.
Useful throughput is **accepted change**: work that someone can explain, validate against the intended behavior and architecture, integrate, and remain willing to own.
When candidate arrival exceeds that capacity, the backlog appears as large diffs, delayed review, shallow acceptance, rework, or technical debt.

Types, tests, contracts, static analysis, small modules, architectural notes, and assisted search can direct attention and compress review.
They help only when they reduce uncertainty rather than create more assertions to inspect.
Effort and transcript length remain poor correctness proxies: a quick change can be sound, a laborious change can be wrong, and neither proves that the application meets its requirements.

:citet[brooks1987silver] distinguishes difficulties tools can reduce from essential difficulties rooted in the software problem, while :citet[lehman1980programs] observes that evolving programs become more complex unless deliberate work maintains or simplifies them.
The [case studies](/case-studies/) show how faster generation interacts with product understanding, validation, and maintained project guidance in concrete projects.

### Field note — Kirjolab

When GPT-5.6 became available, I decided to revisit one of my long-standing ideas.
I wanted to combine some of the better features of [Zotero](https://www.zotero.org/), [Parsifal](https://www.parsifal.com.br/), and [Overleaf](https://www.overleaf.com/) in one service.
[Kirjolab](/case-studies/kirjolab/) grew from that experiment: a web application for storing, reviewing, and working with research papers, references, evidence, and writing in one place.
Within a few days of exploratory prompting, I had a working prototype.
That was a real success: agents helped me reach a degree of scope and integration I would not have attempted alone.

The speed also exposed a limit.
Functional gates continued to protect behavior, but they did not initially constrain structural ownership.
By 25 July, `src/client/app.ts` had reached 12,495 lines and combined an element registry, event binding, rendering, and feature orchestration.
The source structure eventually required extensive refactoring.
Existing tests made that repair safer, but they had not prevented the architecture from becoming difficult to navigate.

I carried those lessons back to my project template so that structural feedback would arrive earlier.
I also found that [mutation testing with Stryker](https://stryker-mutator.io/) and [cognitive-complexity analysis with Fallow](https://fallow.tools/docs/explanations/health/) complement one another: one challenges whether tests detect behavioral changes, while the other identifies code that is becoming difficult to reason about.
Agents tend to follow the patterns already present in a codebase, so the project should establish and reinforce the direction it wants future changes to take.

Technology choices should still follow product needs rather than optimize primarily for agent ergonomics.
At the same time, agents have ergonomics of their own: legible architecture, useful tools, and timely feedback affect the changes they produce.
Finding better primitives for agentic web development remains an emerging area.

## Sustainable throughput requires ownership

Prompting can produce visible results quickly, especially when a task is easy to specify.
Sustaining change requires enough context, explicit variation boundaries, relevant acceptance evidence, and an owner who can correct the result.
Guardrails and quality gates help, but they consume time and can be optimized mechanically if their score becomes the goal; the [Benchmarking chapter](/chapters/benchmarking/) develops that problem.

Agentic development therefore includes the supporting development system as well as the application.
Project instructions, architecture notes, tests, static analysis, reproducible commands, and reviewable examples can make future changes cheaper and safer.
Their value depends on whether they reduce uncertainty around the work that matters, not on how many checks or documents the repository contains.

The ownership standard should follow the work's consequences and expected lifetime rather than whether a human or model typed it.
A disposable experiment may need little maintenance, while shared code makes other people inherit the cost of understanding, operating, and correcting it—what Cory Doctorow calls [accretive work](https://pluralistic.net/2026/07/02/canonization/#operate-iterate-improve).
Publishing an issue or patch also transfers cost to an external maintainer, so the [Agent Fleets chapter](/chapters/agent-fleets/) treats publication as an externally consequential action that needs a human owner.

> **Sustainability angle**
>
> Sustainable agentic development has two meanings here.
> It means keeping the project maintainable for humans, but it also means avoiding wasteful tool use.
> Focused prompts, smaller context, reusable instructions, and strong validation loops reduce repeated generation and unnecessary compute.

## Human-agent relationship is a control design

The phrase _Human Agent Relationship_ (HAR) can suggest an interpersonal question: should the agent be treated as a tool, assistant, colleague, or team member?
Those metaphors may shape expectations, but they do not define how work is controlled.
In this book, HAR is a practical name for the allocation of **intent, authority, execution, evidence, intervention, and accountability** across a human-agent development system.

An agent does not need one global autonomy level.
For a particular decision, it may **propose** an option, **prepare** an action for approval, or **execute** within explicit limits.
Broader authority is easier to justify when the work is bounded, observable, independently checkable, reversible, and low in blast radius.
Ambiguous intent, weak evidence, irreversible commitments, and material external effects should narrow that authority.

Invoking a tool does not transfer accountability to it.
The accepting person or group still needs enough understanding, evidence, and control to stand behind the result and correct it.
The [Agent Fleets chapter](/chapters/agent-fleets/) develops the research background, decision path, and authority-mapping exercise.

Perceived effort can influence quality judgments when quality is difficult to assess :citep[kruger2004effort].
It is a heuristic, not correctness evidence.
:ref[table:trust-questions]{text="The table below"} separates four questions that should not be collapsed into one quality judgment.

| Concept        | Question it answers                                                                                         | Record to preserve                                                | Does not prove                         |
| -------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------- |
| Provenance     | Which exact revision or artifact is this, and which inputs, people, and tools produced or transformed it?   | Artifact identity, revision, material inputs, actors, and tools   | That the artifact is correct           |
| Endorsement    | Who stands behind which claim or decision on the final revision, including any reservations?                | Named endorser, endorsed claim, scope, revision, and reservations | That every property was checked        |
| Accountability | Who owns the consequences and must correct, maintain, or retire the result if it becomes wrong or outdated? | Accountable owner and correction or retirement obligation         | That the owner produced the artifact   |
| Evidence       | Which properties were checked on that revision, under what conditions, and what remains unverified?         | Check, environment, result, revision, limits, and omissions       | Universal quality outside those checks |

::caption[Questions that separate an artifact's origin, endorsement, accountability, and evidence.]
::label[table:trust-questions]

[_Sloptimists, Sloperators and Slopportunism_](https://atharvaraykar.com/sloptimists-sloperators-and-slopportunism/) makes the distinction concrete: Atharva Raykar describes the essay body as unedited model output, then says in his commentary that he does not fully endorse it.
Disclosed origin and human acceptance are different, and neither establishes quality.
Survey respondents have reported tracking and monitoring for later review or debugging as reasons for declaring AI-generated code, but the available study did not test whether declaration improves software quality :citep[kashif2026declaration].

Use the AI-use log together with the submitted project evidence: record material assistance and corrections in the log, and bind checks and known limits to the submitted revision.
Provenance can make a process traceable; it does not make the artifact correct or transfer responsibility to the tool.
Record effort for comparison and reflection, not as a quality score.

The loop below is the local form of this relationship.
The human and agent may occupy different positions in each phase, but the workflow still needs a visible owner, admissible actions, acceptance evidence, and a route for correction.

## Constrain, generate, validate, revise

Agentic development follows a repeated loop: constrain what may happen, generate a candidate, validate it against the intended outcome, and revise both the result and the project's durable knowledge.
The loop's useful throughput depends on the evidence required to advance each stage, not on generation speed alone.

Constraints at the start of a task are hypotheses, not necessarily complete knowledge.
:citet[brooks1987silver] argues that rapid prototyping supports the iterative specification of requirements because important questions become visible only when people interact with a concrete system.
:citet[naur1985theory] similarly describes programming as theory building rather than program-text production.
Implementation can therefore be a way to learn what the specification should say, not only a way to execute it.

:ref[table:agent-development-loop]{text="The table below"} summarizes the question, work, and exit evidence at each stage before the sections that follow examine them in detail.

| Stage     | Governing question                          | Main action                                                                  | Exit evidence                                           |
| --------- | ------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------- |
| Constrain | What outcome is wanted, and what may vary?  | State the goal, context, boundaries, budget, and stopping or escalation rule | A bounded task and explicit acceptance criteria         |
| Generate  | Which candidate might satisfy those limits? | Let a chosen model and agent harness act with relevant context and tools     | A candidate artifact plus its trace, cost, and attempts |
| Validate  | Does the candidate satisfy the real need?   | Apply independent checks and inspect the artifact a user will consume        | Acceptance evidence and known unverified properties     |
| Revise    | What should change before the next attempt? | Correct the result and codify learning in durable project material           | An improved artifact and better starting constraints    |

::caption[The constrain–generate–validate–revise loop and the evidence that advances each stage.]
::label[table:agent-development-loop]

> **Delegate work without surrendering judgment**
>
> Cognitive offloading—using external action or aids to reduce a task's cognitive demand—is one reason tools can help people scale their work :citep[risko2016offloading].
> :citet[shaw2026cognitive] use _cognitive surrender_ for a narrower proposed failure: adopting AI output with little scrutiny so its judgment replaces rather than supports the person's own.
> Their experiments used short reasoning tasks, so treat the term as a workflow diagnostic rather than settled cognitive architecture or evidence of professional programming skill loss.
> Generation can be delegated, but constraints, validation, and revision should not all collapse into the same model's unsupported judgment.
> Before accepting a consequential change, the team should be able to explain the intended behavior, name a plausible failure, connect acceptance to independent evidence, and correct or reject the result.

**Constraining**

Constrain both the task and the environment in which it runs.
State the outcome, what may vary, relevant architecture and technology boundaries, budget, forbidden actions, acceptance criteria, and escalation rule.
Durable project instructions such as `AGENTS.md` can preserve constraints that should apply beyond one prompt.

**Generation**

Model choice should follow the work and local evidence.
A more capable model may avoid retries on uncertain or coupled tasks, while a smaller model may reliably satisfy strong checks on bounded work.
Treat labels such as "planning" and "implementation" as routing hypotheses rather than rules.
A model name is not a capability result: runtime configuration, context, tools, hardware fit, routing, and fallback can all change the outcome and its cost or data boundary.
[Appendix A: Evaluating agentic development workflows](/appendices/evaluating-agentic-workflows/) shows how to identify and compare the configuration that actually served the work.

Context selection is another generation decision.
Focused retrieval and compact tool output can reduce irrelevant material, but any lossy view can also hide the fact needed to complete or review the task.
Keep important raw evidence retrievable and test context-reduction policies instead of treating fewer tokens as an outcome by itself.

**Validation**

Validation decides whether a candidate advances or returns for correction.
Agents can generate and run checks, but those checks are candidate artifacts too: acceptance depends on their demonstrated relationship to the required behavior.

Validation is stronger when it compares a candidate with an independent reference or inspects the artifact a user actually consumes.
The [Webernetes case study](/case-studies/webernetes/) develops the first pattern through tests shared with a real k3s cluster; the [Slideotter case study](/case-studies/slideotter/) develops the second through geometry, browser, and rendered-output checks.

> **A generated test is still generated output**
>
> In a contrasting workshop report, :citet[talwar2026llms] describes an agent-generated application whose screenshot tests did not exercise the application, whose claimed passkey authentication accepted a username without authentication, and whose data disappeared after restart.
> A useful conclusion is that specifications and generated tests do not constrain a system merely because they exist.
> A screenshot check should launch the real application, authentication should be tested against observable security behavior, and persistence should survive a restart.
> Tests produced by the same agent remain candidate artifacts until their relationship to the required behavior has been established.

A reversible mutation can strengthen this relationship by checking that a test distinguishes the accepted implementation from one named fault.
That contrast does not prove the mutant is realistic or the broader requirement is satisfied, but it is stronger than coverage alone.
The concern-directed mutation lab lets you apply the pattern to authorization, retry, or archived-state behavior; [study its source](https://github.com/bebraw/scalability_book/tree/main/labs/concern-directed-mutation) or [download the standalone lab](/downloads/labs/concern-directed-mutation.zip).

**Revision**

Revision corrects the candidate and improves the next starting point.
Codify durable learning in requirements, tests, architectural decisions, or project instructions; otherwise the implementation and its supporting material drift apart.

## Agents learn patterns from your codebase

The codebase itself is also part of the context an agent learns from during a task.
:citet[robinson2026maintain] describes allowing several duplicated authorization checks because an agent could maintain them later.
Instead, those accepted shortcuts became examples for the agent to copy into the next change.
A shortcut therefore has two costs: humans may have to repair it later, and agents may treat it as evidence of the project's preferred style.
Validation should ask not only whether the current change works, but also whether it leaves behind a pattern worth repeating.

### Constraint feedback loop

The demonstration below starts with an underspecified request to add CSV export to an event list.
Generate a candidate, validate it against the constraints that were stated, revise the project memory from failed checks, and then begin the next round.
Try completing the loop once with the default constraints and once after selecting every constraint before generation.

{{ import "site/includes/constrain-generate-validate-demo.html" }}

The generated candidate is deterministic teaching data rather than model output.
The useful part is the shape of the loop: validation produces evidence, revision makes the learning explicit, and the revised memory changes the next generation boundary instead of becoming a vague instruction to "try again."

## Bound probabilistic generation with deterministic controls

Agentic development does not make the generator deterministic.
The practical goal is to keep variation inside explicit boundaries so behavior remains predictable where correctness depends on it.
Two runs may interpret the same task differently, but they do not need unrestricted authority to invent business rules, state transitions, permissions, or completion criteria.

Developers can decide what may vary and encode what must remain stable.
In his talk, David Khourshid ([Beyond the Prompt: "Goodbye slop; welcome determinism"](https://www.youtube.com/watch?v=uMvTAF280so)) argues for explicit models, state machines, and deterministic core logic around generative components.
This gives validation a clearer target: let the model handle work that benefits from interpretation, while expressing rules and invariants in forms that tools can check repeatedly.
The resulting controls can still encode the wrong rule or omit an important condition; determinism makes a boundary repeatable, not automatically correct or complete.

Khourshid describes one way to combine these ideas as letting an LLM navigate a deterministic state machine: given a goal and the current state, the model chooses from the events the machine currently permits.
The demonstration below applies that pattern to an agent delivering a code change.
At each state, choose among only the events that the machine currently enables.
The statechart expresses hierarchy, parallel verification, recovery, and completion while keeping the model away from events that are not currently legal.

{{ import "site/includes/statechart-boundary-demo.html" }}

Notice what the statechart provides beyond a linear checklist.
One cancellation rule applies throughout the compound active state, tests and human review can progress independently, and either kind of failure can return the workflow to implementation.
The model may choose a route, but the statechart defines the available routes.
It does not prove that the generated code satisfies the web application's requirements: the tests, review criteria, and observed behavior still have to provide that evidence.

Deterministic boundaries also depend on how the application represents valid data and commits state.
The [Architecture chapter](/chapters/architecture/) develops that connection through constructive data modeling, runtime parsing, authorization, and atomic persistence.

## The project harness

When using agents, the application code is only one part of the project.
The other part is the **project harness** around the code: the versioned files, commands, rules, and examples that help humans and agents understand what is expected.
This is related to, but distinct from, the agent harness introduced earlier.

| Term               | Scope                                   | What it includes                                                                                              | Governing question                                                |
| ------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Agent harness      | One model-and-tool execution loop       | Context assembly, tools, state, permissions, model invocation, and action feedback                            | How can the model observe, decide, and act?                       |
| Project harness    | One repository or maintained codebase   | Instructions, specifications, architecture notes, environments, commands, tests, rules, and examples          | How can a contributor change this project without hidden context? |
| Development system | The process that changes an application | People, agents, agent harnesses, project harnesses, review, integration, ownership, and organizational policy | How does candidate work become accepted and maintainable change?  |

::caption[Three related control layers in agentic development.]
::label[table:agentic-development-control-layers]

An agent harness can consume a project's instructions and invoke its commands, but those artifacts remain part of the project harness rather than the runtime itself.
A development system may use several agent harnesses against the same project harness and still rely on people for review, integration, and ownership.
A good project harness reduces the hidden context needed to make a useful change and returns failures in forms that people and agents can act on.

An analysis of 3,864 user-reported bugs across Claude Code, Codex CLI, and Gemini CLI found that API, integration, or configuration errors accounted for 37.3% of root causes, while tool invocation and command execution were the most affected workflow stages :citep[zhang2026pitfalls].
The sample is limited to public issue reports, but the result is a useful warning: model reasoning is only one possible failure source.
Strict tool contracts, useful errors, reproducible commands, and observable execution belong to the project harness too.

[vibe-template](https://github.com/bebraw/vibe-template) provides one concrete example: it separates a starter application from agent instructions, architecture rules, feature specifications, decision records, setup notes, and validation commands.
The reusable lesson is to push repeatable project knowledge and feedback into maintained artifacts rather than leave them in one conversation.

The [common project specification](/project/#6-minimum-project-harness) owns the exact required artifacts.
The practical baseline is simpler than the list: can a new contributor or agent clone the project, understand its intended shape, run it and its checks, and make a small change without guessing?
An environment definition is part of that contract rather than neutral background; the [Friction chapter](/chapters/friction/) develops how to test it from a fresh checkout.
That chapter also explains why validation cost should follow change risk instead of running every check after every edit.

### Reuse practices without cloning the whole project harness

Copying a complete starter repository into an existing project is usually too coarse.
Package a reusable capability with its fit criteria, files, dependencies, integration instructions, checks, provenance, and update path so a project can adopt the practice without inheriting every source-template decision.

[Modern Web Guidance](/case-studies/modern-web-guidance/) shows how a maintained external capability can package fast-changing domain knowledge with targeted retrieval, compatibility constraints, an update path, and task-level evaluation.
Imported capabilities also create a trust boundary because instructions or bundled code may influence tools operating with the agent's authority.
The [Agent Fleets chapter](/chapters/agent-fleets/) develops the security implications, while the skill-adoption lab provides a bounded review exercise; [study its source](https://github.com/bebraw/scalability_book/tree/main/labs/skill-adoption) or [download the standalone lab](/downloads/labs/skill-adoption.zip).

## Project artifact

For [implementation A](/project/establish/), create the first version of the project harness alongside the web application.
Keep it small enough to maintain, but concrete enough that another group can run the project, inspect the main event workflow, and understand how agent-produced work becomes accepted work.
Include:

- a README with the supported setup and run path,
- project instructions for the coding agent,
- one architecture note and one feature specification for the core event workflow,
- one decision record for a consequential stack or storage choice,
- one fast validation command,
- and a short AI-use record that binds a representative task to its relevant configuration, checks, human correction, acceptance decision, and known limits.

The complete requirements for the project harness and evidence package remain defined by the project specification.
This chapter's contribution is to make intent, constraints, feedback, and ownership explicit before generated changes accumulate.

## Summary

Coding agents have changed web development by increasing the rate at which a specification can become candidate code.
A generated change is not completed work: useful throughput is accepted behavior that people can explain, validate, integrate, correct, and remain willing to own.
When generation outruns those capacities, speed reappears as review backlog, shallow acceptance, rework, or technical debt.

Specifications, architecture notes, project instructions, examples, tests, and validation commands therefore become control surfaces for both people and agents.
They constrain what may vary, return evidence to the next attempt, and help future work recover the intent behind the codebase.
Deterministic checks can bound probabilistic generation, but they establish only the properties and conditions they actually examine.

Human–agent control should be allocated per decision rather than expressed as one global autonomy level.
An agent may propose, prepare, or execute within explicit limits, while provenance, endorsement, accountability, and evidence remain separate questions.
For a web application, acceptance must reach beyond a plausible browser view to the relevant HTTP contracts, authorization rules, persistence behavior, retry semantics, and maintenance obligations.
Whatever produced the change, maintained work still needs an accountable human owner.
