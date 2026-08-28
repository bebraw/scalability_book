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
- Connect development practices to implementations A, B, and C and the development setup used for each.

## Project artifact

Students should create a first version of the project harness.
It should include a README, setup command, one agent instruction file, one architecture note, one feature spec for the core event workflow, one decision record for the initial stack or storage choice, one fast validation command, and a short AI-use log.
The harness can be lightweight, but it should be concrete enough that another group can run and inspect the project and that the final comparison can explain its development workflow.

## Notes for further development

- Keep the development-approaches table chronological by representative milestone, not by disputed invention date.
  The rows are composable control patterns rather than a maturity ladder, and the source links should remain attached to the milestone claims.
- Add a short distinction between transferable knowledge and transferable code.
  Good specifications, tests, examples, and validation practices should improve across phases without allowing the later implementation to become a fork of the first.
- Make the evidence log part of the constrain-generate-validate loop.
  Students should record task framing, relevant model/tool configuration, validation outcome, human correction, and approximate cost or latency without submitting an unreadable raw transcript.
- Explain that local models are affected by hardware, serving configuration, context limits, and quantization.
  Ask for contextual reporting rather than simplistic local-versus-cloud rankings.
- Keep the harness discussion, but distinguish a common course harness from implementation-specific project memory.
  Decide in the shared specification which harness files are supplied, which students author, and which may be carried into later builds.
- Keep the implementation discovery lab aligned with the shared specification as the project evolves.
  It should support reasoning and conversation rather than score whether a group has found the “right” idea.
