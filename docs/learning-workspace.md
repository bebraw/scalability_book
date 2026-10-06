# Learning workspace

This document owns the executable learning-workspace contracts and local companion setup.
[ADRs 027–029](adrs/README.md#accepted) record the agreed whole-book direction.
Accepted status does not establish that all of that direction is implemented.

## Current implementation

The local companion provides an authenticated private notebook API: note capture and revision history, concept self-assessment, portable export/import and selected-note submission drafts.
The whole-book Notebook interface loads on demand on reading, concept, exploration and demo pages, with passage capture independent of feedback sign-in.
The optional Codex adapter provides persisted conversations, bounded browser demo tools and student-reviewed notebook drafts.
Course-backed group/cohort inquiry uses the existing course identity and record store, with an initial-work reveal step and opt-in public editorial offers.
Production availability of peer inquiry depends on the existing course storage and authentication rollout.

The shared contract is [learning-workspace.ts](../shared/learning-workspace.ts).
[learning-notebook.ts](../scripts/lib/learning-notebook.ts) owns local SQLite persistence; [learning-companion-http.ts](../scripts/lib/learning-companion-http.ts) owns pairing and API access.
These modules do not depend on course storage or a provider SDK.
The website/Worker never owns this private notebook or provider credentials.

## Start the companion

Use Node 24 or newer and the repository's installed dependencies:

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
Use `--directory` to choose another notebook and `--port` for another loopback port.
Keep the original database when updating the companion; restart it to obtain a new pairing code after disconnect, expiry or a lost browser session.

Pairing checks the exact website origin and loopback host.
The resulting bearer session is bound to that origin, expires after twelve hours and can be revoked through `/disconnect`.
Browser requests use the Authorization header, not URL credentials or cookies.
CORS preflight is origin-gated, including local-network permission requests.
The companion does not log notes, provider credentials or session tokens.

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

## Verification

```bash
node --test tests/learning-notebook.test.ts tests/learning-companion.test.ts tests/learning-agent.test.ts tests/course-inquiry.test.ts
npx playwright test tests/e2e/learning-workspace.spec.ts tests/e2e/learning-demo-bridge.spec.ts tests/e2e/learning-peer-inquiry.spec.ts
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

| Route                               | Purpose                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| `GET/POST /agent/conversations`     | List/start a private conversation.                                             |
| `GET/POST /agent/conversations/:id` | Read/send a turn with goal, help mode, selected note IDs and browser identity. |
| `GET /agent/requests?browser=:id`   | Poll the initiating browser's bounded demo requests.                           |
| `POST /agent/requests/:id`          | Return that browser's actual observation or a declined/unavailable result.     |
| `POST /agent/stop`                  | Interrupt the current reply and retain its work.                               |

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

Entry is **Notebook → Peers** at a passage, activity or demo.
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
