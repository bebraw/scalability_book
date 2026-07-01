type RequestTraceConditionKey =
  | "server-validation"
  | "client-retry"
  | "duplicate"
  | "db-timeout"
  | "queue"
  | "cache";

type RequestTraceNode = {
  label: string;
  boundary: string;
  responsibility: string;
  risk: string;
  contract: string;
};

type RequestTraceCondition = {
  label: string;
  impact: string;
  risk: string;
  contract: string;
};

const baseTraceNodes: RequestTraceNode[] = [
  {
    label: "Browser",
    boundary: "user device",
    responsibility: "Collect intent and send the event request.",
    risk: "The client can be stale, offline, interrupted, or untrusted.",
    contract: "Request payload and user-visible error behavior",
  },
  {
    label: "Network",
    boundary: "machine and latency",
    responsibility:
      "Carry the request and response across unreliable distance.",
    risk: "The client may not know whether the server received the request.",
    contract: "Timeout and retry policy",
  },
  {
    label: "API handler",
    boundary: "trust and ownership",
    responsibility:
      "Authenticate, validate, and decide whether the event is acceptable.",
    risk: "Client assumptions can drift from server rules.",
    contract: "POST /events schema and validation errors",
  },
  {
    label: "Database",
    boundary: "durability",
    responsibility: "Persist the raw event before derived views depend on it.",
    risk: "A slow or failed write can make success ambiguous.",
    contract: "Write success, idempotency, and transaction boundary",
  },
  {
    label: "Response",
    boundary: "client feedback",
    responsibility: "Tell the client what happened without exposing internals.",
    risk: "A vague response makes retry and user feedback unsafe.",
    contract: "Success, duplicate, validation, and retryable error shape",
  },
];

const conditionDetails: Record<
  RequestTraceConditionKey,
  RequestTraceCondition
> = {
  "server-validation": {
    label: "Server checks required fields",
    impact:
      "The API boundary owns correctness instead of trusting the browser.",
    risk: "Validation failures must be explicit enough for clients and agents to fix.",
    contract: "Schema, required fields, and validation error format",
  },
  "client-retry": {
    label: "Wi-Fi drops after submit",
    impact: "The network boundary can replay the same intent.",
    risk: "The server may process an event even when the client sees a timeout.",
    contract: "Retry policy and idempotency key",
  },
  duplicate: {
    label: "Student taps twice",
    impact: "Storage must distinguish a new fact from a repeated request.",
    risk: "Counts and summaries become wrong if duplicates are accepted as new events.",
    contract: "Duplicate detection and duplicate response semantics",
  },
  "db-timeout": {
    label: "Save takes too long",
    impact: "The API cannot always know whether persistence succeeded.",
    risk: "A timeout can create uncertain state between server, database, and client.",
    contract: "Retryable error, reconciliation, and write observability",
  },
  queue: {
    label: "Summary updates later",
    impact:
      "The request can finish before summaries and analytics are updated.",
    risk: "Users may see accepted events before derived views catch up.",
    contract: "Accepted vs processed status and freshness signal",
  },
  cache: {
    label: "Dashboard may show old count",
    impact: "Reads become faster but may not reflect the latest write.",
    risk: "The dashboard can disagree with the raw event store.",
    contract: "Cache freshness, invalidation, and stale-data label",
  },
};

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-request-trace-demo]",
)) {
  initializeRequestTraceDemo(root);
}

