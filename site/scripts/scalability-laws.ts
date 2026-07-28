type UslPoint = {
  concurrency: number;
  capacity: number;
};

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-little-law-demo]",
)) {
  initializeLittleLaw(root);
}

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-amdahl-law-demo]",
)) {
  initializeAmdahlLaw(root);
}

for (const root of document.querySelectorAll<HTMLElement>("[data-usl-demo]")) {
  initializeUsl(root);
}

function initializeLittleLaw(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>("[data-little-law-form]");
  if (!form) return;

  const update = () => {
    const arrival = lawReadNumber(root, "[data-little-law-input='arrival']", 20);
    const time = lawReadNumber(root, "[data-little-law-input='time']", 0.5);
    const observed = lawReadNumber(
      root,
      "[data-little-law-input='observed']",
      10,
    );
    const expected = arrival * time;
    const gap = observed - expected;
    const tolerance = Math.max(1, expected * 0.1);
    const verdict = root.querySelector<HTMLElement>(
      "[data-little-law-verdict]",
    );
    const reading = root.querySelector<HTMLElement>(
      "[data-little-law-reading]",
    );

    lawSetText(root, "[data-little-law-output='arrival']", `${arrival} events/s`);
    lawSetText(root, "[data-little-law-output='time']", `${time.toFixed(1)} s`);
    lawSetText(root, "[data-little-law-output='observed']", `${observed} events`);
    lawSetText(
      root,
      "[data-little-law-equation]",
      `${formatNumber(expected)} = ${arrival} × ${time.toFixed(1)}`,
    );
    lawSetText(
      root,
      "[data-little-law-metric='expected']",
      formatNumber(expected),
    );
    lawSetText(root, "[data-little-law-metric='observed']", String(observed));
    lawSetText(
      root,
      "[data-little-law-metric='gap']",
      `${gap > 0 ? "+" : ""}${formatNumber(gap)}`,
    );
    renderQueue(root, observed, gap, tolerance);

    root.classList.toggle("is-law-warning", Math.abs(gap) > tolerance);
    if (Math.abs(gap) <= tolerance) {
      if (verdict) verdict.textContent = "Measurements agree";
      if (reading) {
        reading.textContent =
          "The three averages are mutually consistent for a stable observation window. The equation still does not identify why work takes this long.";
      }
    } else if (gap > 0) {
      if (verdict) verdict.textContent = "More work observed than predicted";
      if (reading) {
        reading.textContent =
          "The observed queue is larger than λW predicts. The system may be unstable, the measurement boundaries may differ, or some work may be missing from arrival or duration measurements.";
      }
    } else {
      if (verdict) verdict.textContent = "Less work observed than predicted";
      if (reading) {
        reading.textContent =
          "The observed queue is smaller than λW predicts. Check whether arrivals, completions, duration, and work in progress came from the same stable time window.";
      }
    }
  };

  form.addEventListener("input", update);
  update();
}

function renderQueue(
  root: HTMLElement,
  observed: number,
  gap: number,
  tolerance: number,
) {
  const queue = root.querySelector<HTMLElement>("[data-little-law-queue]");
  if (!queue) return;

  queue.innerHTML = Array.from({ length: observed }, (_, index) => {
    const warning = Math.abs(gap) > tolerance && index >= observed - Math.abs(gap);
    return `<i${warning ? ' class="is-gap"' : ""}></i>`;
  }).join("");
}

