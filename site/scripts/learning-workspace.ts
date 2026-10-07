import { LearningClient, LearningConnectionError } from "./learning-client.ts";
import { mountLearningAssistant } from "./learning-assistant.ts";
import { mountLearningNavigation } from "./learning-navigation.ts";
import { currentReading, pageSource, textOf } from "./learning-context.ts";
import {
  readingSelection,
  type ReadingSelection,
} from "./learning-selection.ts";
import {
  readNotebookSession,
  saveNotebookSession,
  type NotebookEditor,
  type NotebookView,
  type AssistantSection,
  experienceForView,
} from "./learning-session.ts";
import type { CompanionStatus } from "../../shared/learning-connection.ts";
import { prepareLearningHelp } from "./learning-agent-ui.ts";
export {
  observeLearningDemo,
  changeLearningDemo,
  availableLearningDemos,
} from "./learning-demos.ts";
import { concepts } from "../../shared/concepts.ts";
import {
  sourceLink,
  reflectionPrompts,
  reflectionExamples,
  suggestedReflectionCharacters,
  type NotebookEntry,
  type ConceptJudgment,
  type NoteKind,
  type LearningExperience,
  type AssistantHandoff,
  type NotebookHandoff,
} from "../../shared/learning-workspace.ts";

const client = new LearningClient();
const panel = document.createElement("dialog");
panel.className = "learning-workspace";
panel.hidden = true;
panel.setAttribute("aria-label", "My learning notebook");
panel.innerHTML = `<div class="learning-chrome"><div class="learning-heading"><div><p class="learning-eyebrow">My learning notebook</p><h2></h2><p class="learning-purpose"></p></div><button type="button" data-learning-close aria-label="Close notebook">×</button></div><nav class="learning-experiences" aria-label="Learning experiences"></nav>
  <nav class="learning-tabs" aria-label="Notebook sections"></nav><p class="learning-status" role="status" aria-live="polite"></p><div class="learning-selection" hidden><p></p><button type="button" data-learning-selection>Use selected text</button></div></div><div class="learning-body"></div>`;
panel.querySelector("h2")!.textContent = currentReading().title;
document.body.append(panel);
const container = panel.querySelector<HTMLDivElement>(".learning-body")!;
const status = panel.querySelector<HTMLElement>(".learning-status")!;
const restored = readNotebookSession();
let view: NotebookView = restored.view;
let experience: LearningExperience = restored.experience;
let notebookView = restored.notebookView;
let assistantView = restored.assistantView;
let assistant = restored.assistant;
let companionStatus: CompanionStatus | null = null;
let connected = false;
let entries: NotebookEntry[] = [];
let judgments: ConceptJudgment[] = [];
const selected = new Set<string>(restored.selected);
let draft = restored.preparation;
let acceptedAssistance: string | null = restored.assistance;
let editor: NotebookEditor = restored.editor ?? {
  id: "",
  expected: "",
  kind: "scratch" as NoteKind,
  title: "",
  body: "",
  relatedIds: [] as string[],
  source: pageSource(),
};

