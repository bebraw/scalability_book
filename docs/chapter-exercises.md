# Exercises throughout the book

Thirteen automatically checked exercises cover all nine main chapters.
Measurement has four, Scaling has two, and each remaining chapter has one.
Questions use numeric calculations or fixed choices with explicit assumptions.
The demos and explanatory prose remain in their original chapter locations.
The lecture plan links the two cumulative questions for short discussions.
The earlier standalone modules are retained for comparison while this direction is reviewed; the homepage now points into the chapter.

## Content and versions

`shared/exercises.ts` is the canonical source for question text, discussion, stable ID, and version.
Insert an exercise in a chapter with `{{ import "exercise:measurement-boundary" }}`.
The same renderer supplies static reading and interactive markup; no second slide explanation is maintained for this pilot.
Separate prediction, setup, and calculation instructions with a blank line in the canonical prompt to render them as distinct paragraphs.
Increment the version when changing what the question asks, and keep its stable ID.
Earlier saved versions retain their original prompt and answer and appear in a disclosure below the current exercise.

## Private answers

Reading, discussion reveals, and experiments require no account.
Check answer runs deterministic checks and shows feedback for each part.
Save result persists the structured response; the server independently calculates completion.
An incorrect attempt can be saved and retried.
There is no self-reported completion checkbox or free-text grading.
The UI distinguishes unsaved, saved, restored, failed, and conflicting changes.
When loading saved answers fails, editing, checking and restoring a tab draft retain that failure explanation and keep Save disabled.
A signed-in learner is not prompted to sign in again merely because answer storage is unavailable; automatic checking remains usable.
The answer API exposes only the verified session owner's records; it has no teacher/admin listing and does not publish answers as feedback.
GitHub numeric user IDs provide account identity independently of username changes.
Verified enrolled-student email sessions can also save answers, keyed by course run and stable internal student identity.
The website's **Account** view offers both sign-in methods and names the selected exercise owner.
Existing GitHub answers stay selected while GitHub is signed in, even if a course email session is also active; signing out of GitHub selects that enrollment's separate answer collection.
Names, matching emails and optional profile fields never merge collections.
After an account change, saves are disabled until **Load this account’s saved answers** explicitly loads the chosen collection in place, preserving an unfinished attempt for review.
The server rejects saves from a browser that still expects a different answer owner.
Sessions created before this identity field was added need a fresh sign-in.
Authentication returns to the chapter and exercise; per-exercise session-storage drafts retain unfinished fields in the original tab, including incomplete answers.
Email links can be requested in place from Account; when confirmation opens another tab, the original tab retains the unfinished attempt.

After checking a complete answer, **Discuss my answer** prepares an editable assistant message.
The adjacent preview shows the canonical exercise prompt, ID/version, selected attempt and field-specific checker feedback.
The worked answer and notebook notes are excluded from this handoff.
Preparing it requires neither GitHub nor course sign-in and sends no model request or notebook save.
The existing companion connection and explicit assistant Send action are still required for a reply.

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

## Production storage and deployment

The dedicated `scalability-book-learning` D1 database was provisioned in the EU jurisdiction on 2026-10-09.
`wrangler.jsonc` binds it as `LEARNING_DB`; `migrations/0001_learning_answers.sql` has been applied to the production database.
This database is separate from course records, reader feedback and the local companion's private notebook.
Wrangler previews use local D1 storage by default; the binding does not enable remote development access.

Apply pending migrations before deploying a change that needs a new schema:

```sh
npx wrangler d1 migrations list LEARNING_DB --remote
npx wrangler d1 migrations apply LEARNING_DB --remote
```

