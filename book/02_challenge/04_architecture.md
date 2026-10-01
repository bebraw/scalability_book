# How does web architecture shape scalability?

Web architecture connects consumers, representations, computation, and authoritative data across networks.
Servers, cloud services, programmable edges, and browsers offer different places to put that work, with different latency, trust, cost, and failure consequences.
Ask which pressure justifies moving a responsibility and which contract must remain stable when it moves.

## A conceptual model: separate roles from locations

A framework-shaped label such as “serverless application” or “single-page application” combines several decisions that can be examined separately.
Begin with four architectural roles:

| Role           | Question it answers                                      | Typical examples                                                       |
| -------------- | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| Consumer       | Who or what expresses intent and observes the result?    | A person using a browser, an integration, a crawler, or an agent       |
| Representation | What crosses a boundary to make state or action visible? | HTML, JSON, an image, a stream, a form, or a hypermedia control        |
| Execution      | Where is behavior evaluated?                             | A build process, browser, physical server, cloud service, or edge node |
| [Authority](/concepts/#state-authority)      | Which component decides and preserves the current truth? | An application service, database, event log, or external system        |

::caption[Four roles that remain useful as web deployment locations change.]
::label[table:web-architecture-roles]

Roles are not machines.
One machine may perform several roles, and one role may be distributed across many machines.
An **origin server** serves the resource in an HTTP exchange, rather than forwarding the request as an intermediary; the role need not be one physical machine.
In web security and HTTP URI terminology, an **origin** is the normalized scheme, host, and port tuple, such as `https`, `example.org`, and `443` ([RFC 9110, section 4.3.1](https://www.rfc-editor.org/rfc/rfc9110.html#section-4.3.1)).
CDN discussions also use “origin” as shorthand for the upstream origin server or backend; this placement alone does not identify the authoritative data store.
Likewise, an edge function may execute application logic without becoming the authority for the data it reads.

Use the event tracker to keep the model concrete.
A `GET /events` request asks for a representation and may be answered from a browser [cache](/concepts/#cache), an edge cache, or the origin.
A `POST /events` request expresses an action whose validation may begin near the consumer, but whose accepted result must eventually reach the component that owns the event history.
The two paths can share an interface while placing execution, copies, and authority differently.

### Request boundary lab

The demonstration below traces one `POST /events` request through the browser, network, API, storage, and response path.
Each boundary has an owner, a failure mode, and a contract that future clients, humans, and agents may depend on.

{{ import "site/includes/request-trace-demo.html" }}

{{ import "exercise:architecture-outcome" }}

Use this trace before drawing the architecture diagram.
If the request path is unclear, the diagram is likely to hide the most important architectural decisions.

### Automated consumers change demand and exposure

A crawler, integration, monitoring probe, agent, and abusive bot may send similar requests while creating different value, cost, and risk.
Keep the operation's authoritative meaning stable across consumers, then decide which reads are public, which actions require authorization, and which expensive paths need quotas or admission control.
For the event tracker, a public summary might be cached while event writes require an authorized actor and a bounded request rate.
Cooperative crawling rules such as `robots.txt` do not enforce access control.
[Appendix C](/appendices/advanced-web-boundaries/#automated-consumers-change-demand-and-exposure) develops crawler policy, rate-limit identity, and an endpoint review.

> **Sustainability angle**
>
> Placement determines resource flow.
> Chatty APIs, unnecessary round trips, duplicated computation, oversized payloads, heavy client bundles, aggressive polling, and poorly targeted edge execution all turn architectural choices into recurring resource use.
> Moving work is valuable when it removes a justified constraint rather than merely multiplying infrastructure.

## Choose where work runs

An origin-centered application can begin with one server handling requests and storing data.
Separating presentation, application logic, and data into three tiers separates responsibilities; it does not require three machines.
Cloud provisioning and programmable edges expand the placement options without removing the origin's authority or the need to recover from failure.

| Placement choice            | Pressure it can address                                                 | Obligation to examine                                                     |
| --------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Owned or hosted server      | Predictable workload, hardware control, or data locality                | Capacity planning, replacement, and recovery                              |
| Replaceable cloud instances | Variable demand and automated provisioning                              | Startup delay, quotas, shared state, and downstream saturation            |
| Managed service             | Limited team capacity for operating a database, queue, or storage layer | Provider limits, consistency, cost, export, and recovery contracts        |
| CDN and programmable edge   | Repeated delivery, distant consumers, or early request rejection        | Cache correctness, execution limits, and distance to authoritative writes |

::caption[Placement choices, the pressures they address, and the work they retain.]
::label[table:web-placement-choices]

These choices can coexist in one application.
The [NIST cloud definition](https://csrc.nist.gov/pubs/sp/800/145/final) emphasizes pooled resources, rapid provisioning, elasticity, and measured service; these change how capacity is acquired, not how quickly a database can accept writes.
A session, upload, or job kept only on one replaceable instance can disappear or become unreachable from the next request.
Show where that state survives and which dependency saturates first.

A [CDN](https://www.rfc-editor.org/rfc/rfc6392.html) moves reusable representations close to consumers; a programmable edge also runs bounded request handling there.
The event tracker can deliver public assets and a cached summary near users while keeping event writes beside the authoritative database.
If an edge function must contact that database on every request, the long trip remains.
Choose placement from reuse, locality, trust, and operational capacity, and show managed dependencies and provider boundaries in the diagram.

### HTTP provides a stable seam

[HTTP semantics](https://www.rfc-editor.org/rfc/rfc9110.html) define a stateless request-response protocol in which clients act on resources through messages and receive status information and representations in return.
The protocol intentionally hides how a service is implemented behind a uniform interface.
It also allows intermediaries—proxies, gateways, and tunnels—to participate between the user agent and origin.
Those properties let deployment topology change without requiring every consumer to understand the new arrangement.

A request method communicates intent, the target identifies what the request concerns, headers carry metadata and control information, and the response status describes the result.
Correct use of safe and idempotent methods, validators, cache metadata, authentication, and content negotiation affects what browsers and intermediaries are allowed to do.
HTTP is therefore architectural material rather than plumbing supplied by a framework.

HTTP gives each request understandable semantics independently of its connection.
Application identity, continuity, and durable state still need explicit owners; the [data section](#stateless-requests-still-depend-on-state) develops those obligations.

### Application contracts outlive deployment choices

HTTP can carry several application interaction styles, including resource-oriented messages, hypermedia controls, GraphQL operations, and RPC calls.
Each style distributes knowledge and change pressure differently between consumers and providers, but none removes the need to define representations, errors, retries, authorization, and compatibility.

For the project, choose one minimal event-creation and event-query contract, then ask how it changes when requests are retried, devices go offline, workflow states evolve, or consumers need additional data.
[Appendix C](/appendices/advanced-web-boundaries/#choose-an-application-interaction-style) compares the interaction styles and contains the API contract lens and executable HTTP example.

### Organizational boundaries shape application contracts

An application contract is also a communication contract between its owners.
In his original 1968 paper, [Melvin Conway](https://www.melconway.com/Home/pdf/committees.pdf) observed that organizations tend to produce system structures shaped by their communication structures.
For web architecture, this means that a shared API or data model can become the place where several teams must coordinate, while a nominally independent service can remain tightly coupled when every change still requires the same people to agree.

Do not create a service boundary merely to imitate an organizational chart.
Instead, identify a capability with coherent authority and change reasons, give its owners enough control to evolve its internals, and keep the consumer contract small enough that other teams can depend on it without joining every implementation decision.
When one workflow crosses several owners, record who may change the contract, how compatibility is checked, how consumers learn about deprecation or migration, and which decision requires cross-team agreement.
The ownership card later in this chapter should therefore name both the code boundary and the communication boundary that maintains it.

## Rendering moves work across time and place

Cloud and edge platforms expanded where code can execute, while build tooling and capable browsers expanded when a representation can be created.
Start with **who constructs the next view and how it reaches the browser**:

- A conventional multi-page application (MPA) follows links and submits forms to receive complete HTML documents.
- A hypermedia-driven application (HDA) keeps views and available actions in server-provided HTML; browser code follows those controls and can apply HTML fragments to parts of the page :citep[gross2022hda].
- A typical single-page application (SPA) fetches data and uses client-side [rendering](/concepts/#rendering) (CSR) to construct subsequent views without replacing the document.

These are representative flows, not mutually exclusive categories: a conventional MPA also uses hypermedia, and partial page updates alone do not distinguish HDA from SPA.
The distinction in the latter two examples is whether server HTML or a client application model defines the views and actions.
An HDA can still use scripts for local interface behavior :citep[gross2022hypermediascripting].

Then ask **how the initial view is produced**.
Server-side rendering (SSR) produces HTML for a request; static site generation (SSG) produces it ahead of requests; incremental static regeneration (ISR) refreshes previously generated HTML; CSR builds the view in the browser.
CSR is the natural starting point for the SPA example, but an SPA can also initialize from server-rendered HTML and take over later rendering, as React's hydration API illustrates :citep[reactHydrateRoot].
Caching server-generated HTML can serve an MPA or HDA without moving control of its views to the browser.

Compare the consequences for freshness, server work, navigation, client responsibility, caching, accessibility, and failure.

### Web architecture lens

Use the same event-recording interaction across the three flows.
First choose how the application presents the state after `POST /events`, then vary how its first view arrives.
The MPA and HDA examples start with server HTML; the SPA example starts with CSR and also supports server-rendered or cached initial HTML.
Run the trace and watch which artifact crosses the network.

{{ import "site/includes/web-architecture-lens.html" }}

The ISR behavior in the lab is a simplified stale-while-revalidate model.
Exact regeneration, invalidation, and [consistency](/concepts/#consistency) behavior depend on the framework and deployment platform.
That platform-specific contract should be documented as part of the architecture.

### Activation is a separate architectural decision

Rendering and navigation do not explain how delivered HTML becomes interactive.
Hydration, progressive hydration, islands, and resumability move different amounts of code, state, and startup work across the server-browser boundary.
Record which regions need behavior, when that behavior becomes available, and which state or communication constraints the approach introduces.
[Appendix C](/appendices/advanced-web-boundaries/#activate-delivered-interfaces) compares the activation approaches and provides a focused lab.

### Runtime generation adds a control boundary

Runtime-generative UI lets model output choose data, composition, or executable behavior while the application runs.
A descriptor needs a validated vocabulary of components and actions; executable output additionally needs isolation and tightly scoped access to host data and tools.
Both need authorization at action time and a safe fallback.
[Appendix C](/appendices/advanced-web-boundaries/#runtime-ui-generation-changes-the-control-boundary) develops these controls and the descriptor audit.

## Data limits how freely responsibility can move

Compute and representations can often be duplicated or replaced more easily than authoritative data.
A read may be served from a replica or cache, but concurrent writes still need a rule for which result becomes true.
Moving execution closer to users without deciding where authority lives can exchange network latency for inconsistent state, complex conflict resolution, or a longer path to the real owner.

For the event tracker, raw events, current work-item state, and derived summaries have different roles.
Raw events may support replay or audit, current state must preserve workflow [invariants](/concepts/#invariant), and summaries can often be rebuilt or temporarily stale.
The architecture should state which data is authoritative, which is derived, where each is placed, and what happens when a location cannot reach its authority.

A derived summary may be rebuilt from retained events only when that history contains the necessary facts.
Recomputing it must not repeat external effects such as notifications, and new events must not be lost during the rebuild.
[Appendix C](/appendices/advanced-web-boundaries/#rebuild-a-view-without-repeating-its-effects) works through a summary rebuild and cutover.

### Data placement follows authority and access

An origin-centered application can keep its primary database close to the application server and pay one predictable network cost for most operations.
Cloud services make storage independently provisioned and managed, and they make replicas, object stores, queues, and analytical systems easier to combine.
Edge execution makes the remaining distance more visible: code may run near a consumer while the authoritative write still has to cross a region or continent.

Choose a data shape from the behavior that must remain correct and the access path that must remain efficient.
A relational model is useful when constraints and relationships must be enforced together; a document can keep an aggregate together; a key-value store can serve known-key access; object storage can hold large immutable representations; and an append-oriented log can preserve history for replay or derivation.
These are composable roles rather than stages of progress.
One application may use a relational source of truth, object storage for attachments, and a derived search index without giving all three equal authority.

Distribution makes four distinctions especially important: authoritative versus derived data, reads versus writes, transactional versus analytical work, and current state versus retained history.
Replicating a read path may reduce latency without changing write authority.
Partitioning can increase capacity or isolation, but then the partition key determines which queries and [transactions](/concepts/#transaction) remain local.

### Stateless requests still depend on state

An interchangeable server may receive a workspace handle without sharing an earlier request's in-process session.
It must still authenticate the caller, authorize access, and resolve authoritative state.
A handle does not grant permission, and state available only on its originating instance still requires affinity.
Retries after a lost response need a [stable application command identity](/concepts/#idempotency), with the mutation and reusable result stored atomically.
[Appendix C](/appendices/advanced-web-boundaries/#stateless-requests-still-depend-on-state) provides the two-instance state and retry audit.

### Transactions preserve invariants across failure and concurrency

A transaction groups operations that must commit together and defines how concurrent work may interact.
For the event tracker, a successful lifecycle transition must update current state and append its activity event without allowing either write to escape alone.
The deployed database's constraints, isolation level, acknowledgment point, and failure model determine the actual guarantee.

[Appendix C](/appendices/advanced-web-boundaries/#preserve-durable-invariants-with-transactions) develops ACID, concurrent transitions, and the transaction lab.

### Model valid data combinations

Constructive data modeling uses tagged unions, sealed hierarchies, or guarded constructors to require the data belonging to each outcome.
It reduces contradictory in-memory values; runtime parsing, authorization, and atomic persistence still enforce their own rules.
[Appendix C](/appendices/advanced-web-boundaries/#model-valid-data-combinations) develops a transition-result example and selected-invariant exercise.

## Caching coordinates controlled copies

Caching began as a central content-delivery technique, but its architectural reach is wider than the CDN.
A browser can keep a private response, a shared intermediary can reuse an HTTP representation, an application can retain a computed result, and a data system can expose a replica or materialized view.
Each case creates a controlled copy whose identity, lifetime, and relationship to authority must be defined.

| Cache location       | Copy being reused                             | Main benefit                         | Main correctness question                                      |
| -------------------- | --------------------------------------------- | ------------------------------------ | -------------------------------------------------------------- |
| Browser              | A response for one user agent                 | Avoids transfer and repeated work    | May this user reuse it, and when must it validate?             |
| CDN or reverse proxy | A response shared across suitable requests    | Reduces latency and origin work      | Which request properties belong in the cache key?              |
| Application          | A query, computation, or assembled view       | Avoids repeated service or data work | What invalidates it, and can callers accept bounded staleness? |
| Data layer           | A read replica, index, or materialized result | Moves or accelerates read work       | How far may it lag behind the authoritative write path?        |

::caption[Caching layers as controlled copies of authoritative or derived state.]
::label[table:web-cache-layers]

### HTTP cache control is application policy

An HTTP cache can avoid an origin request, reduce transferred bytes, and hide network latency only when reuse is correct for the response and its consumers.
The response must communicate who may store it, how long it remains fresh, how it can be validated, and whether stale reuse is acceptable.

The [HTTP caching specification](https://httpwg.org/specs/rfc9111.html) defines the core directives and freshness model:

- `public` permits storage by shared caches, while `private` limits a response to private caches.
- `max-age` defines freshness relative to response generation; `s-maxage` can define a different freshness lifetime for shared caches.
- `no-cache` still permits storage, but the stored response has to be validated before reuse.
- `no-store` asks caches not to store the response at all.
- `must-revalidate` prevents reuse of a stale response without successful validation.
- `Vary` makes selected request headers part of response selection.
  This can protect correctness, but every varying dimension can fragment the cache.

The cache key must distinguish requests whose responses or required processing differ.
Query parameters can fragment reuse even when they only describe a campaign, but ignoring an authorization or content-selection parameter can make reuse incorrect.
[Appendix C](/appendices/advanced-web-boundaries/#query-parameters-and-cache-identity) develops the optional `No-Vary-Search` mechanism and its limits.

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

## Architecture is maintained as responsibility moves

Throwaway code, piecemeal growth, and pressure to keep a system working can gradually blur its structure :citep[foote1997mud].
Adding services, edge functions, browser state, or caches creates more responsibilities to keep coherent.
Record their owners, revisit temporary shortcuts, and reorganize code when several unrelated change reasons accumulate together.
Architecture notes and a [decision log](/concepts/#decision-log) preserve those choices for later contributors.

### Field note — When syntax familiarity stopped deciding the stack

Agents let me explore technologies before I know every syntax detail or API.
I am using that capability in an [Apache Jena](https://jena.apache.org/) proof of concept for validating a knowledge base.
I am not a strong Java developer, and I do not yet know whether this is the right architecture; the immediate question is whether the approach produces useful results.

I can delegate unfamiliar syntax while examining the data model and observed behavior.
If the prototype proves useful, its architecture, maintainability, and my ability to own it still need review.

### Make the implementation architecture reviewable

By this point, you have already made architecture choices in implementation A, even if you did not yet have a complete vocabulary for them.
The public project discussion should make those choices visible: different groups received the same behavioral specification but chose different stacks, boundaries, storage models, and request paths.

Keep the architecture diagram consistent with the [project harness](/chapters/scalable-development/#the-project-harness): global rules, feature contracts, decision records, and agent instructions should describe the same implementation.

A component diagram can show that two boxes exist without explaining which one owns a decision.
For each independently evolvable capability, record its source root, composition root, state authority, public contracts, allowed dependency direction, and intentionally excluded responsibilities.
The resulting ownership card is a review aid rather than a demand for one directory per feature.

File size, fan-in, churn concentration, or a crowded directory can act as structural smoke alarms, but none proves that a split is correct.
When such a signal fires, inspect whether several authorities or change reasons have accumulated together.
Consolidate ownership, split responsibilities, or document a justified exception; do not divide a file merely to satisfy a number.

## Architectural dimensions for a web application

Placement, rendering, data, and ownership choices interact along several dimensions.
Use the table to compare architectures without treating any option as a universal destination.

| Dimension                | Available choices                                                            | Pressure the choices can address                         | Obligation introduced by the decision                               |
| ------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------- |
| Infrastructure ownership | Owned server, hosted machine, VM, container, function, managed service       | Provisioning speed, utilization, operational capacity    | Provider contracts, quotas, cost visibility, and recovery           |
| Execution placement      | Build system, browser, origin, cloud region, edge location                   | Latency, elasticity, device capability, or data locality | More boundaries, deployment targets, and partial-failure paths      |
| Representation rendering | Build time, request time, incremental regeneration, client time              | Freshness, origin work, delivery speed, personalization  | Invalidation, duplicated logic, activation, and fallback behavior   |
| Browser interaction      | Document navigation, hypermedia updates, client-managed navigation           | Interaction richness, continuity, client responsiveness  | Client state, compatibility, accessibility, and recovery            |
| Client activation        | Hydration, progressive hydration, islands, resumability                      | Initial payload and time to useful interaction           | Serialization, loading policy, tooling, and cross-boundary state    |
| State authority          | Client-local state, application service, database, event log, external owner | Correctness, offline work, audit, and integration        | Invariants, authorization, retries, and lifecycle                   |
| Data distribution        | Central store, replicas, partitions, derived views                           | Volume, locality, isolation, and read or write pressure  | Consistency rules, routing, migration, and reconciliation           |
| Caching and freshness    | Browser, intermediary, application, and data-layer copies                    | Repeated work, transfer, latency, and origin capacity    | Cache identity, freshness, invalidation, privacy, and observability |
| Consumer contract        | HTML and forms, resource HTTP, hypermedia, GraphQL, RPC, events              | Independent evolution and different consumer needs       | Compatibility, idempotency, rate limits, and bounded authority      |
| Operational ownership    | One team and machine through multiple teams, providers, and regions          | Organizational scale and specialized capability          | Explicit ownership, signals, incident paths, and decision records   |

::caption[Architectural dimensions to examine when designing or comparing web applications.]
::label[table:web-architectural-dimensions]

The rows interact.
Moving rendering to the edge may require a cache-freshness policy; moving interaction to the browser may require a new API contract; moving compute into replaceable cloud instances may require state to leave process memory; and moving reads near users may lengthen the path to authoritative writes.
Check that the consequences of those choices agree.

## Project artifact

Review the architecture and data-flow diagrams submitted with implementation A, identify one consequential architectural choice, and write an architecture hypothesis for implementation B.
The hypothesis should use the conceptual model and dimensions table to state:

- which consumer, representation, execution location, and authority the selected workflow uses,
- which pressure justifies preserving or changing that placement,
- what new contract, consistency rule, or operational obligation follows,
- which automated consumers may reach the selected path and where cooperation, access control, quotas, or rate limits belong,
- which team or organizational boundary owns the contract and which changes require coordination across it,
- and what evidence would show whether the decision works.

Also complete an ownership card for the event workflow and identify one structural signal that would prompt another ownership review.
Implementation B should still include its own diagrams and decision record.

## Summary

Architecture assigns execution, representations, and data authority to locations that fit the pressure.
HTTP and [application contracts](/concepts/#contract) let consumers survive many placement changes, while state and caching introduce coordination obligations.
Keep those obligations and their owners visible so the next change can be evaluated against the same model.
