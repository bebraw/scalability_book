type SaturationScenarioId = "arrival" | "dependency" | "retry" | "baseline";
type SaturationStageId = "ingestion" | "database" | "processor" | "downstream";

type SaturationScenario = {
  load: number;
  retries: number;
  capacities: Record<SaturationStageId, number>;
};

type SaturationStage = {
  id: SaturationStageId;
  label: string;
  shortLabel: string;
  signal: string;
  recovery: string;
};

const saturationStages: SaturationStage[] = [
  {
    id: "ingestion",
    label: "Ingestion API",
    shortLabel: "API",
    signal: "Concurrent requests and admission latency.",
    recovery: "Enable ingress throttling or switch to buffered acceptance.",
  },
  {
    id: "database",
    label: "Database pool",
    shortLabel: "DB pool",
    signal: "Connection wait time and pool utilization.",
    recovery: "Shed optional reads or move aggregation out of the write path.",
  },
  {
    id: "processor",
    label: "Event processors",
    shortLabel: "Workers",
    signal: "Oldest event age and processing lag.",
    recovery: "Pause optional enrichment or scale the prepared worker pool.",
  },
  {
    id: "downstream",
    label: "Downstream quota",
    shortLabel: "Quota",
    signal: "HTTP 429 responses and remaining request quota.",
    recovery: "Open the circuit and buffer or defer downstream calls.",
  },
];

const saturationScenarios: Record<SaturationScenarioId, SaturationScenario> = {
  arrival: {
    load: 140,
    retries: 5,
    capacities: {
      ingestion: 180,
      database: 110,
      processor: 150,
      downstream: 130,
    },
  },
  dependency: {
    load: 85,
    retries: 20,
    capacities: {
      ingestion: 180,
      database: 150,
      processor: 140,
      downstream: 60,
    },
  },
  retry: {
    load: 110,
    retries: 55,
    capacities: {
      ingestion: 180,
      database: 150,
      processor: 130,
      downstream: 160,
    },
  },
  baseline: {
    load: 70,
    retries: 0,
    capacities: {
      ingestion: 180,
      database: 150,
      processor: 140,
      downstream: 120,
    },
  },
};

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-saturation-boundary-demo]",
)) {
  initializeSaturationBoundaryDemo(root);
}

