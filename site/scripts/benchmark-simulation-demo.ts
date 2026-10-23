type BenchmarkSettings = {
  slowRate: number;
  threshold: number;
};

type SimulatedRequest = {
  latency: number;
  slow: boolean;
};

type BenchmarkOutcome = "both-pass" | "tail-fails" | "both-fail" | "unusual";

type BenchmarkResult = {
  settings: BenchmarkSettings;
  requests: SimulatedRequest[];
  average: number;
  p50: number;
  p95: number;
  maximum: number;
  outcome: BenchmarkOutcome;
};

const simulatedRequestCount = 60;

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-benchmark-simulation-demo]",
)) {
  initializeBenchmarkSimulation(root);
}

function initializeBenchmarkSimulation(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>(
    "[data-benchmark-demo-form]",
  );
  const chart = root.querySelector<HTMLElement>("[data-benchmark-demo-chart]");
  const verdict = root.querySelector<HTMLElement>(
    "[data-benchmark-demo-verdict]",
  );
  const interpretation = root.querySelector<HTMLElement>(
    "[data-benchmark-demo-interpretation]",
  );
  const comparison = root.querySelector<HTMLElement>(
    "[data-benchmark-demo-comparison]",
  );
  const runButton = root.querySelector<HTMLButtonElement>(
    ".benchmark-demo-run",
  );

  if (
    !form ||
    !chart ||
    !verdict ||
    !interpretation ||
    !comparison ||
    !runButton
  ) {
    return;
  }

  let previousResult: BenchmarkResult | null = null;
  let hasPendingChanges = false;

  updateBenchmarkOutputs(root, readBenchmarkSettings(root));
  chart.classList.add("is-awaiting");

  form.addEventListener("input", (event) => {
    const target = event.target as HTMLInputElement | HTMLSelectElement;

    if (target.matches("[data-benchmark-demo-input]")) {
      updateBenchmarkOutputs(root, readBenchmarkSettings(root));
      hasPendingChanges = true;
      chart.classList.add("is-stale");
      verdict.textContent = previousResult
        ? "Workload changed—predict the next result"
        : "Choose a claim before measuring";
    }

    updateRunButton(root, runButton, previousResult, hasPendingChanges);
  });

  form.addEventListener("change", (event) => {
    const target = event.target as HTMLInputElement | HTMLSelectElement;

    if (target.matches("[data-benchmark-demo-input]")) {
      updateBenchmarkOutputs(root, readBenchmarkSettings(root));
      hasPendingChanges = true;
      chart.classList.add("is-stale");
      verdict.textContent = previousResult
        ? "Workload changed—predict the next result"
        : "Choose a claim before measuring";
    }

    updateRunButton(root, runButton, previousResult, hasPendingChanges);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const prediction = readPrediction(root);

    if (!prediction) {
      return;
    }

    const result = runBenchmark(readBenchmarkSettings(root));
    const predictionMatched = prediction === result.outcome;

    updateBenchmarkMetrics(root, result);
    renderBenchmarkChart(chart, result.requests, result.settings);
    verdict.textContent = `${predictionMatched ? "Prediction confirmed" : "Prediction challenged"} — ${getOutcomeLabel(result.outcome)}`;
    interpretation.textContent = getBenchmarkInterpretation(result);
    renderBenchmarkComparison(comparison, previousResult, result);

    previousResult = result;
    hasPendingChanges = false;
    clearPrediction(root);
    updateRunButton(root, runButton, previousResult, hasPendingChanges);
  });
}

function runBenchmark(settings: BenchmarkSettings): BenchmarkResult {
  const requests = simulateRequests(settings);
  const latencies = requests.map(({ latency }) => latency);
  const average = Math.round(
    latencies.reduce((total, latency) => total + latency, 0) / latencies.length,
  );
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const maximum = Math.max(...latencies);

  return {
    settings,
    requests,
    average,
    p50,
    p95,
    maximum,
    outcome: getBenchmarkOutcome(
      average < settings.threshold,
      p95 < settings.threshold,
    ),
  };
}

