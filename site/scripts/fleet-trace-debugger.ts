type FleetTraceRunId = "R41" | "R42";
type FleetTraceAssignment = FleetTraceRunId | "unmatched";
type FleetTraceSelection = FleetTraceAssignment | "";

type FleetTraceOrchestrationEvent = {
  time: string;
  run: FleetTraceRunId;
  event: string;
  evidence: string;
};

type FleetTraceGatewayEvent = {
  attempt: string;
  request: string;
  run: FleetTraceRunId;
  trace: string;
  resource: string;
  policy: string;
};

type FleetTracePhysicalRow = {
  attempt: string;
  time: string;
  ledger: "provider" | "tool";
  operation: string;
  linkingEvidence: string;
  result: string;
  cost: number | null;
  correctAssignment: FleetTraceAssignment;
  route: string;
  policy: string;
  correctReason: string;
};

const fleetTraceOrchestration: FleetTraceOrchestrationEvent[] = [
  {
    time: "09:14:00",
    run: "R41",
    event: "RunStarted",
    evidence: "trace=tr-41 · task=patch-event-filter",
  },
  {
    time: "09:14:02",
    run: "R41",
    event: "ModelAttemptRequested",
    evidence: "attempt=A-4101 · gateway=GW-501",
  },
  {
    time: "09:14:07",
    run: "R41",
    event: "ProviderRetryRequested",
    evidence: "attempt=A-4102 · gateway=GW-502",
  },
  {
    time: "09:14:15",
    run: "R41",
    event: "StrongFallbackRequested",
    evidence: "attempt=A-4103 · gateway=GW-503",
  },
  {
    time: "09:14:32",
    run: "R41",
    event: "RunAccepted",
    evidence: "final validation accepted",
  },
  {
    time: "09:16:00",
    run: "R42",
    event: "RunStarted",
    evidence: "trace=tr-42 · task=publish-audit-notice",
  },
  {
    time: "09:16:03",
    run: "R42",
    event: "ToolAttemptDispatched",
    evidence: "attempt=T-4201 · gateway=GW-601",
  },
  {
    time: "09:16:06",
    run: "R42",
    event: "RunCancelled",
    evidence: "outcome remains cancelled",
  },
];

const fleetTraceGateway: FleetTraceGatewayEvent[] = [
  {
    attempt: "A-4101",
    request: "GW-501",
    run: "R41",
    trace: "tr-41",
    resource: "provider-a / small-v3",
    policy: "allow · cheap-first route",
  },
  {
    attempt: "A-4102",
    request: "GW-502",
    run: "R41",
    trace: "tr-41",
    resource: "provider-a / small-v3",
    policy: "allow · provider retry 1/1",
  },
  {
    attempt: "A-4103",
    request: "GW-503",
    run: "R41",
    trace: "tr-41",
    resource: "provider-b / strong-v5",
    policy: "allow · fallback after quality gate",
  },
  {
    attempt: "T-4201",
    request: "GW-601",
    run: "R42",
    trace: "tr-42",
    resource: "notifications / send",
    policy: "allow · scoped tool dispatch",
  },
];

const fleetTracePhysicalRows: FleetTracePhysicalRow[] = [
  {
    attempt: "A-4101",
    time: "09:14:03",
    ledger: "provider",
    operation: "provider-a / small-v3",
    linkingEvidence: "trace=tr-41 · gateway=GW-501",
    result: "timeout after dispatch",
    cost: 0.03,
    correctAssignment: "R41",
    route: "provider-a / small-v3",
    policy: "cheap-first route",
    correctReason: "The attempt, trace, and gateway request all join to R41.",
  },
  {
    attempt: "A-4102",
    time: "09:14:08",
    ledger: "provider",
    operation: "provider-a / small-v3",
    linkingEvidence: "trace=tr-41 · gateway=GW-502",
    result: "completed · gate rejected",
    cost: 0.04,
    correctAssignment: "R41",
    route: "provider-a / small-v3",
    policy: "provider retry 1/1",
    correctReason:
      "This is a new physical attempt for R41, not a duplicate log row.",
  },
  {
    attempt: "A-4103",
    time: "09:14:17",
    ledger: "provider",
    operation: "provider-b / strong-v5",
    linkingEvidence: "trace=tr-41 · gateway=GW-503",
    result: "completed · gate accepted",
    cost: 0.31,
    correctAssignment: "R41",
    route: "provider-b / strong-v5",
    policy: "fallback after quality gate",
    correctReason:
      "The strong fallback keeps R41 but receives its own attempt ID.",
  },
  {
    attempt: "T-4201",
    time: "09:16:09",
    ledger: "tool",
    operation: "notifications / send",
    linkingEvidence: "trace=tr-42 · gateway=GW-601",
    result: "effect completed after cancellation",
    cost: null,
    correctAssignment: "R42",
    route: "notifications / send",
    policy: "scoped tool dispatch",
    correctReason:
      "The tool ledger links the late effect to R42; it does not change R42's cancelled outcome.",
  },
  {
    attempt: "A-X901",
    time: "09:17:11",
    ledger: "provider",
    operation: "provider-a / small-v3",
    linkingEvidence:
      "network_path=provider-direct · credential=direct-prod-2 · trace=none",
    result: "completed",
    cost: 0.06,
    correctAssignment: "unmatched",
    route: "provider-direct / small-v3",
    policy: "no gateway policy observed",
    correctReason:
      "Positive direct-path evidence plus the complete gateway export establishes a bypass; no run identity is present.",
  },
];

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-fleet-trace]",
)) {
  initializeFleetTraceDebugger(root);
}

