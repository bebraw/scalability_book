# How to coordinate agent fleets?

An agent fleet is a coordinated set of agents or agent roles working on parts of a larger task. Fleets can increase throughput when work decomposes cleanly, but they also introduce coordination cost. They work only when the project itself is legible enough that agents can operate without depending on hidden human context.

The central claim could be: more agents do not automatically mean more progress. Agentic development scales only when the project teaches agents how to work inside it and when roles, boundaries, artifacts, and review loops are explicit.

> **Optional: Sustainability angle**
>
> Parallel agents multiply compute use. A fleet is easier to justify when decomposition improves quality, reduces rework, or saves substantial human time. Clear setup, fast tests, stable commands, useful errors, and scoped tasks reduce wasted attempts and make each model call more likely to produce reviewable value.

## Chapter purpose

- Explain when agent fleets are useful and when they are unnecessary.
- Define what "agent-ready" means in practical project terms.
- Show how tests, documentation, conventions, setup, and architecture support agentic development.
- Teach role design for small development workflows.
- Show how to decompose and recombine work safely.
- Connect agent readiness, development-time fleets, and production agent systems.

## Working outline

1. Why agent readiness matters
   - AI tools can generate code quickly, but unclear projects make review and repair expensive.
   - Hidden assumptions become failure modes.
   - Agent readiness benefits humans too.
2. What makes a project agent-ready
   - `AGENTS.md` or equivalent project-level guidance.
   - Commands, conventions, architecture notes, test expectations, forbidden operations, and review checklist.
   - Fast tests, linting, type checks, seed data, local setup, realistic fixtures, and useful errors.
3. Why fleets are tempting
   - Parallel exploration, faster implementation, specialized review, and repeatable workflows.
4. Why fleets are risky
   - Conflicting edits, duplicated work, shallow understanding, context loss, and integration burden.
5. Minimal fleet roles
   - `scout`, `planner`, `implementer`, and `reviewer`.
6. Safe task design
   - Objective, context, allowed files, expected tests, non-goals, and acceptance criteria.
   - Small modules, stable APIs, explicit ownership, migrations, compatibility tests, and feature flags.
7. Workflow patterns
   - Scout then plan.
   - Implement then review.
   - Parallel scouts for independent subsystems.
8. Integration discipline
   - The human integrates findings, resolves conflicts, runs tests, and preserves architectural intent.
9. Tooling examples
   - Use Pi, Acolyte, and Mastra only after the principles are clear.
   - Present tools as examples of boundaries, traces, workflows, and reviewable execution.
10. Course project application
   - Students harden their event tracking project, use a small fleet for one bounded improvement, and submit evidence of the workflow.

---

## Notes for further development

- Start from the idea that an agent-ready project is not a project with more AI sprinkled on top. It is a project where intent, constraints, and feedback are explicit enough that agents can operate without relying on hidden context.
- Cover the practical foundations: fast tests, clear setup instructions, meaningful error messages, small modules, documented architecture, stable APIs, realistic seed data, and observable runtime behavior.
- Introduce project instructions through `AGENTS.md` or an equivalent mechanism. Suggested contents: project purpose, commands, coding conventions, testing expectations, architectural boundaries, forbidden operations, and review checklist.
- Show how Pi can load project-level instructions and reusable skills. Keep the example concrete: ask Pi to inspect the project, identify missing instructions, and propose an `AGENTS.md` draft.
- Include a before/after example where a vague task fails because the project is illegible, then succeeds after adding tests, task boundaries, and instructions.
- Make students define "safe task boundaries". A good agent task should state the objective, allowed files or modules, expected tests, and what must not change.
- Connect to evolvability: API contracts, migrations, feature flags, and compatibility tests make it safer for both humans and agents to change the system.
- Then move to fleets: a fleet is useful only when work can be decomposed and recombined. Parallel agents can increase throughput, but they also increase coordination cost.
- Use Pi as the hands-on environment for orchestration. Its docs and examples support custom skills, prompt templates, extensions, print/JSON mode, and subprocess-based subagent patterns.
- Add a short "three views of agent fleets" section:
  - Pi shows agent fleets as local development workflows.
  - Acolyte shows agent fleets as controlled runtimes with observable task execution.
  - Mastra shows agent fleets as application infrastructure that can be tested, evaluated, observed, and deployed.
- Suggested minimal fleet:
  - `scout`: read-only codebase reconnaissance and compressed findings.
  - `planner`: turns findings into an implementation plan and risk list.
  - `implementer`: makes one bounded change.
  - `reviewer`: reviews the diff, tests, regressions, and missing evidence.
- Emphasize role design. Each role should have a purpose, allowed tools, expected output, and failure mode. Students should learn that "more agents" is not automatically better.
- Demonstrate three workflows:
  - Scout then plan: useful before touching unfamiliar code.
  - Implement then review: useful for bounded changes.
  - Parallel scouts: useful when exploring independent subsystems.
- Include integration discipline. The student remains responsible for merging results, resolving conflicts, checking tests, and deciding whether the output satisfies the architectural intent.
- Discuss security and trust boundaries: project-local agents should be treated as executable project policy. Use them only in trusted repositories and review their prompts like code.
- Use Acolyte as a comparison point for agent-ready tooling. Its documentation emphasizes explicit runtime concepts such as sessions, tasks, lifecycle phases, tool contracts, workspace behavior, tracing, and memory. Develop this as an example of how good agent tooling mirrors good software architecture: clear boundaries, typed interfaces, observable behavior, and recoverable failures.
- Possible Acolyte angle: ask students to inspect what an agent runtime needs from a workspace before it can operate safely. This can lead into workspace detection, sandbox boundaries, permissions, test commands, lint commands, and traceable tool execution.
- Use Mastra to broaden the chapter beyond coding agents. The key point is that an agent fleet can also be a runtime system inside an application, not only a set of development assistants. This connects Deconstruct back to scalable web applications: deployed agents need workflows, observability, evaluation, access control, memory, deployment strategy, and operational ownership.
- Possible Mastra exercise extension: after students coordinate a coding-agent fleet, ask them to sketch how a production agent workflow would be tested and observed. They do not need to build the full system, but they should identify inputs, outputs, tools, state, evals, traces, failure handling, and deployment boundaries.
- Verify Acolyte-specific claims with the author. In particular, check how to describe its daemon architecture, task lifecycle, workspace sandboxing, SKILL.md support, memory model, and trace commands accurately.
- Verify Mastra-specific claims with the authors. In particular, check the best current way to describe Mastra workflows, evals, observability, Studio, Server, Memory Gateway, and framework integration.
- Add a comparison table for students:
  - Unit of work: prompt, task, workflow, agent, endpoint.
  - Context source: project files, memory, runtime state, retrieved data.
  - Control mechanism: instructions, tools, policies, tests, evals, permissions.
  - Observability: transcript, logs, traces, metrics, review artifacts.
  - Primary setting: development-time assistance, controlled agent runtime, production application.
- Possible assignment: students add project instructions, create a repeatable setup/test command, improve one weak feedback loop, run a small fleet on one bounded project change, preserve the transcript or summary, and evaluate whether the workflow improved quality, speed, or understanding.

## Project artifact

Students should produce agent project instructions and one bounded fleet workflow. The artifact should include role definitions, allowed files or modules, expected outputs, validation commands, review criteria, and a short trace showing where human judgment was required.

## Common mistake

The common mistake is to treat a fleet as a way to avoid thinking. The useful version is the opposite: decomposition, constraints, evidence, and integration become more explicit because more work can happen in parallel.
