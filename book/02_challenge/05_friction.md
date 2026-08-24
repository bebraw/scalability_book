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

### Agents can move friction rather than remove it

Agent assistance can change which technology choices appear feasible.
In a practitioner essay, :citet[ronacher2026fasthard] argues that agents reduce language-learning and rewrite friction enough to make performance-oriented languages and low-level systems work accessible to more developers, while also noting that prior knowledge improves the result.
Treat this as a hypothesis about the capability of a human-agent pair, not evidence that the human has retained the same skill or that an unfamiliar stack is cheaper to own.

Lower entry friction can move cost into comprehension, debugging, security review, operations, and succession.
Before adopting an unfamiliar stack, use a bounded spike to compare it with a familiar baseline under the same behavioral tests and explicit performance and resource targets; require a team member to explain and modify the result; and record the toolchain and rollback path.
Choose the stack only when the measured benefit survives those ownership costs.

> **A reading diff routes attention**
>
> Large changes may repeat the same migration across call sites or include generated and mechanically forced edits.
> [`meat`](https://github.com/boldsoftware/meat) is an experimental tool that asks a model to choose rows to remove, fold, or elide, then mechanically checks and applies that plan to the immutable original diff.
> The surviving code is therefore source-derived rather than regenerated by the model.
>
> The view is still lossy.
> An [author-run analysis of the Python-only diffs from three selected commits](https://github.com/boldsoftware/meat/blob/f39f41dfe7b5b37a12b35fdfbaecc7e779855bd3/analysis/python-famous-commits-2026-08-02/REPORT.md) records an aggregate 30.1% byte reduction; it also documents cases where the output hid decisive test outcomes and made an old/new default inversion look like a one-sided addition.
> The report illustrates the mechanism and its failure modes; it does not measure reviewer effectiveness.
> In a different task, a mutation-based preprint found that GPT-4 and GPT-5.2 summaries of 12 controlled synthetic Python programs and 50 human-written benchmark programs sometimes described familiar algorithmic intent while missing mutated behavior; it did not study diffs or human reviewers :citep[khatib2026summarization].
>
> Use a reading diff as an attention map, not as acceptance evidence.
> Keep the raw diff and independent checks available, inspect omitted regions at consequential boundaries, and return for decomposition any change that remains too large or coupled to understand.

### Feedback economics

Validation can itself become a source of friction.
A ten-minute clean-install or browser suite may provide valuable release evidence while being a poor response to every saved file.
Conversely, a fast test that never crosses the changed boundary can create confidence without useful coverage.

> **When findings become inventory**
>
> :citet[lawson2026bugs] uses the provocative claim that teams can now choose how many bugs they want by asking agents to continue reviewing.
> The operational choice is narrower: a team can choose how much defect-search and verification effort to fund, which known risks to accept, and when to stop.
> It cannot count the unknown defects that remain.
>
> Cheap reports may shift rather than remove friction.
> In a live study at Mozilla and Ubisoft, reviewers directly accepted 8.1% and 7.2% of generated comments, respectively, while another 14.6% and 20.5% were marked useful as review or development tips.
> At Ubisoft, the median instrumented interval for evaluating generated comments was about 43 seconds per patch, an upper bound on active evaluation time.
> The study measured adoption rather than defect-detection accuracy, but it shows that suggestions still consume attention :citep[olewicki2026review].
>
> Each finding still needs independent evidence such as a reproduction, a reachable path, or a violated invariant, followed by an impact judgment, a repair decision, and regression evidence.
> A review loop without a stopping rule can create its own backlog, while repeated local patches can make the system harder to understand.
> When several reports share a cause, ask whether a simpler boundary or invariant could eliminate the class before adding another exception.
> Stop against an explicit risk threshold, not when the agent runs out of concerns.

For one representative change, map the project's feedback ladder:

| Stage             | Evidence returned                                                             | Typical cost          | When it is required                                          |
| ----------------- | ----------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------ |
| Focused           | One behavior or local invariant                                               | Seconds               | During implementation                                        |
| Affected          | Likely consequences of changed files                                          | Seconds to minutes    | Before sharing the change                                    |
| Baseline          | Ordinary project readiness                                                    | Minutes               | Before accepting non-trivial work                            |
| Boundary-specific | Browser, clean install, workflow, performance, security, or mutation evidence | Potentially expensive | When that boundary changed or release confidence is required |

The exact commands depend on the project.
The important property is that each stage has a named purpose.
Measure both time-to-first-useful-failure and total readiness time.
If a slow check repeatedly catches problems that no earlier stage sees, consider whether a cheaper focused signal can move that feedback forward without weakening the final gate.

## Exercise ideas

- Ask students to perform a friction audit of implementation A.
- Have them identify the three most expensive changes they can imagine making.
- Ask them to improve one feedback loop: setup, tests, linting, seed data, logging, or documentation.
- Ask them to time one focused, affected, baseline, and boundary-specific validation path and explain what distinct evidence each adds.
- Audit a frozen reading diff against the raw diff for one bounded representative change.
  Before opening either view, predeclare two or three behavior or architecture questions.
  Record provisional answers after the reading view, then inspect the full raw diff and relevant checks and record every correction, omitted or misleading critical detail, and the time spent in each stage.
  Treat this as an audit of that representation, not evidence that it improves review efficiency.
- Time-box an agent review of one representative change.
  Record candidate, independently confirmed, duplicate, and rejected findings along with triage and repair time.
- Define a risk-based stopping rule for the review and identify whether one simplification could eliminate a defect class.

## Project artifact

Students should produce a friction audit.
It should name the largest sources of setup, comprehension, change, testing, review, operational, and coordination friction, then choose one feedback loop to improve before building implementation B.
The audit should include the project's validation ladder and identify one check that should move earlier, later, or become conditional.
