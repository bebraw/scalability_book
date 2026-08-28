# What do three agent-assisted implementations teach us about web scalability?

Scalability is the ability to keep a system useful while the conditions around it change.
Technical capacity is part of that ability, but usefulness also depends on architecture, feedback, development friction, operational judgment, and the way human and agent work is governed.
A web application that serves more requests but becomes unsafe to change is only partially scalable.
So is a development workflow that generates changes faster than the team can understand, validate, or correct them.

The concepts in this book form a connected system rather than a checklist of techniques.
Growth challenges assumptions; architecture determines where pressure is felt; measurement makes the resulting behavior visible; people and agents choose a response; and the response changes both the application and the cost of its next change.
The three course implementations make that system concrete enough to compare.

> **Sustainability angle**
>
> A scalable system should not merely survive growth by consuming more computation, storage, bandwidth, and human attention.
> The final comparison should ask which additional resources produced useful capacity or learning and which merely displaced waste into infrastructure, model use, review, or maintenance.

## One system, three connected loops

The course concepts can be organized into three feedback loops.
Each loop preserves a different form of usefulness, but no loop operates independently.

| Loop                    | Recurring sequence                                                                                      | What can accumulate                                       | Evidence that closes the loop                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------- |
| Application scalability | Pressure → challenged assumption → saturation boundary → signal → response → new trade-off              | Load, data, latency, failures, and operational complexity | Browser behavior, benchmarks, metrics, traces, and recovery results        |
| Development scalability | Intent → implementation → validation → accepted change → project memory → next change                   | Knowledge, coupling, technical debt, and friction         | Tests, setup results, review findings, change effort, and decision records |
| Agentic development     | Authority allocation → agent execution → trace → acceptance or rejection → correction → next delegation | Attempts, handoffs, review demand, model use, and trust   | Workflow traces, interventions, accepted outcomes, and correction evidence |

::caption[Three connected feedback loops for reasoning about scalable web development.]
::label[table:scalability-concept-map]

The loops share several concepts.
**Web architecture** supplies the boundaries across which requests, data, ownership, and failures travel.
**Measurement and observability** turn behavior at those boundaries into evidence.
**Scalability models** help estimate which limit matters and how much improvement is theoretically available.
**Friction and technical debt** describe how earlier choices affect the cost of the next response.
**Human–agent relationships** determine who may interpret evidence, choose an action, execute it, and accept the result.

The connections are cyclical.
A scaling response becomes a development task.
The development system determines whether people and agents can implement that task safely.
Their accepted changes alter the application's architecture, capacity, and next likely failure.
New observations then begin another pass through the loops.

## The application loop: respond to pressure

Application scalability begins with a change in conditions rather than a preferred technology.
More users, events, tenants, failures, stakeholders, or independently evolving clients challenge an assumption in the current design.
The assumption may concern request rate, data size, retry behavior, ownership, consistency, or the ability of one component to wait for another.

Web architecture determines where the pressure becomes visible.
A browser request crosses the client, network, API, domain logic, storage, and possibly a queue or external service.
Each boundary defines a contract and a possible wait, failure, retry, compatibility problem, or trust transition.
When demand approaches a binding resource or organizational limit, the system reaches a saturation boundary.
That boundary may be CPU, a connection pool, queue capacity, third-party quota, deployment path, or the attention available for diagnosis.

Measurement closes the gap between a plausible story and an engineering claim.
A browser journey establishes whether the user-visible behavior still works.
A benchmark locates latency or throughput under a declared workload.
Metrics show a changing rate or backlog, while traces connect symptoms to the request path that produced them.
The evidence should answer a specific question: which assumption failed, at which boundary, under what conditions?

Only then does a scaling technique become a reasoned response.
An index, cache, queue, replica, rate limit, partition, or asynchronous worker relieves a particular pressure while introducing new consistency, freshness, failure, cost, or operational obligations.
Formal models help bound expectations: Amdahl's Law exposes sequential work, queueing models expose waiting, and contention models show why adding capacity may eventually produce diminishing or negative returns.
The response completes the loop by creating a new system with new assumptions.

Use these questions to trace the application loop in one implementation:

- Which change in conditions challenged a specific architectural assumption?
- Which signal identified the first binding boundary rather than a downstream symptom?
- Which response addressed that boundary, and what new failure mode or operating cost did it introduce?

## The development loop: preserve the ability to change

Every application response has to pass through a development system.
An intention becomes code, configuration, schema, tests, documentation, and deployment behavior.
Validation then determines whether the change satisfies the user-visible contract and remains compatible with the surrounding system.
Accepted work changes both the application and the knowledge future contributors need.

This is where project legibility and friction connect to scalability.
Stable commands, realistic fixtures, useful errors, bounded modules, explicit API contracts, architecture notes, and fast feedback make the next change easier to understand and verify.
Hidden assumptions, tangled responsibilities, slow tests, stale guidance, and unclear ownership make it harder.
Technical debt is therefore not only untidy code; it is reduced optionality and a higher future cost of coordinated change.

