import { readFileSync } from "node:fs";
import path from "node:path";
import { fromHtml } from "hast-util-from-html";
import highlight from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import {
  headingNumbersByOffset,
  projectMarkdownComments,
  renderTreeSync,
  slugify,
  toHtml,
  type Diagnostic,
  type RenderedHeading,
} from "scholarmark";
import type {
  Element as HastElement,
  ElementContent as HastElementContent,
  Parent as HastParent,
  Root as HastRoot,
  RootContent as HastRootContent,
} from "hast";
import { stableParagraphId } from "./text.ts";

export type RenderedMarkdown = {
  content: string;
  tableOfContents: TableOfContentsItem[];
};
export type TableOfContentsItem = {
  slug: string;
  level: number;
  text: string;
};
export type MarkdownChapter = {
  number: string;
};

highlight.registerLanguage("bash", bash);
highlight.registerLanguage("html", xml);
highlight.registerLanguage("javascript", javascript);
highlight.registerLanguage("js", javascript);
highlight.registerLanguage("json", json);
highlight.registerLanguage("typescript", typescript);
highlight.registerLanguage("ts", typescript);
highlight.registerLanguage("xml", xml);
highlight.registerLanguage("yaml", yaml);
highlight.registerLanguage("yml", yaml);

export function renderMarkdown(
  source: string,
  chapter: MarkdownChapter,
): RenderedMarkdown {
  source = getPublicMarkdownSource(source);
  const prepared = prepareMarkdownImports(source);
  const headingNumbers = prefixHeadingNumbers(
    headingNumbersByOffset(prepared.source),
    chapter.number,
  );
  const rendered = renderTreeSync(prepared.source, "", "apa", {
    headingNumbers,
  });
  throwOnMarkdownErrors(prepared.source, rendered.diagnostics);
  const tableOfContents = decorateRenderedTree(
    rendered.tree,
    prepared.source,
    prepared.imports,
    rendered.headings,
    Boolean(chapter.number),
  );

  return {
    content: toHtml(rendered.tree),
    tableOfContents,
  };
}

export function getPublicMarkdownSource(source: string): string {
  const marker = "\n---\n";
  const markerIndex =
    projectMarkdownComments(source).masked.lastIndexOf(marker);

  // Content after the final standalone marker is author-only notes.
  return markerIndex === -1
    ? source
    : `${source.slice(0, markerIndex).trimEnd()}\n`;
}

