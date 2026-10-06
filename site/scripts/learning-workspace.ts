import { LearningClient, LearningConnectionError } from "./learning-client.ts";
import { mountLearningStart } from "./learning-start.ts";
import type { CompanionStatus } from "../../shared/learning-connection.ts";
import { mountLearningAgent } from "./learning-agent-ui.ts";
import { mountLearningPeers } from "./learning-peers.ts";
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
  type LearningSource,
  type NotebookEntry,
  type ConceptJudgment,
  type NoteKind,
} from "../../shared/learning-workspace.ts";

type View =
  | "write"
  | "notes"
  | "concepts"
  | "prepare"
  | "connect"
  | "agent"
  | "peers";
type NotebookView = View | "start";
const client = new LearningClient();
const panel = document.createElement("dialog");
panel.className = "learning-workspace";
panel.hidden = true;
panel.setAttribute("aria-label", "My learning notebook");
panel.innerHTML = `<div class="learning-heading"><div><p class="learning-eyebrow">A space for your thinking</p><h2>My notebook</h2></div><button type="button" data-learning-close aria-label="Close notebook">×</button></div>
  <nav class="learning-tabs" aria-label="Notebook sections"></nav><p class="learning-status" role="status" aria-live="polite"></p><div class="learning-body"></div>`;
document.body.append(panel);
const container = panel.querySelector<HTMLDivElement>(".learning-body")!;
const tabs = panel.querySelector<HTMLElement>(".learning-tabs")!;
const status = panel.querySelector<HTMLElement>(".learning-status")!;
let view: NotebookView = "write";
let companionStatus: CompanionStatus | null = null;
let connected = false;
let entries: NotebookEntry[] = [];
let judgments: ConceptJudgment[] = [];
const selected = new Set<string>();
let draft = "";
let acceptedAssistance: string | null = null;
let editor = {
  id: "",
  expected: "",
  kind: "scratch" as NoteKind,
  title: "",
  body: "",
  relatedIds: [] as string[],
  source: pageSource(),
};

