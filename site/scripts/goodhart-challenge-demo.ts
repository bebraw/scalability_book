type GoodhartTarget = "coverage" | "latency" | "agent-pass";
type GoodhartPrediction = "aligned" | "diverges" | "unchanged";
type Safeguard = "paired" | "selective" | "more-pressure";

type Measure = {
  label: string;
  before: string;
  after: string;
};

type SafeguardOption = {
  title: string;
  detail: string;
  assessment: string;
};

type GoodhartScenario = {
  title: string;
  target: string;
  outcome: string;
  gamingPath: string;
  measures: [Measure, Measure, Measure, Measure];
  safeguards: Record<Safeguard, SafeguardOption>;
  revisedGate: string;
  counterevidence: string;
};

const goodhartScenarios: Record<GoodhartTarget, GoodhartScenario> = {
  coverage: {
    title: "Coverage gate ≥ 95%",
    target: "Line coverage ≥ 95%",
    outcome:
      "Changes resist regressions because important behavior is checked, not merely executed.",
    gamingPath:
      "The optimizer adds shallow tests that execute lines, snapshots broad output, and mocks difficult branches. Coverage rises while fewer meaningful faults are caught.",
    measures: [
      { label: "Line coverage", before: "72%", after: "96%" },
      { label: "Held-out behavior checks", before: "94%", after: "87%" },
      { label: "Mutation survivors", before: "18", after: "46" },
      { label: "Review per change", before: "22 min", after: "33 min" },
    ],
    safeguards: {
      paired: {
        title: "Independent behavior gate",
        detail:
          "Require named behavior checks and a mutation sample; coverage cannot compensate for either failing.",
        assessment:
          "The gate now asks for evidence that assertions detect changed behavior.",
      },
      selective: {
        title: "Author-selected green audit",
        detail:
          "Inspect five passing coverage reports selected by the test author.",
        assessment:
          "Selection can hide the same shallow-test pattern, so the gaming path remains open.",
      },
      "more-pressure": {
        title: "Raise the target to 99%",
        detail: "Demand even more line coverage before a change can merge.",
        assessment:
          "More pressure rewards more line execution; it does not require meaningful assertions.",
      },
    },
    revisedGate:
      "Coverage ≥ 95% AND named behavior checks pass AND the mutation sample stays below its survivor limit.",
    counterevidence:
      "Held-out behavior failures and mutation survivors, reviewed independently of the coverage report.",
  },
  latency: {
    title: "Successful-request p95 ≤ 140 ms",
    target: "Successful-request p95 ≤ 140 ms",
    outcome:
      "The endpoint responds quickly while continuing to accept valid requests and useful work.",
    gamingPath:
      "The optimizer rejects or aborts slow work before it enters the successful-request histogram. The reported tail shrinks by discarding the requests users needed processed.",
    measures: [
      { label: "Successful-request p95", before: "218 ms", after: "118 ms" },
      { label: "Valid requests accepted", before: "99%", after: "78%" },
      { label: "Rejected or timed out", before: "1%", after: "22%" },
      { label: "Useful throughput", before: "82/s", after: "63/s" },
    ],
    safeguards: {
      paired: {
        title: "Fixed-denominator outcome gate",
        detail:
          "Count every attempt, including rejection and timeout; require both p95 and valid-request acceptance.",
        assessment:
          "The optimizer can no longer improve the latency sample by silently dropping slow work.",
      },
      selective: {
        title: "Fast-trace spot check",
        detail:
          "Inspect five successful traces chosen from requests already inside the latency histogram.",
        assessment:
          "The audit never sees excluded attempts, so it cannot expose denominator manipulation.",
      },
      "more-pressure": {
        title: "Lower the target to 100 ms",
        detail: "Make the successful-request p95 objective more demanding.",
        assessment:
          "Tighter pressure makes rejecting slow work even more valuable to the optimizer.",
      },
    },
    revisedGate:
      "Successful-request p95 ≤ 140 ms AND valid-request acceptance ≥ 98%, measured over every attempt.",
    counterevidence:
      "Acceptance, rejection, and timeout rates over a frozen request cohort, alongside the full latency distribution.",
  },
  "agent-pass": {
    title: "Agent task pass rate ≥ 90%",
    target: "Agent task pass rate ≥ 90%",
    outcome:
      "Representative changes are correct and maintainable without shifting excessive work into retries or human review.",
    gamingPath:
      "The optimizer retries failures, narrows tasks, and tailors outputs to the visible judge. Failed attempts disappear from the headline rate while held-out acceptance falls.",
    measures: [
      { label: "Visible task pass rate", before: "68%", after: "94%" },
      { label: "Held-out acceptance", before: "64%", after: "56%" },
      { label: "Attempts per 100 tasks", before: "100", after: "147" },
      { label: "Human review per task", before: "18 min", after: "31 min" },
    ],
    safeguards: {
      paired: {
        title: "Frozen-cohort outcome gate",
        detail:
          "Count all attempts on held-out tasks, plus final human acceptance, retries, and review effort.",
        assessment:
          "The gate makes hidden retries and judge-specific tailoring visible beside final acceptance.",
      },
      selective: {
        title: "Best-output review",
        detail:
          "Let the agent submit its five highest-confidence accepted tasks for human review.",
        assessment:
          "Cherry-picked successes say little about failed attempts or unfamiliar held-out work.",
      },
      "more-pressure": {
        title: "Raise the target to 98%",
        detail:
          "Reward an even higher pass rate on the same visible evaluation set.",
        assessment:
          "The visible judge becomes still more valuable to overfit; the outcome remains unprotected.",
      },
    },
    revisedGate:
      "Held-out final acceptance ≥ 70% across all attempted tasks, with retry and review budgets; visible pass rate is diagnostic only.",
    counterevidence:
      "Final human acceptance on a frozen held-out cohort, all attempted failures, retry count, and human review minutes.",
  },
};

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-goodhart-demo]",
)) {
  initializeGoodhartChallenge(root);
}

