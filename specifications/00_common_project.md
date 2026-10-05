# Common Project Specification

## Work Activity Tracker

This specification defines the application that your group will implement three times during the course.
The required behavior remains substantially the same.
The development setup changes:

1. **Establish:** locally hosted model and a single-agent workflow.
2. **Challenge:** comparison model and a single-agent workflow.
3. **Compare:** an agent fleet using a declared base model.

Each phase produces a separate implementation.
The purpose is not to find one universally best model, framework, or architecture.
The purpose is to compare how different development systems approach the same bounded web application and to reason about the scalability of both the application and the development process.

The phase specifications define additional constraints and deliverables.
This common specification applies to all three phases.
Read the [project introduction](00_introduction.md#guidelines-for-course-work) before starting work; it explains submission checkpoints, evidence records, external contributions, and learning expectations.

## Shared engineering sessions

Each group must hold one shared engineering session of approximately 30 minutes per phase, within its existing project work.
Use three responsibilities: **operator** works with the agent and explains the request; **challenger** questions assumptions and proposes alternatives; **validator** inspects the implementation, runs checks, and explains the acceptance decision.
Rotate these responsibilities across phases so each student practices all three.
For an approved pair, combine challenger and validator and rotate the operator; for a larger group, divide active investigation and validation tasks so everyone contributes.

Use this sequence:

1. Before consulting the agent, each student briefly predicts the behavior or proposes a design.
2. Compare predictions, agree on the question, and investigate the implementation with the agent.
3. Run a relevant check and have someone other than the operator explain whether to accept, revise, or reject the result and what remains uncertain.

Use a question tied to the current phase:

- **Establish:** Does a work-item transition reliably produce the corresponding activity event?
- **Challenge:** What happens when two clients attempt the same transition concurrently?
- **Compare:** Does a proposed scaling response improve the measured limit, and what new failure can it introduce?

An equivalent question is acceptable when it examines the same phase's correctness, pressure, or scaling reasoning.
Record participants and responsibilities, the initial disagreement or prediction, the check and result, and the acceptance decision compactly in the existing decision record or AI-use log.
Link the relevant code or evidence; do not submit another report or a raw chat transcript.
This session replaces part of ordinary project discussion and reflection within the published time budget.
Shared work may be remote and does not require a shared personal account.

---

## 1. Application Brief

Build a web application that records activity around work items.

The application contains:

- **Workspaces**, which separate independent groups or projects.
- **Work items**, which belong to a workspace and move through a small lifecycle.
- **Activity events**, which record what happened to a work item.

The domain is intentionally familiar and compact.
Your group may give the application a visual theme or adapt the terminology—for example, a workspace may be presented as a classroom, game, laboratory, production line, or agent workflow.
The required capabilities must remain identifiable to an auditor, but the specification does not prescribe one ideal interpretation or design.

This specification primarily describes observable behavior.
When several interpretations satisfy the requirements, choose one, implement it consistently, and document any assumption that affects how the application is used or evaluated.
You do not need to make the implementation unusual deliberately; differences are expected to emerge from ordinary design and development decisions.

In Compare, the same model will be applied to the development workflow itself: a fleet run can become a workspace, delegated tasks can become work items, and agent or human actions can become activity events.
The earlier implementations do not need agent-specific behavior.

---

## 2. Required Domain Model

Your implementation must represent the following concepts.
Field names and internal representations may differ.

### 2.1 Workspace

A workspace must have:

- a unique identifier;
- a name.

### 2.2 Work item

A work item must have:

- a unique identifier;
- a workspace;
- a title;
- a state in a lifecycle with at least three ordered stages corresponding to:
  - not started, such as `open`;
  - active, such as `in_progress`;
  - finished, such as `done`.

You may add descriptions, owners, labels, priorities, deadlines, or other fields.

### 2.3 Activity event

An activity event must have:

- a unique identifier;
- an event type;
- the workspace concerned;
- the work item concerned;
- an occurrence timestamp;
- an actor represented at least by a name or identifier.

The required event meanings are:

- creation of a work item, such as `item_created`;
- movement into the active stage, such as `work_started`;
- movement into the finished stage, such as `work_completed`.

Events may contain additional metadata.
Names and representations may differ if their mapping to the required meanings is documented.

---

## 3. Required Behavior

### 3.1 Workspace management

A user must be able to:

- create a workspace;
- view the workspaces needed to use the rest of the application.

Editing and deleting workspaces are optional.

### 3.2 Work-item lifecycle

A user must be able to:

- create a work item in a workspace;
- move a work item from the initial stage to the active stage;
- move a work item from the active stage to the finished stage;
- see the current state of a work item.

Creating a work item must record one creation event.
Each successful state transition must record the corresponding activity event.

Unsupported transitions must be rejected.
For example, an item cannot skip directly from the initial stage to the finished stage.
A rejected transition must not change the item state or record a successful transition event.

### 3.3 Activity feed

A user must be able to:

- view recorded events;
- identify the event type, workspace, work item, actor, and occurrence time;
- filter events by workspace;
- filter events by event type.

The default ordering must be documented and deterministic.
Newest-first ordering is recommended.

### 3.4 Summary

The application must show at least one derived summary for a selected workspace:

- the number of work items in each state; or
- the number of events of each type.

The summary may be calculated when requested, maintained incrementally, or produced in another explainable way.

### 3.5 Validation and errors

The application must:

- reject missing or invalid required values;
- preserve a valid state when an operation fails;
- show the user an understandable error;
- avoid exposing secrets or a raw internal stack trace through the user interface.

### 3.6 Persistence

Workspaces, work items, their states, and activity events must survive an ordinary application restart.

The storage mechanism is your choice.

### 3.7 Intentionally unspecified details

The specification does not prescribe:

- page structure, navigation, or visual design;
- whether interactions use forms, links, buttons, an API, or another interface;
- exact URLs, endpoint shapes, or transport formats;
- whether rendering happens on the server, client, or both;
- identifier format or timestamp precision;
- how actors are chosen or represented beyond the required event information;
- how state and events are represented or stored internally;
- how the summary is calculated;
- module, service, or deployment boundaries;
- behavior outside the required lifecycle and acceptance scenarios.

Resolve these details in a coherent way.
Record assumptions that another group would need in order to use, test, or understand the result.

---

## 4. Common Acceptance Scenarios

Another group and the instructors must be able to verify at least the following scenarios through the running application:

1. Create two workspaces.
2. Create work items in both workspaces.
3. Confirm that each new work item begins in the documented initial state.
4. Start one work item and confirm that it enters the documented active state.
5. Complete that item and confirm that it enters the documented finished state.
6. Attempt an unsupported state transition and confirm that it is rejected without changing the stored state.
7. View the activity feed and find one event for each successful operation.
8. Filter the feed to one workspace and confirm that events from the other workspace are absent.
9. Filter the feed by event type.
10. View the required summary and verify it against the created data.
11. Restart the application and confirm that the data remains available.
12. Submit invalid input and confirm that the result is understandable and does not corrupt existing data.

The course may provide automated checks for behavior that can be tested without prescribing a particular implementation.
Passing an automated check does not replace human review.

---

## 5. Technical Freedom and Experimentation

You may choose:

- the programming language;
- the web framework or combination of frameworks;
- server-rendered pages, a client application, LiveView-style interaction, or another web approach;
- a monolith, client-server design, serverless design, or another explainable architecture;
- relational, document, file-based, event-oriented, in-memory-with-persistence, or other storage;
- local, containerized, cloud, edge, or other deployment;
- testing, observability, and build tools.

Next.js, Elixir, Python, and less common stacks are all valid choices.
A familiar stack is not automatically safer, and an exotic stack is not automatically more innovative.
Evaluation is based on what the choice enables, what it costs, how well the result satisfies the contract, and whether another group can understand and run it.

For the clearest within-group comparison, you should normally keep the same primary language and framework family across all three implementations.
Different groups are encouraged to choose different stacks.
A group may change its own stack between phases when it has a clear experimental reason and instructor approval, but the final analysis must then treat the stack change as a confounding factor.

Experimentation is encouraged when it serves a question the group can explain.
Examples include:

- comparing server rendering with a client-heavy approach;
- using an actor model or functional language;
- trying an event-sourced representation;
- using an embedded or unusual database;
- targeting an edge or serverless runtime;
- minimizing client JavaScript;
- optimizing for local-first operation, privacy, portability, or resource efficiency.

Your group owns the operational consequences of its choices.
A stack that nobody outside the group can install, run, test, or inspect has not met the project requirements, even if the application worked on the authors' machine.

No particular stack receives extra credit merely for being fashionable, complex, or unusual.

---

## 6. Minimum Project Harness

Project harness is the course's label for the repository guidance, reproducible setup, and executable checks that support its development workflow.
Each implementation must provide:

- a `README.md` that explains the application, prerequisites, setup, running, testing, and the chosen stack;
- one supported path from a clean checkout to a running application;
- pinned or otherwise [reproducible dependency and runtime versions](/concepts/#reproducible-environment);
- an example configuration file when configuration is required;
- no committed secrets;
- a repeatable way to create enough demonstration data for the acceptance scenarios;
- a repeatable workload adapter for the shared runtime protocol;
- at least one automated validation command;
- tests covering the work-item lifecycle and its event recording;
- project instructions for the AI development workflow;
- an architecture or data-flow diagram and a short architecture note for the core event workflow;
- one maintained feature specification for the core event workflow, including its acceptance path;
- a short [decision record](/concepts/#decision-log) explaining the stack choice.

Setup may use native tools, containers, a development environment definition, or another documented mechanism.
Do not require an auditor to infer missing steps from knowledge held only by your team.

The README must distinguish mandatory prerequisites from optional development conveniences.
If the stack requires unusual system dependencies or hardware, document them near the beginning.

---

## 7. Shared Runtime Workload and Progressive Scalability Analysis

You do not have to build a production-scale distributed system.
You must be able to measure a stable baseline and reason about what your implementation would do under pressure.

### 7.1 Shared baseline workload

Run the same stack-neutral workload against implementations A, B, and C.
The workload measures logical user operations from the adapter's request until the application returns an observable result, not individual internal network requests.
The adapter may drive the user interface, a documented application interface, or another repeatable boundary that exercises the real application and persistence path.
Choose that boundary before measuring A and keep it across B and C: API-response latency and browser-visible completion are different outcomes.
Define the [start and completion events](/concepts/#measurement-boundary), including response validation and what constitutes acknowledged persistence; separate additional diagnostic boundaries rather than ranking them together.

Start each measured profile from this fixture:

- eight workspaces named `workspace-01` through `workspace-08`;
- fifty work items per workspace: twenty in the initial state, fifteen in the active state, and fifteen in the finished state;
- all activity events implied by creating and transitioning those items;
- four actors named `actor-01` through `actor-04`, distributed deterministically across the fixture;
- stable fixture keys that the adapter can map to implementation-specific identifiers.

A workload cycle uses this operation mix:

| Share | Logical operation                                  | Target rule                                                                                            |
| ----: | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
|   30% | Read the activity feed                             | Divide evenly between the unfiltered feed, one workspace, and one event type                           |
|   15% | Read a workspace summary                           | Rotate evenly through the eight workspaces                                                             |
|   20% | Create a work item                                 | Rotate workspaces and actors; use a unique deterministic title                                         |
|   15% | Move an existing initial item to the active state  | Use a distinct valid target for each operation                                                         |
|   10% | Move an existing active item to the finished state | Use a distinct valid target for each operation                                                         |
|   10% | Attempt an unsupported transition                  | Treat the documented rejection as an expected result, then verify that state and events did not change |

Use a fixed operation-order seed and record it.
Concurrent operations in this baseline should use distinct work items; contention on the same item belongs in a pressure scenario.

Run the following profiles:

| Profile            | Operations | Concurrency |  Repetitions | Reset rule                              |
| ------------------ | ---------: | ----------: | -----------: | --------------------------------------- |
| Warm-up            |        100 |           1 | 1 unmeasured | Reset and reseed afterward              |
| Steady             |        500 |           4 |   3 measured | Reset and reseed before each repetition |
| Higher concurrency |        200 |          16 |   3 measured | Reset and reseed before each repetition |

These are **closed-loop** profiles: each of the declared workers dispatches its next logical operation only after its previous operation completes or times out, with no intentional think time.
Workers take operations from the fixed seeded sequence until it is exhausted; concurrency is a maximum, not a guaranteed arrival rate.
Disable adapter retries for the baseline, and record any application-level retry policy and internal attempts separately from logical operations.
Record the cache policy too: resetting the fixture after warm-up does not guarantee warm data caches.

Predeclare one per-operation timeout and one overall run deadline, held constant across comparable runs.
Use 10 seconds per operation and five minutes per measured repetition unless the instructor approves different limits for the chosen boundary before the comparison.
At the run deadline, stop dispatching, record queued operations as not started and active operations as unfinished, and preserve their identifiers for reconciliation.
A timeout is an observed deadline crossing, not an exact completion latency or proof that a write did not commit.
After the run, reconcile state and events for timed-out or unfinished writes, and report unresolved outcomes explicitly.
Quiesce or isolate outstanding work before resetting the fixture so a late write cannot contaminate the next repetition.

For every measured repetition, record:

- implementation identifier, commit, environment, configuration, adapter version, and operation-order seed;
- elapsed time, scheduled and dispatched counts, completed valid operations, and [valid completions per second](/concepts/#throughput);
- median and [95th-percentile latency](/concepts/#tail-latency) for completed valid operations, clearly labeled as conditional on completion, plus their sample counts and the percentile calculation;
- separate counts for not-started, unfinished, and timed-out operations, including their known waiting durations or deadline lower bounds;
- expected rejections separately from timeouts, crashes, invalid responses, and other unexpected errors;
- post-run checks for state, event, filter, and summary correctness;
- one resource-efficiency proxy that can be collected consistently across phases, such as peak memory, CPU time, database growth, or billed execution time.

Report each repetition and the median result rather than presenting only the best run.
Expected unsupported-transition rejections count as valid completed operations only when the unchanged-state check passes; unexpected admission rejections do not.
Show read, write, and expected-rejection counts separately so fast refusals cannot conceal lost useful work.
For the baseline p95, use the nearest-rank observation at `ceil(0.95 × n)` in the sorted valid latencies, and retain the raw observations.
In 200 observations, only about ten lie in the upper 5%; per-operation subsets are smaller still.
These short runs expose variation and regressions, but cannot establish stable production tail latency; report small subsets descriptively and avoid spurious decimal precision.
Absolute results from different hardware or hosted environments should not be ranked as though the environment were controlled.
If a platform limit prevents a profile from completing, preserve that result as evidence and label any reduced diagnostic run instead of silently changing the protocol.

The baseline is an experimental reference, not a claim that this operation mix represents every real workload.

### 7.2 Progressive pressure analysis

Use the baseline workload as the starting point for the cumulative pressure analysis.
Change one main condition at a time where practical so the effect remains interpretable—for example concurrency, fixture size, dependency latency, or repeated requests.

Use these scenarios as a shared pressure catalog:

- many independent workspaces;
- concurrent users changing different and identical work items;
- high and bursty event volume;
- storage growth over time;
- slow or temporarily unavailable dependencies;
- retries that may repeat a request;
- automated reads or writes whose application value, resource cost, or access pattern differs from ordinary interactive use;
- demand for recent activity and historical summaries;
- a need to retain, aggregate, archive, or delete old events.

Do not exhaustively apply the entire catalog after every phase.
In Establish, select one **primary pressure** that is likely to expose an important architectural limit and define it as a documented transformation of the baseline workload.
Reuse that scenario and its procedure in Challenge and Compare so the three implementations remain comparable.
Challenge adds one **secondary pressure** revealed by an architectural difference or observation.
Compare uses the broader catalog to interpret important differences across A, B, and C, but only relevant pressures need in-depth analysis.

For each pressure analyzed in depth, identify:

- what is likely to fail or slow down first;
- the resource, quota, dependency, or operational limit being approached;
- the first useful signal that would reveal the problem;
- one plausible response;
- at least one prepared recovery action available if the limit is reached;
- the new cost or failure mode introduced by that response.

When automated use or data exposure is the selected pressure, also distinguish cooperating, authorized, and abusive consumers; state which information is intentionally public or retained; and account for the false-positive and accessibility cost of the proposed control.

Use runtime evidence where the available workload and environment allow it.
Label reasoned projections as projections rather than observations.
The goal is a cumulative, justified analysis, not repeated hypothetical matrices or distributed infrastructure added without evidence.

### 7.3 Arrival-controlled overload and recovery

When a selected pressure or scaling claim concerns sustained incoming demand, queue growth, or admission control, add a bounded **open-loop** pressure run within that experiment.
It replaces part of the existing pressure analysis rather than adding another mandatory scenario for every build.
Schedule arrivals independently of earlier completions; a closed-loop client population can reduce its own offered load as the application slows.

Use a pilot to select and then freeze three arrival rates expected to be below, near, and above the observed service limit, with 30 seconds at each rate followed by up to 60 seconds of drain and recovery observation.
Declare the operation mix, fixture, timing boundary, request timeout, maximum in-flight work, and total attempt budget before the comparison, and keep them stable when rerunning the selected pressure.
Do not silently lower an assigned rate when the generator or application cannot keep up.
If a generator cap prevents dispatch, count the scheduled operation as not dispatched; do not accumulate an unbounded catch-up queue.

Record scheduled arrivals, actual dispatch times and scheduling lag, application admissions where observable, expected domain rejections, overload rejections, valid completions, timeouts, and unfinished work separately.
If admission is not observable, label it unknown rather than inferring it from dispatch.
Report both scheduled-arrival-to-result time, which includes generator waiting, and dispatch-to-result time, with the same outcome and censoring rules as the baseline.
Record queue length or age and resource use during load and drain where observable; distinguish application backlog from generator lag.
At the drain deadline, retain unfinished identifiers, check for late writes or duplicates, and verify ordinary service has recovered.
If it has not, report that result and perform the prepared recovery action.

---

## 8. Permitted Transfer Between Implementations

Implementations must begin in separate repositories or clean implementation directories.

You may carry forward:

- this specification and instructor-provided materials;
- acceptance scenarios and course-provided tests;
- your own written lessons and comparison notes;
- domain terminology and user-facing copy;
- technology-neutral diagrams;
- generic personal or course tooling that does not contain application behavior.

You may not carry forward:

- application source code;
- implementation-specific tests;
- generated components or configuration copied from an earlier implementation;
- an earlier repository used as the starting point for the next phase;
- prompts that contain substantial blocks of the earlier implementation.

The [bounded paired task](03_compare.md#5-4-compare-one-agent-with-the-fleet) is an explicit exception for experimental copies of a frozen revision, not for implementation C's starting code.

When uncertain, disclose the reuse in the evidence package.
The purpose of the rule is to create genuinely fresh implementations, not to prevent students from learning.

Third-party libraries, public starter templates, framework generators, and generic personal scaffolds are allowed if their use is documented and permitted by the course's normal rules.

---

## 9. Common Submission Bundle and Comparable Evidence

After every phase, submit one common bundle containing:

- that phase's implementation in its own repository or clean implementation directory;
- the comparable evidence categories in sections 9.1–9.4;
- the bounded cross-team audit report and a short response from the authors; and
- the additions named by the phase specification.

A listed requirement does not automatically require a separate file.
One clearly structured artifact may satisfy several fields, and the phase specifications name only additions to this common bundle.
Use the same evidence categories after every phase so later comparisons can refer to the earlier package rather than reconstruct it.

### 9.1 Development setup

- implementation identifier and commit;
- language, framework, storage, and deployment approach;
- model name and whether inference was local, departmental, or externally hosted;
- agent tool and version or retrieval date, together with any imported skill, plugin, or instruction bundle that materially affected the workflow;
- orchestration configuration, if any;
- local hardware class or hosted environment relevant to the result, paths by which project data may leave that environment, and any fallback policy.

When the tool exposes them and they materially affect a comparison, also record the resolved model revision or digest, quantization, runtime, allocated context, actual inference route, memory limits, accelerator residency or CPU/GPU offload, and resolved revision or content digest of imported capabilities.
Mark unavailable fields as unavailable rather than spending project time estimating hidden configuration.

### 9.2 Effort and execution

- elapsed project time;
- estimated active human time;
- approximate model usage, cost, or locally measurable resource use;
- failed or abandoned attempts worth noting;
- important human interventions and corrections.
- one representative AI-assisted task record containing the task brief, relevant model and agent configuration, checks, trace or compact execution evidence, human correction, acceptance decision, and known limits.

Exact accounting is not expected when a tool does not expose it.
State what could and could not be measured.

### 9.3 Product evidence

- acceptance-scenario results;
- automated test results;
- results from the repeated [shared baseline workload](/project/#7-1-shared-baseline-workload), including the declared resource-efficiency proxy;
- known defects or incomplete requirements;
- deployment URL, local run evidence, or another agreed operational artifact.

Use the same resource-efficiency signal and procedure across phases where practical.
If direct energy measurement is unavailable, report an observable resource proxy and do not relabel it as energy or carbon.

Every implementation must have a reproducible operational path.
The Compare phase adds one realistic deployment outside the author's development process; its specification defines that final requirement.

### 9.4 Engineering explanation

- architecture and data-flow diagram;
- stack decision record;
- the phase's cumulative scalability-pressure record;
- a standardized friction audit covering setup, comprehension, change, testing, review, deployment, operations, and coordination, including the largest source of resistance and one improvement or follow-up decision;
- short reflection distinguishing observation from a possible explanation.

Do not submit an uncurated raw agent transcript as the main evidence.
Preserve enough task, prompt, trace, and review information to explain consequential decisions and failures.

---

## 10. Bounded Cross-Team Audit

After each phase, another group will inspect the implementation for a limited period using only the repository and submitted instructions.
Use the same audit tool policy in every phase and, where scheduling allows, the same auditing group.
Record unavoidable changes in auditors or tools as comparison limitations.

The auditing group will:

1. attempt the documented setup;
2. run the documented validation command;
3. check a sample of the common acceptance scenarios;
4. locate where one important domain behavior is implemented;
5. identify one hidden assumption, inconsistency, or comprehension problem;
6. attempt the small [change probe](/concepts/#change-probe) supplied for that phase;
7. return a concise friction report.

### 10.1 Change-probe protocol

The change probe is this course's bounded task for [maintainability assessment](/concepts/#change-probe).
It provides evidence about understanding, modifying, and validating one change under recorded conditions; it does not establish a complete maintainability score.

The instructor releases one phase-specific probe only after the implementation has been submitted.
The probes use different product language but exercise an equivalent vertical slice and acceptance burden.
Their exact change shape is withheld until release.

The change-probe portion of the audit lasts thirty minutes.
Begin timing after the auditor receives the prompt and has a runnable checkout, so setup friction and change friction remain separate observations.
During the time box:

- use only the submitted repository, its instructions, and the common audit tool policy;
- do not ask the authors where the change belongs;
- work in a disposable branch or copy rather than modifying the submitted implementation;
- run relevant existing checks before adding a focused automated test when time permits;
- stop when the time expires, even if the change remains incomplete.

If the submitted setup cannot be made runnable during the audit, record the probe as **not attempted because setup blocked it**.
An estimate may be included as commentary, but it does not count as completed change evidence.

### 10.2 Friction report

Return any patch or diff together with a report containing:

- setup outcome and setup time, reported separately from the probe;
- time required to identify the likely user-interface, application, domain, persistence, and test locations;
- probe outcome: complete, partial, blocked, or not attempted;
- acceptance checks completed and still missing;
- files or boundaries changed and any duplicated change that appeared necessary;
- commands run and their results, including existing regressions;
- assumptions, documentation gaps, and remaining uncertainty;
- the first point at which progress became slow or blocked.

The audit is not a full code review and does not transfer ownership.
Auditors are not expected to become experts in the chosen stack.
Difficulty caused by an unfamiliar technology is useful evidence, but the report should distinguish ordinary learning from missing documentation or accidental complexity.

The authors may correct factual misunderstandings in the report, but they should not erase evidence that the system was difficult to understand.

---

## 11. Optional Extensions

Complete the common requirements before adding extensions.
Suitable extensions include:

- authentication and roles;
- work-item assignment;
- comments or additional event types;
- search, pagination, or richer filters;
- import and export;
- real-time updates;
- offline behavior;
- an API for external event producers;
- accessibility improvements;
- localization;
- richer observability;
- import and visualization of an agent-workflow trace;
- explicit idempotency support;
- retention, archival, or deletion policies;
- performance or resource-efficiency improvements.

Optional scope must be reported separately so that a larger feature set is not mistaken for a better result.

---

## 12. Common Evaluation Principles

Every phase is evaluated using these principles:

- required behavior works;
- the stack and architecture are understood and justified;
- setup, testing, and operation are reproducible;
- scalability claims are tied to evidence and explicit trade-offs;
- AI-generated work is reviewed rather than accepted by default;
- reporting is honest about failures, intervention, and uncertainty;
- optional output volume does not substitute for the common core;
- another group can inspect the project without relying on private explanations.

The phase specifications describe the emphasis and deliverables for each build.

---

## Instructor Notes

- Keep the behavioral contract stable during the three phases.
  Clarifications and defect corrections are appropriate; feature expansion weakens the comparison.
- Preserve genuine interpretive room.
  Clarify a requirement when groups cannot tell what observable capability is required, but avoid resolving design choices merely because implementations differ.
- Publish any course-provided acceptance checks and measurement workload in a stack-neutral form.
  Prefer observable behavior over framework-specific APIs or file layouts.
- Decide whether every group receives the same local model endpoint or whether local hardware is part of the exercise.
  If hardware varies, require it to be reported and avoid ranking groups by raw latency.
- Keep the exact prompts in the instructor-only probe sheet out of published student materials.
  Release only the current phase's prompt after submission and preserve the common time box and reporting rubric.
- Review proposed exotic stacks early for feasibility, licensing, security, and available deployment paths without steering everyone toward the same technologies.
- Treat setup difficulty as evidence, not automatic failure.
  The group should lose credit when its supported path is incomplete or irreproducible, not merely because the auditor has never used the language.
- Use the published [course assessment rubric](grading.md); announce any course-run revision before students begin the affected phase.
