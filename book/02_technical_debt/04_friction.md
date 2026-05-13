# What is friction in software engineering?

Friction is the resistance a team feels when trying to understand, change, test, review, deploy, or operate a system. It is the everyday experience of technical debt. A system with high friction may still be useful, but each change requires more effort than it should.

The central claim could be: scalability is not only about handling more users. A project also has to scale the work of changing it.

## Chapter purpose

- Define friction as the practical symptom of technical debt.
- Help students notice friction in their own Construct projects.
- Show how friction appears in code, tooling, documentation, tests, dependencies, and collaboration.
- Connect friction to agentic development: agents amplify both good structure and bad structure.

## Forms of friction

Possible subsections:

- **Setup friction**: the project is hard to run locally.
- **Comprehension friction**: it is unclear where behavior lives or why decisions were made.
- **Change friction**: small feature changes require edits in many unrelated places.
- **Testing friction**: tests are missing, slow, flaky, or disconnected from important behavior.
- **Review friction**: diffs are large, noisy, or hard to reason about.
- **Operational friction**: logs, errors, configuration, and deployment behavior are unclear.
- **Coordination friction**: people duplicate work or break each other's assumptions.

> **Optional: Sustainability angle**
>
> Friction creates repeated work. Slow setup, flaky tests, confusing documentation, and unclear code make humans and agents rerun commands, regenerate changes, and spend more compute to reach the same result. Developer experience has an indirect resource cost.

## Friction in the event tracking project

Examples to develop:

- Event types are stored as free-form strings, so typos become data quality problems.
- The UI and backend disagree about required event fields.
- Filtering works only because the dataset is tiny.
- There is no seed data, so every reviewer tests with different assumptions.
- The storage model makes simple summaries difficult.
- There is no clear place to add validation.
- AI-generated code works but follows several inconsistent patterns.
- The chosen theme is not documented clearly enough, so later readers cannot tell which domain assumptions are intentional.

## Reducing friction

Possible techniques:

- Make setup reproducible with one documented command.
- Define module boundaries and name responsibilities clearly.
- Add focused tests around the most important behavior.
- Write down assumptions before they become archaeology.
- Use schema validation where data crosses boundaries.
- Keep APIs small and explicit.
- Add useful error messages.
- Keep generated code under the same review standard as human-written code.

## Exercise ideas

- Ask students to perform a friction audit of their Construct project.
- Have them identify the three most expensive changes they can imagine making.
- Ask them to improve one feedback loop: setup, tests, linting, seed data, logging, or documentation.
- Use an AI agent to inspect the project for friction, then require students to verify or reject its findings.

## Notes for further development

- Add a friction checklist that students can reuse before Reconstruct.
- Connect this chapter to the peer assessment process: friction is often felt by teammates first.
- Consider including a small before/after example where a tangled event handler is split into clearer validation, storage, and presentation pieces.
