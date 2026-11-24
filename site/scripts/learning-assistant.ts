import type {
  AssistantHandoff,
  NotebookHandoff,
  NotebookEntry,
  LearningSource,
} from "../../shared/learning-workspace.ts";
import type { LearningClient } from "./learning-client.ts";
import type {
  AssistantDraft,
  AssistantSection,
  NotebookDraftPreview,
} from "./learning-session.ts";
import { currentReading, pageSource } from "./learning-context.ts";
import { mountLearningGuide } from "./learning-guide.ts";
import { mountLearningAgent } from "./learning-agent-ui.ts";
import { mountLearningPeers } from "./learning-peers.ts";
import type { GuideSave } from "./learning-practice.ts";

interface Options {
  client: LearningClient;
  provider: string | null;
  connect: () => void;
  toolMode?: "none" | "native";
  entries: NotebookEntry[];
  loadAttempts: () => Promise<void>;
  draft: AssistantDraft;
  preview: () => NotebookDraftPreview | null;
  previewChanged: (preview: NotebookDraftPreview) => void;
  source: () => LearningSource;
  selected: () => string[];
  active: () => boolean;
  changed: () => void;
  write: (draft: NotebookHandoff) => void;
  help: (context: AssistantHandoff) => void;
  discuss: () => void;
  notes: () => void;
  save: GuideSave;
  close: () => void;
  status: (text: string) => void;
}

/** Compose assistant activities around their reading source and explicit handoffs. */
export function mountLearningAssistant(
  container: HTMLElement,
  section: AssistantSection,
  options: Options,
) {
  const initial = (source: LearningSource, saved?: () => void) => {
    container.querySelector("[data-initial-attempt]")?.remove();
    const form = document.createElement("form");
    form.dataset.initialAttempt = "";
    const label = document.createElement("label");
    label.textContent = "My initial thinking";
    const body = document.createElement("textarea");
    body.required = true;
    body.maxLength = 16000;
    label.append(body);
    const help = document.createElement("p");
    help.textContent =
      "This attempt stays in your local companion. Saving it lets you request a demo change or compare ideas with your peers.";
    const save = document.createElement("button");
    save.type = "submit";
    save.textContent = "Save private attempt";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", () => form.remove());
    form.append(label, help, save, cancel);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!body.value.trim() || save.disabled) return;
      save.disabled = true;
      try {
        await options.save(
          "attempt",
          `Initial thinking: ${source.title}`.slice(0, 300),
          body.value,
          source,
        );
        form.remove();
        options.status("Initial thinking saved in your local companion.");
        saved?.();
      } catch (error) {
        save.disabled = false;
        options.status(
          error instanceof Error
            ? error.message
            : "Could not save your attempt.",
        );
      }
    });
    container.prepend(form);
    body.focus();
  };
  const help = (source: LearningSource, question: string) =>
    options.help({ source, question, noteIds: options.selected() });
  if (section === "guide")
    return mountLearningGuide(container, {
      entries: options.entries,
      save: options.save,
      notes: options.notes,
      close: options.close,
      status: options.status,
      initial,
      help,
      leave: options.discuss,
      reflect: (source, relatedIds) =>
        options.write({
          source,
          relatedIds,
          kind: "reflection",
          title: `Reflection: ${currentReading().title}`.slice(0, 300),
          body: "",
          assistance: null,
        }),
    });
  if (section === "peers")
    mountLearningPeers(container, {
      source: options.source(),
      entries: options.entries,
      save: options.save,
      notes: options.notes,
      status: options.status,
      initial,
      help,
      reflect: (source, body, relatedIds) =>
        options.write({
          source,
          body,
          relatedIds,
          kind: "reflection",
          title: `Peer inquiry: ${source.title}`.slice(0, 300),
          assistance: null,
        }),
    });
  if (section === "agent")
    return mountLearningAgent(container, {
      client: options.client,
      provider: options.provider,
      connect: options.connect,
      ...(options.toolMode ? { toolMode: options.toolMode } : {}),
      draft: options.draft,
      preview: options.preview,
      previewChanged: options.previewChanged,
      source: pageSource,
      entries: options.entries,
      loadAttempts: options.loadAttempts,
      active: options.active,
      changed: options.changed,
      status: options.status,
      initial,
      currentReading: () =>
        options.help({
          source: pageSource(),
          question: "",
          noteIds: options.selected(),
        }),
      accept: (body, assistance, source, relatedIds) => {
        if (body.length > 16_000) {
          options.status(
            "Shorten the exchange to 16,000 characters before downloading it.",
          );
          return;
        }
        options.write({
          source,
          relatedIds,
          kind: "reflection",
          title: `Takeaway: ${source.title}`.slice(0, 300),
          body,
          assistance,
        });
      },
    });
}
