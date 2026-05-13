# How to coordinate agent fleets?

An agent fleet is a coordinated set of agents or agent roles working on parts of a larger task. Fleets can increase throughput when work decomposes cleanly, but they also introduce coordination cost. The student remains responsible for task design, integration, review, and final judgment.

The central claim could be: more agents do not automatically mean more progress. Agent fleets work only when roles, boundaries, artifacts, and review loops are explicit.

## Chapter purpose

- Explain when agent fleets are useful and when they are unnecessary.
- Teach role design for small development workflows.
- Show how to decompose and recombine work safely.
- Connect development-time fleets to production agent systems.

## Working outline

1. Why fleets are tempting
   - Parallel exploration, faster implementation, specialized review, and repeatable workflows.
2. Why fleets are risky
   - Conflicting edits, duplicated work, shallow understanding, context loss, and integration burden.
3. Minimal fleet roles
   - `scout`, `planner`, `implementer`, and `reviewer`.
4. Workflow patterns
   - Scout then plan.
   - Implement then review.
   - Parallel scouts for independent subsystems.
5. Integration discipline
   - The human integrates findings, resolves conflicts, runs tests, and preserves architectural intent.
6. Tooling examples
   - Pi for local orchestration.
   - Acolyte for controlled runtime execution.
   - Mastra for production agent infrastructure.
7. Course project application
   - Students use a small fleet for one bounded improvement and submit evidence of the workflow.

---

## Notes for further development

- Start from the idea that a fleet is useful only when work can be decomposed and recombined. Parallel agents can increase throughput, but they also increase coordination cost.
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
- Use Mastra to broaden the chapter beyond coding agents. The key point is that an agent fleet can also be a runtime system inside an application, not only a set of development assistants. This connects Fortification back to scalable web applications: deployed agents need workflows, observability, evaluation, access control, memory, deployment strategy, and operational ownership.
- Possible Mastra exercise extension: after students coordinate a coding-agent fleet, ask them to sketch how a production agent workflow would be tested and observed. They do not need to build the full system, but they should identify inputs, outputs, tools, state, evals, traces, failure handling, and deployment boundaries.
- Verify Mastra-specific claims with the authors. In particular, check the best current way to describe Mastra workflows, evals, observability, Studio, Server, Memory Gateway, and framework integration.
- Add a comparison table for students:
  - Unit of work: prompt, task, workflow, agent, endpoint.
  - Context source: project files, memory, runtime state, retrieved data.
  - Control mechanism: instructions, tools, policies, tests, evals, permissions.
  - Observability: transcript, logs, traces, metrics, review artifacts.
  - Primary setting: development-time assistance, controlled agent runtime, production application.
- Possible assignment: students run a small fleet on one project change, preserve the transcript or summary, and evaluate whether the workflow improved quality, speed, or understanding.
