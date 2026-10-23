type SaturationStageId = "ingestion" | "database" | "processor" | "downstream";

type SaturationStage = {
  id: SaturationStageId;
  label: string;
  shortLabel: string;
  signal: string;
};

const saturationStages: SaturationStage[] = [
  {
    id: "ingestion",
    label: "Ingestion API",
    shortLabel: "API",
    signal: "Concurrent requests and admission latency.",
  },
  {
    id: "database",
    label: "Database pool",
    shortLabel: "DB pool",
    signal: "Connection wait time and pool utilization.",
  },
  {
    id: "processor",
    label: "Event processors",
    shortLabel: "Workers",
    signal: "Oldest event age and processing lag.",
  },
  {
    id: "downstream",
    label: "Downstream quota",
    shortLabel: "Quota",
    signal: "HTTP 429 responses and remaining request quota.",
  },
];

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-saturation-boundary-demo]",
)) {
  initializeSaturationBoundaryDemo(root);
}

function initializeSaturationBoundaryDemo(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>(
    "[data-saturation-boundary-form]",
  );
  const load = root.querySelector<HTMLInputElement>(
    "[data-saturation-boundary-load]",
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
  const effectiveLoad = root.querySelector<HTMLElement>(
    "[data-saturation-boundary-effective-load]",
  );
  const expand = root.querySelector<HTMLButtonElement>(
    "[data-saturation-boundary-expand]",
  );
  const loadOutput = root.querySelector<HTMLOutputElement>(
    "[data-saturation-boundary-output='load']",
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
    !load ||
    !backpressure ||
    !pipeline ||
    !verdict ||
    !summary ||
    !diagnosis ||
    !signal ||
    !effectiveLoad ||
    !expand ||
    !loadOutput
  ) {
    return;
  }

  const render = () => {
    const offeredLoad = Number(load.value);
    const demand = offeredLoad;
    const capacities = getSaturationCapacities(capacityInputs);
    const result = analyzeSaturationBoundary(
      demand,
      capacities,
      backpressure.checked,
    );

    loadOutput.value = `${offeredLoad} ev/s`;
    loadOutput.textContent = loadOutput.value;
    capacityOutputs.forEach((output) => {
      const id = output.dataset
        .saturationBoundaryCapacityOutput as SaturationStageId;
      output.value = String(capacities[id]);
      output.textContent = output.value;
    });

    effectiveLoad.textContent = `${demand} ev/s`;
    pipeline.innerHTML = buildSaturationPipeline(result.admitted, capacities);
    root.dataset.saturationState = result.saturated
      ? "saturated"
      : result.atLimit
        ? "at-limit"
        : "healthy";
    verdict.textContent = result.saturated
      ? `${result.boundary.label} saturated`
      : result.atLimit
        ? `${result.boundary.label} at capacity`
        : `${result.boundary.label} is closest`;
    summary.textContent = result.saturated
      ? `${Math.abs(result.headroom)} ev/s above current capacity.`
      : `${result.headroom} ev/s of headroom remains.`;
    diagnosis.textContent = buildSaturationDiagnosis(
      result,
      backpressure.checked,
    );
    signal.textContent = result.boundary.signal;
    updateSaturationMetrics(metrics, result);
    const comparison = root.querySelector<HTMLElement>(
      "[data-saturation-boundary-comparison]",
    );
    if (comparison)
      comparison.textContent =
        "Predict which stage will limit completion after one capacity increase, then compare.";
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  expand.addEventListener("click", () => {
    const capacities = getSaturationCapacities(capacityInputs);
    const demand = Number(load.value);
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
      render();
      const after = analyzeSaturationBoundary(
        demand,
        getSaturationCapacities(capacityInputs),
        backpressure.checked,
      );
      const comparison = root.querySelector<HTMLElement>(
        "[data-saturation-boundary-comparison]",
      );
      if (comparison)
        comparison.textContent = `Before expansion: ${result.boundary.label}, ${result.completed} completed/s. After: ${after.boundary.label}, ${after.completed} completed/s. The smallest remaining capacity limits completion.`;
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
    atLimit: headroom === 0,
    saturated: headroom < 0,
    admitted: backpressure ? Math.min(demand, boundary.capacity) : demand,
    completed: Math.min(demand, boundary.capacity),
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
        utilization > 1
          ? "saturated"
          : utilization === 1
            ? "at-limit"
            : "healthy";
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
        <div class="saturation-boundary-meter" role="img" aria-label="Admitted rate is ${utilizationPercent}% of this declared limit">
          <i></i>
        </div>
        <b>${demand} admitted/s</b>
        <em data-active="${isBoundary ? "true" : "false"}">Binding limit</em>
      </article>`;
    })
    .join("");
}

function buildSaturationDiagnosis(
  result: ReturnType<typeof analyzeSaturationBoundary>,
  backpressure: boolean,
) {
  if (result.atLimit) {
    return `${result.boundary.label} is at capacity with no headroom. Declared demand equals the limit; this rate model has no excess to queue or reject.`;
  }
  if (!result.saturated) {
    return `${result.boundary.label} is closest to its limit, but all modeled stages have spare capacity.`;
  }

  if (backpressure) {
    return `${result.boundary.label} is binding. Backpressure limits admitted work to ${result.admitted} events/s, rejecting ${result.rejected} events each second. Completed work stays ${result.completed} events/s.`;
  }

  return `${result.boundary.label} is binding. Uncontrolled demand adds ${result.backlog} queued events each second; ${result.completed} events/s complete.`;
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
    } else if (key === "admitted") {
      node.textContent = `${result.admitted} ev/s`;
    } else if (key === "completed") {
      node.textContent = `${result.completed} ev/s`;
    }
  });
}

function escapeSaturationHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
