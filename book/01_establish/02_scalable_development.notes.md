## Chapter purpose moved from reader content

In this chapter, I will bring you up to speed with agentic development while considering its impact on software engineering and web development in particular.

The implementation should remain deliberately modest.
Interpretive freedom is not a request for more features.
A small monolith, a server-rendered application, a rich client with an API, an event-oriented design, or an unusual language can all be appropriate when the group can explain the choice and provide a reliable path for another group to run it.

The same primary stack will normally be used for all three implementations.
This makes the changing AI development setup easier to study.
The implementation can still change substantially because requirements, models, tools, prompts, architecture decisions, and accumulated understanding do not determine one inevitable result.

Implementation A is also where agentic development becomes concrete.
Document what the local model was asked to do, what constraints and validation it received, what it misunderstood, and what the group corrected manually.
The implementation direction is a starting hypothesis; the evidence package shows what actually happened.

Questions worth discussing before implementation:

- What should a workspace and work item mean in the interface?
- Which user moment should feel especially clear or effortless?
- What does the chosen stack let the group learn or constrain?
- Which architectural boundary should remain visible?
- What evidence could challenge the group's initial assumption?
- How will a student unfamiliar with the stack set up and inspect the project?
- Which optional idea will wait until the common core works?

## Themes

- Codebase structure and module boundaries
- Composition of features, services, user interfaces, and infrastructure
- Local development environments and reproducible setup
- Testing strategy and confidence when changing existing behavior
- Continuous integration and review practices
- Dependency management and upgrade pressure
- Documentation as support for future change
- AI-assisted development and the need to review, constrain, and maintain generated code

## Learning goals

After this chapter, students should be able to:

- Explain why development scalability is different from runtime performance scalability.
- Identify codebase and workflow choices that make future changes easier or harder.
- Use composition to manage complexity without hiding important system behavior.
- Evaluate AI-assisted code as maintainable software rather than as a one-time output.
- Test explanation claims through predicted behavior, state ownership, and independent checks; use the optional Appendix A fixture before revealing its worked reasoning.
- Distinguish course evidence requirements from a receiving project's contribution and disclosure rules while preserving truthful provenance and accountable ownership.
- Separate a prototype's demonstrated behavior from the data access, deployment authority, recovery, and support obligations of shared use; reason through the optional paper fixture without adding required project scope.
- Connect development practices to implementations A, B, and C and the development setup used for each.

## Notes for further development

- The full development-approaches chronology is archived below; the chapter now compares three composable control patterns.
  If the chronology is reused, preserve representative milestones and source qualifications rather than presenting a maturity ladder.
- Add a short distinction between transferable knowledge and transferable code.
  Good specifications, tests, examples, and validation practices should improve across phases without allowing the later implementation to become a fork of the first.
- Make the evidence log part of the constrain-generate-validate loop.
  Students should record task framing, relevant model/tool configuration, validation outcome, human correction, and approximate cost or latency without submitting an unreadable raw transcript.
- Explain that local models are affected by hardware, serving configuration, context limits, and quantization.
  Ask for contextual reporting rather than simplistic local-versus-cloud rankings.
- Keep the project-harness discussion, but distinguish common course material from implementation-specific project memory.
  Decide in the shared specification which project-harness files are supplied, which students author, and which may be carried into later builds.
- Keep the implementation discovery lab aligned with the shared specification as the project evolves.
  It should support reasoning and conversation rather than score whether a group has found the “right” idea.

## Historical comparison archived during the September 2026 tightening pass

### How did development control change before and after agents?

Coding agents did not introduce specifications, executable tests, model-driven generation, or iterative feedback.
The distinctive change is that a probabilistic, tool-using system can now perform much more of the implementation loop and produce candidate changes at a rate that may exceed human comprehension, review, and integration.
Earlier engineering artifacts consequently reappear as machine-readable context, constraints, and feedback.

:ref[table:development-approaches-history]{text="The table below"} uses representative milestones rather than claiming that a broad practice was invented in one year.
The approaches overlap and can be combined; the chronology is not a progression from worse to better.