Web boundaries make development friction concrete.
Adding one required event field may require a form, client validation, request schema, domain rule, database migration, activity rendering, and compatibility test.
A clean contract helps those parts evolve together without forcing them into one module.
A blurred contract makes a small feature cross many unrelated files and reviewers.

Feedback can turn repeated friction into project memory.
A review comment may become maintained guidance, a common defect may become a regression test, a risky dependency may gain an adapter, and an architectural choice may become a decision record.
That conversion is not automatic: transcripts and generated explanations are candidate evidence until someone verifies and promotes them.
If the lesson remains only in one person's memory or one agent session, the loop does not improve the project for its next contributor.

Use these questions to trace the development loop:

- Which project property made a later change easier or harder to implement and review?
- Which validation boundary caught an error, and which important behavior remained invisible?
- What knowledge from the change became durable project guidance, an executable check, or a clarified contract?

## The agentic loop: turn execution into accepted change

Agentic development changes who performs parts of the development loop, but it does not remove the loop.
Implementation A and B use broadly single-agent workflows with different model capability; implementation C changes the orchestration structure by introducing a fleet.
In every case, the important boundary is not generated output but accepted change.

Before execution, the human–agent relationship allocates authority.
An agent may gather information, propose an interpretation, prepare a change, or execute within a bounded scope.
The task should identify its objective, context, allowed files and tools, expected evidence, non-goals, and stopping or escalation condition.
Project readiness affects whether the agent can follow that allocation: explicit commands, maintained contracts, and observable feedback reduce dependence on hidden human context.

Execution produces more than a final diff.
The trace can show exploration, tool calls, failed checks, retries, delegated work, review, and human intervention.
Those events explain whether a fast result came from clean decomposition, repeated attempts, transferred review effort, or an agent exceeding its intended authority.
A branch, pull request, or agent message remains activity until the declared tests and accountable reviewer accept the behavior.

Correction completes the loop.
A useful workflow can observe a divergence, diagnose it, assign a bounded repair, and revalidate the whole user journey.
Repeated agent agreement is not a substitute for this evidence because several agents may share the same blind spot.
Likewise, adding agents helps only when tasks are independent enough to outweigh handoffs, integration, and reviewer backpressure.

Use these questions to trace the agentic loop:

- Which decisions could the agent propose, prepare, or execute, and who accepted the consequences?
- What did the workflow trace reveal that the finished repository did not?
- Did orchestration reduce accepted completion time or merely move effort into integration, review, and correction?

## How the loops affect one another

Consider adding a queue to protect event ingestion during a traffic spike.
The three-loop view prevents the queue from appearing as an isolated scaling technique.

| Perspective                   | Consequence of the queue                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Application loop              | Burst absorption improves, but freshness lag, backlog growth, duplicates, and worker saturation become possible                             |
| Development loop              | The project gains worker code, retry and idempotency rules, new local setup, deployment, tests, and ownership                               |
| Agentic loop                  | Tasks may decompose around producer, consumer, and verification boundaries, but their shared event contract must settle first               |
| Evidence connecting all three | Queue age, end-to-end event visibility, duplicate rate, failure recovery, review effort, and trace history show whether the response worked |

::caption[One scaling response interpreted through all three loops.]
::label[table:queue-three-loop-example]

The same reasoning applies to caching, partitioning, background jobs, browser-side state, or a new external service.
A locally faster application can become harder to operate or change.
A highly legible project can improve human and agent work without increasing runtime capacity.
A larger fleet can accelerate independent changes while saturating integration and review.
Scalability is the judgment needed to see these coupled effects before optimizing one visible metric.

## Apply the map to the three implementations

The three projects give the course a controlled comparison as far as classroom conditions allow.
Required behavior and submission evidence remain as stable as practical while the model and orchestration setup change.

| Build                                               | Agent setup                   | Held as stable as practical                           | Deliberately varied                                                        | Evidence goal                                                                |
| --------------------------------------------------- | ----------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [Establish](/project/establish/) — implementation A | Locally hosted single agent   | Common functional scope and submission evidence       | Local model, runtime, and the team's first project harness                 | Establish a baseline and expose initial assumptions                          |
| [Challenge](/project/challenge/) — implementation B | Foundation-model single agent | The same required behavior, built afresh              | Served model capability and the revised harness or architecture hypothesis | Identify which outcomes recur and which change under a different agent setup |
| [Compare](/project/compare/) — implementation C     | Agent fleet                   | The same required behavior and evaluation obligations | Delegation, orchestration, authority allocation, and fleet controls        | Explain fleet effects and compare all three results with recorded evidence   |

::caption[The three course implementations and the evidence each comparison contributes.]
::label[table:project-arc]

The comparison is local rather than causal proof.
The team learns between builds; tools, model behavior, optional scope, hardware, and reporting quality may differ; and each implementation can embody different architectural choices.
These are limitations to record, not reasons to abandon comparison.
The common brief makes careful claims possible when observations remain separate from explanations.

### Build the evidence matrix

Use the concept map to compare the implementations across the same boundaries.
Replace each evidence prompt in the matrix with a concrete artifact, result, or explicit `not measured` entry.

