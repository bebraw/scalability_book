# How does development friction limit web projects?

A web application can become hard to change long before it runs out of capacity.
A user asks for a filter on the activity page.
From the browser it looks like one new control.
For the developer, the change can reach all the way back to records written before the filter existed.

**[Development friction](/concepts/#development-friction)** is the resistance a team feels when trying to set up, understand, change, test, review, deploy, or operate that system.
[Technical debt](/concepts/#technical-debt), hidden dependencies, and slow feedback all contribute.
Some steps earn their cost.
A compatibility check can reveal that old records disappear even when the filter is off.
A day spent reconstructing an undocumented test environment delays that discovery.

## Trace one web change from the browser to production

To support the filter, the event tracker needs an optional category for each event.
Follow the change from the form to the running service.

1. **Browser form:** add a control, preserve accessible labels and error states, and decide what an omitted category means.
2. **HTTP contract:** extend the event representation without breaking an older client or independently implemented consumer.
3. **Validation:** apply the same allowed values and defaulting rules at the untrusted-input boundary.
4. **Storage:** persist the category, account for existing events, and decide whether a migration or backfill is required.
5. **Query and view:** filter without changing authorization, pagination, ordering, or the empty state.
6. **Cache:** include the filter in the cache identity and invalidate or tolerate previously derived representations.
7. **Deployment:** run compatible versions together, observe the new path, and preserve a safe way to stop or reverse the change.

Several stages can live in one module and deploy together.
They still need different checks.
If a filtered view shows the wrong events, the query might have selected the wrong rows, or the cache might have served the result of a different filter.
Inspecting the query result helps distinguish the two.

Friction becomes visible when the path is hard to trace, the same rule has several unsynchronized definitions, a local check cannot exercise the changed boundary, or a deployment makes earlier assumptions costly to recover.
The category change is an illustration and can serve as an optional controlled comparison: ask what the same request costs in implementations A and B.
For the required course audits, use the [assigned phase-specific probes](/project/#10-1-change-probe-protocol), whose exact prompts, fields and values are released only after the implementation is submitted.

An independently built client can expose assumptions that the provider's own tests share with its implementation.
The [optional API-consumer investigation](/explore/temporary-api-consumers/) probes a fixed contract with temporary CSV and summary clients, then separates provider defects from consumer mistakes and confusing documentation.

> **Sustainability angle**
>
> Friction creates repeated work.
> Slow setup, flaky tests, confusing documentation, and unclear code make humans and agents rerun commands, regenerate changes, and spend more compute to reach the same result.
> Developer experience therefore has an indirect resource cost.

## Recognize where friction appears

The category change exposes several related forms of resistance:

- **Setup friction** appears when a fresh checkout cannot reach a running application and baseline checks without undocumented local state.
- **Comprehension friction** appears when a developer cannot find where the category contract, query, or cache policy is owned.
- **Change friction** appears when one rule must be edited in unrelated places or when hidden consumers fail after the contract changes.
- **Testing friction** appears when checks are slow, flaky, or unable to distinguish a browser problem from an API, storage, or cache problem.
- **Review friction** appears when generated or human-written diffs mix the category change with unrelated rewrites and configuration churn.
- **Deployment and operational friction** appears when compatibility, rollout, signals, or recovery depend on knowledge that is not represented in the repository or platform.
- **Coordination friction** appears when ownership is unclear and teams or agents duplicate work, wait on one another, or make incompatible assumptions.

These categories interact.
For example, unclear ownership increases comprehension time, produces wider changes, and sends more uncertainty into review.
A slow or untrusted test suite encourages larger batches, making a failure harder to localize.
An undocumented [environment](/concepts/#reproducible-environment) turns every collaborator into a separate integration experiment.

Not all of this resistance is waste.
Authentication, validation, compatibility checks, migration stages, review, and release gates can be **protective friction** when they control a named risk and return useful evidence.
A flaky test, repeated manual setup, or approval that merely duplicates an automated check is **accidental friction** when it delays work without increasing confidence or control.
Before removing a step, ask which failure it is meant to prevent and what evidence would be lost.

## What documented web-development cases reveal

The accounts below were published by the organizations that performed the work.
They are useful evidence about particular systems, not controlled comparisons or transferable performance promises.
Follow the links for the architecture and migration details, then use the transfer question to examine the event tracker.

| Documented case                                                                                                                                     | Friction exposed                                                                                                                  | Intervention and reported result                                                                                                                                                     | Transfer question for the event tracker                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| [Spotify Golden Paths, Backstage, and Tingle](https://engineering.atspotify.com/2020/8/how-we-improved-developer-productivity-for-our-devops-teams) | Creating a web project required manual coordination across a repository, cloud project, CI/CD, documentation, and other engineers | Spotify automated a common path for websites and backend services and reports reducing setup to a first build and deployment from about 14 days to under five minutes                | Which repeated setup and deployment decisions can become a maintained project path?                        |
| [GitHub.com development in Codespaces](https://github.blog/engineering/infrastructure/githubs-engineering-team-moved-codespaces/)                   | Local environments and branch changes became brittle as dependencies, services, and schemas changed                               | GitHub used declared environments, cached dependencies, and prebuilds, reporting that GitHub.com environment creation fell from 45 minutes to 10 seconds                             | Which environment assumptions should be versioned, rebuilt, or replaced instead of repaired by hand?       |
| [Shopify's modular Rails monolith](https://shopify.engineering/shopify-monolith)                                                                    | Hundreds of developers needed understandable ownership and dependency boundaries without stopping feature work                    | Shopify replaced call-graph analysis taking over an hour with Packwerk static analysis taking a few minutes, allowing dependency violations to become pull-request feedback          | Which dependency or ownership rule would make the category change easier to locate and review?             |
| [Stripe's online subscription migration](https://stripe.com/blog/online-migrations)                                                                 | A data-model change had to preserve availability and accuracy across hundreds of millions of live objects                         | Stripe staged the change through dual writes, moving read paths, moving write paths, and removing the old model while the service remained operational                               | At which step does the data change become a coordinated migration rather than an ordinary code revert?     |
| [Slack's CI/CD circuit breakers](https://slack.engineering/circuit-breakers/)                                                                       | Test traffic, queues, retries, and dependency overload caused misleading failures and cascading disruption                        | Slack deferred and shed test work under pressure, reporting no cascading internal-tooling incidents during the following two years while its time-to-test-results metric held steady | When would delaying or selecting a check return more trustworthy feedback than running everything at once? |

::caption[Documented cases interpreted as forms of web-development friction.]
::label[table:documented-web-friction-cases]

Take the migration question back to the tracker.
If you remove the filter tomorrow, what happens to the categories users entered today?

## Find the commitment point

In a study of ten open-source database applications, researchers found that schema revisions often went hand in hand with changes to the code that depended on them :citep[qiu2013coevolution].

For the category change, the **commitment point** is the first moment when an ordinary code revert no longer restores the prior state.
This may occur when persistent production data adopts the new representation, an independently deployed consumer relies on the extended contract, a queued job carries the new value, or a cached artifact can outlive the deployment.
Beyond that point, reversal becomes a coordinated change involving compatibility, migration, invalidation, reconciliation, or communication.

Before that point, reverting the code may be enough.
As the change approaches production, mixed-version tests and a staged rollout can keep old and new consumers working during an expand-and-contract migration.
Once users have saved categories, a rollback plan must say what happens to those values and what older clients will see.

The [Reality chapter](/chapters/reality/) returns to compatibility, migration, rollback, and fix-forward under production pressure.

### Plan soft and hard decisions

To judge **[decision reversibility](/concepts/#decision-reversibility)**, ask what it would take to undo the choice safely.
Trying a category representation on an isolated branch is a **soft decision**.
Only the code and test data on that branch need to change.
It becomes a **hard decision** when changing it requires migrating stored events or coordinating with people who maintain independent clients.
The terms are related to the [one-way/two-way-door distinction](https://www.aboutamazon.com/news/company-news/2016-letter-to-shareholders), but reversal cost can rise gradually as dependencies accumulate.

A hard decision can be worth making.
Before committing, record who or what will depend on the choice, what evidence justifies that cost, and how you would check that a reversal succeeded.
While an isolated trial can still answer the question, keep the choice soft.

### Keep a decision log

Preserve that reasoning in a **[decision log](/concepts/#decision-log)** so a future contributor can understand why a choice was made and when to reconsider it.
An **Architecture Decision Record (ADR)** is one format for a consequential architecture choice.
[Michael Nygard's ADR approach](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) records context, decision, status, and consequences, retaining superseded records with a link to their replacement.

For this course, also record the alternatives considered, supporting evidence, owner, current reversibility, and a condition for revisiting the choice.
Acceptance and implementation status answer different questions from reversibility: an accepted decision can remain soft, and implementing it may create dependencies that make it hard.

| Record field               | Illustrative category decision                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Context and choice         | Trial an optional category field to support filtering while preserving existing events.                                                |
| Alternatives and rationale | Defer the field or introduce it now; use the bounded trial to test the change path before committing.                                  |
| Status and owner           | Accepted for an isolated trial; the team must review the evidence before production adoption.                                          |
| Evidence and consequences  | Link tests for uncategorized events and older clients; note the compatibility obligation introduced by storing the field.              |
| Reversibility              | Soft in the isolated branch; harder once production data and independent clients depend on the representation.                         |
| Revisit condition          | Review before production adoption, or when a failed compatibility check challenges the choice; name the migration needed for reversal. |

Use the project's existing decision record or log rather than creating a separate reporting bundle.
When evidence changes the choice, record the new rationale and link the earlier decision so the history of the commitment remains visible.

## Reduce friction without hiding the boundary

### Treat the environment as a versioned input

Declare a path from a fresh checkout to a running application and its baseline checks, including toolchain versions, services, configuration names, supported platforms, and resource limits.
Inject secrets at runtime and name external dependencies that the declaration cannot reconstruct.

Use the cross-team audit to record setup time, failures, retries, and undocumented intervention.
Replay repairs from fresh state.
[Appendix B](/appendices/reproducible-environments/) develops the audit and distinguishes declared setup, isolation, and bit-for-bit reproducibility.

### Make ownership and contracts traceable

The category path should have one understandable owner for each rule even if several layers enforce it.
The browser may give immediate feedback, but the server-side input boundary owns acceptance.
The database may constrain stored values, but the [application contract](/concepts/#contract) owns what consumers are promised.
The cache may copy a representation, but it does not own the authoritative event.

Record those responsibilities in the architecture, specification, schema, types, and tests that future developers and agents are likely to inspect.
Keep duplicate enforcement mechanically connected where possible—for example, generate types from a schema or run the same contract examples against independent implementations.
The aim is not to place every rule in one file; it is to prevent several files from silently becoming competing authorities.

### Agents can move friction rather than remove it

Agent assistance can change which technology choices appear feasible.
In a practitioner essay, :citet[ronacher2026fasthard] argues that agents reduce language-learning and rewrite friction enough to make performance-oriented languages and low-level systems work accessible to more developers, while also noting that prior knowledge improves the result.
Treat this as a hypothesis about the capability of a human-agent pair, not evidence that the human has retained the same skill or that an unfamiliar stack is cheaper to own.

Lower entry friction can move cost into comprehension, debugging, security review, operations, and succession.
Before adopting an unfamiliar stack, use a bounded spike to compare it with a familiar baseline under the same behavioral tests and explicit performance and resource targets; require a team member to explain and modify the result; and record the toolchain and rollback path.
Choose the stack only when the measured benefit survives those ownership costs.

#### Field note — A boundary discovered across projects

Agents helped me expand Slideotter before its product and backend responsibilities had settled.
When Kirjolab also needed to read research papers, the two projects had a reason to share code.
Slideotter now uses Kirjolab’s paper-import package to read a paper and keeps the author’s decision about what belongs in the talk.
Sharing a library settled who maintains the import code.
Sharing a researcher’s annotations across a manuscript and a presentation would require a further decision about who stores the annotations and which revision each author approved.
The [Kirjolab case study](/case-studies/kirjolab/#what-i-would-do-differently) follows that distinction.

:citet[trivedi2026cleanliness] compared matched clean and deliberately degraded repositories across 660 agent trials.
Cleanliness did not change the task pass rate, but agents working in cleaner repositories used 7–8% fewer tokens and revisited files 34% less often.
In those trials, looking only at completed tasks would have missed the extra work agents did in the degraded repositories.

## Match feedback to the changed boundary

When you change which category values are allowed, a focused validation test can tell you within seconds whether the rule works.
You still need to know whether older clients can send events, existing rows survive the migration, and users see the right events when they select a filter.
An HTTP contract check, a migration test, and a browser check answer those questions.
Checking the deployed service tells you what the cache actually serves during rollout.
Choosing when to run each check is part of [loop engineering](/concepts/#loop-engineering).
Put the quickest informative check early enough to guide the edit, and identify the checks you need before accepting the change.

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

Name the purpose of each stage and choose the commands accordingly.
Measure both time-to-first-useful-failure and total readiness time.
If a slow check repeatedly catches problems that no earlier stage sees, consider whether a cheaper focused signal can move that feedback forward without weakening the final gate.

## Audit the event-tracker workflow

Follow one [feedback loop](/concepts/#feedback-loop): frame the change, implement it, inspect tool feedback, review the result and revise the project context.
Predict which stage an intervention should improve and which work still needs human judgment.
The whole-cycle exercise tests how a local speedup contributes to total effort; use observed records in the audit afterward.

{{ import "exercise:friction-cycle" }}

### Record one evidenced bottleneck

Use the existing task, setup or change-probe record to identify one concrete blockage.
The following prompts fit in the project's existing evidence index; the eight friction categories remain optional prompts, not eight required measurements.

```text
Phase, revision and bounded task:
Observed bottleneck and linked evidence:
Response and why it might help:
Acceptance check and actual result:
Introduction cost, changed conditions and unknowns:
Next check or reversal condition:
```

Distinguish active person-minutes from elapsed time and passive waiting; assign each person's effort once, including rework.
Leave unmeasured effort unknown.
For example, in an illustrative pair of accepted changes, 18 baseline person-minutes and 12 candidate person-minutes give a difference of -6; an eight-minute setup investment makes the first comparison +2 person-minutes overall.
Neither number establishes future savings or a causal benefit from the intervention.
Use your own linked observations and account for practice effects, configuration changes and ongoing maintenance.

For an optional controlled comparison, keep the bounded request and acceptance boundary the same across implementations A and B.
The required audits instead use phase-specific probes with different product language but an equivalent vertical slice and acceptance burden.
Compare their recorded outcomes under the common audit protocol, accounting for familiarity with earlier probes and any differences in conditions.
For an implemented choice, mark its commitment point or record that none was reached, name what now depends on it, and identify the evidence that would show reversal succeeded.
A checked improvement, unchanged or worse result, or justified follow-up can all support an honest friction finding.

## Project artifact

Retain both bounded audits and one compact friction entry per phase in the existing evidence index.
Identify the phase and revision, one concrete bottleneck and supporting observations, the response and rationale, and either a checked improvement or a justified follow-up.
Preserve unchanged or worse results and distinguish a proposal from an improvement already achieved.
The eight categories are prompts; commentary on every category is optional and unnecessary for full credit.
Use the chapter's questions about protective friction, reversibility, decision history and feedback timing to investigate the finding where useful, linking existing evidence rather than creating another report.

## Summary

Follow one change from the browser through contracts, data, validation, and deployment to locate its largest source of friction.
Preserve checks that protect accepted behavior, expose the point where reversal becomes a coordinated operation, and move useful feedback earlier where possible.
Compare bounded audit outcomes under equivalent conditions to assess whether the next implementation makes this kind of change easier, while accounting for practice and other changed conditions.
