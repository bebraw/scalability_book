# Learning workspace

This document owns the executable learning-workspace contracts and local companion setup.
[ADRs 027–029](adrs/README.md#implemented) record the agreed whole-book direction.
Implemented status identifies verified software behavior; production rollout and learner outcomes have their own evidence.

[Implemented ADRs 031–033](adrs/README.md#implemented) cover responsive support, independent application with reflection and scaffolded peer inquiry.
[ADR-034](adrs/implemented/ADR-034-separate-the-private-notebook-from-the-teaching-assistant.md) separates Notebook and Teaching assistant experiences with deliberate handoffs.
[ADR-035](adrs/implemented/ADR-035-ground-the-teaching-assistant-in-a-shared-teaching-policy.md) defines the shared versioned teaching policy, recognizable manner and separate evaluation of usability, support and independent learning.
[ADR-036](adrs/implemented/ADR-036-open-notebook-and-assistant-as-independent-panels.md) refines their presentation into independent panels with one shared connection.

## Current implementation

**Account → Account & connections** shows website sign-in, course access, the exercise-answer owner and private companion/provider connection together.
GitHub and course email sign-in retain separate sessions; enrolled students can request email links directly from this view without leaving their reading or unfinished writing.
If email opens in another tab, confirm it there and return to the original tab to keep its drafts; **Check sign-in again** refreshes the account explicitly.
The email link returns to the initiating passage/activity after confirmation.
The website account is optional for notebook writing and assistant discussion.
Only an existing companion session is checked when opening the account view; no notebook contents or model replies are requested.
**Open connection settings** opens the existing notebook Connect section on pages that provide learning tools; other pages link to companion setup.
Provider status reports configuration and connection, while an actual assistant reply establishes provider availability.
Discuss shows this status beside the message composer.
A notebook-only connection disables Send and offers **Set up assistant replies**; Connect provides a copyable Codex restart command and links for dedicated-profile setup and local models.
The Codex restart command retains the connected companion's port and reported notebook directory, quoting filesystem paths for the shell.
Checking the connection after enabling a provider retains the unsent question.

Checked chapter exercises offer **Discuss my answer** and a preview of the exact prompt, exercise ID/version, attempt and checker feedback.
The handoff prepares an editable assistant message with no notebook notes selected; it neither sends the message nor saves the attempt as a note.
The student reviews and sends it, then can use the existing reviewed takeaway actions.
An unfinished assistant message is protected by the existing replacement confirmation.
The source and prepared message survive companion connection recovery and book navigation in tab state.

The local companion provides an authenticated private notebook API: note capture and revision history, concept self-assessment, portable export/import and selected-note submission drafts.
The whole-book Notebook and Teaching assistant entry points load the shared coordinator and independently rendered panels on demand on reading, concept, exploration and demo pages, independently of feedback sign-in.
Both header entries remain available to every reader; passage context comes from an explicit selection in the reading, without paragraph Note buttons.
The header groups compact notebook and question-bubble icons after primary navigation, with visible **Notebook** and **Assistant** captions and full accessible names.
Each visible panel highlights its launcher and exposes its expanded state; choosing it again closes only that panel without discarding drafts.
Escape or the panel's close button returns keyboard focus to that experience's launcher when focus was inside the panel.
Opening either experience captures the selection before loading/focusing the interface.
Notebook offers **Use selected text** and Teaching assistant offers **Discuss selected text** when already open.
Notebook captures a private writing context; assistant selection prepares a source without sending a message.
A chapter note keeps the reading link and authored concept membership without copying the chapter text.
The source is visible in Write; **Preview the selected source** reveals a bounded quote while its full captured text remains in the saved record.
Writing and Save actions precede kind/title details.
Discuss puts the message before optional conversation/goal/support controls in the **Help: … · Settings** disclosure, whose summary identifies the current help mode.
Each open panel follows book navigation and retains its active section.
Closing both keeps later pages lazy, with no companion request until reopening.
Opening either experience preserves the book's existing widths and positions, including its navigation, reading column and wider demos.
The fixed notebook uses the upper-right margin and the smaller assistant sits at the lower right.
Both can remain visible without overlapping on screens wider than 68rem and taller than 42rem; the notebook shortens to leave room for the assistant.
On more compact screens only the foreground panel is visible, while the other retains its open state and draft.
Its header launcher brings it forward; closing the foreground panel reveals the other if it remains open.
The panels overlay the reading area when the right margin is insufficient; close them to reach covered passages or demo controls.
Each has independently scrollable content beneath its navigation.
Independent open states, foreground experience, remembered sections, unfinished notebook writing, separate notebook/assistant selected note IDs, submission preparation and assistant message/goal/help choices live in this website's tab session independently of the connection token.
Assistant state also retains the captured source, active conversation ID and initiating browser identity for resuming bounded requests after navigation.
Legacy version 1 tab records map Guide/Agent/Peers to Teaching assistant and restore their single open experience.
Additive version 1 fields retain both panels and independent selections without migrating notebook or conversation databases.
Unsaved notes retain their original source across navigation; starting a replacement requires confirmation when writing would be lost.
This includes **Notes → Edit** and **Notes → Revisit**; cancelling preserves the unfinished draft, while accepting clears the previous save confirmation.
Guide and concept choices follow the current reading; peer inquiry uses the current page or its captured passage.
Discuss retains its own chosen source across navigation and saved-conversation selection, independently of an unfinished notebook note; **Discuss the current reading** prepares a deliberate replacement.
Only Save note creates or revises a durable companion record; tab continuity is not a notebook backup and does not survive closing the tab.
Notes defaults to the current chapter/page, with Whole notebook available for cross-book review.
Notebook presents **Write**, **Notes** and **Concepts**; **Prepare** and the shared **Connect** settings live under **More learning tools**.
Teaching assistant presents **Discuss**, **Chapter guide** and **Peer discussion**, with the same connection settings.
Opening or bringing either panel forward does not save, send a message or require a second connection.
There is no experience chooser within the panels.
Checking notes in Notebook does not change the assistant's selected context; an explicit discussion handoff supplies the chosen set.
Shared record refreshes preserve the assistant's unsent message and ongoing discussion.
**Discuss this note** supplies exactly that note; **Discuss selected notes** supplies the chosen set, with bounded source/note previews before sending.
An assistant reply offers **Write a takeaway** (a blank personal draft) and **Use as a notebook draft** (a reviewed suggestion), retaining its source and supplied-note relationships.
Either handoff asks before replacing unfinished writing; only the student's Save note action creates the notebook record.
Assistant replies display a supported Markdown subset with readable links, lists, tables, code and equations.
[learning-reply.ts](../site/scripts/learning-reply.ts) builds permitted DOM elements from parsed tokens and renders TeX as bounded, untrusted KaTeX MathML; raw HTML remains text, images do not load and links allow only HTTP(S).
Unsupported equations retain their original notation.
Conversation storage and reviewed notebook drafts retain the original reply text; [ADR-041](adrs/implemented/ADR-041-render-assistant-replies-through-a-restricted-dom.md) records this presentation boundary.
Optional Codex and local-model adapters provide persisted conversations and student-reviewed notebook drafts.
Codex and explicitly selected native local tools use the same bounded browser broker; local discussion has no live tools.
Course-backed group/cohort inquiry uses the existing course identity and record store, with an initial-work reveal step and opt-in public editorial offers.
Peer sign-in opens the shared account view in place and carries the source anchor/activity through email confirmation.
A single accessible run is selected automatically; otherwise the reader chooses the run explicitly.
The selected inquiry activity stays in the original tab when account refresh remounts the peer view.
Before posting, the interface identifies the course account and selected audience.
Unsent contributions/replies, their kind, selected audience and provenance survive remounting/reload in bounded tab storage scoped to course, source, activity, member and thread.
At most 20 such drafts are retained; they are cleared after successful sharing and are not notebook backups or submitted course records.
An account change clears the displayed inquiry and reloads authorization before showing contributions again.
The standalone `@scalableweb/companion` package adds guided setup, a stable per-user default, local diagnosis, copy migration and an optional first investigation.
Registry publication and the declared platform/provider evidence are recorded in ADR-030; a built package does not by itself establish registry availability.
Production availability of peer inquiry depends on the existing course storage and authentication rollout.

The shared contract is [learning-workspace.ts](../shared/learning-workspace.ts).
[learning-activities.ts](../shared/learning-activities.ts) owns optional versioned independent cases; it reuses canonical exercises without owning their checks.
[learning-notebook.ts](../scripts/lib/learning-notebook.ts) owns local SQLite persistence; [learning-companion-http.ts](../scripts/lib/learning-companion-http.ts) owns session bootstrap and API access.
These modules do not depend on course storage or a provider SDK.
The website/Worker never owns this private notebook or provider credentials.

## Start the companion

The packaged entry needs Node 24 or 26 and no checkout or website dependencies.
The repository prepares release 0.3.0 with code-free connection and browser protocol 2; it has not been published to npm.
The published 0.2.0 artifact uses the previous connection contract and is not supported by this updated browser client.
[ADR-030](adrs/implemented/ADR-030-distribute-the-learning-companion-with-guided-student-setup.md#release-020) retains its release evidence; [ADR-037](adrs/implemented/ADR-037-connect-to-the-local-companion-without-pairing-codes.md) records the new trust boundary.
For now use the checkout command; it keeps the repository's installed dependencies and existing default:

```bash
npm run companion -- --origin http://127.0.0.1:3000
```

The process binds to `127.0.0.1:8788` and prints its address and allowed website origins.
In either panel's **Connect** section, enter that address if different from the default and choose **Connect companion**.
No pairing code is generated or entered.
The only default allowed website is `https://scalableweb.dev`; specify an exact origin for every development address.
Repeated `--origin` options replace the default allowlist, rather than adding to it:

```bash
npm run companion -- --origin https://scalableweb.dev --origin http://127.0.0.1:3100 --directory .local/learning-companion-test
```

The private notebook lives at `.local/learning-companion/notebook.sqlite`, outside published output and ignored by Git.
That path belongs to the repository entry only.
The packaged entry chooses the per-user macOS/Linux path in the student guide; both accept an explicit `--directory`.
When switching between packaged and repository entries, pass the existing notebook directory explicitly to retain the same work/profile.
Use `--directory` to choose another notebook and `--port` for another loopback port.
Keep the original database when updating the companion.
After disconnect, expiry, restart or a lost browser session, choose **Connect companion** again; reconnecting does not require restarting a running companion.

Starting the companion authorizes the configured website, including its scripts, to request a session through `POST /connect` with a JSON object.
This explicit origin trust replaces possession of a printed pairing code.
The handler validates the exact website Origin and literal loopback host before routes or CORS preflight; missing/null origins and cross-site form content types are rejected.
This is a browser boundary for a single-user local process, not isolation from native local processes that can forge HTTP headers.
It does not grant machine execution or change the separate student approval for demo controls.
The resulting random bearer session is bound to that origin, expires after twelve hours and can be revoked through `/disconnect`.
At most 64 sessions are retained; expired sessions are pruned on connection and disconnect releases its session.
Private notebook/provider routes still require a valid token.
Browser requests use the Authorization header, not URL credentials or cookies, and tokens remain in tab-scoped session storage.
Session responses are private and uncached; CORS preflight is origin-gated, including local-network permission requests.
The companion does not log notes, provider credentials or session tokens.
There is no `/pair` route, code generator or manual-pairing option.

### Distribution, diagnostics and storage recovery

[learning-cli.ts](../scripts/lib/learning-cli.ts) owns `setup`, `login`, `start`, `doctor` and `migrate`.
Setup offers notebook-only, Codex or Local model use, creates required directories and stores the chosen provider/profile/model configuration in `companion-settings.json`.
Port/origin overrides remain explicit command options; model and local endpoint/tool/context preferences are saved by setup and can be overridden explicitly.
CLI storage/schema checks occur before opening the writing stores.
An unavailable port, denied storage permission, unsupported provider version or missing dedicated-profile authentication provides a concrete next step while retaining records.
The dedicated Codex CLI authentication result is a prerequisite check; a real reply establishes account/provider availability.

Authenticated `/status` returns package/source revision, protocol, provider mode, selected storage path and notebook/conversation/archive schema versions.
Policy-aware adapters also report optional `teaching` metadata: policy ID/version/name and provider name/version/model where known.
Local status adds selected tool mode, effective context budget and private transcript schema.
Connect shows the installed policy; older companions retain their existing instructions and do not acquire a new policy from website JavaScript.
The browser requires protocol 2 before retaining a connection token or accepting status.
Expired sessions lead back to Connect; network feedback names the possible process/origin/local-permission causes without pretending to distinguish them.
`doctor --json` contains only release/path/check metadata and configured website origins; no telemetry or automatic support upload is introduced.

[learning-storage.ts](../scripts/lib/learning-storage.ts) owns per-user path selection, exclusive process leases and explicit migration.
Migration requires `--from` and `--confirm-stopped`, validates regular files/supported schemas and copies privately through an atomic staged-directory rename.
It retains the source and rejects occupied destinations or active writers.
Notebook/conversation identities, histories and `local-provider.sqlite` are copied intact; included provider profiles are copied, while external profiles need an explicit `--codex-home`.
Setup preferences are not copied because their absolute profile path may identify the old directory; select the mode again after migration.
Sign-in/thread continuity must be checked before removing the source; retained notes can begin a new conversation when provider continuity is unavailable.

[learning-database.ts](../scripts/lib/learning-database.ts) owns database compatibility.
Prepared package 0.3.0, browser protocol 2, portable archive 1 and notebook/conversation/local-provider database schemas 1 are separate contracts in [learning-connection.ts](../shared/learning-connection.ts).
Release 0.3.0 retains the previous storage location, setup preferences and compatible records without a new schema migration.
The original unversioned schema 0 is accepted only with recognized tables, snapshotted as `<database>.before-schema-1-<id>.backup` and marked schema 1 in a transaction.
New databases start at schema 1; unsupported schemas are rejected read-only before changing bytes.
Interrupted migration retains a recoverable snapshot and can be retried once writers stop.
Restoration and rollback require stopping the companion/provider, retaining current files separately and restoring a compatible pre-update directory/database; portable archives remain independent of raw conversations and credentials.
The student guide owns the concrete recovery steps and limits.

## Notebook and portability

Notes retain their original source URL, anchor, excerpt and available revision.
On the current page, passage notes compare the captured excerpt with the live source text.
Demo notes check that their anchored demo exists, because authored captions and saved observations need not match its changing controls/output.
The saved demo inputs/result remain historical evidence; presence does not establish that the demo is unchanged.
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
The Connect section handles connection and portable archives; connection tokens remain in the browser tab's session storage, while notebook records remain local.
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

The checks cover restart persistence, accepted revisions, stale-write rejection, portable restore/import conflicts, selected-note preparation and the connection/origin/session boundary with synthetic notes.
Browser checks cover whole-book entry points, lazy loading, capture, revision history, concept judgments, revisit, reconnection, accessibility and mobile dark theme.
Concurrent-panel checks cover separate selections and unsent work, independent closing, non-overlapping desktop bounds, compact-screen foreground transitions, shared connection recovery and retained sections/drafts across chapter navigation and reload.
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

[learning-agent.ts](../shared/learning-agent.ts) owns help modes, conversation records and the provider-independent `teachingPolicy`.
Policy `scalableweb-study-assistant` version `1` presents an automated study assistant, distinct from the instructor and assessor, with a patient, curious, precise and constructive manner.
It asks for useful missing evidence, respectfully challenges unsupported reasoning, corrects earlier errors and recognizes specific progress without certifying understanding.
Source accuracy, direct-help choices, selected context and student approval govern the manner; the policy cannot grant tool access.
Use reviewed concept definitions, assumptions, examples and misconceptions already supplied by the authored resource owners.
Extend those resources from actual learner difficulties rather than generating an exercise for every paragraph.
Under [ADR-031](adrs/implemented/ADR-031-adapt-learning-support-to-the-students-current-task.md), students can optionally identify getting started, a prerequisite, an unexpected result, demo operation or readiness for less help.
The agent uses the actual response, selected context and authored concept references for tentative task-specific guidance; it asks a focused question when evidence is insufficient and explains directly when requested.
Support increases or fades with the student's work, with no ability profile, turn quota, automatic concept judgment or explanation gate.
Chapter guide can prepare an editable help request with its reading/demo source; students choose whether to send it, and unfinished guide writing stays in the tab.
Student messages retain optional goal/help-mode/support-need metadata and the supplied note identities in existing conversation JSON; older requests default to unspecified and older turns remain valid.
The chosen support need also appears in the sent message so earlier companions receive the student's request even without structured support metadata.
Supplied note identities allow a reviewed takeaway to link the notes used on its actual turn, rather than the current selection; old turns omit them and are not assigned inferred relationships.
The prepared 0.3.0 companion retains the provider changes introduced in 0.2.0; a website update alone does not update an installed companion.
The Codex adapter applies the current shared instructions on both thread start and resume and reports the actual CLI version (or null if it cannot be read).
Each new student and assistant message stores optional `teaching: { policy: { id, version, name }, provider: { name, version } }` in existing conversation JSON.
The metadata identifies applied instructions, not proof that a reply complies; later policies never rewrite earlier turns.
**About this reply** shows recorded versions, with an explicit unknown-history message for legacy replies; reviewed notebook handoffs retain that provenance.
Policy changes update the policy version alongside the instructions and their evaluation evidence.
Teaching metadata is additive in the version 1 conversation database and portable notebook/archive schemas.
The prepared companion uses HTTP protocol 2 for code-free connection; existing record histories remain valid.
Providers that do not advertise a policy are treated as unversioned, rather than being assigned today's policy by the conversation owner.
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
[ADR-038](adrs/implemented/ADR-038-support-local-models-through-the-learning-companion.md) adds the direct local-model provider behind [learning-provider.ts](../scripts/lib/learning-provider.ts)'s shared port and tool schemas.
[learning-local-model.ts](../scripts/lib/learning-local-model.ts) accepts literal loopback HTTP `/v1` endpoints with no credentials, query, fragment or redirects, and diagnoses the explicit model without downloads, loading commands or Codex sign-in.
LM Studio loaded-context metadata is separate from the advertised maximum; unknown context requires an explicit `--local-context`.
[learning-provider-context.ts](../scripts/lib/learning-provider-context.ts) keeps selected source/notes intact and filters local authored navigation by reading/concept membership.
[learning-local.ts](../scripts/lib/learning-local.ts) uses bounded non-streaming chat completions, a reply-only JSON schema in discussion mode, reasoning disabled, a 1,024-token output allowance and an estimated UTF-8-byte context budget with a 512-token guard.
It rejects oversized current selections or tool results, omits whole older completed turns visibly and preserves full private snapshots in [learning-local-history.ts](../scripts/lib/learning-local-history.ts)'s schema-1 `local-provider.sqlite`.
Failed/interrupted turns remain stored but are omitted on replay with a notice; private transcripts never enter portable archives or browser/course responses.
Local sessions bind to the endpoint/model/tool mode, refuse Codex identities and detect a changed returned model.
Provider errors, unknown/invalid calls, truncation, response-size limits and cancellation retain work; native mode allows at most eight rounds with three validated calls per response.
Native calls use the existing broker, saved initial thinking and browser approval; neither prose nor the discussion JSON envelope triggers actions.
The default discussion-only limitation appears before sending and beside local replies; discussion can use student-supplied saved observations.
On 2026-10-07, actual Gemma `google/gemma-4-12b-qat` responses passed packed discussion/restart/resume checks at loaded context 8,192 and returned all eight synthetic teaching scenarios; native calls remain unverified on this configuration.
Teaching review identified qualification and source-link gaps, recorded in the evaluation guide; these checks do not certify instructional reliability.
Other compatibility runners are potential targets, not verified support claims.

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
`read_book` accepts registered public reading/resource paths at the connected origin, rejects redirects, excludes private course APIs and bounds source text to 32,000 characters.
That source text is not evidence that a demo ran.

The browser's version-1 bridge is available after lazy loading as `BookLearningWorkspace.observeLearningDemo(id)` and `changeLearningDemo(id, {controlId, value})`.
Each observed demo declares its source, assumptions, activity prompts, actual enabled controls, bounds/options and live textual output.
Control IDs identify DOM elements for that browser lifetime; callers observe again when availability changes.
Changes accept a declared option, boolean, bounded/stepped number, text up to 1,024 characters, or a button click with a null value.
They accept no arbitrary selector, script, remote URL or machine command.
Observations cover DOM values/text, not inferred canvas pixels or production measurements.

Agent requests bind to the initiating connection session and browser, expire after two minutes and report unavailable/declined actions honestly.
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