For an isolated local Worker preview, apply the same migrations with `--local` in place of `--remote`.
On a separate Cloudflare account, create a dedicated database and replace this binding's database ID before applying migrations or deploying.
Use the existing GitHub OAuth secrets and session secret.
Email-only exercise access also needs the existing course database/auth migrations and enabled course-mail configuration from [the course guide](course-system.md#institutional-enrollment-and-sign-in).
No new exercise or course schema migration is required for these identities and return destinations.
After deployment, verify that a signed-in learner can save an answer and restore it in a fresh tab, independently of the original tab draft.
Without the binding, the API returns 503 and the UI never claims a save succeeded.
Rolling back the Worker or removing its binding does not roll back the database; retain the database and its saved answers when reverting application code.

The query adapter follows the [D1 prepared-statement API](https://developers.cloudflare.com/d1/worker-api/prepared-statements/).
Tests cover identity isolation, email session revocation, existing GitHub ownership, disk persistence, conflicting writes, version retention, input/origin validation, mobile layout, save failures, reviewed assistant context, and anonymous/no-JavaScript reading.

Version 2 of the three measurement exercises replaces the original free-text pilot.
Exercises introduced in the other chapters start at version 1.
Version 2 of `fleets-amdahl` turns the ideal-speedup calculation into a feature-and-review scenario: learners predict the effect of a larger fleet, calculate isolated completion time and ongoing rates, then interpret accepted throughput and backlog growth.
Version 2 of `pressure-retries` asks learners to inspect both the work-item status and its promised activity event before assessing idempotency and selecting a retry mechanism.
Earlier version-1 responses remain readable and do not count as completing the revised questions.
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

The `/demos/` showcase renders the same exercise definitions and Explore/Practice pairs, plus the four standalone exercises.
Stable exercise IDs share saved progress with the chapter versions.
Links return to each exercise in its chapter.
The gallery's **More practice** section has its own full-width exercise cards, a direct `#more-practice` link and an index of the standalone questions.
Answer fields use two columns on wider screens and one on narrow screens; these cards remain outside the demos' sidebar/content frame.
Checking, private saves, stable IDs and chapter progress use the same exercise definitions and controls.

## Concepts across the book

The book's concept reference is published at `/concepts/` and linked from the main navigation.
Its entry page offers concept lookup and encourages students to choose their own question and connect their own agent to the knowledge graph.
The complete visual graph and compact concept directory are behind “Explore the whole book”; scoped reading links, searches, and concept fragments open the relevant view directly.
Every published chapter, appendix, part introduction, case study, and project brief has a scoped “Follow an idea” index.
Chapter indexes include an ungraded connection prompt; selected terms in the prose also open the reference.
The nine self-study modules link to the matching view of the complete graph.

`shared/concepts.ts` and `shared/book-concepts.ts` own definitions, assumptions, worked examples, common mistakes, and curated teaching locations.
`shared/concept-relationships.ts` and `shared/book-concept-relationships.ts` own explained teaching connections, with directed propositions and undirected comparisons.
Direction follows the qualified authored statement; it does not imply a prerequisite or an unconditional causal claim.
`shared/concept-pages.ts` separately records where ideas are discussed and the chapter connection prompts.
Co-occurrence does not create a conceptual edge.

The site build generates `/concepts/graph.json`, `/concepts/graph.md`, `/concepts/agent-guide.md`, and a short `/llms.txt` discovery index from these registries.
Both graph formats include the complete authored definitions, qualifications, relationship explanations, and reading locations.
The JSON contract has `schemaVersion: 2` and a deterministic content revision; resource and citation URLs use the publication origin or the local preview origin.
The revision identifies authored content, not an archived reading snapshot.
These read-only HTTP and downloadable resources are also available through the public `/mcp` endpoint described in [agent learning resources](agent-learning-resources.md#public-mcp-server).
The guide describes search, neighbor traversal that preserves proposition direction, and reading retrieval so students can use existing retrieval tools or build their own integration.
Students choose a question, state an initial explanation, inspect retrieved passages, and record what they accepted or challenged.
Agents should cite actual retrieved material, preserve usage notes and assumptions, and distinguish the book's authored connections from their own inferences.

The chapters provide the narrative path; optional investigations now have task-based starting points at `/explore/`.
Seven activities live outside the reading flow, with brief invitations in their original passages and links from course tasks and relevant concepts.
Each provides a self-contained `/explore/<id>/agent.md` URL, a direct reading page, and separately retrievable worked reasoning.
The graph carries `explorations` and concept-level `explorationIds` without adding relationships or required deliverables.
See [agent learning resources](agent-learning-resources.md) for the source and conversation contract.

The complete graph supports topic search, reading and theme filters, neighborhood focus, zoom, and panning.
Every connection has a short authored label alongside its explanation.
“Show connection labels” reveals these captions in complete, chapter, and pane graphs; it is off by default and affects only the graph where it is toggled.
Labeled views make additional room for captions without covering concept nodes.
Its view can be shared through the query parameters `q`, `reading`, `theme`, `topic`, `group-view`, and `view=all`.
A deterministic layout is generated from the registry by `shared/concept-graph.ts`; no per-concept coordinates need maintenance.
The filtered text list and relationship explanations provide the same navigation without relying on the diagram.
Static SVG links, reference passages, and relationship text remain available without JavaScript.

Concept links open a keyboard-dismissible reading pane and preserve the reading position and original opener's focus.
Each pane shows the concept's complete neighborhood, including ideas beyond the current chapter.
The reference library is fetched once when needed on reading pages; failed fetches fall back to the ordinary reference URL.
Modified clicks retain normal browser navigation.
The reference page itself is complete static HTML and needs no library fetch.

To add an idea, author its passages and teaching locations, add relationships with short labels and explanations, and assign relevant reading memberships.
Keep a separate concept only when it adds a distinct explanation or reasoning task: mean and tail latency share one Latency card, while the tail-latency simulator remains a separate practice activity.
Resource associations describe what the current activity teaches, rather than every topic mentioned in its surrounding chapter.
Concept teaching locations can link directly to local practice instructions, including HTTP caching and persisted retry, without treating a downloadable lab as a browser demo.
Use ordinary Markdown links such as `[idempotency](/concepts/#idempotency)` at useful teaching occurrences, rather than automatically linking every mention.
Build-time integration inserts the scoped index before the first second-level heading without changing source offsets used by paragraph feedback.
Concept reference links are excluded from paragraph identity hashes so adding these reading aids preserves existing feedback targets.
The registry tests check published-page coverage, relationship integrity, and caption spacing in overview, focused, and scoped layouts.
Browser checks verify every curated teaching anchor, agent resources and retrieval, search and navigation, local label toggles, contrast in all themes, mobile overflow, accessibility, keyboard dismissal, and the static fallback.

The `measurement-transfer` and `scaling-model-choice` exercises reuse the existing checking and private-save system.
Their adjacent explanation prompts are ungraded: a correct calculation is not evidence that the learner can justify a boundary or choose an intervention.
The matching self-study modules link to the canonical questions.

The revised Fleets practice follows the same pattern: prediction before calculation, checked values and an interpretation choice, then an ungraded explanation and an assumption change before revealing the worked answer.
Its ongoing rates describe overlapping implementation and review; the question explicitly separates these from startup counts and from the completion time of an isolated feature.

The revised Pressure practice teaches idempotency as a property of all intended effects at the declared boundary.
An unchanged status with a duplicate promised activity event is the misconception checked by the question.
The adjacent ungraded prompt changes the domain event to a diagnostic request log and asks learners to justify the boundary again.
HTTP method properties and response differences are developed in Appendix C, with links from the chapter, concept card, lecture plan, and self-study module.

During teaching, ask learners to explain a connection before opening its reference and to name where an analogy stops.
Use the existing lecture notes and diary prompts to capture recurring confusions; the concept expansion adds no required submission or separate assessment.
