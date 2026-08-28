## Chapter purpose

- Show why local correctness leaves production assumptions untested.
- Ground failure and recovery in documented incidents from Discord, GitHub, Fastly, and Cloudflare.
- Trace failure across consumer, network, execution, data-authority, and operational boundaries.
- Separate user symptoms, saturation signals, amplification, integrity, and recovery evidence.
- Bridge implementations A and B without previewing the Scaling chapter's technique catalog.

## Implemented spine

1. Local correctness versus the production environment.
2. A linked table of four documented web incidents.
3. A cross-case synthesis focused on retry amplification, data authority, global blast radius, and recovery-plane independence.
4. One event-tracker failure traced across the web boundary.
5. Signals, competence envelopes, and saturation.
6. Recovery modes and recovery-plane independence.
7. Pressure-map synthesis and a case transfer across implementations A and B.

## Notes for further development

- Connect this chapter to benchmarking: measurement reveals some forms of reality before users do.
- Keep changed assumptions as a shared thought experiment or pressure test applied to all three implementations.
  Do not make them a license to change the common functional scope of implementation B.
- Distinguish the immutable acceptance core from scalability scenarios.
  The implementation must satisfy the former; students use the latter to explain what would fail and how the architecture could respond.
- Ask students to compare whether the local and foundation-model implementations exposed different failure assumptions, and whether those differences came from architecture, generated defaults, or team decisions.
- Preserve identical pressure-map headings across phases so the final analysis can compare event volume, concurrency, storage growth, retries, partial failure, and eventual correctness directly.
- Add one prompt about development reality: what happens when model access, latency, privacy requirements, cost, or human review capacity changes?
- Keep the company-authored case-study caveat visible and avoid presenting source-reported figures as transferable performance expectations.
- If a case is replaced later, preserve coverage of retry amplification, data authority, global change propagation, and recovery-plane independence.
- A future practical exercise could use bounded fault injection to challenge one selected production assumption.
  Require a steady-state expectation, narrow blast radius, abort condition, recovery path, and evidence plan; keep it distinct from a load benchmark and do not present failure injection as proof that untested combinations are safe.

## Reader material moved during the case-study rewrite

### Generic pressure taxonomy

The table below was replaced by documented cases but remains useful as a planning taxonomy.

| Pressure              | Assumption it exposes                                                | First signals                                                      | Prepared response                                                               |
| --------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| More users            | Request handling and identity services absorb concurrent peaks       | Tail latency, `429` responses, authentication failures, abuse load | Load-test peaks; define admission control, rate limits, and degradation         |
| More events           | Data can grow without changing query cost or retention needs         | Slow queries, storage growth, index maintenance, stale summaries   | Index measured access paths; define aggregation, archival, and retention        |
| More domain instances | Shared capacity remains isolated, configurable, and fairly allocated | Noisy-neighbor latency, uneven queues, permission exceptions       | Enforce tenant boundaries, quotas, partitioning rules, and scoped configuration |
| More failures         | A timed-out or retried operation does not create a new side effect   | Duplicates, retry storms, growing queues, delayed work             | Use idempotency, bounded backoff, failure isolation, and observable recovery    |
| More stakeholders     | The original data, access model, and ownership satisfy later needs   | Manual exports, access exceptions, audit gaps, ownerless incidents | Name owners; define reporting, access-control, audit, and support contracts     |
| More change           | Producers, consumers, schemas, and dependencies evolve together      | Version skew, failed migrations, repeated compatibility breakage   | Design compatible evolution, staged migration, verification, and rollback       |

### Scaling technique bridge

Before students complete implementation B, they need a compact vocabulary for responding to pressure.

Useful bridge concepts:

- **Write path and read path**: recording events and viewing summaries may need different designs.
- **Raw events and derived views**: store what happened before computing summaries that can be rebuilt.
- **Queues and background work**: absorb bursts when immediate processing is not required.
- **Idempotency and deduplication**: make retries safe when clients or networks fail.
- **Partitioning by domain boundary**: separate tenants, projects, groups, locations, or other units of scale.
- **Backpressure and rate limiting**: protect the system when demand exceeds capacity.
- **Graceful degradation**: decide what can be delayed, approximated, or temporarily disabled.
- **Operational optionality**: prepare safe ways to shed work, change a limit, disable a feature, scale a dependency, roll back, or fix forward.
- **Operational signals**: define which metric would show overload first.

## Drafting scaffold moved from reader content

- This chapter helps students challenge implementation A while they form and evaluate the architectural hypothesis behind implementation B.
- The central claim could be: systems rarely fail because one textbook pattern was missing.
  They fail because their original assumptions no longer match their operating environment.

### Scenario ideas

- A domain-specific peak happens and thousands of users or devices submit events during the same 20-minute window.
- The network is unreliable, causing clients to retry submissions.
- Users need summaries before the data has fully settled.
- A customer asks to delete personal or sensitive data after the activity has ended.
- Multiple tenants or domain instances run at the same time and one large instance should not slow down another.
- An older client version submits malformed events.
- In a workflow-platform domain, many workflow runs start at once, long-running nodes block synchronous execution, tool calls fail or rate-limit, and users need traceable run history rather than immediate success.

Each scenario can be used to ask:

- What breaks first?
- What data can be lost, delayed, or duplicated?
- What does the user see?
- What does the operator see?
- What design choice from implementation A caused or softened the problem?

### Designing from failure

Ideas to develop:

- Accept that failure is normal in distributed systems.
- Prefer idempotent operations where clients may retry.
- Separate ingestion from processing when write spikes matter.
- Use queues or buffers when immediate processing is unnecessary.
- Store raw events before deriving summaries.
- Make delayed correctness explicit.
- Design error states and recovery paths, not only successful paths.

### Scaling bridge

- This chapter introduces the ideas lightly; the later scaling chapter applies them consistently across all three implementations.
- The goal is not for students to apply every technique.
  The goal is for them to complete implementation B with enough vocabulary to explain why one pressure deserves one response and not another.

### Exercise ideas

- Run a postmortem for a fictional event tracking outage.
- Ask students to write the top five assumptions in implementation A and mark which are challenged by the shared pressure scenarios.
- Have students draw a "pressure map" showing which component is stressed by which new requirement.
- Ask an agent to propose failure scenarios, then have students rank them by likelihood and impact.
