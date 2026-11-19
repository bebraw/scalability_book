import assert from "node:assert/strict";
import test from "node:test";
import { renderMarkdown } from "../scripts/lib/markdown.ts";

test("a ScholarMark disclosure folds the follow-up and preserves paragraph feedback targets", () => {
  const prompt =
    "Trace the first patch.\nWhich `TESTS_PASS` belongs to this revision?";
  const answer = "**Check your reasoning:** Look at the revision.";
  const after = "Continue with the project.";
  const label = "Optional follow-up — Can the revised patch ship?";
  const prose = [prompt, answer, after].join("\n\n");
  const disclosure = `:::details[${label}]\n${prompt}\n\n${answer}\n:::`;
  const chapter = { number: "2" };
  const { content } = renderMarkdown(`${disclosure}\n\n${after}`, chapter);
  const details = content.match(/<details\b([^>]*)>([\s\S]*?)<\/details>/);
  assert.ok(details);
  assert.doesNotMatch(details[1]!, /\bopen\b/);
  assert.equal(
    details[2]!.match(/<summary\b[^>]*>(.*?)<\/summary>/)?.[1],
    label,
  );
  assert.match(details[2]!, /<code[^>]*>TESTS_PASS<\/code>/);
  assert.match(details[2]!, /<strong\b[^>]*>Check your reasoning:<\/strong>/);
  assert.doesNotMatch(details[2]!, /Continue with the project/);
  assert.ok(content.indexOf(after) > content.indexOf("</details>"));
  const targets = (html: string) =>
    [...html.matchAll(/data-comment-target="([^"]+)"/g)].map(
      (match) => match[1],
    );
  const originalTargets = targets(renderMarkdown(prose, chapter).content);
  assert.equal(originalTargets.length, 3);
  assert.deepEqual(targets(details[2]!), originalTargets.slice(0, 2));
  assert.deepEqual(targets(content), originalTargets);
});

test("ordinary blockquotes and title-only labels stay visible", () => {
  for (const quote of [
    "> **Sustainability angle**\n>\n> A useful note.",
    "> **Optional follow-up — A quoted title**\n>\n> Still quoted.",
    "> Optional follow-up — This is quoted prose.\n>\n> Still quoted.",
    "> **Optional follow-up — Title with no body**",
  ]) {
    const { content } = renderMarkdown(quote, { number: "2" });
    assert.match(content, /<blockquote\b/);
    assert.doesNotMatch(content, /<details\b/);
  }
});

test("concept references preserve paragraph feedback identity", () => {
  const original = renderMarkdown(
    "# Chapter\n\nA **coding agent** needs a harness and **saturation** evidence.",
    { number: "1" },
  );
  const linked = renderMarkdown(
    "# Chapter\n\nA **[coding agent](/concepts/#agent)** needs a [harness](/concepts/#harness) and [**saturation**](/concepts/#saturation) evidence.",
    { number: "1" },
  );
  assert.equal(
    linked.content.match(/data-comment-target="([^"]+)"/)?.[1],
    original.content.match(/data-comment-target="([^"]+)"/)?.[1],
  );
  assert.match(linked.content, /href="\/concepts\/#agent"/);
});

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

test("fenced code is syntax-highlighted during Markdown rendering", () => {
  const rendered = renderMarkdown(
    `# Chapter

\`\`\`ts
const message = "Hello";
\`\`\`
`,
    { number: "2" },
  );

  assert.match(rendered.content, /<code[^>]*class="hljs language-ts"[^>]*>/);
  assert.match(rendered.content, /<span class="hljs-keyword">const<\/span>/);
  assert.match(rendered.content, /<span class="hljs-string">"Hello"<\/span>/);
});

test("plain-text fences stay uncolored without requiring a browser runtime", () => {
  const rendered = renderMarkdown(
    `# Chapter

\`\`\`text
No syntax here.
\`\`\`
`,
    { number: "2" },
  );

  assert.match(
    rendered.content,
    /<code[^>]*class="hljs language-text"[^>]*>No syntax here\.\n<\/code>/,
  );
  assert.doesNotMatch(rendered.content, /hljs-keyword/);
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
See also :ref[table:measurements].
`,
    { number: "2" },
  );

  assert.match(
    rendered.content,
    /<table(?=[^>]*class="semantic-table")(?=[^>]*id="table:measurements")[^>]*>/,
  );
  assert.match(
    rendered.content,
    /<caption class="semantic-table-caption"[^>]*><span class="semantic-table-number">Table 2\.1\.<\/span> Measurements collected during the trial\. <a aria-label="Link to Table 2\.1" class="table-anchor" href="#table:measurements">#<\/a><\/caption>/,
  );
  assert.doesNotMatch(rendered.content, /class="semantic-label"/);
  assert.match(
    rendered.content,
    /href="#table:measurements"[^>]*>the measurements table<\/a>/,
  );
  assert.match(
    rendered.content,
    /data-reference="table:measurements"[^>]*>Table 2\.1<\/a>/,
  );
});

test("native figures use chapter-prefixed numbers and direct anchors", () => {
  const rendered = renderMarkdown(
    `# Chapter

:::figure{kind="boxplot" version=1 x-label="Time (ms)" y-label="Method"}
::box[Baseline]{min=12 q1=15 median=18 q3=21 max=27}
::caption[Latency measured across five runs.]
:::
::label[fig:latency]

See :ref[fig:latency].
`,
    { number: "2" },
  );

  assert.match(
    rendered.content,
    /<figure(?=[^>]*class="[^"]*semantic-figure[^"]*")(?=[^>]*id="fig:latency")[^>]*>/,
  );
  assert.match(
    rendered.content,
    /<figcaption class="semantic-figure-caption"><span class="semantic-figure-number">Figure 2\.1\.<\/span> Latency measured across five runs\. <a aria-label="Link to Figure 2\.1" class="figure-anchor" href="#fig:latency">#<\/a><\/figcaption>/,
  );
  assert.match(
    rendered.content,
    /data-reference="fig:latency"[^>]*>Figure 2\.1<\/a>/,
  );
});

test("unknown citation keys fail the build", () => {
  assert.throws(
    () =>
      renderMarkdown("# Chapter\n\nMissing :cite[unknown].", { number: "2" }),
    /Missing citation: unknown/,
  );
});
