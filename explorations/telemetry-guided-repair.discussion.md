The `201` response records a successful HTTP outcome under the server's implementation.
By itself it does not establish that the declared persistence contract was met or that the browser updated.
The later GET returning E7 is evidence that the event is available through that read path at that time.
The packet contains no storage restart, so durability across restart remains untested.

The render observations make the path from a successful response to the active list a useful place to investigate.
They do not identify a source-level cause.
A stale client cache, a missed invalidation, or a view using an earlier result could fit this record.
Inspect the state transition and the data actually consumed by the list before selecting a repair.
Retrying the POST merely to refresh the view could create another event while leaving the original cause unresolved.

A useful brief preserves the workspace, event and request identities, the successful response, the unchanged list, and E7's appearance after reload.
It should label a suspected cause as a hypothesis.
"The save failed" discards the later read; "the database is durable" invents an observation.
Check each claim against the raw packet and retain gaps rather than filling them with a plausible story.

Acceptance belongs to the declared user and access behavior.
For a valid E7, check that the list contains E1, E2, and E7 before reporting completion and after restart.
An empty-label attempt must return `422` while leaving those stored and displayed IDs unchanged; a W2 request must return `403` without E9 or other event data.
A fix that displays every event, shows rejected writes optimistically, or changes the test to require a reload has not preserved the contract.
Instrumentation must also preserve the failure: logging can change timing or accidentally change code, making its evidence a different experiment.

Fresh copies and contexts prevent a later condition from inheriting an earlier fix or diagnosis.
Equal repair budgets do not imply equal total cost: collecting telemetry and constructing the brief consume resources too.
Record those costs even when one packet is reused, and distinguish shared setup from each trial's repair cost.
One successful repair cannot establish that briefs reliably outperform raw logs or task feedback.
