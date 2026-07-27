# How does web architecture shape scalability?

This chapter should connect the course project to the web as an architectural environment. Students often experience web development as a collection of frameworks, libraries, and deployment platforms, but scalable web applications are shaped by older and deeper constraints: clients and servers, requests and responses, networks, latency, caches, URLs, protocols, browsers, APIs, and failure.

The central claim could be: web architecture is not neutral plumbing. It gives us constraints and affordances, and scalable systems are built by working with those constraints rather than pretending they do not exist.

## Chapter purpose

- Explain the web as a distributed system.
- Show how browser, server, network, and database boundaries shape application design.
- Introduce API contracts as long-lived interfaces between independently changing parts.
- Connect web architecture to the event tracking project without requiring one fixed application theme.
- Use the completed Construct implementations as concrete architecture cases.
- Prepare students to make and explain architectural choices in implementation B.

## Why web architecture matters

Ideas to develop:

- A local app can hide many problems because everything is close together. A web app cannot.
- Every request crosses a boundary: process, machine, network, organization, or trust.
- Latency, retries, partial failure, caching, and authentication are architectural facts.
- Frontend and backend code change at different speeds and often have different owners.
- APIs become commitments. Once clients depend on them, changing them becomes expensive.

Possible event tracking example:

- Recording an event looks simple in the UI, but it crosses the browser, network, authentication layer, API handler, validation logic, storage layer, and possibly analytics.
- Each boundary can fail or interpret data differently.
- A scalable design makes these boundaries explicit.

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

The demonstration below traces one `POST /events` request through the browser, network, API, storage, and response path. The goal is to make boundaries visible: each one has an owner, a failure mode, and a contract that future clients, humans, and agents may depend on.

{{ import "site/includes/request-trace-demo.html" }}

Use this before drawing the architecture diagram. If the request path is unclear, the diagram is likely to hide the most important architectural decisions.

## Constraints of the web

Potential subsections:

- **Stateless requests**: why statelessness helps scaling, and where state still exists.
- **Latency**: why physical distance and network hops matter.
- **Partial failure**: why the client, server, database, and third-party services can disagree.
- **Concurrency**: why two users can act at the same time and produce unexpected states.
- **Caching**: why caches improve performance but complicate freshness and invalidation.
- **Security boundaries**: why every client input must be treated as untrusted.
- **Compatibility**: why deployed clients and existing API consumers cannot be updated instantly.

> **Sustainability angle**
>
> Architecture determines resource flow. Chatty APIs, unnecessary round trips, oversized payloads, heavy client bundles, and aggressive polling all turn design choices into recurring resource use. Good web architecture reduces waste by making useful work explicit and avoiding repeated work where possible.

## API design as architecture

Ideas to develop:

- APIs are not only technical endpoints; they are contracts between parts of the system.
- Good APIs make common behavior easy and invalid behavior hard.
- Versioning, idempotency, validation, pagination, filtering, and error shape matter.
- An event ingestion API should handle duplicate submissions, delayed events, invalid timestamps, and unknown event types.
- Query APIs may need different models than write APIs.

Possible exercise:

- Design a minimal `POST /events` endpoint and a minimal `GET /events` endpoint.
- Then ask what changes when the app must handle retrying clients, offline devices, many tenants or domain instances, or analytical summaries.

## Learning from the Construct architectures

Students have already made architecture choices in Construct, even if they did not yet have a complete vocabulary for them. The public project discussion should make those choices visible: different groups received the same behavioral specification but chose different stacks, boundaries, storage models, and request paths.

Architecture should not live only in diagrams or in the memory of the original authors. In an AI-assisted project, architectural intent also has to be written in places that future contributors and agents will actually read. Otherwise, the next generated change can accidentally redefine the system by changing behavior without changing the explanation.

Each implementation should therefore treat a small set of project memory files as architectural artifacts:

- `ARCHITECTURE.md` records global rules and cross-cutting constraints, such as the chosen application shape, storage model, validation boundaries, deployment assumptions, and rules future changes should preserve.
- `specs/{feature}/spec.md` records feature-level contracts, workflows, regression guardrails, and verification steps. For the event tracking project, the first spec should usually describe how an event is created, validated, stored, and viewed.
- `docs/adrs/` or a simple decision log records durable decisions and trade-offs. Students do not need an ADR for every small change, but they should record decisions that future groups would otherwise have to rediscover.
- `AGENTS.md` records how AI tools should operate in the repository. It can name required commands, review expectations, files that must not be overwritten, and when the agent should ask before changing the project shape.

This documentation is not separate from architecture. It is part of how the architecture remains understandable after the first implementation is done. If the code, diagram, spec, and decision log disagree, the project has an architectural problem even if the application still runs.

Prompts:

- What are the main components of your system?
- Where does validation happen?
- Where is event data stored?
- What does the frontend assume about the backend?
- Which behavior is fixed by the common specification, and which boundary was an implementation choice?
- Which part of the design would be hardest to change later?
- Which architectural decisions have been written down so another group can understand them?
- Which agent instructions protect the architecture from accidental drift?

## Project artifact

Students should review the architecture and data-flow diagrams submitted with implementation A, identify one consequential architectural choice, and write an architecture hypothesis for implementation B. The hypothesis should state what the group intends to preserve or change and why. Implementation B should still include its own diagrams and decision record, but the chapter is primarily reading and analysis rather than a second large deliverable.

## Notes for further development

- Add one diagram showing a request path for recording an event.
- Add one diagram showing data flow from event creation to viewing.
- Include a short warning against framework-first architecture: frameworks are useful, but they do not remove distributed-system constraints.
- Consider adding references on REST, HTTP semantics, idempotency, and web application architecture.
- Recast the architecture artifact as a per-build artifact with a shared notation or template. Students should be able to place the three diagrams side by side in the final comparison.
- Add prompts that separate architecture chosen by the group from architecture suggested or generated by the model. Ask what evidence shows the group understood and validated the choice.
- Keep API behavior and core data semantics stable in the common acceptance suite while allowing internal architecture to differ. This creates a meaningful comparison without forcing identical implementations.
- Replace questions about which interface survives into the “next phase” with questions about which interface should remain invariant across independent builds and why.
- Use the cross-team audit to test whether diagrams, decisions, and running behavior agree. The audit should report disagreement rather than inherit responsibility for repairing it.
- Keep the chapter suitable for reading before lecture 4. In class, prefer comparing submitted Construct diagrams and request paths over repeating the full chapter as a lecture.
- Obsidian candidate: `Clippings/_Processed/Emerging trends in software architecture from the practitioner’s perspective A five-year review.md` could provide a practitioner-facing reference for why cloud native, Kubernetes, serverless, containers, DevOps, AI, and observability keep appearing in architecture discussions. It may work best as context, not as a technology checklist students should copy.
- Obsidian candidate: `Clippings/_Processed/Durable Execution Solutions.md` could be used later in the chapter or previewed here as an example of architecture shaped by retries, task queues, timers, state recovery, and long-running workflows.
