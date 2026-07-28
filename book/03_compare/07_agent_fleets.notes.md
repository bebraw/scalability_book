## Notes for further development

- Start from the idea that an agent-ready project is not a project with more AI sprinkled on top.
  It is a project where intent, constraints, and feedback are explicit enough that agents can operate without relying on hidden context.
- Introduce the phase as implementation C of the common brief.
  Say explicitly that a fleet is an orchestration topology using one or more declared models, not a model category.
- Make the primary comparison a foundation-model single agent versus a fleet using the same base model when possible.
  Hold the brief, acceptance tests, and evidence schema constant.
- Require students to justify why their selected tasks are decomposable.
  A valid fleet plan should identify independent or sequential units, interfaces between them, integration ownership, and a stopping condition.
- Add a “single-agent counterfactual” to the fleet report: which work did not benefit from delegation and what evidence suggests one agent or one human would have been preferable?
- Require fleet-specific measurements: duplicated exploration, number of handoffs, merge or integration failures, idle time, reviewer backlog, total model usage, active human integration time, and defects escaping individual agents.
- Use Amdahl's Law and backpressure to explain why fleet throughput is bounded by sequential work and human review capacity.
  Connect this directly to the book's formal scalability laws.
- Keep role names illustrative rather than mandatory.
  Grade the clarity of boundaries, permissions, outputs, and review—not whether students used `scout`, `planner`, `implementer`, and `reviewer` literally.
- Define what evidence from fleet execution is submitted.
  Prefer a compact task graph, selected trace, validation results, intervention log, and summary metrics over an uncurated transcript dump.
- Add a small trace-transformation example that maps a real fleet export to the common project model.
  Include failure, retry, review, and human-intervention events when the source tool exposes them.
- Show the distinction between state and history: a task may currently be complete even though its trace contains failed attempts, repeated work, rejected reviews, or expensive handoffs.
- Ask students to use their debugging view to answer two concrete questions about their own fleet rather than merely demonstrating that trace import works.
- Cover the practical foundations: fast tests, clear setup instructions, meaningful error messages, small modules, documented architecture, stable APIs, realistic seed data, and observable runtime behavior.
- Introduce project instructions through `AGENTS.md` or an equivalent mechanism.
  Suggested contents: project purpose, commands, coding conventions, testing expectations, architectural boundaries, forbidden operations, and review checklist.
- Show how Pi can load project-level instructions and reusable skills.
  Keep the example concrete: ask Pi to inspect the project, identify missing instructions, and propose an `AGENTS.md` draft.
- Include a before/after example where a vague task fails because the project is illegible, then succeeds after adding tests, task boundaries, and instructions.
- Make students define "safe task boundaries".
  A good agent task should state the objective, allowed files or modules, expected tests, and what must not change.
- Connect to evolvability: API contracts, migrations, feature flags, and compatibility tests make it safer for both humans and agents to change the system.
- Then move to fleets: a fleet is useful only when work can be decomposed and recombined.
  Parallel agents can increase throughput, but they also increase coordination cost.
- Use Pi as the hands-on environment for orchestration.
  Its docs and examples support custom skills, prompt templates, extensions, print/JSON mode, and subprocess-based subagent patterns.
- Add a short "three views of agent fleets" section:
  - Pi shows agent fleets as local development workflows.
  - Acolyte shows agent fleets as controlled runtimes with observable task execution.
  - Mastra shows agent fleets as application infrastructure that can be tested, evaluated, observed, and deployed.
- Suggested minimal fleet:
  - `scout`: read-only codebase reconnaissance and compressed findings.
  - `planner`: turns findings into an implementation plan and risk list.
  - `implementer`: makes one bounded change.
  - `reviewer`: reviews the diff, tests, regressions, and missing evidence.
- Emphasize role design.
  Each role should have a purpose, allowed tools, expected output, and failure mode.
  Students should learn that "more agents" is not automatically better.
- Demonstrate three workflows:
  - Scout then plan: useful before touching unfamiliar code.
  - Implement then review: useful for bounded changes.
  - Parallel scouts: useful when exploring independent subsystems.
