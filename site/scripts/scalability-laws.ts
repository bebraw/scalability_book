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

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-lusser-law-demo]",
)) {
  initializeLusserLaw(root);
}

for (const root of document.querySelectorAll<HTMLElement>("[data-usl-demo]")) {
  initializeUsl(root);
}

function initializeLittleLaw(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>("[data-little-law-form]");
  if (!form) return;

  const update = () => {
    const arrival = lawReadNumber(
      root,
      "[data-little-law-input='arrival']",
      20,
    );
    const time = lawReadNumber(root, "[data-little-law-input='time']", 0.5);
    const observed = lawReadNumber(
      root,
      "[data-little-law-input='observed']",
      10,
    );
    const expected = arrival * time;
    const gap = observed - expected;
    // Ignore floating-point rounding only, not a statistical measurement error.
    const tolerance = Number.EPSILON * Math.max(1, expected, observed) * 8;
    const verdict = root.querySelector<HTMLElement>(
      "[data-little-law-verdict]",
    );
    const reading = root.querySelector<HTMLElement>(
      "[data-little-law-reading]",
    );

    lawSetText(
      root,
      "[data-little-law-output='arrival']",
      `${arrival} events/s`,
    );
    lawSetText(root, "[data-little-law-output='time']", `${time.toFixed(1)} s`);
    lawSetText(
      root,
      "[data-little-law-output='observed']",
      `${observed} events`,
    );
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
          "The entered averages agree numerically, allowing only floating-point rounding. This does not establish that their observation window was stable or identify why work takes this long.";
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

  queue.innerHTML = Array.from({ length: Math.ceil(observed) }, (_, index) => {
    const warning =
      Math.abs(gap) > tolerance && index >= observed - Math.abs(gap);
    const fraction = Math.min(1, observed - index);
    return `<i${warning ? ' class="is-gap"' : ""} style="opacity:${fraction}"></i>`;
  }).join("");
}

function initializeLusserLaw(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>("[data-lusser-law-form]");
  if (!form) return;

  const update = () => {
    const correctnessPercent = lawReadNumber(
      root,
      "[data-lusser-law-input='correctness']",
      95,
    );
    const detectionPercent = lawReadNumber(
      root,
      "[data-lusser-law-input='detection']",
      90,
    );
    const recoveryPercent = lawReadNumber(
      root,
      "[data-lusser-law-input='recovery']",
      100,
    );
    const steps = lawReadNumber(root, "[data-lusser-law-input='steps']", 100);
    const correctness = correctnessPercent / 100;
    const detection = detectionPercent / 100;
    const recovery = recoveryPercent / 100;
    const recoveredStep = (1 - correctness) * detection * recovery;
    const stoppedStep = (1 - correctness) * detection * (1 - recovery);
    const wrongStep = (1 - correctness) * (1 - detection);
    const stepReliability = correctness + recoveredStep;
    const correctWorkflow = Math.pow(stepReliability, steps);
    const terminalStep = stoppedStep + wrongStep;
    const failedWorkflow = 1 - correctWorkflow;
    const stoppedWorkflow =
      terminalStep > Number.EPSILON
        ? failedWorkflow * (stoppedStep / terminalStep)
        : 0;
    const wrongWorkflow = Math.max(0, 1 - correctWorkflow - stoppedWorkflow);
    const target = 0.95;
    const requiredStep = Math.pow(target, 1 / steps);
    const requiredCoverage =
      correctness < 1
        ? Math.max(0, (requiredStep - correctness) / (1 - correctness))
        : 0;
    const verdict = root.querySelector<HTMLElement>(
      "[data-lusser-law-verdict]",
    );
    const reading = root.querySelector<HTMLElement>(
      "[data-lusser-law-reading]",
    );

    lawSetText(
      root,
      "[data-lusser-law-output='correctness']",
      `${correctnessPercent.toFixed(1)}%`,
    );
    lawSetText(
      root,
      "[data-lusser-law-output='detection']",
      `${detectionPercent.toFixed(0)}%`,
    );
    lawSetText(
      root,
      "[data-lusser-law-output='recovery']",
      `${recoveryPercent.toFixed(0)}%`,
    );
    lawSetText(
      root,
      "[data-lusser-law-output='steps']",
      `${steps} step${steps === 1 ? "" : "s"}`,
    );
    lawSetText(
      root,
      "[data-lusser-step-equation]",
      `r = ${formatDecimal(correctness, 3)} + (${formatDecimal(1 - correctness, 3)} × ${formatDecimal(detection, 3)} × ${formatDecimal(recovery, 3)})`,
    );
    lawSetText(
      root,
      "[data-lusser-step-result]",
      `= ${formatLawPercent(stepReliability, 3)}`,
    );
    lawSetText(
      root,
      "[data-lusser-workflow-equation]",
      `R(${steps}) = ${formatDecimal(stepReliability, 5)}^${steps}`,
    );
    lawSetText(
      root,
      "[data-lusser-workflow-result]",
      `= ${formatLawPercent(correctWorkflow)}`,
    );
    lawSetText(
      root,
      "[data-lusser-chart-value]",
      formatLawPercent(correctWorkflow),
    );
    lawSetText(
      root,
      "[data-lusser-law-metric='step']",
      formatLawPercent(stepReliability, 3),
    );
    lawSetText(
      root,
      "[data-lusser-law-metric='correct']",
      formatLawPercent(correctWorkflow),
    );
    lawSetText(
      root,
      "[data-lusser-law-metric='stopped']",
      formatLawPercent(stoppedWorkflow),
    );
    lawSetText(
      root,
      "[data-lusser-law-metric='wrong']",
      formatLawPercent(wrongWorkflow),
    );
    renderLusserChart(root, stepReliability, steps, target);
    renderLusserOutcomes(root, correctWorkflow, stoppedWorkflow, wrongWorkflow);

    const meetsTarget = correctWorkflow >= target;
    root.classList.toggle("is-law-warning", !meetsTarget);
    if (verdict) {
      verdict.textContent = meetsTarget
        ? "Meets the 95% completion target"
        : `${formatLawPercent(correctWorkflow)} completes correctly`;
    }

    if (reading) {
      const targetGuidance =
        requiredCoverage === 0
          ? "Initial correctness already meets the 95% workflow completion target without repair. Wrong results remain a separate outcome to inspect."
          : requiredCoverage > detection
            ? `A 95% workflow target needs ${formatLawPercent(requiredStep, 3)} per step and ${formatLawPercent(requiredCoverage, 2)} combined detection and repair. Detection at ${detectionPercent.toFixed(0)}% cannot reach that target even with perfect repair.`
            : `A 95% workflow target needs ${formatLawPercent(requiredStep, 3)} per step; the current detection path can reach it if repair after detection is at least ${formatLawPercent(requiredCoverage / detection, 1)}.`;
      reading.textContent = `At ${formatLawPercent(stepReliability, 3)} per step, ${steps} independent critical step${steps === 1 ? "" : "s"} complete${steps === 1 ? "s" : ""} correctly ${formatLawPercent(correctWorkflow)} of the time. ${formatLawPercent(stoppedWorkflow)} stop safely and ${formatLawPercent(wrongWorkflow)} return a wrong result. ${targetGuidance}`;
    }
  };

  form.addEventListener("input", () => {
    setLusserPresetState(root);
    update();
  });
  for (const button of root.querySelectorAll<HTMLButtonElement>(
    "[data-lusser-preset]",
  )) {
    button.addEventListener("click", () => {
      const preset = button.dataset.lusserPreset;
      if (preset === "detected") {
        setLusserValues(root, {
          correctness: 95,
          detection: 90,
          recovery: 0,
          steps: 20,
        });
      } else {
        setLusserValues(root, {
          correctness: 95,
          detection: 90,
          recovery: 100,
          steps: 100,
        });
      }
      setLusserPresetState(root, preset);
      update();
    });
  }
  update();
}

function setLusserValues(
  root: HTMLElement,
  values: Record<"correctness" | "detection" | "recovery" | "steps", number>,
) {
  for (const [name, value] of Object.entries(values)) {
    const input = root.querySelector<HTMLInputElement>(
      `[data-lusser-law-input='${name}']`,
    );
    if (input) input.value = String(value);
  }
}

function setLusserPresetState(root: HTMLElement, activePreset?: string) {
  for (const button of root.querySelectorAll<HTMLButtonElement>(
    "[data-lusser-preset]",
  )) {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.lusserPreset === activePreset),
    );
  }
}

