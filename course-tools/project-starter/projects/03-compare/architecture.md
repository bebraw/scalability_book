# Compare architecture

**Phase:** C  
**Revision explained:** _fill in the actual revision_  
**Current state:** Supplied HTTP stub only; no course application or persistent domain state.

## Supplied boundary

`server.mjs` starts the loopback HTTP server and serves the static `index.html` and health endpoint.
The stub has no application storage, work-item lifecycle, event recording, or dependency on another phase.
The source and tests in this directory are independent of the shared documentation and the other stubs.

## Our running system

_Replace this section as behavior is implemented.
Draw a small architecture or data-flow diagram for the core event workflow, including request entry, validation, state change, event recording, and visible result._

_Identify the authoritative state owner, transaction or consistency boundary, public interfaces, dependency direction, and responsibilities deliberately outside the workflow.
Link the actual code and relevant decisions._

_Distinguish what the current revision implements from proposed changes and known gaps.
For B/C, explain this build from its own evidence even when retaining an earlier decision._

Link this note and its checks through the [Ownership card](evidence/index.md#ownership-card).
The [shared specification](../../specifications/application.md) describes intended behavior; it is not evidence that this phase implements it.
