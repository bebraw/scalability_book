## Chapter purpose

- Bridge the comparison from implementation A to implementation B.
- Help students identify what breaks first when scale and uncertainty increase.
- Introduce failure modes that appear outside local development.
- Teach students to reason from pressure rather than from fashionable architecture patterns.

## Notes for further development

- Add a concise incident narrative that can be reused in lecture.
- Connect this chapter to benchmarking: measurement reveals some forms of reality before users do.
- Connect this chapter to scaling: the next part should introduce specific techniques only after the pressure is clear.
- Keep changed assumptions as a shared thought experiment or pressure test applied to all three implementations.
  Do not make them a license to change the common functional scope of implementation B.
- Distinguish the immutable acceptance core from scalability scenarios.
  The implementation must satisfy the former; students use the latter to explain what would fail and how the architecture could respond.
- Ask students to compare whether the local and foundation-model implementations exposed different failure assumptions, and whether those differences came from architecture, generated defaults, or team decisions.
- Preserve identical pressure-map headings across phases so the final analysis can compare event volume, concurrency, storage growth, retries, partial failure, and eventual correctness directly.
- Add one prompt about development reality: what happens when model access, latency, privacy requirements, cost, or human review capacity changes?

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
