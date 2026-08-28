# How does web architecture shape scalability?

Students often experience web development as a collection of frameworks, libraries, and deployment platforms.
Those tools change quickly, but web applications still have to connect consumers, representations, computation, and authoritative data across networks that introduce latency, partial failure, independent change, and untrusted input.

Web architecture has not progressed by replacing one correct design with another.
Instead, it has expanded the places where responsibility can live.
Physical servers made the machine visible; cloud platforms made capacity programmable; content delivery networks placed copies near consumers; programmable edge platforms placed bounded computation beside those copies; and modern rendering approaches divide work across build systems, servers, edge locations, and browsers.
As computation became more commoditized, architects gained placement options without escaping the constraints of distance, state, trust, cost, and failure.

The central claim of this chapter is that every movement of responsibility addresses a particular pressure and creates a new coordination obligation.
Newer placement is not inherently better.
The useful question is what should move, why it should move, and which contract must remain stable when it does.

## A conceptual model: separate roles from locations

A framework-shaped label such as “serverless application” or “single-page application” combines several decisions that can be examined separately.
Begin with four architectural roles:

| Role           | Question it answers                                      | Typical examples                                                       |
| -------------- | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| Consumer       | Who or what expresses intent and observes the result?    | A person using a browser, an integration, a crawler, or an agent       |
| Representation | What crosses a boundary to make state or action visible? | HTML, JSON, an image, a stream, a form, or a hypermedia control        |
| Execution      | Where is behavior evaluated?                             | A build process, browser, physical server, cloud service, or edge node |
| Authority      | Which component decides and preserves the current truth? | An application service, database, event log, or external system        |

::caption[Four roles that remain useful as web deployment locations change.]
::label[table:web-architecture-roles]

Roles are not machines.
One machine may perform several roles, and one role may be distributed across many machines.
An **origin** is the authoritative source for a representation in an HTTP exchange, not necessarily one physical server.
Likewise, an edge function may execute application logic without becoming the authority for the data it reads.

Use the event tracker to keep the model concrete.
A `GET /events` request asks for a representation and may be answered from a browser cache, an edge cache, or the origin.
A `POST /events` request expresses an action whose validation may begin near the consumer, but whose accepted result must eventually reach the component that owns the event history.
The two paths can share an interface while placing execution, copies, and authority differently.

> **Changed consumer assumption: agents**
>
> An agent may follow links in rendered HTML, operate a browser, call an API, or invoke a capability-oriented interface.
> It still reaches the application through an existing consumer boundary, but it can act repeatedly, retry after ambiguous failure, traverse interfaces faster than a person, and initiate consequential actions without a person examining every intermediate screen.
> Contracts, authorization, idempotency, rate limits, action confirmation, and evidence therefore become more important; the agent does not become a new architectural tier.
> The same operation should have one authoritative meaning whether a person clicked a form, an integration sent a request, or an authorized agent invoked it.

### Request boundary lab

The demonstration below traces one `POST /events` request through the browser, network, API, storage, and response path.
Each boundary has an owner, a failure mode, and a contract that future clients, humans, and agents may depend on.

{{ import "site/includes/request-trace-demo.html" }}

Use this trace before drawing the architecture diagram.
If the request path is unclear, the diagram is likely to hide the most important architectural decisions.

> **Sustainability angle**
>
> Placement determines resource flow.
> Chatty APIs, unnecessary round trips, duplicated computation, oversized payloads, heavy client bundles, aggressive polling, and poorly targeted edge execution all turn architectural choices into recurring resource use.
> Moving work is valuable when it removes a justified constraint rather than merely multiplying infrastructure.

## The origin-centered web made machines visible

In an origin-centered design, a browser sends a request to a known server, the server applies application logic, reads or changes data, and returns a representation.
The earliest useful deployment for a dynamic site may be one physical machine running the web server and database.
Larger installations can place a reverse proxy or load balancer in front of several application servers and move the database to separate hardware.
This is often described as a three-tier shape—presentation, application logic, and data—even though the tiers are responsibilities and do not have to occupy three machines.

