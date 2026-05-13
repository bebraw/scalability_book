# How to coordinate agent fleets?

TODO

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
