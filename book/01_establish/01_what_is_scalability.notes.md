## Chapter purpose

- Define scalability as a relationship between a named pressure and a maintained goal.
- Give the course a stable four-pressure vocabulary: demand, data, contributors, and change.
- Separate what grows from architecture and infrastructure choices made in response.
- Distinguish scalability from performance, elasticity, resilience, and efficiency.
- Introduce the pressure–limit–response–trade-off–evidence chain used by later chapters.
- Produce bounded runtime and development-system claims that the Benchmarking chapter can operationalize.

## Implemented spine

1. Replace “Can it scale?” with a bounded claim containing a goal, pressure, scenario, boundary, evidence, and constraints.
2. Establish the event tracker's useful behavior before discussing growth.
3. Examine demand, data, contributors, and change as distinct but interacting pressures.
4. Trace one demand spike across browser, HTTP, execution, authority, derived views, and operations.
5. Treat architecture and infrastructure as responses and product priorities and constraints as decision inputs.
6. Distinguish performance, scalability, elasticity, resilience, and efficiency.
7. Use the causal chain `pressure → binding limit → response → trade-off → evidence` for runtime and development examples.
8. Explain premature scaling as choosing a response before identifying the pressure, goal, or limit.
9. Use the dimensions lab to form claims rather than recommend architecture.
10. Produce one runtime and one development-system claim for implementation A.

## Scope and consistency notes

- Keep the four pressure labels aligned across the reader table, interactive lab, project artifact, and later comparison rubric.
- The lab uses deterministic teaching weights and must not imply that independent dimensions can be reduced to one measured score.
- Business value, sustainability, privacy, regulation, cost, hardware, time, and expertise remain constraints or outcome criteria rather than growth axes in this taxonomy.
- Architecture and infrastructure may themselves become complex, but in this chapter they are treated as response surfaces so students do not confuse a mechanism with the pressure it addresses.
- Agents appear in two roles: as web consumers that can increase demand and as development contributors that can increase coordination pressure.
- Preserve the difference between a bounded local claim and a universal promise.

## Notes for further development

- Connect the two scalability claims directly to fields in the common specification and final comparison rubric.
- Decide whether the Establish project discussion should require every group to show one challenged claim and explain which assumed limit was wrong.
- Add a compact visual only if students struggle to distinguish the four pressures from response surfaces and constraints; the table and lab currently cover that relationship.
- Keep model configuration, hardware, privacy, availability, context, and latency visible as constraints in both assigned environments.
  Treat model size and inference location as separate variables; both assigned models may be department-hosted.
- Use the chapter's multiple dimensions to prevent the AI comparison from swallowing runtime behavior.
  Every implementation should still address comparable web pressures.
- Obsidian candidate: `Clippings/_Processed/A Survey on Large Language Model Impact on Software Evolvability and Maintainability the Good, the Bad, the Ugly, and the Remedy.md` could support the contributor and change dimensions.
- Obsidian candidate: `Clippings/_Processed/Every layer of review makes you 10x slower.md` could support a carefully bounded discussion of review queues, coordination latency, and modularity.
