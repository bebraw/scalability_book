import type { NotebookHandoff } from "../../shared/learning-workspace.ts";
import type { ReadingSelection } from "./learning-selection.ts";

export const legacyRecovery =
  location.pathname === "/notebook/setup/" &&
  new URLSearchParams(location.search).get("legacy") === "1";

function sourceLink(path: string, anchor: string) {
  const url = new URL(
    new URL(path, location.href).pathname,
    "https://scalableweb.dev",
  );
  url.hash = anchor;
  return `[Book source](${url.href.replaceAll("(", "%28").replaceAll(")", "%29")})`;
}

/** Preserve book text literally when a vault renders the quote as Markdown. */
function quote(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => "> " + line.replace(/[\\`*_{}\[\]()<>#+.!|~=$-]/g, "\\$&"))
    .join("\n");
}

export function highlightMarkdown(selection: ReadingSelection) {
  return `${quote(selection.text)}\n\n${sourceLink(location.href, selection.anchor)}\n`;
}

export function downloadMarkdown(title: string, markdown: string) {
  const url = URL.createObjectURL(
    new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download =
    (title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 90) || "diary") + ".md";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadTakeaway(draft: NotebookHandoff) {
  const parts = [`# ${draft.title}`, draft.body];
  if (draft.source.excerpt) parts.push(quote(draft.source.excerpt));
  parts.push(sourceLink(draft.source.url, draft.source.anchor));
  if (draft.assistance) parts.push(`Assistance: ${draft.assistance}`);
  downloadMarkdown(draft.title, parts.join("\n\n") + "\n");
}
