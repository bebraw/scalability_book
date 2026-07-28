# How to coordinate agent fleets?

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

Amdahl's Law gives a simple upper bound on speedup when only part of the work can run in parallel :citep[amdahl1967validity].
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

## References

::bibliography[]