- Include integration discipline.
  The student remains responsible for merging results, resolving conflicts, checking tests, and deciding whether the output satisfies the architectural intent.
- Discuss security and trust boundaries: project-local agents should be treated as executable project policy.
  Use them only in trusted repositories and review their prompts like code.
- Use Acolyte as a comparison point for agent-ready tooling.
  Its documentation emphasizes explicit runtime concepts such as sessions, tasks, lifecycle phases, tool contracts, workspace behavior, tracing, and memory.
  Develop this as an example of how good agent tooling mirrors good software architecture: clear boundaries, typed interfaces, observable behavior, and recoverable failures.
- Possible Acolyte angle: ask students to inspect what an agent runtime needs from a workspace before it can operate safely.
  This can lead into workspace detection, sandbox boundaries, permissions, test commands, lint commands, and traceable tool execution.
- Use Mastra to broaden the chapter beyond coding agents.
  The key point is that an agent fleet can also be a runtime system inside an application, not only a set of development assistants.
  This connects implementation C back to scalable web applications: deployed agents need workflows, observability, evaluation, access control, memory, deployment strategy, and operational ownership.
- Possible Mastra exercise extension: after students coordinate a coding-agent fleet, ask them to sketch how a production agent workflow would be tested and observed.
  They do not need to build the full system, but they should identify inputs, outputs, tools, state, evals, traces, failure handling, and deployment boundaries.
- Verify Acolyte-specific claims with the author.
  In particular, check how to describe its daemon architecture, task lifecycle, workspace sandboxing, SKILL.md support, memory model, and trace commands accurately.
- Verify Mastra-specific claims with the authors.
  In particular, check the best current way to describe Mastra workflows, evals, observability, Studio, Server, Memory Gateway, and framework integration.
- Add a comparison table for students:
  - Unit of work: prompt, task, workflow, agent, endpoint.
  - Context source: project files, memory, runtime state, retrieved data.
  - Control mechanism: instructions, tools, policies, tests, evals, permissions.
  - Observability: transcript, logs, traces, metrics, review artifacts.
  - Primary setting: development-time assistance, controlled agent runtime, production application.
- Replace the bounded-change assignment with a bounded fleet build of implementation C.
  The common brief should still be divided into reviewable tasks; students then evaluate whether delegation improved quality, speed, or understanding relative to implementation B.
- Obsidian candidate: `Clippings/_Processed/The Orchestration Tax.md` is a strong fit for the core warning that agent throughput is limited by human review throughput.
  It can support language around Amdahl's Law, backpressure, batching reviews, and scaling fleet size to review capacity rather than to tool availability.
- Obsidian candidate: `Clippings/_Processed/Harness engineering for coding agent users.md` is a strong fit for agent readiness.
  It gives vocabulary for feedforward guides, feedback sensors, computational checks, inferential checks, maintainability harnesses, architecture fitness harnesses, and behavior harnesses.
- Obsidian candidate: `Clippings/_Processed/A Survey on Large Language Model Impact on Software Evolvability and Maintainability the Good, the Bad, the Ugly, and the Remedy.md` can provide a research-backed caution that LLMs can improve analyzability, testing, repair, and comprehension while also introducing brittleness, hallucinated outputs, unstable behavior, and new technical debt.
- Obsidian candidate: `Clippings/_Processed/Durable Execution Solutions.md` can help connect development-time fleets to production agent systems: long-running agent workflows need retries, durable state, task queues, visibility, and recovery semantics.

## Project artifact

Students should produce implementation C and its bounded fleet workflow.
The artifact should include the declared base model, task graph, role definitions, allowed files or modules, expected outputs, integration ownership, validation commands, review criteria, one deterministic workflow probe, comparable workflow measurements, a transformed trace loaded into implementation C, and debugging findings showing where coordination failed or human judgment was required.

## Common mistake

The common mistake is to treat a fleet as a way to avoid thinking.
The useful version is the opposite: decomposition, constraints, evidence, and integration become more explicit because more work can happen in parallel.
