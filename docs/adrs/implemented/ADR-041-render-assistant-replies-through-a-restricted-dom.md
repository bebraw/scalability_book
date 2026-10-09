# ADR-041: Render assistant replies through a restricted DOM

**Status:** Implemented

**Date:** 2026-10-09

## Context

Live notebook testing produced Codex replies containing Markdown links, emphasis, tables and TeX equations.
The plain-text reply view exposed that notation directly, making source navigation and quantitative explanations harder to read.
Replies are untrusted provider content, and the browser also holds access to the private local companion.

## Decision

Keep reply formatting in a browser presentation module with no persistence or provider responsibilities.
Parse Markdown with Marked, then construct an explicit set of DOM elements instead of inserting the parser's HTML output.
Support paragraphs, bounded heading levels, lists, quotes, emphasis, tables, code and HTTP(S) links.
Display raw HTML literally and image descriptions as text without fetching images.
Reject link credentials and non-HTTP(S) destinations; external links use a separate tab with opener access disabled.

Render inline and display TeX through KaTeX's MathML output with trust disabled and expansion/size bounds.
Invalid or unsupported equations fall back to their original notation.
Use native browser MathML without loading external math fonts or stylesheets.
Retain original reply text in conversations and reviewed notebook handoffs.

## Trigger

The user requested fixes for the concrete usability issues found while testing the deployed notebook and Codex assistant.

## Consequences

**Positive:**

- Sources, tabular comparisons and equations become readable within the existing assistant panel.
- Model text cannot introduce arbitrary HTML elements, image requests or executable link schemes through this renderer.
- Historical replies benefit without rewriting stored conversations or changing companion protocol/schema versions.

**Negative:**

- The supported Markdown subset and math parser require maintenance and browser compatibility checks.
- KaTeX adds to the lazy-loaded learning bundle; unsupported notation remains visible as code.

**Neutral:**

- Student messages and browser observations retain their existing plain-text presentation.
- Formatting does not validate the accuracy of a reply or its linked source.

## Alternatives considered

### Keep every reply as plain text

This preserves a small rendering surface but leaves observed links, tables and equations difficult to use.

### Insert sanitized Markdown HTML

A maintained sanitizer can support richer HTML, but it would create a broader HTML/SVG/MathML policy than this panel needs.
Constructing the small supported DOM directly makes the permitted elements and link policy explicit.

## Implementation and verification

[learning-reply.ts](../../../site/scripts/learning-reply.ts) owns parsing and DOM construction; [learning-agent-ui.ts](../../../site/scripts/learning-agent-ui.ts) applies it only to agent replies.
[The learning workspace browser suite](../../../tests/e2e/learning-workspace.spec.ts) covers real panel rendering of links, emphasis, tables, inline/display math, unsupported equations and fenced code, plus literal raw HTML, blocked executable links and absent image/iframe/script elements.
Chromium and WebKit exercise this boundary using synthetic replies; real-provider testing establishes integration separately from instructional reliability.
The owning [workspace contract](../../learning-workspace.md) describes the supported presentation and retained source text.

## References

- [Marked lexer and extension API](https://marked.js.org/using_pro)
- [KaTeX rendering options](https://katex.org/docs/options.html)
- [ADR-034: Separate private notebook and teaching assistant](ADR-034-separate-the-private-notebook-from-the-teaching-assistant.md)