function readMarkdownImport(importPath: string): string {
  if (path.isAbsolute(importPath) || !importPath.endsWith(".html")) {
    throw new Error(`Invalid Markdown import path: ${importPath}`);
  }

  const root = process.cwd();
  const resolvedPath = path.resolve(root, importPath);

  if (!resolvedPath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Markdown import escapes project root: ${importPath}`);
  }

  return readFileSync(resolvedPath, "utf8")
    .trim()
    .replace(/\n[ \t]*\n/g, "\n");
}

export function resolveTrustedHtmlImports(source: string): string {
  return source.replace(
    /^\{\{\s*import\s+"([^"]+)"\s*\}\}$/gm,
    (_match, importPath: string) => readMarkdownImport(importPath),
  );
}

type MarkdownImport = {
  html: string;
  token: string;
};

function prepareMarkdownImports(source: string): {
  source: string;
  imports: MarkdownImport[];
} {
  const imports: MarkdownImport[] = [];
  const commentRanges = projectMarkdownComments(source).ranges;
  const preparedSource = source.replace(
    /^\{\{\s*import\s+"([^"]+)"\s*\}\}$/gm,
    (match, importPath: string, offset: number) => {
      if (
        commentRanges.some((range) => offset >= range.from && offset < range.to)
      ) {
        return match;
      }

      const token = `SCHOLARMARKINCLUDE${imports.length}PLACEHOLDER`;
      if (source.includes(token)) {
        throw new Error(
          `Reserved Markdown import token appears in source: ${token}`,
        );
      }
      imports.push({ html: readMarkdownImport(importPath), token });
      return token;
    },
  );

  return { source: preparedSource, imports };
}

function prefixHeadingNumbers(
  headingNumbers: Readonly<Record<number, string>>,
  chapterNumber: string,
): Record<number, string> {
  return Object.fromEntries(
    Object.entries(headingNumbers).map(([offset, number]) => [
      offset,
      chapterNumber ? `${chapterNumber}.${number}` : "",
    ]),
  );
}

function throwOnMarkdownErrors(
  source: string,
  diagnostics: readonly Diagnostic[],
): void {
  const errors = diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  );
  if (errors.length === 0) {
    return;
  }

  const messages = errors.map((diagnostic) => {
    const line = source.slice(0, diagnostic.from).split("\n").length;
    return diagnostic.message === "Comment block is not closed"
      ? `Unclosed Markdown comment block starting at line ${line}`
      : `Markdown error at line ${line}: ${diagnostic.message}`;
  });
  throw new Error(messages.join("\n"));
}

function decorateRenderedTree(
  tree: HastRoot,
  source: string,
  imports: readonly MarkdownImport[],
  headings: readonly RenderedHeading[],
  numbered: boolean,
): TableOfContentsItem[] {
  const importsByToken = new Map(imports.map((item) => [item.token, item]));
  const headingById = new Map(headings.map((heading) => [heading.id, heading]));
  const paragraphCounts = new Map<string, number>();

  decorateChildren(tree, source, importsByToken, paragraphCounts, numbered);

  return collectTableOfContents(tree, headingById);
}

function decorateChildren(
  parent: HastParent,
  source: string,
  importsByToken: ReadonlyMap<string, MarkdownImport>,
  paragraphCounts: Map<string, number>,
  numbered: boolean,
): void {
  for (let index = 0; index < parent.children.length; index++) {
    const child = parent.children[index];
    if (!child || child.type !== "element") {
      continue;
    }

    const importToken =
      child.tagName === "p" ? plainText(child).trim() : undefined;
    const markdownImport = importToken
      ? importsByToken.get(importToken)
      : undefined;
    if (markdownImport) {
      const imported = fromHtml(markdownImport.html, { fragment: true });
      parent.children.splice(index, 1, ...imported.children);
      index += imported.children.length - 1;
      continue;
    }

    decorateElement(child, parent, source, paragraphCounts, numbered);
    decorateChildren(child, source, importsByToken, paragraphCounts, numbered);
  }
}

function decorateElement(
  element: HastElement,
  parent: HastParent,
  source: string,
  paragraphCounts: Map<string, number>,
  numbered: boolean,
): void {
  if (element.tagName === "p") {
    decorateParagraph(element, source, paragraphCounts);
  }

  if (/^h[1-3]$/.test(element.tagName)) {
    decorateHeading(element, numbered);
  }

  if (element.tagName === "a") {
    decorateLink(element);
  }

  if (element.tagName === "code" && isElement(parent, "pre")) {
    decorateCode(element);
  }
}

function decorateParagraph(
  paragraph: HastElement,
  source: string,
  paragraphCounts: Map<string, number>,
): void {
  const from = numericProperty(paragraph, "dataSourceFrom");
  const to = numericProperty(paragraph, "dataSourceTo");
  const authored =
    from === undefined || to === undefined
      ? plainText(paragraph)
      : source.slice(from, to);
  const baseId = stableParagraphId(authored);
  const count = (paragraphCounts.get(baseId) || 0) + 1;
  paragraphCounts.set(baseId, count);
  const paragraphId = count === 1 ? baseId : `${baseId}-${count}`;

  paragraph.properties.id = paragraphId;
  paragraph.properties.dataCommentTarget = paragraphId;
  paragraph.children.push(feedbackActions(paragraphId));
}

function feedbackActions(paragraphId: string): HastElement {
  return {
    type: "element",
    tagName: "span",
    properties: { className: ["paragraph-feedback-actions"] },
    children: [
      {
        type: "element",
        tagName: "button",
        properties: {
          ariaLabel: "Comment on this paragraph",
          className: ["paragraph-comment-button"],
          dataCommentButton: paragraphId,
          title: "Comment",
          type: "button",
        },
        children: [
          {
            type: "element",
            tagName: "svg",
            properties: {
              ariaHidden: "true",
              viewBox: "0 0 24 24",
            },
            children: [
              {
                type: "element",
                tagName: "path",
                properties: { d: "M5 5.5h14v9H9l-4 4v-13Z" },
                children: [],
              },
            ],
          },
          {
            type: "element",
            tagName: "span",
            properties: { className: ["visually-hidden"] },
            children: [{ type: "text", value: "Comment on this paragraph" }],
          },
        ],
      },
    ],
  };
}

function decorateHeading(heading: HastElement, numbered: boolean): void {
  const title = headingText(heading);
  const id =
    typeof heading.properties.id === "string"
      ? heading.properties.id
      : slugify(title);
  heading.properties.id = id;

  if (!numbered) {
    heading.children = heading.children.filter(
      (child) => !hasClass(child, "section-number"),
    );
  }

  heading.children.push({
    type: "element",
    tagName: "a",
    properties: {
      ariaLabel: `Link to ${title}`,
      className: ["heading-anchor"],
      href: `#${id}`,
    },
    children: [{ type: "text", value: "#" }],
  });
}