function persist() {
  saveNotebookSession({
    open: !panel.hidden,
    view,
    experience,
    notebookView,
    assistantView,
    assistant,
    editor,
    assistance: acceptedAssistance,
    preparation: draft,
    selected: [...selected],
  });
}
container.addEventListener("input", persist);
container.addEventListener("change", persist);
window.addEventListener("pagehide", persist);
function editorDirty() {
  if (!editor.id) return Boolean(editor.body.trim() || editor.title.trim());
  const saved = entries.find((entry) => entry.id === editor.id);
  return (
    !saved ||
    saved.body !== editor.body ||
    saved.title !== editor.title ||
    saved.kind !== editor.kind
  );
}
function readingSource() {
  return new URL(editor.source.url).pathname === location.pathname
    ? editor.source
    : pageSource();
}
function beginNote(
  source = pageSource(),
  kind: NoteKind = "scratch",
  title = "",
  relatedIds: string[] = [],
) {
  if (
    editorDirty() &&
    !window.confirm(
      "Replace this unfinished note? Choose Cancel to keep writing it.",
    )
  )
    return false;
  acceptedAssistance = null;
  status.textContent = "";
  editor = {
    id: "",
    expected: "",
    kind,
    title,
    body: "",
    relatedIds,
    source,
  };
  navigate("write");
  return true;
}
function writeHandoff(value: NotebookHandoff) {
  if (!beginNote(value.source, value.kind, value.title, value.relatedIds))
    return;
  editor.body = value.body;
  acceptedAssistance = value.assistance;
  render();
  status.textContent = value.assistance
    ? "Write your own takeaway or review this suggestion. Choose Save note when it represents your thinking."
    : "This is your private draft. Review and write what you want to keep, then choose Save note.";
}
function discussHandoff(value: AssistantHandoff) {
  if (
    assistant?.question.trim() &&
    !window.confirm(
      "Replace your unfinished assistant message? Choose Cancel to keep it.",
    )
  )
    return;
  status.textContent = "";
  assistant = prepareLearningHelp(
    value.source,
    value.question,
    assistant?.browserId,
  );
  selected.clear();
  value.noteIds.forEach((id) => selected.add(id));
  navigate("agent");
}
let selectedReading: ReadingSelection | null = null;
let pendingSelection: ReadingSelection | null = null;
const selectionBar = panel.querySelector<HTMLDivElement>(
  ".learning-selection",
)!;
const selectionButton = panel.querySelector<HTMLButtonElement>(
  "[data-learning-selection]",
)!;
function updateSelection() {
  selectedReading = readingSelection();
  selectionBar.hidden = !connected || !selectedReading;
  if (selectedReading)
    selectionBar.querySelector("p")!.textContent =
      `Selected in the reading: ${selectedReading.text.slice(0, 100)}${selectedReading.text.length > 100 ? "…" : ""}`;
}
selectionButton.addEventListener("pointerdown", () => {
  pendingSelection = selectedReading;
});
selectionButton.addEventListener("click", () => {
  const selection = pendingSelection ?? selectedReading;
  pendingSelection = null;
  if (selection) {
    if (experience === "assistant")
      discussHandoff({
        source: pageSource(selection),
        question: "",
        noteIds: [...selected],
      });
    else beginNote(pageSource(selection));
    window.getSelection()?.removeAllRanges();
    updateSelection();
  }
});
document.addEventListener("selectionchange", updateSelection);
function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function button(
  label: string,
  action: () => void | Promise<void>,
  className = "",
): HTMLButtonElement {
  const result = node("button", label, className);
  result.type = "button";
  result.addEventListener(
    "click",
    () =>
      void (async () => {
        result.disabled = true;
        try {
          await run(action);
        } finally {
          result.disabled = false;
        }
      })(),
  );
  return result;
}
async function run(action: () => void | Promise<void>) {
  try {
    await action();
  } catch (error) {
    status.textContent =
      error instanceof Error ? error.message : "The learning action failed.";
    if (
      error instanceof LearningConnectionError &&
      error.reason !== "pairing"
    ) {
      setConnected(false);
      render();
    }
  }
}
function setConnected(value: boolean) {
  connected = value;
  updateSelection();
}
let fieldNumber = 0;
function field(label: string, input: HTMLElement): HTMLLabelElement {
  const result = node("label");
  if (input instanceof HTMLInputElement && input.type === "checkbox")
    result.className = "learning-checkbox";
  const caption = node("span", label);
  caption.id = `learning-field-${++fieldNumber}`;
  input.setAttribute("aria-labelledby", caption.id);
  result.append(caption, input);
  return result;
}
function link(label: string, href: string) {
  const result = node("a", label);
  result.href = href;
  return result;
}
function download(filename: string, body: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const anchor = link(filename, url);
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function refresh() {
  companionStatus = await client.status();
  const data = await client.request<{
    entries: NotebookEntry[];
    judgments: ConceptJudgment[];
  }>("/notebook");
  entries = data.entries;
  judgments = data.judgments;
  setConnected(true);
}
function navigate(next: NotebookView) {
  const owner = experienceForView(next);
  if (owner) experience = owner;
  if (experience === "notebook" && owner)
    notebookView = next as typeof notebookView;
  if (experience === "assistant" && owner)
    assistantView = next as typeof assistantView;
  view = next;
  render();
  panel.scrollTop = 0;
}
function switchExperience(next: LearningExperience) {
  status.textContent = "";
  experience = next;
  navigate(next === "notebook" ? notebookView : assistantView);
}
function render() {
  if (view === "agent" && !assistant)
    assistant = prepareLearningHelp(pageSource(), "");
  persist();
  mountLearningNavigation(panel, experience, view, navigate, switchExperience);
  selectionButton.textContent =
    experience === "assistant" ? "Discuss selected text" : "Use selected text";
  container.replaceChildren();
  if (!connected && view !== "connect") {
    container.append(
      node(
        "p",
        experience === "notebook"
          ? "Connect your local companion to save and revisit your private notes. Reading the book does not require a connection."
          : "Connect the shared local companion to use the chapter guide and discuss your questions. Enable your chosen provider for assistant replies; notebook writing works without a model.",
      ),
      button(
        "Connect companion",
        () => navigate("connect"),
        "learning-primary",
      ),
    );
    return;
  }
  if (view === "write") renderEditor();
  if (view === "notes") renderNotes();
  if (view === "concepts") renderConcepts();
  if (view === "prepare") renderPreparation();
  if (view === "connect") renderConnection();
  if (experience === "assistant" && view !== "connect") {
    const activeDraft = assistant ?? prepareLearningHelp(pageSource(), "");
    mountLearningAssistant(container, view as AssistantSection, {
      client,
      entries,
      draft: activeDraft,
      source: readingSource,
      selected: () => [...selected],
      active: () =>
        !panel.hidden && view === "agent" && assistant === activeDraft,
      changed: persist,
      write: writeHandoff,
      help: discussHandoff,
      discuss: () => navigate("agent"),
      notes: () => navigate("notes"),
      close,
      status: (text) => {
        status.textContent = text;
      },
      save: async (kind, title, body, source, relatedIds = []) => {
        const entry = await client.request<NotebookEntry>("/entries", "POST", {
          kind,
          title,
          body,
          source,
          relatedIds,
        });
        await refresh();
        return entry;
      },
    });
  }
}
function renderEditor() {
  const context = node("section", undefined, "learning-context");
  context.setAttribute("aria-label", "Note context");
  context.append(
    node(
      "p",
      editor.source.kind === "passage"
        ? "Selected passage from"
        : "Writing about",
      "learning-eyebrow",
    ),
    link(editor.source.title, sourceLink(editor.source)),
  );
  if (editor.source.excerpt) {
    context.append(
      node(
        "blockquote",
        editor.source.excerpt.slice(0, 500) +
          (editor.source.excerpt.length > 500 ? "…" : ""),
      ),
    );
    if (editor.source.excerpt.length > 500)
      context.append(
        node(
          "p",
          "First 500 characters shown. The full captured text is kept with this note.",
          "learning-hint",
        ),
      );
  } else
    context.append(
      node(
        "p",
        "This note keeps the reading link. Select text in the page to attach a particular passage.",
        "learning-hint",
      ),
    );
  if (new URL(editor.source.url).pathname !== location.pathname)
    context.append(
      node(
        "p",
        "This note still belongs to its original reading. The notebook header shows the page you are visiting now.",
        "learning-hint",
      ),
      button("New note for this reading", () => {
        beginNote();
      }),
    );
  container.append(context);
  const kind = node("select");
  for (const [value, label] of [
    ["scratch", "Quick note"],
    ["attempt", "Initial thinking"],
    ["reflection", "Developed reflection"],
    ["revisit", "Revisit an idea"],
  ]) {
    const option = node("option", label);
    option.value = value!;
    kind.append(option);
  }
  kind.value = editor.kind;
  kind.addEventListener("change", () => {
    editor.kind = kind.value as NoteKind;
    render();
  });
  const title = node("input");
  title.value = editor.title;
  title.maxLength = 300;
  title.addEventListener("input", () => {
    editor.title = title.value;
  });
  const body = node("textarea");
  body.rows = 9;
  body.value = editor.body;
  body.maxLength = 16_000;
  body.placeholder =
    "What are you thinking? Capture a question, observation or explanation.";
  const count = node("p", undefined, "learning-hint");
  const updateCount = () => {
    editor.body = body.value;
    count.textContent = `${body.value.length} characters${editor.kind === "reflection" ? ` · Around ${suggestedReflectionCharacters} characters can give a developed reflection room for evidence and explanation. This is a suggestion, not a minimum.` : " · Short notes are welcome."}`;
  };
  body.addEventListener("input", updateCount);
  updateCount();
  container.append(
    field("Kind of note", kind),
    field("Title", title),
    field("Your thinking", body),
    count,
  );
  if (editor.kind === "reflection" || editor.kind === "revisit") {
    container.append(
      node(
        "p",
        "There is no single correct conclusion. Confusion, a failed experiment, or an unchanged opinion can be worth recording. Give enough detail to understand your thinking later.",
        "learning-hint",
      ),
    );
    const prompts = node("ul");
    for (const prompt of reflectionPrompts) prompts.append(node("li", prompt));
    container.append(prompts);
    const examples = node("details");
    examples.append(node("summary", "Examples of reflection"));
    for (const example of reflectionExamples)
      examples.append(node("h3", example.title), node("p", example.text));
    container.append(examples);
  }
  if (editor.kind === "revisit") {
    container.prepend(
      node(
        "p",
        "Before rereading, explain the idea from memory and describe a different situation where it might apply. After saving, compare with your earlier note.",
      ),
    );
    for (const id of editor.relatedIds) {
      const previous = entries.find((entry) => entry.id === id);
      if (previous) {
        const disclosure = node("details");
        disclosure.append(
          node("summary", "Read my earlier explanation"),
          node("p", previous.body),
        );
        container.append(disclosure);
      }
    }
  }
  container.append(
    button(
      "Save note",
      async () => {
        const { id, expected, ...value } = editor;
        const saved = await client.request<NotebookEntry>(
          id ? `/entries/${id}` : "/entries",
          id ? "PUT" : "POST",
          {
            ...value,
            title: editor.title.trim() || editor.source.title,
            assistance: acceptedAssistance,
            ...(id ? { expected } : {}),
          },
        );
        editor = {
          id: saved.id,
          expected: saved.revision,
          kind: saved.kind,
          title: saved.title,
          body: saved.body,
          relatedIds: saved.relatedIds,
          source: saved.source,
        };
        await refresh();
        status.textContent = "Saved in your private notebook.";
        render();
        document.dispatchEvent(
          new CustomEvent("book-learning-attempt", {
            detail: { source: saved.source, id: saved.id, kind: saved.kind },
          }),
        );
      },
      "learning-primary",
    ),
  );
  container.append(
    button("New note", () => {
      beginNote();
    }),
  );
}
let notesScope = "page";
function renderNotes() {
  container.append(
    node(
      "p",
      "Your notes belong to you. Select material to prepare a submission, or return to an earlier idea.",
      "learning-hint",
    ),
  );
  const scope = node("select");
  for (const [value, label] of [
    ["page", currentReading().isChapter ? "This chapter" : "This page"],
    ["all", "Whole notebook"],
  ]) {
    const option = node("option", label);
    option.value = value!;
    scope.append(option);
  }
  scope.value = notesScope;
  scope.addEventListener("change", () => {
    notesScope = scope.value;
    render();
  });
  container.append(field("Notes to show", scope));
  const shown =
    notesScope === "all"
      ? entries
      : entries.filter(
          (entry) => new URL(entry.source.url).pathname === location.pathname,
        );
  if (!shown.length)
    container.append(
      node(
        "p",
        "No notes in this view yet. Write a question or observation, or choose Whole notebook to see your other reading.",
      ),
    );
  for (const entry of shown) {
    const card = node("article", undefined, "learning-note");
    const select = node("input");
    select.type = "checkbox";
    select.checked = selected.has(entry.id);
    select.addEventListener("change", () => {
      if (select.checked) selected.add(entry.id);
      else selected.delete(entry.id);
    });
    card.append(
      field(`Select ${entry.title}`, select),
      node("h3", entry.title),
      node(
        "p",
        `${entry.kind} · ${new Date(entry.updatedAt).toLocaleDateString()}`,
        "learning-hint",
      ),
    );
    const content = node("details");
    content.append(node("summary", "Read note"), node("p", entry.body));
    const history = node("details");
    history.append(
      node(
        "summary",
        `${entry.history.length} saved revision${entry.history.length === 1 ? "" : "s"}`,
      ),
    );
    for (const revision of entry.history)
      history.append(
        node(
          "p",
          `${new Date(revision.at).toLocaleString()}: ${revision.body}`,
        ),
        ...(revision.assistance ? [node("small", revision.assistance)] : []),
      );
    card.append(content, history, link("Source", sourceLink(entry.source)));
    if (
      entry.source.excerpt &&
      new URL(entry.source.url).pathname === location.pathname
    ) {
      const target = entry.source.anchor
        ? document.getElementById(entry.source.anchor)
        : document.querySelector("main .prose, main, #content");
      const matches = target && textOf(target).includes(entry.source.excerpt);
      card.append(
        node(
          "p",
          matches
            ? "Captured text is present on this page."
            : "This source may have changed or moved. Your captured text is retained.",
          "learning-hint",
        ),
      );
    }
    card.append(
      button("Edit", () => {
        acceptedAssistance =
          entry.history[entry.history.length - 1]?.assistance ?? null;
        editor = {
          id: entry.id,
          expected: entry.revision,
          kind: entry.kind,
          title: entry.title,
          body: entry.body,
          relatedIds: entry.relatedIds,
          source: entry.source,
        };
        navigate("write");
      }),
    );
    card.append(
      button("Revisit", () => {
        acceptedAssistance = null;
        editor = {
          id: "",
          expected: "",
          kind: "revisit",
          title: `Revisit: ${entry.title}`.slice(0, 300),
          body: "",
          relatedIds: [entry.id],
          source: entry.source,
        };
        navigate("write");
      }),
    );
    card.append(
      button("Discuss this note", () =>
        discussHandoff({
          source: entry.source,
          question: "",
          noteIds: [entry.id],
        }),
      ),
    );
    card.append(
      button("Delete", async () => {
        if (
          !window.confirm(
            `Delete “${entry.title}” and its saved revisions? Export a backup first if you want to retain it.`,
          )
        )
          return;
        await client.request(`/entries/${entry.id}`, "DELETE", {
          expected: entry.revision,
        });
        selected.delete(entry.id);
        await refresh();
        render();
      }),
    );
    container.append(card);
  }
  container.append(
    button("Discuss selected notes", () => {
      const chosen = entries.find((entry) => selected.has(entry.id));
      if (!chosen) {
        status.textContent = "Select the notes you want to discuss first.";
        return;
      }
      discussHandoff({
        source: chosen.source,
        question: "",
        noteIds: [...selected],
      });
    }),
    button(
      "Prepare selected notes",
      () => navigate("prepare"),
      "learning-primary",
    ),
  );
}
function renderConcepts() {
  container.append(
    node(
      "p",
      "These are your revisable judgments. They do not certify mastery or affect grades.",
      "learning-hint",
    ),
  );
  const select = node("select");
  const related = pageSource().conceptIds;
  for (const concept of [...concepts].sort(
    (a, b) => Number(related.includes(b.id)) - Number(related.includes(a.id)),
  )) {
    const option = node("option", concept.title);
    option.value = concept.id;
    select.append(option);
  }
  select.value = related[0] ?? concepts[0]!.id;
  const form = node("div");
  container.append(field("Concept", select), form);
  const show = () => {
    form.replaceChildren();
    const prior = judgments.find(
      (judgment) => judgment.conceptId === select.value,
    );
    const studied = node("input");
    studied.type = "checkbox";
    studied.checked = prior?.studied ?? false;
    const understanding = node("select");
    for (const [value, label] of [
      ["unsure", "Unsure"],
      ["can-explain", "Can explain"],
      ["can-apply", "Can apply"],
    ]) {
      const option = node("option", label);
      option.value = value!;
      understanding.append(option);
    }
    understanding.value = prior?.understanding ?? "unsure";
    const intention = node("textarea");
    intention.rows = 3;
    intention.maxLength = 2000;
    intention.value = prior?.intention ?? "";
    const evidence = node("div");
    const evidenceIds = new Set(prior?.evidenceIds ?? []);
    for (const entry of entries) {
      const check = node("input");
      check.type = "checkbox";
      check.checked = evidenceIds.has(entry.id);
      check.addEventListener("change", () => {
        if (check.checked) evidenceIds.add(entry.id);
        else evidenceIds.delete(entry.id);
      });
      evidence.append(field(entry.title, check));
    }
    form.append(
      field("Studied", studied),
      field("My current understanding", understanding),
      field("What will I investigate next?", intention),
      node("h3", "Notebook evidence"),
      evidence,
    );
    if (prior)
      form.append(
        node(
          "p",
          `Last revised ${new Date(prior.updatedAt).toLocaleString()}`,
          "learning-hint",
        ),
      );
    form.append(
      button(
        "Save self-assessment",
        async () => {
          await client.request("/judgments", "POST", {
            conceptId: select.value,
            studied: studied.checked,
            understanding: understanding.value,
            intention: intention.value,
            evidenceIds: [...evidenceIds],
            ...(prior ? { expected: prior.revision } : {}),
          });
          await refresh();
          status.textContent = "Saved your dated self-assessment.";
          show();
        },
        "learning-primary",
      ),
    );
  };
  select.addEventListener("change", show);
  show();
}
function renderPreparation() {
  container.append(
    node(
      "p",
      `${selected.size} notes selected. Prepare and revise this material for your existing diary or portfolio. Your other notes remain private.`,
    ),
  );
  const textarea = node("textarea");
  textarea.rows = 14;
  textarea.value = draft;
  textarea.addEventListener("input", () => {
    draft = textarea.value;
  });
  container.append(
    button(
      "Build submission draft",
      async () => {
        const result = await client.request<{ markdown: string }>(
          "/prepare",
          "POST",
          { ids: [...selected] },
        );
        draft = result.markdown;
        render();
      },
      "learning-primary",
    ),
    field("Review and revise your submission material", textarea),
  );
  container.append(
    button("Download Markdown", () =>
      download("learning-submission-draft.md", draft, "text/markdown"),
    ),
    button("Copy draft", async () => {
      await navigator.clipboard.writeText(draft);
      status.textContent =
        "Copied the selected material. Review it in your course submission.";
    }),
    link("Open course workspace", "/course/"),
  );
  container.append(
    node(
      "p",
      "Preparation does not submit or grade anything. Use the existing requirements to decide which material belongs in each submission.",
      "learning-hint",
    ),
  );
}
function renderConnection() {
  container.append(
    node(
      "p",
      connected
        ? "Your private notebook is connected. You can work without a model connection."
        : "Start the learning companion on your computer, then enter the pairing code it prints.",
    ),
  );
  const command = node("pre");
  command.append(node("code", "npx @scalableweb/companion@0.1.0 start"));
  container.append(
    command,
    link("Companion setup and notebook backups", "/notebook/setup/"),
  );
  if (!connected) {
    const address = node("input");
    address.value = client.base;
    address.type = "url";
    const code = node("input");
    code.type = "password";
    code.autocomplete = "off";
    container.append(
      field("Companion address", address),
      field("Pairing code", code),
      button(
        "Pair companion",
        async () => {
          await client.pair(address.value, code.value);
          code.value = "";
          await refresh();
          status.textContent = "Connected to your private notebook.";
          if (view === "connect")
            navigate(experience === "assistant" ? assistantView : notebookView);
          else render();
        },
        "learning-primary",
      ),
    );
  } else {
    if (companionStatus) {
      container.append(
        node(
          "p",
          `Companion ${companionStatus.release?.version ?? "legacy"}; protocol ${companionStatus.version}; ${companionStatus.provider ? `${companionStatus.provider} enabled` : "notebook-only"}.`,
          "learning-hint",
        ),
      );
      if (companionStatus.teaching)
        container.append(
          node(
            "p",
            `Teaching policy ${companionStatus.teaching.policy.id} v${companionStatus.teaching.policy.version}; ${companionStatus.teaching.provider.name} ${companionStatus.teaching.provider.version ?? "version not reported"}.`,
            "learning-hint",
          ),
        );
      else if (companionStatus.provider) {
        container.append(
          node(
            "p",
            "This installed companion does not report a teaching policy. It keeps its existing instructions.",
            "learning-hint",
          ),
        );
        const setup = node("a", "Companion setup and release availability");
        setup.href = "/notebook/setup/";
        container.append(setup);
      }
      if (companionStatus.storage)
        container.append(
          node(
            "p",
            `Your notebook: ${companionStatus.storage}`,
            "learning-storage-location",
          ),
        );
    }
    container.append(
      button("Check connection", async () => {
        await refresh();
        status.textContent =
          "Connection and protocol are available. Local prerequisite checks are available through doctor in your terminal.";
        render();
      }),
      button("Explore this reading", () => navigate("guide")),
    );
    container.append(
      button("Export notebook backup", async () => {
        const archive = await client.request<unknown>("/export");
        download(
          "learning-notebook.json",
          JSON.stringify(archive, null, 2),
          "application/json",
        );
      }),
    );
    const file = node("input");
    file.type = "file";
    file.accept = "application/json,.json";
    file.addEventListener(
      "change",
      () =>
        void run(async () => {
          const selectedFile = file.files?.[0];
          if (!selectedFile) return;
          if (selectedFile.size > 16_000_000)
            throw new Error("Choose a notebook archive smaller than 16 MB.");
          const result = await client.request<{ added: number }>(
            "/import",
            "POST",
            JSON.parse(await selectedFile.text()),
          );
          await refresh();
          status.textContent = `Imported ${result.added} notes. Existing conflicting records are never replaced.`;
          render();
        }),
    );
    container.append(
      field("Import a portable notebook", file),
      button("Disconnect", async () => {
        await client.disconnect();
        setConnected(false);
        entries = [];
        judgments = [];
        selected.clear();
        status.textContent =
          "Disconnected. Your notebook remains on your computer.";
        render();
      }),
    );
  }
}
function close() {
  if (typeof panel.close === "function") panel.close();
  else panel.removeAttribute("open");
  panel.hidden = true;
  document.body.dataset.learningOpen = "false";
  persist();
}
panel.querySelector("[data-learning-close]")!.addEventListener("click", close);
panel.addEventListener("keydown", (event) => {
  if (event.key === "Escape") close();
});
document.addEventListener(
  "book-learning-open",
  (event) =>
    void run(async () => {
      const detail = (
        event as CustomEvent<{
          selection: ReadingSelection | null;
          resume: boolean;
          experience: LearningExperience;
        }>
      ).detail;
      if (!detail.resume) {
        if (experience !== detail.experience) status.textContent = "";
        experience = detail.experience;
        view = experience === "assistant" ? assistantView : notebookView;
      }
      panel.hidden = false;
      document.body.dataset.learningOpen = "true";
      if (!panel.hasAttribute("open")) {
        if (typeof panel.show === "function") panel.show();
        else panel.setAttribute("open", "");
      }
      if (client.token && !connected) {
        try {
          await refresh();
        } catch (error) {
          setConnected(false);
          status.textContent =
            error instanceof Error ? error.message : "Reconnect the companion.";
        }
      }
      if (detail.selection && experience === "assistant")
        discussHandoff({
          source: pageSource(detail.selection),
          question: "",
          noteIds: [...selected],
        });
      else if (detail.selection) beginNote(pageSource(detail.selection));
      else if (
        !editorDirty() &&
        new URL(editor.source.url).pathname !== location.pathname
      ) {
        acceptedAssistance = null;
        editor = {
          id: "",
          expected: "",
          kind: "scratch",
          title: "",
          body: "",
          relatedIds: [],
          source: pageSource(),
        };
      }
      if (!connected) view = "connect";
      else if (
        !detail.resume &&
        new URL(location.href).searchParams.has("inquiry")
      )
        navigate("peers");
      else if (view === "connect")
        view = experience === "assistant" ? assistantView : notebookView;
      render();
      persist();
      updateSelection();
    }),
);
let followingBookLink = false;
document.addEventListener("click", (event) => {
  followingBookLink = false;
  if (
    event.defaultPrevented ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  const anchor = (
    event.target instanceof Element ? event.target : null
  )?.closest<HTMLAnchorElement>("a[href]");
  if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download"))
    return;
  const destination = new URL(anchor.href);
  followingBookLink =
    destination.origin === location.origin &&
    destination.pathname !== location.pathname &&
    /^\/(chapters|appendices|parts|case-studies|project|concepts|explore|demos|notebook)\//.test(
      destination.pathname,
    );
});
window.addEventListener("pageshow", () => {
  followingBookLink = false;
});
window.addEventListener("beforeunload", (event) => {
  persist();
  // Chapter links retain the draft in this tab; closing/leaving still warns
  // about writing that has not been saved to the companion.
  if ((editorDirty() || assistant?.question.trim()) && !followingBookLink) {
    event.preventDefault();
    event.returnValue = "";
  }
});
