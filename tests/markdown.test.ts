import assert from "node:assert/strict";
import test from "node:test";
import { renderMarkdown } from "../scripts/lib/markdown.ts";

test("unnumbered documents preserve authored heading numbers", () => {
  const rendered = renderMarkdown("# Brief\n\n## 1. Purpose\n\n### 1.1 Scope", {
    number: "",
  });

  assert.match(rendered.content, />1\. Purpose</);
  assert.match(rendered.content, />1\.1 Scope</);
  assert.doesNotMatch(rendered.content, /class="section-number"/);
  assert.deepEqual(
    rendered.tableOfContents.map(({ text }) => text),
    ["Brief", "1. Purpose", "1.1 Scope"],
  );
});

test("Markdown comment blocks are omitted from content and the table of contents", () => {
  const rendered = renderMarkdown(
    `# Chapter

Visible before.

::: comment
## Hidden section

Hidden paragraph.
---
Hidden note.
:::

## Visible section

Visible after.
`,
    { number: "2" },
  );

  assert.match(rendered.content, /Visible before/);
  assert.match(rendered.content, /Visible after/);
  assert.doesNotMatch(rendered.content, /Hidden/);
  assert.deepEqual(
    rendered.tableOfContents.map(({ text }) => text),
    ["Chapter", "2.1 Visible section"],
  );
});

test("Markdown comment markers inside code fences remain visible", () => {
  const rendered = renderMarkdown(
    `# Chapter

\`\`\`md
::: comment
Draft
:::
\`\`\`
`,
    { number: "2" },
  );

  assert.match(rendered.content, /::: comment/);
  assert.match(rendered.content, /Draft/);
});

test("unclosed Markdown comment blocks fail with the opening line", () => {
  assert.throws(
    () => renderMarkdown("# Chapter\n\n::: comment\nDraft\n", { number: "2" }),
    /Unclosed Markdown comment block starting at line 3/,
  );
});

test("citations automatically link to a generated bibliography", () => {
  const bibliography = `@article{little1961,
  author = {Little, John D. C.},
  title = {A Proof for the Queuing Formula},
  year = {1961}
}`;
  const rendered = renderMarkdown(
    `# Chapter

As :citet[little1961] showed, the relationship is stable.
`,
    { number: "2" },
    bibliography,
  );

  assert.match(rendered.content, /class="semantic-citation"/);
  assert.match(rendered.content, /Little \(1961\)/);
  assert.match(rendered.content, /class="semantic-bibliography"/);
  assert.match(
    rendered.content,
    /<a[^>]+class="semantic-citation"[^>]+href="#reference-little1961"/,
  );
  assert.match(rendered.content, /<li id="reference-little1961">/);
  assert.deepEqual(
    rendered.tableOfContents.map(({ text }) => text),
    ["Chapter", "2.1 References"],
  );
});

test("an explicit bibliography is not duplicated", () => {
  const rendered = renderMarkdown(
    `# Chapter

Earlier work established the relationship :cite[little1961].

## Sources

::bibliography[]
`,
    { number: "2" },
    `@article{little1961,
  author = {Little, John D. C.},
  title = {A Proof for the Queuing Formula},
  year = {1961}
}`,
  );

  assert.equal(
    rendered.content.match(/class="semantic-bibliography"/g)?.length,
    1,
  );
  assert.doesNotMatch(rendered.content, />References</);
});

test("citation syntax in a code fence does not generate a bibliography", () => {
  const rendered = renderMarkdown(
    `# Chapter

\`\`\`md
:cite[little1961]
\`\`\`
`,
    { number: "2" },
  );

  assert.doesNotMatch(rendered.content, /semantic-bibliography/);
  assert.deepEqual(
    rendered.tableOfContents.map(({ text }) => text),
    ["Chapter"],
  );
});

test("bibliography URLs remain clickable", () => {
  const rendered = renderMarkdown(
    `# Chapter

Earlier work established the relationship :cite[little1961].

## References

::bibliography[]
`,
    { number: "2" },
    `@article{little1961,
  author = {Little, John D. C.},
  title = {A Proof for the Queuing Formula},
  year = {1961},
  url = {https://doi.org/10.1287/opre.9.3.383}
}`,
  );

  assert.match(
    rendered.content,
    /href="https:\/\/doi\.org\/10\.1287\/opre\.9\.3\.383"/,
  );
  assert.match(rendered.content, /target="_blank"/);
});

test("postfix labels attach after captioned tables", () => {
  const rendered = renderMarkdown(
    `# Chapter

| Sample | Value |
| ------ | ----: |
| A      |    42 |
::caption[Measurements collected during the trial.]
::label[table:measurements]

See :ref[table:measurements]{text="the measurements table"}.
`,
    { number: "2" },
  );

  assert.match(
    rendered.content,
    /<caption class="semantic-table-caption"[^>]*>Measurements collected during the trial\.<\/caption>/,
  );
  assert.match(
    rendered.content,
    /class="semantic-label" id="table:measurements"/,
  );
  assert.match(
    rendered.content,
    /href="#table:measurements"[^>]*>the measurements table<\/a>/,
  );
});

test("unknown citation keys fail the build", () => {
  assert.throws(
    () =>
      renderMarkdown("# Chapter\n\nMissing :cite[unknown].", { number: "2" }),
    /Missing citation: unknown/,
  );
});
