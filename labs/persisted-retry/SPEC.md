# Persisted retry contract

Version 1. `applyOnce(db, { key, message })` receives an open SQLite connection and validated string fields.
The supplied schema has `effects(id, message)` and `receipts(command_key, message, effect_id)`; `store.mjs` owns schema and connection setup.

- A new key creates one effect with the exact message and one receipt linking that key and message to the effect.
- Return `{ effectId: Number, replayed: false }` for a new effect.
- The same key and message return the original effect ID with `replayed: true`, including after closing and reopening the database.
- A different key is a different command, even when its message is identical.
- The same key with a different message throws an error whose `code` is `KEY_CONFLICT`; neither ledger changes.
- Recording the effect and receipt is one atomic operation.
  If writing the receipt fails, the effect must roll back too, and the connection must remain usable.
- Do not mutate the command, reset the database, swallow an unexpected error or keep an in-memory deduplication authority.

The worker records attempts and completion in a separate SQLite file.
The provided failpoint exits with code 86 after the receiver confirms its effect and before worker completion is recorded.
Restarting both processes with the same directory must leave one receiver effect for the stable logical key and one worker completion after recovery.
The `--fresh-key` negative control uses a different physical key for each attempt and must produce two effects across the same interruption.

The receiver's atomic boundary is local to its SQLite database.
No external email, payment or other real-world effect occurs.
This tests the chosen process-interruption window, not power-loss durability, concurrent replicas, general message delivery or end-to-end exactly-once execution.

## Prediction and intended checks

_Before implementation, predict the effect/receipt/completion counts immediately after interruption and after restart; name the observation that would reject your prediction._
