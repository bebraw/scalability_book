# How does web architecture shape scalability?

This chapter should connect the course project to the web as an architectural environment.
Students often experience web development as a collection of frameworks, libraries, and deployment platforms, but scalable web applications are shaped by older and deeper constraints: clients and servers, requests and responses, networks, latency, caches, URLs, protocols, browsers, APIs, and failure.

The central claim could be: web architecture is not neutral plumbing.
It gives us constraints and affordances, and scalable systems are built by working with those constraints rather than pretending they do not exist.

## Chapter purpose

- Explain the web as a distributed system.
- Show how browser, server, network, and database boundaries shape application design.
- Introduce API contracts as long-lived interfaces between independently changing parts.
- Connect web architecture to the event tracking project without requiring one fixed application theme.
- Use the completed implementation A systems as concrete architecture cases.
- Prepare students to make and explain architectural choices in implementation B.

## Why web architecture matters

Ideas to develop:

- A local app can hide many problems because everything is close together.
  A web app cannot.
- Every request crosses a boundary: process, machine, network, organization, or trust.
- Latency, retries, partial failure, caching, and authentication are architectural facts.
- Frontend and backend code change at different speeds and often have different owners.
- APIs become commitments.
  Once clients depend on them, changing them becomes expensive.

Possible event tracking example:

- Recording an event looks simple in the UI, but it crosses the browser, network, authentication layer, API handler, validation logic, storage layer, and possibly analytics.
- Each boundary can fail or interpret data differently.
- A scalable design makes these boundaries explicit.

### Architecture is maintained, not declared

A system does not avoid architectural decay merely because it began with a diagram or a recognizable framework.
:citet[foote1997mud] identify throwaway code, piecemeal growth, and pressure to keep the system working as forces that gradually produce a Big Ball of Mud.
Even a deliberate initial design can erode as requirements change and expedient repairs accumulate.

Conscious architecture therefore does not mean designing the entire system in advance.
It means repeatedly deciding which boundaries must remain visible, which shortcuts are temporary, and when working code needs to be reorganized before further growth makes change unsafe.
Refactoring, tests, module contracts, and decision records are mechanisms for maintaining architectural intent while the system evolves.

Christopher Alexander's pattern language offers a middle path between a complete upfront blueprint and unregulated growth.
A shared set of patterns allows people to make local, piecemeal changes while preserving relationships that contribute to the coherence of the whole :citep[alexander1977pattern].
In an agentic project, the harness can serve a similar role.
Architecture notes, specifications, examples, tests, and decision records give humans and agents a project-specific language for making changes without rediscovering—or accidentally redefining—the system on every task.

This distinction also clarifies cathedral and bazaar metaphor by :citet[raymond2001cathedral].
The cathedral and bazaar describe how development and feedback are organized; a Big Ball of Mud describes the structure that results.
Iterative, distributed development does not imply architectural disorder, just as centralized planning does not guarantee coherence.
A bazaar can sustain strong architecture when contributions pass through stable boundaries, review, and continuous integration.
Either development model can produce mud when local changes accumulate without structural stewardship.

## The basic shape of a web application

Outline:

1. Client
   - Browser, mobile client, admin dashboard, or integration.
   - Responsible for interaction, local state, and user feedback.
2. Server
   - Receives requests, validates intent, applies business rules, and coordinates storage.
3. Data store
   - Persists state, events, users, domain entities, and derived views.
4. External services
   - Authentication, email, analytics, payments, object storage, queues, or monitoring.
5. Operations layer
   - Deployment, configuration, logs, metrics, alerts, and incident response.

Development idea: use the same event recording action and trace it through each layer.

### Request boundary lab

The demonstration below traces one `POST /events` request through the browser, network, API, storage, and response path.
The goal is to make boundaries visible: each one has an owner, a failure mode, and a contract that future clients, humans, and agents may depend on.

{{ import "site/includes/request-trace-demo.html" }}

Use this before drawing the architecture diagram.
If the request path is unclear, the diagram is likely to hide the most important architectural decisions.

