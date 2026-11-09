# Compare evidence index

This is a working scaffold for the existing [common submission bundle](https://scalableweb.dev/project/#9-common-submission-bundle-and-comparable-evidence) and [Compare brief](https://scalableweb.dev/project/compare/).
Fill relevant entries as work happens; do not complete this entire file before starting.
Link an artifact once and reuse it where useful.
Placeholders are not evidence, and the assigned course checklist remains authoritative.

## Implementation

### Setup and provenance

- Group or approved solo identifier, phase C, full submitted commit, and frozen archive: _fill in at submission_.
- Assigned requirement edition and exact published environment configuration: _link the retained versions; record deviations_.
- Actual language, framework, storage, deployment approach, hardware or hosting, runtime and agent-tool versions: _record or reference unchanged published fields_.
- Actual model identities, inference routes, context and tool limits, imported instructions/capabilities, routing and fallback: _confirm what ran; mark unavailable fields_.
- Starter source/revision and retained manifest or original ZIP: _record before changes; retain dirty flags and file hashes for draft exports_.
- Material starter adaptations and inherited assumptions: _briefly explain; link consequential decisions_.
- Reproducible setup, demonstration-data reset, and validation: [phase README](../README.md), updated with actual commands.

### Effort and representative task

Record elapsed time, estimated active human time, and model usage or resource use across attempts, including failures and corrections.
State the pricing or departmental resource-cost basis separately from personal spending; mark unavailable measurements.

For one representative AI-assisted task, capture this compact record as the work happens:

- Brief and relevant specification/decision context: _what the agent was asked to do_.
- Actual model/harness and attempt conditions: _link the setup above and any deviations_.
- Checks and observations: _commands, expected result, actual result, and compact evidence_.
- Human intervention or correction: _include failed and abandoned attempts that matter_.
- Acceptance decision and limits: _who accepted what; remaining gaps_.

The first workspace create/list/restart task can begin this record.
Keep a curated account; an unredacted transcript is not the submission.

### Product and measurement evidence

- Common acceptance scenarios: _results and missing cases_.
- Automated application checks: _commands and results; distinguish supplied setup smoke tests_.
- Repeated shared baseline workload: _adapter, synthetic fixture/reset, measurement boundary, profiles, repetitions, correctness checks, and results_.
- Resource-efficiency proxy: _signal, procedure, units, and limits; do not relabel a resource proxy as energy or carbon_.
- Operational evidence: _local run or deployment, environment, known defects, and incomplete requirements_.
- Primary-pressure record: _link the declared pressure, procedure, observations, interpretation, and limits; extend it under the current phase brief_.

Use the [common workload and pressure record](https://scalableweb.dev/project/#7-shared-runtime-workload-and-progressive-scalability-analysis) rather than inventing a different baseline.
Preserve failed checks and incomplete outcomes.

### Engineering explanation

- Current architecture and core-event data flow: [architecture.md](../architecture.md).
- Shared intent and decision history: [specification](../../../specifications/application.md) and [ADRs](../../../docs/adrs/README.md).
- Readable phase snapshots of those documents: _link retained copies/exports and identify revision; live shared files alone are not a frozen snapshot_.
- One evidenced development bottleneck: _phase/revision, observation, response and rationale, check result or justified next step_.
- Reflection: _separate observation from possible explanation and unsupported inference_.

#### Ownership card

**Phase and submitted revision:** C, _full commit_.

| Field                     | Answer or evidence link                                                  |
| ------------------------- | ------------------------------------------------------------------------ |
| Code entry points         | _Source root and composition/request entry for the core event workflow._ |
| State authority           | _Authoritative state and the component allowed to change it._            |
| Public contracts          | _Interfaces, lifecycle, and event-recording obligations._                |
| Dependency direction      | _Which components may depend on which others._                           |
| Excluded responsibilities | _What this workflow or component does not own._                          |
| Validation and acceptance | _Checks, results, and who accepts the work._                             |

### Engineering session and audits

- Engineering session: _prediction, challenged assumption, check, acceptance decision, and responsibility rotation or approved solo passes/instructor discussion_.
- Incoming independent audit: _reviewer, frozen revision, setup/probe conditions, report, and later author response_.
- Outgoing assigned audit: _target/reference, frozen revision, report, and comparison limits_.

Follow the [bounded audit protocol](https://scalableweb.dev/project/#10-bounded-cross-team-audit), retaining setup time separately from the released change-probe time and recording blocked or incomplete outcomes.
Keep private diaries, self/peer assessment, and individual portfolios outside this technical index.

## Fleet evidence

- Fleet plan before implementation: _task graph, real delegated responsibilities, outputs/checks, approved model assignments and actual routing, dependencies, integration owner, approval boundaries, shared-state ownership/lifetime, budgets, and stop conditions_.
- Actual-run record: _compact redacted tasks, actors, handoffs, validation, integration, corrections, and human interventions; link at least two supported debugging findings_.
- Coordination observations: _delegations/parallel work, duplication, conflicts, blocked time, failed handoffs, review/integration effort, defects after agent completion, and aggregate usage/resources including retries and failures_.
- B–C workflow comparison and formal model: _accepted work, coordination/review limits, an applicable scalability law/model with assumptions, and interpretation limits_.
- Required supplied matched-trace analysis: _package provenance and task/configurations/checks/outcomes; what was held constant, actual observations, human/model resources, corrections, missing information, and limits_.

Use a real fleet for fresh C.
Supplied observations are not measurements of your own run; label synthetic evidence.
Trace import into C, your own matched pair, and a model-assignment comparison are optional and cannot replace the required analysis.

## Scaling and deployment experiment

- A–B–C primary-pressure comparison: _same procedure where practical, results, differences, and limits_.
- Application-level formal model: _variables, assumptions, calculation/reasoning, runtime evidence, and what it does not capture; separate from the workflow model above_.
- Selected A, B, or C revision and justified scaling response: _preserved baseline, proposed effect, implemented change, and new failure/recovery obligation_.
- Before/after checks: _same fixture, workload, correctness and measurement procedure; all repetitions, latency, throughput, errors, correctness, resource proxy, and failure/recovery result_.
- Realistic deployment: _instructor-approved environment outside the author's development process; selected post-experiment revision, configuration/steps, rerun baseline workload, local/deployed differences, first limit, and what remains unproven_.

Preserve an unsuccessful or inconclusive experiment and explain it.
Further pressure scenarios and an arrival-controlled overload run are optional except where the common contract's applicability conditions require one.

## Final decision

- Frozen A and B submission/evidence references: _link the existing records rather than re-uploading their archives_.
- A–B–C evidence matrix: _accepted behavior, architecture, pressure/measurement/recovery, friction, human–agent workflow, and resources; mark missing observations_.
- Target architecture and scaling trade-offs: _distinguish implemented results from proposals_.
- Conditional engineering argument: _what stayed stable and differed; consequential results and debugging findings; alternative explanations and comparison limits; architecture/workflow choice, rejected alternatives, human responsibilities, operations/correction ownership, and revisit signal_.

Label consequential claims as observed, inferred, or proposed.
Three fresh builds and one matched trace pair do not establish a general ranking of models or fleets.
Freeze C source and initial evidence, then add the independent audit and author response through the later evidence stage.
