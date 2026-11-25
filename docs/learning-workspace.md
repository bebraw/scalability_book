# Learning workspace

This document owns the executable learning-workspace contracts and local companion setup.
[ADRs 027–029](adrs/README.md#implemented) record the agreed whole-book direction.
Implemented status identifies verified software behavior; production rollout and learner outcomes have their own evidence.

[Implemented ADRs 031–033](adrs/README.md#implemented) cover responsive support, independent application with reflection and scaffolded peer inquiry.
[ADR-034](adrs/implemented/ADR-034-separate-the-private-notebook-from-the-teaching-assistant.md) separates Notebook and Teaching assistant experiences with deliberate handoffs.
[ADR-035](adrs/implemented/ADR-035-ground-the-teaching-assistant-in-a-shared-teaching-policy.md) defines the shared versioned teaching policy, recognizable manner and separate evaluation of usability, support and independent learning.
[ADR-036](adrs/implemented/ADR-036-open-notebook-and-assistant-as-independent-panels.md) refines their presentation into independent panels with one shared connection.

## Diary, assistant and existing Notebook records

[ADR-066](adrs/implemented/ADR-066-keep-course-diaries-in-obsidian.md) moves the recommended diary into a local Obsidian vault.
The [student guide](course-diary.md) covers the numbered starter, linked highlights, optional desktop commands, discussion beside the note, portfolio preparation and Notebook recovery.
The book and plugin exchange public reading links and Markdown.
Students control which writing enters a question or course portfolio.
The book continues to own exercises, interactive demos, peer inquiry and the teaching assistant.

### Account and teaching assistant

**Account → Account & connections** shows website sign-in, course access, the exercise-answer owner and private companion/provider connection together.
GitHub and course email sign-in retain separate sessions; enrolled students can request email links directly from this view without leaving their reading or unfinished writing.
If email opens in another tab, confirm it there and return to the original tab to keep its drafts; **Check sign-in again** refreshes the account explicitly.
The email link returns to the initiating passage/activity after confirmation.
A student can write in the local vault and discuss a reading with their companion without a website account.
Only an existing companion session is checked when opening the account view; no notebook contents or model replies are requested.
**Open connection settings** opens the teaching assistant’s Connect section on pages that provide learning tools; other pages link to companion setup.
Provider status reports configuration and connection, while an actual assistant reply establishes provider availability.
Discuss shows this status beside the message composer.
A notebook-only connection disables Send and offers **Set up assistant replies**; Connect provides guided setup/start commands and links for Codex, direct API keys and local models.
Both commands retain the connected companion's port and reported notebook directory, quoting filesystem paths for the shell.
Checking the connection after enabling a provider retains the unsent question.

Checked chapter exercises offer **Discuss my answer** and a preview of the exact prompt, exercise ID/version, attempt and checker feedback.
The handoff prepares an editable assistant message with no notebook notes selected; it neither sends the message nor saves the attempt as a note.
The student reviews and sends it, then can use the existing reviewed takeaway actions.
An unfinished assistant message is protected by the existing replacement confirmation.
The source and prepared message survive companion connection recovery and book navigation in tab state.

The local companion stores private conversations and earlier Notebook records.
The reading header's **Diary** link opens the getting-started guide.
Selecting a passage on a reading offers **Copy highlight** and **Download Markdown** with a public source link.
The book's tutorial and learning loop can also download a takeaway.
The **Teaching assistant** launcher opens discussion in the book.
A public reading URL with `?assistant=1` opens the same panel without sending a question or reading the vault.
The student chooses a source and provider context before sending.
The plugin can open this page in Obsidian's desktop Web viewer or in the default browser.
Chrome on the companion's computer is the supported route when the embedded connection is unavailable.
The assistant retains the chosen reading and unsent draft across navigation in the same tab.
Reviewing a selected exchange keeps attribution and lets the student edit the excerpt for the diary.
The [recovery page](course-diary.md#bring-over-an-existing-notebook) downloads earlier work from the local companion as JSON or Markdown.

Assistant replies display a supported Markdown subset with readable links, lists, tables, code and equations.
Long code lines scroll within their code block; each block is a named keyboard focus target with a visible focus indicator, so arrow keys can reveal the complete text and Tab can leave the block.
Expanded browser observations wrap within the assistant panel and retain their full recorded text.
Replies with recorded browser observations show **View browser evidence**, including the observation count, directly above the explanation.
The native disclosure labels its contents as recorded browser output, separate from the assistant's interpretation; it can be opened and closed with pointer or keyboard.
Only observations preceding that reply in the same response are grouped with it; a later reply without new observations does not inherit an earlier reply's evidence.
Completed observations from a pending or interrupted response remain available on their own in the conversation.
Polling preserves an evidence disclosure's open state and keyboard focus as observations arrive and the reply appears.
These records cover successful browser observations and approved demo changes, not a complete trace of source retrievals, pending requests or declined/failed tool calls.
[learning-evidence.ts](../site/scripts/learning-evidence.ts) owns this grouping and disclosure presentation; conversation storage and tool execution remain unchanged.
[learning-reply.ts](../site/scripts/learning-reply.ts) builds permitted DOM elements from parsed tokens and renders TeX as bounded, untrusted KaTeX MathML; raw HTML remains text, images do not load and links allow only HTTP(S).
Unsupported equations retain their original notation.
Conversation storage retains the original reply text, and diary previews start from that text before the learner’s edits and selection. [ADR-041](adrs/implemented/ADR-041-render-assistant-replies-through-a-restricted-dom.md) records the reply presentation boundary.
Optional Codex, API and local-model adapters provide persisted conversations.
Codex and explicitly selected native API/local tools use the same bounded browser broker; discussion-only providers have no live tools.
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

## Explore an idea in the reading

### Learn the tools by trying them

The first cockpit opening offers **Try the tutorial**, with **Not now** leaving the learning loop available immediately.
**Cockpit → Tutorial** reopens it at any time; the [setup guide's tutorial link](/notebook/setup/#try-the-learning-tutorial) also opens it directly.
Five optional steps rehearse a prediction, a bounded queue illustration, an explicitly authored example reply, personal reflection and a preview of a Markdown takeaway.
The tutorial works without a companion, makes no model calls and does not change real demo controls or actual learning-loop writing.
It explains source/evidence boundaries, selected assistant context, explicit saving, independent next checks, recent loops, peer sharing and the separation of website sign-in from companion connection.

The browser owns tutorial progress and bounded writing in its tab session, independently of loop drafts, Notebook records and course state.
A browser-local preference remembers dismissing or finishing the invitation; it contains no tutorial writing and is independent of sign-in.
Exiting retains the current step for replay across book navigation; finishing starts replay from the beginning while retaining the rehearsal writing in the tab.
Unavailable browser storage falls back to the mounted rehearsal's memory.
The final download includes the learner’s writing and tutorial source.
It works before connecting a companion.

### Your own learning loop

**Learning cockpit** is the common learning loop across readings, appendices, part introductions, concepts, explorations, case studies, project briefs, the demo gallery, Notebook setup and the student course workspace.
The header's **Cockpit** launcher opens a source-scoped workspace in the reading flow; an explicit passage selection becomes its bounded source context.
Every authored demo offers **Explore this idea**, opening the same cockpit beside that activity.
**Working on** switches between the reading and demos present on the page, retaining independent writing and conversations.
Administrative pages have no learning launchers.
On the student course page, the cockpit captures the public page title and the student's own writing, without scraping course records, submissions or grades.

The loop is **Predict → Experiment → Reflect**: state an explanation, prediction or uncertainty; perform one check; write a personal takeaway and **My next independent check**.
Readings use the authored reading question; concepts and explorations supply their authored definition or scenario.
Demo activities reuse their existing prediction, operation, observation and reflection prompts and assumptions.
A check can mean revisiting a passage, comparing a hypothetical case, applying an idea to a project or operating a demo.
**My check and evidence** is explicitly a student report, never an assertion that a browser or project test ran.
**Explain directly** works without a prediction, and the phases remain available independently.
The latest generated explanation stays beside the work, with source links, provider/policy metadata and conversation history.
The authored passage and simulator remain the reference.

The cockpit uses the teaching assistant’s local companion connection.
Authenticated status advertises the supported ID/version of the general `learning-loop` and every demo activity in `readingActivities`.
An older running companion displays a restart instruction and retains writing; restart from the updated checkout, reconnect and check again.
Students can write reflections and download Markdown before connecting. **Connection settings** offers provider setup for students who want replies.
An actual response, rather than configuration status, establishes provider availability.

Activation, connection, focus changes and demo controls never start a model reply or load notebook entries.
An explicit cockpit send shares the previewed source, current writing and current demo snapshot when available.
**Shared context** shows the source excerpt before sending.
Checked exercises offer **Explore and reflect on this attempt**, using the existing editable attempt/checker handoff without worked answers.
Independent practice offers **Explore this case in the learning cockpit** with a reviewed copy of the current thinking (up to 4,000 characters).
The teaching assistant offers **Open learning cockpit** with the current source and question.
Peer inquiry offers **Reflect in the learning cockpit**, copying only explicitly selected contributions into a private draft and retaining the discussion reference; this does not post or change the inquiry's audience.
These entry points prepare context, never save or send automatically.
Opening the cockpit closes the assistant panel and retains its unfinished writing.

Demo sends read actual visible controls and text from the existing observation bridge, not an independently simulated result.
All demos use a dated `browser-demo-snapshot` with at most 60 named values (text values shortened to 1,024 characters) and 8,000 characters of displayed text.
The preview is bounded; canvas pixels, hidden output and real project measurements are never inferred.
Current values and the last sent snapshot are labelled separately.
If Practice hides a demo, reopen Explore before sending a result; direct explanation remains available without a new observation.
During an explicitly started reply, the existing origin/session/browser-bound broker services observations of the selected demo only.
The cockpit declines other demos and control changes; the ordinary assistant retains its existing saved-initial-thinking and approval boundary for changes.
The companion validates the activity/source/version, phase, text/observation bounds before storing a turn or calling the provider.
Browser reports are not independently attested measurements and never grant action permissions.
Submitted activity turns remain additive JSON in the companion's existing conversation store; notebook and protocol schemas are unchanged.
The public graph/MCP exposes the same authored loop and all demo contracts without learner state, execution or private access.

The browser owns source-scoped unsent writing, phase, last sent snapshot and conversation/browser identity.
Up to 30 loops are kept in tab storage; the ten most recent appear in **Recent learning loops in this tab** and can be resumed across book navigation.
Each tab record is bounded to 256,000 serialized characters; oversized demo snapshots are omitted before the student's writing and conversation identity.
The next explicit send takes a fresh browser observation.
Selected source excerpts distinguish different passages/attempt contexts rather than overwriting one page-wide draft.
Reload resumes the active loop on its source page; other readers retain lazy loading with no companion request.
Demos retain dated snapshots without replaying controls or actions or claiming that their prior output has been restored.
Tab continuity is not durable storage or a notebook backup.
**Pause this exploration** stops browser polling and retains the draft; **Stop reply** interrupts a running provider response.
Pausing or switching focus alone does not cancel the provider's turn.
Connection failures retain writing; **Start a new conversation** retains writing and leaves the prior conversation in companion history.

In Reflect, students can download their takeaway, evidence and next check as Markdown.
The tab retains the unfinished learning loop for a return visit. **Start my next check** opens a separate draft based on the student's own writing.
[ADR-044](adrs/implemented/ADR-044-generalize-the-learning-loop-through-a-contextual-cockpit.md) generalizes the first queue slice recorded in [ADR-043](adrs/implemented/ADR-043-activate-reading-through-shared-investigation-sessions.md).

## Start the companion

The packaged entry needs Node 24 or 26 and no checkout or website dependencies.
Published release 0.4.0 adds the guided course project launcher while retaining code-free connection, browser protocol 2 and the macOS home directory required by Codex's OS keychain.
The older 0.2.0 artifact uses the previous connection contract and is not supported by this updated browser client.
[ADR-030](adrs/implemented/ADR-030-distribute-the-learning-companion-with-guided-student-setup.md#release-020) retains its release evidence; [ADR-037](adrs/implemented/ADR-037-connect-to-the-local-companion-without-pairing-codes.md) records the new trust boundary.
For local development, use the checkout command; it keeps the repository's installed dependencies and existing default:

```bash
npm run companion -- --origin http://127.0.0.1:3000
```

The process binds to `127.0.0.1:8788` and prints its address and allowed website origins.
The deployed HTTPS site's companion connection currently uses Chrome on that same computer, with local-network permission when requested.
Safari can block this HTTP loopback transport; [browser connection support](learning-companion-setup.md#browser-connection-support) owns the student recovery path and [the development guide](development.md#browser-to-companion-connection) records verification limits.
Changing browsers reconnects to the same stored notebook, but unsaved drafts remain in their original browser tab.
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

### Course project launcher

The terminal-only `project` command ships in companion 0.4.0.
Run `npx --yes @scalableweb/companion@0.4.0 project` for guided phase and project-directory selection, or use `npm run companion -- project` from the checkout.
It wraps the declared course coding configurations in a guided phase/directory choice, Codex selection, endpoint-bound credential lookup, disposable tool check and interactive launch.
It prefers the first executable `codex` on `PATH` if a credential-free probe reports a stable version at least 0.154.0; a missing, older, prerelease, unparseable or failed candidate selects the private pinned 0.154.0 fallback without changing a global installation.
`--managed-codex` explicitly selects the private baseline.
The [student guide](learning-companion-setup.md#start-a-course-coding-project) owns the commands; [ADR-063](adrs/implemented/ADR-063-launch-course-coding-agents-from-the-companion.md) records the execution boundary.
`--print` shows the selection policy and conditional commands without probing Codex, creating files, accessing credentials or making model calls; `--check` deliberately repeats the disposable model/tool check without launching project work.
Successful checks are reused only for the matching configuration, actual executable source/path/version, runtime and fixture version.
A newer installed version is only a candidate until its phase check passes; failed checks retain their evidence and prevent launch without switching harnesses and repeating model calls automatically.
Managed profiles accept the exact course settings plus strictly validated project trust records appended by Codex itself.
Changed course settings or project-local Codex configuration that the pinned CLI would load block managed launch and remain untouched for review or manual harness use.
Project `AGENTS.md` instructions still apply.

The launcher owns a separate sibling `<companion-directory>-projects` with its own lease, profiles, private installed harness, isolated `harness-probe/` directory and check records.
Installed Codex profiles append `-installed-<version>` to the phase profile name so they cannot rewrite the pinned fallback's profile.
The book companion can keep its notebook lease and remain running.
Existing endpoint-bound Aalto credentials can be read without changing the book's provider settings; newly entered project credentials use the project identity and OS keychain, with no plaintext fallback.
The model key is excluded from version probing, installation and ordinary coding-agent shell environments.
Project records are outside notebook migration and portable archives and need their own private retention.

Only the terminal launch grants project access to the external coding harness.
Connecting the website or sending a study message does not launch a project process, expose project files or grant machine commands to the browser tool broker.
The existing study Codex adapter remains read-only with shell and delegation disabled.
The project profiles instead use workspace-write permissions and on-request approvals; Compare workers share the selected project directory.
Harness interruption can stop active work but does not undo edits or attest cancellation at the upstream model service.
This launcher is one supported beginner path; the course permits other harnesses that follow the assigned model and phase rules and retain equivalent evidence.

### Distribution, diagnostics and storage recovery

[learning-cli.ts](../scripts/lib/learning-cli.ts) owns `setup`, `login`, `logout`, `start`, `doctor` and directory `migrate`.
Setup offers notebook-only, Codex, direct API or Local model use, creates required directories and stores the chosen provider/profile/model configuration in `companion-settings.json`.
Setup retains port/origin and provider preferences; explicit command options override them for that invocation.
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
Notebook/conversation identities, histories, local/API transcript databases and nonsecret `credential-identity.json` are copied intact; included provider threads are copied, while external profiles need an explicit `--codex-home`.
Recursive copying excludes externally created Codex `auth.json` files; the original source is retained.
API credentials remain in the OS store and the copied identity can locate them on the same machine; another computer requires login.
Codex's keyring identity includes its canonical profile path, so a relocated profile requires fresh login even on the same machine.
Setup preferences are not copied because their absolute profile path may identify the old directory; select the mode again after migration.
Sign-in/thread continuity must be checked before removing the source; retained notes can begin a new conversation when provider continuity is unavailable.

[learning-database.ts](../scripts/lib/learning-database.ts) owns database compatibility.
Package release, browser protocol 2, portable archive 1 and notebook/conversation/local-provider/API-provider database schemas 1 are separate contracts in [learning-connection.ts](../shared/learning-connection.ts).
Release 0.4.0 retains the previous storage location, setup preferences and compatible records without a new schema migration.
The original unversioned schema 0 is accepted only with recognized tables, snapshotted as `<database>.before-schema-1-<id>.backup` and marked schema 1 in a transaction.
New databases start at schema 1; unsupported schemas are rejected read-only before changing bytes.
Interrupted migration retains a recoverable snapshot and can be retried once writers stop.
Restoration and rollback require stopping the companion/provider, retaining current files separately and restoring a compatible pre-update directory/database; portable archives remain independent of raw conversations and credentials.
The student guide owns the concrete recovery steps and limits.

## Notebook and portability

The [recovery page](course-diary.md#bring-over-an-existing-notebook) connects to the original local companion.
Students can download all entries as a single Markdown file or keep the complete version 1 JSON archive.
Markdown includes each entry’s current text, source link and dates.
The archive also preserves earlier revisions, assistance provenance and the history of concept judgments.
Students choose excerpts in their own editor when preparing a portfolio. [Diary and portfolio walkthrough](course-diary.md#prepare-material-for-your-portfolio)

The companion continues to store private attempts used in peer inquiry and teaching activities.
Its API validates revisions and rejects stale updates.
The companion API also accepts version 1 archives.
Imports are atomic, skip identical records and reject conflicts, unknown schemas and inconsistent histories.
HTTP imports are limited to 16 MB.

## Verification

```bash
node --test tests/learning-notebook.test.ts tests/learning-companion.test.ts tests/learning-agent.test.ts tests/learning-storage.test.ts tests/learning-client.test.ts tests/learning-session.test.ts tests/course-inquiry.test.ts
npm run companion:pack
npm run companion:check
npx playwright test tests/e2e/learning-workspace.spec.ts tests/e2e/learning-onboarding.spec.ts tests/e2e/learning-demo-bridge.spec.ts tests/e2e/learning-peer-inquiry.spec.ts
npm run types:check
```

The checks cover restart persistence, accepted revisions, stale-write rejection, portable restore/import conflicts, selected-note preparation and the connection/origin/session boundary with synthetic notes.
Browser checks exercise reading selections, Markdown downloads, the public TA link, account connection, existing-record recovery, and the separation between a private attempt and a shared peer contribution.
The starter and plugin tests cover the ZIP contents, reviewed captures, selected portfolio excerpts and the TA handoff.
The [evaluation guide](learning-workspace-evaluation.md#try-obsidian-as-the-diary-editor) describes a first-use and return-visit rehearsal in a disposable desktop vault.
The optional real-provider check uses a dedicated authenticated profile and a temporary synthetic notebook:

```bash
LEARNING_CODEX_LIVE=1 npx playwright test tests/e2e/learning-agent-live.spec.ts --project=chromium
```

On 2026-10-06, Codex CLI 0.154.0 passed real reply/resume and the browser observation → approved change → actual result → reviewed notebook draft workflow.
The retained demo catalog is checked through live DOM observation/action tests; disabled controls remain unavailable during startup or a busy operation.
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
The learning cockpit retains the reading or demo source with a draft.
Students choose whether to send their question.
Student messages retain optional goal/help-mode/support-need metadata and the supplied note identities in existing conversation JSON; older requests default to unspecified and older turns remain valid.
The chosen support need also appears in the sent message so earlier companions receive the student's request even without structured support metadata.
The companion records which private attempts a student selected for each assistant turn.
The diary download includes the chosen exchange and its attribution.
The prepared 0.3.0 companion retains the provider changes introduced in 0.2.0; a website update alone does not update an installed companion.
The Codex adapter applies the current shared instructions on both thread start and resume and reports the actual CLI version (or null if it cannot be read).
Each new student and assistant message stores optional `teaching: { policy: { id, version, name }, provider: { name, version } }` in existing conversation JSON.
The metadata identifies applied instructions, not proof that a reply complies; later policies never rewrite earlier turns.
**About this reply** shows recorded versions, with an explicit unknown-history message for legacy replies; the diary preview identifies the selected exchange.
Policy changes update the policy version alongside the instructions and their evaluation evidence.
Teaching metadata is additive in the version 1 conversation database and portable notebook/archive schemas.
The published companion uses HTTP protocol 2 for code-free connection; existing record histories remain valid.
Providers that do not advertise a policy are treated as unversioned, rather than being assigned today's policy by the conversation owner.
[learning-codex.ts](../scripts/lib/learning-codex.ts) adapts the [Codex app-server protocol](https://learn.chatgpt.com/docs/app-server) over local stdio.
[learning-conversations.ts](../scripts/lib/learning-conversations.ts) owns `conversations.sqlite`, selected context and the browser request broker.
Notebook records remain independent of these provider threads.
Portable notebook export includes accepted assistance history but excludes raw conversations and credentials.
Stopped/restarted conversations retain their messages and provider thread identity, with an explicit interrupted-state message before resuming.

The dedicated Codex home uses Codex's OS keyring authentication and accepts no custom configuration, hooks, plugins, rules or custom skills.
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

### Direct API providers and onboarding

The terminal's guided `setup` adds OpenAI, Anthropic, Gemini and OpenRouter API keys without requiring Codex.
The browser shows one setup command, the next start command and explicit connection; it contains no key input and preserves an unsent assistant draft while students configure a provider.
Settings retain exact trusted origins and the port across restarts; explicit command options override them for that invocation.
Codex users can choose ChatGPT authentication or `login --with-api-key` in their dedicated profile.

The separate [API transport](../scripts/lib/learning-api-model.ts) accepts HTTPS, binds named presets to their official endpoints, rejects embedded credentials and redirects, and returns sanitized failures.
The [credential owner](../scripts/lib/learning-api-credentials.ts) reads only the explicitly selected environment variable or the OS keychain entry bound to the notebook's stable identity and exact normalized endpoint.
`credential-identity.json` contains a versioned UUID, never a key; API entry identifiers combine that UUID and a SHA-256 endpoint hash under the `dev.scalableweb.companion` service.
The lazy [keychain adapter](../scripts/lib/learning-keychain.ts) uses pinned `@napi-rs/keyring`, requires durable Secret Service on Linux and reports unavailable/locked/denied access without falling back to plaintext or transient storage.
Settings retain the environment variable name, never its value.
Keys do not enter browser status, diagnostic reports, notebook exports or provider transcripts.
Private directory backups include credential identifiers and raw API transcripts, not OS keychain entries.
`logout` removes the selected endpoint's keychain entry; environment-backed use instead explains how to unset/revoke the external key without changing the parent environment or deleting another stored entry.

[The shared chat engine](../scripts/lib/learning-chat.ts) preserves the local adapter's behavior and gives API providers the same selected context, bounded history, interruption handling and validated tool broker.
`api-provider.sqlite` uses schema 1 and separate `api-` thread identities; provider, endpoint, model and tool mode must match before an old transcript is sent.
Key rotation at the same backend retains conversations.
Direct API discussion uses plain text replies and defaults to a 16,384-token estimated context budget with a 4,096-token output allowance; `--api-context` and `--api-output` configure these within model limits.
Reasoning may consume output tokens; truncation retains the student's work and reports failure instead of accepting a partial reply.

Setup and `doctor` only request a model catalog.
Catalogs can be public; listing does not establish credential validity, inference access, teaching quality or tool reliability.
The first deliberate question checks actual generation access and may incur provider charges.
Automatic provider tests use synthetic HTTP responses; live account/model verification is separate from repository implementation and package publication.

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
Submit buttons whose form belongs to the current demo are declared as button actions; the native click preserves form validation and the demo's existing submit handler.
Hidden or disabled controls remain unavailable, including run buttons waiting for a prediction.
An action can start asynchronous work; observe again to read its progress and completed result.
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
**Download a diary reflection prompt** produces a Markdown file with the thread reference and optional personal prompts.
Students can include contributions they have explicitly selected.
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