function initializeFleetTraceDebugger(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>("[data-fleet-trace-form]");
  const orchestrationBody = root.querySelector<HTMLTableSectionElement>(
    "[data-fleet-trace-orchestration]",
  );
  const gatewayBody = root.querySelector<HTMLTableSectionElement>(
    "[data-fleet-trace-gateway]",
  );
  const physicalBody = root.querySelector<HTMLTableSectionElement>(
    "[data-fleet-trace-physical]",
  );
  const progress = root.querySelector<HTMLOutputElement>(
    "[data-fleet-trace-progress]",
  );
  const verdict = root.querySelector<HTMLElement>("[data-fleet-trace-verdict]");
  const summary = root.querySelector<HTMLElement>("[data-fleet-trace-summary]");
  const guidance = root.querySelector<HTMLElement>(
    "[data-fleet-trace-guidance]",
  );
  const reconcileButton = root.querySelector<HTMLButtonElement>(
    "[data-fleet-trace-reconcile]",
  );
  const resetButton = root.querySelector<HTMLButtonElement>(
    "[data-fleet-trace-reset]",
  );
  const results = root.querySelector<HTMLElement>("[data-fleet-trace-results]");
  const rollupBody = root.querySelector<HTMLTableSectionElement>(
    "[data-fleet-trace-rollup]",
  );
  const findings = root.querySelector<HTMLOListElement>(
    "[data-fleet-trace-findings]",
  );
  const artifact = root.querySelector<HTMLTextAreaElement>(
    "[data-fleet-trace-artifact]",
  );
  const copyButton = root.querySelector<HTMLButtonElement>(
    "[data-fleet-trace-copy]",
  );
  const metrics = new Map(
    Array.from(
      root.querySelectorAll<HTMLElement>("[data-fleet-trace-metric]"),
    ).map((metric) => [metric.dataset.fleetTraceMetric ?? "", metric]),
  );

  if (
    !form ||
    !orchestrationBody ||
    !gatewayBody ||
    !physicalBody ||
    !progress ||
    !verdict ||
    !summary ||
    !guidance ||
    !reconcileButton ||
    !resetButton ||
    !results ||
    !rollupBody ||
    !findings ||
    !artifact ||
    !copyButton
  ) {
    return;
  }

  const selections = new Map<string, FleetTraceSelection>(
    fleetTracePhysicalRows.map((row) => [row.attempt, ""]),
  );
  let reconciliationAttempted = false;
  let reconciliationComplete = false;

  orchestrationBody.innerHTML = fleetTraceOrchestration
    .map(
      (entry) => `<tr>
        <td><time>${entry.time}</time></td>
        <td><code>${entry.run}</code></td>
        <td>${escapeFleetTraceHtml(entry.event)}</td>
        <td><code>${escapeFleetTraceHtml(entry.evidence)}</code></td>
      </tr>`,
    )
    .join("");
  gatewayBody.innerHTML = fleetTraceGateway
    .map(
      (entry) => `<tr>
        <td><code>${entry.attempt}</code><small>${entry.request}</small></td>
        <td><code>${entry.run}</code><small>${entry.trace}</small></td>
        <td>${escapeFleetTraceHtml(entry.resource)}</td>
        <td>${escapeFleetTraceHtml(entry.policy)}</td>
      </tr>`,
    )
    .join("");
  physicalBody.innerHTML = fleetTracePhysicalRows
    .map(renderFleetTracePhysicalRow)
    .join("");

  const mappingSelects = Array.from(
    physicalBody.querySelectorAll<HTMLSelectElement>("[data-fleet-trace-map]"),
  );

  const updateMappingState = () => {
    const assigned = [...selections.values()].filter(Boolean).length;
    const remaining = fleetTracePhysicalRows.length - assigned;

    progress.value = `${assigned} / ${fleetTracePhysicalRows.length} mapped`;
    progress.textContent = progress.value;
    reconcileButton.disabled = remaining > 0 || reconciliationComplete;

    if (reconciliationComplete) {
      return;
    }

    if (reconciliationAttempted) {
      const conflictCount = evaluateFleetTraceMappings(
        physicalBody,
        selections,
      );
      verdict.textContent = `${conflictCount} mapping conflict${conflictCount === 1 ? "" : "s"}`;
      summary.textContent =
        "Use attempt, trace, gateway, and direct-path evidence to repair the joins.";
      guidance.textContent =
        conflictCount === 0
          ? "Mappings align. Reconcile again to produce the control record."
          : `${conflictCount} row${conflictCount === 1 ? "" : "s"} still conflict with the packet evidence.`;
      reconcileButton.textContent = "Reconcile again";
      return;
    }

    verdict.textContent = `${assigned} of ${fleetTracePhysicalRows.length} ledger rows assigned`;
    summary.textContent =
      "Intent, mediation, and physical use are separate evidence streams.";
    guidance.textContent = remaining
      ? `Assign ${remaining} remaining row${remaining === 1 ? "" : "s"} before reconciling the packet.`
      : "Every row is assigned. Reconcile the joins against the source logs.";
  };

  const reconcile = () => {
    if ([...selections.values()].some((selection) => !selection)) {
      return;
    }

    reconciliationAttempted = true;
    const conflictCount = evaluateFleetTraceMappings(physicalBody, selections);

    if (conflictCount > 0) {
      results.hidden = true;
      root.dataset.fleetTraceState = "conflict";
      updateMappingState();
      return;
    }

    reconciliationComplete = true;
    root.dataset.fleetTraceState = "reconciled";
    mappingSelects.forEach((select) => {
      select.disabled = true;
    });
    reconcileButton.disabled = true;
    reconcileButton.textContent = "Packet reconciled";
    verdict.textContent = "Five physical rows reconciled";
    summary.textContent = "3 map to R41 · 1 maps to R42 · 1 remains unmatched";
    guidance.textContent =
      "The joins balance. Inspect outcomes, route provenance, spend, and effects separately.";
    renderFleetTraceResults(metrics, rollupBody, findings, artifact);
    results.hidden = false;
  };

  const reset = () => {
    selections.forEach((_selection, attempt) => {
      selections.set(attempt, "");
    });
    reconciliationAttempted = false;
    reconciliationComplete = false;
    root.dataset.fleetTraceState = "mapping";
    mappingSelects.forEach((select) => {
      select.value = "";
      select.disabled = false;
    });
    for (const row of physicalBody.querySelectorAll<HTMLElement>("tr")) {
      row.removeAttribute("data-fleet-trace-status");
      const cell = row.querySelector<HTMLElement>("[data-fleet-trace-check]");
      if (cell) {
        cell.textContent = "Awaiting mapping";
      }
    }
    reconcileButton.textContent = "Reconcile packet";
    results.hidden = true;
    updateMappingState();
  };

  form.addEventListener("submit", (event) => event.preventDefault());
  physicalBody.addEventListener("change", (event) => {
    const select = (event.target as HTMLElement).closest<HTMLSelectElement>(
      "[data-fleet-trace-map]",
    );
    const attempt = select?.dataset.fleetTraceMap;

    if (!select || !attempt || reconciliationComplete) {
      return;
    }

    selections.set(
      attempt,
      isFleetTraceSelection(select.value) ? select.value : "",
    );
    updateMappingState();
  });
  reconcileButton.addEventListener("click", reconcile);
  resetButton.addEventListener("click", reset);
  copyButton.addEventListener("click", async () => {
    artifact.select();

    try {
      await navigator.clipboard.writeText(artifact.value);
      copyButton.textContent = "Copied";
      window.setTimeout(() => {
        copyButton.textContent = "Copy record";
      }, 1400);
    } catch {
      copyButton.textContent = "Select text";
    }
  });

  reset();
}

