# Advanced control boundaries in web applications

Use this appendix when a design depends on state continuity across requests, transactional invariants, client activation, runtime-generated interfaces, or a detailed application contract.
The [Architecture chapter](/chapters/architecture/) keeps the decisions that every project must recognize; the sections below develop implementation choices and audits that are useful only when those boundaries are present.

## Stateless requests still depend on state

Statelessness describes what a service needs to process one request, not whether the application remembers anything.
The final `2026-07-28` revision of the Model Context Protocol (MCP) removes the initialization handshake and the Streamable HTTP `Mcp-Session-Id` header.
Servers must not infer protocol context from earlier requests on the same connection; the core carries no protocol session across calls :citep[modelcontextprotocol2026spec].
This is a versioned protocol example, not a requirement that the course project expose MCP or that older MCP traffic use the same design.

:ref[table:continuity-designs]{text="The table below"} compares what a client carries forward and what the deployment must still provide.

| Continuity design           | What a later request carries             | Deployment obligation                                                                                     |
| --------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Hidden protocol session     | A session identifier                     | Route to the instance that owns it, or share the protocol-session state                                   |
| Explicit application handle | A resource handle such as `workspace_id` | Authorize the operation and resolve the referenced state from every eligible instance, or retain affinity |

::caption[Continuity designs and the deployment obligations they retain.]
::label[table:continuity-designs]

An explicit handle moves continuity rather than deleting it.
An application may select state from the authenticated principal and ordinary request parameters; when workflow state cannot be derived from them, a service can mint a handle and require later calls to return it.
The service still has to store or reconstruct the referenced state and define its owner, lifecycle, concurrency rules, expiry, and cleanup.
A handle is an address, not authorization: authenticate the caller, then authorize that principal to perform the requested operation on the referenced tenant or workspace on every request.
If the state remains available only on the instance that minted the handle, affinity has merely moved behind a new identifier.

Retries add another state boundary.
If a mutation commits but its response is lost, a retry may reach a different instance and apply the mutation again.
Do not assume that a protocol request identifier makes a domain operation idempotent.
Use an application-level command identifier or idempotency key, bind it to the caller, handle, operation, and relevant arguments, and store the mutation and reusable result atomically in the authoritative application state.

**State placement audit.** Assume two interchangeable server instances, `A` and `B`, share one application store.
Alice's validated token identifies principal `alice` in tenant `T1` with `events:write`; creating a workspace grants her access to it.
Bob's token identifies principal `bob` in the same tenant with the same scope, but he has no access to Alice's workspace.
The server derives these identities from the validated tokens, not from client metadata or a resource handle.

1. Alice calls `create_workspace` and receives `W1`.
2. Alice calls `record_event(W1, work_item_id=I42, command_id=C7, type=work_started)`; instance `A` commits the event, but the response stream breaks.
3. The client retries on instance `B` with a new protocol request identifier and the same `C7`.
4. Bob calls `record_event(W1, work_item_id=I42, command_id=C8, ...)`.
5. The workspace is now `archived`, and the stated lifecycle makes archived workspaces read-only; Alice calls `record_event` again.

For each request, record the authenticated principal and scope, authoritative state before the request, decision to apply, return, or reject, and the invariant or evidence supporting that decision.
Design the flow so `C7` produces one event and its retry returns the original result, Bob cannot act merely by knowing `W1`, and the archived write returns a defined application error such as `workspace_archived` rather than silently recreating state.
Finish by naming which information is carried by the client and which state remains authoritative on the server.

## Preserve durable invariants with transactions

A database transaction groups operations into one unit with four commonly named properties: atomicity, consistency, isolation, and durability, or ACID :citep[haerder1983recovery].
**Atomicity** means the operations commit together or not at all.
**Consistency** means a committed transaction leaves the data within its declared invariants; the database cannot invent those application rules, so they still have to be expressed through constraints, guarded writes, or validated domain logic.
**Isolation** describes how concurrent transactions are allowed to observe and affect one another.
The exact guarantee depends on the selected isolation level rather than on the mere presence of a transaction.
**Durability** means a successful commit survives the failures covered by the storage system's contract.

The work-item lifecycle contains a useful transaction boundary.
A successful transition changes the current state and records the corresponding activity event.
If either write escapes alone, the activity feed and work item disagree.
The same invariant is threatened when two requests make a decision from the same old state or when the application returns success before persistence is durable.

