import type {
  AssistantHandoff,
  DiaryTakeaway,
  NotebookEntry,
  LearningSource,
} from "../../shared/learning-workspace.ts";
import type { LearningClient } from "./learning-client.ts";
import type {
  AssistantDraft,
  AssistantSection,
  DiaryExchangePreview,
} from "./learning-session.ts";
import { pageSource } from "./learning-context.ts";
import { mountLearningAgent } from "./learning-agent-ui.ts";
import { mountLearningPeers } from "./learning-peers.ts";
import type { GuideSave } from "./learning-practice.ts";
import type { DiaryAttempt } from "./learning-diary-attempt.ts";

interface Options {
  client: LearningClient;
  provider: string | null;
  connect: () => void;
  toolMode?: "none" | "native";
  entries: NotebookEntry[];
  diaryAttempt: DiaryAttempt | null;
  loadAttempts: () => Promise<void>;
  draft: AssistantDraft;
  preview: () => DiaryExchangePreview | null;
  previewChanged: (preview: DiaryExchangePreview) => void;
  source: () => LearningSource;
  active: () => boolean;
  changed: () => void;
  write: (draft: DiaryTakeaway) => void;
  help: (context: AssistantHandoff) => void;
  notes: () => void;
  save: GuideSave;
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
    options.help({ source, question });
  if (section === "peers")
    mountLearningPeers(container, {
      source: options.source(),
      entries: options.entries,
      diaryAttempt: options.diaryAttempt,
      save: options.save,
      notes: options.notes,
      status: options.status,
      initial,
      help,
      reflect: (source, body) =>
        options.write({
          source,
          body,
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
        }),
      accept: (body, assistance, source) => {
        options.write({
          source,
          title: `Takeaway: ${source.title}`.slice(0, 300),
          body,
          assistance,
        });
      },
    });
}