## Constraints of the web

Potential subsections:

- **Latency**: why physical distance and network hops matter.
- **Partial failure**: why the client, server, database, and third-party services can disagree.
- **Concurrency**: why two users can act at the same time and produce unexpected states.
- **Caching**: why caches improve performance but complicate freshness and invalidation.
- **Security boundaries**: why every client input must be treated as untrusted.
- **Compatibility**: why deployed clients and existing API consumers cannot be updated instantly.

> **Sustainability angle**
>
> Architecture determines resource flow.
> Chatty APIs, unnecessary round trips, oversized payloads, heavy client bundles, and aggressive polling all turn design choices into recurring resource use.
> Good web architecture reduces waste by making useful work explicit and avoiding repeated work where possible.

### Stateless requests still depend on state

Statelessness describes what a service needs to process one request, not whether the application remembers anything.
The final `2026-07-28` revision of the Model Context Protocol (MCP) removes the initialization handshake and the Streamable HTTP `Mcp-Session-Id` header.
Servers must not infer protocol context from earlier requests on the same connection; the core carries no protocol session across calls :citep[modelcontextprotocol2026spec].
This is a versioned protocol example, not a requirement that the course project expose MCP or that older MCP traffic use the same design.

| Continuity design           | What a later request carries             | Deployment obligation                                                                                     |
| --------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Hidden protocol session     | A session identifier                     | Route to the instance that owns it, or share the protocol-session state                                   |
| Explicit application handle | A resource handle such as `workspace_id` | Authorize the operation and resolve the referenced state from every eligible instance, or retain affinity |

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

### Transactions preserve invariants across failure and concurrency

A database transaction groups operations into one unit with four commonly named properties: atomicity, consistency, isolation, and durability, or ACID :citep[haerder1983recovery].
**Atomicity** means the operations commit together or not at all.
**Consistency** means a committed transaction leaves the data within its declared invariants; the database cannot invent those application rules, so they still have to be expressed through constraints, guarded writes, or validated domain logic.
**Isolation** describes how concurrent transactions are allowed to observe and affect one another.
The exact guarantee depends on the selected isolation level rather than on the mere presence of a transaction.
**Durability** means a successful commit survives the failures covered by the storage system's contract.

The work-item lifecycle contains a useful transaction boundary.
A successful transition changes the current state and records the corresponding activity event.
If either write escapes alone, the activity feed and the work item disagree.
The same invariant is threatened when two requests make a decision from the same old state or when the application returns success before persistence is durable.

#### ACID transaction lab

Choose one disturbance, predict where the invariant could leak, and run it first with application-managed writes.
Then introduce a database transaction and, for concurrent requests, compare read committed with serializable execution.

{{ import "site/includes/acid-transaction-lab.html" }}

The simulation does not imply that every database implements an isolation level or durable commit in the same way.
For an implementation-specific claim, identify the real transaction boundary, constraints, isolation setting, acknowledgment point, and documented failure model, then test them against the deployed storage path.

### Cache control is application policy

An HTTP cache can avoid an origin request, reduce transferred bytes, and hide network latency, but only when reuse is correct for the response and its users.
Browsers operate private caches, while content delivery networks and other intermediaries can operate shared caches.
The response therefore needs to communicate who may store it, how long it remains fresh, how it can be validated, and whether stale reuse is acceptable.

