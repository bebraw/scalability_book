# Establish evidence index

This is a working scaffold for the existing [common submission bundle](https://scalableweb.dev/project/#9-common-submission-bundle-and-comparable-evidence) and [Establish brief](https://scalableweb.dev/project/establish/).
Fill relevant entries as work happens; do not complete this entire file before starting.
Link an artifact once and reuse it where useful.
Placeholders are not evidence, and the assigned course checklist remains authoritative.

## Setup and provenance

- Group or approved solo identifier, phase A, full submitted commit, and frozen archive: _fill in at submission_.
- Assigned requirement edition and exact published environment configuration: _link the retained versions; record deviations_.
- Actual language, framework, storage, deployment approach, hardware or hosting, runtime and agent-tool versions: _record or reference unchanged published fields_.
- Actual model identities, inference routes, context and tool limits, imported instructions/capabilities, routing and fallback: _confirm what ran; mark unavailable fields_.
- Starter source/revision and retained manifest or original ZIP: _record before changes; retain dirty flags and file hashes for draft exports_.
- Material starter adaptations and inherited assumptions: _briefly explain; link consequential decisions_.
- Reproducible setup, demonstration-data reset, and validation: [phase README](../README.md), updated with actual commands.

## Effort and representative task

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

## Product and measurement evidence

- Common acceptance scenarios: _results and missing cases_.
- Automated application checks: _commands and results; distinguish supplied setup smoke tests_.
- Repeated shared baseline workload: _adapter, synthetic fixture/reset, measurement boundary, profiles, repetitions, correctness checks, and results_.
- Resource-efficiency proxy: _signal, procedure, units, and limits; do not relabel a resource proxy as energy or carbon_.
- Operational evidence: _local run or deployment, environment, known defects, and incomplete requirements_.
- Primary-pressure record: _link the declared pressure, procedure, observations, interpretation, and limits; extend it under the current phase brief_.

Use the [common workload and pressure record](https://scalableweb.dev/project/#7-shared-runtime-workload-and-progressive-scalability-analysis) rather than inventing a different baseline.
Preserve failed checks and incomplete outcomes.

## Engineering explanation

- Current architecture and core-event data flow: [architecture.md](../architecture.md).
- Shared intent and decision history: [specification](../../../specifications/application.md) and [ADRs](../../../docs/adrs/README.md).
- Readable phase snapshots of those documents: _link retained copies/exports and identify revision; live shared files alone are not a frozen snapshot_.
- One evidenced development bottleneck: _phase/revision, observation, response and rationale, check result or justified next step_.
- Reflection: _separate observation from possible explanation and unsupported inference_.

### Ownership card

**Phase and submitted revision:** A, _full commit_.

| Field                     | Answer or evidence link                                                  |
| ------------------------- | ------------------------------------------------------------------------ |
| Code entry points         | _Source root and composition/request entry for the core event workflow._ |
| State authority           | _Authoritative state and the component allowed to change it._            |
| Public contracts          | _Interfaces, lifecycle, and event-recording obligations._                |
| Dependency direction      | _Which components may depend on which others._                           |
| Excluded responsibilities | _What this workflow or component does not own._                          |
| Validation and acceptance | _Checks, results, and who accepts the work._                             |

## Engineering session and audits

- Engineering session: _prediction, challenged assumption, check, acceptance decision, and responsibility rotation or approved solo passes/instructor discussion_.
- Incoming independent audit: _reviewer, frozen revision, setup/probe conditions, report, and later author response_.
- Outgoing assigned audit: _target/reference, frozen revision, report, and comparison limits_.

Follow the [bounded audit protocol](https://scalableweb.dev/project/#10-bounded-cross-team-audit), retaining setup time separately from the released change-probe time and recording blocked or incomplete outcomes.
Keep private diaries, self/peer assessment, and individual portfolios outside this technical index.

## Establish additions

- First closed product loop and deliberately deferred optional scope: _describe and link accepted behavior_.
- Stack hypothesis and evolving decisions: [ADR-001](../../../docs/adrs/ADR-001-stack.md), with the actual choice, learning question, risks, and revisit condition.
- Two bounded scalability claims: _one about runtime demand/data and one about contributors/change; name pressure, boundary, range, first limit/signal, response, trade-off, evidence, and an excluded dimension_.
- Repeatable primary pressure: _hypothesis, declared fixture/workload transformation and resource limit, correctness/failure checks, repetitions, observations, and limits_.
- Large-model workflow reflection: _what worked, what needed smaller tasks/context/correction or manual work, which limits belonged to model/harness/project, and supporting evidence_.

Freeze source and initial evidence at the implementation deadline; add the audit report and response in the later evidence stage without replacing that frozen record.
