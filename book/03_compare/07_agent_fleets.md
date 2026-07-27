# How do we coordinate agent fleets?

An agent fleet is a coordinated set of agents or agent roles working on parts of a larger task.
Fleets can increase throughput when work decomposes cleanly, but they also introduce coordination cost.
They work only when the project itself is legible enough that agents can operate without depending on hidden human context.

The central claim could be: more agents do not automatically mean more progress.
Agentic development scales only when the project teaches agents how to work inside it and when roles, boundaries, artifacts, and review loops are explicit.

> **Sustainability angle**
>
> Parallel agents multiply compute use.
> A fleet is easier to justify when decomposition improves quality, reduces rework, or saves substantial human time.
> Clear setup, fast tests, stable commands, useful errors, and scoped tasks reduce wasted attempts and make each model call more likely to produce reviewable value.

## Chapter purpose

- Explain when agent fleets are useful and when they are unnecessary.
- Define what "agent-ready" means in practical project terms.
- Show how tests, documentation, conventions, setup, and architecture support agentic development.
- Teach role design for small development workflows.
- Show how to decompose and recombine work safely.
- Apply Amdahl's Law to parallel agent work and sequential integration or review.
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

## Fleet throughput and cost

An agent fleet is a production system for changes, so its throughput should be measured at the system boundary rather than at the code-generation step.
A provocative industry formulation in [We are now factory engineers, not product engineers](https://www.warp.dev/blog/we-are-now-factory-engineers-not-product-engineers) defines factory efficiency roughly as shipped product divided by inference cost plus human time.
The exact formula is too simple to stand as a general metric: shipped features are not automatically valuable, and quality, risk, maintenance, and environmental costs can be displaced beyond the measurement window.
It is nevertheless a useful prompt.
Students should count review, correction, integration, failed runs, and monitoring instead of treating generated code as completed work.

This view also explains why additional agents can reduce rather than increase effective throughput.
Parallel generation creates a queue for human judgment, integration, and verification.
Fleet size should follow the system's review capacity and the independence of the available tasks.
If two agents need the same files, hidden assumptions, or reviewer at the same time, their apparent parallelism may only move waiting and conflict downstream.

### Amdahl's Law and the sequential bottleneck

Amdahl's Law gives a simple upper bound on speedup when only part of the work can run in parallel.
If `p` is the parallelizable share of the work and `N` agents execute that share, the idealized speedup is:

`S(N) = 1 / ((1 - p) + p / N)`

If half of a workflow is inherently sequential, unlimited agents cannot make the entire workflow more than twice as fast.
In software development, framing the task, changing a shared interface, integrating overlapping edits, reviewing risk, and accepting the final result often remain sequential.
Real fleets perform below the ideal bound because communication, duplicated exploration, conflicts, and waiting add overhead that the basic formula does not model.

Students should estimate the parallel and sequential portions of one fleet workflow, calculate the ideal bound, and then compare it with observed elapsed time and human review effort.
The difference is evidence about coordination cost, not proof that the law failed.

## Trust boundaries

An agent's role should define not only its task but also which information it can read and which actions it can take.
Simon Willison's [lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) names a particularly dangerous combination: access to private data, exposure to untrusted content, and a way to communicate externally.
Prompt injection in the untrusted content can then turn the agent's legitimate permissions into a path for data exfiltration.

The safest design is to break the combination where possible.
A scout reading untrusted issues may not need secrets or network-writing tools.
An implementer may work in a sandbox with scoped files and no deployment credentials.
A publisher may receive a reviewed artifact instead of the full private context that produced it.
Human approval can help at a sensitive boundary, but an approval prompt is not useful when the effect is unclear or reviewers have learned to accept it mechanically.

## Delegation lab

A useful live demonstration should make the coordination cost visible.
The point is not to show that four agents are better than one.
The point is to let students try a task, choose roles, see the review burden, and produce a delegation brief that can be used in their own project.

{{ import "site/includes/agent-fleet-demo.html" }}

The demonstration should be used as a rehearsal before students run real agents.
If the task is vague, the project is not ready, or the chosen roles produce overlapping work, the best outcome is to reduce the fleet.
A small, reviewable delegation is usually better than parallel activity that the student cannot integrate.

The fleet should be evaluated as a workflow, not as a collection of impressive transcripts.
Reuse the model-eval pattern from the benchmarking chapter: define a small set of representative tasks, add deterministic probes for expected artifacts and validation commands, inspect the failing task, and record cost, latency, and human review time.
For a fleet, the execution trace is also evidence.
It can reveal duplicated exploration, unnecessary handoffs, invalid tool calls, or an implementer working beyond its boundary even when the final answer looks acceptable.
A single-agent and fleet run on the same bounded task can support a local decision about whether delegation paid for its coordination cost.

In the course project, this trace becomes application data.
The fleet run maps to a workspace, delegated tasks map to work items, agents and humans map to actors, and execution details map to activity events.
By loading a transformed trace into implementation C, students turn the application into a debugging and observability tool for the workflow that produced it.
The goal is not to build a universal agent platform.
It is to use event history, filters, summaries, and selected relationships to find coordination failures that the final code alone does not reveal.

---

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
