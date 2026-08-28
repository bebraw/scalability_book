# How does web architecture shape scalability?

This chapter should connect the course project to the web as an architectural environment.
Students often experience web development as a collection of frameworks, libraries, and deployment platforms, but scalable web applications are shaped by older and deeper constraints: clients and servers, requests and responses, networks, latency, caches, URLs, protocols, browsers, APIs, and failure.

The central claim could be: web architecture is not neutral plumbing.
It gives us constraints and affordances, and scalable systems are built by working with those constraints rather than pretending they do not exist.

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

Stateless request handling means that an interchangeable server does not need an earlier request's hidden in-process session to interpret the next one.
It does not mean that the application has no state.
A later request may carry an explicit workspace or workflow handle, while the service still has to authenticate the caller, authorize access, resolve authoritative state, and define that state's lifecycle.

A handle is an address, not authorization.
If its state exists only on the instance that minted it, affinity has merely moved behind a new identifier.
Likewise, a protocol request identifier does not automatically make a domain mutation safe to retry.
When a mutation can commit before its response is lost, use a stable application command or idempotency key and store the mutation and reusable result atomically at the authoritative boundary.

[Appendix C: Advanced control boundaries in web applications](/appendices/advanced-web-boundaries/#stateless-requests-still-depend-on-state) develops state placement, authorization, request continuity, and a two-instance retry audit.

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

### Model valid data combinations

A transaction constrains how a valid state change becomes durable.
Constructive data modeling reduces the contradictory combinations that ordinary code can create before that boundary.
Use a tagged union, sealed hierarchy, guarded constructor, or another stack-native representation when each outcome requires different data.

A precise in-memory representation does not establish authorization, persistence, or concurrency safety.
Untrusted or deserialized input still needs runtime parsing, and the durable write must still check authoritative state and preserve the relevant invariant atomically.

[Appendix C](/appendices/advanced-web-boundaries/#model-valid-data-combinations) contains a complete transition-result example and a selected-invariant exercise.

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

:ref[table:client-activation-approaches]{text="The table below"} makes the trade-offs among four activation approaches visible.

| Approach              | Activation unit                         | Main benefit                                           | Main constraint                                                  |
| --------------------- | --------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| Hydration             | The rendered component tree             | Familiar, general application model                    | Re-executes client code to recover state and listeners           |
| Progressive hydration | Ordered portions of the same tree       | Prioritizes important interaction                      | The application is still eventually hydrated                     |
| Islands architecture  | Explicit interactive regions            | Static HTML elsewhere; work can be deferred or avoided | Shared state, navigation, and communication across islands       |
| Resumability          | Serialized state and handler boundaries | Continues without replaying the application            | Serializable state and framework compiler or runtime constraints |

::caption[Client activation approaches and their principal trade-offs.]
::label[table:client-activation-approaches]

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

A component written by a coding agent during development becomes ordinary application code once it has been reviewed and committed.
Runtime-generative UI is different: model output can select data, composition, or executable behavior while the application is running.

The more freedom the output receives, the more the host must control.
Data for a fixed component stays inside a host-selected implementation.
A declarative descriptor needs an approved component and action registry, schema validation, authorization when actions execute, bounded structure, and a safe fallback.
Generated executable code additionally needs isolation without ambient credentials, a narrow bridge to host data and tools, explicit permissions, resource limits, and observability.

[Appendix C](/appendices/advanced-web-boundaries/#runtime-ui-generation-changes-the-control-boundary) develops the full control-boundary spectrum, evidence from one generative-UI pipeline, and a descriptor-boundary audit.

Descriptor schemas and action vocabularies are API contracts.
The next section examines what follows once contracts cross client and server boundaries.

## API design as architecture

APIs are not merely endpoint collections.
They distribute knowledge between clients and servers: which addresses exist, which operations are allowed, how data is selected, how errors are represented, and how either side can change without forcing the other to change at the same time.
Versioning, idempotency, validation, pagination, filtering, and error shape all become parts of that contract.

### API interaction styles

Several styles can expose the same domain behavior while placing coupling in different locations.
:ref[table:api-interaction-styles]{text="The table below"} summarizes where each style places advance knowledge, change pressure, and operational concern.

| Style                  | What the client knows in advance                           | Where change pressure concentrates                         | Typical operational concern                         |
| ---------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------- |
| Resource-oriented HTTP | Resource addresses, representations, methods, and statuses | Resource and representation compatibility                  | Caching, idempotency, pagination, and versioning    |
| Hypermedia-driven REST | Entry points, media types, and stable relation semantics   | Relation semantics and completeness of advertised controls | Link validity, client interpretation, and adoption  |
| GraphQL                | A typed schema and the fields needed for each operation    | Schema governance, field evolution, and deprecation        | Authorization, resolver behavior, and query cost    |
| RPC                    | Named methods and request or response message contracts    | Method and message compatibility                           | Deadlines, retries, idempotency, and streaming flow |

::caption[API interaction styles and where each places coupling and operational pressure.]
::label[table:api-interaction-styles]

The distinctions behind the summary matter:

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

Representative requests and expected responses can make an HTTP contract executable.
A language-neutral scenario can check statuses, headers, and response bodies across implementations without depending on their internal frameworks.
It remains a contract test rather than a browser journey or load test.

This technique is optional because the common project does not require an HTTP API.
[Appendix C](/appendices/advanced-web-boundaries/#executable-http-contracts) contains a complete Hurl example and explains the evidence it does and does not provide.

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

## Summary

Architecture determines where responsibilities, state, contracts, and change live in a web application.
The constraints of the web make delivery, rendering, activation, and interaction related but separate decisions, and no single application shape or API style is best for every context.
Validation, authorization, persistence, and external effects need explicit boundaries because those are the places where assumptions become correctness and recovery obligations.
Diagrams, feature specifications, decision records, agent instructions, and ownership cards keep architectural intent reviewable after the original implementation.
The goal is not to accumulate patterns, but to choose boundaries that fit the system's consumers, pressures, and expected changes.
