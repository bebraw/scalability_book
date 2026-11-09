# Work Activity Tracker: our maintained specification

**Status:** Initial task outline; the application is not implemented by this starter.

- Course requirement edition and stable reference: _record the instructor-assigned edition or retained snapshot_.
- Common contract: <https://scalableweb.dev/project/>.
- Run-specific environment and exact configuration reference: _record the published version and actual approved route_.
- Group or solo project identifier: _fill in_.

The course contract owns the required domain model, behavior, acceptance scenarios, workload, transfer rules, and submission requirements.
This document captures our clarifications, bounded tasks, and acceptance decisions without weakening that contract.
The current public website is a reading aid; use the assigned edition if it differs.

## First task: a persistent workspace loop

**Intent:** A user can create a workspace through the web application, find it in the workspace list, and find it again after an ordinary server restart.

Before implementation, consult the common contract's workspace and validation requirements and record any permitted choices needed for this task.
Choose the persistence mechanism and request/UI shape in the active build; this shared behavior does not prescribe a database, schema, URL, or module structure.

Acceptance observations:

1. Starting from the documented initial state, create a workspace with a new valid name through the application.
2. Confirm that the workspace appears in the list with the submitted value.
3. Stop and restart the server normally, then reload the list and confirm that the workspace remains.
4. Check the applicable invalid-input behavior from the assigned contract; an invalid request must not create a workspace.

Add a focused automated check and perform the actual restart journey.
The smoke check supplied by the starter does not cover these outcomes.
Ordinary restart evidence does not establish crash durability or concurrent-write correctness.

Deferred from this first task, but still required by the course: work items and their lifecycle, activity events and feed, filtering, summaries, remaining validation and acceptance scenarios, repeatable data, workload adapter, and required evidence.
Optional product extensions remain outside this task.

## Next bounded tasks and clarifications

_As work proceeds, record the next intended behavior, relevant contract section, acceptance conditions, constraints, unresolved questions, and deliberately deferred scope._

_Describe the complete first product loop before expanding optional scope; the workspace-only task above is an onboarding milestone._

## Phase evidence

| Phase         | Intended-behavior snapshot               | Implemented behavior and known gaps                      |
| ------------- | ---------------------------------------- | -------------------------------------------------------- |
| A — Establish | _Link the frozen snapshot and revision._ | [A evidence](../projects/01-establish/evidence/index.md) |
| B — Challenge | _Link the frozen snapshot and revision._ | [B evidence](../projects/02-challenge/evidence/index.md) |
| C — Compare   | _Link the frozen snapshot and revision._ | [C evidence](../projects/03-compare/evidence/index.md)   |
