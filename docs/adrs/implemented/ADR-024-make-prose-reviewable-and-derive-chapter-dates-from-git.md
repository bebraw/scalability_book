# ADR-024: Make prose reviewable and derive chapter dates from Git

**Status:** Implemented

**Date:** 2026-10-05

**Recorded retrospectively:** Sentence formatting introduced on 2026-07-27; chapter dates added in August and review tooling in September.

## Context

The repository's largest changes are often prose, for which wrapped line diffs and table padding can obscure the actual edit.
Readers also need useful chapter dates without maintaining another manually edited metadata field.

## Decision

Format Markdown prose one sentence per line using the configured Prettier plugin.
Keep author scaffolding in notes or excluded comment material rather than publish it as chapter content.
Review significant editorial changes with a readable, offline HTML diff generated from Git and the working copy.
Prioritize reading content, highlight changed words, reduce incidental table-padding noise, and retain raw Git diffs for exact changes.
The review tool does not stage or modify source and refuses to overwrite a tracked file with its report.

Derive chapter creation and update dates from Git author history, following renames.
Omit dates when a source archive has no Git history.
For a shallow checkout, fetch full history before calculating dates and fail if history cannot be completed rather than publish a misleading creation date.
These are source-history dates, not proof of deployment time or factual freshness of every claim.

## Trigger

History records sentence-based formatting, readable source review, automatic chapter dates, and a correction for shallow deployment checkouts.

## Consequences

**Positive:**

- Review exposes the wording changed instead of incidental wrapping.
- Publication provenance follows the actual source history without duplicate date maintenance.

**Negative:**

- Readable reports remain snapshots and must be regenerated after further edits.
- Shallow builds may need network access and can fail when history cannot be completed.

**Neutral:**

- Source review does not replace inspecting rendered layout or verifying a factual claim.

## Alternatives considered

### Review only raw line diffs or rendered revised pages

Raw diffs obscure some prose edits; a revised page alone hides what changed.
The implemented report complements both views.

### Manually maintain dates or use incomplete checkout history

Both can diverge from the full source history; the shallow-checkout correction explicitly removes the latter behavior.

## Implementation and verification

[Prettier configuration](../../../.prettierrc.json), [review generator](../../../scripts/review-diff.py), [review guide](../../reviewing-changes.md), and [Git date extraction](../../../scripts/lib/git-history.ts) implement these choices.
[Review integration tests](../../../tests/review_diff_test.py) cover comparisons and output boundaries; [history tests](../../../tests/git-history.test.ts) cover dates and shallow checkout handling.
Report output belongs under the ignored local review directory, separate from published site output.

## Historical evidence

- [2026-07-27: format one sentence per line](https://github.com/bebraw/scalability_book/commit/b67df334b5786d88a6313afa396f486d68355ea5).
- [2026-08-31: show dates from Git](https://github.com/bebraw/scalability_book/commit/baa81fe508353b3ede2190678e3e79cb07aeac08).
- [2026-09-24: add reusable review tooling](https://github.com/bebraw/scalability_book/commit/b1be1bf1278eb23e84c78363582d547a2c5738d3).
- [2026-09-25: correct dates in shallow checkouts](https://github.com/bebraw/scalability_book/commit/2c9e3b77d86804ee64a1fcc8d66dba52ce3db342).
