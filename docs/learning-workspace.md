# Learning workspace

This document owns the executable learning-workspace contracts and local companion setup.
[ADRs 027–029](adrs/README.md#accepted) record the agreed whole-book direction.
Accepted status does not establish that all of that direction is implemented.

## Current implementation

The local companion provides an authenticated private notebook API: note capture and revision history, concept self-assessment, portable export/import and selected-note submission drafts.
The book interface, model adapter, demo actions and peer threads are still being implemented.
The companion currently reports no connected model provider.

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

Developed written reflections will show a suggested target of 400 characters and representative examples.
This is guidance, not a minimum or a quality score; short scratch notes and the existing audio/video diary options remain valid.
Evaluation may change this reversible cue without changing the assessment rubric.

## Verification

```bash
node --test tests/learning-notebook.test.ts tests/learning-companion.test.ts
npm run types:check
```

The checks cover restart persistence, accepted revisions, stale-write rejection, portable restore/import conflicts, selected-note preparation and the pairing/origin/session boundary with synthetic notes.
They do not establish that a real provider works or that notebook use improves learning or course completion.
