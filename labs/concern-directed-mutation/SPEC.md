# Mutation exercise contract

Version 1. The public tracker interface and the three concerns in README.md define the behavior to check.
Workspace `W1` starts active, belongs to `alice`, and excludes `bob`.
Commands identify a workspace, actor, command ID and event type.

- A non-member command is rejected without appending an event.
- Reusing the same command ID and arguments returns its recorded result without appending another event; conflicting reuse is rejected.
- A new command submitted after archival is rejected without appending an event.

Choose one concern and add a black-box test to `starter.test.ts`.
Use only the exported tracker interface and inspect the returned result and/or observable event history.
The same test must pass the baseline and the correct `storage-refactor`, and fail the chosen faulty variant through a relevant assertion.
Do not inspect private storage, branch on mutation names, change the variants, or count syntax/import errors as detecting a fault.
See README.md for the mode names and the evidence table.

## Prediction and intended check

_Name the concern, predict the public observation that differs, and explain why the correct storage refactor should still pass._
