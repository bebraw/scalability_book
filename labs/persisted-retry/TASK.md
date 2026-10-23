# Implement one atomic receiver operation

Read SPEC.md and inspect `store.mjs` before changing anything.
Implement only `applyOnce` in `apply-once.mjs`, using the provided SQLite connection and schema.
Keep tests, receiver, worker and check runner unchanged; they provide independent expectations and the failure boundary.
Maintain SPEC.md and one decision record if the agreed design or scope changes.

Predict first, run preflight, preserve the initial feature failures, implement and run the contract and process checks.
Inspect the stable-key and fresh-key records and explain why an atomic receiver cannot deduplicate two different keys.
Retain the actual model/harness/configuration, assistance, failed attempts, corrections and check results in existing notes.
Do not claim process recovery or a completed check without running it.
If setup consumes the planning budget, record that outcome separately and stop optional expansion.