Physical ownership makes several constraints difficult to ignore.
Capacity is purchased and installed before it is used, a failed machine has to be repaired or replaced, and vertical scaling has a hardware ceiling.
Horizontal scaling adds machines, but then request routing, deployment, shared state, and data coordination become system responsibilities.
The architecture can still be excellent: a stable workload, predictable cost, data locality, regulatory control, or specialized hardware may justify owned infrastructure.

The important distinction is not “old server” versus “modern platform.”
It is whether the application assumes one long-lived machine, several interchangeable processes, or services whose lifecycle is controlled elsewhere.

### HTTP provides a stable seam

[HTTP semantics](https://www.rfc-editor.org/rfc/rfc9110.html) define a stateless request-response protocol in which clients act on resources through messages and receive status information and representations in return.
The protocol intentionally hides how a service is implemented behind a uniform interface.
It also allows intermediaries—proxies, gateways, and tunnels—to participate between the user agent and origin.
Those properties let deployment topology change without requiring every consumer to understand the new arrangement.

A request method communicates intent, the target identifies what the request concerns, headers carry metadata and control information, and the response status describes the result.
Correct use of safe and idempotent methods, validators, cache metadata, authentication, and content negotiation affects what browsers and intermediaries are allowed to do.
HTTP is therefore architectural material rather than plumbing supplied by a framework.

HTTP being stateless does not mean the application has no state.
It means each request has understandable semantics in isolation from the connection that carried it.
Identity, authorization, workflow continuity, and durable state still need explicit homes.
The data section returns to that distinction.

### Application contracts outlive deployment choices

HTTP can carry several application interaction styles, including resource-oriented messages, hypermedia controls, GraphQL operations, and RPC calls.
Each style distributes knowledge and change pressure differently between consumers and providers, but none removes the need to define representations, errors, retries, authorization, and compatibility.

For the project, choose one minimal event-creation and event-query contract, then ask how it changes when requests are retried, devices go offline, workflow states evolve, or consumers need additional data.
[Appendix C](/appendices/advanced-web-boundaries/#choose-an-application-interaction-style) compares the interaction styles and contains the API contract lens and executable HTTP example.

## Cloud made infrastructure programmable

Cloud computing changed how capacity is acquired and operated more than it changed the physical laws beneath an application.
The [NIST definition of cloud computing](https://csrc.nist.gov/pubs/sp/800/145/final) emphasizes on-demand access to a shared pool of configurable resources, rapid provisioning and release, elasticity, and measured service.
These properties made compute, storage, and networking available through APIs instead of only through hardware procurement and manual installation.

### From named machines to replaceable capacity

A cloud-hosted application may still run the same web server and database that ran on owned hardware.
The architectural shift appears when instances can be created from declarations, replaced after failure, scaled with demand, and distributed across failure zones.
Teams can move from a pet-like server with accumulated local state toward replaceable instances whose configuration and dependencies are explicit.

This shift favors stateless request handlers because interchangeable instances are easier to add, remove, and recover.
It also makes hidden machine-local assumptions more dangerous.
A session, uploaded file, background job, or generated artifact stored only on one instance can disappear when the platform replaces it or can become unreachable when the next request reaches another instance.

Elasticity is not infinite capacity.
New instances take time to start, quotas and downstream services impose limits, and a database or external API may saturate before the application tier does.
Measured service also turns inefficient design into a recurring bill.
Cloud architecture therefore requires capacity signals, cost signals, and explicit saturation boundaries rather than faith in automatic scaling.

### Managed services move operational work

Object storage, managed databases, identity services, queues, functions, and observability platforms let a team delegate installation, patching, replication, or availability work to a provider.
That can reduce undifferentiated operations and make sophisticated capabilities accessible to smaller teams.
It also creates service contracts: supported regions, quotas, consistency behavior, failure modes, pricing dimensions, export paths, and recovery procedures become architectural dependencies.

Cloud did not make infrastructure disappear.
It changed who controls each layer and which parts the application can observe.
An architecture diagram should therefore show managed dependencies and provider boundaries instead of collapsing them into an anonymous cloud shape.

## CDNs grew into a programmable edge

Cloud platforms made centralized pools of computation easier to allocate.
Content delivery networks addressed a different physical constraint: a distant origin cannot make light travel faster, and repeated delivery from one location wastes both time and origin capacity.

### CDNs began by moving representations

The web had used proxies, replicas, and caches long before “edge” became a general application-platform label.
[RFC 3040](https://www.rfc-editor.org/rfc/rfc3040.html), published in 2001, documents an already distributed web of origins, surrogates, caching proxies, replica selection, and cache coordination.
[RFC 6392](https://www.rfc-editor.org/rfc/rfc6392.html) describes a CDN as content-delivery, request-routing, distribution, and accounting infrastructure in which edge servers deliver copies close to users.

This content-oriented model moves a reusable representation while the origin remains authoritative.
For the event tracker, public scripts, styles, images, and a non-personalized summary can be delivered near consumers without moving the event-writing authority.
The benefit depends on reuse: a personalized or rapidly changing representation with a fragmented cache key may miss often enough that the edge only adds another hop.

### Programmability moved request handling beside the cache

Once providers had globally distributed request-routing and delivery infrastructure, they could expose some processing at the same locations.
For example, the 2017 [Lambda@Edge release](https://aws.amazon.com/about-aws/whats-new/2017/07/lambda-at-edge-now-generally-available/) connected functions to CloudFront viewer and origin request or response events, allowing code to inspect, rewrite, authorize, personalize, or generate responses near users.
This illustrates the expansion from selecting and serving content to running bounded application logic in the delivery path.

Edge is relative rather than singular.
An execution location can be close to a user but far from the authoritative database, close to a device but outside a cloud region, or close to an origin service while still crossing organizational boundaries.
Moving request validation, routing, personalization, or rendering outward can reduce latency and origin work.
Moving an authoritative write outward can instead create a coordination problem across locations.

The edge therefore extends rather than replaces origin and cloud architecture.
Use it when locality, repeated delivery, early rejection, or distributed ingress addresses a measured pressure.
Keep work centralized when it depends on strongly coordinated data, specialized runtime capabilities, or operational simplicity.

## Rendering moves work across time and place

Cloud and edge platforms expanded where code can execute, while build tooling and capable browsers expanded when a representation can be created.
Rendering labels often collapse these decisions into one framework-shaped category.

Server-side rendering (SSR), static site generation (SSG), incremental static regeneration (ISR), and client-side rendering (CSR) primarily describe **where and when a view is produced or refreshed**.
Multi-page applications (MPAs), hypermedia-driven applications (HDAs), and single-page applications (SPAs) primarily describe **how the browser reaches later application states**.

CSR is common in single-page applications because the browser can fetch data, render views, and handle later navigation without replacing the document.
The terms are not synonyms: CSR is a rendering strategy, while SPA describes a broader navigation and state-management shape.
An HDA can receive its initial document through SSR, while an MPA can serve pages from a statically generated or incrementally regenerated cache.

The useful comparison is not which acronym wins.
Ask what each decision does to freshness, origin or edge work, navigation, client responsibility, caching, accessibility, and failure.

### Web architecture lens

Use the same event-recording interaction across nine combinations.
First choose how the initial document is produced, then choose how the application presents the state after `POST /events`.
Run the trace and watch which artifact crosses the network.

{{ import "site/includes/web-architecture-lens.html" }}

The ISR behavior in the lab is a simplified stale-while-revalidate model.
Exact regeneration, invalidation, and consistency behavior depend on the framework and deployment platform.
That platform-specific contract should be documented as part of the architecture.

### Activation is a separate architectural decision

Rendering and navigation do not explain how delivered HTML becomes interactive.
Hydration, progressive hydration, islands, and resumability move different amounts of code, state, and startup work across the server-browser boundary.
Record which regions need behavior, when that behavior becomes available, and which state or communication constraints the approach introduces.
[Appendix C](/appendices/advanced-web-boundaries/#activate-delivered-interfaces) compares the activation approaches and provides a focused lab.

### Runtime generation adds a control boundary

A component written by a coding agent during development becomes ordinary application code once it has been reviewed and committed.
Runtime-generative UI is different: model output can select data, composition, or executable behavior while the application is running.

The more freedom the output receives, the more the host must control.
A declarative descriptor needs an approved component and action registry, schema validation, authorization when actions execute, bounded structure, and a safe fallback.
Generated executable code additionally needs isolation without ambient credentials, a narrow bridge to host data and tools, explicit permissions, resource limits, and observability.
[Appendix C](/appendices/advanced-web-boundaries/#runtime-ui-generation-changes-the-control-boundary) develops the full control-boundary spectrum and a descriptor-boundary audit.

## Data limits how freely responsibility can move

Compute and representations can often be duplicated or replaced more easily than authoritative data.
A read may be served from a replica or cache, but concurrent writes still need a rule for which result becomes true.
Moving execution closer to users without deciding where authority lives can exchange network latency for inconsistent state, complex conflict resolution, or a longer path to the real owner.

For the event tracker, raw events, current work-item state, and derived summaries have different roles.
Raw events may support replay or audit, current state must preserve workflow invariants, and summaries can often be rebuilt or temporarily stale.
The architecture should state which data is authoritative, which is derived, where each is placed, and what happens when a location cannot reach its authority.

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
Partitioning can increase capacity or isolation, but then the partition key determines which queries and transactions remain local.

### Stateless requests still depend on state

Stateless request handling means that an interchangeable server does not need an earlier request's hidden in-process session to interpret the next one.
It does not mean that the application has no state.
A later request may carry an explicit workspace or workflow handle, while the service still has to authenticate the caller, authorize access, resolve authoritative state, and define that state's lifecycle.

A handle is an address, not authorization.
If its state exists only on the instance that minted it, affinity has merely moved behind a new identifier.
Likewise, a protocol request identifier does not automatically make a domain mutation safe to retry.
When a mutation can commit before its response is lost, use a stable application command or idempotency key and store the mutation and reusable result atomically at the authoritative boundary.

[Appendix C](/appendices/advanced-web-boundaries/#stateless-requests-still-depend-on-state) develops state placement, authorization, request continuity, and a two-instance retry audit.

### Transactions preserve invariants across failure and concurrency

A transaction groups operations that must commit together and defines how concurrent work may interact.
For the event tracker, a successful lifecycle transition must update current state and append its activity event without allowing either write to escape alone.
The deployed database's constraints, isolation level, acknowledgment point, and failure model determine the actual guarantee.

[Appendix C](/appendices/advanced-web-boundaries/#preserve-durable-invariants-with-transactions) develops ACID, concurrent transitions, and the transaction lab.

### Model valid data combinations

A transaction constrains how a valid state change becomes durable.
Constructive data modeling reduces the contradictory combinations that ordinary code can create before that boundary.
Use a tagged union, sealed hierarchy, guarded constructor, or another stack-native representation when each outcome requires different data.

A precise in-memory representation does not establish authorization, persistence, or concurrency safety.
Untrusted or deserialized input still needs runtime parsing, and the durable write must still check authoritative state and preserve the relevant invariant atomically.

[Appendix C](/appendices/advanced-web-boundaries/#model-valid-data-combinations) contains a complete transition-result example and a selected-invariant exercise.

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

A system does not avoid architectural decay merely because it began with a diagram or a recognizable framework.
:citet[foote1997mud] identify throwaway code, piecemeal growth, and pressure to keep the system working as forces that gradually produce a Big Ball of Mud.
The growing set of placement options can accelerate that decay when a project adopts cloud services, edge functions, browser state, caches, and generated components without recording which role each one owns.

Conscious architecture does not mean designing the entire system in advance.
It means repeatedly deciding which boundaries must remain visible, which shortcuts are temporary, and when working code needs to be reorganized before further growth makes change unsafe.
Christopher Alexander's pattern language offers a middle path between a complete upfront blueprint and unregulated growth: shared patterns allow local, piecemeal changes while preserving relationships that contribute to a coherent whole :citep[alexander1977pattern].

In an agentic project, architecture notes, specifications, examples, tests, and decision records give humans and agents a project-specific language for making changes without rediscovering—or accidentally redefining—the system on every task.
The cathedral and bazaar metaphor describes how development and feedback are organized, whereas a Big Ball of Mud describes the resulting structure :citep[raymond2001cathedral].
Either development model can preserve architecture through stable boundaries, review, and continuous integration, and either can produce mud when local changes accumulate without stewardship.

### Make the implementation architecture reviewable

Students have already made architecture choices in implementation A, even if they did not yet have a complete vocabulary for them.
The public project discussion should make those choices visible: different groups received the same behavioral specification but chose different stacks, boundaries, storage models, and request paths.

Each implementation should treat a small set of project memory files as architectural artifacts:

- `ARCHITECTURE.md` records global rules and cross-cutting constraints, such as application shape, storage model, validation boundaries, deployment assumptions, and rules future changes should preserve.
- `specs/{feature}/spec.md` records feature-level contracts, workflows, regression guardrails, and verification steps.
- `docs/adrs/` or a simple decision log records durable decisions and trade-offs that future groups would otherwise have to rediscover.
- `AGENTS.md` records how AI tools should operate in the repository, including required commands, review expectations, protected files, and escalation points.

If the code, diagram, specification, and decision log disagree, the project has an architectural problem even if the application still runs.

A component diagram can show that two boxes exist without explaining which one owns a decision.
For each independently evolvable capability, record its source root, composition root, state authority, public contracts, allowed dependency direction, and intentionally excluded responsibilities.
The resulting ownership card is a review aid rather than a demand for one directory per feature.

File size, fan-in, churn concentration, or a crowded directory can act as structural smoke alarms, but none proves that a split is correct.
When such a signal fires, inspect whether several authorities or change reasons have accumulated together.
Consolidate ownership, split responsibilities, or document a justified exception; do not divide a file merely to satisfy a number.

## Architectural dimensions for a web application

The history of the web expanded the available choices along several dimensions.
Use the table to compare architectures without treating any option as a universal destination.

| Dimension                | Choices that expanded over time                                              | Pressure the choices can address                         | Obligation introduced by the decision                               |
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
A design is coherent when these consequences agree rather than when it selects the newest option in each row.

## Project artifact

Students should review the architecture and data-flow diagrams submitted with implementation A, identify one consequential architectural choice, and write an architecture hypothesis for implementation B.
The hypothesis should use the conceptual model and dimensions table to state:

- which consumer, representation, execution location, and authority the selected workflow uses,
- which pressure justifies preserving or changing that placement,
- what new contract, consistency rule, or operational obligation follows,
- and what evidence would show whether the decision works.

Students should also complete an ownership card for the event workflow and identify one structural signal that would cause them to review that ownership again.
Implementation B should still include its own diagrams and decision record.

## Summary

Web architecture has accumulated placement choices rather than moving through a ladder of universally better designs.
Origin-centered systems make physical machines and request paths visible.
Cloud platforms make pooled capacity programmable and move operational work into provider contracts.
CDNs move reusable representations closer to consumers, while programmable edge platforms can also move bounded request handling into that delivery path.
Rendering divides work across build time, request time, edge execution, and the browser; durable data authority constrains how freely that work can move; and caching coordinates the copies created along the way.

HTTP and application contracts let consumers survive many of these topology changes, including the addition of agents as more autonomous consumers.
The architectural task is to place each responsibility in response to a real pressure, preserve the authority and contracts that make the system coherent, and remain able to explain and revise the decision as the application changes.
