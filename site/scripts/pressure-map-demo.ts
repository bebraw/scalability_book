type PressureAssumptionKey =
  | "burst"
  | "offline"
  | "tenants"
  | "old-client"
  | "deletion"
  | "slow-summary";

type PressureAssumption = {
  label: string;
  pressure: string;
  component: string;
  failure: string;
  signal: string;
  response: string;
};

const pressureAssumptions: Record<PressureAssumptionKey, PressureAssumption> = {
  burst: {
    label: "Burst traffic during a 20-minute peak",
    pressure: "Write burst",
    component: "Event ingestion API",
    failure: "Requests queue up, time out, or overload the write database.",
    signal: "p95 write latency rises before the dashboard visibly fails.",
    response:
      "Separate ingestion from processing, add backpressure, and measure write latency.",
  },
  offline: {
    label: "Offline clients retry the same event",
    pressure: "Retry storm",
    component: "Validation and storage boundary",
    failure:
      "Duplicate events inflate counts and make summaries untrustworthy.",
    signal:
      "Duplicate event IDs or repeated payload hashes increase after reconnects.",
    response: "Add idempotency keys and deduplicate before deriving summaries.",
  },
  tenants: {
    label: "Multiple tenants share the same system",
    pressure: "Isolation",
    component: "Storage and query model",
    failure: "One large tenant slows down reads and writes for everyone else.",
    signal:
      "Latency and error rate correlate with one tenant or domain instance.",
    response:
      "Partition by tenant boundary and add per-tenant rate limits or quotas.",
  },
  "old-client": {
    label: "Old clients submit malformed events",
    pressure: "Compatibility",
    component: "API contract",
    failure:
      "The server accepts ambiguous data or rejects valid older clients.",
    signal: "Validation errors cluster by client version and event schema.",
    response:
      "Version the event contract and keep server-side validation explicit.",
  },
  deletion: {
    label: "A customer requests data deletion",
    pressure: "Governance",
    component: "Retention and derived data",
    failure:
      "Raw events are deleted but summaries, exports, or logs still reveal data.",
    signal: "Deletion audit cannot prove every derived copy was updated.",
    response:
      "Track data lineage, define retention rules, and rebuild derived views after deletion.",
  },
  "slow-summary": {
    label: "Users need summaries before data settles",
    pressure: "Freshness",
    component: "Read model",
    failure:
      "The dashboard shows stale or inconsistent totals during processing lag.",
    signal: "Summary lag grows while raw event ingestion still succeeds.",
    response:
      "Expose freshness, use derived views, and make delayed correctness visible.",
  },
};

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-pressure-map-demo]",
)) {
  initializePressureMapDemo(root);
}

