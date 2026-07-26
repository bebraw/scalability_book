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

> **Sustainability angle**
>
> Friction creates repeated work. Slow setup, flaky tests, confusing documentation, and unclear code make humans and agents rerun commands, regenerate changes, and spend more compute to reach the same result. Developer experience has an indirect resource cost.

This cost can be measured even when the final behavior is unchanged. Trivedi and Schmitt's controlled study, [Does Code Cleanliness Affect Coding Agents?](https://arxiv.org/abs/2605.20049), compared matched clean and deliberately degraded repositories across 660 agent trials. Cleanliness did not change the task pass rate, but agents working in cleaner repositories used 7–8% fewer tokens and revisited files 34% less often. The result does not show that every clean-code rule improves every task, but it supports a narrower and useful claim: maintainability affects the operational footprint of agentic development, not only human preference.

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

### Workflow loop lab

The demonstration below puts the work into a visible loop: human framing, implementation, tool feedback, review, and correction. It separates agent speed from workflow quality, because an agent can produce more output while still pushing uncertainty into human review.

{{ import "site/includes/workflow-loop-demo.html" }}

Use this first to make the human-in-the-loop process explicit. Then use the friction audit to ask which part of that process is creating repeated work.

### Friction audit lab

The demonstration below treats friction as repeated work in a small change path. The goal is not to calculate exact minutes. The goal is to make students name where the resistance appears and choose one feedback loop to improve before adding more features.

{{ import "site/includes/friction-audit-demo.html" }}

After using the demo, students should apply the same structure to their own Construct project: choose a likely change, score the path, name the largest source of friction, and choose one concrete improvement.

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

## Project artifact

Students should produce a friction audit. It should name the largest sources of setup, comprehension, change, testing, review, operational, and coordination friction, then choose one feedback loop to improve before Reconstruct.

## Notes for further development

- Add a friction checklist that students can reuse before Reconstruct.
- Connect this chapter to the peer assessment process: friction is often felt by teammates first.
- Consider including a small before/after example where a tangled event handler is split into clearer validation, storage, and presentation pieces.
- Turn the friction audit into a standardized instrument applied to every build. Keep the same setup, comprehension, change, testing, review, operational, and coordination categories so cross-build comparisons are meaningful.
- Make the bounded cross-team audit the primary source of setup and comprehension evidence. Authors are poor judges of their own hidden context.
- Define one small common change request that auditors can attempt or estimate against each implementation. The change must be narrow enough to fit the audit and stable enough to compare.
- Separate generated-code friction from workflow friction. A clean final repository may still have required excessive retries, prompt repair, integration, or human review to produce.
- In Deconstruct, add fleet-specific coordination friction without changing the base audit rubric. This makes the cost of handoffs and parallel work visible as an additional dimension.
- Obsidian candidate: `Clippings/_Processed/Harness engineering for coding agent users.md` could strengthen the chapter's feedback-loop framing. The feedforward/feedback distinction maps well to setup instructions, tests, linters, architecture notes, and review prompts as friction reducers.
- Obsidian candidate: `Clippings/_Processed/Every layer of review makes you 10x slower.md` could support a short section on review friction. The useful angle is not "skip review", but "move repeatable review comments into tools, tests, formatters, conventions, and smaller module boundaries".