function initializeSaturationBoundaryDemo(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>(
    "[data-saturation-boundary-form]",
  );
  const scenario = root.querySelector<HTMLSelectElement>(
    "[data-saturation-boundary-scenario]",
  );
  const load = root.querySelector<HTMLInputElement>(
    "[data-saturation-boundary-load]",
  );
  const retries = root.querySelector<HTMLInputElement>(
    "[data-saturation-boundary-retries]",
  );
  const backpressure = root.querySelector<HTMLInputElement>(
    "[data-saturation-boundary-backpressure]",
  );
  const pipeline = root.querySelector<HTMLElement>(
    "[data-saturation-boundary-pipeline]",
  );
  const verdict = root.querySelector<HTMLElement>(
    "[data-saturation-boundary-verdict]",
  );
  const summary = root.querySelector<HTMLElement>(
    "[data-saturation-boundary-summary]",
  );
  const diagnosis = root.querySelector<HTMLElement>(
    "[data-saturation-boundary-diagnosis]",
  );
  const signal = root.querySelector<HTMLElement>(
    "[data-saturation-boundary-signal]",
  );
  const recovery = root.querySelector<HTMLElement>(
    "[data-saturation-boundary-recovery]",
  );
  const next = root.querySelector<HTMLElement>(
    "[data-saturation-boundary-next]",
  );
  const effectiveLoad = root.querySelector<HTMLElement>(
    "[data-saturation-boundary-effective-load]",
  );
  const artifact = root.querySelector<HTMLTextAreaElement>(
    "[data-saturation-boundary-artifact]",
  );
  const expand = root.querySelector<HTMLButtonElement>(
    "[data-saturation-boundary-expand]",
  );
  const copy = root.querySelector<HTMLButtonElement>(
    "[data-saturation-boundary-copy]",
  );
  const loadOutput = root.querySelector<HTMLOutputElement>(
    "[data-saturation-boundary-output='load']",
  );
  const retryOutput = root.querySelector<HTMLOutputElement>(
    "[data-saturation-boundary-output='retries']",
  );
  const capacityInputs = Array.from(
    root.querySelectorAll<HTMLInputElement>(
      "[data-saturation-boundary-capacity]",
    ),
  );
  const capacityOutputs = Array.from(
    root.querySelectorAll<HTMLOutputElement>(
      "[data-saturation-boundary-capacity-output]",
    ),
  );
  const metrics = Array.from(
    root.querySelectorAll<HTMLElement>("[data-saturation-boundary-metric]"),
  );

  if (
    !form ||
    !scenario ||
    !load ||
    !retries ||
    !backpressure ||
    !pipeline ||
    !verdict ||
    !summary ||
    !diagnosis ||
    !signal ||
    !recovery ||
    !next ||
    !effectiveLoad ||
    !artifact ||
    !expand ||
    !copy ||
    !loadOutput ||
    !retryOutput
  ) {
    return;
  }

  const render = () => {
    const offeredLoad = Number(load.value);
    const retryRate = Number(retries.value);
    const demand = Math.round(offeredLoad * (1 + retryRate / 100));
    const capacities = getSaturationCapacities(capacityInputs);
    const result = analyzeSaturationBoundary(
      demand,
      capacities,
      backpressure.checked,
    );

    loadOutput.value = `${offeredLoad} ev/s`;
    loadOutput.textContent = loadOutput.value;
    retryOutput.value = `${retryRate}%`;
    retryOutput.textContent = retryOutput.value;
    capacityOutputs.forEach((output) => {
      const id = output.dataset
        .saturationBoundaryCapacityOutput as SaturationStageId;
      output.value = String(capacities[id]);
      output.textContent = output.value;
    });

    effectiveLoad.textContent = `${demand} ev/s`;
    pipeline.innerHTML = buildSaturationPipeline(demand, capacities);
    root.dataset.saturationState = result.saturated ? "saturated" : "healthy";
    verdict.textContent = result.saturated
      ? `${result.boundary.label} saturated`
      : `${result.boundary.label} is closest`;
    summary.textContent = result.saturated
      ? `${Math.abs(result.headroom)} ev/s above current capacity.`
      : `${result.headroom} ev/s of headroom remains.`;
    diagnosis.textContent = buildSaturationDiagnosis(
      result,
      backpressure.checked,
    );
    signal.textContent = result.boundary.signal;
    recovery.textContent = result.boundary.recovery;
    next.textContent = `${result.next.label} at ${result.nextCapacity} ev/s`;
    updateSaturationMetrics(metrics, result);
    artifact.value = buildSaturationArtifact({
      scenario:
        scenario.options[scenario.selectedIndex]?.textContent?.trim() ??
        "Custom scenario",
      offeredLoad,
      retryRate,
      demand,
      backpressure: backpressure.checked,
      result,
    });
  };

  scenario.addEventListener("change", () => {
    const preset =
      saturationScenarios[scenario.value as SaturationScenarioId] ??
      saturationScenarios.arrival;

    load.value = String(preset.load);
    retries.value = String(preset.retries);
    backpressure.checked = false;
    capacityInputs.forEach((input) => {
      const id = input.dataset.saturationBoundaryCapacity as SaturationStageId;
      input.value = String(preset.capacities[id]);
    });
    render();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  expand.addEventListener("click", () => {
    const capacities = getSaturationCapacities(capacityInputs);
    const demand = Math.round(
      Number(load.value) * (1 + Number(retries.value) / 100),
    );
    const result = analyzeSaturationBoundary(
      demand,
      capacities,
      backpressure.checked,
    );
    const input = capacityInputs.find(
      (candidate) =>
        candidate.dataset.saturationBoundaryCapacity === result.boundary.id,
    );

    if (input) {
      input.value = String(
        Math.min(Number(input.max), Number(input.value) + 40),
      );
      scenario.value = "";
      render();
    }
  });
  copy.addEventListener("click", async () => {
    artifact.select();

    try {
      await navigator.clipboard.writeText(artifact.value);
      copy.textContent = "Copied";
      window.setTimeout(() => {
        copy.textContent = "Copy report";
      }, 1400);
    } catch {
      copy.textContent = "Select text";
    }
  });

  render();
}

function getSaturationCapacities(inputs: HTMLInputElement[]) {
  return saturationStages.reduce<Record<SaturationStageId, number>>(
    (capacities, stage) => {
      const input = inputs.find(
        (candidate) =>
          candidate.dataset.saturationBoundaryCapacity === stage.id,
      );
      capacities[stage.id] = Number(input?.value ?? 0);
      return capacities;
    },
    {
      ingestion: 0,
      database: 0,
      processor: 0,
      downstream: 0,
    },
  );
}

function analyzeSaturationBoundary(
  demand: number,
  capacities: Record<SaturationStageId, number>,
  backpressure: boolean,
) {
  const ranked = saturationStages
    .map((stage) => ({ stage, capacity: capacities[stage.id] }))
    .sort((left, right) => left.capacity - right.capacity);
  const boundary = ranked[0];

  if (!boundary) {
    throw new Error("The saturation model requires at least one stage.");
  }

  const next = ranked[1] ?? boundary;
  const headroom = boundary.capacity - demand;
  const excess = Math.max(0, demand - boundary.capacity);

  return {
    boundary: boundary.stage,
    boundaryCapacity: boundary.capacity,
    next: next.stage,
    nextCapacity: next.capacity,
    headroom,
    saturated: headroom < 0,
    backlog: backpressure ? 0 : excess,
    rejected: backpressure ? excess : 0,
  };
}

function buildSaturationPipeline(
  demand: number,
  capacities: Record<SaturationStageId, number>,
) {
  const minimumCapacity = Math.min(...Object.values(capacities));

  return saturationStages
    .map((stage, index) => {
      const capacity = capacities[stage.id];
      const utilization = capacity === 0 ? 0 : demand / capacity;
      const state =
        utilization > 1 ? "saturated" : utilization >= 0.8 ? "near" : "healthy";
      const isBoundary = capacity === minimumCapacity;
      const utilizationPercent = Math.round(utilization * 100);
      const pressure = Math.min(100, utilizationPercent);

      return `<article
        class="saturation-boundary-stage"
        data-state="${state}"
        data-boundary="${isBoundary ? "true" : "false"}"
        style="--stage-pressure: ${pressure}%"
      >
        <span class="saturation-boundary-stage-index">0${index + 1}</span>
        <div>
          <strong>${escapeSaturationHtml(stage.label)}</strong>
          <small>${capacity} ev/s capacity</small>
        </div>
        <div class="saturation-boundary-meter" role="img" aria-label="${utilizationPercent}% of declared capacity">
          <i></i>
        </div>
        <b>${utilizationPercent}%</b>
        <em data-active="${isBoundary ? "true" : "false"}">Binding limit</em>
      </article>`;
    })
    .join("");
}

function buildSaturationDiagnosis(
  result: ReturnType<typeof analyzeSaturationBoundary>,
  backpressure: boolean,
) {
  if (!result.saturated) {
    return `${result.boundary.label} is closest to its limit, but all modeled stages have spare capacity.`;
  }

  if (backpressure) {
    return `${result.boundary.label} is binding. Backpressure keeps hidden backlog at zero by rejecting ${result.rejected} events each second explicitly.`;
  }

  return `${result.boundary.label} is binding. Uncontrolled demand adds ${result.backlog} events of hidden work each second.`;
}

function updateSaturationMetrics(
  nodes: HTMLElement[],
  result: ReturnType<typeof analyzeSaturationBoundary>,
) {
  nodes.forEach((node) => {
    const key = node.dataset.saturationBoundaryMetric;

    if (key === "boundary") {
      node.textContent = result.boundary.shortLabel;
    } else if (key === "headroom") {
      node.textContent = `${result.headroom} ev/s`;
    } else if (key === "backlog") {
      node.textContent = `${result.backlog} ev/s`;
    } else if (key === "rejected") {
      node.textContent = `${result.rejected} ev/s`;
    }
  });
}

function buildSaturationArtifact({
  scenario,
  offeredLoad,
  retryRate,
  demand,
  backpressure,
  result,
}: {
  scenario: string;
  offeredLoad: number;
  retryRate: number;
  demand: number;
  backpressure: boolean;
  result: ReturnType<typeof analyzeSaturationBoundary>;
}) {
  return [
    "Saturation Boundary Report",
    "",
    `Scenario: ${scenario}`,
    `Offered load: ${offeredLoad} events/s`,
    `Retry amplification: ${retryRate}%`,
    `Effective demand: ${demand} events/s`,
    `Ingress backpressure: ${backpressure ? "enabled" : "disabled"}`,
    "",
    `First boundary: ${result.boundary.label}`,
    `Declared capacity: ${result.boundaryCapacity} events/s`,
    `Headroom: ${result.headroom} events/s`,
    `Hidden backlog growth: ${result.backlog} events/s`,
    `Explicitly rejected: ${result.rejected} events/s`,
    `First useful signal: ${result.boundary.signal}`,
    `Prepared recovery: ${result.boundary.recovery}`,
    `Next closest boundary: ${result.next.label} at ${result.nextCapacity} events/s`,
    "",
    "Model limit:",
    "This comparison uses declared rates and does not predict production capacity, latency distributions, or interactions between stages.",
  ].join("\n");
}

function escapeSaturationHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