### ACID transaction lab

Choose one disturbance, predict where the invariant could leak, and run it first with application-managed writes.
Then introduce a database transaction and, for concurrent requests, compare read committed with serializable execution.

{{ import "site/includes/acid-transaction-lab.html" }}

The simulation does not imply that every database implements an isolation level or durable commit in the same way.
For an implementation-specific claim, identify the real transaction boundary, constraints, isolation setting, acknowledgment point, and documented failure model, then test them against the deployed storage path.

## Model valid data combinations

A transaction constrains how a valid state change becomes durable.
Constructive data modeling asks which combinations ordinary code should be able to construct before that boundary is reached.
In _The Unreasonable Effectiveness of Constructive Data Modeling_, Alexis King describes defining the supported "positive space" with ordinary records and tagged variants, then using exhaustive case analysis where the language supports it :citep[king2026constructive].
King's earlier _Parse, Don't Validate_ frames a boundary check as a transformation that returns a more precise representation carrying what it learned rather than only reporting success :citep[king2019parse].
These are design arguments rather than comparative evidence, and the goal is not maximum type precision.

For the result of a state-transition decision, a loose record does not require the payload that each outcome needs:

```ts
type TransitionDecision = {
  accepted: boolean;
  next?: WorkItem;
  current?: WorkItem;
  event?: ActivityEvent;
  reason?: TransitionError;
};
```

It permits `accepted: true` without a next item or event, and `accepted: false` without a current item or reason.
Model the required payload for each branch instead:

```ts
type TransitionDecision =
  | { kind: "accepted"; next: WorkItem; event: ActivityEvent }
  | { kind: "rejected"; current: WorkItem; reason: TransitionError };
```

The discriminator makes each branch's required payload explicit, and narrowed type-checked code cannot treat a rejected decision as if it exposed a transition event.
It does not prove that the event matches the correct transition unless the inner types or constructor also enforce that relationship.
The value is an in-memory decision, not a durable fact.
Untrusted, untyped, or deserialized input crossing a boundary still needs runtime parsing.
Before committing a decision, the request path must authenticate and authorize the caller; the persistence operation must conditionally match the authoritative state or version, then atomically update the item and append the event.
Malformed deserialization, mutation, or unsafe casts can bypass the representation, while concurrency and retries can violate surrounding invariants even when each individual value is valid.

**Selected-invariant check.**
In the existing `specs/{feature}/spec.md`, show one broad record or result and one contradictory value it permits.
Replace it with a stack-native tagged union, sealed hierarchy, or guarded constructor.
Where the stack supports checked variants, add a compile-fail type fixture; add a runtime test for any parser or guarded constructor at a data boundary, and reuse an existing supported-behavior test.
Record one important invariant that remains enforced elsewhere, such as authorization or atomic concurrent transition.

## Activate delivered interfaces

Rendering and navigation do not explain how delivered HTML becomes interactive.
A server-rendered page may contain useful content while the browser still has to recover or load the behavior behind its controls.
That activation work affects payload size, client processing, first-interaction latency, and application structure.

| Approach              | Activation unit                         | Main benefit                                           | Main constraint                                                  |
| --------------------- | --------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| Hydration             | The rendered component tree             | Familiar, general application model                    | Re-executes client code to recover state and listeners           |
| Progressive hydration | Ordered portions of the same tree       | Prioritizes important interaction                      | The application is still eventually hydrated                     |
| Islands architecture  | Explicit interactive regions            | Static HTML elsewhere; work can be deferred or avoided | Shared state, navigation, and communication across islands       |
| Resumability          | Serialized state and handler boundaries | Continues without replaying the application            | Serializable state and framework compiler or runtime constraints |

::caption[Client activation approaches and their principal trade-offs.]
::label[table:client-activation-approaches]

Islands partition a page into static and interactive regions and attach a loading strategy to each interactive region.
Resumability changes how execution crosses the server-client boundary: component boundaries, application state, and listener references are serialized into the delivered HTML so the browser can continue without replaying the application :citep[vepsalainen2024resumability].
A resumable framework can therefore create fine-grained islands automatically.