The [HTTP caching specification](https://httpwg.org/specs/rfc9111.html) defines the core directives and freshness model:

- `public` permits storage by shared caches, while `private` limits a response to private caches.
- `max-age` defines freshness relative to response generation; `s-maxage` can define a different freshness lifetime for shared caches.
- `no-cache` still permits storage, but the stored response has to be validated before reuse.
- `no-store` asks caches not to store the response at all.
- `must-revalidate` prevents reuse of a stale response without successful validation.
- `Vary` makes selected request headers part of response selection.
  This can protect correctness, but every varying dimension can fragment the cache.

Validators avoid retransmitting an unchanged body.
An origin can attach an `ETag`; once the stored response needs validation, a cache sends that value through `If-None-Match`.
A matching validator allows the origin to return `304 Not Modified` without the representation body, while a changed validator produces a new `200` response.

The [`stale-while-revalidate`](https://httpwg.org/specs/rfc5861.html) extension moves latency again: a cache may immediately serve a stale response for a bounded period while validating it in the background.
That can be appropriate for a public activity summary, but not for every response.
Personalization, authorization, invalidation, and the cache key are correctness and security decisions rather than deployment details.

### Cache decision lab

The lab below follows a second request through browser cache, shared cache, and origin.
Change the response profile, move time forward, and decide whether the origin representation changed.
Then inspect whether the request is served fresh, served stale while validation happens, conditionally revalidated, or fetched in full.

{{ import "site/includes/cache-control-lab.html" }}

Cache behavior should be tested at the deployed boundary because application code is only one participant.
A framework, reverse proxy, CDN, browser, or hosting platform may add, remove, or reinterpret cache metadata.
Record the final response headers, cache status, `Age`, and origin traffic rather than assuming the source-code declaration is the complete policy.

## Rendering and interaction are separate decisions

Architecture labels often collapse several decisions into one framework-shaped category.
That makes comparisons harder than they need to be.
Server-side rendering (SSR), incremental static regeneration (ISR), and client-side rendering (CSR) primarily describe **where and when the view is produced and refreshed**.
Multi-page applications (MPAs), hypermedia-driven applications (HDAs), and single-page applications (SPAs) primarily describe **how the browser reaches later application states**.

CSR is common in single-page applications because the browser can fetch data, render views, and handle later navigation without replacing the document.
The terms are not synonyms: CSR is a rendering strategy, while SPA describes a broader navigation and state-management shape.

These choices can be combined.
An HDA can receive its initial document through SSR, while an MPA can serve pages from an incrementally regenerated cache.
The useful comparison is therefore not “which acronym wins?” but what each decision does to freshness, server work, navigation, client responsibility, caching, and failure.

### Web architecture lens

Use the same event-recording interaction across nine combinations.
First choose how the initial document is produced, then choose how the application presents the state after `POST /events`.
Run the trace and watch which artifact crosses the network.

{{ import "site/includes/web-architecture-lens.html" }}

The ISR behavior in the lab is a simplified stale-while-revalidate model.
Exact regeneration, invalidation, and consistency behavior depends on the framework and deployment platform.
That platform-specific contract should be documented as part of the architecture.

## Activation is another architectural decision

Rendering and navigation do not explain how delivered HTML becomes interactive.
A server-rendered page may already contain useful content while the browser still has to recover or load the behavior behind its controls.
That activation work is another architectural decision with consequences for payload size, client processing, first-interaction latency, and application structure.

Four approaches make the trade-off visible:

| Approach              | Activation unit                         | Main benefit                                           | Main constraint                                                  |
| --------------------- | --------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| Hydration             | The rendered component tree             | Familiar, general application model                    | Re-executes client code to recover state and listeners           |
| Progressive hydration | Ordered portions of the same tree       | Prioritizes important interaction                      | The application is still eventually hydrated                     |
| Islands architecture  | Explicit interactive regions            | Static HTML elsewhere; work can be deferred or avoided | Shared state, navigation, and communication across islands       |
| Resumability          | Serialized state and handler boundaries | Continues without replaying the application            | Serializable state and framework compiler or runtime constraints |

Islands architecture and resumability are not competing names for a complete application architecture.
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

The useful question is not which technique is universally fastest.
Ask which code and state must cross the boundary, which work happens before the user asks for it, which latency moves to the first interaction, and what new constraints the chosen technique introduces.
Resumability can avoid replay but requires serializable state and more specialized tooling.
Islands can reduce initial JavaScript but become less attractive when every region needs shared client state.

For the event tracking project, annotate the architecture diagram with interactive regions.
For each region, record whether it is static, eagerly activated, activated when visible, or activated on interaction; identify its state owner and how it communicates with the rest of the page.
The architecture hypothesis for implementation B should name one activation decision worth preserving or changing and the evidence that would validate it.

## Runtime UI generation changes the control boundary

The earlier sections ask where a view is produced and how it becomes interactive.
A separate question is how much of its structure and behavior model output may choose at runtime.
A component written by a coding agent during development is not runtime-generative UI in this sense: once reviewed and committed, it is ordinary application code at runtime.
The boundary expands as runtime output moves from filling a host-selected component to selecting component composition or executable behavior.

:citet[casas2026beyondcomponents] describes a practical spectrum from fixed components, through declarative descriptions rendered from an approved catalog, to generated executable code.
Treat this as a design lens rather than a settled taxonomy:

| Runtime model output                                     | Application must control                                           | Main trade-off                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Data for one approved component                          | Component implementation, behavior, and prop schema                | Predictable behavior with little freedom over layout                           |
| Declarative descriptor using approved components/actions | Schema, renderer, design system, and action registry               | Composition within a grammar, with validation and schema-evolution burden      |
| Generated HTML, CSS, and JavaScript                      | Isolated execution boundary, mediated data/tool bridge, and limits | Broadest expressiveness with the largest failure, review, and containment load |

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

### Descriptor boundary audit

Create one small event-summary data fixture and keep it unchanged.
First define the prop schema and payload for one fixed summary component.
Then define minimal prop schemas for an approved registry such as `metric`, `eventList`, and `button`, plus a small action allowlist, and express the same fixture as a declarative descriptor.
Define where and how the system rejects an unknown component, raw HTML or script, an unregistered action, a control without an accessible name, and excessive nesting.
For each rejection, state the enforcing layer, error, and test, and use the fixed read-only summary as the fallback.
Finally, identify the additional containment and evidence that would be required before the application could execute model-generated code.

The descriptor schema and action vocabulary are API contracts.
The next section examines what follows once such contracts cross client and server boundaries.

## API design as architecture

APIs are not merely endpoint collections.
They distribute knowledge between clients and servers: which addresses exist, which operations are allowed, how data is selected, how errors are represented, and how either side can change without forcing the other to change at the same time.
Versioning, idempotency, validation, pagination, filtering, and error shape all become parts of that contract.

### API interaction styles

Several styles can expose the same domain behavior while placing coupling in different locations:

- **Resource-oriented HTTP** exposes identifiable resources through a uniform set of HTTP methods and status semantics.
  Many APIs described as REST use this recognizable subset, but REST itself is a broader architectural style derived for distributed hypermedia systems :citep[fielding2000architectural].
- **Hypermedia-driven REST** includes links or controls in representations so the response tells a client which transitions are currently available.
  HATEOAS—hypermedia as the engine of application state—is therefore a REST constraint, not a separate peer to REST.
- **GraphQL** exposes a typed schema and lets a client describe the response shape it needs through queries and mutations.
  This can reduce endpoint-specific fetching logic, while moving pressure to schema governance, authorization, resolver behavior, and query-cost control.
  The [GraphQL specification](https://spec.graphql.org/September2025/) defines the language, type system, validation, and execution model.
- **RPC** exposes named operations with explicit request and response messages.
  It maps naturally to commands and service capabilities, while coupling clients to method names and message contracts.
  Systems such as [gRPC](https://grpc.io/docs/what-is-grpc/core-concepts/) can generate clients from a service definition and support unary and streaming methods.

These styles are not mutually exclusive at the transport level.
GraphQL and JSON-based RPC commonly travel over HTTP, and a resource-oriented API may expose a few operation-like endpoints.
The architectural question is where clients learn what they can do and which part of the contract absorbs change.

Event streams, queues, webhooks, and publish-subscribe APIs add a different decision: communication can become asynchronous.
That can reduce temporal coupling, but delivery guarantees, ordering, replay, idempotency, and schema evolution then become explicit parts of the contract.

### API contract lens

The lab below holds one user intent constant: start work on item 42 and obtain its current state, title, workspace, and available next actions.
Switch the interaction style to see what crosses the wire, what the client must know in advance, and where a request for one more related field creates pressure.

{{ import "site/includes/api-contract-lens.html" }}

No style wins every row.
A stable public resource model, a workflow discovered through hypermedia, a frontend assembling related data, and an internal service command create different reasons to accept different forms of coupling.
The comparison should begin with consumers, change patterns, network conditions, tooling, and ownership—not with a preferred acronym.

For the project, design a minimal event-creation operation and event-query operation in one style.
Then identify what changes when clients retry, devices go offline, a new workflow state appears, many tenants share the system, or the UI needs an additional related field.

### Executable HTTP contracts

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

## Learning from the implementation A architectures

Students have already made architecture choices in implementation A, even if they did not yet have a complete vocabulary for them.
The public project discussion should make those choices visible: different groups received the same behavioral specification but chose different stacks, boundaries, storage models, and request paths.

Architecture should not live only in diagrams or in the memory of the original authors.
In an AI-assisted project, architectural intent also has to be written in places that future contributors and agents will actually read.
Otherwise, the next generated change can accidentally redefine the system by changing behavior without changing the explanation.

Each implementation should therefore treat a small set of project memory files as architectural artifacts:

- `ARCHITECTURE.md` records global rules and cross-cutting constraints, such as the chosen application shape, storage model, validation boundaries, deployment assumptions, and rules future changes should preserve.
- `specs/{feature}/spec.md` records feature-level contracts, workflows, regression guardrails, and verification steps.
  For the event tracking project, the first spec should usually describe how an event is created, validated, stored, and viewed.
- `docs/adrs/` or a simple decision log records durable decisions and trade-offs.
  Students do not need an ADR for every small change, but they should record decisions that future groups would otherwise have to rediscover.
- `AGENTS.md` records how AI tools should operate in the repository.
  It can name required commands, review expectations, files that must not be overwritten, and when the agent should ask before changing the project shape.

This documentation is not separate from architecture.
It is part of how the architecture remains understandable after the first implementation is done.
If the code, diagram, spec, and decision log disagree, the project has an architectural problem even if the application still runs.

### Make capability ownership reviewable

A component diagram can show that two boxes exist without explaining which one owns a decision.
As a project grows, each independently evolvable capability should therefore have a short ownership card in its feature specification:

- **Source root:** where the capability's implementation primarily lives.
- **Composition root:** where its parts are assembled and dependencies are supplied.
- **State authority:** which component or store decides the current truth.
- **Public contracts:** the interfaces other capabilities may rely on.
- **Dependency direction:** which side is allowed to know about the other.
- **Out of scope:** adjacent responsibilities that intentionally belong elsewhere.

The card is a review aid rather than a demand for one directory per feature.
Small projects may keep several capabilities in a few files while their responsibilities remain clear.
Likewise, file size, fan-in, churn concentration, or a crowded directory can act as structural smoke alarms, but none proves that a split is correct.
When such a signal fires, inspect whether several authorities or change reasons have accumulated together.
Consolidate ownership, split responsibilities, or document a justified exception; do not divide a file merely to satisfy a number.

Prompts:

- What are the main components of your system?
- Where does validation happen?
- Where is event data stored?
- What does the frontend assume about the backend?
- Which behavior is fixed by the common specification, and which boundary was an implementation choice?
- Which part of the design would be hardest to change later?
- Which architectural decisions have been written down so another group can understand them?
- Which agent instructions protect the architecture from accidental drift?
- Can you name the source root, composition root, state authority, public contracts, and dependency direction of the event workflow?

## Project artifact

Students should review the architecture and data-flow diagrams submitted with implementation A, identify one consequential architectural choice, and write an architecture hypothesis for implementation B.
The hypothesis should state what the group intends to preserve or change and why.
Students should also complete an ownership card for the event workflow and identify one structural signal that would cause them to review that ownership again.
Implementation B should still include its own diagrams and decision record, but the chapter is primarily reading and analysis rather than a second large deliverable.