function initializePressureMapDemo(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>(
    "[data-pressure-map-demo-form]",
  );
  const toggles = Array.from(
    root.querySelectorAll<HTMLInputElement>(
      "[data-pressure-map-demo-assumption]",
    ),
  );
  const board = root.querySelector<HTMLElement>(
    "[data-pressure-map-demo-board]",
  );
  const metrics = Array.from(
    root.querySelectorAll<HTMLElement>("[data-pressure-map-demo-metric]"),
  );
  const verdict = root.querySelector<HTMLElement>(
    "[data-pressure-map-demo-verdict]",
  );
  const interpretation = root.querySelector<HTMLElement>(
    "[data-pressure-map-demo-interpretation]",
  );
  const artifact = root.querySelector<HTMLTextAreaElement>(
    "[data-pressure-map-demo-artifact]",
  );
  const copy = root.querySelector<HTMLButtonElement>(
    "[data-pressure-map-demo-copy]",
  );
  const steps = Array.from(
    root.querySelectorAll<HTMLElement>("[data-pressure-map-demo-step]"),
  );
  const tabs = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-pressure-map-demo-tab]"),
  );
  const previous = root.querySelector<HTMLButtonElement>(
    "[data-pressure-map-demo-prev]",
  );
  const next = root.querySelector<HTMLButtonElement>(
    "[data-pressure-map-demo-next]",
  );

  if (
    !form ||
    !board ||
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
  const showStep = (step: number, focusStep = false) => {
    currentStep = Math.max(0, Math.min(step, steps.length - 1));
    updatePressureMapStage(steps, tabs, previous, next, currentStep, focusStep);
  };
  const render = () => {
    const selected = getSelectedAssumptions(toggles);
    const result = analyzePressureMap(selected);

    board.innerHTML = buildPressureMapBoard(selected);
    updatePressureMapMetrics(metrics, selected, result);
    verdict.textContent = buildPressureMapVerdict(selected, result);
    interpretation.textContent = buildPressureMapInterpretation(
      selected,
      result,
    );
    artifact.value = buildPressureMapArtifact(selected, result);
    updatePressureMapStage(steps, tabs, previous, next, currentStep, false);
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

function getSelectedAssumptions(inputs: HTMLInputElement[]) {
  const selected = inputs
    .filter((input) => input.checked)
    .map((input) => input.value)
    .filter(isPressureAssumptionKey);

  return selected;
}

function isPressureAssumptionKey(
  value: string,
): value is PressureAssumptionKey {
  return value in pressureAssumptions;
}

function analyzePressureMap(selected: PressureAssumptionKey[]) {
  if (selected.length === 0) {
    return {
      component: "-",
      pressure: "-",
    };
  }

  const componentCounts = new Map<string, number>();
  const pressureCounts = new Map<string, number>();

  selected.forEach((key) => {
    const assumption = pressureAssumptions[key];

    componentCounts.set(
      assumption.component,
      (componentCounts.get(assumption.component) ?? 0) + 1,
    );
    pressureCounts.set(
      assumption.pressure,
      (pressureCounts.get(assumption.pressure) ?? 0) + 1,
    );
  });

  return {
    component: getMostCommon(componentCounts) ?? "Event ingestion API",
    pressure: getMostCommon(pressureCounts) ?? "Write burst",
  };
}

function getMostCommon(counts: Map<string, number>) {
  let winner: string | undefined;
  let winnerCount = 0;

  counts.forEach((count, key) => {
    if (count > winnerCount) {
      winner = key;
      winnerCount = count;
    }
  });

  return winner;
}

function buildPressureMapBoard(selected: PressureAssumptionKey[]) {
  if (selected.length === 0) {
    return `<article class="pressure-map-empty">
      <strong>No changed assumptions selected</strong>
      <p>Choose at least one pressure from the first step to map what breaks first.</p>
    </article>`;
  }

  return selected
    .map((key, index) => {
      const assumption = pressureAssumptions[key];

      return `<article class="pressure-map-card">
        <span>${index + 1}</span>
        <div>
          <strong>${escapePressureMapHtml(assumption.label)}</strong>
          <dl>
            <div>
              <dt>Stressed part</dt>
              <dd>${escapePressureMapHtml(assumption.component)}</dd>
            </div>
            <div>
              <dt>Likely failure</dt>
              <dd>${escapePressureMapHtml(assumption.failure)}</dd>
            </div>
            <div>
              <dt>First signal</dt>
              <dd>${escapePressureMapHtml(assumption.signal)}</dd>
            </div>
          </dl>
        </div>
        <small>${escapePressureMapHtml(assumption.pressure)}</small>
      </article>`;
    })
    .join("");
}

function updatePressureMapMetrics(
  nodes: HTMLElement[],
  selected: PressureAssumptionKey[],
  result: ReturnType<typeof analyzePressureMap>,
) {
  nodes.forEach((node) => {
    const key = node.dataset.pressureMapDemoMetric;

    if (key === "count") {
      node.textContent = String(selected.length);
    } else if (key === "pressure") {
      node.textContent = result.pressure;
    } else if (key === "component") {
      node.textContent = result.component;
    }
  });
}

function buildPressureMapVerdict(
  selected: PressureAssumptionKey[],
  result: ReturnType<typeof analyzePressureMap>,
) {
  if (selected.length === 0) {
    return "Choose changed assumptions";
  }

  return `${selected.length} assumption${selected.length === 1 ? "" : "s"} stress ${result.component}`;
}

function buildPressureMapInterpretation(
  selected: PressureAssumptionKey[],
  result: ReturnType<typeof analyzePressureMap>,
) {
  if (selected.length === 0) {
    return "Pick at least one changed assumption to reveal the first likely failure.";
  }

  const firstSignal = pressureAssumptions[selected[0] ?? "burst"].signal;

  return `${result.pressure} is the strongest pressure. Watch first for: ${firstSignal}`;
}

function buildPressureMapArtifact(
  selected: PressureAssumptionKey[],
  result: ReturnType<typeof analyzePressureMap>,
) {
  if (selected.length === 0) {
    return [
      "Reconstruct pressure brief",
      "",
      "No changed assumptions selected.",
      "",
      "Reconstruct rule:",
      "Name the changed assumption before choosing a scaling technique.",
    ].join("\n");
  }

  return [
    "Reconstruct pressure brief",
    "",
    `Changed assumptions: ${selected.length}`,
    `Primary pressure: ${result.pressure}`,
    `Most stressed part: ${result.component}`,
    "",
    "Pressure map:",
    ...selected.flatMap((key) => {
      const assumption = pressureAssumptions[key];

      return [
        `- Assumption: ${assumption.label}`,
        `  Stressed part: ${assumption.component}`,
        `  Likely failure: ${assumption.failure}`,
        `  First signal: ${assumption.signal}`,
        `  Response: ${assumption.response}`,
      ];
    }),
    "",
    "Reconstruct rule:",
    "Choose the response that matches the first stressed component and the first observable signal. Do not add scaling techniques before the pressure is named.",
  ].join("\n");
}

function updatePressureMapStage(
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

function escapePressureMapHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
