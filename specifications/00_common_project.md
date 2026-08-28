# Common Project Specification

## Work Activity Tracker

This specification defines the application that your group will implement three times during the course.
The required behavior remains substantially the same.
The development setup changes:

1. **Establish:** locally hosted model and a single-agent workflow.
2. **Challenge:** foundation model and a single-agent workflow.
3. **Compare:** an agent fleet using a declared base model.

Each phase produces a separate implementation.
The purpose is not to find one universally best model, framework, or architecture.
The purpose is to compare how different development systems approach the same bounded web application and to reason about the scalability of both the application and the development process.

The phase specifications define additional constraints and deliverables.
This common specification applies to all three phases.

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

Each implementation must provide:

- a `README.md` that explains the application, prerequisites, setup, running, testing, and the chosen stack;
- one supported path from a clean checkout to a running application;
- pinned or otherwise reproducible dependency and runtime versions;
- an example configuration file when configuration is required;
- no committed secrets;
- a repeatable way to create enough demonstration data for the acceptance scenarios;
- at least one automated validation command;
- tests covering the work-item lifecycle and its event recording;
- project instructions for the AI development workflow;
- an architecture or data-flow diagram;
- a short decision record explaining the stack choice.

Setup may use native tools, containers, a development environment definition, or another documented mechanism.
Do not require an auditor to infer missing steps from knowledge held only by your team.

The README must distinguish mandatory prerequisites from optional development conveniences.
If the stack requires unusual system dependencies or hardware, document them near the beginning.

---

## 7. Scalability Analysis Shared by All Phases

You do not have to build a production-scale distributed system.
You must be able to reason about what your implementation would do under pressure.

Apply these shared scenarios to every implementation:

- many independent workspaces;
- concurrent users changing different and identical work items;
- high and bursty event volume;
- storage growth over time;
- slow or temporarily unavailable dependencies;
- retries that may repeat a request;
- demand for recent activity and historical summaries;
- a need to retain, aggregate, archive, or delete old events.

For each implementation, identify:

- what is likely to fail or slow down first;
- the resource, quota, dependency, or operational limit being approached;
- the first useful signal that would reveal the problem;
- one plausible response;
- at least one prepared recovery action available if the limit is reached;
- the new cost or failure mode introduced by that response.

The goal is justified reasoning, not adding distributed infrastructure without evidence.

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
- model artifact and serving configuration relevant to the result: name, resolved revision or digest when exposed, quantization where applicable, runtime version, allocated context where exposed, and actual inference route for reported evaluation attempts when observable; otherwise record the declared route and limitation;
- agent tool and relevant configuration, including the source, resolved revision or content digest, and update policy of any imported skill, plugin, or instruction bundle that materially affected the workflow; when neither a revision nor a digest is exposed, record the retrieval date and observed update behavior;
- orchestration configuration, if any;
- local hardware or hosted-environment details relevant to the result, including memory limits and accelerator residency or CPU/GPU offload where exposed, together with paths by which project data may leave that environment and any fallback policy.

### 9.2 Effort and execution

- elapsed project time;
- estimated active human time;
- approximate model usage, cost, or locally measurable resource use;
- failed or abandoned attempts worth noting;
- important human interventions and corrections.

Exact accounting is not expected when a tool does not expose it.
State what could and could not be measured.

### 9.3 Product evidence

- acceptance-scenario results;
- automated test results;
- one runtime measurement based on repeated runs of the shared course workload, plus at least one declared resource-efficiency signal;
- known defects or incomplete requirements;
- deployment URL, local run evidence, or another agreed operational artifact.

Use the same resource-efficiency signal and procedure across phases where practical.
If direct energy measurement is unavailable, report an observable resource proxy and do not relabel it as energy or carbon.

Every implementation must have a reproducible operational path.
The Compare phase adds one realistic deployment outside the author's development process; its specification defines that final requirement.

### 9.4 Engineering explanation

- architecture and data-flow diagram;
- stack decision record;
- scalability pressure map;
- largest source of setup, comprehension, change, testing, review, and operational friction;
- short reflection distinguishing observation from a possible explanation.

Do not submit an uncurated raw agent transcript as the main evidence.
Preserve enough task, prompt, trace, and review information to explain consequential decisions and failures.

---

## 10. Bounded Cross-Team Audit

After each phase, another group will inspect the implementation for a limited period using only the repository and submitted instructions.

The auditing group will:

1. attempt the documented setup;
2. run the documented validation command;
3. check a sample of the common acceptance scenarios;
4. locate where one important domain behavior is implemented;
5. identify one hidden assumption, inconsistency, or comprehension problem;
6. attempt or estimate a small change probe supplied for that phase;
7. return a concise friction report.

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
- Provide equivalent, bounded change probes for the three audits.
  Do not reveal all probes at the start if prior knowledge would make later audits meaningless.
- Review proposed exotic stacks early for feasibility, licensing, security, and available deployment paths without steering everyone toward the same technologies.
- Treat setup difficulty as evidence, not automatic failure.
  The group should lose credit when its supported path is incomplete or irreproducible, not merely because the auditor has never used the language.
- The exact rubric weights and shared runtime workload still need to be defined.
