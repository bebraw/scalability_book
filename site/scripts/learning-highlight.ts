import { highlightMarkdown } from "./learning-diary.ts";
import {
  readingSelection,
  type ReadingSelection,
} from "./learning-selection.ts";

function openLecturePicker() {
  const action = "scalableweb-course-diary-add-highlight";
  // The desktop Web viewer observes same-document navigation. Restore the
  // reading URL without scrolling or adding a Back entry.
  const reading = location.href;
  const state = history.state;
  history.replaceState(state, "", "#" + action);
  history.replaceState(state, "", reading);

  // Standalone browsers hand the same action to the desktop app.
  const link = document.createElement("a");
  link.href = "obsidian://" + action;
  link.click();
}

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
  const add = document.createElement("button");
  add.type = "button";
  add.textContent = "Add book highlight";
  const copy = document.createElement("button");
  copy.type = "button";
  copy.textContent = "Copy highlight";
  const manualCopy = document.createElement("textarea");
  manualCopy.setAttribute("aria-label", "Highlight with book source");
  manualCopy.readOnly = true;
  manualCopy.hidden = true;
  const status = document.createElement("span");
  status.setAttribute("role", "status");
  bar.append(add, copy, status, manualCopy);
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
    manualCopy.hidden = true;
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
      add.focus();
    }
    if (!bar.hidden && event.key === "Escape") {
      window.getSelection()?.removeAllRanges();
      bar.hidden = true;
      selected = null;
    }
  });
  // Pointer interaction must not clear the original selection before click.
  bar.addEventListener("mousedown", (event) => {
    if (event.target instanceof HTMLButtonElement) event.preventDefault();
  });
  bar.addEventListener("focusout", () => setTimeout(update, 0));
  let copying = false;
  async function copySelection(openDiary: boolean) {
    if (!selected || copying) return;
    copying = true;
    const markdown = highlightMarkdown(selected);
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      status.textContent =
        "Copy the selected Markdown below and paste it into your lecture note.";
      manualCopy.value = markdown;
      manualCopy.hidden = false;
      manualCopy.focus();
      manualCopy.select();
      return;
    } finally {
      copying = false;
    }
    manualCopy.hidden = true;
    if (openDiary) {
      status.textContent =
        "Choose a lecture in Obsidian, or paste the copied highlight into your note. ";
      const setup = document.createElement("a");
      setup.href = "/diary/#use-the-optional-course-plugin";
      setup.textContent = "Set up Course diary";
      status.append(setup);
      openLecturePicker();
    } else {
      status.textContent = "Copied for your diary.";
    }
  }
  add.addEventListener("click", () => copySelection(true));
  copy.addEventListener("click", () => copySelection(false));
}
