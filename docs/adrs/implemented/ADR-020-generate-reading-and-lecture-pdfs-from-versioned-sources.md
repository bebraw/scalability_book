# ADR-020: Generate reading and lecture PDFs from versioned sources

**Status:** Implemented

**Date:** 2026-10-05

**Recorded retrospectively:** Book and lecture PDF commands introduced on 2026-08-28.

## Context

The web edition supports interactive reading, but students and the instructor also need portable reading and lecture artifacts.
Separately editing a PDF manuscript would create another content authority and make revisions difficult to review.

## Decision

Generate the book PDF from the site's rendered content and versioned publication sources, using a print-specific layout.
Include the core chapters, appendices, case studies, and course project guide.
Replace interactive activities with context and links to their web versions rather than claim that the PDF executes them.
Keep generated PDF output separate from the committed source.

Maintain lecture deck drafts as concise Markdown with presentation metadata and speaker-note comments.
Render one 16:9 PDF per lecture through the lecture export command.
Lecture decks adapt chapter content; they are separate versioned teaching sources, not automatically identical copies of the book.
Presentation-led sessions use their decks for framing and discussion rather than add another full lecture.

Keep book selection, export order, links, and layout aligned when material moves.
The current PDF generator maintains its own entry/order list, so agreement with site configuration still requires review.

## Trigger

The August history added reproducible book reading export, followed by lecture drafts and their PDF exporter.

## Consequences

**Positive:**

- Portable artifacts can be regenerated from reviewed repository sources.
- Print layout can suit reading or projection without altering the web experience.

**Negative:**

- Print pagination and links require artifact inspection after layout or ordering changes.
- Separate lecture adaptation and the PDF entry list can drift if editorial changes are not propagated.

**Neutral:**

- PDF output complements the web edition; interactive execution remains on the website.

## Alternatives considered

### Maintain a separate manually edited book manuscript

This would duplicate the reading content and weaken the relation between reviewed Markdown and exported text.

### Rely only on ordinary browser printing

The implemented generators provide deliberate book ordering and distinct reading/lecture layouts.

## Implementation and verification

[Book PDF generator](../../../scripts/build-pdf.ts), [lecture PDF generator](../../../scripts/build-lecture-pdfs.ts), [lecture sources](../../../slides/README.md), and [package commands](../../../package.json) implement the exports.
For changes to layout, content selection, or ordering, build the affected PDFs and inspect them.
This retrospective record itself changes no publication sources or exported artifacts.

## Historical evidence

- [2026-08-28: add the reproducible reading edition](https://github.com/bebraw/scalability_book/commit/0157af6f0d0cbdb00ea53501a3fc9eeda18696d5).
- [2026-08-28: add lecture decks and PDF exports](https://github.com/bebraw/scalability_book/commit/db48d959eea91af6aed1647162e91f29716dd0b0).
