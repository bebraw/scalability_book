# Where does development friction come from?

Friction is the resistance a team feels when trying to understand, change, test, review, deploy, or operate a system.
It is the everyday experience of technical debt.
A system with high friction may still be useful, but each change requires more effort than it should.

The central claim could be: scalability is not only about handling more users.
A project also has to scale the work of changing it.

## Chapter purpose

- Define friction as the practical symptom of technical debt.
- Help students notice friction in their own implementation A systems.
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
> Friction creates repeated work.
> Slow setup, flaky tests, confusing documentation, and unclear code make humans and agents rerun commands, regenerate changes, and spend more compute to reach the same result.
> Developer experience has an indirect resource cost.

This cost can be measured even when the final behavior is unchanged.
:citet[trivedi2026cleanliness] compared matched clean and deliberately degraded repositories across 660 agent trials.
Cleanliness did not change the task pass rate, but agents working in cleaner repositories used 7–8% fewer tokens and revisited files 34% less often.
The result does not show that every clean-code rule improves every task, but it supports a narrower and useful claim: maintainability affects the operational footprint of agentic development, not only human preference.

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

> **Identify the commitment point**
>
> Fast generation can make a change cheap to introduce without making it cheap to reverse.
> In a repository study of ten open-source database applications, schema revisions often co-evolved with dependent application code, illustrating how a local data-model choice can acquire a wider change footprint :citep[qiu2013coevolution].
> For this audit, treat the relevant **commitment point** as the first moment when an ordinary code revert no longer restores the prior state—for example, when persistent production data adopts a schema or an independently deployed consumer relies on a published contract.
> Beyond that point, undoing the choice is a coordinated change rather than a deletion.
>
> A commitment is not automatically technical debt.
> The audit asks whether its future coordination cost was visible and justified.
> The Reality chapter returns to compatibility, migration, rollback, and fix-forward; here, make the difference between introduction and safe reversal visible.
> [Florian Herrengt's practitioner essay](https://blog.florianherrengt.com/ai-removing-middle-class-software-engineering.html) dramatizes this asymmetry with database changes; its broader labor-market prediction is outside this claim.

### Workflow loop lab

The demonstration below puts the work into a visible loop: human framing, implementation, tool feedback, review, and correction.
It separates agent speed from workflow quality, because an agent can produce more output while still pushing uncertainty into human review.

{{ import "site/includes/workflow-loop-demo.html" }}

Use this first to make the human-in-the-loop process explicit.
Then use the friction audit to ask which part of that process is creating repeated work.

### Friction audit lab

The demonstration below treats friction as repeated work in a small change path.
The goal is not to calculate exact minutes.
The goal is to make students name where the resistance appears and choose one feedback loop to improve before adding more features.

{{ import "site/includes/friction-audit-demo.html" }}

After using the demo, students should apply the same structure to implementation A: choose a likely change, score the path, name the largest source of friction, and choose one concrete improvement.
For one implemented choice, compare introduction with safe reversal: mark its commitment point or record that none was reached, name what now depends on it, and identify the evidence that would show reversal succeeded.

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

### Treat the environment as a versioned input

A dependency lockfile does not describe the whole development environment.
Runtime and package-manager versions, system packages, local services, configuration names, process readiness, supported platforms, and relevant resource limits can remain hidden on one workstation.
For an agent, this state is part of the task rather than neutral background.

Declare the supported environment and one path from a fresh checkout to a running application and its baseline checks.
Record required configuration names without secret values, inject secrets at runtime, and name the host, hardware, network, mutable data, and external-service boundaries that remain outside the declaration.
A container or environment manager can implement this contract, but its presence does not by itself prove isolation or reproducibility.

Use the cross-team audit as the test.
Record setup time and outcome, undocumented intervention or retry, the failure stage, and relevant host or resource conditions.
After a repair, replay the path from fresh state.
The result supports a bounded claim about that setup—not that production is identical or that a stochastic agent will produce the same patch.

[Appendix B: Reproducible development environments](/appendices/reproducible-environments/) distinguishes setup automation, declared environments, hermetic execution, and reproducible builds and provides the complete fresh-state audit.

### Agents can move friction rather than remove it

Agent assistance can change which technology choices appear feasible.
In a practitioner essay, :citet[ronacher2026fasthard] argues that agents reduce language-learning and rewrite friction enough to make performance-oriented languages and low-level systems work accessible to more developers, while also noting that prior knowledge improves the result.
Treat this as a hypothesis about the capability of a human-agent pair, not evidence that the human has retained the same skill or that an unfamiliar stack is cheaper to own.

Lower entry friction can move cost into comprehension, debugging, security review, operations, and succession.
Before adopting an unfamiliar stack, use a bounded spike to compare it with a familiar baseline under the same behavioral tests and explicit performance and resource targets; require a team member to explain and modify the result; and record the toolchain and rollback path.
Choose the stack only when the measured benefit survives those ownership costs.

Compressed diffs and summaries can route attention, but a lossy view is not acceptance evidence.
Keep the complete artifact and independent checks available; [Appendix A](/appendices/evaluating-agentic-workflows/#compressed-evidence-and-repeated-review) develops a bounded audit for compressed review evidence.

### Feedback economics

Validation can itself become a source of friction.
A ten-minute clean-install or browser suite may provide valuable release evidence while being a poor response to every saved file.
Conversely, a fast test that never crosses the changed boundary can create confidence without useful coverage.

Agent review can keep producing candidate findings after the useful ones are exhausted.
Count independently confirmed findings and the human time needed to adjudicate them, and stop against an explicit risk threshold; [Appendix A](/appendices/evaluating-agentic-workflows/#compressed-evidence-and-repeated-review) develops the full review-evidence exercise.

For one representative change, map the project's feedback ladder.
:ref[table:feedback-ladder]{text="The table below"} separates the evidence needed during implementation from the more expensive evidence needed at a changed boundary or release decision.

| Stage             | Evidence returned                                                             | Typical cost          | When it is required                                          |
| ----------------- | ----------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------ |
| Focused           | One behavior or local invariant                                               | Seconds               | During implementation                                        |
| Affected          | Likely consequences of changed files                                          | Seconds to minutes    | Before sharing the change                                    |
| Baseline          | Ordinary project readiness                                                    | Minutes               | Before accepting non-trivial work                            |
| Boundary-specific | Browser, clean install, workflow, performance, security, or mutation evidence | Potentially expensive | When that boundary changed or release confidence is required |

::caption[The project feedback ladder from focused checks to boundary-specific evidence.]
::label[table:feedback-ladder]

The exact commands depend on the project.
The important property is that each stage has a named purpose.
Measure both time-to-first-useful-failure and total readiness time.
If a slow check repeatedly catches problems that no earlier stage sees, consider whether a cheaper focused signal can move that feedback forward without weakening the final gate.

## Exercise ideas

- Ask students to perform a friction audit of implementation A.
- Have them identify the three most expensive changes they can imagine making.
- Ask them to improve one feedback loop: setup, tests, linting, seed data, logging, or documentation.
- Ask them to time one focused, affected, baseline, and boundary-specific validation path and explain what distinct evidence each adds.
- Use the optional review-evidence exercise in Appendix A when compressed diffs or repeated agent review are relevant to the project.

## Project artifact

Students should produce a friction audit.
It should name the largest sources of setup, comprehension, change, testing, review, operational, and coordination friction, then choose one feedback loop to improve before building implementation B.
The audit should include the project's validation ladder and identify one check that should move earlier, later, or become conditional.

## Summary

Friction is the cost of setting up, understanding, changing, testing, reviewing, operating, and coordinating a system.
Some friction protects important boundaries, while accidental friction delays useful work without adding evidence or control.
Agents can reduce visible effort while moving cost into comprehension, debugging, review, or long-term ownership, so speed alone is not proof of improvement.
Reproducible setup, explicit responsibilities, useful diagnostics, and a risk-based feedback ladder make the development system easier to change without weakening its safeguards.
A friction audit should identify the most expensive bottleneck and improve one feedback loop that the team can measure again.
