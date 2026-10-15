## Chapter purpose

This chapter follows one practical progression:

1. expand a development workflow from one agent to a small fleet
2. use documented web-development cases to identify benefits and failure points
3. build a bounded fleet for implementation C
4. expose a cross-layer defect and practice correction through the web boundary
5. measure coordination cost through acceptance and inspect the transformed trace in C

Use Chapter 2’s constrain–generate–validate–revise loop throughout; task-graph dependencies are an instance of the loop, not another stage vocabulary.
Keep Amdahl’s Law, integration failure, correction, and measured coordination on the main path.
Distinguish executing agents from started changes awaiting human acceptance; the optional work-in-progress comparison varies admission while keeping the worker limit fixed and records actual concurrency separately.
The memory, contract-completeness, and human review-gate exercises are linked extensions in Appendix D.

Revisit the [secondary teaching intention](../00_introduction.notes.md#secondary-teaching-intention-from-prompting-to-loops): show how an existing workflow can continue, verify, and repair within a budget without a fresh human prompt for every routine step.
Use this as a teaching opportunity within the existing fleet work, with explicit escalation and human acceptance.

## Notes for further development

- Add a small trace-transformation example that maps an export from the assigned fleet harness to the common project model.
  Include failure, retry, review, and human-intervention events when the source tool exposes them.
- Show the distinction between state and history: a task may currently be complete even though its trace contains failed attempts, repeated work, rejected reviews, or expensive handoffs.
- Include a before/after example where a vague task fails because the project is illegible, then succeeds after adding tests, task boundaries, and instructions.
- Connect the fleet discussion more explicitly to evolvability: API contracts, migrations, feature flags, and compatibility tests make it safer for humans and agents to change the system.
- Consider Acolyte as a future comparison point for a controlled agent runtime.
  Verify its daemon architecture, task lifecycle, workspace sandboxing, SKILL.md support, memory model, and trace commands with the author before making specific claims.
- Consider Mastra as a future extension about production agent workflows inside web applications.
  Verify its current workflows, evals, observability, Studio, Server, Memory Gateway, and framework integration with the authors before making specific claims.
- Obsidian candidate: `Clippings/_Processed/The Orchestration Tax.md` can support the discussion of review backpressure and scaling fleet size to review capacity.
- Obsidian candidate: `Clippings/_Processed/Harness engineering for coding agent users.md` can sharpen the vocabulary for project guidance and feedback mechanisms.
- Obsidian candidate: `Clippings/_Processed/A Survey on Large Language Model Impact on Software Evolvability and Maintainability the Good, the Bad, the Ugly, and the Remedy.md` can provide a research-backed maintainability caution.
- Obsidian candidate: `Clippings/_Processed/Durable Execution Solutions.md` can connect development-time fleets to durable production workflows.

## Common mistake

The common mistake is to treat a fleet as a way to avoid thinking.
The useful version is the opposite: decomposition, constraints, evidence, and integration become more explicit because more work can happen in parallel.