| Evidence dimension             | Implementation A                        | Implementation B                        | Implementation C                          | Synthesis question                                                          |
| ------------------------------ | --------------------------------------- | --------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| Accepted browser behavior      | Acceptance probe and escaped defects    | Acceptance probe and escaped defects    | Acceptance probe and correction evidence  | Which differences affected users rather than only repository structure?     |
| Architecture and contracts     | Request trace and key boundary decision | Request trace and key boundary decision | Request trace and key boundary decision   | Which boundaries made independent change safer or harder?                   |
| Pressure and saturation        | Pressure map and first predicted limit  | Pressure map and first predicted limit  | Pressure map and first predicted limit    | How did each architecture respond to the same growth scenario?              |
| Measurement and recovery       | Benchmark, signals, and recovery result | Benchmark, signals, and recovery result | Benchmark, signals, and recovery result   | What was directly observed, and which behavior remained invisible?          |
| Development friction           | Cross-team audit and change effort      | Cross-team audit and change effort      | Cross-team audit and change effort        | Which setup, test, or coupling cost would dominate the next change?         |
| Human–agent workflow           | Trace, interventions, and review effort | Trace, interventions, and review effort | Fleet trace, handoffs, and review backlog | Which allocation produced accepted work at a sustainable correction cost?   |
| Resource use and externalities | Runtime and model-use evidence          | Runtime and model-use evidence          | Runtime and model-use evidence            | Did added resources create useful capacity, quality, or only more activity? |

::caption[Evidence matrix for synthesizing the three implementations through the shared concept map.]
::label[table:final-evidence-matrix]

Do not turn absent evidence into a favorable score.
If a build was not load-tested, state that its saturation behavior is proposed rather than observed.
If model usage was not captured, do not infer efficiency from elapsed time.
If implementation C produced more branches but required more review and correction, count both the activity and the acceptance cost.

### Separate observation, inference, and proposal

A strong synthesis labels the status of each important claim:

- **Observed:** directly inspected or measured in a repository, running application, audit, test, trace, or recorded workflow.
- **Inferred:** a plausible explanation for an observation, with alternatives and confounding factors kept visible.
- **Proposed:** a future response or target design that was not implemented and validated in the compared build.

For example, “implementation B had the lowest measured p95 under the declared workload” is an observation.
“Its data model caused the difference” is an inference unless the comparison isolates that factor.
“A queue would protect its write path” is a proposal until the new behavior and trade-offs are tested.
This vocabulary lets students reason beyond the available experiment without presenting plans as results.

## Turn comparison into a decision

The final synthesis should end with a decision under constraints rather than a universal ranking.
A local single-agent workflow may be appropriate when privacy or cost dominates and tasks remain modest.
A foundation-model single agent may justify its external dependency when capability reduces correction or expands the range of accepted tasks.
A fleet may justify its coordination cost when the project exposes several independent workstreams and has enough integration and review capacity.
The preferred architecture may likewise vary with the pressure, competence envelope, and operating skills of the team.

Use the evidence matrix to build the final argument:

1. State the common brief, acceptance core, deliberately varied development setup, and comparison limits.
2. Trace one important outcome through the application, development, and agentic loops.
3. Compare the strongest evidence from A, B, and C, including failures, correction, and resource use.
4. Label observations, inferences, and proposals.
5. Choose an application architecture and development setup for one stated future scenario.
6. Explain the rejected alternatives, the trade-offs accepted, the first likely saturation boundary, and the next measurement.

### Final reflection package builder

The builder below assembles evidence already produced during the course.
Select the artifacts you have, then use the generated outline to find claims that still lack support.

{{ import "site/includes/final-reflection-demo.html" }}

## Project artifact

Submit the completed evidence matrix and a final decision narrative.
The package should include the common acceptance result, request-path or architecture evidence, pressure and measurement results, cross-team friction audits, human–agent workflow evidence, one planned-versus-observed decision path, resource-use evidence where available, and remaining risks.
For each major claim, mark whether it is observed, inferred, or proposed.

The final narrative should use those artifacts to explain which application architecture and development setup the group would choose under a stated set of constraints.
It should also identify the first expected boundary, the signal that would reveal its approach, and the decision the group would revisit when conditions change.

## Questions to carry forward

- Which form of growth is the system actually prepared for, and what evidence establishes that claim?
- Which application, development, or review boundary is most likely to saturate first?
- What would you simplify before adding infrastructure or agents?
- Which signal and correction path would let the next team adapt without guessing?

## Summary

Web scalability emerges from three connected loops.
The application loop responds to pressure at architectural boundaries; the development loop determines the cost of changing those boundaries; and the agentic loop determines how execution becomes accepted and correctable work.
Measurement connects observation to judgment across all three.

The three implementations provide evidence for reasoning through this concept map, not contestants in a universal ranking.
A strong synthesis compares accepted browser behavior, architecture, pressure, observability, friction, human–agent work, and resource use while keeping observations separate from explanations and proposals.
The final engineering decision names the conditions it serves, the trade-offs it accepts, the first likely boundary, and what to measure when those conditions change.
