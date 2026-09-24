const auditStages = [
  "setup",
  "comprehension",
  "change",
  "testing",
  "review",
  "deployment",
  "operations",
  "coordination",
] as const;

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-friction-demo]",
)) {
  initializeFrictionAudit(root);
}

function initializeFrictionAudit(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>("[data-friction-demo-form]");
  const artifact = root.querySelector<HTMLTextAreaElement>(
    "[data-friction-demo-artifact]",
  );
  const copy = root.querySelector<HTMLButtonElement>(
    "[data-friction-demo-copy]",
  );
  const verdict = root.querySelector<HTMLElement>(
    "[data-friction-demo-verdict]",
  );
  const interpretation = root.querySelector<HTMLElement>(
    "[data-friction-demo-interpretation]",
  );
  if (!form || !artifact || !copy || !verdict || !interpretation) return;

  const note = (key: string) =>
    root
      .querySelector<
        HTMLInputElement | HTMLTextAreaElement
      >('[data-friction-note="' + key + '"]')
      ?.value.trim() || "Not recorded";
  const acceptance = (period: string) =>
    root.querySelector<HTMLSelectElement>(
      '[data-friction-acceptance="' + period + '"]',
    )?.value || "unchecked";
  const readMinutes = (selector: string) => {
    const input = root.querySelector<HTMLInputElement>(selector);
    if (!input || input.value.trim() === "" || !input.validity.valid)
      return null;
    const value = input.valueAsNumber;
    return Number.isFinite(value) && value >= 0 ? value : null;
  };
  const total = (values: (number | null)[]) => {
    if (values.some((value) => value === null)) return null;
    const sum = values.reduce<number>((acc, value) => acc + (value ?? 0), 0);
    return Number.isFinite(sum) ? sum : null;
  };
  const format = (value: number | null, signed = false) =>
    value === null
      ? "Incomplete"
      : (signed && value > 0 ? "+" : "") +
        new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(
          value,
        ) +
        " person-min";
  const labels: Record<string, string> = {
    unchecked: "Not checked",
    pass: "Passes declared checks",
    fail: "Fails declared checks",
  };

  const render = () => {
    const values = (period: string) =>
      auditStages.map((stage) =>
        readMinutes(
          '[data-friction-stage="' +
            stage +
            '"][data-friction-period="' +
            period +
            '"]',
        ),
      );
    const before = values("before");
    const after = values("after");
    const beforeTotal = total(before);
    const afterTotal = total(after);
    const difference =
      beforeTotal === null || afterTotal === null
        ? null
        : afterTotal - beforeTotal;
    const investment = readMinutes("[data-friction-investment]");
    const netSum =
      difference === null || investment === null
        ? null
        : difference + investment;
    const net = netSum !== null && Number.isFinite(netSum) ? netSum : null;
    const metrics: Record<string, number | null> = {
      before: beforeTotal,
      after: afterTotal,
      difference,
      net,
    };
    for (const element of root.querySelectorAll<HTMLElement>(
      "[data-friction-demo-metric]",
    )) {
      const key = element.dataset.frictionDemoMetric || "";
      element.textContent = format(
        metrics[key] ?? null,
        key === "difference" || key === "net",
      );
    }
    const beforeAcceptance = acceptance("before");
    const afterAcceptance = acceptance("after");
    if (beforeAcceptance === "fail" || afterAcceptance === "fail") {
      verdict.textContent = "Acceptance failed";
      interpretation.textContent =
        "At least one attempt failed its declared checks. Keep the effort as evidence of that attempt; it is not a comparison of accepted changes.";
    } else if (difference === null) {
      verdict.textContent = "No complete comparison yet";
      interpretation.textContent =
        "Complete all eight stages for both attempts to compare total effort. Blank or invalid entries remain missing; a measured zero must be entered explicitly.";
    } else if (beforeAcceptance !== "pass" || afterAcceptance !== "pass") {
      verdict.textContent = "Acceptance evidence missing";
      interpretation.textContent =
        "The arithmetic is complete, but acceptance has not been checked for both attempts. Lower effort alone does not establish a useful improvement.";
    } else {
      verdict.textContent = "Observed difference: " + format(difference, true);
      interpretation.textContent =
        "Both attempts are marked as passing the declared checks. This is a local effort comparison: inspect the linked evidence, changed conditions, and practice effects before attributing the difference to the intervention.";
    }
    artifact.value = [
      "Friction audit — observed effort",
      "Task and acceptance checks: " + note("task"),
      "Intervention and hypothesis: " + note("hypothesis"),
      "Baseline revision/configuration: " + note("baseline"),
      "Candidate revision/configuration: " + note("candidate"),
      "Evidence, conditions, and limits: " + note("evidence"),
      "",
      "Stage: baseline / candidate active person-minutes",
      ...auditStages.map(
        (stage, index) =>
          stage +
          ": " +
          (before[index] ?? "missing") +
          " / " +
          (after[index] ?? "missing"),
      ),
      "",
      "Baseline effort: " + format(beforeTotal),
      "Candidate effort: " + format(afterTotal),
      "Candidate minus baseline: " + format(difference, true),
      "One-off intervention cost: " +
        (investment === null ? "Not recorded" : format(investment)),
      "Difference plus one-off cost: " + format(net, true),
      "Baseline acceptance: " + labels[beforeAcceptance],
      "Candidate acceptance: " + labels[afterAcceptance],
      interpretation.textContent,
      "",
      "Next check or reversal condition: " + note("next"),
      "Limits: person-minutes are active effort, not wall time. Assign each person's time once. Positive differences mean more effort. One pair does not establish causation, future savings, or risk; ongoing maintenance and waiting belong in the notes.",
    ].join("\n");
  };

  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  copy.addEventListener("click", async () => {
    artifact.select();
    try {
      await navigator.clipboard.writeText(artifact.value);
      copy.textContent = "Copied";
      window.setTimeout(() => {
        copy.textContent = "Copy audit";
      }, 1400);
    } catch {
      copy.textContent = "Select text";
    }
  });
  render();
}
