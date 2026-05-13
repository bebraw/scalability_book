# How to build an agent-ready project?

TODO

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
