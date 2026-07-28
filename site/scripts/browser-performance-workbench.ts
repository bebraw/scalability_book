type WorkbenchStrategy = "single" | "chunked";

type WorkbenchSettings = {
  eventCount: number;
  strategy: WorkbenchStrategy;
};

type WorkbenchTrial = {
  total: number;
  longestSlice: number;
};

const trialCount = 5;
const batchSize = 100;

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-browser-performance-workbench]",
)) {
  initializeBrowserPerformanceWorkbench(root);
}

function initializeBrowserPerformanceWorkbench(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>(
    "[data-browser-performance-form]",
  );
  const runButton = root.querySelector<HTMLButtonElement>(
    "[data-browser-performance-run]",
  );
  const status = root.querySelector<HTMLElement>(
    "[data-browser-performance-status]",
  );
  const surface = root.querySelector<HTMLElement>(
    "[data-browser-performance-surface]",
  );

  if (!form || !runButton || !status || !surface) {
    return;
  }

  form.addEventListener("change", () => {
    status.textContent = "Workload changed—run five fresh trials";
    root.classList.add("is-stale");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const settings = readSettings(root);
    const trials: WorkbenchTrial[] = [];

    runButton.disabled = true;
    root.classList.remove("is-stale");
    root.classList.add("is-running");

    try {
      for (let index = 0; index < trialCount; index += 1) {
        status.textContent = `Measuring run ${index + 1} of ${trialCount}…`;
        surface.replaceChildren();
        await nextPaint();
        trials.push(await runTrial(surface, settings));
        renderChart(root, trials, trialCount);
      }

      renderResult(root, settings, trials);
      status.textContent = `Five runs complete · ${formatStrategy(settings.strategy)}`;
    } finally {
      root.classList.remove("is-running");
      runButton.disabled = false;
    }
  });
}

function readSettings(root: HTMLElement): WorkbenchSettings {
  const eventCount = Number(
    root.querySelector<HTMLSelectElement>(
      '[data-browser-performance-input="events"]',
    )?.value,
  );
  const strategyValue = root.querySelector<HTMLInputElement>(
    'input[name="browser-performance-strategy"]:checked',
  )?.value;

  return {
    eventCount: Number.isFinite(eventCount) ? eventCount : 1000,
    strategy: strategyValue === "chunked" ? "chunked" : "single",
  };
}

async function runTrial(
  surface: HTMLElement,
  settings: WorkbenchSettings,
): Promise<WorkbenchTrial> {
  const trialId = `${Date.now()}-${Math.random()}`;
  const startMark = `browser-workbench-start-${trialId}`;
  const endMark = `browser-workbench-end-${trialId}`;
  const measureName = `browser-workbench-total-${trialId}`;
  let longestSlice = 0;

  performance.mark(startMark);

  if (settings.strategy === "single") {
    longestSlice = appendAndFilterRange(
      surface,
      0,
      settings.eventCount,
    );
  } else {
    for (let start = 0; start < settings.eventCount; start += batchSize) {
      const end = Math.min(start + batchSize, settings.eventCount);
      longestSlice = Math.max(
        longestSlice,
        appendAndFilterRange(surface, start, end),
      );
      await nextFrame();
    }
  }

  // Force style and layout work into the measured interaction.
  void surface.offsetHeight;
  await nextPaint();

  performance.mark(endMark);
  const measure = performance.measure(measureName, startMark, endMark);
  performance.clearMarks(startMark);
  performance.clearMarks(endMark);
  performance.clearMeasures(measureName);

  return {
    total: measure.duration,
    longestSlice,
  };
}

function appendAndFilterRange(
  surface: HTMLElement,
  start: number,
  end: number,
) {
  const sliceStarted = performance.now();
  const fragment = document.createDocumentFragment();

  for (let index = start; index < end; index += 1) {
    const row = document.createElement("div");
    const isVisible = index % 7 === 0 || index % 11 === 0;
    row.className = `browser-performance-event${isVisible ? " is-match" : " is-filtered"}`;
    row.innerHTML = `<span>EVT-${String(index + 1).padStart(4, "0")}</span><strong>${eventLabel(index)}</strong><i>${isVisible ? "match" : "filtered"}</i>`;
    fragment.append(row);
  }

  surface.append(fragment);
  return performance.now() - sliceStarted;
}

function eventLabel(index: number) {
  if (index % 11 === 0) return "storage.retry";
  if (index % 7 === 0) return "event.created";
  return "event.observed";
}

function renderChart(
  root: HTMLElement,
  trials: WorkbenchTrial[],
  expectedCount: number,
) {
  const chart = root.querySelector<HTMLElement>(
    "[data-browser-performance-chart]",
  );

  if (!chart) return;

  const maximum = Math.max(...trials.map(({ total }) => total), 1);
  chart.innerHTML = trials
    .map(
      ({ total, longestSlice }, index) => `<div class="browser-performance-run">
<span>Run ${index + 1}</span>
<div><i style="inline-size:${Math.max(3, (total / maximum) * 100)}%"></i></div>
<strong>${formatDuration(total)}</strong>
<small>longest slice ${formatDuration(longestSlice)}</small>
</div>`,
    )
    .join("");
  chart.setAttribute(
    "aria-label",
    `${trials.length} of ${expectedCount} runs measured: ${trials.map(({ total }) => formatDuration(total)).join(", ")}`,
  );
}

function renderResult(
  root: HTMLElement,
  settings: WorkbenchSettings,
  trials: WorkbenchTrial[],
) {
  const totals = trials.map(({ total }) => total);
  const slices = trials.map(({ longestSlice }) => longestSlice);
  const minimum = Math.min(...totals);
  const maximum = Math.max(...totals);
  const medianTotal = median(totals);
  const medianSlice = median(slices);

  setMetric(root, "median", formatDuration(medianTotal));
  setMetric(root, "minimum", formatDuration(minimum));
  setMetric(root, "maximum", formatDuration(maximum));
  setMetric(root, "slice", formatDuration(medianSlice));

  const reading = root.querySelector<HTMLElement>(
    "[data-browser-performance-reading]",
  );

  if (reading) {
    const spread = maximum - minimum;
    reading.textContent = `${settings.eventCount.toLocaleString()} events produced a ${formatDuration(spread)} fastest-to-slowest spread. ${
      settings.strategy === "chunked"
        ? "Yielding can reduce uninterrupted work while increasing the flow's elapsed time."
        : "One uninterrupted task may finish sooner, but it gives the browser fewer chances to paint or respond."
    } This local result is evidence about this run environment, not every user's device.`;
  }
}

function setMetric(root: HTMLElement, key: string, value: string) {
  const metric = root.querySelector<HTMLElement>(
    `[data-browser-performance-metric="${key}"]`,
  );
  if (metric) metric.textContent = value;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function formatDuration(value: number) {
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ms`;
}

function formatStrategy(strategy: WorkbenchStrategy) {
  return strategy === "chunked" ? "yield between batches" : "one task";
}

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

async function nextPaint() {
  await nextFrame();
  await nextFrame();
}
