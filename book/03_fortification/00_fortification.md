# Fortification

Fortification is about making both the application and the development process resilient enough to scale. In the earlier parts, students have seen how quickly AI-assisted development can produce working software and how that speed can also create technical debt. They have also seen that a system that works locally may need to change when users, events, failures, teams, and operating constraints grow. This part shifts the emphasis from producing code quickly to building structures that make change safer: tests, observability, contracts, documentation, review practices, architectural boundaries, and explicit scaling trade-offs.

In this part, scalability has two meanings. The first is the traditional scalability of the web application itself. The second is the scalability of the development system around the application. As students begin to use agentic tools more actively, the project has to become legible enough that agents can work inside it without constantly breaking assumptions that only existed in a human developer's head.

---

## Notes for further development

- Frame the part as fortifying both the system and the development process. The central claim could be: scalable systems need technical capacity, but they also need boundaries, feedback loops, conventions, and review practices strong enough to absorb parallel human and machine work.
- Use [Pi](https://pi.dev/) as the concrete tool for this part. Pi is a minimal terminal coding harness that can be customized with project instructions, skills, prompt templates, extensions, packages, model configuration, and scripted modes.
- Present Pi as a teaching vehicle rather than as the point of the chapter. The lesson is not "use this specific tool", but "a serious agent workflow needs a harness, explicit context, scoped capabilities, and reviewable traces".
- Connect Pi to the course progression: copilot-style assistance in the first part, a single agent in the second part, and orchestrated agents in Fortification.
- Show how `AGENTS.md` or equivalent project instructions make implicit project knowledge explicit. This should tie back to technical debt: missing instructions, unclear architecture, weak tests, and undocumented conventions are forms of friction that agents amplify.
- Introduce a small agent fleet with roles such as `scout`, `planner`, `implementer`, and `reviewer`. Keep the first version deliberately small so students learn orchestration and integration instead of trying to automate everything.
- Use Pi prompt templates for repeatable workflows. Good examples: investigate a subsystem, implement a bounded change, review a diff, summarize architectural risks, and prepare a pull request.
- Use Pi's session history or export features as evidence. Students should submit a short trace or reflection showing how the fleet worked, where it failed, and how they intervened.
- Discuss containment explicitly: limited tools, read-only exploration, small write scopes, branch isolation, test gates, and human review. The point is to teach students that an agent fleet is a socio-technical system, not merely concurrent prompting.
- Add a comparison note: agent fleets make sense only when work can be decomposed. Some tasks are better handled by one careful agent or by the student directly.

## Tool examples to develop

Use Pi, Acolyte, and Mastra as complementary examples rather than as competing tools. The useful framing is a stack of concerns:

- [Pi](https://pi.dev/) as local development orchestration. Pi is useful for showing how students can shape a coding-agent harness around their project: project instructions, skills, prompt templates, model choices, session history, and small subagent workflows.
- [Acolyte](https://acolyte.sh/) as controlled and observable agent execution. Acolyte is useful for discussing runtime boundaries: sessions, tasks, lifecycle phases, typed tool contracts, workspace scoping, sandboxing, traces, and memory. Verify these details with the author before presenting them as final claims.
- [Mastra](https://mastra.ai/) as production agent infrastructure. Mastra is useful for showing how agents move from development assistance into application architecture: TypeScript agents, workflows, observability, evals, traces, deployment, and integration with web application frameworks. Verify the current production story and recommended examples with the authors.

Possible maturity model:

1. Local orchestration: agents help change the project.
2. Controlled execution: agent work becomes observable, bounded, and auditable.
3. Production agents: agents become part of the application architecture itself.

Questions to ask tool authors:

- What is the smallest example that demonstrates the tool's core idea without turning into a product demo?
- What terminology should be used precisely, and what common descriptions would be misleading?
- What is the recommended safe setup for students working on course projects?
- What failure modes should students be warned about?
- Which features are stable enough to teach, and which are still changing quickly?
- Can the authors provide a short canonical workflow, transcript, diagram, or guest note?
- What would they like students to understand about agentic development after using the tool?

## Possible exercise

Build a small agent fleet for the course project. The goal is not to maximize automation, but to make delegation safe, inspectable, and repeatable.

Suggested deliverables:

- Project instructions for agents.
- At least three agent roles with clearly scoped responsibilities.
- One reusable prompt template or workflow.
- One change implemented through the workflow.
- Evidence of review, such as test output, a diff review, or an exported session.
- A short reflection on what the agents handled well, what they misunderstood, and what project structures made the work easier or harder.

## Project artifact

The part should leave students with three connected artifacts: an agent workflow that is bounded and reviewable, a scaling trade-off table tied to their Reconstruct design, and a final reflection that uses evidence from the whole project arc.
