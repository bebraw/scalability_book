# Exercises throughout the book

Eleven automatically checked exercises cover all nine main chapters.
Measurement has three; each remaining chapter has one.
Questions use numeric calculations or fixed choices with explicit assumptions.
The demos and explanatory prose remain in their original chapter locations.
Live lecture sources are unchanged.
The earlier standalone modules are retained for comparison while this direction is reviewed; the homepage now points into the chapter.

## Content and versions

`shared/exercises.ts` is the canonical source for question text, discussion, stable ID, and version.
Insert an exercise in a chapter with `{{ import "exercise:measurement-boundary" }}`.
The same renderer supplies static reading and interactive markup; no second slide explanation is maintained for this pilot.
Increment the version when changing what the question asks, and keep its stable ID.
Earlier saved versions retain their original prompt and answer and appear in a disclosure below the current exercise.

## Private answers

Reading, discussion reveals, and experiments require no account.
Check answer runs deterministic checks and shows feedback for each part.
Save result persists the structured response; the server independently calculates completion.
An incorrect attempt can be saved and retried.
There is no self-reported completion checkbox or free-text grading.
The UI distinguishes unsaved, saved, restored, failed, and conflicting changes.
The answer API exposes only the verified session owner's records; it has no teacher/admin listing and does not publish answers as feedback.
GitHub numeric user IDs provide account identity independently of username changes.
Sessions created before this identity field was added need a fresh sign-in.
Authentication returns to the chapter and exercise; a temporary session-storage draft can bridge sign-in, with copy-before-leaving guidance when browser storage is blocked.

Answers use a separate `LEARNING_DB` D1 binding, not `COMMENTS_KV`.
Writes are awaited, bounded to 4000 serialized characters and validated against the exercise fields, same-origin, and conditionally applied against the revision the reader loaded.
A stale tab cannot silently overwrite a newer save.
Reads and writes return private/no-store responses.
Saved answers and completion are keyed by user, exercise ID, and question version.
This is formative work, not an individual test or a grading system.

## Local review

Run `rtk npm run dev` and open `/chapters/benchmarking/#demo-tail-latency-simulator`.
The existing local-editor identity is explicitly labeled in the save status.
Answers persist in `LOCAL_DATA_DIR/learning.sqlite` (default `.local/learning.sqlite`), using the same migration and SQL as production.
Opening another browser context or restarting the dev server retains them.
Local review does not execute GitHub OAuth or contact a production answer database.

## Production preparation

No production database has been created or migrated by this change.
Before deployment, create a dedicated D1 database, enable the `LEARNING_DB` binding illustrated in `wrangler.jsonc`, and apply `migrations/0001_learning_answers.sql`.
Use the existing GitHub OAuth secrets and session secret.
Verify OAuth return-to-exercise behavior and cross-device saves in the deployed environment.
Without the binding, the API returns 503 and the UI never claims a save succeeded.

The query adapter follows the [D1 prepared-statement API](https://developers.cloudflare.com/d1/worker-api/prepared-statements/).
Tests cover identity isolation, disk persistence, conflicting writes, version retention, input/origin validation, mobile layout, save failures, and anonymous/no-JavaScript reading.

Version 2 of the three measurement exercises replaces the original free-text pilot.
Exercises introduced in the other chapters start at version 1.
Earlier version-1 responses remain readable and do not count as completing the revised exercise.
Numeric fields accept finite decimal/scientific notation with exact expected values; the questions specify units and the percentile convention.

## Explore and Practice tabs

Nine demo/exercise pairs are progressively enhanced into accessible tabs, using the optional `demo` ID and label in the exercise definition.
Place each exercise beside that demo in its chapter.
The measurement experiment-comparison and final evidence-classification exercises remain inline.
Tabs move existing DOM nodes, retaining demo settings and unsaved responses.
Arrow keys and Home/End switch tabs; chapter hashes and browser history reveal the referenced panel.
Explore opens by default; direct links to exercises open Practice.
Each exercise gets its own tab rather than an exercise count.
Practice shows completion after checking, and edits clear that completion indicator.
Without JavaScript and when printing, both demo and exercise remain in the reading flow.

The `/demos/` showcase renders the same exercise definitions and Explore/Practice pairs, plus the two standalone exercises.
Stable exercise IDs share saved progress with the chapter versions.
Links return to each exercise in its chapter.