function decorateLink(link: HastElement): void {
  const href = link.properties.href;
  if (typeof href === "string" && /^https?:\/\//.test(href)) {
    link.properties.target = "_blank";
    link.properties.rel = ["noreferrer"];
  }
}

function decorateCode(code: HastElement): void {
  const classes = Array.isArray(code.properties.className)
    ? code.properties.className.map(String)
    : [];
  const languageClass = classes.find((className) =>
    className.startsWith("language-"),
  );
  const language = languageClass?.slice("language-".length);
  code.properties.className = ["hljs", ...classes];

  if (!language || !highlight.getLanguage(language)) {
    return;
  }

  const highlighted = highlight.highlight(plainText(code), { language }).value;
  code.children = fromHtml(highlighted, { fragment: true })
    .children as HastElementContent[];
}

function collectTableOfContents(
  tree: HastRoot,
  headingById: ReadonlyMap<string, RenderedHeading>,
): TableOfContentsItem[] {
  const items: TableOfContentsItem[] = [];
  walk(tree, (element) => {
    if (!/^h[1-3]$/.test(element.tagName)) {
      return;
    }

    const id = String(element.properties.id || "");
    const renderedHeading = headingById.get(id);
    const title = renderedHeading?.title || headingText(element);
    items.push({
      level: Number(element.tagName.slice(1)),
      slug: id,
      text: renderedHeading?.number
        ? `${renderedHeading.number} ${title}`
        : title,
    });
  });
  return items;
}

function walk(
  parent: HastParent,
  visitor: (element: HastElement) => void,
): void {
  for (const child of parent.children) {
    if (child.type !== "element") {
      continue;
    }
    visitor(child);
    walk(child, visitor);
  }
}

function headingText(heading: HastElement): string {
  return heading.children
    .filter(
      (child) =>
        !hasClass(child, "section-number") &&
        !hasClass(child, "heading-anchor"),
    )
    .map(plainText)
    .join("")
    .trim();
}

function plainText(node: HastRootContent): string {
  if (node.type === "text") {
    return node.value;
  }
  return "children" in node ? node.children.map(plainText).join("") : "";
}

function hasClass(node: HastRootContent, className: string): boolean {
  return (
    node.type === "element" &&
    Array.isArray(node.properties.className) &&
    node.properties.className.map(String).includes(className)
  );
}

function isElement(parent: HastParent, tagName: string): parent is HastElement {
  return "tagName" in parent && parent.tagName === tagName;
}

function numericProperty(
  element: HastElement,
  property: string,
): number | undefined {
  const value = element.properties[property];
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}
