# Portable Fleet Trace Example

This fixture supports Compare's [optional trace-import extension](https://scalableweb.dev/project/compare/#optional-import-the-trace-into-c).
It illustrates a portable transformation target; another documented portable format is acceptable.
It does not prescribe implementation C's internal storage schema.

The [required actual-run analysis](https://scalableweb.dev/project/compare/#analyze-the-actual-fleet-run) accepts a compact redacted log or table with at least two supported debugging findings.
Machine-readable normalization, trace import and application-based views are not required for full credit.

The example contains one accepted fleet run, two agents, one human integration owner, and three dependent tasks.
Its events include delegation, start, handoff, failure, retry, validation, review, human intervention, and completion.
The fixture uses synthetic small-model identities and illustrative costs, not measured performance or prices.
A mixed-model export should preserve each actor's assigned model and any per-attempt routing or substitutions in event metadata or linked evidence.

Files:

- `example.trace.json` contains the example run.
- `trace.schema.json` defines the portable JSON shape.

## Mapping to the Work Activity Tracker

| Trace concept        | Application concept             | Mapping rule                                                                               |
| -------------------- | ------------------------------- | ------------------------------------------------------------------------------------------ |
| `run`                | Workspace                       | Use the stable run ID as import provenance and the run title as the visible workspace name |
| `actor`              | Actor                           | Preserve the source actor ID, name, kind, role, and declared model where available         |
| `task`               | Work item                       | Preserve the source task ID, title, current state, assignee, parent, and dependencies      |
| `task_created`       | `item_created` event            | Import exactly one creation event per task                                                 |
| First `task_started` | `work_started` event            | Move the item from the initial stage to the active stage                                   |
| `task_completed`     | `work_completed` event          | Move the item from the active stage to the finished stage                                  |
| Other trace events   | Additional activity-event types | Preserve their canonical type, actor, time, attempt ID, sequence, and safe metadata        |

Failures, retries, validation results, reviews, handoffs, and human interventions add history without moving an active item backward through the required lifecycle.
If a source tool has richer states, document how they collapse into `open`, `in_progress`, and `done`.

## Import contract

A repeatable importer should:

1. parse the JSON and validate it against `trace.schema.json` or equivalent application-level checks;
2. reject unsupported schema versions with an understandable error;
3. verify that actor, task, parent, dependency, and event references resolve;
4. create or select one workspace for the run;
5. import actors, tasks, and events in ascending `sequence` order;
6. preserve every source ID in import provenance even if the application generates its own identifiers;
7. verify final work-item states and event counts after import;
8. produce the same stored result when the same trace is imported again.

For the final rule, either upsert or deduplicate records by stable run-scoped source IDs, or reset and rebuild the imported workspace before each load.
Document the chosen policy.
Do not silently append duplicate tasks or events.

## Redaction

Transform and redact the source export before importing it.
The portable trace should not contain secrets, credentials, full prompts, private source code, or unrelated tool output.
Keep compact summaries, stable linking identifiers, timing, outcomes, validation evidence, and aggregate usage or cost fields needed for the analysis.

The top-level `redaction` object records what was removed.
It is evidence about the transformation, not proof that the trace is safe; inspect the produced file before submission.
