import { createActor, setup, type StateValue } from "xstate";
import highlight from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import {
  deliveryMachineConfig,
  exportableDeliveryMachine,
  type DeliveryEvent,
  type DeliveryEventType,
} from "../../scripts/lib/delivery-statechart.ts";

highlight.registerLanguage("typescript", typescript);

const eventOrder: DeliveryEventType[] = [
  "PLAN_APPROVED",
  "PATCH_READY",
  "TESTS_PASS",
  "TESTS_FAIL",
  "REVIEW_START",
  "APPROVE",
  "REQUEST_CHANGES",
  "RELEASE",
  "CANCEL",
];

const deliveryMachine = setup({
  types: { events: {} as DeliveryEvent },
}).createMachine(deliveryMachineConfig);

// Patch labels identify the source in the ledger. The chart sees only the event type.
type Patch = "A" | "B";
const patchBCheckpoint: ReadonlyArray<[DeliveryEventType, Patch?]> = [
  ["PLAN_APPROVED"],
  ["PATCH_READY", "A"],
  ["TESTS_PASS", "A"],
  ["REVIEW_START", "A"],
  ["REQUEST_CHANGES", "A"],
  ["PATCH_READY", "B"],
  ["REVIEW_START", "B"],
  ["APPROVE", "B"],
];

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-statechart-demo]",
)) {
  initializeStatechartDemo(root);
}

function initializeStatechartDemo(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>(
    "[data-statechart-demo-form]",
  );
  const resetButton = root.querySelector<HTMLButtonElement>(
    "[data-statechart-demo-reset]",
  );
  const copyButton = root.querySelector<HTMLButtonElement>(
    "[data-statechart-demo-copy]",
  );
  const agentState = root.querySelector<HTMLElement>(
    "[data-statechart-demo-agent-state]",
  );
  const enabledEvents = root.querySelector<HTMLElement>(
    "[data-statechart-demo-events-enabled]",
  );
  const chart = root.querySelector<HTMLElement>("[data-statechart-demo-chart]");
  const result = root.querySelector<HTMLElement>(
    "[data-statechart-demo-result]",
  );
  const count = root.querySelector<HTMLElement>("[data-statechart-demo-count]");
  const history = root.querySelector<HTMLOListElement>(
    "[data-statechart-demo-history]",
  );
  const model = root.querySelector<HTMLElement>("[data-statechart-demo-model]");
  const checkpoint = root.querySelector<HTMLButtonElement>(
    "[data-statechart-demo-checkpoint]",
  );
  const prompt = root.querySelector<HTMLElement>(
    "[data-statechart-demo-prompt]",
  );
  const prediction = root.querySelector<HTMLSelectElement>(
    "[data-statechart-demo-prediction]",
  );
  const deliver = root.querySelector<HTMLButtonElement>(
    "[data-statechart-demo-deliver]",
  );
  const feedback = root.querySelector<HTMLElement>(
    "[data-statechart-demo-feedback]",
  );

  if (
    !form ||
    !resetButton ||
    !copyButton ||
    !agentState ||
    !enabledEvents ||
    !chart ||
    !result ||
    !count ||
    !history ||
    !model ||
    !checkpoint ||
    !prompt ||
    !prediction ||
    !deliver ||
    !feedback
  ) {
    return;
  }

  let actor = createDeliveryActor();
  const observed: Array<{
    event: DeliveryEventType;
    patch: Patch | undefined;
    state: string;
    accepted: boolean;
  }> = [];
  model.innerHTML = highlight.highlight(exportableDeliveryMachine, {
    language: "typescript",
  }).value;

  const render = () => {
    const snapshot = actor.getSnapshot();
    const stateValue = snapshot.value;
    const accepted = getAcceptedEvents(snapshot);

    for (const node of chart.querySelectorAll<HTMLElement>(
      "[data-state-path]",
    )) {
      const path = node.dataset.statePath?.split(".") ?? [];
      const current = hasStatePath(stateValue, path);
      node.classList.toggle("is-current", current);
      if (current && node.classList.contains("statechart-map-state")) {
        node.setAttribute("aria-current", "step");
      } else {
        node.removeAttribute("aria-current");
      }
    }

    agentState.textContent = readerState(stateValue);
    count.textContent = String(observed.length);
    resetButton.disabled = !observed.length;
    form.toggleAttribute("data-started", observed.length > 0);
    enabledEvents.innerHTML = accepted.length
      ? accepted
          .map(
            (event) =>
              `<button type="button" data-statechart-demo-event="${event}"><span>${event}</span></button>`,
          )
          .join("")
      : '<span class="statechart-no-events">Final state: no events enabled</span>';
    history.innerHTML = observed.length
      ? observed
          .map(
            (entry, index) =>
              `<li><span>${String(index + 1).padStart(2, "0")}</span><code>${entry.event}</code><small>${entry.patch ? `Patch ${entry.patch} · ` : ""}${entry.accepted ? "Accepted" : "Rejected; state unchanged"}: ${entry.state}</small></li>`,
          )
          .join("")
      : '<li class="is-empty">No events sent yet.</li>';
  };

  const applyEvent = (eventType: DeliveryEventType, patch?: Patch) => {
    const event = { type: eventType };
    const accepted = actor.getSnapshot().can(event);
    if (accepted) actor.send(event);
    observed.push({
      event: eventType,
      patch,
      state: formatStateValue(actor.getSnapshot().value),
      accepted,
    });
    return accepted;
  };

  const sendEvent = (eventType: DeliveryEventType) => {
    const accepted = applyEvent(eventType);
    if (accepted) prompt.hidden = true;
    render();
    if (!accepted) {
      result.textContent =
        actor.getSnapshot().status === "done"
          ? "RELEASE rejected. This run has ended."
          : "RELEASE rejected. Release needs passing checks and review approval.";
    } else if (eventType === "CANCEL") {
      result.textContent =
        "CANCEL accepted. The parent rule ends the run from any active state.";
    } else {
      result.textContent = `${eventType} accepted. ${agentState.textContent}.`;
    }
  };

  const restartActor = () => {
    actor.stop();
    actor = createDeliveryActor();
    observed.length = 0;
  };

  checkpoint.hidden = false;
  checkpoint.addEventListener("click", () => {
    restartActor();
    for (const [event, patch] of patchBCheckpoint) applyEvent(event, patch);
    render();
    prompt.hidden = false;
    prediction.value = "";
    prediction.disabled = false;
    deliver.disabled = true;
    feedback.textContent = "";
    result.textContent = "Checkpoint loaded. B’s checks are running.";
    prediction.focus();
  });
  prediction.addEventListener("change", () => {
    deliver.disabled = !prediction.value;
  });
  deliver.addEventListener("click", () => {
    applyEvent("TESTS_PASS", "A");
    render();
    const ready = actor.getSnapshot().can({ type: "RELEASE" });
    const expected =
      prediction.value === "ready"
        ? "You predicted B would be ready."
        : "You predicted B would wait.";
    const outcome = ready
      ? "The chart made B ready because TESTS_PASS arrived without a patch identity. A release workflow should wait for B’s own pass."
      : "The chart kept B waiting.";
    result.textContent = ready
      ? "TESTS_PASS accepted. B is ready."
      : "B is still waiting.";
    feedback.textContent = `${expected} ${outcome}`;
    prediction.disabled = true;
    deliver.disabled = true;
  });
  form.addEventListener("submit", (event) => event.preventDefault());
  enabledEvents.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-statechart-demo-event]",
    );
    const eventType = button?.dataset.statechartDemoEvent;

    if (isDeliveryEventType(eventType)) {
      sendEvent(eventType);
      const next = enabledEvents.querySelector<HTMLButtonElement>("button");
      (next ?? resetButton).focus({ preventScroll: true });
    }
  });
  resetButton.addEventListener("click", () => {
    restartActor();
    prompt.hidden = true;
    feedback.textContent = "";
    result.textContent = "";
    render();
    root
      .querySelector<HTMLButtonElement>(
        "[data-statechart-demo-propose-release]",
      )
      ?.focus({ preventScroll: true });
  });
  root
    .querySelector("[data-statechart-demo-propose-release]")
    ?.addEventListener("click", () => sendEvent("RELEASE"));
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(exportableDeliveryMachine);
      copyButton.textContent = "Copied";
      window.setTimeout(() => {
        copyButton.textContent = "Copy XState model";
      }, 1400);
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(model);
      selection?.removeAllRanges();
      selection?.addRange(range);
      copyButton.textContent = "Select text";
    }
  });

  render();
}

