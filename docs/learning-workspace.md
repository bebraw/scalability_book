# Learning workspace

This document owns the executable learning-workspace contracts and local companion setup.
[ADRs 027–029](adrs/README.md#implemented) record the agreed whole-book direction.
Implemented status identifies verified software behavior; production rollout and learner outcomes have their own evidence.

[Implemented ADRs 031–033](adrs/README.md#implemented) cover responsive support, independent application with reflection and scaffolded peer inquiry.
[ADR-034](adrs/implemented/ADR-034-separate-the-private-notebook-from-the-teaching-assistant.md) separates Notebook and Teaching assistant experiences with deliberate handoffs.
[Accepted ADR-035](adrs/accepted/ADR-035-ground-the-teaching-assistant-in-a-shared-teaching-policy.md) defines the follow-up shared teaching policy, personality and evaluation criteria; its new policy identity/versioning remains awaiting implementation.

## Current implementation

The local companion provides an authenticated private notebook API: note capture and revision history, concept self-assessment, portable export/import and selected-note submission drafts.
The whole-book Notebook and Teaching assistant entry points load one shared interface on demand on reading, concept, exploration and demo pages, independently of feedback sign-in.
Both header entries remain available to every reader; passage context comes from an explicit selection in the reading, without paragraph Note buttons.
Opening either experience captures the selection before loading/focusing the interface.
Notebook offers **Use selected text** and Teaching assistant offers **Discuss selected text** when already open.
Notebook captures a private writing context; assistant selection prepares a source without sending a message.
A chapter note keeps the reading link and authored concept membership without copying the chapter text.
The source is visible in Write; selected quotes have a bounded preview while their full captured text remains in the saved record.
An open experience follows book navigation and retains its active section; closing it keeps later pages lazy, with no companion request until reopening.
Opening either experience preserves the book's existing widths and positions, including its navigation, reading column and wider demos.
The fixed shared panel uses the right margin when there is space and overlays the reading area on smaller screens; close it to reach covered passages or demo controls.
Open experience, separate remembered sections, unfinished notebook writing, selected note IDs, submission preparation and assistant message/goal/help choices live in this website's tab session independently of the paired token.
Assistant state also retains the captured source, active conversation ID and initiating browser identity for resuming bounded requests after navigation.
Legacy version 1 tab records map Guide/Agent/Peers to Teaching assistant without migrating notebook or conversation databases.
Unsaved notes retain their original source across navigation; starting a replacement requires confirmation when writing would be lost.
Guide and concept choices follow the current reading; peer inquiry uses the current page or its captured passage.
Discuss retains its own chosen source across navigation and saved-conversation selection, independently of an unfinished notebook note; **Discuss the current reading** prepares a deliberate replacement.
Only Save note creates or revises a durable companion record; tab continuity is not a notebook backup and does not survive closing the tab.
Notes defaults to the current chapter/page, with Whole notebook available for cross-book review.
Notebook presents **Write**, **Notes** and **Concepts**; **Prepare** and the shared **Connect** settings live under **More learning tools**.
Teaching assistant presents **Discuss**, **Chapter guide** and **Peer discussion**, with the same connection settings.
Switching experiences does not save, send a message or require a second pairing.
**Discuss this note** supplies exactly that note; **Discuss selected notes** supplies the chosen set, with bounded source/note previews before sending.
An assistant reply offers **Write a takeaway** (a blank personal draft) and **Use as a notebook draft** (a reviewed suggestion), retaining its source and supplied-note relationships.
Either handoff asks before replacing unfinished writing; only the student's Save note action creates the notebook record.
The optional Codex adapter provides persisted conversations, bounded browser demo tools and student-reviewed notebook drafts.
Course-backed group/cohort inquiry uses the existing course identity and record store, with an initial-work reveal step and opt-in public editorial offers.
The standalone `@scalableweb/companion` package adds guided setup, a stable per-user default, local diagnosis, copy migration and an optional first investigation.
Registry publication and the declared platform/provider evidence are recorded in ADR-030; a built package does not by itself establish registry availability.
Production availability of peer inquiry depends on the existing course storage and authentication rollout.

The shared contract is [learning-workspace.ts](../shared/learning-workspace.ts).
[learning-activities.ts](../shared/learning-activities.ts) owns optional versioned independent cases; it reuses canonical exercises without owning their checks.
[learning-notebook.ts](../scripts/lib/learning-notebook.ts) owns local SQLite persistence; [learning-companion-http.ts](../scripts/lib/learning-companion-http.ts) owns pairing and API access.
These modules do not depend on course storage or a provider SDK.
The website/Worker never owns this private notebook or provider credentials.

## Start the companion

The packaged entry needs Node 24 or 26 and no checkout or website dependencies.
Follow [student setup](learning-companion-setup.md) for version 0.1.0 and its publication status.
The development entry keeps the repository's installed dependencies and existing default:

```bash
npm run companion
```

The process binds to `127.0.0.1:8788` and prints a single-use pairing code valid for ten minutes.
The default allowed websites are `https://scalableweb.dev` and `http://127.0.0.1:3000`.
Pass exact origins for another development port:

```bash
npm run companion -- --origin http://127.0.0.1:3100 --directory .local/learning-companion-test
```

The private notebook lives at `.local/learning-companion/notebook.sqlite`, outside published output and ignored by Git.
That path belongs to the repository entry only.
The packaged entry chooses the per-user macOS/Linux path in the student guide; both accept an explicit `--directory`.
Use `--directory` to choose another notebook and `--port` for another loopback port.
Keep the original database when updating the companion; restart it to obtain a new pairing code after disconnect, expiry or a lost browser session.

Pairing checks the exact website origin and loopback host.
The resulting bearer session is bound to that origin, expires after twelve hours and can be revoked through `/disconnect`.
Browser requests use the Authorization header, not URL credentials or cookies.
CORS preflight is origin-gated, including local-network permission requests.
The companion does not log notes, provider credentials or session tokens.

### Distribution, diagnostics and storage recovery

[learning-cli.ts](../scripts/lib/learning-cli.ts) owns `setup`, `login`, `start`, `doctor` and `migrate`.
Setup offers notebook-only or optional Codex use, creates required directories before login and stores the chosen provider/profile in `companion-settings.json`.
Port/origin/model overrides remain explicit command options; repeat them when starting or diagnosing that configuration.
CLI storage/schema checks occur before opening the writing stores.
An unavailable port, denied storage permission, unsupported provider version or missing dedicated-profile authentication provides a concrete next step while retaining records.
The dedicated Codex CLI authentication result is a prerequisite check; a real reply establishes account/provider availability.

Authenticated `/status` returns package/source revision, protocol, provider mode, selected storage path and notebook/conversation/archive schema versions.
The browser requires protocol 1 before retaining a paired token or accepting status.
Failed codes and expired sessions lead to ordinary re-pairing; network feedback names the possible process/origin/local-permission causes without pretending to distinguish them.
`doctor --json` contains only release/path/check metadata; no telemetry or automatic support upload is introduced.

[learning-storage.ts](../scripts/lib/learning-storage.ts) owns per-user path selection, exclusive process leases and explicit migration.
Migration requires `--from` and `--confirm-stopped`, validates regular files/supported schemas and copies privately through an atomic staged-directory rename.
It retains the source and rejects occupied destinations or active writers.
Notebook/conversation identities and histories are copied intact; included provider profiles are copied, while external profiles need an explicit `--codex-home`.
Setup preferences are not copied because their absolute profile path may identify the old directory; select the mode again after migration.
Sign-in/thread continuity must be checked before removing the source; retained notes can begin a new conversation when provider continuity is unavailable.

[learning-database.ts](../scripts/lib/learning-database.ts) owns database compatibility.
Package 0.1.0, browser protocol 1, portable archive 1 and notebook/conversation database schemas 1 are separate contracts in [learning-connection.ts](../shared/learning-connection.ts).
The original unversioned schema 0 is accepted only with recognized tables, snapshotted as `<database>.before-schema-1-<id>.backup` and marked schema 1 in a transaction.
New databases start at schema 1; unsupported schemas are rejected read-only before changing bytes.
Interrupted migration retains a recoverable snapshot and can be retried once writers stop.
Restoration and rollback require stopping the companion/provider, retaining current files separately and restoring a compatible pre-update directory/database; portable archives remain independent of raw conversations and credentials.
The student guide owns the concrete recovery steps and limits.

## Notebook and portability

Notes retain their original source URL, anchor, excerpt and available revision.
Editing appends a dated revision and preserves accepted assistance provenance.
Concurrent/stale edits are rejected rather than overwriting the latest note.
Concept judgments separate Studied from Unsure, Can explain and Can apply, with dated history, evidence references and a next intention.
These judgments do not affect exercise completion or grades.

Portable JSON uses schema version 1 and retains notes, their revision histories, source context and concept judgments.
Import adds nonconflicting records atomically and is idempotent for identical records.
If a record differs from existing work, import rejects the entire archive and preserves the notebook; keep both files and use a separate notebook directory to inspect conflicting copies.
Unknown schemas and inconsistent histories are rejected.
HTTP imports are limited to 16 MB; other JSON requests are limited to 96 KB.

Selected-note preparation produces readable Markdown for review and use in the existing diary/portfolio workflow.
It sends no notebook record to the course application and includes no unselected notes.
Students remain responsible for selecting the material and submitting it under the existing course requirements.

Developed written reflections show a suggested target of 400 characters and representative examples.
This is guidance, not a minimum or a quality score; short scratch notes and the existing audio/video diary options remain valid.
Evaluation may change this reversible cue without changing the assessment rubric.

The Write, Notes, Concepts and Prepare sections support capture, revision, recall before rereading, evidence-linked judgments and selected submission material.
The Connect section handles pairing and portable archives; connection tokens remain in the browser tab's session storage, while notebook records remain local.
Students review drafts and use the ordinary course submission form.
The published [student setup guide](learning-companion-setup.md) is available at `/notebook/setup/`.
The optional Chapter guide uses the current reading's authored prompt and demos actually present on that page.
Pages without a demo offer reflection without an observation action; the guide does not redirect every chapter to the queue lab.
Demo activities use existing authored prediction, operation, observation and reflection instructions and preserve their assumptions.
Save demo result stays disabled until private initial thinking is saved, explains that it captures current browser inputs/text, and shows the saved observation beside the action.
Errors and save confirmations appear at the relevant step; unavailable demos provide a visible fallback.
The guide offers **Apply it in a different situation** before reflection, including a queue-recovery variation and the existing benchmark/scaling transfer exercises.
Other readings use a claim applied to a different system with a changed condition, including pages without demos.
Students can choose their own related question; the self-check is a closed disclosure and help remains available before or after an attempt.
Explicitly saving creates a separate `revisit` entry related to the original thinking and evidence; reflection relates to those entries without replacing them.
Activity ID/version, question, assumptions, self-check and any student-chosen case are captured in the source excerpt alongside its book revision.
This uses the existing version 1 portable source and `relatedIds`, with no schema/protocol change; saved context is never re-resolved from a later activity definition.
Reviewed agent suggestions retain the existing assistance provenance when accepted; saving in the guide records the student's own text, not an assertion that external help was absent.
Reflection starters/examples are optional, and saving a reflection does not require completing the preceding steps.
Guided prediction/reflection drafts remain in tab storage for returning to the same page; changing demo asks before clearing unfinished writing.
Changed-case drafts are isolated by source and activity version and survive switching activities/pages within the tab.
For delayed recall, use **Notes → Revisit** on an earlier entry before opening its closed earlier-explanation disclosure; the student chooses the timing.
Leaving/skipping has no assessment consequence, and no mastery mark or new submission is generated.

## Verification

```bash
node --test tests/learning-notebook.test.ts tests/learning-companion.test.ts tests/learning-agent.test.ts tests/learning-storage.test.ts tests/learning-client.test.ts tests/learning-session.test.ts tests/course-inquiry.test.ts
npm run companion:pack
npm run companion:check
npx playwright test tests/e2e/learning-workspace.spec.ts tests/e2e/learning-onboarding.spec.ts tests/e2e/learning-demo-bridge.spec.ts tests/e2e/learning-peer-inquiry.spec.ts
npm run types:check
```

The checks cover restart persistence, accepted revisions, stale-write rejection, portable restore/import conflicts, selected-note preparation and the pairing/origin/session boundary with synthetic notes.
Browser checks cover whole-book entry points, lazy loading, capture, revision history, concept judgments, revisit, resumed pairing, accessibility and mobile dark theme.
The optional real-provider check uses a dedicated authenticated profile and a temporary synthetic notebook:

```bash
LEARNING_CODEX_LIVE=1 npx playwright test tests/e2e/learning-agent-live.spec.ts --project=chromium
```

On 2026-10-06, Codex CLI 0.154.0 passed real reply/resume and the browser observation → approved change → actual result → reviewed notebook draft workflow.
The 32 authored demos passed live DOM observation/action checks; disabled controls remain unavailable during startup or a busy operation.
Synthetic peer checks cover attempt-first discovery/direct access, course/group/phase isolation, corrected allocation, withdrawal, concurrent writes, source changes and own-text public consent.
These checks establish executable behavior, not improved learning or course completion.
[The evaluation guide](learning-workspace-evaluation.md) owns the voluntary learner evaluation and reporting limits.

## Agent and demo contract

[learning-agent.ts](../shared/learning-agent.ts) owns help modes, conversation records and the supporting-agent instruction contract.
Under [ADR-031](adrs/implemented/ADR-031-adapt-learning-support-to-the-students-current-task.md), students can optionally identify getting started, a prerequisite, an unexpected result, demo operation or readiness for less help.
The agent uses the actual response, selected context and authored concept references for tentative task-specific guidance; it asks a focused question when evidence is insufficient and explains directly when requested.
Support increases or fades with the student's work, with no ability profile, turn quota, automatic concept judgment or explanation gate.
Chapter guide can prepare an editable help request with its reading/demo source; students choose whether to send it, and unfinished guide writing stays in the tab.
Student messages retain optional goal/help-mode/support-need metadata and the supplied note identities in existing conversation JSON; older requests default to unspecified and older turns remain valid.
The chosen support need also appears in the sent message so earlier companions receive the student's request even without structured support metadata.
Supplied note identities allow a reviewed takeaway to link the notes used on its actual turn, rather than the current selection; old turns omit them and are not assigned inferred relationships.
These provider changes require a companion built from the updated source; the published 0.1.0 package retains its earlier instructions until a new release.
[learning-codex.ts](../scripts/lib/learning-codex.ts) adapts the [Codex app-server protocol](https://learn.chatgpt.com/docs/app-server) over local stdio.
[learning-conversations.ts](../scripts/lib/learning-conversations.ts) owns `conversations.sqlite`, selected context and the browser request broker.
Notebook records remain independent of these provider threads.
Portable notebook export includes accepted assistance history but excludes raw conversations and credentials.
Stopped/restarted conversations retain their messages and provider thread identity, with an explicit interrupted-state message before resuming.

The dedicated Codex home accepts file authentication and no custom configuration, hooks, plugins, rules or custom skills.
An otherwise empty workspace contains a project root marker that stops ancestor instruction discovery.
Shell, unified execution, apps, browser/computer use, multi-agent and image tools are disabled; the thread uses read-only sandboxing and denied machine/permission approvals.
Codex's local tool host remains available for the three declared callbacks.
Provider diagnostics are not relayed into website responses or logs.
One reply runs at a time; students may interrupt it.
The adapter is the first working provider, not a claim that all external agent clients already work.

Authenticated companion routes:

| Route                               | Purpose                                                                                              |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `GET/POST /agent/conversations`     | List/start a private conversation.                                                                   |
| `GET/POST /agent/conversations/:id` | Read/send a turn with goal, help mode, optional supportNeed, selected note IDs and browser identity. |
| `GET /agent/requests?browser=:id`   | Poll the initiating browser's bounded demo requests.                                                 |
| `POST /agent/requests/:id`          | Return that browser's actual observation or a declined/unavailable result.                           |
| `POST /agent/stop`                  | Interrupt the current reply and retain its work.                                                     |

The provider receives only the captured source, explicitly selected notebook entries and authored resource navigation.
Combined turn context is limited to 96,000 characters; an oversized selection is rejected before saving a turn or starting the provider.
It has no course-cookie or peer-retrieval tool.
`read_book` accepts registered public reading/resource paths at the paired origin, rejects redirects, excludes private course APIs and bounds source text to 32,000 characters.
That source text is not evidence that a demo ran.

The browser's version-1 bridge is available after lazy loading as `BookLearningWorkspace.observeLearningDemo(id)` and `changeLearningDemo(id, {controlId, value})`.
Each observed demo declares its source, assumptions, activity prompts, actual enabled controls, bounds/options and live textual output.
Control IDs identify DOM elements for that browser lifetime; callers observe again when availability changes.
Changes accept a declared option, boolean, bounded/stepped number, text up to 1,024 characters, or a button click with a null value.
They accept no arbitrary selector, script, remote URL or machine command.
Observations cover DOM values/text, not inferred canvas pixels or production measurements.

Agent requests bind to the initiating paired session and browser, expire after two minutes and report unavailable/declined actions honestly.
A changed demo requires selected saved initial thinking for the conversation source and an explicit browser approval.
Peer-derived notebook material enters the agent only through deliberate selection after the peer reveal step.

## Peer inquiry contract

[course-inquiry.ts](../shared/course-inquiry.ts) owns audiences, contribution types, historical access and editorial export; [the shared course handler](../worker/course-inquiry.ts) is used by both local development and the Worker.
The existing course record/history store owns `inquiry-attempt`, `inquiry-thread` and `inquiry-offer` records.
Writes compare record revisions and atomically guard the current course allocation revision.
No separate production database or notebook upload is introduced.
Migration `0004_learning_inquiry.sql` indexes course/kind/source identity in the existing record table; local SQLite applies it at startup, while D1 requires the ordinary course migration command.
Discovery filters by source/activity in storage and pages at most 40 records with an opaque course-scoped cursor.
Ordinary course loads exclude inquiry records, leaving disclosure to the dedicated authorized API.

Entry is **Teaching assistant → Peer discussion** at a passage, activity or demo.
[learning-inquiry.ts](../shared/learning-inquiry.ts) owns optional reasoning outlines and operator/challenger/validator prompts; the browser uses the existing contribution body, identity, provenance and revision contract.
After reveal, questions/replies can use question, competing explanations, evidence/check, current decision and remaining uncertainty, or free writing without filling every part.
Responsibility cues invite someone other than the operator to explain acceptance and rotate roles for the next check; the common project specification still owns required session practice.
Async contributions do not wait for every member and do not imply absent members' agreement.

Per-contribution selection starts unchecked.
**Prepare summary from selected contributions** copies only selected visible posts into an editable reply, retaining contributor identities/IDs, disagreement, links, dates and tool provenance without inferring consensus.
Oversized selections are rejected rather than silently shortening consequential material.
The student reviews and uses the existing share action; there is no automatic summary generation, posting or participation score.
**Reflect privately on this inquiry** starts with a thread reference and optional personal starters; selected contributions are copied only when deliberately checked.
The draft relates to the student's existing records for that source and must be reviewed and explicitly saved.
The link does not grant later thread access and does not retrieve peers for an agent.
**Try a related case privately** offers the same authored independent application in a thread-specific tab draft, without copying peer replies or requiring a group decision.
It saves a separate linked notebook entry; students can request help, keep different conclusions, or continue the Chapter guide and existing independent human review route when working solo.
No shared outcome updates a member's concept judgment, private reflection, course credit or submission.

The scope combines the course run, source URL path/anchor and one activity key: reading, prediction, evidence or session.
Initial-work declarations store only a timestamp and a fingerprint of the student's local note revision.
This is a student declaration for pedagogical pacing, not proof of correctness or an anti-cheating mechanism.
The initial text remains local.
Both thread discovery and direct reads require that declaration before returning peer content; course staff may review without it.
No feedback identity is inferred or merged.

Group access requires both membership in the share-time snapshot and membership in the current published allocation for that phase.
A correction cannot grant earlier threads to new members.
Former members and withdrawn students retain only their own contributions read-only and may remove their text.
Other historical peers are not returned to them.
Cohort sharing deliberately includes active participants in the identified run, including later arrivals after their initial step.
Widening from group to cohort creates a separately reviewed contribution/thread; it cannot change an existing thread's audience or copy classmates' replies automatically.

Authors may revise/remove their contributions; course staff may moderate and close threads.
Removed text is hidden from ordinary views while staff revision history retains the record and reason.
There are no automatic notifications or new scheduling/reporting requirements.
Source snapshots retain quotes and revisions when book text changes or an anchor disappears.
Saved initial attempts and personal concept judgments are not overwritten by group conclusions.

Public offers contain only the author's separately reviewed, explicitly consented text, defaulting to anonymous attribution.
Course staff review these offers and download selected Markdown for a book editor; publication follows the existing reviewed Reader-note/book-improvement workflow.
Offering/reviewing is not publication and does not expose the source thread or notebook.
Authors may withdraw an unpublished offer; already published text needs an editorial correction through the existing workflow.
Private paragraph feedback and private portfolios/peer assessments keep their existing contracts.