function textOf(element: Element): string {
  const clone = element.cloneNode(true) as Element;
  for (const control of clone.querySelectorAll(
    "button, input, select, textarea, script, style, .paragraph-feedback-actions, [data-paragraph-feedback-panel]",
  ))
    control.remove();
  return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
}
function pageSource(target?: string): LearningSource {
  const element = target
    ? document.getElementById(target)
    : document.querySelector("main .prose, main article, main, #content");
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();
  const inReading =
    selection?.anchorNode &&
    (target
      ? element?.contains(selection.anchorNode)
      : document
          .querySelector("main, #content")
          ?.contains(selection.anchorNode));
  const excerpt =
    selectedText && inReading ? selectedText : element ? textOf(element) : "";
  const url = new URL(location.href);
  url.hash = "";
  url.search = "";
  const conceptId =
    location.pathname === "/concepts/"
      ? (new URL(location.href).searchParams.get("topic") ??
        location.hash.slice(1))
      : "";
  const kind = target
    ? "passage"
    : conceptId
      ? "concept"
      : location.pathname.startsWith("/explore/")
        ? "exploration"
        : "page";
  return {
    url: url.href,
    title:
      document.querySelector("main h1, #content h1")?.textContent?.trim() ??
      document.title,
    kind,
    anchor: target ?? (conceptId || location.hash.slice(1)),
    excerpt: excerpt.slice(0, 12_000),
    revision:
      document.querySelector<HTMLMetaElement>(
        'meta[name="book-content-revision"]',
      )?.content ?? null,
    conceptIds:
      conceptId && concepts.some((c) => c.id === conceptId) ? [conceptId] : [],
  };
}
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
  result.addEventListener("click", () => void run(action));
  return result;
}
async function run(action: () => void | Promise<void>) {
  try {
    await action();
  } catch (error) {
    status.textContent =
      error instanceof Error ? error.message : "The notebook action failed.";
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
  document.dispatchEvent(
    new CustomEvent("book-learning-connection", { detail: { connected } }),
  );
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
  view = next;
  render();
}
function render() {
  tabs.replaceChildren();
  for (const [id, label] of [
    ["write", "Write"],
    ["notes", "Notes"],
    ["concepts", "Concepts"],
    ["agent", "Agent"],
    ["peers", "Peers"],
    ["prepare", "Prepare"],
    ["connect", "Connect"],
    ["start", "Start"],
  ] as const) {
    const tab = button(label, () => navigate(id));
    tab.setAttribute("aria-current", String(view === id));
    tabs.append(tab);
  }
  container.replaceChildren();
  if (!connected && view !== "connect") {
    container.append(
      node(
        "p",
        "Connect your local companion to save and revisit your private notes. Reading the book does not require a connection.",
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
  if (view === "start")
    mountLearningStart(container, {
      entries,
      save: async (kind, title, body, source) => {
        await client.request("/entries", "POST", { kind, title, body, source });
        await refresh();
      },
      notes: () => navigate("notes"),
      leave: () => navigate("write"),
      status: (text) => {
        status.textContent = text;
      },
    });
  if (view === "peers")
    mountLearningPeers(container, {
      source: editor.source,
      entries,
      status: (text) => {
        status.textContent = text;
      },
      initial: (source) => {
        acceptedAssistance = null;
        editor = {
          id: "",
          expected: "",
          kind: "attempt",
          title: `Initial thinking: ${source.title}`.slice(0, 300),
          body: "",
          relatedIds: [],
          source,
        };
        navigate("write");
      },
      reflect: (source, body) => {
        acceptedAssistance = null;
        editor = {
          id: "",
          expected: "",
          kind: "reflection",
          title: `Peer inquiry: ${source.title}`.slice(0, 300),
          body: body.slice(0, 16000),
          relatedIds: [],
          source,
        };
        navigate("write");
        status.textContent =
          "Compare with your initial explanation and revise this private draft. Choose which material represents your own learning before saving.";
      },
    });
  if (view === "agent")
    mountLearningAgent(container, {
      client,
      source: () => editor.source,
      selected: () => [...selected],
      active: () => !panel.hidden && view === "agent",
      status: (text) => {
        status.textContent = text;
      },
      accept: (text, provenance, source) => {
        acceptedAssistance = provenance;
        editor = {
          id: "",
          expected: "",
          kind: "reflection",
          title: `Reflection: ${source.title}`.slice(0, 300),
          body: text.slice(0, 16000),
          relatedIds: [],
          source,
        };
        navigate("write");
        status.textContent =
          "Review and revise this agent suggestion, then choose Save note if it represents your thinking.";
      },
      initial: (source) => {
        acceptedAssistance = null;
        editor = {
          id: "",
          expected: "",
          kind: "attempt",
          title: `Initial thinking: ${source.title}`.slice(0, 300),
          body: "",
          relatedIds: [],
          source,
        };
        navigate("write");
        status.textContent =
          "Save your own explanation, prediction or where you are stuck. Select this note in Notes before returning to the agent.";
      },
    });
}
function renderEditor() {
  const context = node("details", undefined, "learning-context");
  context.append(
    node("summary", `Reading: ${editor.source.title}`),
    node("blockquote", editor.source.excerpt),
    link("Return to this source", sourceLink(editor.source)),
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
        editor.id = saved.id;
        editor.expected = saved.revision;
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
      render();
    }),
  );
}
function renderNotes() {
  container.append(
    node(
      "p",
      "Your notes belong to you. Select material to prepare a submission, or return to an earlier idea.",
      "learning-hint",
    ),
  );
  if (!entries.length)
    container.append(
      node(
        "p",
        "Your notebook is ready for its first question or observation.",
      ),
    );
  for (const entry of entries) {
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
    if (new URL(entry.source.url).pathname === location.pathname) {
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
  for (const concept of concepts) {
    const option = node("option", concept.title);
    option.value = concept.id;
    select.append(option);
  }
  select.value = editor.source.conceptIds[0] ?? concepts[0]!.id;
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
          navigate("write");
        },
        "learning-primary",
      ),
    );
  } else {
    if (companionStatus) {
      container.append(
        node(
          "p",
          `Companion ${companionStatus.release?.version ?? "legacy"}; protocol ${companionStatus.version}; ${companionStatus.provider ? "Codex enabled" : "notebook-only"}.`,
          "learning-hint",
        ),
      );
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
      button("Try a first investigation", () => navigate("start")),
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
}
panel.querySelector("[data-learning-close]")!.addEventListener("click", close);
panel.addEventListener("keydown", (event) => {
  if (event.key === "Escape") close();
});
document.addEventListener(
  "book-learning-open",
  (event) =>
    void run(async () => {
      const detail = (event as CustomEvent<{ target?: string }>).detail;
      if (detail.target || !editor.body) {
        const saved = entries.find((entry) => entry.id === editor.id);
        if (
          !editor.body ||
          saved?.body === editor.body ||
          window.confirm(
            "Start a new note on this passage? Choose Cancel to keep working on your unsaved draft.",
          )
        ) {
          acceptedAssistance = null;
          editor = {
            id: "",
            expected: "",
            kind: "scratch",
            title: "",
            body: "",
            relatedIds: [],
            source: pageSource(detail.target),
          };
        }
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
      view = connected
        ? new URL(location.href).searchParams.has("inquiry")
          ? "peers"
          : "write"
        : "connect";
      render();
      panel.hidden = false;
      if (!panel.hasAttribute("open")) {
        if (typeof panel.show === "function") panel.show();
        else panel.setAttribute("open", "");
      }
    }),
);
window.addEventListener("beforeunload", (event) => {
  const saved = entries.find((entry) => entry.id === editor.id);
  if (editor.body && (!saved || saved.body !== editor.body)) {
    event.preventDefault();
    event.returnValue = "";
  }
});
