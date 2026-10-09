import {
  type ReadingActivity,
  parseInvestigationTurn,
  type InvestigationObservation,
  type InvestigationPhase,
} from "../../shared/reading-investigation.ts";
import type { CompanionStatus } from "../../shared/learning-connection.ts";
import type {
  LearningConversation,
  DemoToolRequest,
} from "../../shared/learning-agent.ts";
import {
  sourceLink,
  type LearningSource,
  type AssistantHandoff,
  type NotebookHandoff,
} from "../../shared/learning-workspace.ts";
import { LearningClient, LearningConnectionError } from "./learning-client.ts";
import {
  readInvestigationDraft,
  saveInvestigationDraft,
  observeInvestigation,
  restoreInvestigationControls,
  describeObservation as describe,
} from "./learning-investigation-session.ts";
import { observeLearningDemo } from "./learning-demos.ts";
import { renderLearningReply } from "./learning-reply.ts";

const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = "") => {
  const result = document.createElement(tag);
  result.textContent = text;
  return result;
};
/** A scoped learning loop uses the coordinator's connection and explicit context only. */
export function mountReadingInvestigation(
  root: HTMLElement,
  options: {
    client: LearningClient;
    source: LearningSource;
    activity: ReadingActivity;
    handoff?: AssistantHandoff;
    phase?: InvestigationPhase;
    settings: () => void | Promise<void>;
    write: (draft: NotebookHandoff) => void | Promise<void>;
    disconnected: () => void;
    next: (source: LearningSource, takeaway: string, nextCheck: string) => void;
  },
) {
  const { client, activity } = options;
  const source = () => options.source;
  const draft = readInvestigationDraft(source(), activity);
  if (
    options.handoff &&
    (!draft.question.trim() ||
      window.confirm(
        "Replace this loop's unfinished question with the selected context? Your other loops are retained.",
      ))
  ) {
    draft.question = options.handoff.question.slice(0, 4000);
    draft.noteIds = options.handoff.noteIds.slice(0, 100);
    draft.phase = "experiment";
  }
  if (options.phase) draft.phase = options.phase;
  let status: CompanionStatus | null = null;
  let conversation: LearningConversation | null = null;
  let busy = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;
  let pollingKey: string | null = null;
  let disposed = false;
  const save = () => saveInvestigationDraft(draft, activity, !disposed);
  const start = root.querySelector<HTMLButtonElement>(
    "[data-investigation-start]",
  );
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
  const controlsLink = node(
    "a",
    activity.demoId
      ? `Return to ${activity.id === "queue-balance" ? "queue controls" : "activity"} ↑`
      : "Return to the source ↑",
  );
  controlsLink.href = sourceLink(source());
  const field = (
    label: string,
    name:
      | "system"
      | "prediction"
      | "question"
      | "takeaway"
      | "evidence"
      | "nextCheck",
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
    "Name a system, project or situation you want to understand.",
  );
  const prediction = field(
    "My prediction or uncertainty",
    "prediction",
    2000,
    "I think… / I expect… / I am unsure whether…",
  );
  const question = field(
    "What I noticed or want to ask (optional)",
    "question",
    4000,
    "What surprised you? What would you like help understanding?",
  );
  const takeaway = field(
    "My takeaway",
    "takeaway",
    4000,
    "Explain the idea in your own words, including one assumption to check.",
  );
  const evidence = field(
    "My check and evidence",
    "evidence",
    4000,
    "What did you try, read or observe? Identify a real result, a student report or a hypothetical example.",
  );
  const nextCheck = field(
    "My next independent check",
    "nextCheck",
    2000,
    "One question or action I can try without the assistant.",
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
    node("summary", "Shared context: this activity and my selections"),
    node(
      "p",
      "Sending shares the source shown here, your writing and any displayed demo snapshot with your companion’s provider. During a reply, only this activity’s demo can be inspected. Control changes never start a reply. Notebook entries are included only when explicitly handed off below.",
    ),
  );
  privacy.className = "reading-investigation-hint";
  const excerpt = node(
    "p",
    source().excerpt ||
      "This page’s title, source link and authored concepts; no page-wide capture.",
  );
  privacy.append(node("h3", "Selected source context"), excerpt);
  const selections = node("p");
  const clearSelections = button("Clear selected notes", () => {
    draft.noteIds = [];
    save();
    drawSelections();
  });
  privacy.append(selections, clearSelections);
  function drawSelections() {
    selections.textContent = draft.noteIds.length
      ? `${draft.noteIds.length} deliberately selected notebook entries will be supplied on send.`
      : "No notebook entries are selected.";
    clearSelections.hidden = !draft.noteIds.length;
  }
  drawSelections();
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
      title: `Learning takeaway: ${draft.system || source().title}`.slice(
        0,
        300,
      ),
      body: [
        draft.takeaway,
        draft.prediction ? `Initial thinking: ${draft.prediction}` : "",
        draft.evidence ? `My check and evidence: ${draft.evidence}` : "",
        draft.nextCheck ? `Next independent check: ${draft.nextCheck}` : "",
        draft.lastSent
          ? `Browser snapshot (${draft.lastSent.observedAt}): ${describe(draft.lastSent)}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 16_000),
      relatedIds: [...draft.noteIds],
      assistance: draft.conversationId
        ? `Student-written takeaway after learning activity ${activity.id} v${activity.version}; conversation ${draft.conversationId}; reviewed before saving`
        : null,
    });
  });
  const next = button("Start my next check", () => {
    if (!draft.nextCheck.trim()) {
      notice.textContent =
        "Write your next independent check first. This starts a new draft without saving or sending.";
      return;
    }
    options.next(source(), draft.takeaway, draft.nextCheck);
  });
  actions.append(send, explain, stop, write, next);
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
    if (start) {
      start.hidden = false;
      start.focus({ preventScroll: true });
    }
    root.dataset.paused = "true";
    document.dispatchEvent(new CustomEvent("book-cockpit-paused"));
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
    evidence.wrapper,
    nextCheck.wrapper,
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
    for (const control of [connect, check, setup, write, next, ...phases])
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
        ? "Restart the companion from the updated checkout to enable the learning cockpit. Your writing is retained."
        : status.provider
          ? `${status.provider} connected · Your learning loop stays beside the work.`
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
    evidence.wrapper.hidden = draft.phase === "predict";
    nextCheck.wrapper.hidden = draft.phase !== "reflect";
    takeaway.wrapper.hidden = draft.phase !== "reflect";
    write.hidden = draft.phase !== "reflect";
    next.hidden = draft.phase !== "reflect";
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
      if (!activity.demoId) throw new Error("No demo selected");
      draft.current = observeInvestigation(source(), activity);
      snapshot.textContent =
        activity.id === "queue-balance"
          ? `Current browser illustration: ${describe(draft.current)}`
          : `Current browser snapshot: ${describe(draft.current).slice(0, 1400)}`;
      save();
    } catch {
      snapshot.textContent = activity.demoId
        ? "This demo is hidden or unavailable. Open its Explore tab to share actual results, or ask for an explanation."
        : "Describe your check below. Reading, project and peer context do not imply a live browser experiment.";
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
        node("h3", "Adapted explanation · Teaching assistant"),
        renderLearningReply(latest.text),
      );
      const reference = node("a", "Read the authored explanation");
      reference.href = activity.reading
        ? new URL(activity.reading, location.origin).href
        : sourceLink(source());
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
          "h3",
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
      draft.noteIds = [];
      conversation = null;
      drawSelections();
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
    let observation: InvestigationObservation | undefined;
    try {
      observation = observeInvestigation(source(), activity);
    } catch {
      /* Explain without claiming execution. */
    }
    if (
      activity.demoId &&
      !observation &&
      !direct &&
      draft.phase === "experiment"
    ) {
      notice.textContent =
        "Open the demo’s Explore tab before sending a browser result. You can still choose Explain directly.";
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
        evidence: draft.evidence,
        nextCheck: draft.nextCheck,
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
            (observation
              ? "Compare this actual browser result with my earlier prediction and suggest one next check."
              : "Help me choose one check of my initial thinking using this source; no browser experiment is implied."),
        mode: direct
          ? "explanation"
          : draft.phase === "reflect"
            ? "reflect"
            : "check",
        supportNeed: "unspecified",
        goal: draft.system,
        browserId: draft.browserId,
        noteIds: [...draft.noteIds],
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
    if (disposed || !draft.open || !draft.conversationId) return;
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
              "The learning cockpit observes only its selected demo. The student operates controls; use the Teaching assistant for reviewed demo changes.",
            );
          observeInvestigation(source(), activity);
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
  const demo = activity.demoId
    ? document.getElementById(activity.demoId)
    : null;
  restoreInvestigationControls(draft, activity);
  demo?.addEventListener("input", drawSnapshot);
  demo?.addEventListener("change", drawSnapshot);
  demo?.addEventListener("click", drawSnapshot);
  const open = () => {
    draft.open = true;
    body.hidden = false;
    if (start) start.hidden = true;
    root.dataset.paused = "false";
    save();
    drawPhase();
    drawConnection();
    drawMessages();
    if (client.token) void act(checkConnection);
  };
  open();
  return {
    open,
    hasDraft: () =>
      [
        draft.prediction,
        draft.question,
        draft.takeaway,
        draft.evidence,
        draft.nextCheck,
      ].some((text) => text.trim()),
    dispose() {
      disposed = true;
      generation++;
      if (timer) clearTimeout(timer);
      demo?.removeEventListener("input", drawSnapshot);
      demo?.removeEventListener("change", drawSnapshot);
      demo?.removeEventListener("click", drawSnapshot);
      save();
      body.remove();
    },
  };
}