function renderFleetTracePhysicalRow(row: FleetTracePhysicalRow) {
  const cost = row.cost === null ? "Unpriced" : formatFleetTraceCost(row.cost);

  return `<tr data-fleet-trace-row="${row.attempt}">
    <td><code>${row.attempt}</code><small>${row.ledger} ledger</small></td>
    <td><time>${row.time}</time></td>
    <td>${escapeFleetTraceHtml(row.operation)}</td>
    <td><code>${escapeFleetTraceHtml(row.linkingEvidence)}</code></td>
    <td>${escapeFleetTraceHtml(row.result)}</td>
    <td class="${row.cost === null ? "is-unpriced" : ""}">${cost}</td>
    <td>
      <select aria-label="Map physical attempt ${row.attempt}" data-fleet-trace-map="${row.attempt}">
        <option value="">Choose…</option>
        <option value="R41">R41</option>
        <option value="R42">R42</option>
        <option value="unmatched">Unmatched</option>
      </select>
    </td>
    <td data-fleet-trace-check>Awaiting mapping</td>
  </tr>`;
}

function evaluateFleetTraceMappings(
  physicalBody: HTMLTableSectionElement,
  selections: Map<string, FleetTraceSelection>,
) {
  let conflicts = 0;

  for (const row of fleetTracePhysicalRows) {
    const tableRow = physicalBody.querySelector<HTMLElement>(
      `[data-fleet-trace-row="${row.attempt}"]`,
    );
    const check = tableRow?.querySelector<HTMLElement>(
      "[data-fleet-trace-check]",
    );
    const correct = selections.get(row.attempt) === row.correctAssignment;

    if (!tableRow || !check) {
      continue;
    }

    tableRow.dataset.fleetTraceStatus = correct ? "correct" : "conflict";
    check.textContent = correct
      ? row.correctReason
      : buildFleetTraceConflictReason(row, selections.get(row.attempt));
    conflicts += correct ? 0 : 1;
  }

  return conflicts;
}

