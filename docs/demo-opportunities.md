# Demo Opportunities

This note captures possible future demonstrations that could clarify book concepts. The book already has demos for project fit, model evaluation, workflow loops, friction audit, agent delegation, scaling pressure, and latency budgets, so new demos should only be added where interaction makes an abstract concept easier to reason about.

## Recommended Priority

1. **Changed assumptions / pressure map**
2. **Request path / boundary trace**
3. **Scalability dimensions vote / trade-off radar**
4. **Observability signal picker**
5. **Final reflection package builder**

## Changed Assumptions / Pressure Map

Chapter: `book/02_reconstruct/06_reality.md`

This is the strongest missing Reconstruct demo. The chapter asks students to move from "the app works" to "the environment changed", but that shift is still mostly textual.

Possible interaction:

- Start with a simple Construct event-tracking design.
- Toggle changed assumptions such as burst traffic, offline retries, multiple tenants, malformed old clients, deletion requests, or slow summaries.
- Show the stressed component, likely failure mode, first observable signal, and possible response.

Why it helps: it teaches students to reason from pressure before choosing a pattern. It also bridges friction and benchmarking into the later scaling chapter.

## Request Path / Boundary Trace

Chapter: `book/01_construct/03_architecture.md`

The architecture chapter explains the web as a distributed system, but it would benefit from a concrete trace of one event creation request.

Possible interaction:

- Trace `POST /events` through browser, network, API handler, validation, database, logs, and response.
- Toggle retries, duplicate submissions, server-side validation, database timeout, queueing, or caching.
- Show how each boundary introduces latency, failure, ownership, and contract concerns.

Why it helps: students can see that architecture is not a framework choice. It is a set of boundaries that shape what can fail and what can evolve independently.

## Scalability Dimensions Vote / Trade-Off Radar

Chapter: `book/01_construct/02_what_is_scalability.md`

The chapter already notes that students could vote on scalability dimensions. This would be useful early because it establishes that scalability is not one axis.

Possible interaction:

- Students choose which pressure matters most for an event-oriented application: users, data, teams, change, cost, or energy.
- The demo shows which parts of the system are stressed and which trade-offs appear.
- The output becomes a scalability dimensions checklist for the project.

Why it helps: it gives students a shared vocabulary before they encounter friction, observability, agent fleets, and runtime scaling.

## Observability Signal Picker

Chapter: `book/02_reconstruct/05_benchmarking.md`

The chapter already has a small model eval demonstration. A separate observability demo could teach evidence selection.

Possible interaction:

- Present a symptom such as "event summaries are stale" or "users report missing events".
- Let students choose logs, metrics, traces, benchmark data, user-visible errors, or database inspection.
- Show which signals answer the question and which are noisy or misleading.

Why it helps: students learn that measurement is not "collect everything". It is choosing evidence that answers a specific operational question.

## Final Reflection Package Builder

Chapter: `book/03_deconstruct/09_recap.md`

This should be lightweight. The goal is not another simulation but a capstone tool that helps students assemble evidence from the course.

Possible interaction:

- Students select evidence from earlier artifacts: architecture decision, changed assumption, friction audit, benchmark, workflow evidence, scaling trade-off, and remaining risk.
- The demo assembles a final reflection outline.
- Missing evidence is flagged explicitly.

Why it helps: it turns the course arc into a concrete deliverable and reinforces that claims about scalability need evidence.

## Implementation Notes

- Prefer staged demos that match the existing site pattern.
- Keep each demo tied to a project artifact so interaction produces something students can reuse.
- Avoid demos that only visualize a concept without changing what students can do.
- Prioritize the pressure map and boundary trace before adding recap tooling.
