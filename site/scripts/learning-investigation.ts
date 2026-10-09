import {
  queueInvestigation as activity,
  parseInvestigationTurn,
  type QueueObservation,
} from "../../shared/reading-investigation.ts";
import type { CompanionStatus } from "../../shared/learning-connection.ts";
import type {
  LearningConversation,
  DemoToolRequest,
} from "../../shared/learning-agent.ts";
import type { NotebookHandoff } from "../../shared/learning-workspace.ts";
import { LearningClient, LearningConnectionError } from "./learning-client.ts";
import {
  investigationSource as source,
  readInvestigationDraft,
  saveInvestigationDraft,
  observeQueue,
  describeQueue as describe,
} from "./learning-investigation-session.ts";
import { observeLearningDemo } from "./learning-demos.ts";
import { renderLearningReply } from "./learning-reply.ts";

const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = "") => {
  const result = document.createElement(tag);
  result.textContent = text;
  return result;
};
/** One inline activity uses the coordinator's client; it never reads notebook entries. */
export function mountReadingInvestigation(
  root: HTMLElement,
  options: {
    client: LearningClient;
    settings: () => void | Promise<void>;
    write: (draft: NotebookHandoff) => void | Promise<void>;
    disconnected: () => void;
  },
) {
  const { client } = options;
  const draft = readInvestigationDraft();
  let status: CompanionStatus | null = null;
  let conversation: LearningConversation | null = null;
  let busy = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;
  let pollingKey: string | null = null;
  const save = () => saveInvestigationDraft(draft);
  const start = root.querySelector<HTMLButtonElement>(
    "[data-investigation-start]",
  )!;
  const body = node("div");
  body.className = "reading-investigation-body";
  const notice = node("p");
  notice.setAttribute("role", "status");
  const act = async (action: () => Promise<void> | void) => {
    if (busy) return;
    busy = true;
    updateButtons();
    notice.textContent = "";
    try {
      await action();
    } catch (error) {
      notice.textContent =
        error instanceof Error
          ? error.message
          : "The investigation could not continue. Your writing is retained.";
      if (error instanceof LearningConnectionError) {
        status = null;
        options.disconnected();
      }
    } finally {
      busy = false;
      updateButtons();
      drawConnection();
    }
  };
  const button = (label: string, action: () => Promise<void> | void) => {
    const result = node("button", label);
    result.type = "button";
    result.addEventListener("click", () => void act(action));
    return result;
  };
  const connection = node("div");
  connection.className = "reading-investigation-connection";
  const address = node("input");
  address.type = "url";
  address.value = client.base;
  address.setAttribute("aria-label", "Investigation companion address");
  const connect = button("Connect companion", async () => {
    await client.connect(address.value);
    await checkConnection();
  });
  const check = button("Check connection", checkConnection);
  const setup = button("Connection settings", options.settings);
  const connectionText = node("p");
  connection.append(connectionText, address, connect, check, setup);
  const steps = node("ol");
  steps.className = "reading-investigation-steps";
  const phases = activity.phases.map(({ id }, index) => {
    const item = node("li");
    const change = button(
      `${String(index + 1).padStart(2, "0")} / ${{ predict: "Predict", experiment: "Experiment", reflect: "Reflect" }[id]}`,
      () => {
        draft.phase = id;
        save();
        drawPhase();
      },
    );
    item.append(change);
    steps.append(item);
    return change;
  });
  const prompt = node("p");
  prompt.className = "reading-investigation-prompt";
  const controlsLink = node("a", "Return to queue controls ↑");
  controlsLink.href = `#${activity.demoId}`;
  const field = (
    label: string,
    name: "system" | "prediction" | "question" | "takeaway",
    maximum: number,
    placeholder: string,
  ) => {
    const wrapper = node("label");
    const input = node("textarea");
    input.rows = name === "system" ? 2 : 3;
    input.maxLength = maximum;
    input.placeholder = placeholder;
    input.value = draft[name];
    input.addEventListener("input", () => {
      draft[name] = input.value;
      save();
    });
    wrapper.append(node("span", label), input);
    return { wrapper, input };
  };
  const system = field(
    "A system I want to understand (optional)",
    "system",
    1000,
    "For example, incoming requests waiting for a database connection.",
  );
  const prediction = field(
    "My prediction or uncertainty",
    "prediction",
    2000,
    "If average time doubles while arrivals stay steady, I think…",
  );
  const question = field(
    "What I noticed or want to ask (optional)",
    "question",
    4000,
    "Which value surprised you? You can also ask for a direct explanation.",
  );
  const takeaway = field(
    "My takeaway",
    "takeaway",
    4000,
    "Explain the idea in your own words, including one assumption to check.",
  );
  const snapshot = node("p");
  snapshot.className = "reading-investigation-observation";
  const previous = node("details");
  const previousText = node("p");
  previous.append(
    node("summary", "Last result sent to the assistant"),
    previousText,
  );
  const privacy = node("details");
  privacy.append(
    node("summary", "Shared context: this activity and queue"),
    node(
      "p",
      "Sending shares this activity, your writing and the displayed queue values with your companion's provider. During that reply, the assistant can also inspect this queue. No notebook entries are selected. Moving a slider never starts a reply.",
    ),
  );
  privacy.className = "reading-investigation-hint";
  const actions = node("div");
  actions.className = "reading-investigation-actions";
  const send = button("Discuss my prediction", () => sendTurn(false));
  const explain = button("Explain directly", () => sendTurn(true));
  const stop = button("Stop reply", async () => {
    await client.request("/agent/stop", "POST", {});
    await poll();
  });
  const reset = button("Start a new conversation", () => {
    generation++;
    if (timer) clearTimeout(timer);
    conversation = null;
    draft.conversationId = null;
    save();
    drawMessages();
  });
  const write = button("Prepare notebook takeaway", async () => {
    if (!draft.takeaway.trim()) {
      notice.textContent = "Write your takeaway first.";
      return;
    }
    await options.write({
      source: source(),
      kind: "reflection",
      title: `Queue investigation: ${draft.system || "Little's Law"}`.slice(
        0,
        300,
      ),
      body: `${draft.takeaway}\n\n${draft.prediction ? `Initial thinking: ${draft.prediction}\n\n` : ""}${draft.lastSent ? `Browser illustration (${draft.lastSent.observedAt}): ${describe(draft.lastSent)}` : ""}`.trim(),
      relatedIds: [],
      assistance: draft.conversationId
        ? `Student-written takeaway after inline activity ${activity.id} v${activity.version}; conversation ${draft.conversationId}; reviewed before saving`
        : null,
    });
  });
  actions.append(send, explain, stop, write);
  const messages = node("div");
  messages.className = "reading-investigation-messages";
  messages.setAttribute("aria-live", "polite");
  const history = node("details");
  history.append(node("summary", "Conversation history"));
  const historyBody = node("div");
  history.append(historyBody, reset);
  const close = button("Pause this exploration", () => {
    draft.open = false;
    generation++;
    if (timer) clearTimeout(timer);
    save();
    body.hidden = true;
    start.hidden = false;
    start.focus({ preventScroll: true });
  });
  body.append(
    connection,
    steps,
    prompt,
    controlsLink,
    system.wrapper,
    prediction.wrapper,
    snapshot,
    previous,
    question.wrapper,
    takeaway.wrapper,
    privacy,
    actions,
    notice,
    messages,
    history,
    close,
  );
  root.append(body);
  function supported() {
    return Boolean(
      status?.provider &&
      status.readingActivities?.some(
        ({ id, version }) => id === activity.id && version === activity.version,
      ),
    );
  }
  function updateButtons() {
    const working = conversation?.state === "working";
    for (const control of [send, explain])
      control.disabled = busy || Boolean(working) || !supported();
    for (const control of [connect, check, setup, write, ...phases])
      control.disabled = busy;
    stop.hidden = !working;
    stop.disabled = busy;
    reset.disabled = busy || Boolean(working);
  }
  function drawConnection() {
    address.hidden = Boolean(status);
    connect.hidden = Boolean(status);
    check.hidden = !client.token;
    connectionText.textContent = !status
      ? "Connect your local companion to explore this passage."
      : !status.readingActivities?.some(
            ({ id, version }) =>
              id === activity.id && version === activity.version,
          )
        ? "Restart the companion from the updated checkout to enable inline explorations. Your writing is retained."
        : status.provider
          ? `${status.provider} connected · Your exploration stays in this reading.`
          : "Notebook-only connection. Enable Codex or a local model in Connection settings, then check the connection again.";
  }
  function drawPhase() {
    const phase = activity.phases.find(({ id }) => id === draft.phase)!;
    prompt.textContent = phase.prompt;
    phases.forEach((control, i) =>
      control.setAttribute(
        "aria-current",
        String(activity.phases[i]!.id === draft.phase),
      ),
    );
    system.wrapper.hidden = prediction.wrapper.hidden =
      draft.phase !== "predict";
    question.wrapper.hidden = draft.phase === "predict";
    controlsLink.hidden = draft.phase !== "experiment";
    takeaway.wrapper.hidden = draft.phase !== "reflect";
    write.hidden = draft.phase !== "reflect";
    send.textContent =
      draft.phase === "predict"
        ? "Discuss my prediction"
        : draft.phase === "experiment"
          ? "Discuss this result"
          : "Discuss my takeaway";
    drawSnapshot();
  }
  function drawSnapshot() {
    try {
      draft.current = observeQueue();
      snapshot.textContent = `Current browser illustration: ${describe(draft.current)}`;
      save();
    } catch {
      snapshot.textContent =
        "The queue is unavailable in this browser. You can still ask for an explanation.";
    }
    previous.hidden = !draft.lastSent;
    previousText.textContent = draft.lastSent
      ? `${describe(draft.lastSent)} Captured ${new Date(draft.lastSent.observedAt).toLocaleString()}. Later control changes have not been sent.`
      : "";
  }
  function drawMessages() {
    messages.replaceChildren();
    historyBody.replaceChildren();
    const replies =
      conversation?.messages.filter(({ role }) => role === "agent") ?? [];
    const latest = replies.at(-1);
    if (latest) {
      messages.append(
        node("h4", "Adapted explanation · Teaching assistant"),
        renderLearningReply(latest.text),
      );
      const reference = node("a", "Read the authored explanation");
      reference.href = new URL(activity.reading, location.origin).href;
      messages.append(reference);
      const about = node("details");
      about.append(
        node("summary", "About this explanation"),
        node(
          "p",
          latest.teaching
            ? `${latest.teaching.provider.name} · policy ${latest.teaching.policy.id} v${latest.teaching.policy.version}. Generated guidance; check it against the authored passage.`
            : "Generated guidance; policy metadata was not recorded. Check it against the authored passage.",
        ),
      );
      messages.append(about);
      for (const item of latest.notices ?? []) messages.append(node("p", item));
    }
    for (const message of conversation?.messages ?? []) {
      const card = node("article");
      card.append(
        node(
          "h4",
          message.role === "student"
            ? "Your thinking"
            : message.role === "agent"
              ? "Teaching assistant"
              : "Browser observation",
        ),
        message.role === "agent"
          ? renderLearningReply(message.text)
          : node("p", message.text),
      );
      if (message.investigation?.observation)
        card.append(node("p", describe(message.investigation.observation)));
      historyBody.append(card);
    }
    if (conversation?.state === "working")
      messages.append(node("p", "Your assistant is considering this step…"));
    if (conversation?.error) messages.append(node("p", conversation.error));
    history.hidden = !conversation;
    updateButtons();
  }
  async function checkConnection() {
    status = await client.status();
    if (draft.companionBase && draft.companionBase !== client.base) {
      draft.conversationId = null;
      conversation = null;
    }
    draft.companionBase = client.base;
    address.value = client.base;
    save();
    if (draft.conversationId) await poll();
    drawConnection();
  }
  async function sendTurn(direct: boolean) {
    const text =
      draft.phase === "predict"
        ? draft.prediction
        : draft.phase === "reflect"
          ? [draft.takeaway, draft.question].filter(Boolean).join("\n\n")
          : draft.question;
    if (!direct && draft.phase === "predict" && !text.trim()) {
      notice.textContent =
        "Write a prediction or an uncertainty, or choose Explain directly.";
      return;
    }
    if (!supported()) return;
    let observation: QueueObservation | undefined;
    try {
      observation = observeQueue();
    } catch {
      /* Explain without claiming execution. */
    }
    if (!observation && !direct && draft.phase === "experiment") {
      notice.textContent =
        "Open the queue's Explore tab before sending a browser result. You can still choose Explain directly.";
      return;
    }
    if (!conversation) {
      conversation = await client.request<LearningConversation>(
        "/agent/conversations",
        "POST",
        { source: source() },
      );
      draft.conversationId = conversation.id;
      save();
    }
    const turn = parseInvestigationTurn(
      {
        activityId: activity.id,
        version: activity.version,
        phase: draft.phase,
        system: draft.system,
        prediction: draft.prediction,
        observation,
      },
      source(),
    );
    conversation = await client.request<LearningConversation>(
      `/agent/conversations/${conversation.id}`,
      "POST",
      {
        text: direct
          ? `Please explain directly. ${observation ? "" : "No current browser observation is available; do not infer a new result. "}${text}`
          : text ||
            "Compare this actual browser result with my earlier prediction and suggest one next check.",
        mode: direct
          ? "explanation"
          : draft.phase === "reflect"
            ? "reflect"
            : "check",
        supportNeed: "unspecified",
        goal: draft.system,
        browserId: draft.browserId,
        noteIds: [],
        investigation: turn,
      },
    );
    draft.lastSent = observation;
    if (draft.phase === "predict") draft.phase = "experiment";
    save();
    drawPhase();
    drawMessages();
    void poll();
  }
  async function poll() {
    if (!draft.open || !draft.conversationId) return;
    const epoch = generation;
    const id = draft.conversationId;
    const currentKey = `${id}:${epoch}`;
    if (pollingKey === currentKey) return;
    pollingKey = currentKey;
    if (timer) clearTimeout(timer);
    try {
      const requests = await client.request<DemoToolRequest[]>(
        `/agent/requests?browser=${draft.browserId}`,
      );
      if (!draft.open || epoch !== generation) return;
      for (const request of requests) {
        if (request.conversationId !== id) continue;
        let result: unknown;
        let error = "";
        try {
          if (
            request.demoId !== activity.demoId ||
            request.tool !== "observe_demo"
          )
            throw new Error(
              "This inline activity observes only its queue lab. The student operates its controls; use the Teaching assistant for reviewed demo changes.",
            );
          observeQueue();
          result = observeLearningDemo(activity.demoId);
        } catch (failure) {
          error =
            failure instanceof Error ? failure.message : "Demo unavailable.";
        }
        await client.request(`/agent/requests/${request.id}`, "POST", {
          browserId: draft.browserId,
          success: !error,
          ...(error ? { message: error } : { result }),
        });
      }
      const updated = await client.request<LearningConversation>(
        `/agent/conversations/${id}`,
      );
      if (!draft.open || epoch !== generation || draft.conversationId !== id)
        return;
      conversation = updated;
      drawMessages();
      if (conversation.state === "working")
        timer = setTimeout(() => void poll(), 1000);
    } catch (error) {
      notice.textContent =
        error instanceof Error
          ? error.message
          : "Check the connection to resume. Your writing is retained.";
      if (error instanceof LearningConnectionError) {
        status = null;
        options.disconnected();
        drawConnection();
        updateButtons();
      }
    } finally {
      if (pollingKey === currentKey) pollingKey = null;
    }
  }
  const demo = document.getElementById(activity.demoId)!;
  // Restore only student-operated, validated values; no provider request is sent.
  if (draft.current)
    for (const name of ["arrival", "time", "observed"] as const) {
      const input = demo.querySelector<HTMLInputElement>(
        `[data-little-law-input="${name}"]`,
      )!;
      input.value = String(draft.current[name]);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  demo.addEventListener("input", drawSnapshot);
  const open = () => {
    draft.open = true;
    body.hidden = false;
    start.hidden = true;
    save();
    drawPhase();
    drawConnection();
    drawMessages();
    if (client.token) void act(checkConnection);
  };
  open();
  return { open };
}
