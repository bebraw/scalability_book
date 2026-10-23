type GoodhartPrediction = "aligned" | "diverges" | "unchanged";
type GoodhartSafeguard = "paired" | "selective" | "more-pressure";

const coverageCase = {
  outcome:
    "Changes resist regressions because important behavior is checked, not merely executed.",
  proxy: "Line coverage ≥ 95%",
  gamingPath:
    "The optimizer adds shallow tests that execute lines, snapshots broad output, and mocks difficult branches. Coverage rises while fewer meaningful faults are caught.",
  measures: [
    { label: "Line coverage", before: "72%", after: "96%" },
    { label: "Held-out behavior checks", before: "94%", after: "87%" },
    { label: "Mutation survivors", before: "18", after: "46" },
    { label: "Review per change", before: "22 min", after: "33 min" },
  ],
  counterevidence:
    "Held-out behavior failures and mutation survivors, reviewed independently of the coverage report.",
  proposedGate:
    "Coverage ≥ 95% AND named behavior checks pass AND the mutation sample stays below its survivor limit.",
};

const coverageSafeguards: Record<
  GoodhartSafeguard,
  { title: string; assessment: string }
> = {
  paired: {
    title: "Independent behavior gate",
    assessment:
      "This proposal addresses the shallow-test gaming path by checking whether assertions detect changed behavior. It still needs executed checks and a justified mutation sample; this authored case does not establish that the gate works.",
  },
  selective: {
    title: "Author-selected green audit",
    assessment:
      "Reports selected by the test author can hide shallow assertions. This proposal leaves the named gaming path open.",
  },
  "more-pressure": {
    title: "Raise the target to 99%",
    assessment:
      "A higher coverage target rewards more line execution without requiring meaningful assertions. This proposal leaves the named gaming path open.",
  },
};

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-goodhart-demo]",
)) {
  initializeGoodhartCase(root);
}