function readBenchmarkSettings(root: HTMLElement): BenchmarkSettings {
  return {
    slowRate: readNumber(root, "slow-rate", 10),
    threshold: readNumber(root, "threshold", 120),
  };
}

function readNumber(root: HTMLElement, key: string, fallback: number) {
  const input = root.querySelector<HTMLInputElement | HTMLSelectElement>(
    `[data-benchmark-demo-input="${key}"]`,
  );
  const value = Number(input?.value);

  return Number.isFinite(value) ? value : fallback;
}

function readPrediction(root: HTMLElement): BenchmarkOutcome | null {
  const selected = root.querySelector<HTMLInputElement>(
    "[data-benchmark-demo-prediction]:checked",
  );

  return isBenchmarkOutcome(selected?.value) ? selected.value : null;
}

function isBenchmarkOutcome(
  value: string | undefined,
): value is BenchmarkOutcome {
  return (
    value === "both-pass" ||
    value === "tail-fails" ||
    value === "both-fail" ||
    value === "unusual"
  );
}

function clearPrediction(root: HTMLElement) {
  for (const input of root.querySelectorAll<HTMLInputElement>(
    "[data-benchmark-demo-prediction]",
  )) {
    input.checked = false;
  }
}

function updateRunButton(
  root: HTMLElement,
  button: HTMLButtonElement,
  previousResult: BenchmarkResult | null,
  hasPendingChanges: boolean,
) {
  const hasPrediction = Boolean(readPrediction(root));
  button.disabled = !hasPrediction;

  if (hasPrediction && previousResult) {
    button.textContent = hasPendingChanges
      ? "Test changed workload"
      : "Test another prediction";
  } else if (hasPrediction) {
    button.textContent = "Test prediction on 60 requests";
  } else if (previousResult) {
    button.textContent = hasPendingChanges
      ? "Predict the changed result"
      : "Change one condition, then predict";
  } else {
    button.textContent = "Choose a prediction first";
  }
}

function simulateRequests(settings: BenchmarkSettings): SimulatedRequest[] {
  const slowInterval = settings.slowRate === 0 ? 0 : 100 / settings.slowRate;

  return Array.from({ length: simulatedRequestCount }, (_, index) => {
    const slow = slowInterval > 0 && (index + 1) % slowInterval === 0;
    const normalVariation = (index * 7) % 11;
    const latency = 24 + normalVariation + (slow ? 188 : 0);

    return { latency, slow };
  });
}

function percentile(values: number[], requestedPercentile: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((requestedPercentile / 100) * sorted.length) - 1;

  return sorted[Math.max(0, index)] ?? 0;
}

function updateBenchmarkOutputs(
  root: HTMLElement,
  settings: BenchmarkSettings,
) {
  const threshold = root.querySelector<HTMLOutputElement>(
    '[data-benchmark-demo-output="threshold"]',
  );

  if (threshold) {
    threshold.value = `${settings.threshold} ms`;
  }
}

function updateBenchmarkMetrics(root: HTMLElement, result: BenchmarkResult) {
  const metrics = {
    average: result.average,
    p50: result.p50,
    p95: result.p95,
    maximum: result.maximum,
  };

  for (const [key, value] of Object.entries(metrics)) {
    const metric = root.querySelector<HTMLElement>(
      `[data-benchmark-demo-metric="${key}"]`,
    );

    if (metric) {
      metric.textContent = `${value} ms`;
    }
  }
}

