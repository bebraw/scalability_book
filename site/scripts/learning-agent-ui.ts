import type { LearningClient } from "./learning-client.ts";
import type { LearningSource } from "../../shared/learning-workspace.ts";
import {
  helpModes,
  type LearningConversation,
  type DemoToolRequest,
} from "../../shared/learning-agent.ts";
import {
  availableLearningDemos,
  observeLearningDemo,
  changeLearningDemo,
} from "./learning-demos.ts";

const browserId = crypto.randomUUID();
let conversation: LearningConversation | null = null;
let question = "";
let goal = "";
let mode = "question";
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
  source: () => LearningSource;
  selected: () => string[];
  active: () => boolean;
  accept: (text: string, provenance: string, source: LearningSource) => void;
  initial: (source: LearningSource) => void;
  status: (text: string) => void;
}
export function mountLearningAgent(container: HTMLElement, options: Options) {
  if (timer) clearTimeout(timer);
  const { client } = options;
  const act = async (fn: () => Promise<void> | void) => {
    try {
      await fn();
    } catch (error) {
      options.status(
        error instanceof Error ? error.message : "The agent request failed.",
      );
    }
  };
  const button = (text: string, fn: () => Promise<void> | void) => {
    const node = element("button", text);
    node.type = "button";
    node.addEventListener("click", () => void act(fn));
    return node;
  };
  const toolbar = element("div");
  const messages = element("div");
  messages.className = "learning-messages";
  messages.setAttribute("aria-live", "polite");
  container.append(
    element(
      "p",
      "Your agent supports your thinking. Choose a goal and the kind of help you want. Only this source and your selected notes enter the conversation.",
    ),
    toolbar,
    messages,
  );
  const demoSelect = element("select");
  const pageOption = element("option", "Current reading or captured passage");
  pageOption.value = "";
  demoSelect.append(pageOption);
  for (const demo of availableLearningDemos()) {
    const option = element("option", demo.title);
    option.value = demo.id;
    demoSelect.append(option);
  }
  const source = () => {
    if (!demoSelect.value) return options.source();
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
  const choose = element("select");
  choose.append(element("option", "Choose a saved conversation"));
  void act(async () => {
    const saved = await client.request<{ id: string; title: string }[]>(
      "/agent/conversations",
    );
    for (const item of saved) {
      const option = element("option", item.title);
      option.value = item.id;
      choose.append(option);
    }
    if (conversation) choose.value = conversation.id;
  });
  choose.addEventListener(
    "change",
    () =>
      void act(async () => {
        if (choose.value === "Choose a saved conversation") return;
        conversation = await client.request<LearningConversation>(
          `/agent/conversations/${choose.value}`,
        );
        draw();
        poll();
      }),
  );
  toolbar.append(
    field("Saved conversations", choose),
    button("New conversation", async () => {
      conversation = await client.request<LearningConversation>(
        "/agent/conversations",
        "POST",
        { source: source() },
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
  help.value = mode;
  help.addEventListener("change", () => {
    mode = help.value;
  });
  const goalInput = element("input");
  goalInput.maxLength = 1000;
  goalInput.value = goal;
  goalInput.addEventListener("input", () => {
    goal = goalInput.value;
  });
  const input = element("textarea");
  input.rows = 5;
  input.maxLength = 8000;
  input.value = question;
  input.addEventListener("input", () => {
    question = input.value;
  });
  container.append(
    field("My learning goal", goalInput),
    field("How I want help", help),
    field("Message to my agent", input),
    element(
      "p",
      `${options.selected().length} notebook notes selected for context. Change the selection in Notes.`,
    ),
  );
  container.append(
    button("Save initial thinking", () =>
      options.initial(conversation?.source ?? source()),
    ),
    button("Send to my agent", async () => {
      if (!question.trim()) {
        options.status("Write your question or initial explanation first.");
        return;
      }
      if (!conversation)
        conversation = await client.request<LearningConversation>(
          "/agent/conversations",
          "POST",
          { source: source() },
        );
      conversation = await client.request<LearningConversation>(
        `/agent/conversations/${conversation.id}`,
        "POST",
        { text: question, goal, mode, noteIds: options.selected(), browserId },
      );
      question = "";
      input.value = "";
      draw();
      poll();
    }),
    button("Stop reply", async () => {
      await client.request("/agent/stop", "POST", {});
      options.status("Stopped. Your saved thinking is retained.");
    }),
  );
  function draw() {
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
              ? "Agent suggestion"
              : "Browser observation",
        ),
      );
      const body = element("p", message.text);
      card.append(body);
      if (message.role === "agent")
        card.append(
          button("Use as a notebook draft", () =>
            options.accept(
              message.text,
              `Codex suggestion; conversation ${conversation!.id}; message ${message.id}; reviewed by student before saving`,
              conversation!.source,
            ),
          ),
        );
      messages.append(card);
    }
    if (conversation.state === "working")
      messages.append(
        element(
          "p",
          "Your agent is thinking. Demo changes will ask for your review.",
        ),
      );
    if (conversation.error) messages.append(element("p", conversation.error));
  }
  async function poll() {
    if (!options.active() || !conversation) return;
    const conversationId = conversation.id;
    try {
      const requests = await client.request<DemoToolRequest[]>(
        `/agent/requests?browser=${browserId}`,
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
                `Your agent proposes changing “${control.label}” in “${observed.title}” to ${JSON.stringify(request.arguments.value)}. Apply this change and report the actual observation?`,
              )
            )
              throw new Error("The student declined this demo change.");
            result = await changeLearningDemo(
              request.demoId,
              request.arguments,
            );
          }
          await client.request(`/agent/requests/${request.id}`, "POST", {
            browserId,
            success: true,
            result,
          });
        } catch (error) {
          await client.request(`/agent/requests/${request.id}`, "POST", {
            browserId,
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
      conversation = refreshed;
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
  if (conversation?.state === "working") void poll();
}
