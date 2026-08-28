# How does development friction limit web projects?

A web application does not have to serve more users before it encounters a scaling problem.
It can first become difficult to change.
A feature that sounds local may cross a browser form, an HTTP contract, server-side validation, persistent data, a query, a cached representation, and a deployment path.
Each boundary adds knowledge, evidence, and coordination that the change must preserve.

**Development friction** is the resistance a team feels when trying to set up, understand, change, test, review, deploy, or operate that system.
It is the everyday experience of technical debt, hidden coupling, and weak feedback.
A system with high friction may still be useful, but each change requires more effort than its behavior alone would suggest.

The central claim of this chapter is that friction accumulates where a web change crosses boundaries and commitments.
Some of that friction protects users, data, and collaborators; some merely repeats work.
The goal is not to remove every constraint, but to move useful evidence earlier and remove resistance that provides no corresponding control.

## Trace one web change from the browser to production

Consider one change to the event tracker: add an optional event category and let users filter the activity view by category.
The visible request is small, but its implementation can follow this path:

1. **Browser form:** add a control, preserve accessible labels and error states, and decide what an omitted category means.
2. **HTTP contract:** extend the event representation without breaking an older client or independently implemented consumer.
3. **Validation:** apply the same allowed values and defaulting rules at the untrusted-input boundary.
4. **Storage:** persist the category, account for existing events, and decide whether a migration or backfill is required.
5. **Query and view:** filter without changing authorization, pagination, ordering, or the empty state.
6. **Cache:** include the filter in the cache identity and invalidate or tolerate previously derived representations.
7. **Deployment:** run compatible versions together, observe the new path, and preserve a safe way to stop or reverse the change.

This path is not a prescription for seven separate components.
It is a way to find where one behavior is represented and who owns it.
In a small application, several stages may live in one module and deploy together.
They remain distinct responsibilities because a mistake at each boundary produces different evidence and a different user-visible failure.

Friction becomes visible when the path is hard to trace, the same rule has several unsynchronized definitions, a local check cannot exercise the changed boundary, or a deployment makes earlier assumptions costly to recover.
The path also gives the chapter a stable unit of analysis: ask what the category change costs in implementation A, then repeat the same audit for implementation B.

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
An undocumented environment turns every collaborator into a separate integration experiment.

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

The cases cover the same route from a different angle.
Spotify reduces the decisions required to start and deploy a web project; GitHub treats the development environment as replaceable infrastructure; Shopify brings architectural feedback into review; Stripe accepts deliberate migration work to protect live data; and Slack adds control to keep the validation system useful under load.
Together they show why a shorter workflow is not automatically a better workflow.
The useful outcome is a change path with less repeated work and enough evidence at each consequential boundary.

## Find the commitment point

Fast generation can make a change cheap to introduce without making it cheap to reverse.
In a repository study of ten open-source database applications, schema revisions often co-evolved with dependent application code, illustrating how a local data-model choice can acquire a wider change footprint :citep[qiu2013coevolution].

For the category change, the **commitment point** is the first moment when an ordinary code revert no longer restores the prior state.
This may occur when persistent production data adopts the new representation, an independently deployed consumer relies on the extended contract, a queued job carries the new value, or a cached artifact can outlive the deployment.
Beyond that point, reversal becomes a coordinated change involving compatibility, migration, invalidation, reconciliation, or communication.

A commitment is not automatically technical debt.
The audit asks whether its future coordination cost was visible and justified.
Before the point, deleting a candidate implementation may be enough.
Near the point, expand-and-contract changes, mixed-version tests, staged rollout, and observation add protective friction because they preserve options.
After the point, “roll back” must name what happens to accepted data and dependent consumers rather than only which code artifact is deployed.

The [Reality chapter](/chapters/reality/) returns to compatibility, migration, rollback, and fix-forward under production pressure.
Here, make the asymmetry between introduction and safe reversal visible.
[Florian Herrengt's practitioner essay](https://blog.florianherrengt.com/ai-removing-middle-class-software-engineering.html) dramatizes this asymmetry with database changes; its broader labor-market prediction is outside this claim.

## Reduce friction without hiding the boundary

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

### Make ownership and contracts traceable

The category path should have one understandable owner for each rule even if several layers enforce it.
The browser may give immediate feedback, but the server-side input boundary owns acceptance.
The database may constrain stored values, but the application contract owns what consumers are promised.
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

This cost can be visible even when final behavior is unchanged.
:citet[trivedi2026cleanliness] compared matched clean and deliberately degraded repositories across 660 agent trials.
Cleanliness did not change the task pass rate, but agents working in cleaner repositories used 7–8% fewer tokens and revisited files 34% less often.
The result does not show that every clean-code rule improves every task, but it supports a narrower claim: maintainability can affect the operational footprint of agentic development, not only human preference.

Compressed diffs and summaries can route attention, but a lossy view is not acceptance evidence.
Keep the complete artifact and independent checks available; [Appendix A](/appendices/evaluating-agentic-workflows/#compressed-evidence-and-repeated-review) develops a bounded audit for compressed review evidence.

## Match feedback to the changed boundary

Validation can itself become a source of friction.
A ten-minute clean-install or browser suite may provide valuable release evidence while being a poor response to every saved file.
Conversely, a fast test that never crosses the changed boundary can create confidence without useful coverage.

For the category change, a focused validation-rule test can return the first failure quickly.
An HTTP contract check can then cover serialization and compatibility; a database migration test can cover existing and new rows; a browser check can cover the filter interaction; and a deployed-boundary check can cover the actual cache and rollout behavior.
Running the most expensive stage first wastes feedback time, while stopping at the focused stage leaves the web change unverified.

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

## Audit the event-tracker workflow

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

Apply the same audit to implementation A using the category change or another equivalently bounded request.
Score setup, comprehension, change, testing, review, deployment, operations, and coordination; name the largest source of resistance; and choose one concrete improvement.
For one implemented choice, compare introduction with safe reversal: mark its commitment point or record that none was reached, name what now depends on it, and identify the evidence that would show reversal succeeded.

Repeat the unchanged audit for implementation B.
The comparison is useful only if the change request and categories remain stable.
A different score may come from architecture, tooling, documentation, generated defaults, or team practice; the audit should identify the mechanism rather than attributing every difference to the implementation approach.

## Project artifact

Students should produce a friction audit for implementations A and B.
It should:

- trace one bounded web change from the browser-facing interaction through its contract, validation, data, derived view, cache, and deployment boundaries,
- separate protective friction from repeated work that provides no useful evidence or control,
- identify the first commitment point and explain what safe reversal requires after it,
- name the largest source of setup, comprehension, change, testing, review, deployment, operational, or coordination friction,
- map the project's validation ladder and identify one check that should move earlier, later, or become conditional,
- and improve one feedback loop that can be measured again without changing the audit request.

## Summary

Development friction is the resistance encountered while setting up, understanding, changing, testing, reviewing, deploying, operating, and coordinating a web system.
Following one category change from browser to production shows why apparently local work becomes cross-boundary work.

The documented Spotify, GitHub, Shopify, Stripe, and Slack cases show different responses: automate repeated setup, make environments replaceable, bring dependency evidence into review, stage committed data changes, and protect the feedback system under load.
Their reported results belong to their own contexts, but the mechanisms provide questions that can be transferred to a smaller project.

Some friction protects important boundaries, while accidental friction delays useful work without adding evidence or control.
Agents can reduce visible implementation effort while moving cost into comprehension, debugging, review, operations, or long-term ownership.
A versioned environment, traceable responsibilities, visible commitment points, and a risk-based feedback ladder make a web application easier to change without weakening its safeguards.