function initializeRequestTraceDemo(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>(
    "[data-request-trace-demo-form]",
  );
  const toggles = Array.from(
    root.querySelectorAll<HTMLInputElement>(
      "[data-request-trace-demo-condition]",
    ),
  );
  const path = root.querySelector<HTMLElement>(
    "[data-request-trace-demo-path]",
  );
  const flow = root.querySelector<HTMLElement>(
    "[data-request-trace-demo-flow]",
  );
  const metrics = Array.from(
    root.querySelectorAll<HTMLElement>("[data-request-trace-demo-metric]"),
  );
  const verdict = root.querySelector<HTMLElement>(
    "[data-request-trace-demo-verdict]",
  );
  const interpretation = root.querySelector<HTMLElement>(
    "[data-request-trace-demo-interpretation]",
  );
  const artifact = root.querySelector<HTMLTextAreaElement>(
    "[data-request-trace-demo-artifact]",
  );
  const copy = root.querySelector<HTMLButtonElement>(
    "[data-request-trace-demo-copy]",
  );
  const steps = Array.from(
    root.querySelectorAll<HTMLElement>("[data-request-trace-demo-step]"),
  );
  const tabs = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-request-trace-demo-tab]"),
  );
  const previous = root.querySelector<HTMLButtonElement>(
    "[data-request-trace-demo-prev]",
  );
  const next = root.querySelector<HTMLButtonElement>(
    "[data-request-trace-demo-next]",
  );

  if (
    !form ||
    !path ||
    !flow ||
    !verdict ||
    !interpretation ||
    !artifact ||
    !copy ||
    !previous ||
    !next ||
    steps.length === 0 ||
    tabs.length !== steps.length
  ) {
    return;
  }

  let currentStep = 0;
  let selectedBoundaryIndex = 0;
  const showStep = (step: number, focusStep = false) => {
    currentStep = Math.max(0, Math.min(step, steps.length - 1));
    updateRequestTraceStage(
      steps,
      tabs,
      previous,
      next,
      currentStep,
      focusStep,
    );
  };
  const render = () => {
    const selected = getSelectedConditions(toggles);
    const nodes = getRequestTraceNodes(selected);
    const result = analyzeRequestTrace(selected, nodes);
    selectedBoundaryIndex = Math.min(selectedBoundaryIndex, nodes.length - 1);

    flow.innerHTML = buildRequestTraceFlow(
      nodes,
      selected,
      selectedBoundaryIndex,
    );
    path.innerHTML = buildRequestTracePath(
      nodes,
      selected,
      selectedBoundaryIndex,
    );
    updateRequestTraceMetrics(metrics, result);
    verdict.textContent = `${result.boundaries}-step request path, ${result.riskLevel} risk`;
    interpretation.textContent = buildRequestTraceInterpretation(
      selected,
      result,
    );
    artifact.value = buildRequestTraceArtifact(selected, result);
    updateRequestTraceStage(steps, tabs, previous, next, currentStep, false);
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (currentStep < steps.length - 1) {
      showStep(currentStep + 1, true);
    }
  });
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  previous.addEventListener("click", () => showStep(currentStep - 1, true));
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => showStep(index, true));
  });
  flow.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-request-trace-demo-boundary-button]",
    );

    if (!button) {
      return;
    }

    selectedBoundaryIndex = Number(
      button.dataset.requestTraceDemoBoundaryButton,
    );
    render();
  });
  copy.addEventListener("click", async () => {
    artifact.select();

    try {
      await navigator.clipboard.writeText(artifact.value);
      copy.textContent = "Copied";
      window.setTimeout(() => {
        copy.textContent = "Copy brief";
      }, 1400);
    } catch {
      copy.textContent = "Select text";
    }
  });

  render();
  showStep(0);
}

function getSelectedConditions(inputs: HTMLInputElement[]) {
  return inputs
    .filter((input) => input.checked)
    .map((input) => input.value)
    .filter(isRequestTraceConditionKey);
}

function isRequestTraceConditionKey(
  value: string,
): value is RequestTraceConditionKey {
  return value in conditionDetails;
}

function analyzeRequestTrace(
  selected: RequestTraceConditionKey[],
  nodes: RequestTraceNode[],
) {
  const severeConditions = ["duplicate", "db-timeout"].filter((key) =>
    selected.includes(key as RequestTraceConditionKey),
  ).length;
  const riskLevel =
    severeConditions >= 2
      ? "high"
      : severeConditions === 1 || selected.includes("client-retry")
        ? "medium"
        : "low";
  const contract = selected.includes("duplicate")
    ? conditionDetails.duplicate.contract
    : selected.includes("client-retry")
      ? conditionDetails["client-retry"].contract
      : selected.includes("server-validation")
        ? conditionDetails["server-validation"].contract
        : (baseTraceNodes[2]?.contract ?? "POST /events contract");

  return {
    boundaries: nodes.length,
    path: formatRequestTracePath(nodes),
    riskLevel,
    contract,
  };
}

function getRequestTraceNodes(selected: RequestTraceConditionKey[]) {
  const nodes = [...baseTraceNodes];

  if (selected.includes("queue")) {
    nodes.splice(4, 0, {
      label: "Queue",
      boundary: "time",
      responsibility:
        "Move analytics and summaries out of the synchronous write path.",
      risk: conditionDetails.queue.risk,
      contract: conditionDetails.queue.contract,
    });
  }

  if (selected.includes("cache")) {
    nodes.push({
      label: "Dashboard cache",
      boundary: "freshness",
      responsibility:
        "Serve repeated dashboard reads without hitting storage every time.",
      risk: conditionDetails.cache.risk,
      contract: conditionDetails.cache.contract,
    });
  }

  return nodes;
}

function buildRequestTraceFlow(
  nodes: RequestTraceNode[],
  selected: RequestTraceConditionKey[],
  selectedIndex: number,
) {
  return nodes
    .map((node, index) => {
      const active = getNodeConditionKeys(node.label, selected).length > 0;

      return `<button type="button" class="request-trace-flow-node${active ? " is-active" : ""}${index === selectedIndex ? " is-selected" : ""}" data-request-trace-demo-boundary-button="${index}" aria-pressed="${index === selectedIndex ? "true" : "false"}">
        <span>${index + 1}</span>
        <strong>${escapeRequestTraceHtml(node.label)}</strong>
        <small>${escapeRequestTraceHtml(node.boundary)}</small>
      </button>`;
    })
    .join("");
}