| Representative milestone | Approach                                                                                            | Primary artifact                                                         | Implementation loop                                                               | Main control and trade-off                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1970                     | [Staged, plan- and design-led development](https://www.praxisframework.org/files/royce1970.pdf)     | Requirements, architecture, interface, and test plans                    | Humans implement through planned stages with feedback between them                | Documentation and staged verification create traceability; discoveries arriving late can invalidate expensive commitments       |
| 2001                     | [Iterative and agile development](https://agilemanifesto.org/)                                      | Working increments, a backlog, and stakeholder feedback                  | Humans build and review small slices repeatedly                                   | Short feedback supports learning; architecture and cross-cutting quality require continuous stewardship                         |
| 2001                     | [Model-Driven Architecture](https://www.omg.org/mda/)                                               | Platform-independent and platform-specific models                        | Deterministic generators transform models into implementation artifacts           | A model can create repeatable leverage across platforms; escape paths and generator constraints can become expensive            |
| Early 2000s              | [Test-Driven and Behavior-Driven Development](https://dannorth.net/introducing-bdd/)                | Executable examples and tests                                            | Humans implement through short behavior and test feedback loops                   | Evidence moves close to implementation; checks cover only the properties and examples they encode                               |
| February 2025            | [Vibe coding](https://x.com/karpathy/status/1886192184808149383)                                    | Conversational intent and the running result                             | An agent generates while a person observes and redirects visible behavior         | Exploration becomes fast; traceability and control of hidden contracts, data, security, and maintenance remain weak             |
| August–September 2025    | [Spec-Driven Development](https://github.com/github/spec-kit/blob/main/docs/history.md)             | Specification, plan, tasks, and implementation artifacts                 | Agents work through durable phases with review between them                       | Intent survives one session or agent; artifact maintenance and drift from runtime behavior become new work                      |
| February 2026            | [Harness engineering](https://openai.com/index/harness-engineering/)                                | Project harness: repository structure, instructions, tools, and tests    | Agents repeatedly act inside encoded boundaries                                   | Mechanized feedback supports repeated high-throughput work; building and maintaining the project-specific environment is costly |
| April 2026               | [Shift-Up](https://arxiv.org/abs/2604.20436)                                                        | Executable BDD requirements, C4 models, and ADRs                         | Agents implement while people focus on requirements, architecture, and acceptance | Established design knowledge becomes a persistent guardrail; the current evaluation is exploratory and adds upfront work        |
| April 2026               | [Structured Prompt-Driven Development](https://martinfowler.com/articles/structured-prompt-driven/) | Version-controlled business, domain, design, task, and safeguard context | Agents generate within a reviewed prompt boundary                                 | Prompts become governable and reusable team artifacts; keeping them aligned becomes development work                            |

::caption[Representative milestones in the movement from human implementation and deterministic generation toward agent-executed development workflows.]
::label[table:development-approaches-history]

For the event tracker, every approach could produce the same visible event form and activity view.
The difference is where intent and control live: a staged design can describe the complete request and data path, an iterative team can deliver it as a vertical slice, BDD can express its accepted behavior, a model can generate schemas or clients, and an agentic workflow can interpret repository context and act across all of those artifacts.
A working browser view alone still does not establish authorization, HTTP compatibility, durable persistence, retry behavior, or safe evolution.

Shift-Up makes the historical reuse explicit by treating BDD requirements, C4 models, and ADRs as agent guardrails.
Its initial evaluation compared unstructured vibe coding, structured prompting, and a partial Shift-Up workflow while building a full-stack snack-bar web application :citep[lipsanen2026shiftup].
Treat that comparison as an exploratory example rather than a universal ranking of the approaches.

In this book, the same bounded project is first implemented with a local model, then a comparison model, and finally a fleet of agents.
The phases do not prescribe one row of the table.
They hold required web behavior stable so you can compare how different models, constraints, validation, and orchestration affect the path from a candidate change to accepted work.