function buildFleetTraceConflictReason(
  row: FleetTracePhysicalRow,
  selected: FleetTraceSelection | undefined,
) {
  if (row.correctAssignment === "unmatched") {
    return `The provider ledger records a direct network path and direct credential; the complete gateway export contains no ${row.attempt}. Keep it unmatched.`;
  }

  if (selected === "unmatched") {
    return `${row.attempt} carries trace and gateway evidence for ${row.correctAssignment}.`;
  }

  return `${row.attempt} links to ${row.correctAssignment}, not ${selected || "an empty assignment"}.`;
}

function renderFleetTraceResults(
  metrics: Map<string, HTMLElement>,
  rollupBody: HTMLTableSectionElement,
  findings: HTMLOListElement,
  artifact: HTMLTextAreaElement,
) {
  const pricedCost = fleetTracePhysicalRows.reduce(
    (total, row) => total + (row.cost ?? 0),
    0,
  );
  const unpricedCount = fleetTracePhysicalRows.filter(
    (row) => row.cost === null,
  ).length;
  const acceptedRuns = 1;
  const costPerAccepted = pricedCost / acceptedRuns;

  metrics.get("rows")!.textContent = String(fleetTracePhysicalRows.length);
  metrics.get("accepted")!.textContent = String(acceptedRuns);
  metrics.get("cost")!.textContent =
    `${formatFleetTraceCost(pricedCost)} + ${unpricedCount} unpriced`;
  metrics.get("cost-per-accepted")!.textContent =
    `${formatFleetTraceCost(costPerAccepted)} + ${unpricedCount} unpriced`;

  rollupBody.innerHTML = buildFleetTraceRollups()
    .map(
      (row) => `<tr data-fleet-trace-rollup="${row.id}">
        <td><code>${row.label}</code></td>
        <td>${row.outcome}</td>
        <td>${row.rows}</td>
        <td>${row.provenance}</td>
        <td>${row.cost}</td>
      </tr>`,
    )
    .join("");

  findings.innerHTML = `<li data-fleet-trace-finding="bypass">
      <span>BYPASS</span>
      <div>
        <strong>A-X901 used a direct provider path</strong>
        <p><code>network_path=provider-direct</code> and <code>credential=direct-prod-2</code> are positive route evidence. The gateway export is declared complete for the window, and no run identity exists.</p>
      </div>
    </li>
    <li data-fleet-trace-finding="late-effect">
      <span>LATE</span>
      <div>
        <strong>T-4201 completed after R42 was cancelled</strong>
        <p>The orchestration log records cancellation at 09:16:06. The authoritative tool ledger records the effect at 09:16:09. R42 remains cancelled.</p>
      </div>
    </li>
    <li data-fleet-trace-finding="retry-fallback">
      <span>COST</span>
      <div>
        <strong>R41 spent ${formatFleetTraceCost(0.38)} across three attempts</strong>
        <p>The timed-out cheap call, its physical retry, and the strong fallback each keep R41 while retaining a distinct attempt ID and cost.</p>
      </div>
    </li>
    <li data-fleet-trace-finding="unpriced">
      <span>GAP</span>
      <div>
        <strong>One tool effect is unpriced</strong>
        <p>The missing tool price remains visible beside ${formatFleetTraceCost(pricedCost)} of authoritative provider spend; it is not converted to zero.</p>
      </div>
    </li>`;

  artifact.value = buildFleetTraceArtifact(
    pricedCost,
    unpricedCount,
    acceptedRuns,
  );
}

