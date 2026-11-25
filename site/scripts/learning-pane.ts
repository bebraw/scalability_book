import { LearningClient, LearningConnectionError } from "./learning-client.ts";
import { mountLearningAssistant } from "./learning-assistant.ts";
import { mountLearningNavigation } from "./learning-navigation.ts";
import {
  currentReading,
  linkedInquirySource,
  pageSource,
} from "./learning-context.ts";
import {
  readingSelection,
  type ReadingSelection,
} from "./learning-selection.ts";
import type {
  SessionState,
  AssistantSection,
  AssistantView,
} from "./learning-session.ts";
import type { CompanionStatus } from "../../shared/learning-connection.ts";
import { prepareLearningHelp } from "./learning-agent-ui.ts";
import { requestLearning } from "./learning-actions.ts";
import type {
  NotebookEntry,
  AssistantHandoff,
  DiaryTakeaway,
  LearningSource,
} from "../../shared/learning-workspace.ts";

export interface LearningSnapshot {
  connected: boolean;
  companionStatus: CompanionStatus | null;
  entries: NotebookEntry[];
}
export interface LearningPaneServices {
  client: LearningClient;
  session: SessionState;
  save: (patch: Partial<SessionState>) => void;
  refresh: (readAttempts?: boolean) => Promise<void>;
  recordAttempt: (entry: NotebookEntry) => void;
  connection: (connected: boolean) => void;
  open: () => void;
  close: () => void;
  write: (value: DiaryTakeaway) => void;
}
export function createLearningPane(services: LearningPaneServices) {
  const client = services.client;
  const panel = document.createElement("dialog");
  panel.id = "learning-assistant";
  panel.className = "learning-workspace";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Teaching assistant");
  panel.innerHTML = `<div class="learning-chrome"><div class="learning-heading"><div><p class="learning-eyebrow">Teaching assistant</p><h2></h2><p class="learning-purpose visually-hidden" id="learning-assistant-purpose">Explore a question and choose the support you need.</p></div><button type="button" data-learning-close aria-label="Close teaching assistant">×</button></div>
  <nav class="learning-tabs" aria-label="Teaching assistant sections"></nav></div><div class="learning-content"><p class="learning-status" role="status" aria-live="polite"></p><div class="learning-selection" hidden><p></p><button type="button" data-learning-selection>Discuss selected text</button></div><div class="learning-body"></div></div>`;
  panel.querySelector("h2")!.textContent = currentReading().title;
  panel.setAttribute("aria-describedby", "learning-assistant-purpose");
  document.body.append(panel);
  const container = panel.querySelector<HTMLDivElement>(".learning-body")!;
  const status = panel.querySelector<HTMLElement>(".learning-status")!;
  const restored = services.session;
  let view = restored.assistantPaneView;
  let assistantView = restored.assistantView;
  let assistant = restored.assistant;
  let inquirySource: LearningSource | null = null;
  let notePreview = restored.notePreview;
  let companionStatus: CompanionStatus | null = null;
  let connected = false;
  const entries: NotebookEntry[] = [];
  let updateAssistantRecords: (() => void) | undefined;
  function persist() {
    services.save({
      assistantPaneView: view,
      assistantView,
      assistant,
      notePreview,
    });
  }
  function readingSource() {
    return inquirySource ?? assistant?.source ?? pageSource();
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
    inquirySource = null;
    assistant = prepareLearningHelp(
      value.source,
      value.question,
      assistant?.browserId,
    );
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
      discussHandoff({
        source: pageSource(selection),
        question: "",
      });
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
      if (error instanceof LearningConnectionError) {
        setConnected(false);
        view = "connect";
        render();
      }
    }
  }
  function setConnected(value: boolean) {
    connected = value;
    updateSelection();
    services.connection(value);
  }
  let fieldNumber = 0;
  function field(label: string, input: HTMLElement): HTMLLabelElement {
    const result = node("label");
    const caption = node("span", label);
    caption.id = `learning-assistant-field-${++fieldNumber}`;
    input.setAttribute("aria-labelledby", caption.id);
    result.append(caption, input);
    return result;
  }
  function link(label: string, href: string) {
    const result = node("a", label);
    result.href = href;
    return result;
  }
  function navigate(next: AssistantView | "guide") {
    if (next === "guide") {
      requestLearning({ kind: "investigate", activityId: "learning-loop" });
      return;
    }
    if (next !== "connect") assistantView = next;
    view = next;
    if (next === "peers" && connected)
      void run(async () => {
        await services.refresh(true);
        if (view === "peers") render();
      });
    services.open();
    render();
    panel.querySelector(".learning-content")!.scrollTop = 0;
  }
  function render() {
    if (view === "agent" && !assistant)
      assistant = prepareLearningHelp(pageSource(), "");
    persist();
    mountLearningNavigation(panel, view, navigate);
    container.replaceChildren();
    container.append(
      button("Open learning cockpit", () =>
        requestLearning({
          kind: "investigate",
          activityId: "learning-loop",
          ...(assistantView === "peers" && inquirySource
            ? { source: inquirySource }
            : assistant
              ? {
                  draft: {
                    source: assistant.source,
                    question: assistant.question,
                  },
                }
              : {}),
        }),
      ),
    );
    updateAssistantRecords = undefined;
    if (!connected && view !== "connect") {
      container.append(
        node(
          "p",
          "Connect your local companion and choose a provider to discuss this reading.",
        ),
        button(
          "Connect companion",
          () => navigate("connect"),
          "learning-primary",
        ),
      );
      return;
    }
    if (view === "connect") renderConnection();
    else {
      const activeDraft = assistant ?? prepareLearningHelp(pageSource(), "");
      updateAssistantRecords = mountLearningAssistant(container, view, {
        client,
        provider: companionStatus?.provider ?? null,
        connect: () => navigate("connect"),
        ...(companionStatus?.capabilities
          ? { toolMode: companionStatus.capabilities.tools }
          : {}),
        entries,
        loadAttempts: async () => {
          await services.refresh(true);
          status.textContent =
            "Matching attempts appear under the book source. Check an attempt to include it in your message.";
        },
        draft: activeDraft,
        preview: () => notePreview,
        previewChanged: (value) => {
          notePreview = value;
          persist();
        },
        source: readingSource,
        active: () =>
          !panel.hidden && view === "agent" && assistant === activeDraft,
        changed: persist,
        write: services.write,
        help: discussHandoff,
        notes: () => location.assign("/diary/"),
        status: (text) => {
          status.textContent = text;
        },
        save: async (kind, title, body, source, relatedIds = []) => {
          const entry = await client.request<NotebookEntry>(
            "/entries",
            "POST",
            {
              kind,
              title,
              body,
              source,
              relatedIds,
            },
          );
          services.recordAttempt(entry);
          return entry;
        },
      });
    }
  }
  function renderCompanionCommand(action: "setup" | "start") {
    const command = node("pre", "", "learning-setup-command");
    // Pin the verified npm release independently of future source versions.
    const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
    const port = new URL(client.base).port || "80";
    const retained = connected
      ? `${port === "8788" ? "" : ` --port ${port}`}${companionStatus?.storage ? ` --directory ${quote(companionStatus.storage)}` : ""}`
      : "";
    const text = `npx --yes @scalableweb/companion@0.4.0 ${action} --origin ${quote(location.origin)}${retained}`;
    command.append(node("code", text));
    container.append(
      command,
      button(
        action === "setup" ? "Copy setup command" : "Copy start command",
        async () => {
          try {
            await navigator.clipboard.writeText(text);
            status.textContent = `Companion ${action} command copied. Paste it in a terminal.`;
          } catch {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(command);
            selection?.removeAllRanges();
            selection?.addRange(range);
            status.textContent =
              "Copy is unavailable here. The command is selected; copy it using your keyboard.";
          }
        },
      ),
    );
  }
  function renderConnection() {
    const forPeers = assistantView === "peers";
    const needsSetup = !connected || (!forPeers && !companionStatus?.provider);
    container.append(
      node(
        "p",
        connected
          ? "Your teaching assistant companion is connected."
          : forPeers
            ? "Connect your local companion to save your private initial thinking for this passage."
            : "Connect your local companion to use the teaching assistant. Choose a provider during setup.",
      ),
    );
    if (!connected && location.protocol === "https:") {
      const browsers = node(
        "p",
        "For this website's local companion connection, use current Chrome on the same computer and allow local-network access when prompted. Safari can block this connection. ",
        "learning-hint",
      );
      browsers.append(
        link(
          "Browser connection help",
          "/notebook/setup/#browser-connection-support",
        ),
      );
      container.append(browsers);
    }
    if (needsSetup) {
      container.append(
        node(
          "h3",
          connected ? "Enable assistant replies" : "1. Choose your setup",
        ),
        node(
          "p",
          connected
            ? "Stop the current companion, then run setup in its terminal. Your message draft stays here."
            : forPeers
              ? "Run setup in your terminal and choose Notebook only for peer discussion. Already set up? Go to step 2."
              : "Run setup in your terminal and choose how you want to work. Already set up? Go to step 2.",
        ),
      );
      if (!forPeers) {
        const choices = node("ul", "", "learning-setup-choices");
        for (const [label, href, detail] of [
          [
            "Codex",
            "/notebook/setup/#connect-your-agent",
            " — use ChatGPT sign-in or an OpenAI API key.",
          ],
          [
            "API key",
            "/notebook/setup/#use-an-api-key",
            " — OpenAI, Claude, Gemini, OpenRouter or a compatible service; no Codex needed.",
          ],
          [
            "Local model",
            "/notebook/setup/#use-a-local-model",
            " — use a model loaded on your computer.",
          ],
        ] as const) {
          const choice = node("li");
          choice.append(link(label, href), document.createTextNode(detail));
          choices.append(choice);
        }
        container.append(
          choices,
          node(
            "p",
            "Enter API keys only in the terminal. API usage is billed by your provider.",
            "learning-hint",
          ),
        );
      }
      renderCompanionCommand("setup");
      container.append(
        node(
          "h3",
          connected ? "Restart and reconnect" : "2. Start the companion",
        ),
        node(
          "p",
          connected
            ? "After setup, start the companion again with this command. Choose Check connection and reconnect if asked."
            : "Keep this command running while you use the companion.",
        ),
      );
    }
    renderCompanionCommand("start");
    container.append(link("Companion setup guide", "/notebook/setup/"));
    if (!connected) {
      container.append(node("h3", "3. Connect in the book"));
      const address = node("input");
      address.value = client.base;
      address.type = "url";
      container.append(
        field("Companion address", address),
        button(
          "Connect companion",
          async () => {
            await client.connect(address.value);
            await services.refresh(assistantView === "peers");
            status.textContent = "Connected to your local companion.";
          },
          "learning-primary",
        ),
      );
    } else {
      if (companionStatus) {
        container.append(
          node(
            "p",
            `Companion ${companionStatus.release?.version ?? "legacy"}; protocol ${companionStatus.version}; ${companionStatus.provider ? `${companionStatus.provider} enabled` : "no assistant provider"}.`,
            "learning-hint",
          ),
        );
        if (companionStatus.teaching)
          container.append(
            node(
              "p",
              `Teaching policy ${companionStatus.teaching.policy.id} v${companionStatus.teaching.policy.version}; ${companionStatus.teaching.provider.name} ${companionStatus.teaching.provider.version ?? "version not reported"}${companionStatus.teaching.provider.model ? ` · ${companionStatus.teaching.provider.model}` : ""}.`,
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
      }
      container.append(
        button("Check connection", async () => {
          await services.refresh();
          status.textContent =
            "Connection and protocol are available. Local prerequisite checks are available through doctor in your terminal.";
          render();
        }),
        button("Explore this reading", () => navigate("guide")),
      );
      container.append(
        button("Disconnect", async () => {
          await client.disconnect();
          setConnected(false);
          entries.length = 0;
          status.textContent = "Disconnected from the local companion.";
          render();
        }),
      );
    }
  }
  function close() {
    services.close();
  }
  panel
    .querySelector("[data-learning-close]")!
    .addEventListener("click", close);
  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  });
  async function open(
    selection: ReadingSelection | null,
    resume: boolean,
    section?: AssistantSection,
  ) {
    await run(async () => {
      if (section === "peers") {
        // The class discussion follows its link even with an unsent assistant
        // question about another reading. Keep that question and source together.
        inquirySource = linkedInquirySource();
        assistantView = "peers";
        view = "peers";
      } else if (section === "agent") {
        const reading = pageSource(selection);
        if (
          assistant?.source.url !== reading.url ||
          assistant.source.anchor !== reading.anchor
        )
          discussHandoff({ source: reading, question: "" });
        assistantView = "agent";
        view = "agent";
      } else if (selection)
        discussHandoff({
          source: pageSource(selection),
          question: "",
        });
      // The coordinator already checked the shared connection during restore.
      if (!resume && client.token && !connected)
        await services.refresh(assistantView === "peers");
      else if (connected && assistantView === "peers")
        await services.refresh(true);
      view = connected ? assistantView : "connect";
      render();
      updateSelection();
    });
  }
  function update(snapshot: LearningSnapshot) {
    const connectionChanged = connected !== snapshot.connected;
    connected = snapshot.connected;
    companionStatus = snapshot.companionStatus;
    entries.splice(0, entries.length, ...snapshot.entries);
    if (connectionChanged) view = connected ? assistantView : "connect";
    updateSelection();
    if (!panel.hidden && (connectionChanged || view === "connect")) render();
    else updateAssistantRecords?.();
  }
  mountLearningNavigation(panel, view, navigate);
  return {
    panel,
    open,
    navigate,
    discuss: discussHandoff,
    update,
    accountChanged: () => {
      if (view === "peers") render();
    },
    recover: (message: string) => {
      status.textContent = message;
    },
    hasDraft: () => Boolean(assistant?.question.trim()),
  };
}
