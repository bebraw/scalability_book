type ScalingScenarioId = "burst" | "dashboard" | "tenants";
type ScalingPressureKey = "writes" | "reads" | "freshness" | "tenants";
type ScalingTechniqueId =
  | "index"
  | "queue"
  | "cache"
  | "replica"
  | "partition"
  | "backpressure";

type ScalingScenario = {
  label: string;
  context: string;
  pressures: Record<ScalingPressureKey, number>;
};

type ScalingTechnique = {
  label: string;
  pressure: string;
  benefit: string;
  cost: string;
  failure: string;
  signal: string;
  simplerAlternative: string;
  complexityMovesTo: string;
  effects: {
    writes: number;
    reads: number;
    freshnessRisk: number;
    complexity: number;
    resourceCost: number;
  };
};

const scalingScenarios: Record<ScalingScenarioId, ScalingScenario> = {
  burst: {
    label: "Work-item action burst",
    context:
      "Invented teaching workload: 20,000 valid work-item creations and lifecycle transitions arrive across eight workspaces in 30 minutes. Each accepted action must commit its state change and one matching activity event together. The API also updates derived summaries before responding; workspace feeds and summaries need to remain useful during the burst. This is not the required course benchmark.",
    pressures: { writes: 4, reads: 3, freshness: 4, tenants: 2 },
  },
  dashboard: {
    label: "Slow workspace activity feed",
    context:
      "Readers refresh workspace activity feeds and filter by event type while work-item actions continue. GET /events?workspace=<id> runs SELECT * FROM activity_events WHERE workspace_id = ? ORDER BY occurred_at DESC, id DESC LIMIT 50. Separate workspace_id and event_type indexes do not match the full filter and ordering; inspect the query plan before claiming an index will help.",
    pressures: { writes: 2, reads: 5, freshness: 5, tenants: 2 },
  },
  tenants: {
    label: "Noisy tenant isolation",
    context:
      "One busy workspace creates and advances many work items while smaller workspaces continue ordinary work. The shared work-item and activity-event tables and shared worker pool make unrelated workspaces slower. Isolation must preserve each accepted action's state-and-event commit.",
    pressures: { writes: 4, reads: 3, freshness: 3, tenants: 5 },
  },
};

