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
  rule: string;
};

type RequestTraceCondition = {
  label: string;
  impact: string;
  risk: string;
  rule: string;
};

const baseTraceNodes: RequestTraceNode[] = [
  {
    label: "Browser",
    boundary: "user device",
    responsibility:
      "Collect the intent to start item-42 and send a transition request.",
    risk: "The client can be stale, offline, interrupted, or untrusted.",
    rule: "Send to=in_progress, the declared actor, and commandId=start-42; reuse that command id for retries of this intent.",
  },
  {
    label: "Network",
    boundary: "machine and latency",
    responsibility:
      "Carry the request and response across unreliable distance.",
    risk: "The client may not know whether the server received the request.",
    rule: "Retry timeouts with the same idempotency key.",
  },
  {
    label: "API handler",
    boundary: "trust and ownership",
    responsibility:
      "Resolve the actor and workspace, check access, and validate the requested lifecycle transition.",
    risk: "Client assumptions can drift from server rules.",
    rule: "Reject missing fields or an unsupported transition without changing item state or successful-event history.",
  },
  {
    label: "Database",
    boundary: "durability",
    responsibility:
      "Commit the item state, matching activity event, and reusable command result together.",
    risk: "A slow or failed write can make success ambiguous.",
    rule: "Atomically move open to in_progress and record one work_started event with its workspace, item, actor, and time. Bind the command key to its caller and arguments; return its stored result on replay and reject conflicting reuse.",
  },
  {
    label: "Response",
    boundary: "client feedback",
    responsibility: "Tell the client what happened without exposing internals.",
    risk: "A vague response makes retry and user feedback unsafe.",
    rule: "Confirm success only after the state and event commit; distinguish a replayed result, rejection, and unconfirmed outcome.",
  },
];

const conditionDetails: Record<
  RequestTraceConditionKey,
  RequestTraceCondition
> = {
  "server-validation": {
    label: "Server checks fields and lifecycle",
    impact:
      "The API boundary owns correctness instead of trusting the browser.",
    risk: "Validation failures must be explicit enough for clients and agents to fix.",
    rule: "Check required fields and the current lifecycle state before committing; a rejected transition changes neither state nor successful-event history.",
  },
  "client-retry": {
    label: "Wi-Fi drops after submit",
    impact: "The network boundary can replay the same intent.",
    risk: "The server may commit the state and event even when the client sees a timeout.",
    rule: "Retry the same command id and arguments so a lost response cannot cause a second state change or activity event.",
  },
  duplicate: {
    label: "You tap twice",
    impact:
      "Storage must distinguish a replayed command from a distinct action.",
    risk: "Concurrent requests can both observe open unless the lifecycle check and write are coordinated.",
    rule: "Return the stored result for a repeated command id. A distinct start command must still pass the authoritative lifecycle check; it cannot create a second work_started event.",
  },
  "db-timeout": {
    label: "Save takes too long",
    impact: "The API cannot always know whether persistence succeeded.",
    risk: "A timeout can create uncertain state between server, database, and client.",
    rule: "Report the outcome as unconfirmed, then reconcile or retry with the same command id; a timeout does not prove that the transaction failed.",
  },
  queue: {
    label: "Summary updates later",
    impact:
      "The request can finish after the state and event commit while summaries catch up.",
    risk: "A delayed summary can disagree with committed work-item state and activity history.",
    rule: "Defer only derived summary work. Recover it from committed events, make processing retry-safe, and expose its freshness separately from transition success.",
  },
  cache: {
    label: "Dashboard may show old count",
    impact: "Reads become faster but may not reflect the latest write.",
    risk: "The dashboard can disagree with committed state and activity history.",
    rule: "Show the dashboard freshness time and invalidate after accepted writes.",
  },
};

