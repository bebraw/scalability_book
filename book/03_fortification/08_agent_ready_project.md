# How to build an agent-ready project?

An agent-ready project is a project where intent, constraints, and feedback are explicit enough that an agent can contribute without depending on hidden human context. This does not mean the agent is trusted blindly. It means the project gives both humans and agents enough structure to make changes inspectable, bounded, and reversible.

The central claim could be: agentic development scales only when the project itself teaches agents how to work inside it.

> **Optional: Sustainability angle**
>
> Agent-ready projects can reduce wasted agent work. Clear setup, fast tests, stable commands, useful errors, and scoped tasks prevent repeated failed attempts and make each model call more likely to produce reviewable value.

## Chapter purpose

- Define what "agent-ready" means in practical project terms.
- Show how tests, documentation, conventions, setup, and architecture support agentic development.
- Connect agent readiness to technical debt and development scalability.
- Give students a concrete checklist they can apply to their course project.

## Working outline

1. Why agent readiness matters
   - AI tools can generate code quickly, but unclear projects make review and repair expensive.
   - Hidden assumptions become failure modes.
   - Agent readiness benefits humans too.
2. Project instructions
   - `AGENTS.md` or equivalent project-level guidance.
   - Commands, conventions, architecture notes, test expectations, forbidden operations, and review checklist.
3. Feedback loops
   - Fast tests, linting, type checks, seed data, local setup, realistic fixtures, and useful errors.
4. Boundaries
   - Small modules, stable APIs, explicit ownership, migrations, compatibility tests, and feature flags.
5. Safe task design
   - Objective, context, allowed files, expected tests, non-goals, and acceptance criteria.
6. Tooling examples
   - Pi as a local coding-agent harness.
   - Acolyte as an example of controlled and observable agent execution.
7. Course project application
   - Students harden their event tracking project so future agent work is safer.

---

## Notes for further development

- Explain that an agent-ready project is not a project with more AI sprinkled on top. It is a project where intent, constraints, and feedback are explicit enough that agents can operate without relying on hidden context.
- Cover the practical foundations: fast tests, clear setup instructions, meaningful error messages, small modules, documented architecture, stable APIs, realistic seed data, and observable runtime behavior.
- Introduce project instructions through `AGENTS.md` or an equivalent mechanism. Suggested contents: project purpose, commands, coding conventions, testing expectations, architectural boundaries, forbidden operations, and review checklist.
- Show how Pi can load project-level instructions and reusable skills. Keep the example concrete: ask Pi to inspect the project, identify missing instructions, and propose an `AGENTS.md` draft.
- Include a before/after example where a vague task fails because the project is illegible, then succeeds after adding tests, task boundaries, and instructions.
- Make students define "safe task boundaries". A good agent task should state the objective, allowed files or modules, expected tests, and what must not change.
- Connect to evolvability: API contracts, migrations, feature flags, and compatibility tests make it safer for both humans and agents to change the system.
- Use Acolyte as a comparison point for agent-ready tooling. Its documentation emphasizes explicit runtime concepts such as sessions, tasks, lifecycle phases, tool contracts, workspace behavior, tracing, and memory. Develop this as an example of how good agent tooling mirrors good software architecture: clear boundaries, typed interfaces, observable behavior, and recoverable failures.
- Possible Acolyte angle: ask students to inspect what an agent runtime needs from a workspace before it can operate safely. This can lead into workspace detection, sandbox boundaries, permissions, test commands, lint commands, and traceable tool execution.
- Verify Acolyte-specific claims with the author. In particular, check how to describe its daemon architecture, task lifecycle, workspace sandboxing, SKILL.md support, memory model, and trace commands accurately.
- Possible assignment: students add project instructions, create a repeatable setup/test command, and improve one weak feedback loop that would otherwise make agent work risky.