function renderBenchmarkChart(
  chart: HTMLElement,
  requests: SimulatedRequest[],
  settings: BenchmarkSettings,
) {
  const maximum = Math.max(
    settings.threshold,
    ...requests.map(({ latency }) => latency),
  );
  const scaleMaximum = Math.ceil((maximum + 20) / 50) * 50;
  const thresholdPosition = Math.min(
    100,
    (settings.threshold / scaleMaximum) * 100,
  );
  const ordered = [...requests].sort((a, b) => a.latency - b.latency);
  const bars = ordered
    .map(({ latency, slow }, index) => {
      const height = Math.max(4, (latency / scaleMaximum) * 100);

      return `<i class="${slow ? "is-slow" : "is-typical"}${index === 56 ? " is-percentile" : ""}" style="--benchmark-bar-height: ${height}%; --benchmark-bar-delay: ${index * 8}ms"><span>Rank ${index + 1}${index === 56 ? " (p95)" : ""}: ${latency} ms${slow ? ", slow storage path" : ""}</span></i>`;
    })
    .join("");

  chart.classList.remove("is-awaiting", "is-stale");
  chart.classList.remove("is-animated");
  void chart.offsetWidth;
  chart.classList.add("is-animated");
  chart.style.setProperty(
    "--benchmark-threshold-position",
    `${thresholdPosition}%`,
  );
  chart.innerHTML = `<div class="benchmark-demo-threshold" aria-hidden="true"><span>${settings.threshold} ms objective</span></div>${bars}`;
  chart.setAttribute(
    "aria-label",
    `Ordered simulated latency for ${requests.length} requests. Nearest-rank p95 is rank 57. The objective is strictly below ${settings.threshold} milliseconds. Slow-path requests are highlighted.`,
  );

  const records = chart
    .closest("[data-benchmark-simulation-demo]")
    ?.querySelector<HTMLElement>("[data-benchmark-demo-records]");
  if (records)
    records.textContent = ordered
      .map(
        ({ latency }, index) =>
          `${index + 1}: ${latency} ms${index === 56 ? " ← p95" : ""}`,
      )
      .join("; ");

  const axisMaximum = chart.parentElement?.querySelector<HTMLElement>(
    "[data-benchmark-demo-axis-maximum]",
  );
  if (axisMaximum) {
    axisMaximum.textContent = `${scaleMaximum} ms`;
  }
}

function renderBenchmarkComparison(
  comparison: HTMLElement,
  previousResult: BenchmarkResult | null,
  result: BenchmarkResult,
) {
  comparison.hidden = false;

  if (!previousResult) {
    comparison.textContent =
      "Baseline recorded. Change one condition, make a new prediction, and compare the next run.";
    return;
  }

  comparison.textContent = `Change from previous run: average ${formatDelta(result.average - previousResult.average)}; p95 ${formatDelta(result.p95 - previousResult.p95)}.`;
}

function formatDelta(delta: number) {
  if (delta === 0) {
    return "unchanged";
  }

  return `${delta > 0 ? "+" : "−"}${Math.abs(delta)} ms`;
}

function getBenchmarkOutcome(
  averagePasses: boolean,
  p95Passes: boolean,
): BenchmarkOutcome {
  if (averagePasses && p95Passes) {
    return "both-pass";
  }
  if (averagePasses && !p95Passes) {
    return "tail-fails";
  }
  if (!averagePasses && !p95Passes) {
    return "both-fail";
  }

  return "unusual";
}

function getOutcomeLabel(outcome: BenchmarkOutcome) {
  const labels: Record<BenchmarkOutcome, string> = {
    "both-pass": "average and p95 pass",
    "tail-fails": "average passes; p95 fails",
    "both-fail": "average and p95 fail",
    unusual: "inspect the distribution",
  };

  return labels[outcome];
}

function getBenchmarkInterpretation(result: BenchmarkResult) {
  const misses = result.requests.filter(
    ({ latency }) => latency >= result.settings.threshold,
  ).length;
  return `Nearest-rank p95 selects rank ceil(0.95 × 60) = 57: ${result.p95} ms. ${misses} of 60 requests miss the strictly-below-${result.settings.threshold} ms objective. ${result.outcome === "both-pass" && misses > 0 ? "A passing p95 can leave slow requests beyond rank 57. " : ""}These are constructed records, not a capacity measurement. Compare 5% and 10% slow paths: which ranks change?`;
}