function initializeAmdahlLaw(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>("[data-amdahl-law-form]");
  if (!form) return;

  const update = () => {
    const parallelPercent = lawReadNumber(
      root,
      "[data-amdahl-law-input='parallel']",
      80,
    );
    const agents = lawReadNumber(root, "[data-amdahl-law-input='agents']", 4);
    const parallel = parallelPercent / 100;
    const sequential = 1 - parallel;
    const relativeDuration = sequential + parallel / agents;
    const speedup = 1 / relativeDuration;
    const efficiency = speedup / agents;
    const ceiling = 1 / sequential;
    const sequentialBar = root.querySelector<HTMLElement>(
      "[data-amdahl-sequential]",
    );
    const parallelBar = root.querySelector<HTMLElement>(
      "[data-amdahl-parallel]",
    );
    const verdict = root.querySelector<HTMLElement>(
      "[data-amdahl-law-verdict]",
    );
    const reading = root.querySelector<HTMLElement>(
      "[data-amdahl-law-reading]",
    );

    lawSetText(root, "[data-amdahl-law-output='parallel']", `${parallelPercent}%`);
    lawSetText(
      root,
      "[data-amdahl-law-output='agents']",
      `${agents} agent${agents === 1 ? "" : "s"}`,
    );
    lawSetText(
      root,
      "[data-amdahl-agents-label]",
      `${agents} agent${agents === 1 ? "" : "s"}`,
    );
    lawSetText(
      root,
      "[data-amdahl-duration]",
      `${(relativeDuration * 100).toFixed(1)}%`,
    );
    lawSetText(
      root,
      "[data-amdahl-law-metric='speedup']",
      `${speedup.toFixed(2)}×`,
    );
    lawSetText(
      root,
      "[data-amdahl-law-metric='duration']",
      `${(relativeDuration * 100).toFixed(1)}%`,
    );
    lawSetText(
      root,
      "[data-amdahl-law-metric='efficiency']",
      `${(efficiency * 100).toFixed(1)}%`,
    );
    lawSetText(
      root,
      "[data-amdahl-law-metric='ceiling']",
      `${ceiling.toFixed(2)}×`,
    );

    if (sequentialBar) sequentialBar.style.inlineSize = `${sequential * 100}%`;
    if (parallelBar) parallelBar.style.inlineSize = `${(parallel / agents) * 100}%`;
    if (verdict) verdict.textContent = `${speedup.toFixed(2)}× ideal speedup`;
    if (reading) {
      reading.textContent = `${agents} agent${agents === 1 ? "" : "s"} divide the parallel work, but the sequential ${Math.round(sequential * 100)}% remains. Even unlimited agents cannot exceed ${ceiling.toFixed(2)}× before coordination costs are considered.`;
    }
  };

  form.addEventListener("input", update);
  update();
}

function initializeUsl(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>("[data-usl-form]");
  if (!form) return;

  const update = () => {
    const alpha = lawReadNumber(root, "[data-usl-input='alpha']", 0.03);
    const beta = lawReadNumber(root, "[data-usl-input='beta']", 0.002);
    const selectedN = lawReadNumber(root, "[data-usl-input='concurrency']", 8);
    const points = Array.from({ length: 32 }, (_, index) => ({
      concurrency: index + 1,
      capacity: uslCapacity(index + 1, alpha, beta),
    }));
    const fallbackPoint = { concurrency: 1, capacity: 1 };
    const selected = points[selectedN - 1] ?? points[0] ?? fallbackPoint;
    const peak = points.reduce(
      (best, point) => (point.capacity > best.capacity ? point : best),
      fallbackPoint,
    );
    const next = points[selectedN] ?? selected;
    const nextHelps = next.capacity > selected.capacity + 0.001;
    const atPeak = selected.concurrency === peak.concurrency;
    const verdict = root.querySelector<HTMLElement>("[data-usl-verdict]");
    const reading = root.querySelector<HTMLElement>("[data-usl-reading]");

    lawSetText(root, "[data-usl-output='alpha']", alpha.toFixed(3));
    lawSetText(root, "[data-usl-output='beta']", beta.toFixed(4));
    lawSetText(
      root,
      "[data-usl-output='concurrency']",
      `${selectedN} worker${selectedN === 1 ? "" : "s"}`,
    );
    lawSetText(
      root,
      "[data-usl-metric='selected']",
      `${selected.capacity.toFixed(2)}×`,
    );
    lawSetText(root, "[data-usl-metric='peak-n']", String(peak.concurrency));
    lawSetText(
      root,
      "[data-usl-metric='peak-capacity']",
      `${peak.capacity.toFixed(2)}×`,
    );
    lawSetText(
      root,
      "[data-usl-metric='next']",
      selectedN === 32 ? "not shown" : nextHelps ? "helps" : "hurts",
    );
    renderUslChart(root, points, selected, peak);

    root.classList.toggle("is-law-warning", !nextHelps && !atPeak);
    if (selectedN === 32) {
      if (verdict) verdict.textContent = "Inspect the curve, not one endpoint";
    } else if (atPeak) {
      if (verdict) verdict.textContent = "Modeled capacity peaks here";
    } else if (nextHelps) {
      if (verdict) verdict.textContent = "Capacity is still rising";
    } else {
      if (verdict) verdict.textContent = "More concurrency now reduces capacity";
    }

    if (reading) {
      reading.textContent = `At ${selectedN} worker${selectedN === 1 ? "" : "s"}, modeled relative capacity is ${selected.capacity.toFixed(2)}×. The curve peaks at ${peak.concurrency}; ${
        selectedN < peak.concurrency
          ? "additional concurrency still helps, but with diminishing return."
          : selectedN === peak.concurrency
            ? "this is the modeled balance point for the chosen costs."
            : "contention and coherency costs now outweigh the added worker."
      } Fit α and β from measurements before treating this as a prediction.`;
    }
  };

  form.addEventListener("input", update);
  update();
}