const scalingTechniques: Record<ScalingTechniqueId, ScalingTechnique> = {
  index: {
    label: "Composite index",
    pressure: "Latest-events queries sort too much data.",
    benefit:
      "May speed activity reads filtered by workspace and ordered by occurred_at and id.",
    cost: "Adds storage and makes writes maintain another index.",
    failure:
      "The index may not help event-type filters or cross-workspace reports.",
    signal: "Query plan, p95 GET /events latency, index size.",
    simplerAlternative:
      "Start with the missing index before adding replicas or caches.",
    complexityMovesTo:
      "Write amplification, index storage, and query-plan maintenance.",
    effects: {
      writes: -1,
      reads: 4,
      freshnessRisk: 0,
      complexity: 1,
      resourceCost: 1,
    },
  },
  queue: {
    label: "Queue derived summary work",
    pressure:
      "Action responses wait for derived summaries after the core commit.",
    benefit:
      "Lets the API acknowledge the committed state and event before slower summary processing finishes.",
    cost: "Introduces queue depth, retries, idempotency, and delayed summaries.",
    failure: "Processors can fall behind while the API still appears healthy.",
    signal:
      "Queue depth, oldest unprocessed event age, retry count, summary lag.",
    simplerAlternative:
      "Move only nonessential processing out of the request path first.",
    complexityMovesTo:
      "Backlog, retries, idempotency, worker operations, and summary lag.",
    effects: {
      writes: 5,
      reads: 0,
      freshnessRisk: 2,
      complexity: 3,
      resourceCost: 2,
    },
  },
  cache: {
    label: "Cache dashboard reads",
    pressure: "Many users repeat the same latest-events or summary reads.",
    benefit: "Reduces repeated database work for dashboards.",
    cost: "Adds invalidation and stale-read decisions.",
    failure: "Users may see stale activity or counts while work items change.",
    signal: "Cache hit rate, stale age, database read rate.",
    simplerAlternative:
      "Use pagination and indexing before caching everything.",
    complexityMovesTo:
      "Invalidation, freshness budgets, cache keys, and stale-read behavior.",
    effects: {
      writes: 0,
      reads: 4,
      freshnessRisk: 3,
      complexity: 2,
      resourceCost: 1,
    },
  },
  replica: {
    label: "Read replica",
    pressure: "Read traffic competes with writes on the primary database.",
    benefit: "Moves dashboard reads away from the write path.",
    cost: "Adds replication lag, routing, and failover behavior.",
    failure: "Dashboards can lag behind accepted writes.",
    signal: "Replica lag, read latency, primary CPU, replica errors.",
    simplerAlternative: "Measure whether indexes and caching are enough first.",
    complexityMovesTo:
      "Replication lag, read routing, failover, and replica operations.",
    effects: {
      writes: 1,
      reads: 5,
      freshnessRisk: 2,
      complexity: 3,
      resourceCost: 4,
    },
  },
  partition: {
    label: "Partition by workspace",
    pressure: "One workspace dominates table size or worker capacity.",
    benefit:
      "Limits blast radius and makes large tenants easier to route or archive.",
    cost: "Adds routing, migration, and cross-partition query complexity.",
    failure: "Global reports and tenant moves become harder.",
    signal:
      "Per-workspace storage, hot partition rate, cross-partition query count.",
    simplerAlternative: "Add per-tenant rate limits before sharding storage.",
    complexityMovesTo:
      "Routing, rebalancing, migrations, and cross-partition queries.",
    effects: {
      writes: 2,
      reads: 2,
      freshnessRisk: 0,
      complexity: 4,
      resourceCost: 3,
    },
  },
  backpressure: {
    label: "Rate limit and backpressure",
    pressure: "Clients can submit faster than the system can safely absorb.",
    benefit: "Protects core paths and makes overload explicit to callers.",
    cost: "Clients must distinguish rejected actions from unconfirmed outcomes and respect retry-after responses.",
    failure: "Aggressive limits can reject legitimate bursts.",
    signal: "429 rate, rejected action count, retry-after usage, queue depth.",
    simplerAlternative:
      "Set clear limits before adding capacity for rare peaks.",
    complexityMovesTo:
      "Client retry discipline, fairness policy, and per-action outcomes.",
    effects: {
      writes: 3,
      reads: 0,
      freshnessRisk: 0,
      complexity: 1,
      resourceCost: 0,
    },
  },
};

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-scaling-demo]",
)) {
  initializeScalingDemo(root);
}

