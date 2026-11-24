import { downloadMarkdown, highlightMarkdown } from "./learning-diary.ts";
import {
  readingSelection,
  type ReadingSelection,
} from "./learning-selection.ts";

/** Only a selection in published reading material can become a diary highlight. */
export function mountHighlightCapture() {
  const prose = document.querySelector(
    "main article.prose, #content article.prose",
  );
  if (!prose) return;
  const bar = document.createElement("div");
  bar.className = "diary-highlight-actions";
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", "Selected book passage");
  bar.hidden = true;
  const copy = document.createElement("button");
  copy.type = "button";
  copy.textContent = "Copy highlight";
  const download = document.createElement("button");
  download.type = "button";
  download.textContent = "Download Markdown";
  const status = document.createElement("span");
  status.setAttribute("role", "status");
  bar.append(copy, download, status);
  document.body.append(bar);
  let selected: ReadingSelection | null = null;
  function update() {
    if (bar.contains(document.activeElement)) return;
    const range = window.getSelection();
    const published = (node: Node | null | undefined) => {
      const element = node instanceof Element ? node : node?.parentElement;
      return (
        element &&
        prose?.contains(element) &&
        !element.closest(
          "button, input, select, textarea, form, [data-demo-anchor], .paragraph-feedback-actions, [data-paragraph-feedback-panel], .reading-investigation",
        )
      );
    };
    selected =
      published(range?.anchorNode) && published(range?.focusNode)
        ? readingSelection("diary")
        : null;
    bar.hidden = !selected;
    status.textContent = "";
  }
  document.addEventListener("selectionchange", update);
  document.addEventListener("keydown", (event) => {
    if (
      !bar.hidden &&
      event.key === "Tab" &&
      !event.shiftKey &&
      !bar.contains(document.activeElement)
    ) {
      event.preventDefault();
      copy.focus();
    }
    if (!bar.hidden && event.key === "Escape") {
      window.getSelection()?.removeAllRanges();
      bar.hidden = true;
      selected = null;
    }
  });
  // Pointer interaction must not clear the original selection before click.
  bar.addEventListener("mousedown", (event) => event.preventDefault());
  bar.addEventListener("focusout", () => setTimeout(update, 0));
  copy.addEventListener("click", async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(highlightMarkdown(selected));
      status.textContent = "Copied for your diary.";
    } catch {
      status.textContent =
        "Clipboard unavailable. Download the Markdown instead.";
    }
  });
  download.addEventListener("click", () => {
    if (selected)
      downloadMarkdown("Book highlight", highlightMarkdown(selected));
  });
}