function buildRequestTracePath(
  nodes: RequestTraceNode[],
  selected: RequestTraceConditionKey[],
  selectedIndex: number,
) {
  const node = nodes[selectedIndex] ?? nodes[0];

  if (!node) {
    return "";
  }

  const notes = getNodeConditionNotes(node.label, selected);

  return `<li class="request-trace-node">
    <span>${selectedIndex + 1}</span>
    <div>
      <strong>${escapeRequestTraceHtml(node.label)}</strong>
      <small>${escapeRequestTraceHtml(node.boundary)} boundary</small>
      <p>${escapeRequestTraceHtml(node.responsibility)}</p>
      <dl>
        <div>
          <dt>Risk</dt>
          <dd>${escapeRequestTraceHtml(node.risk)}</dd>
        </div>
        <div>
          <dt>Contract</dt>
          <dd>${escapeRequestTraceHtml(node.contract)}</dd>
        </div>
      </dl>
      ${notes}
    </div>
  </li>`;
}

function getNodeConditionNotes(
  label: string,
  selected: RequestTraceConditionKey[],
) {
  const notes = getNodeConditionKeys(label, selected);

  if (notes.length === 0) {
    return "";
  }

  return `<ul>${notes
    .map(
      (key) =>
        `<li>${escapeRequestTraceHtml(conditionDetails[key].impact)}</li>`,
    )
    .join("")}</ul>`;
}

function getNodeConditionKeys(
  label: string,
  selected: RequestTraceConditionKey[],
) {
  return selected.filter((key) => {
    if (label === "Browser") {
      return key === "client-retry";
    }

    if (label === "API handler") {
      return key === "server-validation";
    }

    if (label === "Database") {
      return key === "duplicate" || key === "db-timeout";
    }

    if (label === "Queue") {
      return key === "queue";
    }

    if (label === "Dashboard cache") {
      return key === "cache";
    }

    return false;
  });
}

function updateRequestTraceMetrics(
  nodes: HTMLElement[],
  result: ReturnType<typeof analyzeRequestTrace>,
) {
  nodes.forEach((node) => {
    const key = node.dataset.requestTraceDemoMetric;

    if (key === "path") {
      node.textContent = result.path;
    } else if (key === "risk") {
      node.textContent = result.riskLevel;
    } else if (key === "contract") {
      node.textContent = result.contract;
    }
  });
}

function buildRequestTraceInterpretation(
  selected: RequestTraceConditionKey[],
  result: ReturnType<typeof analyzeRequestTrace>,
) {
  if (selected.includes("db-timeout")) {
    return "The database timeout makes success ambiguous. The architecture needs a retryable error story and write observability.";
  }

  if (selected.includes("duplicate") || selected.includes("client-retry")) {
    return "Retries make the same user intent cross the API boundary more than once. Idempotency becomes part of the contract.";
  }

  return `The request path is ${result.path}. It crosses ${result.boundaries} ownership and failure boundaries. Write down the contract before later clients depend on accidental behavior.`;
}

function buildRequestTraceArtifact(
  selected: RequestTraceConditionKey[],
  result: ReturnType<typeof analyzeRequestTrace>,
) {
  const nodes = getRequestTraceNodes(selected);

  return [
    "Architecture boundary brief",
    "",
    "Request: POST /events",
    `Request path: ${result.path}`,
    `Boundary count: ${result.boundaries}`,
    `Highest risk: ${result.riskLevel}`,
    `Contract to write down: ${result.contract}`,
    "",
    "Trace:",
    ...nodes.map(
      (node) => `- ${node.label}: ${node.boundary} boundary; ${node.contract}`,
    ),
    "",
    "Selected conditions:",
    ...(selected.length > 0
      ? selected.map((key) => {
          const condition = conditionDetails[key];

          return `- ${condition.label}: ${condition.contract}`;
        })
      : ["- none"]),
    "",
    "Architecture rule:",
    "A web request is not a local function call. Each boundary needs an owner, failure story, and written contract.",
  ].join("\n");
}

function formatRequestTracePath(nodes: RequestTraceNode[]) {
  return nodes.map((node) => node.label).join(" -> ");
}

function updateRequestTraceStage(
  steps: HTMLElement[],
  tabs: HTMLButtonElement[],
  previous: HTMLButtonElement,
  next: HTMLButtonElement,
  currentStep: number,
  focusStep: boolean,
) {
  const finalStep = steps.length - 1;

  steps.forEach((step, index) => {
    const active = index === currentStep;

    step.hidden = !active;
    step.classList.toggle("is-active", active);
    step.setAttribute("aria-hidden", String(!active));
  });
  tabs.forEach((tab, index) => {
    const active = index === currentStep;

    if (active) {
      tab.setAttribute("aria-current", "step");
    } else {
      tab.removeAttribute("aria-current");
    }

    tab.classList.toggle("is-active", active);
    tab.classList.toggle("is-complete", index < currentStep);
  });
  previous.disabled = currentStep === 0;
  next.textContent = currentStep === finalStep ? "Done" : "Next";
  next.disabled = currentStep === finalStep;

  if (focusStep) {
    requestAnimationFrame(() => {
      steps[currentStep]
        ?.querySelector<HTMLElement>("input, textarea, button")
        ?.focus({ preventScroll: true });
    });
  }
}

function escapeRequestTraceHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
