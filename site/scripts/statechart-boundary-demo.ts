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
  const configuration = root.querySelector<HTMLElement>(
    "[data-statechart-demo-configuration]",
  );
  const explanation = root.querySelector<HTMLElement>(
    "[data-statechart-demo-explanation]",
  );
  const verdict = root.querySelector<HTMLElement>(
    "[data-statechart-demo-verdict]",
  );
  const summary = root.querySelector<HTMLElement>(
    "[data-statechart-demo-summary]",
  );
  const history = root.querySelector<HTMLOListElement>(
    "[data-statechart-demo-history]",
  );
  const model = root.querySelector<HTMLElement>("[data-statechart-demo-model]");

  if (
    !form ||
    !resetButton ||
    !copyButton ||
    !agentState ||
    !enabledEvents ||
    !configuration ||
    !explanation ||
    !verdict ||
    !summary ||
    !history ||
    !model
  ) {
    return;
  }

  let actor = createDeliveryActor();
  const observed: Array<{ event: DeliveryEventType; state: string }> = [];
  model.innerHTML = highlight.highlight(exportableDeliveryMachine, {
    language: "typescript",
  }).value;

  const render = () => {
    const snapshot = actor.getSnapshot();
    const stateValue = snapshot.value;
    const accepted = getAcceptedEvents(snapshot);

    for (const node of root.querySelectorAll<HTMLElement>(
      "[data-state-path]",
    )) {
      const path = node.dataset.statePath?.split(".") ?? [];
      node.classList.toggle("is-current", hasStatePath(stateValue, path));
    }

    const configurationText = formatStateValue(stateValue);
    agentState.textContent = configurationText;
    configuration.textContent = configurationText;
    enabledEvents.innerHTML = accepted.length
      ? accepted
          .map(
            (event) =>
              `<button type="button" data-statechart-demo-event="${event}"><span>${event}</span></button>`,
          )
          .join("")
      : '<span class="statechart-no-events">Final state: no events enabled</span>';
    verdict.textContent = buildVerdict(stateValue);
    summary.textContent = `${accepted.length} legal event${accepted.length === 1 ? "" : "s"} exposed to the agent.`;
    explanation.textContent = buildExplanation(stateValue);
    history.innerHTML = observed.length
      ? observed
          .map(
            (entry, index) =>
              `<li><span>${String(index + 1).padStart(2, "0")}</span><code>${entry.event}</code><small>${entry.state}</small></li>`,
          )
          .join("")
      : '<li class="is-empty">No events sent yet.</li>';
  };

  const sendEvent = (eventType: DeliveryEventType) => {
    const snapshot = actor.getSnapshot();

    if (!snapshot.can({ type: eventType })) {
      return;
    }

    actor.send({ type: eventType });
    observed.push({
      event: eventType,
      state: formatStateValue(actor.getSnapshot().value),
    });
    render();
  };

  const reset = () => {
    actor.stop();
    actor = createDeliveryActor();
    observed.length = 0;
    render();
  };

  form.addEventListener("submit", (event) => event.preventDefault());
  enabledEvents.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-statechart-demo-event]",
    );
    const eventType = button?.dataset.statechartDemoEvent;

    if (isDeliveryEventType(eventType)) {
      sendEvent(eventType);
    }
  });
  resetButton.addEventListener("click", reset);
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(exportableDeliveryMachine);
      copyButton.textContent = "Copied";
      window.setTimeout(() => {
        copyButton.textContent = "Copy model";
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

function buildVerdict(value: StateValue) {
  if (hasStatePath(value, ["released"])) {
    return "Goal reached: change released";
  }
  if (hasStatePath(value, ["cancelled"])) {
    return "Run cancelled safely";
  }
  if (hasStatePath(value, ["active", "verifying"])) {
    return "Two verification regions active";
  }
  return "Goal: ship a safe change";
}

function buildExplanation(value: StateValue) {
  if (hasStatePath(value, ["active", "verifying"])) {
    return "Tests and review advance independently without inventing combined boolean states.";
  }
  if (hasStatePath(value, ["active", "ready"])) {
    return "The parallel state completes only after checks pass and review approves.";
  }
  if (hasStatePath(value, ["released"])) {
    return "Release became available only after the deterministic completion condition.";
  }
  if (hasStatePath(value, ["cancelled"])) {
    return "One CANCEL transition on the parent handled every active child state.";
  }
  if (hasStatePath(value, ["active", "implementing"])) {
    return "A failed check or review can return here without adding duplicate recovery rules.";
  }
  return "The parent state exposes one shared cancellation rule.";
}

function isDeliveryEventType(
  value: string | undefined,
): value is DeliveryEventType {
  return Boolean(value && eventOrder.includes(value as DeliveryEventType));
}