The strongest fit for explicit islands is an application with meaningful static regions and a smaller amount of separable interactivity.
Research on edge-powered islands found that work could be deferred or avoided, but also concluded that the benefit becomes harder to obtain as an application grows more dynamic and difficult to divide into independent portions :citep[vepsalainen2025islands].
Inter-island state, navigation, and communication then become architectural costs rather than incidental implementation details.

### Client activation lens

The lab below holds the server-rendered event page constant and changes only how its behavior becomes available in the browser.
Compare what happens before the first interaction, then run the same record-event action.
The transfer values are illustrative teaching values, not framework benchmarks; a real comparison should record production bundles, client execution, and interaction latency on representative devices.

{{ import "site/includes/client-activation-lens.html" }}

Ask which code and state must cross the boundary, which work happens before the user requests it, which latency moves to the first interaction, and what new constraints the chosen technique introduces.
For each interactive region in the project, record its activation strategy, state owner, and communication path.

## Runtime UI generation changes the control boundary

The earlier sections ask where a view is produced and how it becomes interactive.
A separate question is how much of its structure and behavior model output may choose at runtime.
A component written by a coding agent during development is not runtime-generative UI in this sense: once reviewed and committed, it is ordinary application code at runtime.
The boundary expands as runtime output moves from filling a host-selected component to selecting component composition or executable behavior.

:citet[casas2026beyondcomponents] describes a practical spectrum from fixed components, through declarative descriptions rendered from an approved catalog, to generated executable code.
Treat this as a design lens rather than a settled taxonomy.
:ref[table:runtime-ui-control-boundary]{text="The table below"} shows how the application's control obligation expands with the model's runtime freedom.

| Runtime model output                                     | Application must control                                           | Main trade-off                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Data for one approved component                          | Component implementation, behavior, and prop schema                | Predictable behavior with little freedom over layout                           |
| Declarative descriptor using approved components/actions | Schema, renderer, design system, and action registry               | Composition within a grammar, with validation and schema-evolution burden      |
| Generated HTML, CSS, and JavaScript                      | Isolated execution boundary, mediated data/tool bridge, and limits | Broadest expressiveness with the largest failure, review, and containment load |

::caption[Runtime model-output boundaries and the application controls they require.]
::label[table:runtime-ui-control-boundary]

This axis can be combined with server-side or client-side rendering, hydration, islands, or resumability.
It does not replace those choices.
A declarative descriptor is still untrusted input: reject unknown components and actions, validate data bindings and accessible names, bound size and nesting, and authorize an action when it is invoked.
Resolve action identifiers through trusted application code; naming an action in generated data does not grant authority to perform it.

Executable generated UI expands the boundary further.
It needs a separate-origin sandbox or equivalent isolated runtime without ambient credentials, a narrow bridge to host data and tools, explicit network, storage, navigation, and tool permissions, resource limits, observability, and a safe fallback.
Running generated code in a browser does not by itself provide that boundary.

A Google Research preprint provides bounded preference evidence for one complete generative-UI pipeline.
After excluding eight of 100 sampled LMArena prompts, the study sent each pre-cached result to two raters.
Across the pairwise comparisons, raters preferred the generated UI over the study's markdown condition in 82.8%.
Contractor-built pages were preferred over the generated pages in 50.0% of comparisons, while the generated pages were preferred in 35.3% and the remainder was neutral.
The pipeline combined Gemini with search and image tools, extensive instructions, and post-processing; generation often took one to two minutes and was excluded from the ratings.
The study therefore measures preference in that setup, not task success, correctness, accessibility, security, maintainability, or production readiness :citep[leviathan2026generativeui].

## Descriptor boundary audit

Create one small event-summary data fixture and keep it unchanged.
First define the prop schema and payload for one fixed summary component.
Then define minimal prop schemas for an approved registry such as `metric`, `eventList`, and `button`, plus a small action allowlist, and express the same fixture as a declarative descriptor.
Define where and how the system rejects an unknown component, raw HTML or script, an unregistered action, a control without an accessible name, and excessive nesting.
For each rejection, state the enforcing layer, error, and test, and use the fixed read-only summary as the fallback.
Finally, identify the additional containment and evidence that would be required before the application could execute model-generated code.

The descriptor schema and action vocabulary are API contracts.
The next section examines what follows once such contracts cross client and server boundaries.

## Choose an application interaction style

