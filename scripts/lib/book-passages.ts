import { createHash } from "node:crypto";
import { fromHtml } from "hast-util-from-html";
import type { Element, RootContent } from "hast";
import type { BookPassage, BookPassages } from "../../shared/book-retrieval.ts";

// Index rendered prose, not raw sources: publishing masks comments and author notes.
// Deliberately skip imported demos, exercises, discussions, feedback and navigation.
const proseBlocks = new Set(["p", "ul", "ol", "pre", "blockquote", "table"]);
const excludedTags = new Set([
  "script",
  "style",
  "button",
  "form",
  "input",
  "select",
  "textarea",
  "details",
  "nav",
]);

function excluded(node: Element) {
  return (
    excludedTags.has(node.tagName) ||
    node.properties.ariaHidden === "true" ||
    (node.properties.className as string[] | undefined)?.some((name) =>
      /^(paragraph-feedback|exercise|demo|heading-anchor|caption-anchor|katex-html)/.test(
        name,
      ),
    )
  );
}

function textOf(node: RootContent): string {
  if (node.type === "text") return node.value;
  if (node.type !== "element" || excluded(node)) return "";
  if (node.tagName === "math") {
    const tex = findTex(node);
    return tex
      ? `$${tex}$`
      : String(node.properties.ariaLabel ?? node.children.map(textOf).join(""));
  }
  const text = node.children.map(textOf).join("");
  return ["p", "li", "tr", "pre", "blockquote", "br"].includes(node.tagName)
    ? `${text}\n`
    : ["td", "th"].includes(node.tagName)
      ? `${text}\t`
      : text;
}

function findTex(node: RootContent): string | undefined {
  if (node.type !== "element") return undefined;
  if (
    node.tagName === "annotation" &&
    node.properties.encoding === "application/x-tex"
  )
    return node.children.map(textOf).join("");
  return node.children.map(findTex).find(Boolean);
}

function anchorsOf(node: RootContent): string[] {
  if (node.type !== "element" || excluded(node)) return [];
  return [
    typeof node.properties.id === "string" ? node.properties.id : "",
    ...node.children.flatMap(anchorsOf),
  ].filter(Boolean);
}

export function extractBookPassages(
  html: string,
  page: { url: string; title: string },
  origin: string,
): BookPassage[] {
  const passages: BookPassage[] = [];
  let heading = page.title;
  let anchors: string[] = [];
  let blocks: string[] = [];
  let sectionUrl = new URL(page.url, origin).href;
  const parentAnchors = new Map<number, string>();
  const flush = () => {
    if (blocks.length)
      passages.push({
        url: sectionUrl,
        title: page.title,
        heading,
        anchors,
        text: blocks.join("\n\n"),
      });
    blocks = [];
    anchors = [];
  };
  for (const node of fromHtml(html, { fragment: true }).children) {
    if (node.type !== "element") continue;
    if (/^h[1-6]$/.test(node.tagName)) {
      flush();
      heading = textOf(node).trim();
      const level = Number(node.tagName[1]);
      for (const parent of parentAnchors.keys())
        if (parent >= level) parentAnchors.delete(parent);
      const anchor = anchorsOf(node)[0];
      if (anchor) parentAnchors.set(level, anchor);
      anchors = [...parentAnchors.values()];
      sectionUrl =
        new URL(page.url, origin).href + (anchor ? `#${anchor}` : "");
    } else if (proseBlocks.has(node.tagName) && !excluded(node)) {
      const text = textOf(node).trim();
      if (text) {
        blocks.push(text);
        anchors.push(...anchorsOf(node));
      }
    }
  }
  flush();
  return passages;
}

export function exportBookPassages(passages: BookPassage[]): BookPassages {
  return {
    schemaVersion: 1,
    revision: createHash("sha256")
      .update(
        JSON.stringify(
          passages.map(({ url, ...passage }) => ({
            ...passage,
            url: new URL(url).pathname + new URL(url).hash,
          })),
        ),
      )
      .digest("hex"),
    passages,
  };
}
