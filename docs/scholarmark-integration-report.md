# Scholarmark integration report

Status: upstream change request

Consumer: [bebraw/scalability_book](https://github.com/bebraw/scalability_book)

Upstream: [bebraw/scholarmark](https://github.com/bebraw/scholarmark)

Tested package: `scholarmark@0.1.0`

## Summary

Scholarmark is a strong fit for the book's long-term Markdown pipeline.
It already covers the shared portable comment syntax and adds structured citations, cross-references, bibliography placement, heading numbering, GFM, diagnostics, and sanitized output.

A direct replacement of the book's current `marked` renderer is not yet practical because the book adds trusted host behavior after Markdown parsing.
That behavior includes interactive teaching demos, paragraph feedback controls, heading anchors, syntax highlighting, external-link attributes, and sidebar table-of-contents data.

The smallest general-purpose upstream change is to expose the sanitized HAST before it is stringified.
The consumer can then add trusted host nodes without weakening Scholarmark's authored-HTML policy.
Scholarmark should also return structured metadata for the headings it numbers and identifies.

The proposed changes are:

1. Add asynchronous and synchronous APIs that return sanitized HAST.
2. Return rendered heading metadata from both HAST and HTML rendering APIs.

These additions should be backward-compatible.
They avoid putting book-specific concepts into Scholarmark and create a useful integration boundary for other static-site generators, editors, and publishing systems.

## Consumer context

The book currently has a synchronous build-time renderer in `scripts/lib/markdown.ts`.
It performs the following work:

- Removes portable `::: comment` blocks.
- Removes author-only notes after a final standalone `---` marker.
- Resolves a bounded `{{ import "path.html" }}` syntax for trusted local teaching demos.
- Numbers level-two and level-three headings with a chapter prefix.
- Builds sidebar table-of-contents metadata.
- Adds stable paragraph identifiers and feedback controls.
- Adds heading anchors.
- Highlights fenced code with Highlight.js.
- Adds `target="_blank" rel="noreferrer"` to external links.

The content currently contains 13 trusted HTML demo imports across nine Markdown files.
There is not yet a BibTeX bibliography or authored Scholarmark citation syntax, so citations can be adopted after renderer parity is established.

## Compatibility findings

| Capability                 | Scholarmark 0.1.0                                                                       | Book requirement                                  | Integration result                                |
| -------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------- |
| Standard Markdown and GFM  | Supported                                                                               | Required                                          | Compatible                                        |
| Portable comments          | Supported and diagnosed                                                                 | Required                                          | Can replace local comment parsing                 |
| Heading numbering          | Supports offset-based overrides                                                         | Requires chapter-prefixed numbers                 | Compatible through `headingNumbers`               |
| Sanitization               | Raw authored HTML is escaped                                                            | Required for untrusted Markdown                   | Desirable security boundary                       |
| Trusted teaching demos     | Raw HTML is intentionally escaped                                                       | 13 local interactive imports                      | Requires a host transformation after sanitization |
| Table of contents          | Analysis exposes authored headings, but rendering does not return final IDs and numbers | Requires final depth, ID, title, and number       | Requires upstream metadata                        |
| Paragraph feedback         | Source ranges are emitted as data attributes                                            | Requires stable IDs, buttons, and host attributes | Can be implemented as a host HAST transform       |
| Heading anchors            | Not emitted                                                                             | Required                                          | Can be implemented as a host HAST transform       |
| Code highlighting          | Language classes are retained                                                           | Requires highlighted token spans                  | Can be implemented as a host HAST transform       |
| External links             | Safe URLs are retained                                                                  | Current site adds new-tab attributes              | Can be implemented as a host HAST transform       |
| Diagnostics                | Returned as structured values                                                           | Production build should fail on errors            | Consumer can enforce its own policy               |
| Citations and bibliography | Supported                                                                               | Planned                                           | Can be adopted incrementally                      |

## Requested change 1: expose sanitized HAST

### Motivation

Scholarmark currently performs semantic Markdown transforms, converts the document to HAST, sanitizes it, and immediately stringifies it.
The sanitized HAST is the natural host integration boundary.

Returning this tree would let a host add trusted application markup without enabling authored raw HTML or importing Scholarmark's private processor internals.
It would also avoid parsing the generated HTML back into a tree.

### Proposed API

The names are illustrative and can follow the project's naming conventions.

```ts
import type { Root as HastRoot } from "hast";

export interface RenderedHastDocument {
  tree: HastRoot;
  diagnostics: Diagnostic[];
  headings: RenderedHeading[];
}

export function renderHast(
  source: string,
  bibliographySource: string,
  citationStyle?: CitationStyle,
  options?: MarkdownRenderOptions,
): Promise<RenderedHastDocument>;

export function renderHastSync(
  source: string,
  bibliographySource: string,
  citationStyle?: CitationStyle,
  options?: SyncMarkdownRenderOptions,
): RenderedHastDocument;
```

The existing HTML APIs can delegate to the HAST APIs and stringify their result:

```ts
export interface RenderedDocument {
  html: string;
  diagnostics: Diagnostic[];
  headings: RenderedHeading[];
}
```

### Required semantics

- The returned tree has already passed through Scholarmark's sanitizer.
- Authored raw HTML remains escaped before the host receives the tree.
- `renderHast()` and `renderHastSync()` have the same semantic output when all configured formatters are synchronous.
- Each call returns a fresh tree that the consumer can mutate without affecting later renders.
- Existing `render()` and `renderSync()` HTML output remains unchanged apart from the additive metadata field.
- A parser or transform failure produces the same bounded diagnostic and escaped-source fallback represented as safe HAST.
- The processor itself remains private so plugin ordering and internal transforms do not become public API.

### Security boundary

Scholarmark should document that the returned tree is safe at the point it leaves Scholarmark.
A consumer that mutates the tree owns the safety of the nodes it adds.

This keeps the existing guarantee precise:

- Scholarmark continues to reject or escape untrusted authored HTML.
- The book can insert HTML loaded only from its validated repository-local include paths.
- Scholarmark does not need a raw-HTML option, include directive, or book-specific sanitizer schema.

### Acceptance criteria

- Existing renderer fixtures produce byte-equivalent HTML through the refactored HTML path.
- Raw HTML, unsafe URL, citation, reference, comment, table, footnote, and native-figure security tests still pass.
- A new test can obtain sanitized HAST, add a trusted node, stringify it, and observe that node in the result.
- A new test confirms that mutating one returned tree does not mutate another render result.
- Type declarations expose the HAST root without requiring consumers to import internal Scholarmark modules.

## Requested change 2: return rendered heading metadata

### Motivation

`analyzeScholarmark()` returns authored headings, while the renderer determines final numbers, unique slugs, explicit label behavior, and output IDs later in the pipeline.
A navigation component needs the rendered values rather than a second approximation of the renderer's rules.

The book currently duplicates heading numbering and slug generation because its renderer also has to construct a sidebar table of contents.
Returning heading metadata would remove that duplication and prevent navigation links from drifting from rendered IDs.

### Proposed API

```ts
export interface RenderedHeading {
  depth: 2 | 3;
  id: string;
  title: string;
  number: string;
  from: number;
  to: number;
}
```

The initial type can cover only the numbered level-two and level-three headings.
It can be widened later if consumers need document-title or paragraph-label metadata.

Field semantics:

- `depth` is the authored Markdown heading depth.
- `id` is the final rendered fragment identifier after duplicate handling and explicit semantic rules.
- `title` is plain text without the generated section number.
- `number` is the final displayed number after applying `headingNumbers` overrides.
- `from` and `to` are source offsets in the normalized Markdown input.

### Acceptance criteria

- Metadata order matches document order.
- IDs exactly match rendered heading IDs.
- Numbers exactly match the generated `.section-number` text without trailing whitespace.
- Duplicate headings expose the same unique suffixes used in HTML.
- `headingNumbers` overrides are reflected in metadata.
- Commented headings do not appear.
- Heading markup, inline code, and character entities produce a plain-text title suitable for navigation.
- Async and sync results contain identical heading metadata.

## Consumer migration after upstream support

Once both APIs are available, the book can migrate behind its existing `renderMarkdown()` interface:

1. Preserve the author-only-note preprocessing step.
2. Replace trusted HTML imports with unique inert placeholders before Scholarmark parsing.
3. Call `renderHastSync()` with chapter-prefixed `headingNumbers`.
4. Fail the production build when Scholarmark returns an error diagnostic and report the source filename and line.
5. Traverse the returned sanitized HAST to replace only known import placeholders with parsed repository-local HTML.
6. Add stable paragraph IDs and feedback controls using the existing source-position annotations.
7. Add heading anchors, external-link attributes, and Highlight.js token markup.
8. Stringify the host-extended tree.
9. Adapt `RenderedHeading[]` to the existing sidebar table-of-contents type.
10. Add a bibliography file and migrate research links to Scholarmark citations in separate content changes.

This sequence keeps all current site behavior while making Scholarmark the single parser and semantic validator.

## Non-goals for Scholarmark

The upstream integration does not need Scholarmark to implement any of the following:

- The book's `{{ import }}` syntax.
- Arbitrary authored raw HTML.
- Paragraph feedback controls or stable feedback identifiers.
- Highlight.js integration.
- New-tab link behavior.
- The book's author-only-note convention.
- A build policy that throws on every diagnostic.

Those are host responsibilities once sanitized HAST and final heading metadata are available.

## Alternative API considered

An `afterSanitize(tree)` callback in `MarkdownRenderOptions` would also unblock the integration.
It is less preferable than returning HAST because synchronous and asynchronous callback types complicate the existing option split, callback failures become renderer failures, and the final output's security ownership becomes less obvious.

Returning sanitized HAST makes the boundary explicit and composes naturally with static-site generators.
If exposing HAST is not desirable, an explicitly named `transformSanitizedHast` callback is the smallest fallback.

## Suggested upstream issue split

The work can be reviewed as two independent changes:

1. **Expose sanitized HAST rendering APIs.** Refactor HTML rendering to build on the new shared result while preserving current output and security tests.
2. **Return rendered heading metadata.** Collect metadata during the existing heading transform and add it to all render results.

The book integration should begin only after both changes are released, avoiding a temporary HTML reparsing adapter or a second heading implementation.
