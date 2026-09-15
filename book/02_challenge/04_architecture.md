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

### Request boundary lab

The demonstration below traces one `POST /events` request through the browser, network, API, storage, and response path.
Each boundary has an owner, a failure mode, and a contract that future clients, humans, and agents may depend on.

{{ import "site/includes/request-trace-demo.html" }}

Use this trace before drawing the architecture diagram.
If the request path is unclear, the diagram is likely to hide the most important architectural decisions.

### Automated consumers change demand and exposure

A crawler, integration, monitoring probe, authorized agent, and abusive bot can send technically similar HTTP requests while creating different value, cost, and risk.
Agents can traverse interfaces quickly, retry ambiguous failures, and act without a person inspecting every screen.
The same operation should retain its authoritative meaning whether invoked by a form, integration, or agent.
Architecture should therefore distinguish which representations are intentionally public, which actions require identity and authorization, which expensive paths need a quota or admission boundary, and which automated uses the product is willing to support.

The [Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309.html) lets a cooperating crawler discover access preferences in `/robots.txt`.
It is not authorization or a content-security boundary, and listing a path there makes the path discoverable.
Information that must remain private still needs an application-layer access control; public information should be designed with the assumption that a permitted consumer can copy it.

Rate limiting controls resource use rather than deciding whether every automated consumer is malicious.
An HTTP `429 Too Many Requests` response can explain the limit and carry `Retry-After`, but [RFC 6585](https://www.rfc-editor.org/rfc/rfc6585.html#section-4) deliberately leaves the identity and counting policy to the application.
Limits based only on an IP address can group unrelated users or be distributed across many addresses, while limits tied to an account, tenant, capability, or costly operation require their own fairness and privacy decisions.

The [OWASP automated-threat catalog](https://owasp.org/www-project-automated-threats-to-web-applications/assets/oats/EN/OAT-011_Scraping) treats scraping as one form of automated use among several, and its practical implication here is to begin from the endpoint and intended outcome rather than from a generic “block bots” goal.
For one exposed path, record the legitimate consumers, information returned, authoritative action or cost triggered, likely abuse pattern, first useful signal, control point, acceptable false-positive cost, and recovery or override path.
Cache safe public reads, minimize exposed and retained data, protect expensive or consequential actions, and observe origin work per useful outcome before adding a challenge to every request.

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

Record whether the application assumes one long-lived machine, interchangeable processes, or services whose lifecycle is controlled elsewhere.

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

Compare the consequences for freshness, server work, navigation, client responsibility, caching, accessibility, and failure.

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

Runtime-generative UI lets model output choose data, composition, or executable behavior while the application runs.
A descriptor needs a validated vocabulary of components and actions; executable output additionally needs isolation and tightly scoped access to host data and tools.
Both need authorization at action time and a safe fallback.
[Appendix C](/appendices/advanced-web-boundaries/#runtime-ui-generation-changes-the-control-boundary) develops these controls and the descriptor audit.

## Data limits how freely responsibility can move

Compute and representations can often be duplicated or replaced more easily than authoritative data.
A read may be served from a replica or cache, but concurrent writes still need a rule for which result becomes true.
Moving execution closer to users without deciding where authority lives can exchange network latency for inconsistent state, complex conflict resolution, or a longer path to the real owner.

For the event tracker, raw events, current work-item state, and derived summaries have different roles.
Raw events may support replay or audit, current state must preserve workflow invariants, and summaries can often be rebuilt or temporarily stale.
The architecture should state which data is authoritative, which is derived, where each is placed, and what happens when a location cannot reach its authority.

### Rebuild a view without repeating its effects

A retained event history can support several derived views when it records the inputs needed to compute them.
:citet[kreps2013log] explains how deterministic processing of the same ordered history reconstructs state.
Changing the computation can instead produce a new view from that history.

Suppose a workspace dashboard currently counts all activity and now needs separate counts for started and completed work.
An illustrative retained fixture contains `E1: work_started`, `E2: work_completed`, and `E3: work_started`, all for workspace `W1` in that order.
Replaying those records through the new aggregation gives two starts and one completion.
The rebuild writes a separate summary and records its last processed position; the application can keep serving the old summary until the new one catches up to an agreed position and is verified.
Events arriving during the rebuild must be included through that cutover position, then processing must continue without skipping or double-counting them.

Recomputing the summary must not resend the notifications originally triggered by those events.
Keep the projection that updates the summary separate from notification delivery.
If delivery itself needs recovery, its durable record and receiver-enforced idempotency belong to the effect boundary described in [Appendix F](/appendices/durable-workflows/#durable-execution-preserves-coordination-progress).
Rebuilding derived data and resuming a workflow are different uses of history.

Record the event identities, workspace, type, schema and aggregation versions, ordering, retained starting point, and acceptable summary lag.
Expired or incomplete records may prevent a rebuild; the course tracker's activity history does not necessarily contain every work-item field or permission.
Name which views the retained facts support and who owns their rebuild and freshness.

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

An interchangeable server may receive a workspace handle without sharing an earlier request's in-process session.
It must still authenticate the caller, authorize access, and resolve authoritative state.
A handle does not grant permission, and state available only on its originating instance still requires affinity.
Retries after a lost response need a stable application command identity, with the mutation and reusable result stored atomically.
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
Architecture notes and decision records preserve those choices for later contributors.

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
HTTP and application contracts let consumers survive many placement changes, while state and caching introduce coordination obligations.
Keep those obligations and their owners visible so the next change can be evaluated against the same model.