An interface distributes knowledge between consumers and providers: which addresses or operations exist, how data is represented, what errors mean, and how either side can change independently.
Several interaction styles can expose the same behavior while placing coupling in different locations.

| Style                  | What the consumer knows in advance                         | Where change pressure concentrates                         | Typical operational concern                         |
| ---------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------- |
| Resource-oriented HTTP | Resource addresses, representations, methods, and statuses | Resource and representation compatibility                  | Caching, idempotency, pagination, and versioning    |
| Hypermedia-driven REST | Entry points, media types, and stable relation semantics   | Relation semantics and completeness of advertised controls | Link validity, client interpretation, and adoption  |
| GraphQL                | A typed schema and the fields needed for each operation    | Schema governance, field evolution, and deprecation        | Authorization, resolver behavior, and query cost    |
| RPC                    | Named methods and request or response message contracts    | Method and message compatibility                           | Deadlines, retries, idempotency, and streaming flow |

::caption[Application interaction styles and where each places coupling.]
::label[table:api-interaction-styles]

Resource-oriented HTTP uses the uniform method and status semantics of HTTP.
Hypermedia-driven REST adds links or controls so representations advertise available transitions; HATEOAS is therefore a REST constraint rather than a separate peer to REST :citep[fielding2000architectural].
[GraphQL](https://spec.graphql.org/September2025/) lets a consumer select a response shape against a typed schema.
[RPC](https://grpc.io/docs/what-is-grpc/core-concepts/) exposes named operations and explicit messages.
GraphQL and RPC commonly travel over HTTP, so transport and application interaction style remain separate choices.

Event streams, queues, webhooks, and publish-subscribe interfaces add another decision: communication can become asynchronous.
That can reduce temporal coupling while making delivery guarantees, ordering, replay, idempotency, and schema evolution explicit parts of the contract.

### API contract lens

The lab below holds one user intent constant: start work on item 42 and obtain its current state, title, workspace, and available next actions.
Switch the interaction style to see what crosses the wire, what the consumer must know in advance, and where a request for one more related field creates pressure.

{{ import "site/includes/api-contract-lens.html" }}

No style wins every row.
A stable public resource model, a workflow discovered through hypermedia, a frontend assembling related data, and an internal service command provide different reasons to accept different forms of coupling.
Begin with consumers, change patterns, network conditions, tooling, and ownership rather than a preferred acronym.

For the project, design a minimal event-creation operation and event-query operation in one style.
Then identify what changes when consumers retry, devices go offline, a new workflow state appears, many tenants share the system, or the interface needs an additional related field.

## Executable HTTP contracts

An API description becomes more durable when representative requests and expected responses are executable.
[Hurl](https://hurl.dev/) expresses HTTP sessions in plain text and can assert status codes, headers, and response bodies without depending on the application's implementation language.
For example, an HTTP-based event tracker could preserve one creation-and-read scenario as follows:

```text
POST http://localhost:3000/events
Content-Type: application/json
{
  "type": "work.started",
  "workItemId": "item-42"
}

HTTP 201
[Captures]
event_id: jsonpath "$.id"

GET http://localhost:3000/events/{{event_id}}

HTTP 200
[Asserts]
jsonpath "$.type" == "work.started"
jsonpath "$.workItemId" == "item-42"
```

This file is both an example of the interface and a deterministic integration test.
It can be run locally or in continuous integration, and a failure points to the request or assertion that no longer matches the implementation.
If implementations A, B, and C expose a compatible HTTP boundary, the same scenario can be run against each one by changing the base URL rather than rewriting the test in each implementation's language.

Hurl does not replace browser testing: it checks the HTTP boundary, while a tool such as Playwright checks behavior through a browser, including rendering and interaction.
Although Hurl can repeat requests and assert response duration, a small contract scenario is not evidence that the system will behave well under representative load.
The common project specification does not require an HTTP API, so this technique is optional for implementations that expose one rather than a universal project requirement.

## Use the boundary that matches the risk

These techniques solve different problems.
Explicit handles and idempotency protect continuity across requests; transactions protect durable invariants under concurrency and failure; constructive models reduce contradictory in-memory states; activation approaches move browser work; descriptor schemas constrain runtime composition; isolation contains executable output; interaction styles distribute coupling; and HTTP examples preserve an interface contract.
Choose the smallest boundary that makes the relevant decision observable and enforceable.