function buildFleetTraceRollups() {
  return [
    {
      id: "R41",
      label: "R41",
      outcome: "Accepted",
      rows: "3",
      provenance:
        "small-v3 timeout → small-v3 retry → strong-v5 fallback · cheap-first / retry 1-of-1 / quality-gate fallback",
      cost: formatFleetTraceCost(0.38),
    },
    {
      id: "R42",
      label: "R42",
      outcome: "Cancelled; late effect observed",
      rows: "1",
      provenance:
        "notifications/send · scoped dispatch · tool ledger completed at 09:16:09",
      cost: "Unpriced",
    },
    {
      id: "unmatched",
      label: "Unmatched",
      outcome: "No delegated-run outcome",
      rows: "1",
      provenance:
        "provider-direct / small-v3 · direct credential · no gateway policy",
      cost: formatFleetTraceCost(0.06),
    },
  ];
}

function buildFleetTraceArtifact(
  pricedCost: number,
  unpricedCount: number,
  acceptedRuns: number,
) {
  const mappingLines = fleetTracePhysicalRows.map(
    (row) =>
      `- ${row.attempt} -> ${row.correctAssignment} | ${row.route} | ${row.policy} | ${row.cost === null ? "unpriced" : formatFleetTraceCost(row.cost)}`,
  );

  return [
    "Fleet trace reconciliation — FLT-17A",
    "Fixed synthetic teaching packet. All logs and costs are synthetic; no models or tools execute in this demo.",
    "Source: https://scalableweb.dev/appendices/agent-system-security/#fleet-trace-debugger",
    "",
    "Evidence window: 09:14:00–09:18:00",
    "Gateway export: complete for the evidence window",
    "",
    "Source authority:",
    "- Orchestration log: delegated-run outcome",
    "- Gateway log: selected route and policy result",
    "- Provider ledger: priced model spend",
    "- Tool ledger: external effect completion",
    "",
    "Physical-row mappings:",
    ...mappingLines,
    "",
    "Run outcomes:",
    "- R41: accepted",
    "- R42: cancelled; T-4201 completed 3 seconds later",
    "- A-X901: unmatched direct call",
    "",
    "Accounting:",
    `- Physical rows counted: ${fleetTracePhysicalRows.length}`,
    `- Priced fixed-cohort cost: ${formatFleetTraceCost(pricedCost)}`,
    `- Unpriced resource rows: ${unpricedCount}`,
    `- Accepted delegated runs: ${acceptedRuns}`,
    `- Cost per accepted run: ${formatFleetTraceCost(pricedCost / acceptedRuns)} + ${unpricedCount} unpriced resource row`,
    "",
    "Findings:",
    "- Direct-provider bypass established by positive route evidence and a complete gateway export.",
    "- Cancellation did not prevent the already-dispatched T-4201 effect.",
    "- R41's timeout, retry, and fallback costs are all included.",
  ].join("\n");
}

function isFleetTraceSelection(value: string): value is FleetTraceSelection {
  return (
    value === "" || value === "R41" || value === "R42" || value === "unmatched"
  );
}

function formatFleetTraceCost(value: number) {
  return `${value.toFixed(2)} EUR`;
}

function escapeFleetTraceHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
