# Compare

Compare is about producing implementation C through a declared agent fleet and then explaining what all three systems reveal. The [Deconstruct project brief](/project/deconstruct/) defines the fleet workflow, its trace-based debugging view, and the final three-way comparison. Students now use shared pressures and evidence to distinguish observed differences from possible causes and to decide which application architecture and development workflow they would choose under stated constraints.

In this part, scalability has two connected objects of analysis. The first is the web application itself. The second is the development system around it. Application scalability remains the subject of the book; the three AI-assisted setups are the experimental lens. Students should be able to explain what the tools made easier, what they made riskier, and what project structures made the work legible enough to review.

---

## Notes for further development

- Frame the part as fortifying both the system and the development process. The central claim could be: scalable systems need technical capacity, but they also need boundaries, feedback loops, conventions, and review practices strong enough to absorb parallel human and machine work.
- Use [Pi](https://pi.dev/) as the concrete tool for this part. Pi is a minimal terminal coding harness that can be customized with project instructions, skills, prompt templates, extensions, packages, model configuration, and scripted modes.
- Present Pi as a teaching vehicle rather than as the point of the chapter. The lesson is not "use this specific tool", but "a serious agent workflow needs a harness, explicit context, scoped capabilities, and reviewable traces".
- Connect Pi to the revised course progression: locally hosted single agent in Construct, foundation-model single agent in Reconstruct, and an explicitly designed fleet in Deconstruct.
- State the fleet's base model and keep it equal to the Reconstruct foundation model when practical. The comparison should change orchestration deliberately instead of changing model capability and orchestration at once.
- Show how `AGENTS.md` or equivalent project instructions make implicit project knowledge explicit. This should tie back to technical debt: missing instructions, unclear architecture, weak tests, and undocumented conventions are forms of friction that agents amplify.
- Introduce a small agent fleet with roles such as `scout`, `planner`, `implementer`, and `reviewer`. Keep the first version deliberately small so students learn orchestration and integration instead of trying to automate everything.
- Use Pi prompt templates for repeatable workflows. Good examples: investigate a subsystem, implement a bounded change, review a diff, summarize architectural risks, and prepare a pull request.
- Use Pi's session history or export features as evidence. Students should submit a short trace or reflection showing how the fleet worked, where it failed, and how they intervened.
- Discuss containment explicitly: limited tools, read-only exploration, small write scopes, branch isolation, test gates, and human review. The point is to teach students that an agent fleet is a socio-technical system, not merely concurrent prompting.
- Add a comparison note: agent fleets make sense only when work can be decomposed. Some tasks are better handled by one careful agent or by the student directly.
- Frame the third implementation as a fresh build from the common brief. The fleet may receive the permitted shared specification, tests, examples, and evidence template, but should not begin by copying either earlier implementation.
- Make cross-build analysis a first-class output: what differed in architecture, completeness, defects, elapsed time, active human time, resource use, and review burden, and which explanations are supported by evidence?
- Preserve the bounded cross-team audit after the fleet build. Its coordination-friction findings should be comparable with the earlier audits.
- Make the project converge on a self-observation loop: students transform the fleet run into activity data and load it into implementation C. The application becomes a trace-based agent workflow debugger that can expose delegation, task state, failures, retries, handoffs, validation, and human intervention.
- Keep the required integration deliberately small. A portable transformed trace and repeatable import are enough; live streaming, universal tool adapters, and a polished node graph should remain optional.

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

The artifact should culminate in implementation C, a transformed fleet trace loaded into the application, debugging findings about the workflow that produced it, a fleet coordination analysis, a three-way implementation comparison, and an evidence-based scalability analysis.