function initializeGoodhartChallenge(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>("[data-goodhart-form]");
  const status = root.querySelector<HTMLElement>("[data-goodhart-status]");
  const contractNote = root.querySelector<HTMLElement>(
    "[data-goodhart-contract-note] p",
  );
  const boardTitle = root.querySelector<HTMLElement>(
    "[data-goodhart-board-title]",
  );
  const boardStamp = root.querySelector<HTMLElement>(
    "[data-goodhart-board-stamp]",
  );
  const scorecard = root.querySelector<HTMLElement>(
    "[data-goodhart-scorecard]",
  );
  const trace = root.querySelector<HTMLElement>("[data-goodhart-trace] p");
  const applyButton = root.querySelector<HTMLButtonElement>(
    "[data-goodhart-apply]",
  );
  const repair = root.querySelector<HTMLElement>("[data-goodhart-repair]");
  const repairTitle = root.querySelector<HTMLElement>("#goodhart-repair-title");
  const gamingPath = root.querySelector<HTMLElement>(
    "[data-goodhart-gaming-path]",
  );
  const testButton = root.querySelector<HTMLButtonElement>(
    "[data-goodhart-test]",
  );
  const debrief = root.querySelector<HTMLElement>("[data-goodhart-debrief]");
  const artifact = root.querySelector<HTMLTextAreaElement>(
    "[data-goodhart-artifact]",
  );
  const copyButton = root.querySelector<HTMLButtonElement>(
    "[data-goodhart-copy]",
  );
  const resetButton = root.querySelector<HTMLButtonElement>(
    "[data-goodhart-reset]",
  );

  if (
    !form ||
    !status ||
    !contractNote ||
    !boardTitle ||
    !boardStamp ||
    !scorecard ||
    !trace ||
    !applyButton ||
    !repair ||
    !repairTitle ||
    !gamingPath ||
    !testButton ||
    !debrief ||
    !artifact ||
    !copyButton ||
    !resetButton
  ) {
    return;
  }

  form.addEventListener("change", (event) => {
    const input = event.target as HTMLInputElement;

    if (input.name === "goodhart-target" && isGoodhartTarget(input.value)) {
      loadScenario(root, input.value, {
        status,
        contractNote,
        boardTitle,
        boardStamp,
        scorecard,
        trace,
        repair,
        debrief,
        artifact,
      });
    }

    applyButton.disabled = !readTarget(root) || !readGoodhartPrediction(root);
    testButton.disabled = !readSafeguard(root);
  });

  applyButton.addEventListener("click", () => {
    const target = readTarget(root);
    const prediction = readGoodhartPrediction(root);

    if (!target || !prediction) {
      return;
    }

    const scenario = goodhartScenarios[target];
    root.classList.add("is-pressured");
    root.dataset.goodhartPhase = "pressure";
    boardStamp.textContent = "TARGET MET";
    boardTitle.textContent = scenario.title;
    trace.textContent = scenario.gamingPath;
    revealMeasures(root, scenario);
    scorecard.setAttribute("aria-label", getScorecardLabel(scenario, true));
    status.textContent = `${
      prediction === "diverges"
        ? "Prediction confirmed"
        : "Prediction challenged"
    } — proxy improved, outcome degraded`;
    gamingPath.textContent = scenario.gamingPath;
    populateSafeguards(root, scenario);
    repair.hidden = false;
    debrief.hidden = true;
    artifact.value = "";
    clearSafeguards(root);
    testButton.disabled = true;
    updateProgress(root, "pressure");
    repairTitle.focus({ preventScroll: true });
  });

  testButton.addEventListener("click", () => {
    const target = readTarget(root);
    const safeguard = readSafeguard(root);

    if (!target || !safeguard) {
      return;
    }

    const scenario = goodhartScenarios[target];
    const isRepaired = safeguard === "paired";
    root.dataset.goodhartGate = isRepaired ? "repaired" : "leaking";
    status.textContent = isRepaired
      ? "Gate repaired — the proxy no longer decides alone"
      : "Gate still leaks — the optimizer can keep winning";
    populateDebrief(root, scenario, safeguard, artifact);
    debrief.hidden = false;
    updateProgress(root, "repair");
    debrief.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  copyButton.addEventListener("click", async () => {
    const copied = await copyGoodhartArtifact(artifact);
    copyButton.textContent = copied ? "Contract copied" : "Select and copy";
    status.textContent = copied
      ? "Measurement contract copied"
      : "Clipboard unavailable — contract text selected";
  });

  resetButton.addEventListener("click", () => {
    form.reset();
    root.classList.remove("is-pressured");
    delete root.dataset.goodhartPhase;
    delete root.dataset.goodhartGate;
    status.textContent = "Choose a proxy to put under pressure";
    contractNote.textContent =
      "Choose a proxy to reveal the result it is supposed to represent.";
    boardTitle.textContent = "Waiting for a target";
    boardStamp.textContent = "UNPRESSURED";
    trace.textContent =
      "No behavior to inspect yet. Select a proxy, predict the result, and apply pressure.";
    resetMeasures(root);
    scorecard.setAttribute(
      "aria-label",
      "Choose a proxy to load its baseline measures",
    );
    repair.hidden = true;
    debrief.hidden = true;
    artifact.value = "";
    applyButton.disabled = true;
    testButton.disabled = true;
    copyButton.textContent = "Copy contract";
    updateProgress(root, "target");
    root
      .querySelector<HTMLInputElement>('input[name="goodhart-target"]')
      ?.focus();
  });
}

function loadScenario(
  root: HTMLElement,
  target: GoodhartTarget,
  elements: {
    status: HTMLElement;
    contractNote: HTMLElement;
    boardTitle: HTMLElement;
    boardStamp: HTMLElement;
    scorecard: HTMLElement;
    trace: HTMLElement;
    repair: HTMLElement;
    debrief: HTMLElement;
    artifact: HTMLTextAreaElement;
  },
) {
  const scenario = goodhartScenarios[target];
  root.classList.remove("is-pressured");
  delete root.dataset.goodhartPhase;
  delete root.dataset.goodhartGate;
  elements.status.textContent =
    "Target loaded — predict the optimizer response";
  elements.contractNote.textContent = scenario.outcome;
  elements.boardTitle.textContent = scenario.title;
  elements.boardStamp.textContent = "BASELINE";
  elements.trace.textContent =
    "The baseline is visible. The post-target values stay sealed until you commit to a prediction.";
  elements.repair.hidden = true;
  elements.debrief.hidden = true;
  elements.artifact.value = "";
  clearPredictions(root);
  clearSafeguards(root);
  populateMeasures(root, scenario);
  elements.scorecard.setAttribute(
    "aria-label",
    getScorecardLabel(scenario, false),
  );
  updateProgress(root, "target");
}

function populateMeasures(root: HTMLElement, scenario: GoodhartScenario) {
  scenario.measures.forEach((measure, index) => {
    setGoodhartText(
      root,
      `[data-goodhart-measure-label="${index}"]`,
      measure.label,
    );
    setGoodhartText(
      root,
      `[data-goodhart-measure-before="${index}"]`,
      measure.before,
    );
    setGoodhartText(root, `[data-goodhart-measure-after="${index}"]`, "?");
  });
}

function revealMeasures(root: HTMLElement, scenario: GoodhartScenario) {
  scenario.measures.forEach((measure, index) => {
    setGoodhartText(
      root,
      `[data-goodhart-measure-after="${index}"]`,
      measure.after,
    );
  });
}

function resetMeasures(root: HTMLElement) {
  for (let index = 0; index < 4; index += 1) {
    setGoodhartText(root, `[data-goodhart-measure-label="${index}"]`, "—");
    setGoodhartText(root, `[data-goodhart-measure-before="${index}"]`, "—");
    setGoodhartText(root, `[data-goodhart-measure-after="${index}"]`, "?");
  }
}

function populateSafeguards(root: HTMLElement, scenario: GoodhartScenario) {
  for (const safeguard of ["paired", "selective", "more-pressure"] as const) {
    const option = scenario.safeguards[safeguard];
    setGoodhartText(
      root,
      `[data-goodhart-safeguard-title="${safeguard}"]`,
      option.title,
    );
    setGoodhartText(
      root,
      `[data-goodhart-safeguard-detail="${safeguard}"]`,
      option.detail,
    );
  }
}

function populateDebrief(
  root: HTMLElement,
  scenario: GoodhartScenario,
  safeguard: Safeguard,
  artifact: HTMLTextAreaElement,
) {
  const option = scenario.safeguards[safeguard];
  const isRepaired = safeguard === "paired";
  setGoodhartText(
    root,
    "[data-goodhart-debrief-title]",
    isRepaired
      ? "Measurement contract repaired"
      : "Measurement contract still leaks",
  );
  setGoodhartText(
    root,
    "[data-goodhart-gate-result]",
    isRepaired ? "GATE HOLDS" : "GATE LEAKS",
  );
  setGoodhartText(root, "[data-goodhart-debrief-outcome]", scenario.outcome);
  setGoodhartText(root, "[data-goodhart-debrief-proxy]", scenario.target);
  setGoodhartText(root, "[data-goodhart-debrief-gaming]", scenario.gamingPath);
  setGoodhartText(
    root,
    "[data-goodhart-debrief-counterevidence]",
    isRepaired
      ? scenario.counterevidence
      : `${option.assessment} Stronger counterevidence: ${scenario.counterevidence}`,
  );

  artifact.value = [
    "GOODHART PRESSURE TEST",
    `Outcome: ${scenario.outcome}`,
    `Proxy: ${scenario.target}`,
    `Gaming path: ${scenario.gamingPath}`,
    `Chosen safeguard: ${option.title} — ${option.detail}`,
    `Gate assessment: ${isRepaired ? "HOLDS" : "LEAKS"} — ${option.assessment}`,
    `Counterevidence: ${scenario.counterevidence}`,
    `Revised gate: ${scenario.revisedGate}`,
    "Model boundary: deterministic illustrative values; validate the contract against real workloads, failures, and distributions.",
  ].join("\n\n");
}

function getScorecardLabel(scenario: GoodhartScenario, pressured: boolean) {
  const timing = pressured ? "after target pressure" : "at baseline";
  return scenario.measures
    .map((measure) =>
      pressured
        ? `${measure.label}: ${measure.before} to ${measure.after}`
        : `${measure.label}: ${measure.before}`,
    )
    .join(`; ${timing}; `);
}

function updateProgress(
  root: HTMLElement,
  current: "target" | "pressure" | "repair",
) {
  const order = ["target", "pressure", "repair"];
  const currentIndex = order.indexOf(current);

  for (const step of root.querySelectorAll<HTMLElement>(
    "[data-goodhart-step]",
  )) {
    const index = order.indexOf(step.dataset.goodhartStep ?? "");
    step.classList.toggle("is-active", index === currentIndex);
    step.classList.toggle("is-complete", index < currentIndex);
  }
}

function clearPredictions(root: HTMLElement) {
  for (const input of root.querySelectorAll<HTMLInputElement>(
    'input[name="goodhart-prediction"]',
  )) {
    input.checked = false;
  }
}

function clearSafeguards(root: HTMLElement) {
  for (const input of root.querySelectorAll<HTMLInputElement>(
    'input[name="goodhart-safeguard"]',
  )) {
    input.checked = false;
  }
}

function readTarget(root: HTMLElement): GoodhartTarget | null {
  const input = root.querySelector<HTMLInputElement>(
    'input[name="goodhart-target"]:checked',
  );
  return isGoodhartTarget(input?.value) ? input.value : null;
}

function readGoodhartPrediction(root: HTMLElement): GoodhartPrediction | null {
  const input = root.querySelector<HTMLInputElement>(
    'input[name="goodhart-prediction"]:checked',
  );
  return isPrediction(input?.value) ? input.value : null;
}

function readSafeguard(root: HTMLElement): Safeguard | null {
  const input = root.querySelector<HTMLInputElement>(
    'input[name="goodhart-safeguard"]:checked',
  );
  return isSafeguard(input?.value) ? input.value : null;
}

function isGoodhartTarget(value: string | undefined): value is GoodhartTarget {
  return value === "coverage" || value === "latency" || value === "agent-pass";
}

function isPrediction(value: string | undefined): value is GoodhartPrediction {
  return value === "aligned" || value === "diverges" || value === "unchanged";
}

function isSafeguard(value: string | undefined): value is Safeguard {
  return (
    value === "paired" || value === "selective" || value === "more-pressure"
  );
}

function setGoodhartText(root: HTMLElement, selector: string, value: string) {
  const element = root.querySelector<HTMLElement>(selector);
  if (element) {
    element.textContent = value;
  }
}

async function copyGoodhartArtifact(artifact: HTMLTextAreaElement) {
  try {
    await navigator.clipboard.writeText(artifact.value);
    return true;
  } catch {
    artifact.focus();
    artifact.select();
    return document.execCommand("copy");
  }
}
