# Lecture Studio: self-study integration findings

Update: defects 1–3 were fixed upstream in `186da328a3deea328c85b566d107174ce645552c`.
The pilot now pins that revision and has removed its HTML-normalization and CSS workarounds.
Findings 1–3 below describe the original reproduction; npm packaging remains deferred.
Finding 5 is a newly reproduced link-rendering defect in the pinned revision.

Tested revision: [`bd197d6240b4d390e6646c8d64c4f01f5e89d0c4`](https://github.com/bebraw/lecture-studio/tree/bd197d6240b4d390e6646c8d64c4f01f5e89d0c4).
Date: 2026-09-17.
Receiving project: the scalableweb.dev self-study pilot, hosted under `/learn/pilot/`.
Environment: Node 26.8.2, Chromium through Playwright, and Gustwind HTML validation.

The three issues below were reproduced against an **unmodified Studio export**, before applying the receiving project's workarounds.
Each numbered section can be filed as a separate issue.
The packaging request is an enhancement, not a defect.

## 1. Exporting a complete HTML demo produces duplicate document headers

**Suggested priority:** High — blocks strict HTML validation in a consuming site's build.

### Reproduce

From the Studio checkout, export the included pilot to a destination that does not exist:

```sh
rtk npm run export:study -- examples/self-study/course.json /tmp/studio-report-export
```

Inspect `scalability/demos/amdahl.html` in that output.
The supplied Amdahl source is already a complete HTML document.
The emitted file contains two doctypes: the generated header/bootstrap followed by the author's complete document.

The scalableweb pilot reproduced the same problem with both Amdahl and Little's Law.
Gustwind validation failed with:

```text
measurement/demos/little-law.html:1:833 misplaced-doctype
```

The exact location depends on the source and formatting.
Browsers recover and run the demonstrations, so an interaction-only browser test does not catch this.

### Cause

[`shared/web-demo.ts`, `demoDocument()`](https://github.com/bebraw/lecture-studio/blob/bd197d6240b4d390e6646c8d64c4f01f5e89d0c4/shared/web-demo.ts#L11) concatenates:

```text
generated doctype + metadata + bridge script + authored HTML
```

[`lib/study-export.ts`](https://github.com/bebraw/lecture-studio/blob/bd197d6240b4d390e6646c8d64c4f01f5e89d0c4/lib/study-export.ts#L219) then injects the CSP into that generated prefix.
The helper is shared with live demos; the observed downstream build failure is in self-study export.

### Expected behavior / suggested fix

Produce one valid document for both complete-document and fragment inputs.
For a complete document, insert the bridge into its head before any authored script that uses `LectureDemo`, rather than prepending a second document.
Preserve the authored language, title, styles, and body.
Keep the restrictive CSP effective before authored content executes.
The exporter currently finds its insertion point by matching an exact charset tag; update that integration together with document assembly.

### Acceptance checks

- Export the supplied full-document Amdahl example and a minimal HTML fragment.
- Both outputs parse without HTML errors and contain one doctype.
- The CSP remains present and effective; the bridge precedes authored scripts.
- Controller/viewer roles, initial state, state changes, and reset still work.
- Include mixed-case document tags and a source without an explicit head.

### Current downstream workaround

`scripts/lib/study-html.ts` parses and serializes emitted demo documents with `parse5`, matching browser document recovery.
The regression test checks document validity, language, CSP retention, and bootstrap order.
Remove the adapter and its dedicated dependency after pinning a fixed exporter.

## 2. Self-study renders the static poster alongside the interactive demo

**Suggested priority:** Medium — duplicates content and can show contradictory values.

### Reproduce

Use a material slide with both fields, with the referenced HTML and SVG beside the source deck:

```yaml
id: amdahl
type: material
demo: ./amdahl.html
demoPoster: ./amdahl.svg
```

Any valid static SVG is enough to reproduce the layout issue.
For example, use a poster showing the starting result of `2.5×`.
Export and open the module with JavaScript enabled, then change the demo to 16 workers at 80% parallel work.

**Observed:** the static image and working iframe are both visible.
The poster continues to display `2.5×` while the live model displays `4×`.
It also pushes the controls further down the page, particularly on mobile.

The unmodified pilot export was checked in Chromium:

```json
{ "posterVisible": true, "demoVisible": true }
```

### Cause

[`studySteps()`](https://github.com/bebraw/lecture-studio/blob/bd197d6240b4d390e6646c8d64c4f01f5e89d0c4/lib/study-export.ts#L74) appends `posterMarkdown(step)` to the public slide HTML.
The module renderer also emits a demo host, and the runtime mounts its iframe.
The stylesheet does not distinguish the poster fallback from ordinary reading images.

### Expected behavior / suggested fix

Treat the poster as a fallback rather than a second concurrent result:

- Show the poster in no-JavaScript reading and printed output.
- Hide it on screen once the interactive demo is ready.
- Preserve a useful fallback if the demo fails to load.
- Give poster markup a dedicated class or data attribute instead of identifying it through its alt text.

The current generated alt text is always `Demo preview`; an authored description would also improve the fallback's accessibility, but that is a separate enhancement.

### Acceptance checks

- With JavaScript and a ready demo: controls are visible; the static poster is hidden.
- Without JavaScript: the poster and explanatory Markdown remain visible.
- Print media: the poster is visible and the interactive host is hidden.
- A regular Markdown illustration remains visible in all applicable views.
- A failed demo load does not leave the learner without either visual.

### Current downstream workaround

`study/pilot.css` hides the poster on screen when the step contains an iframe:

```css
@media screen {
  .study-step:has(.web-demo-frame) > .prose > p:has(> img[alt="Demo preview"]) {
    display: none;
  }
}
```

This is deliberately narrow, but relies on generated alt text and detects mounting rather than successful initialization.
A dedicated upstream poster element and demo-ready state would be preferable.

## 3. No-JavaScript reading reserves a large empty demo area

**Suggested priority:** Medium — avoidable blank space in a supported reading mode.

### Reproduce

Export a module containing a demo and open it in a browser context with JavaScript disabled.
Inspect `.demo-host` on the demo section.

**Observed in Chromium at desktop width:** zero iframes, but a visible empty host with a height of **540 pixels**.
The stylesheet specifies **620 pixels** at its narrow-screen breakpoint.
The poster and explanatory content can still be read, but the unused host creates a substantial gap.

### Cause

The exporter unconditionally emits an empty `.demo-host` for demo steps.
[`public/study.css`](https://github.com/bebraw/lecture-studio/blob/bd197d6240b4d390e6646c8d64c4f01f5e89d0c4/public/study.css#L198) assigns it a fixed height even when nothing is mounted.
The existing print rule hides it for printing but does not address no-JavaScript screen reading.

### Expected behavior / suggested fix

Do not reserve interactive space when there is no demo UI.
Keep the poster, public explanation, and existing JavaScript guidance in the reading flow.
If loading/error UI is introduced, distinguish that populated state from an empty host.

### Acceptance checks

- Desktop and mobile contexts with JavaScript disabled have no empty fixed-height host.
- With JavaScript enabled, the mounted demo remains visible and operable.
- Poster/no-poster slides both retain their explanatory text.
- Print remains unaffected.

### Current downstream workaround

```css
.demo-host:empty {
  display: none;
}
```

## 4. Optional enhancement: publish a standalone exporter package

**Suggested priority:** Low — the pinned Git integration already works.

The consuming site currently fetches a full Studio checkout at a pinned commit and installs its locked dependencies to run `scripts/export-study.ts`.
That also installs development tools unrelated to static export.

A versioned npm package could provide:

- A CLI accepting course configuration and a new output directory.
- A small JavaScript API exposing the existing export operation.
- The required parser, demo bridge, bundled learner runtime/styles, Mermaid support, and packaged assets.
- No dependency on starting the Studio server, connecting Obsidian, or configuring an audience backend.

Keep the current public bundle contract, deterministic content revisions, exclusion rules, and refusal to overwrite an existing export directory.
A clean consumer should be able to export with only that package installed and no Studio checkout.

## 5. Root-relative and parent-relative Markdown links render as literal text

**Suggested priority:** Medium — prevents chapter and module navigation in published reading content.

Reproduced at `186da328a3deea328c85b566d107174ce645552c` with:

```md
[Read the chapter: Measurement and observability](/chapters/benchmarking/)
[Revisit scaling pressure](../scalability/index.html) or [return to the book](/).
```

The exporter leaves these as literal Markdown rather than emitting anchors.
`lib/material.ts` overrides MarkdownIt's `validateLink` to accept `./` paths, HTTPS URLs, and selected `/lecture-assets/` images only.
Consequently, ordinary root-relative and parent-relative navigation is rejected.

### Expected behavior / acceptance checks

- Render `/chapters/benchmarking/`, `../scalability/index.html`, and `/` as anchors with the authored destinations.
- Preserve supported `./` and HTTPS links.
- Retain rejection of unsafe URL schemes; test those separately from relative navigation.
- Verify actual anchors in exported HTML, not only that their intended destinations return HTTP 200.

### Current downstream workaround

The pilot now uses equivalent `./../../../chapters/benchmarking/`, `./../scalability/index.html`, and `./../../../` URLs from its module pages.
All six authored reading/module/home links are covered by a browser regression test that checks anchor visibility, resolved destinations, and successful requests.
The earlier destination-only checks missed this rendering defect.

## Checks that passed

These are not additional upstream defects:

- Nested module links and reading links work under `/learn/pilot/` with the finding 5 authoring workaround.
- Both teaching demos accept learner input; state survives reload/navigation and resets correctly.
- Separate browser contexts start independently; a changed module revision starts fresh progress.
- Authored correct/incorrect feedback works; reflections do not invent correct answers.
- Blocked storage still permits interaction with a visible persistence warning.
- Public output omits the private-note and classroom-only markers used in the source fixture.
- The local image is embedded, and diagram rendering works.

Production response CSP, JavaScript MIME types, and revalidation of stable runtime filenames were added in the receiving site as required by the handover.
Those are host integration responsibilities, not missing exporter behavior.

After the fixes are available: update `study/exporter.json`, remove only the obsolete adapters, and rerun the site build, HTML validation, unit checks, and self-study browser checks.