function renderLusserChart(
  root: HTMLElement,
  stepReliability: number,
  selectedSteps: number,
  target: number,
) {
  const chart = root.querySelector<SVGElement>("[data-lusser-chart]");
  if (!chart) return;

  const maximumSteps = 200;
  const width = 600;
  const height = 180;
  const left = 38;
  const top = 18;
  const x = (step: number) => left + (step / maximumSteps) * width;
  const y = (reliability: number) => top + height - reliability * height;
  const points = Array.from({ length: maximumSteps + 1 }, (_, step) => ({
    step,
    reliability: Math.pow(stepReliability, step),
  }));
  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${x(point.step).toFixed(1)},${y(point.reliability).toFixed(1)}`,
    )
    .join(" ");
  const selectedReliability = Math.pow(stepReliability, selectedSteps);
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map(
      (ratio) =>
        `<line x1="${left}" y1="${y(ratio)}" x2="${left + width}" y2="${y(ratio)}" />`,
    )
    .join("");

  chart.innerHTML = `<g class="lusser-grid">${grid}</g>
<line class="lusser-target-line" x1="${left}" y1="${y(target)}" x2="${left + width}" y2="${y(target)}" />
<text class="lusser-target-label" x="${left + 7}" y="${y(target) - 6}">95% target</text>
<path class="lusser-reliability-path" d="${path}" />
<line class="lusser-selected-guide" x1="${x(selectedSteps)}" y1="${top}" x2="${x(selectedSteps)}" y2="${top + height}" />
<circle class="lusser-selected-point" cx="${x(selectedSteps)}" cy="${y(selectedReliability)}" r="7" />`;
  chart.setAttribute(
    "aria-label",
    `Reliability curve over 200 independent critical steps. At ${selectedSteps} steps, correct completion is ${formatLawPercent(selectedReliability)}. The target is 95%.`,
  );
}

function renderLusserOutcomes(
  root: HTMLElement,
  correct: number,
  stopped: number,
  wrong: number,
) {
  const outcomes = { correct, stopped, wrong };
  for (const [name, probability] of Object.entries(outcomes)) {
    const segment = root.querySelector<HTMLElement>(
      `[data-lusser-outcome-segment='${name}']`,
    );
    if (segment) segment.style.inlineSize = `${probability * 100}%`;
  }
  const bar = root.querySelector<HTMLElement>("[data-lusser-outcome-bar]");
  bar?.setAttribute(
    "aria-label",
    `${formatLawPercent(correct)} correct completion, ${formatLawPercent(stopped)} safe stop, and ${formatLawPercent(wrong)} wrong result.`,
  );
}

function formatDecimal(value: number, digits: number) {
  return value.toFixed(digits).replace(/^0/, "");
}

function formatLawPercent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
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

    lawSetText(
      root,
      "[data-amdahl-law-output='parallel']",
      `${parallelPercent}%`,
    );
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
    if (parallelBar)
      parallelBar.style.inlineSize = `${(parallel / agents) * 100}%`;
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
    const hasInteriorPeak = peak.concurrency < points.length;
    const atPeak = hasInteriorPeak && selected.concurrency === peak.concurrency;
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
    renderUslChart(root, points, selected, peak, hasInteriorPeak);

    root.classList.toggle("is-law-warning", !nextHelps && !atPeak);
    if (selectedN === 32) {
      if (verdict) verdict.textContent = "Inspect the curve, not one endpoint";
    } else if (atPeak) {
      if (verdict) verdict.textContent = "Modeled capacity peaks here";
    } else if (nextHelps) {
      if (verdict) verdict.textContent = "Capacity is still rising";
    } else {
      if (verdict)
        verdict.textContent = "More concurrency now reduces capacity";
    }

    if (reading) {
      const rangeReading =
        alpha === 0 && beta === 0
          ? "Zero scaling costs give linear capacity C(N) = N with no finite optimum in this ideal model."
          : !hasInteriorPeak
            ? beta === 0
              ? "This curve keeps rising beyond the displayed range; no finite peak exists with these costs."
              : "No interior peak is shown. The largest displayed value is at 32; inspect a wider range before locating the optimum."
            : `The curve peaks at ${peak.concurrency}; ${
                selectedN < peak.concurrency
                  ? "additional concurrency still helps, but with diminishing return."
                  : selectedN === peak.concurrency
                    ? "this is the modeled balance point for the chosen costs."
                    : "contention and coherency costs now outweigh the added worker."
              }`;
      reading.textContent = `At ${selectedN} worker${selectedN === 1 ? "" : "s"}, modeled relative capacity is ${selected.capacity.toFixed(2)}×. ${rangeReading} Fit α and β from measurements before treating this as a prediction.`;
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
  hasInteriorPeak: boolean,
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
  const y = (point: UslPoint) =>
    top + height - (point.capacity / maximum) * height;
  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${x(point).toFixed(1)},${y(point).toFixed(1)}`,
    )
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
<text class="usl-peak-label" x="${Math.min(x(peak) + 10, 560)}" y="${Math.max(y(peak) - 10, 15)}">${hasInteriorPeak ? "peak" : "best shown"} N=${peak.concurrency}</text>`;
  chart.setAttribute(
    "aria-label",
    `Relative capacity curve from 1 to ${points.length} workers. Selected concurrency ${selected.concurrency} has ${selected.capacity.toFixed(2)} times capacity. ${hasInteriorPeak ? "Peak is" : "Largest displayed value is"} ${peak.capacity.toFixed(2)} times at ${peak.concurrency} workers.`,
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
