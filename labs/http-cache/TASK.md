# Implement one conditional-response function

Read SPEC.md and record your predictions before implementation.
Implement only `responseFor` in `response.mjs` with your chosen model/harness.
Keep the supplied server, browser page and acceptance checks unchanged.
Maintain the specification and one decision record as the agreed design evolves.

Establish passing preflight separately from the unfinished feature failures.
Preserve first and final results, then inspect actual browser bodies and origin logs under both policies.
Explain why a network 304 can appear as a successful 200 browser response with a body, and why changing the origin does not invalidate a fresh browser entry.
Record the actual model, harness, settings, assistance, failed attempts and check limitations in existing notes.
Do not replace HTTP caching with a JavaScript map or claim browser reuse from a direct conditional HTTP check alone.
