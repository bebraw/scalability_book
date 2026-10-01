# Advanced control boundaries in web applications

Use this appendix when a design depends on state continuity across requests, HTTP method semantics, transactional [invariants](/concepts/#invariant), client activation, runtime-generated interfaces, a detailed application contract, event-view rebuilding, or endpoint and cache policy.
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
Use an application-level command identifier or [idempotency](/concepts/#idempotency) key, bind it to the caller, handle, operation, and relevant arguments, and store the mutation and reusable result atomically in the [authoritative](/concepts/#state-authority) application state.

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

## Distinguish HTTP method semantics from domain retry safety

The [Pressure chapter's exercise](/chapters/reality/#exercise-pressure-retries) starts from the domain contract: inspect all promised effects of one logical command.
HTTP adds standardized method semantics that clients and intermediaries can use.
In [RFC 9110, sections 9.2.1–9.2.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2), **safe** means the client requests no state change, while **idempotent** means repeating the request preserves its intended server effect.

| Method          | Safe? | Idempotent by method semantics? |
| --------------- | ----- | ------------------------------- |
| `GET`, `HEAD`   | Yes   | Yes                             |
| `PUT`, `DELETE` | No    | Yes                             |
| `POST`          | No    | No general guarantee            |

::caption[Selected HTTP methods and their standardized properties.]
::label[table:http-method-properties]

Identical responses are unnecessary.
For example, an API could return `204` after deletion and `404` on a retry because the resource is already absent; the intended removal still happened once.
The RFC also permits incidental effects such as an access-log entry per request.
The exercise's domain activity event is different: exactly one event for the transition is a promised application outcome.

A `POST` command can have an application-specific retry guarantee.
For the tracker, one design binds a stable command key to the caller, workspace, operation, and relevant arguments, then atomically enforces that key with the state change, activity event, and reusable result.
Specify conflicting payloads, key retention, and concurrent attempts as part of the contract.
The key and HTTP method alone do not implement that guarantee; the state-placement audit above and [Appendix F's effect audit](/appendices/durable-workflows/#audit-the-effect-boundary) locate its enforcement.

**HTTP semantics check.** Explain whether each observation contradicts idempotency: a repeated deletion returns a different status; repeated completion adds another promised domain event; repeated retrieval adds an incidental access-log entry.
For each, name the intended effect and distinguish it from the response or diagnostic record.
Then explain what evidence a client would need before automatically retrying the application's `POST` command.

## Preserve durable invariants with transactions

A database transaction groups operations into one unit with four commonly named properties: atomicity, consistency, isolation, and durability, or ACID :citep[haerder1983recovery].
**Atomicity** means the operations commit together or not at all.
**Consistency** means a committed transaction leaves the data within its declared invariants; the database cannot invent those application rules, so they still have to be expressed through constraints, guarded writes, or validated domain logic.
**Isolation** describes how concurrent [transactions](/concepts/#transaction) are allowed to observe and affect one another.
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

## Rebuild a view without repeating its effects

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

[Rendering](/concepts/#rendering) and navigation do not explain how delivered HTML becomes interactive.
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
Resolve action identifiers through trusted application code; naming an action in generated data does not grant [authority](/concepts/#authority) to perform it.

Executable generated UI expands the boundary further.
It needs a separate-origin sandbox or equivalent isolated runtime without ambient credentials, a narrow bridge to host data and tools, explicit network, storage, navigation, and tool permissions, resource limits, observability, and a safe fallback.
Running generated code in a browser does not by itself provide that boundary.

A Google Research preprint provides bounded preference evidence for one complete generative-UI pipeline.
After excluding eight of 100 sampled LMArena prompts, the study sent each pre-cached result to two raters.
Across the pairwise comparisons, raters preferred the generated UI over the study's markdown condition in 82.8%.
Contractor-built pages were preferred over the generated pages in 50.0% of comparisons, while the generated pages were preferred in 35.3% and the remainder was neutral.
The pipeline combined Gemini with search and image tools, extensive instructions, and post-processing; generation often took one to two minutes and was excluded from the ratings.
The study therefore measures preference in that setup, not task success, correctness, accessibility, security, maintainability, or production readiness :citep[leviathan2026generativeui].

### Show the context behind a generated view

A generated view can satisfy its schema while concealing why particular information was selected or omitted.
Show a compact **context receipt** that lets the user inspect the inputs and transformation behind the view.
For example, a lecture-material selector could display:

> **Inputs:** aggregate counts from predefined audience choices and a named revision of the curated reading list.
>
> **Sent to the model provider:** those counts and reading-list entries; no names, individual responses, or private notes.
>
> **Transformation:** selected and ordered existing readings; the complete list remains available.
>
> **External action:** none; the result only changes this view.

This is an illustrative design, not a claim about a deployed system.
Populate the receipt from application-controlled input and action records, not the model's recollection of what it used.
Keep it accurate when context changes or a deterministic fallback replaces generation, and describe any additional data the application sends.
Offer a route to inspect the source material and revise the selection criteria.

The receipt makes data use and selection inspectable; it does not itself enforce privacy or authorize an action.
Those boundaries still belong to the application, and the receipt should avoid exposing sensitive input values merely to demonstrate transparency.

### Field note — Constrain generation around the hard part

For [Slideotter](/case-studies/slideotter/), reliable layout was essential.
[Geometry](https://github.com/bebraw/slideotter/commit/f7d004f4), [text-fit](https://github.com/bebraw/slideotter/commit/684e4b7c), and [render-baseline](https://github.com/bebraw/slideotter/commit/79301707) checks appeared before the browser studio.

The [LLM authoring plan](https://github.com/bebraw/slideotter/commit/24d335ec) assigned intent and structured content to the model, validation and approval to the server, and rendering to the existing engine.
Its [schema-backed implementation](https://github.com/bebraw/slideotter/commit/fa56cd04) kept arbitrary executable components outside model output.
Preview, comparison, PDF export, and validation later converged on [one DOM renderer](https://github.com/bebraw/slideotter/blob/main/docs/adr/implemented/0015-dom-first-rendering-and-validation.md), so checks examined the layout users saw.

This left geometry, spacing, overflow, and media placement under application control while the model selected content and supported layouts.
[Declarative layout expansion](https://github.com/bebraw/slideotter/blob/main/docs/adr/implemented/0049-minimal-built-in-layouts-and-user-defined-layout-expansion.md) allowed variety within that contract.
I gave the model freedom around the property I needed the system to enforce reliably: layout.

## Descriptor boundary audit

Create one small event-summary data fixture and keep it unchanged.
Then:

1. Define the prop schema and payload for one fixed summary component.
2. Define minimal prop schemas for an approved registry such as `metric`, `eventList`, and `button`, plus a small action allowlist.
3. Express the same fixture as a declarative descriptor.
4. Reject unknown components, raw HTML or script, unregistered actions, controls without accessible names, and excessive nesting.
   For each rejection, name the enforcing layer, error, and test.
5. Use the fixed read-only summary as the fallback.
6. Identify the additional containment and evidence required before the application could execute model-generated code.

The descriptor schema and action vocabulary are [API contracts](/concepts/#contract).
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

## Endpoint and cache policy

Use these details when automated demand or fragmented cache reuse is a relevant pressure in the [Architecture chapter](/chapters/architecture/).

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

### Query parameters and cache identity

Query parameters can fragment the [cache](/concepts/#cache) even when the response is identical.
For example, `/offer?utm_source=newsletter` and `/offer?utm_source=search` may serve the same page but occupy separate cache entries.
The proposed `No-Vary-Search` response header lets an origin declare which query parameters a supporting cache may ignore when matching URLs:

```http
No-Vary-Search: params=("utm_source" "utm_medium")
```

With this policy, differences in those campaign parameters can permit reuse of a stored response, while a content-changing parameter such as `colour` still distinguishes responses.
Unlike `Vary`, which selects responses using request headers, `No-Vary-Search` concerns the URL's query component.
It changes matching, without rewriting the URL or relaxing storage, freshness, or validation requirements.

List only parameters known to be safe to ignore so that new, unknown parameters still distinguish responses.
Identical HTML is insufficient if reuse would bypass required server processing, such as authorization or signature verification.
An ignored parameter also cannot be relied on to bypass the cache for debugging.
As of September 2026, the [HTTP Working Group specification](https://httpwg.org/http-extensions/draft-ietf-httpbis-no-vary-search.html) remains a draft: verify syntax and behavior in the target caches before relying on it.
Harry Roberts's [practical introduction](https://csswizardry.com/2026/05/better-browser-caching-with-no-vary-search/) develops the campaign-URL example further.
