export interface ReadingSelection {
  text: string;
  anchor: string;
}

/** Only explicit selections inside the reading surface become passage context. */
export function readingSelection(): ReadingSelection | null {
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
    "button, input, select, textarea, script, style, .paragraph-feedback-actions, [data-paragraph-feedback-panel]",
  ))
    control.remove();
  const text = (fragment.textContent ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12_000);
  if (!text) return null;
  const start =
    range.startContainer instanceof Element
      ? range.startContainer
      : range.startContainer.parentElement;
  return {
    text,
    anchor: start?.closest("[data-comment-target], [id]")?.id ?? "",
  };
}
