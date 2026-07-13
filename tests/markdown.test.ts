import assert from "node:assert/strict";
import test from "node:test";
import { renderMarkdown } from "../scripts/lib/markdown.ts";

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
