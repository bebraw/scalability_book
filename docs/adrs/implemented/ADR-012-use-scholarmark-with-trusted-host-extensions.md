# ADR-012: Use ScholarMark with trusted host extensions

**Status:** Implemented

**Date:** 2026-10-05

**Recorded retrospectively:** Integration began on 2026-07-27.

## Context

The book requires citations, numbered headings and captions, semantic references, diagnostics, and safe authored Markdown.
It also inserts trusted teaching demos and paragraph feedback controls.
The integration report explicitly documents why a renderer returning only HTML could not satisfy these needs cleanly.

## Decision

Use ScholarMark as the Markdown parser and semantic renderer, with a shared BibTeX bibliography.
Consume its sanitized HAST and rendered metadata before stringifying the final page.
Keep author-only preprocessing, validated repository-local includes, feedback identifiers, highlighting, and application controls in the host renderer.
Trusted host extensions do not enable arbitrary authored raw HTML.

Use renderer-provided heading IDs and numbers for navigation rather than maintaining a second numbering implementation.
Use semantic labels, references, and caption metadata for tables and figures.
Fail publication on renderer error diagnostics, including missing citation keys.
Keep book-specific imports and feedback behavior outside the upstream renderer's responsibilities.

## Trigger

The July integration requested sanitized-tree and heading-metadata APIs upstream, then migrated once those interfaces were available.
August work extended the integration to numbered tables and figures.

## Consequences

**Positive:**

- One semantic rendering pipeline supplies page content and navigation metadata.
- The trust boundary between authored Markdown and host-added markup is explicit.

**Negative:**

- Renderer upgrades must preserve host transforms, labels, and feedback identities.
- The build depends on the selected ScholarMark API and bibliography integration.

**Neutral:**

- Application markup remains the host's responsibility after sanitization.

## Alternatives considered

### Reparse returned HTML or duplicate heading rules

This would add a second interpretation of IDs, numbers, and source positions, which the integration report sought to eliminate.

### Enable arbitrary raw HTML or put book features upstream

Both weaken the separation between a reusable Markdown renderer and this application's trusted extensions.
The report also considered an after-sanitization callback, preferring returned HAST for clearer ownership and composition.

## Implementation and verification

[markdown.ts](../../../scripts/lib/markdown.ts), [bibliography.bib](../../../bibliography.bib), and [the integration report](../../scholarmark-integration-report.md) establish this boundary.
[Markdown tests](../../../tests/markdown.test.ts) cover rendering and safety contracts; [layout tests](../../../tests/e2e/book-layout.spec.ts) cover rendered caption behavior.

## Historical evidence

- [2026-07-27: integrate ScholarMark rendering](https://github.com/bebraw/scalability_book/commit/57ce0bf884bc54ac0b74aa642634fdb169f15ecb).
- [2026-07-27: add scientific citations](https://github.com/bebraw/scalability_book/commit/504d012819aa7c561ab1a300bc8c74d08d1c5cbd).
- [2026-08-26: add numbered tables and figures](https://github.com/bebraw/scalability_book/commit/5809709604ec2259faa977904b2be78d9f7893e3).