function initializeScalingDemo(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>("[data-scaling-demo-form]");
  const scenario = root.querySelector<HTMLSelectElement>(
    "[data-scaling-demo-scenario]",
  );
  const context = root.querySelector<HTMLTextAreaElement>(
    "[data-scaling-demo-context]",
  );
  const pressureInputs = Array.from(
    root.querySelectorAll<HTMLInputElement>("[data-scaling-demo-pressure]"),
  );
  const techniques = Array.from(
    root.querySelectorAll<HTMLInputElement>("[data-scaling-demo-technique]"),
  );
  const outputs = Array.from(
    root.querySelectorAll<HTMLOutputElement>("[data-scaling-demo-output]"),
  );
  const recommendations = root.querySelector<HTMLElement>(
    "[data-scaling-demo-recommendations]",
  );
  const pipeline = root.querySelector<HTMLElement>(
    "[data-scaling-demo-pipeline]",
  );
  const verdict = root.querySelector<HTMLElement>(
    "[data-scaling-demo-verdict]",
  );
  const interpretation = root.querySelector<HTMLElement>(
    "[data-scaling-demo-interpretation]",
  );
  const waterbed = root.querySelector<HTMLElement>(
    "[data-scaling-demo-waterbed]",
  );
  const waterbedSummary = root.querySelector<HTMLElement>(
    "[data-scaling-demo-waterbed-summary]",
  );
  const artifact = root.querySelector<HTMLTextAreaElement>(
    "[data-scaling-demo-artifact]",
  );
  const copy = root.querySelector<HTMLButtonElement>(
    "[data-scaling-demo-copy]",
  );
  const metricNodes = Array.from(
    root.querySelectorAll<HTMLElement>("[data-scaling-demo-metric]"),
  );

  if (
    !form ||
    !scenario ||
    !context ||
    !recommendations ||
    !pipeline ||
    !verdict ||
    !interpretation ||
    !waterbed ||
    !waterbedSummary ||
    !artifact ||
    !copy
  ) {
    return;
  }

  const render = () => {
    const pressures = getScalingPressures(pressureInputs);
    const selected = getSelectedScalingTechniques(techniques);
    const result = calculateScalingResult(pressures, selected);

    outputs.forEach((output) => {
      const key = output.dataset.scalingDemoOutput as
        | ScalingPressureKey
        | undefined;

      if (key) {
        output.value = String(pressures[key]);
        output.textContent = String(pressures[key]);
      }
    });
    recommendations.innerHTML = buildScalingRecommendations(pressures)
      .map((item) => `<li>${escapeScalingHtml(item)}</li>`)
      .join("");
    pipeline.innerHTML = buildScalingPipeline(selected)
      .map((item) => `<li>${escapeScalingHtml(item)}</li>`)
      .join("");
    waterbed.innerHTML = buildScalingWaterbed(selected);
    waterbedSummary.textContent =
      selected.length === 0
        ? "Choose a scaling move"
        : `${selected.length} move${selected.length === 1 ? "" : "s"} add new operating obligations`;
    updateScalingMetrics(metricNodes, result);
    verdict.textContent = `${selected.length} moves, ${getScalingRiskLabel(
      result.complexity,
    ).toLowerCase()} complexity`;
    interpretation.textContent = buildScalingInterpretation(
      pressures,
      selected,
      result,
    );
    artifact.value = buildScalingArtifact({
      scenario:
        scalingScenarios[scenario.value as ScalingScenarioId]?.label ??
        "Custom scenario",
      context: context.value,
      pressures,
      selected,
      result,
    });
  };

  scenario.addEventListener("change", () => {
    const nextScenario =
      scalingScenarios[scenario.value as ScalingScenarioId] ??
      scalingScenarios.burst;

    context.value = nextScenario.context;
    pressureInputs.forEach((input) => {
      const key = input.dataset.scalingDemoPressure as
        | ScalingPressureKey
        | undefined;

      if (key) {
        input.value = String(nextScenario.pressures[key]);
      }
    });
    render();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  copy.addEventListener("click", async () => {
    artifact.select();

    try {
      await navigator.clipboard?.writeText(artifact.value);
      copy.textContent = "Copied";
      window.setTimeout(() => {
        copy.textContent = "Copy plan";
      }, 1400);
    } catch {
      copy.textContent = "Select text";
    }
  });

  const initialScenario = scalingScenarios[scenario.value as ScalingScenarioId];
  context.value = initialScenario.context;
  render();
}

function getScalingPressures(inputs: HTMLInputElement[]) {
  return inputs.reduce(
    (pressures, input) => {
      const key = input.dataset.scalingDemoPressure as
        | ScalingPressureKey
        | undefined;

      if (key) {
        pressures[key] = Number(input.value);
      }

      return pressures;
    },
    { writes: 1, reads: 1, freshness: 1, tenants: 1 } as Record<
      ScalingPressureKey,
      number
    >,
  );
}

function getSelectedScalingTechniques(inputs: HTMLInputElement[]) {
  return inputs
    .filter((input) => input.checked)
    .map((input) => input.value as ScalingTechniqueId)
    .filter((id) => Boolean(scalingTechniques[id]));
}

function calculateScalingResult(
  pressures: Record<ScalingPressureKey, number>,
  selected: ScalingTechniqueId[],
) {
  const totals = selected.reduce(
    (total, id) => {
      const technique = scalingTechniques[id];

      total.writes += technique.effects.writes;
      total.reads += technique.effects.reads;
      total.freshnessRisk += technique.effects.freshnessRisk;
      total.complexity += technique.effects.complexity;
      total.resourceCost += technique.effects.resourceCost;

      return total;
    },
    { writes: 0, reads: 0, freshnessRisk: 0, complexity: 0, resourceCost: 0 },
  );

  const freshnessPressurePenalty = Math.max(0, pressures.freshness - 3);

  return {
    writeRelief: clampScalingScore(
      totals.writes - Math.max(0, pressures.writes - 3),
    ),
    readRelief: clampScalingScore(
      totals.reads - Math.max(0, pressures.reads - 3),
    ),
    freshnessRisk: totals.freshnessRisk + freshnessPressurePenalty,
    complexity: totals.complexity,
    resourceCost: totals.resourceCost,
  };
}

function buildScalingRecommendations(
  pressures: Record<ScalingPressureKey, number>,
) {
  const items = [];

  if (pressures.writes >= 4) {
    items.push(
      "Write pressure is high: consider queueing nonessential work and applying backpressure.",
    );
  }

  if (pressures.reads >= 4) {
    items.push(
      "Read pressure is high: start with the query/index path before adding read replicas.",
    );
  }

  if (pressures.freshness >= 4) {
    items.push(
      "Freshness matters: caches, queues, and replicas need explicit lag signals.",
    );
  }

  if (pressures.tenants >= 4) {
    items.push(
      "Tenant pressure is high: name the isolation boundary before partitioning data.",
    );
  }

  return items.length > 0
    ? items
    : [
        "The pressure is modest: improve measurement and avoid adding infrastructure yet.",
      ];
}

function buildScalingPipeline(selected: ScalingTechniqueId[]) {
  if (selected.length === 0) {
    return [
      "No scaling move selected. Keep measuring before changing architecture.",
    ];
  }

  const steps = [
    "Client requests a work-item creation or lifecycle transition.",
  ];

  if (selected.includes("backpressure")) {
    steps.push(
      "API applies per-workspace limits and rejects overloaded actions before mutation, with retry-after guidance.",
    );
  }

  if (selected.includes("partition")) {
    steps.push(
      "The workspace routes to a partition that keeps its work-item and activity-event commit together.",
    );
  }

  steps.push(
    "API validates the action against authoritative state, then commits the state change and one matching activity event together before confirming success. Rejected transitions change neither.",
  );

  if (selected.includes("queue")) {
    steps.push(
      "Only derived summary work runs later. Recover pending work from committed events and make processing retry-safe; summary lag does not defer the accepted state change or event.",
    );
  } else {
    steps.push("API also updates derived summaries before responding.");
  }

  if (selected.includes("index")) {
    steps.push(
      "Workspace activity reads try a composite workspace_id, occurred_at, and id index; verify its benefit with the query plan and workload.",
    );
  }

  if (selected.includes("cache")) {
    steps.push(
      "Dashboard reads use a short-lived cache with a visible staleness budget.",
    );
  }

  if (selected.includes("replica")) {
    steps.push(
      "Dashboard reads can use a replica while operators watch replication lag.",
    );
  }

  steps.push(
    "Operators watch the first overload signal before adding another scaling move.",
  );

  return steps;
}

function buildScalingWaterbed(selected: ScalingTechniqueId[]) {
  if (selected.length === 0) {
    return `<p>No complexity displacement to inspect yet.</p>`;
  }

  return selected
    .map((id) => {
      const technique = scalingTechniques[id];

      return `<article>
        <strong>${escapeScalingHtml(technique.label)}</strong>
        <span aria-hidden="true">→</span>
        <p>${escapeScalingHtml(technique.complexityMovesTo)}</p>
      </article>`;
    })
    .join("");
}

function updateScalingMetrics(
  nodes: HTMLElement[],
  result: ReturnType<typeof calculateScalingResult>,
) {
  nodes.forEach((node) => {
    const key = node.dataset.scalingDemoMetric;

    if (key === "writes") {
      node.textContent = `${result.writeRelief}/10`;
    } else if (key === "reads") {
      node.textContent = `${result.readRelief}/10`;
    } else if (key === "freshness") {
      node.textContent = getScalingRiskLabel(result.freshnessRisk);
    } else if (key === "complexity") {
      node.textContent = getScalingRiskLabel(result.complexity);
    } else if (key === "cost") {
      node.textContent = getScalingRiskLabel(result.resourceCost);
    }
  });
}

function buildScalingInterpretation(
  pressures: Record<ScalingPressureKey, number>,
  selected: ScalingTechniqueId[],
  result: ReturnType<typeof calculateScalingResult>,
) {
  if (selected.length === 0) {
    return "No technique has been selected. That may be correct if the pressure is still unmeasured, but it does not yet produce a scaling design.";
  }

  if (result.complexity >= 8) {
    return "This design addresses pressure, but it adds enough operational complexity that you still need to name ownership, dashboards, and failure recovery.";
  }

  if (pressures.freshness >= 4 && result.freshnessRisk >= 4) {
    return "This design relieves load while risking stale reads. It needs a freshness budget and a user-visible definition of acceptable lag.";
  }

  if (result.writeRelief < pressures.writes && pressures.writes >= 4) {
    return "The selected moves do not yet relieve the write burst. Consider queueing, backpressure, or removing synchronous work.";
  }

  if (result.readRelief < pressures.reads && pressures.reads >= 4) {
    return "The selected moves do not yet relieve read pressure. Consider the index path before more expensive read scaling.";
  }

  return "The selected moves are plausible for this pressure. The remaining work is to prove the claim with metrics and explain why simpler alternatives are insufficient.";
}

function buildScalingArtifact({
  scenario,
  context,
  pressures,
  selected,
  result,
}: {
  scenario: string;
  context: string;
  pressures: Record<ScalingPressureKey, number>;
  selected: ScalingTechniqueId[];
  result: ReturnType<typeof calculateScalingResult>;
}) {
  const rows =
    selected.length > 0
      ? selected.map((id) => {
          const technique = scalingTechniques[id];

          return `| ${technique.pressure} | ${technique.label} | ${technique.benefit} | ${technique.cost} | ${technique.complexityMovesTo} | ${technique.failure} | ${technique.signal} | ${technique.simplerAlternative} |`;
        })
      : [
          "| Pressure not selected | Measure first | Avoid premature complexity | Scaling decision deferred | No complexity displaced yet | Unknown bottleneck remains | Baseline latency, throughput, error rate | No infrastructure change yet |",
        ];

  return `# Scaling Trade-off Table

## Scenario
${scenario}

## Context
${context}

## Correctness boundary
Every accepted creation or transition commits its work-item state and matching activity event together before success is confirmed. A rejected transition changes neither. Queues defer only derived work, with recoverable, retry-safe processing and a declared freshness policy.

## Pressure scores
- Writes: ${pressures.writes}/5
- Reads: ${pressures.reads}/5
- Freshness: ${pressures.freshness}/5
- Tenants: ${pressures.tenants}/5

## Result summary
- Write relief: ${result.writeRelief}/10
- Read relief: ${result.readRelief}/10
- Freshness risk: ${getScalingRiskLabel(result.freshnessRisk)}
- Operational complexity: ${getScalingRiskLabel(result.complexity)}
- Resource cost: ${getScalingRiskLabel(result.resourceCost)}

| Pressure | Technique | Benefit | Cost | Complexity moved to | New failure mode | Signal to watch | Why simpler alternative was not enough |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}

## Human review questions
- Which selected technique should be tried first?
- What metric would falsify this design?
- Which technique was deliberately not chosen?
- What extra operational responsibility did the design introduce?
- What became simpler, and where did the displaced complexity reappear?`;
}

function clampScalingScore(value: number) {
  return Math.max(0, Math.min(10, Math.round(value)));
}

function getScalingRiskLabel(score: number) {
  if (score >= 8) {
    return "High";
  }

  if (score >= 4) {
    return "Medium";
  }

  return "Low";
}

function escapeScalingHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
