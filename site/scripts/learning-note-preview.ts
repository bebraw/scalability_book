import {
  sourceLink,
  type LearningSource,
} from "../../shared/learning-workspace.ts";
import type { NotebookDraftPreview } from "./learning-session.ts";

interface Options {
  read: () => NotebookDraftPreview | null;
  changed: (preview: NotebookDraftPreview) => void;
  accept: (
    body: string,
    provenance: string,
    source: LearningSource,
    relatedIds: string[],
  ) => void;
}

let identity = 0;
const element = <K extends keyof HTMLElementTagNameMap>(tag: K, text = "") => {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
};

export function buildNotebookDraft(preview: NotebookDraftPreview) {
  const parts: string[] = [];
  const messages: string[] = [];
  if (
    preview.studentId &&
    preview.includeStudent &&
    preview.studentText.trim()
  ) {
    parts.push(`Your question or response:\n\n${preview.studentText}`);
    messages.push(`student message ${preview.studentId}`);
  }
  if (preview.includeReply && preview.replyText.trim()) {
    parts.push(`Teaching assistant suggestion:\n\n${preview.replyText}`);
    messages.push(`assistant message ${preview.replyId}`);
  }
  const prefix = `Reviewed discussion draft; conversation ${preview.conversationId}; ${messages.join("; ")}; reply context ${preview.replyId}`;
  const suffix = "; selected and reviewed by student before saving";
  const complete = prefix + preview.teaching + suffix;
  const metadataShortened = complete.length > 2000;
  const marker =
    "; teaching metadata shortened; see the original reply for full metadata";
  const assistance = metadataShortened
    ? prefix +
      preview.teaching.slice(
        0,
        2000 - prefix.length - suffix.length - marker.length,
      ) +
      marker +
      suffix
    : complete;
  return { body: parts.join("\n\n"), assistance, metadataShortened };
}

/** One selected exchange is a tab draft; Notebook owns replacement and saving. */
export function mountLearningNotePreview(
  container: HTMLElement,
  options: Options,
) {
  const region = element("section");
  region.className = "learning-context learning-note-preview";
  region.setAttribute("aria-label", "Diary exchange preview");
  container.append(region);
  const prefix = `learning-note-preview-${++identity}`;

  function render(focus = false) {
    const preview = options.read();
    region.hidden = !preview?.open;
    region.replaceChildren();
    if (!preview?.open) return;
    const heading = element("h3", "Diary exchange preview");
    heading.tabIndex = -1;
    const source = element("a", preview.source.title);
    source.href = sourceLink(preview.source);
    region.append(
      heading,
      element(
        "p",
        "Edit the parts of this exchange you want to take into your diary. The Markdown download includes the speaker labels, book source and assistance record.",
      ),
      source,
    );
    const count = element("p");
    count.className = "learning-hint";
    count.id = `${prefix}-count`;
    count.setAttribute("role", "status");
    const prepare = element("button", "Download Markdown");
    prepare.type = "button";
    prepare.setAttribute("aria-describedby", count.id);
    const update = () => {
      const draft = buildNotebookDraft(preview);
      const length = draft.body.length;
      const over = length > 16_000;
      count.textContent = `${length.toLocaleString("en-US")} of 16,000 characters, including speaker labels.${over ? " Shorten the text or omit a part before preparing the draft; nothing will be cut off automatically." : length ? " Ready to download." : " Include some writing to prepare a draft."}`;
      if (draft.metadataShortened)
        count.textContent +=
          " Reply metadata is too long for the note history; it will be marked as shortened, with message identities retained. Full metadata stays with the original reply.";
      prepare.disabled = over || !length;
      options.changed(preview);
    };
    function part(
      kind: "student" | "reply",
      includeLabel: string,
      textLabel: string,
    ) {
      const includeKey = kind === "student" ? "includeStudent" : "includeReply";
      const textKey = kind === "student" ? "studentText" : "replyText";
      const group = element("div");
      const include = element("input");
      include.type = "checkbox";
      include.checked = preview![includeKey];
      const selection = element("label");
      selection.className = "learning-checkbox";
      selection.append(include, element("span", includeLabel));
      const label = element("label", textLabel);
      const input = element("textarea");
      input.id = `${prefix}-${kind}`;
      label.htmlFor = input.id;
      input.rows = kind === "student" ? 3 : 6;
      input.maxLength = 32_000;
      input.value = preview![textKey];
      input.disabled = !include.checked;
      input.addEventListener("input", () => {
        preview![textKey] = input.value;
        update();
      });
      include.addEventListener("change", () => {
        preview![includeKey] = include.checked;
        input.disabled = !include.checked;
        update();
      });
      group.append(selection, label, input);
      region.append(group);
    }
    if (preview.studentId)
      part("student", "Include your thinking", "Your question or response");
    part(
      "reply",
      "Include assistant suggestion",
      "Assistant suggestion to review",
    );
    prepare.addEventListener("click", () => {
      const draft = buildNotebookDraft(preview);
      const text = draft.body;
      if (!text || text.length > 16_000) return;
      options.accept(text, draft.assistance, structuredClone(preview.source), [
        ...preview.relatedIds,
      ]);
    });
    const close = element("button", "Close draft preview");
    close.type = "button";
    close.addEventListener("click", () => {
      preview.open = false;
      options.changed(preview);
      render();
      const trigger = container.parentElement?.querySelector<HTMLButtonElement>(
        `[data-learning-notebook-reply="${CSS.escape(preview.replyId)}"]`,
      );
      (trigger ?? container.parentElement?.querySelector("textarea"))?.focus();
    });
    const actions = element("div");
    actions.className = "learning-assistant-actions";
    actions.append(prepare, close);
    region.append(count, actions);
    update();
    if (focus) {
      heading.focus();
      heading.scrollIntoView({ block: "nearest" });
    }
  }

  render();
  return {
    open(snapshot: NotebookDraftPreview) {
      const current = options.read();
      if (
        current &&
        current.conversationId === snapshot.conversationId &&
        current.replyId === snapshot.replyId
      ) {
        current.open = true;
        options.changed(current);
      } else {
        if (
          current &&
          !window.confirm(
            "Replace this draft preview? Choose Cancel to keep your edits.",
          )
        )
          return;
        options.changed(structuredClone(snapshot));
      }
      render(true);
    },
  };
}