function uslCapacity(concurrency: number, alpha: number, beta: number) {
  return (
    concurrency /
    (1 + alpha * (concurrency - 1) + beta * concurrency * (concurrency - 1))
  );
}

function renderUslChart(
  root: HTMLElement,
  points: UslPoint[],
  selected: UslPoint,
  peak: UslPoint,
) {
  const chart = root.querySelector<SVGElement>("[data-usl-chart]");
  if (!chart) return;

  const width = 600;
  const height = 200;
  const left = 20;
  const top = 20;
  const maximum = Math.max(...points.map(({ capacity }) => capacity), 1);
  const x = (point: UslPoint) =>
    left + ((point.concurrency - 1) / (points.length - 1)) * width;
  const y = (point: UslPoint) => top + height - (point.capacity / maximum) * height;
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(point).toFixed(1)},${y(point).toFixed(1)}`)
    .join(" ");
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const lineY = top + height - ratio * height;
      return `<line x1="${left}" y1="${lineY}" x2="${left + width}" y2="${lineY}" />`;
    })
    .join("");

  chart.innerHTML = `<g class="usl-grid">${grid}</g>
<path class="usl-capacity-path" d="${path}" />
<line class="usl-selected-guide" x1="${x(selected)}" y1="${top}" x2="${x(selected)}" y2="${top + height}" />
<circle class="usl-peak-point" cx="${x(peak)}" cy="${y(peak)}" r="6" />
<circle class="usl-selected-point" cx="${x(selected)}" cy="${y(selected)}" r="7" />
<text class="usl-peak-label" x="${Math.min(x(peak) + 10, 560)}" y="${Math.max(y(peak) - 10, 15)}">peak N=${peak.concurrency}</text>`;
  chart.setAttribute(
    "aria-label",
    `Relative capacity curve. Selected concurrency ${selected.concurrency} has ${selected.capacity.toFixed(2)} times capacity. Peak is ${peak.capacity.toFixed(2)} times at ${peak.concurrency} workers.`,
  );
}

function lawReadNumber(root: HTMLElement, selector: string, fallback: number) {
  const value = Number(root.querySelector<HTMLInputElement>(selector)?.value);
  return Number.isFinite(value) ? value : fallback;
}

function lawSetText(root: HTMLElement, selector: string, value: string) {
  const element = root.querySelector<HTMLElement>(selector);
  if (element) element.textContent = value;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? value.toFixed(1) : value.toFixed(1);
}