function createDeliveryActor() {
  return createActor(deliveryMachine).start();
}

function getAcceptedEvents(
  snapshot: ReturnType<
    typeof createDeliveryActor
  >["getSnapshot"] extends () => infer T
    ? T
    : never,
) {
  return eventOrder.filter((event) => snapshot.can({ type: event }));
}

function hasStatePath(value: StateValue, path: string[]): boolean {
  if (path.length === 0) {
    return false;
  }

  if (typeof value === "string") {
    return path.length === 1 && value === path[0];
  }

  const [head, ...tail] = path;
  const child = head ? value[head] : undefined;

  if (child === undefined) {
    return false;
  }

  return tail.length === 0 || hasStatePath(child, tail);
}

function formatStateValue(value: StateValue): string {
  if (typeof value === "string") {
    return value;
  }

  return Object.entries(value)
    .filter((entry): entry is [string, StateValue] => entry[1] !== undefined)
    .map(([key, child]) => `${key}.${formatStateValue(child)}`)
    .join(" + ");
}

// The history retains the full model paths. The header names the active leaves.
function readerState(value: StateValue) {
  return formatStateValue(value)
    .replace(/^active\.(?:verifying\.)?/, "")
    .split(" + ")
    .map(
      (path) =>
        path.charAt(0).toUpperCase() + path.slice(1).replaceAll(".", " "),
    )
    .join(" · ");
}

function isDeliveryEventType(
  value: string | undefined,
): value is DeliveryEventType {
  return Boolean(value && eventOrder.includes(value as DeliveryEventType));
}
