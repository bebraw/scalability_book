# Durable workflows and retry-safe effects

Use this appendix when an asynchronous operation spans several steps, must survive process failure, or can repeat an external side effect.
The [Scaling chapter](/chapters/scaling/) keeps the essential design warning: durable coordination does not make external effects exactly-once.
This appendix develops explicit state machines, replay-based workflows, retry boundaries, idempotency, compensation, cancellation, and operator evidence.

## Durable execution preserves coordination progress

A queue can preserve a pending work item, but an asynchronous multi-step operation that must survive process failure also needs durable coordination state.
An explicit application state machine can store each transition and its current state in a database.
A replay-based workflow engine instead persists scheduling decisions and task results, then reconstructs logical control state by replaying deterministic orchestration code against that history.
In the replay-based design, calls to databases, APIs, models, and tools sit behind external-work boundaries; replay reuses results that reached workflow history rather than issuing those calls again :citep[burckhardt2021durablefunctions].

Durable orchestration does not guarantee exactly-once external effects.
Suppose the worker sends a subscriber webhook for event `E42`, the receiver accepts it, and the worker crashes before recording completion.
A timeout and retry may send the webhook again.
Temporal documents this boundary explicitly for Activities: an Activity may be retried and should therefore tolerate repeated execution, and a stable business idempotency key enforced by the called service is one way to make a non-idempotent effect safe to repeat :citep[temporal2026activitydefinition].
The caller must reuse that key across attempts, and the called service must apply the effect and record the key atomically.
If no component at the effect boundary can deduplicate, duplicate delivery remains possible; compensation or manual repair may be the honest recovery path.

For the event project, the event store remains authoritative for domain events, while state-machine state or workflow history records coordination progress.
Bound total retry time and resource cost, classify permanent errors, and expose terminal states.
Cancellation is a request to stop: it may not preempt an in-flight external effect and does not by itself undo one that already completed.
Every approach adds durable state and operational ownership; replay-based engines also require replay-compatible code evolution and management of history growth and retention.

### Field note — Preserve partial value during model refinement

I have encountered this problem repeatedly with local models in [Slideotter](/case-studies/slideotter/).
A model may return structurally valid slide data that still contains metadata-like language in audience-visible fields.
Slideotter treats this as a [semantic leak](https://github.com/bebraw/slideotter/blob/main/docs/adr/implemented/0050-visible-text-quarantine.md): authoring instructions, schema labels, sourcing notes, or layout guidance have crossed into presentation content.

The [implemented progressive-generation workflow](https://github.com/bebraw/slideotter/blob/main/docs/adr/implemented/0012-progressive-slide-generation-preview.md) preserves completed slides and allows generation to resume from the failed slide.
That is better than restarting the entire deck, but retry is not always the right product concept.
Parts of the rejected slide may already be correct, and blindly regenerating it can discard useful work.

I now see this as a refinement problem.
Transport failures and malformed structured output can be retried internally, but semantically questionable content should become a partial candidate.
The system should preserve valid fields, quarantine the rejected parts, and let the user edit them, regenerate only those fields, or request a broader rewrite.

This changes the workflow state from `failed → retry` to something closer to `drafted → needs refinement → approved`.
The durable unit is not merely a model request.
It is the user's evolving presentation intent and the portions of the candidate that have already passed review.

## Durable effect retry lab

The lab below stops a worker after a webhook receiver applies its effect but before the workflow records completion.
Predict the outcome, inject the crash, then compare retry keys and receiver enforcement while keeping the logical command, physical attempts, outbound calls, effects, and durable completions separate.

{{ import "site/includes/durable-retry-demo.html" }}

The simulation holds the failure point constant.
It demonstrates how one bounded retry contract behaves; it does not establish that every receiver, workflow engine, or external operation exposes the same enforcement boundary.

## Audit the effect boundary

The critical question is not only whether the workflow resumes.
Identify the last durable coordination fact, the external effect that may already have occurred, the stable identity reused across attempts, the component that enforces deduplication, and the terminal state exposed to an operator.
If the receiver cannot enforce retry safety, record duplicate delivery as a residual risk and define compensation or repair.
