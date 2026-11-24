export interface ReadingSelection {
  text: string;
  anchor: string;
}

/** Only explicit selections inside the reading surface become passage context. */
export function readingSelection(
  purpose: "assistant" | "diary" = "assistant",
): ReadingSelection | null {
  const selection = window.getSelection();
  const reading = document.querySelector("main, #content");
  if (!selection?.rangeCount || selection.isCollapsed || !reading) return null;
  const range = selection.getRangeAt(0);
  if (
    !reading.contains(range.startContainer) ||
    !reading.contains(range.endContainer)
  )
    return null;
  const fragment = range.cloneContents();
  for (const control of fragment.querySelectorAll(
    "button, input, select, textarea, form, script, style, .paragraph-feedback-actions, [data-paragraph-feedback-panel], .reading-investigation, [data-demo-anchor]",
  ))
    control.remove();
  const start =
    range.startContainer instanceof Element
      ? range.startContainer
      : range.startContainer.parentElement;
  // The agent accepts a bounded, normalized excerpt. A file belongs to the
  // reader and preserves paragraphs, code indentation and the entire selection.
  for (const block of fragment.querySelectorAll(
    "p, li, pre, h1, h2, h3, h4, br",
  ))
    block.after(
      document.createTextNode(block.tagName === "BR" ? "\n" : "\n\n"),
    );
  const raw = fragment.textContent ?? "";
  const text =
    purpose === "assistant"
      ? raw.replace(/\s+/g, " ").trim().slice(0, 12_000)
      : start?.closest("pre")
        ? raw
        : raw.trim();
  if (!text.trim()) return null;
  let anchor = start?.closest("[data-comment-target], [id]")?.id ?? "";
  const article = start?.closest("article.prose");
  if (
    article &&
    start &&
    (!anchor || anchor === reading.id || anchor === "content")
  ) {
    const headings = [
      ...article.querySelectorAll<HTMLElement>(
        "h1[id], h2[id], h3[id], h4[id]",
      ),
    ];
    anchor =
      headings
        .reverse()
        .find(
          (heading) =>
            heading === start ||
            Boolean(
              heading.compareDocumentPosition(start) &
              Node.DOCUMENT_POSITION_FOLLOWING,
            ),
        )?.id ?? "";
  }
  return { text, anchor };
}