const rulePriority: RequestTraceConditionKey[] = [
  "duplicate",
  "db-timeout",
  "client-retry",
  "server-validation",
  "queue",
  "cache",
];

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

  if (
    !form ||
    !path ||
    !flow ||
    !verdict ||
    !interpretation ||
    !artifact ||
    !copy
  ) {
    return;
  }

  let selectedBoundaryIndex = 0;
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
    verdict.textContent = `${result.boundaries} steps / ${result.riskLevel} risk`;
    interpretation.textContent = buildRequestTraceInterpretation(
      selected,
      result,
    );
    artifact.value = buildRequestTraceArtifact(selected, result);
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });
  form.addEventListener("input", render);
  form.addEventListener("change", render);
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
  const rules =
    selected.length > 0
      ? rulePriority
          .filter((key) => selected.includes(key))
          .map((key) => conditionDetails[key].rule)
      : [baseTraceNodes[2]?.rule ?? "Validate the transition before writing."];

  return {
    boundaries: nodes.length,
    path: formatRequestTracePath(nodes),
    riskLevel,
    rules,
  };
}

function getRequestTraceNodes(selected: RequestTraceConditionKey[]) {
  const nodes = [...baseTraceNodes];

  if (selected.includes("queue")) {
    nodes.splice(4, 0, {
      label: "Queue",
      boundary: "time",
      responsibility:
        "Process summaries from committed activity events; keep the state-and-event commit synchronous.",
      risk: conditionDetails.queue.risk,
      rule: conditionDetails.queue.rule,
    });
  }

  if (selected.includes("cache")) {
    nodes.push({
      label: "Dashboard cache",
      boundary: "freshness",
      responsibility:
        "Serve repeated dashboard reads without hitting storage every time.",
      risk: conditionDetails.cache.risk,
      rule: conditionDetails.cache.rule,
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
          <dt>Rule</dt>
          <dd>${escapeRequestTraceHtml(node.rule)}</dd>
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
    } else if (key === "rules") {
      node.innerHTML = buildRequestTraceRuleList(result.rules);
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
    return "Retries make the same user intent cross the API boundary more than once. The concrete rule is to reuse one idempotency key for that intent.";
  }

  return `The request path is ${result.path}. It crosses ${result.boundaries} ownership and failure boundaries. Turn the most fragile boundary into an implementable rule before clients depend on accidental behavior.`;
}

function buildRequestTraceRuleList(rules: string[]) {
  const [primaryRule, ...secondaryRules] = rules;

  if (!primaryRule) {
    return "";
  }

  const secondaryCount = secondaryRules.length;
  const summary =
    secondaryCount > 0
      ? `<span>${secondaryCount} more ${secondaryCount === 1 ? "rule" : "rules"}</span>`
      : "";
  const details =
    secondaryCount > 0
      ? `<details class="request-trace-rules-detail">
          <summary>Show remaining</summary>
          <ol class="request-trace-rules">${secondaryRules
            .map((rule) => `<li>${escapeRequestTraceHtml(rule)}</li>`)
            .join("")}</ol>
        </details>`
      : "";

  return `<div class="request-trace-rule-primary">
    <strong>${escapeRequestTraceHtml(primaryRule)}</strong>
    ${summary}
  </div>${details}`;
}

function buildRequestTraceArtifact(
  selected: RequestTraceConditionKey[],
  result: ReturnType<typeof analyzeRequestTrace>,
) {
  const nodes = getRequestTraceNodes(selected);

  return [
    "Architecture boundary brief",
    "",
    "Request: POST /work-items/item-42/transitions",
    "Intent: start item-42 in workspace-9; to=in_progress, actor=student-7, commandId=start-42.",
    "Success boundary: the state change, work_started event, and reusable command result commit together.",
    `Request path: ${result.path}`,
    `Boundary count: ${result.boundaries}`,
    `Highest risk: ${result.riskLevel}`,
    "Rules to implement:",
    ...result.rules.map((rule) => `- ${rule}`),
    "",
    "Trace:",
    ...nodes.map(
      (node) => `- ${node.label}: ${node.boundary} boundary; ${node.rule}`,
    ),
    "",
    "Selected conditions:",
    ...(selected.length > 0
      ? selected.map((key) => {
          const condition = conditionDetails[key];

          return `- ${condition.label}: ${condition.rule}`;
        })
      : ["- none"]),
    "",
    "Architecture rule:",
    "A web request is not a local function call. Each boundary needs an owner, failure story, and implementable rule.",
  ].join("\n");
}

function formatRequestTracePath(nodes: RequestTraceNode[]) {
  return nodes.map((node) => node.label).join(" -> ");
}

function escapeRequestTraceHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
