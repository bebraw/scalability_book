type ScalingScenarioId = "arrival" | "dashboard" | "tenants";
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
  effects: {
    writes: number;
    reads: number;
    freshnessRisk: number;
    complexity: number;
    resourceCost: number;
  };
};

const scalingScenarios: Record<ScalingScenarioId, ScalingScenario> = {
  arrival: {
    label: "Conference arrival spike",
    context:
      "20,000 check-in events arrive during a 30-minute conference opening. The API currently validates, stores, enriches, and updates dashboard summaries before responding. Organizers need the latest arrivals view to stay useful during the burst.",
    pressures: { writes: 4, reads: 3, freshness: 4, tenants: 2 },
  },
  dashboard: {
    label: "Slow operator dashboard",
    context:
      "Operators refresh the latest-events dashboard every few seconds while writes continue. GET /events runs SELECT * FROM events WHERE project_id = ? ORDER BY created_at DESC LIMIT 50. The table has indexes on project_id and event_type, but not on created_at.",
    pressures: { writes: 2, reads: 5, freshness: 5, tenants: 2 },
  },
  tenants: {
    label: "Noisy tenant isolation",
    context:
      "One large project imports historical events while smaller projects are trying to record normal activity. The shared events table and shared worker pool make unrelated projects slower.",
    pressures: { writes: 4, reads: 3, freshness: 3, tenants: 5 },
  },
};

const scalingTechniques: Record<ScalingTechniqueId, ScalingTechnique> = {
  index: {
    label: "Composite index",
    pressure: "Latest-events queries sort too much data.",
    benefit: "Speeds reads that filter by project and order by created_at.",
    cost: "Adds storage and makes writes maintain another index.",
    failure: "The index may not help other filters or cross-project reports.",
    signal: "Query plan, p95 GET /events latency, index size.",
    simplerAlternative:
      "Start with the missing index before adding replicas or caches.",
    effects: {
      writes: -1,
      reads: 4,
      freshnessRisk: 0,
      complexity: 1,
      resourceCost: 1,
    },
  },
  queue: {
    label: "Queue ingestion",
    pressure: "Writes block on enrichment or aggregation work.",
    benefit:
      "Lets the API durably accept events before slower processing finishes.",
    cost: "Introduces queue depth, retries, idempotency, and delayed summaries.",
    failure: "Processors can fall behind while the API still appears healthy.",
    signal: "Queue depth, event age, retry count, processing error rate.",
    simplerAlternative:
      "Move only nonessential processing out of the request path first.",
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
    failure: "Users may see stale data during active incidents or arrivals.",
    signal: "Cache hit rate, stale age, database read rate.",
    simplerAlternative:
      "Use pagination and indexing before caching everything.",
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
    effects: {
      writes: 1,
      reads: 5,
      freshnessRisk: 2,
      complexity: 3,
      resourceCost: 4,
    },
  },
  partition: {
    label: "Partition by project",
    pressure: "One project or tenant dominates table size or worker capacity.",
    benefit:
      "Limits blast radius and makes large tenants easier to route or archive.",
    cost: "Adds routing, migration, and cross-partition query complexity.",
    failure: "Global reports and tenant moves become harder.",
    signal:
      "Per-project storage, hot partition rate, cross-partition query count.",
    simplerAlternative: "Add per-tenant rate limits before sharding storage.",
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
    cost: "Clients must handle retry-after responses and partial acceptance.",
    failure: "Aggressive limits can reject legitimate bursts.",
    signal: "429 rate, rejected event count, retry-after usage, queue depth.",
    simplerAlternative:
      "Set clear limits before adding capacity for rare peaks.",
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
      scalingScenarios.arrival;

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
        copy.textContent = "Copy artifact";
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

  const steps = ["Client submits event to the ingestion API."];

  if (selected.includes("backpressure")) {
    steps.push(
      "API applies per-project limits and returns retry-after when overloaded.",
    );
  }

  if (selected.includes("queue")) {
    steps.push(
      "API stores the raw event durably and enqueues enrichment or aggregation work.",
    );
  } else {
    steps.push(
      "API performs validation, storage, and read-model updates synchronously.",
    );
  }

  if (selected.includes("partition")) {
    steps.push(
      "Events are routed by project partition to limit noisy-tenant blast radius.",
    );
  }

  if (selected.includes("index")) {
    steps.push(
      "Latest-events reads use a composite project_id and created_at index.",
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

          return `| ${technique.pressure} | ${technique.label} | ${technique.benefit} | ${technique.cost} | ${technique.failure} | ${technique.signal} | ${technique.simplerAlternative} |`;
        })
      : [
          "| Pressure not selected | Measure first | Avoid premature complexity | Scaling decision deferred | Unknown bottleneck remains | Baseline latency, throughput, error rate | No infrastructure change yet |",
        ];

  return `# Scaling Trade-off Table

## Scenario
${scenario}

## Context
${context}

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

| Pressure | Technique | Benefit | Cost | New failure mode | Signal to watch | Why simpler alternative was not enough |
| --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}

## Human review questions
- Which selected technique should be tried first?
- What metric would falsify this design?
- Which technique was deliberately not chosen?
- What extra operational responsibility did the design introduce?`;
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
