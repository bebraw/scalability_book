import type { LearningClient } from "./learning-client.ts";
import {
  sourceLink,
  type LearningSource,
  type NotebookEntry,
} from "../../shared/learning-workspace.ts";
import type { AssistantDraft } from "./learning-session.ts";
import { renderLearningReply } from "./learning-reply.ts";
import {
  helpModes,
  supportNeeds,
  supportNeedLabels,
  type SupportNeed,
  type LearningConversation,
  type DemoToolRequest,
} from "../../shared/learning-agent.ts";
import {
  availableLearningDemos,
  observeLearningDemo,
  changeLearningDemo,
} from "./learning-demos.ts";

export function prepareLearningHelp(
  source: LearningSource,
  text: string,
  browserId: string = crypto.randomUUID(),
): AssistantDraft {
  return {
    source,
    conversationId: null,
    browserId,
    question: text,
    goal: "",
    mode: text ? "hint" : "question",
    supportNeed: text ? "getting-started" : "unspecified",
  };
}
let timer: ReturnType<typeof setTimeout> | null = null;
const handled = new Set<string>();
const element = <K extends keyof HTMLElementTagNameMap>(tag: K, text = "") => {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
};
let number = 0;
const field = (text: string, control: HTMLElement) => {
  const label = element("label");
  const caption = element("span", text);
  caption.id = `agent-field-${++number}`;
  control.setAttribute("aria-labelledby", caption.id);
  label.append(caption, control);
  return label;
};
interface Options {
  client: LearningClient;
  provider: string | null;
  connect: () => void;
  toolMode?: "none" | "native";
  draft: AssistantDraft;
  source: () => LearningSource;
  selected: () => string[];
  entries: NotebookEntry[];
  notes: () => void;
  currentReading: () => void;
  changed: () => void;
  active: () => boolean;
  accept: (
    text: string,
    provenance: string,
    source: LearningSource,
    relatedIds: string[],
  ) => void;
  initial: (source: LearningSource) => void;
  status: (text: string) => void;
}
export function mountLearningAgent(container: HTMLElement, options: Options) {
  if (timer) clearTimeout(timer);
  const { client, draft } = options;
  let conversation: LearningConversation | null = null;
  const choose = element("select");
  const placeholder = element("option", "Choose a saved conversation");
  placeholder.value = "";
  choose.append(placeholder);
  const updateChoice = (
    value: Pick<LearningConversation, "id" | "title" | "updatedAt">,
    select = false,
  ) => {
    let option = Array.from(choose.options).find(
      (option) => option.value === value.id,
    );
    if (!option) {
      option = element("option");
      option.value = value.id;
      if (select) choose.insertBefore(option, choose.options[1] ?? null);
      else choose.append(option);
    }
    const updated = new Date(value.updatedAt).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "medium",
    });
    option.textContent = `${updated} · ${value.title}`;
    if (select) choose.value = value.id;
  };
  const remember = (value: LearningConversation) => {
    conversation = value;
    draft.conversationId = value.id;
    draft.source = value.source;
    updateChoice(value, true);
    options.changed();
  };
  const act = async (fn: () => Promise<void> | void) => {
    try {
      await fn();
    } catch (error) {
      options.status(
        error instanceof Error
          ? error.message
          : "The assistant request failed.",
      );
    }
  };
  const button = (text: string, fn: () => Promise<void> | void) => {
    const node = element("button", text);
    node.type = "button";
    node.addEventListener("click", () => void act(fn));
    return node;
  };
  const toolbar = element("details");
  toolbar.className = "learning-assistant-settings";
  const settingsSummary = element("summary", "Conversation and help settings");
  toolbar.append(settingsSummary);
  const messages = element("div");
  messages.className = "learning-messages";
  messages.setAttribute("aria-live", "polite");
  container.append(
    Object.assign(
      element(
        "p",
        options.toolMode === "none"
          ? "Discussion-only local model. It cannot inspect live book pages or demos. Supply a saved demo result or use Chapter guide for an actual observation."
          : "Automated study support through your chosen provider.",
      ),
      { className: "learning-hint" },
    ),
    toolbar,
  );
  const demoSelect = element("select");
  const reading = draft.source;
  const context = element("section");
  context.className = "learning-context";
  context.setAttribute("aria-label", "Assistant context");
  function drawContext() {
    context.replaceChildren();
    const reading = conversation?.source ?? draft.source;
    const contextLink = element("a", reading.title);
    contextLink.href = sourceLink(reading);
    context.append(contextLink);
    if (reading.excerpt) {
      const passage = element("details");
      passage.append(
        element("summary", "Preview the selected source"),
        element(
          "blockquote",
          reading.excerpt.slice(0, 500) +
            (reading.excerpt.length > 500 ? "…" : ""),
        ),
      );
      context.append(passage);
    }
    if (new URL(reading.url).pathname !== location.pathname)
      context.append(
        element(
          "p",
          "This conversation keeps its original source as you move through the book.",
        ),
        button("Discuss the current reading", options.currentReading),
      );
    const noteContext = element("details");
    noteContext.setAttribute("aria-label", "Selected notebook context");
    noteContext.append(
      element(
        "summary",
        `${options.selected().length} notebook notes selected for context`,
      ),
    );
    for (const id of options.selected()) {
      const entry = options.entries.find((note) => note.id === id);
      if (entry) {
        const link = element("a", entry.source.title);
        link.href = sourceLink(entry.source);
        noteContext.append(
          element("h3", entry.title),
          link,
          element(
            "p",
            entry.body.slice(0, 300) + (entry.body.length > 300 ? "…" : ""),
          ),
        );
      }
    }
    noteContext.append(button("Choose notebook context", options.notes));
    context.append(
      noteContext,
      element(
        "p",
        "Only this source and selected notes are sent with your message.",
      ),
    );
  }
  container.insertBefore(context, toolbar);
  const pageOption = element(
    "option",
    `${reading.kind === "passage" ? "Selected passage" : reading.kind === "demo" ? "Investigation" : "Current reading"} · ${reading.title}`,
  );
  pageOption.value = "";
  demoSelect.append(pageOption);
  for (const demo of availableLearningDemos()) {
    const option = element("option", demo.title);
    option.value = demo.id;
    demoSelect.append(option);
  }
  const source = () => {
    if (!demoSelect.value) return draft.source;
    const observation = observeLearningDemo(demoSelect.value);
    return {
      ...options.source(),
      url: observation.url.split("#")[0]!,
      kind: "demo" as const,
      anchor: observation.demoId,
      title: observation.title,
      excerpt: observation.visibleText.slice(0, 12_000),
    };
  };
  toolbar.append(field("Investigation source", demoSelect));
  demoSelect.addEventListener("change", () => {
    draft.source = source();
    draft.conversationId = null;
    options.changed();
    conversation = null;
    choose.value = "";
    draw();
  });
  void act(async () => {
    const saved = await client.request<
      Pick<LearningConversation, "id" | "title" | "updatedAt">[]
    >("/agent/conversations");
    for (const item of saved) updateChoice(item);
    if (draft.conversationId && options.active()) {
      remember(
        await client.request<LearningConversation>(
          `/agent/conversations/${draft.conversationId}`,
        ),
      );
      draw();
      poll();
    }
  });
  choose.addEventListener(
    "change",
    () =>
      void act(async () => {
        if (!choose.value) return;
        remember(
          await client.request<LearningConversation>(
            `/agent/conversations/${choose.value}`,
          ),
        );
        draw();
        poll();
      }),
  );
  toolbar.append(
    field("Saved conversations", choose),
    button("New conversation", async () => {
      remember(
        await client.request<LearningConversation>(
          "/agent/conversations",
          "POST",
          { source: source() },
        ),
      );
      draw();
    }),
  );
  const help = element("select");
  for (const value of helpModes) {
    const option = element(
      "option",
      {
        question: "Ask me a question",
        hint: "Give me a hint",
        explanation: "Explain directly",
        check: "Check my reasoning",
        reflect: "Help me reflect",
      }[value],
    );
    option.value = value;
    help.append(option);
  }
  help.value = draft.mode;
  const describeHelp = () => {
    settingsSummary.textContent = `Help: ${help.selectedOptions[0]!.textContent} · Settings`;
  };
  describeHelp();
  help.addEventListener("change", () => {
    draft.mode = help.value as AssistantDraft["mode"];
    describeHelp();
    options.changed();
  });
  const need = element("select");
  for (const value of supportNeeds) {
    const option = element("option", supportNeedLabels[value]);
    option.value = value;
    need.append(option);
  }
  need.value = draft.supportNeed;
  need.addEventListener("change", () => {
    draft.supportNeed = need.value as SupportNeed;
    options.changed();
  });
  const goalInput = element("input");
  goalInput.maxLength = 1000;
  goalInput.value = draft.goal;
  goalInput.addEventListener("input", () => {
    draft.goal = goalInput.value;
    options.changed();
  });
  const input = element("textarea");
  input.rows = 3;
  input.maxLength = 8000;
  input.value = draft.question;
  input.placeholder =
    "Share a prediction, your explanation, or where you are stuck. Honest uncertainty is enough.";
  input.addEventListener("input", () => {
    draft.question = input.value;
    options.changed();
  });
  toolbar.append(
    field("My learning goal", goalInput),
    field("How I want help", help),
    field("Where I want support", need),
    element(
      "p",
      "You can ask for a direct explanation immediately, change help at any time, or try the next step yourself. Saving initial thinking is needed only for assistant demo changes.",
    ),
  );
  toolbar.append(
    button("Save initial thinking", () =>
      options.initial(conversation?.source ?? source()),
    ),
  );
  container.append(field("Message to the teaching assistant", input));
  const readiness = element("section");
  readiness.className = "learning-provider-readiness";
  readiness.setAttribute("aria-label", "Assistant provider");
  readiness.append(
    element(
      "p",
      options.provider
        ? `${options.provider} enabled. Send a message to check that it can reply.`
        : "Notebook-only connection. Enable Codex or a local model for assistant replies. Your message stays here while you set up the provider.",
    ),
  );
  if (!options.provider)
    readiness.append(button("Set up assistant replies", options.connect));
  container.append(readiness);
  const actions = element("div");
  actions.className = "learning-assistant-actions";
  const send = button("Send message", async () => {
    if (!options.provider) return;
    if (!draft.question.trim()) {
      options.status("Write your question or initial explanation first.");
      return;
    }
    if (!conversation)
      remember(
        await client.request<LearningConversation>(
          "/agent/conversations",
          "POST",
          { source: source() },
        ),
      );
    remember(
      await client.request<LearningConversation>(
        `/agent/conversations/${conversation!.id}`,
        "POST",
        {
          text:
            draft.supportNeed === "unspecified"
              ? draft.question
              : `Support requested: ${supportNeedLabels[draft.supportNeed]}.\n\n${draft.question}`,
          goal: draft.goal,
          mode: draft.mode,
          supportNeed: draft.supportNeed,
          noteIds: options.selected(),
          browserId: draft.browserId,
        },
      ),
    );
    draft.question = "";
    options.changed();
    input.value = "";
    draw();
    poll();
  });
  send.className = "learning-primary";
  send.disabled = !options.provider;
  send.setAttribute("aria-describedby", "learning-provider-readiness");
  readiness.id = "learning-provider-readiness";
  actions.append(
    send,
    button("Stop reply", async () => {
      await client.request("/agent/stop", "POST", {});
      options.status("Stopped. Your saved thinking is retained.");
    }),
  );
  container.append(actions, messages);
  function draw() {
    drawContext();
    const current = conversation?.source ?? draft.source;
    pageOption.textContent = `${current.kind === "passage" ? "Selected passage" : current.kind === "demo" ? "Investigation" : "Current reading"} · ${current.title}`;
    messages.replaceChildren();
    if (!conversation) {
      messages.append(
        element(
          "p",
          "Start here or reopen a saved conversation. You can take notes without connecting a model.",
        ),
      );
      return;
    }
    const sourceLink = element("a", conversation.source.title);
    const url = new URL(conversation.source.url);
    url.hash = conversation.source.anchor;
    sourceLink.href = url.href;
    messages.append(sourceLink);
    for (const message of conversation.messages) {
      const card = element(
        message.role === "observation" ? "details" : "article",
      );
      card.className = "learning-note";
      card.append(
        element(
          message.role === "observation" ? "summary" : "h3",
          message.role === "student"
            ? "Your thinking"
            : message.role === "agent"
              ? "Teaching assistant suggestion"
              : "Browser observation",
        ),
      );
      const body =
        message.role === "agent"
          ? renderLearningReply(message.text)
          : element("p", message.text);
      card.append(body);
      if (message.role === "student" && message.support) {
        const detail = element(
          "p",
          `Help requested: ${message.support.mode} · ${supportNeedLabels[message.support.need]}${message.support.goal ? ` · Goal: ${message.support.goal}` : ""}`,
        );
        detail.className = "learning-hint";
        card.append(detail);
      }
      if (message.role === "agent") {
        const about = element("details");
        about.append(
          element("summary", "About this reply"),
          element(
            "p",
            message.teaching
              ? `${message.teaching.policy.name} · policy ${message.teaching.policy.id} v${message.teaching.policy.version} · ${message.teaching.provider.name} ${message.teaching.provider.version ?? "version not reported"}${message.teaching.provider.model ? ` · ${message.teaching.provider.model}` : ""}.`
              : "Teaching policy and provider version were not recorded for this earlier reply.",
          ),
        );
        card.append(about);
        for (const notice of message.notices ?? [])
          card.append(
            Object.assign(element("p", notice), { className: "learning-hint" }),
          );
        const student = conversation.messages
          .slice(0, conversation.messages.indexOf(message))
          .reverse()
          .find((item) => item.role === "student");
        const relatedIds = student?.noteIds ?? [];
        const teaching = message.teaching
          ? `; policy ${message.teaching.policy.id} v${message.teaching.policy.version}; ${message.teaching.provider.name} ${message.teaching.provider.version ?? "version not reported"}${message.teaching.provider.model ? `; model ${message.teaching.provider.model}` : ""}`
          : "; teaching policy not recorded";
        const provenance = `Assistant suggestion; conversation ${conversation.id}; message ${message.id}${teaching}; reviewed by student before saving`;
        card.append(
          button("Write a takeaway", () =>
            options.accept(
              "",
              `Student-written takeaway after discussion; conversation ${conversation!.id}; message ${message.id}${teaching}`,
              conversation!.source,
              relatedIds,
            ),
          ),
          button("Use as a notebook draft", () =>
            options.accept(
              message.text,
              provenance,
              conversation!.source,
              relatedIds,
            ),
          ),
        );
      }
      messages.append(card);
    }
    if (conversation.state === "working")
      messages.append(
        element(
          "p",
          "The teaching assistant is thinking. Demo changes will ask for your review.",
        ),
      );
    if (conversation.error) messages.append(element("p", conversation.error));
  }
  async function poll() {
    if (!options.active() || !conversation) return;
    const conversationId = conversation.id;
    try {
      const requests = await client.request<DemoToolRequest[]>(
        `/agent/requests?browser=${draft.browserId}`,
      );
      if (!options.active() || conversation?.id !== conversationId) return;
      for (const request of requests) {
        if (request.conversationId !== conversationId) continue;
        if (handled.has(request.id)) continue;
        handled.add(request.id);
        let result: unknown;
        try {
          if (request.tool === "observe_demo")
            result = observeLearningDemo(request.demoId);
          else {
            const observed = observeLearningDemo(request.demoId);
            const control = observed.controls.find(
              (control) => control.id === request.arguments.controlId,
            );
            if (!control)
              throw new Error(
                "Observe the demo again; this control is unavailable.",
              );
            if (
              !window.confirm(
                `The teaching assistant proposes changing “${control.label}” in “${observed.title}” to ${JSON.stringify(request.arguments.value)}. Apply this change and report the actual observation?`,
              )
            )
              throw new Error("The student declined this demo change.");
            result = await changeLearningDemo(
              request.demoId,
              request.arguments,
            );
          }
          await client.request(`/agent/requests/${request.id}`, "POST", {
            browserId: draft.browserId,
            success: true,
            result,
          });
        } catch (error) {
          await client.request(`/agent/requests/${request.id}`, "POST", {
            browserId: draft.browserId,
            success: false,
            message:
              error instanceof Error ? error.message : "Demo unavailable.",
          });
        }
      }
      const refreshed = await client.request<LearningConversation>(
        `/agent/conversations/${conversationId}`,
      );
      if (!options.active() || conversation?.id !== conversationId) return;
      remember(refreshed);
      draw();
      if (conversation.state === "working" && options.active())
        timer = setTimeout(() => void poll(), 1000);
    } catch (error) {
      options.status(
        error instanceof Error
          ? error.message
          : "Reconnect to resume your conversation.",
      );
    }
  }
  draw();
  return drawContext;
}