function initializeGoodhartCase(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>("[data-goodhart-form]")!;
  const status = root.querySelector<HTMLElement>("[data-goodhart-status]")!;
  const apply = root.querySelector<HTMLButtonElement>("[data-goodhart-apply]")!;
  const reveal = root.querySelector<HTMLButtonElement>("[data-goodhart-test]")!;
  const repair = root.querySelector<HTMLElement>("[data-goodhart-repair]")!;
  const debrief = root.querySelector<HTMLElement>("[data-goodhart-debrief]")!;
  const artifact = root.querySelector<HTMLTextAreaElement>(
    "[data-goodhart-artifact]",
  )!;
  const copy = root.querySelector<HTMLButtonElement>("[data-goodhart-copy]")!;
  const reset = root.querySelector<HTMLButtonElement>("[data-goodhart-reset]")!;
  let phase: "prediction" | "pressure" | "assessment" = "prediction";

  const clearAssessment = () => {
    debrief.hidden = true;
    artifact.value = "";
    delete root.dataset.goodhartGate;
    copy.textContent = "Copy case notes";
  };
  const resetCase = () => {
    form.reset();
    phase = "prediction";
    root.classList.remove("is-pressured");
    delete root.dataset.goodhartPhase;
    clearAssessment();
    status.textContent = "Predict the coverage case";
    setGoodhartText(root, "[data-goodhart-board-stamp]", "BASELINE");
    setGoodhartText(
      root,
      "[data-goodhart-trace] p",
      "The post-target values stay sealed until you make a prediction. The case is authored; no model or checks run here.",
    );
    coverageCase.measures.forEach((measure, index) => {
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
    updateScorecardLabel(root, false);
    repair.hidden = true;
    apply.disabled = true;
    reveal.disabled = true;
    updateProgress(root, "target");
  };

  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("change", (event) => {
    const target = event.target as HTMLInputElement;
    if (target.name === "goodhart-prediction") {
      apply.disabled = phase !== "prediction" || !readGoodhartPrediction(root);
    }
    if (target.name === "goodhart-safeguard") {
      clearAssessment();
      phase = "pressure";
      status.textContent = "Proposal changed — reveal its authored assessment";
      reveal.disabled = !readSafeguard(root);
      updateProgress(root, "pressure");
    }
  });
  apply.addEventListener("click", () => {
    const prediction = readGoodhartPrediction(root);
    if (!prediction || phase !== "prediction") return;
    phase = "pressure";
    root.classList.add("is-pressured");
    root.dataset.goodhartPhase = "pressure";
    apply.disabled = true;
    form
      .querySelectorAll<HTMLInputElement>('[name="goodhart-prediction"]')
      .forEach((input) => (input.disabled = true));
    coverageCase.measures.forEach((measure, index) =>
      setGoodhartText(
        root,
        `[data-goodhart-measure-after="${index}"]`,
        measure.after,
      ),
    );
    updateScorecardLabel(root, true);
    status.textContent = `${prediction === "diverges" ? "Prediction matches" : "Prediction differs from"} the authored case — proxy improves, outcome degrades`;
    setGoodhartText(root, "[data-goodhart-board-stamp]", "AUTHORED RESULT");
    setGoodhartText(root, "[data-goodhart-trace] p", coverageCase.gamingPath);
    setGoodhartText(
      root,
      "[data-goodhart-gaming-path]",
      coverageCase.gamingPath,
    );
    repair.hidden = false;
    updateProgress(root, "pressure");
    root
      .querySelector<HTMLElement>("#goodhart-repair-title")
      ?.focus({ preventScroll: true });
  });
  reveal.addEventListener("click", () => {
    const safeguard = readSafeguard(root);
    if (!safeguard || phase === "prediction") return;
    const proposal = coverageSafeguards[safeguard];
    phase = "assessment";
    root.dataset.goodhartGate = safeguard === "paired" ? "addresses" : "open";
    status.textContent =
      "Authored assessment revealed — test a real check locally";
    setGoodhartText(
      root,
      "[data-goodhart-debrief-title]",
      safeguard === "paired"
        ? "A proposal to test"
        : "This proposal leaves the gaming path open",
    );
    setGoodhartText(root, "[data-goodhart-gate-result]", "CASE ASSESSMENT");
    setGoodhartText(
      root,
      "[data-goodhart-debrief-outcome]",
      coverageCase.outcome,
    );
    setGoodhartText(root, "[data-goodhart-debrief-proxy]", coverageCase.proxy);
    setGoodhartText(
      root,
      "[data-goodhart-debrief-gaming]",
      proposal.assessment,
    );
    setGoodhartText(
      root,
      "[data-goodhart-debrief-counterevidence]",
      coverageCase.counterevidence,
    );
    artifact.value = [
      "Goodhart coverage case — authored notes",
      `Outcome: ${coverageCase.outcome}`,
      `Proxy: ${coverageCase.proxy}`,
      `Gaming path: ${coverageCase.gamingPath}`,
      `Chosen proposal: ${proposal.title}`,
      `Authored assessment: ${proposal.assessment}`,
      `Counterevidence: ${coverageCase.counterevidence}`,
      `Proposed gate: ${coverageCase.proposedGate}`,
      "Next local check: in the concern-directed mutation lab, strengthen one black-box assertion; pass baseline, reject a named faulty variant, and pass storage-refactor.",
      "Boundary: illustrative values and authored reasoning. No model, revised gate or acceptance check was executed by this demo. Targets can be useful when their relation to the intended outcome is checked.",
    ].join("\n\n");
    debrief.hidden = false;
    updateProgress(root, "repair");
    root
      .querySelector<HTMLElement>("[data-goodhart-debrief-title]")
      ?.focus({ preventScroll: true });
  });
  copy.addEventListener("click", async () => {
    artifact.select();
    try {
      await navigator.clipboard.writeText(artifact.value);
      copy.textContent = "Case notes copied";
    } catch {
      copy.textContent = "Select and copy";
    }
  });
  reset.addEventListener("click", () => {
    form
      .querySelectorAll<HTMLInputElement>('[name="goodhart-prediction"]')
      .forEach((input) => (input.disabled = false));
    resetCase();
    form
      .querySelector<HTMLInputElement>('[name="goodhart-prediction"]')
      ?.focus();
  });
  resetCase();
}

function readGoodhartPrediction(root: HTMLElement): GoodhartPrediction | null {
  const value = root.querySelector<HTMLInputElement>(
    '[name="goodhart-prediction"]:checked',
  )?.value;
  return value === "aligned" || value === "diverges" || value === "unchanged"
    ? value
    : null;
}
function readSafeguard(root: HTMLElement): GoodhartSafeguard | null {
  const value = root.querySelector<HTMLInputElement>(
    '[name="goodhart-safeguard"]:checked',
  )?.value;
  return value === "paired" ||
    value === "selective" ||
    value === "more-pressure"
    ? value
    : null;
}
function setGoodhartText(root: HTMLElement, selector: string, value: string) {
  const target = root.querySelector<HTMLElement>(selector);
  if (target) target.textContent = value;
}
function updateScorecardLabel(root: HTMLElement, revealed: boolean) {
  root
    .querySelector("[data-goodhart-scorecard]")
    ?.setAttribute(
      "aria-label",
      "Authored coverage case: " +
        coverageCase.measures
          .map(
            (measure) =>
              `${measure.label}: ${measure.before}${revealed ? ` to ${measure.after}` : " at baseline"}`,
          )
          .join("; "),
    );
}
function updateProgress(
  root: HTMLElement,
  current: "target" | "pressure" | "repair",
) {
  const order = ["target", "pressure", "repair"];
  root.querySelectorAll<HTMLElement>("[data-goodhart-step]").forEach((step) => {
    const index = order.indexOf(step.dataset.goodhartStep ?? "");
    step.classList.toggle("is-active", index === order.indexOf(current));
    step.classList.toggle("is-complete", index < order.indexOf(current));
  });
}
