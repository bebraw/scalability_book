type EvidenceKey =
  | "architecture"
  | "assumption"
  | "friction"
  | "measurement"
  | "workflow"
  | "scaling"
  | "risk";

type EvidenceItem = {
  label: string;
  artifact: string;
  section: string;
  example: string;
  claimPrompt: string;
  evidencePrompt: string;
  limitationPrompt: string;
  missing: string;
};

const evidenceOrder: EvidenceKey[] = [
  "architecture",
  "assumption",
  "friction",
  "measurement",
  "workflow",
  "scaling",
  "risk",
];

const evidenceItems: Record<EvidenceKey, EvidenceItem> = {
  architecture: {
    label: "Request trace screenshot or ADR",
    artifact: "POST /events request trace or architecture decision record",
    section: "Original design and boundary choice",
    example:
      "POST /events crosses browser, network, API handler, database, and response boundaries.",
    claimPrompt:
      "Claim: The first scalable design choice was the boundary that mattered most.",
    evidencePrompt:
      "Evidence to cite: Name the boundary, owner, request/response contract, and failure mode shown in the trace or ADR.",
    limitationPrompt:
      "What it does not prove: This does not prove the runtime can handle load; it only explains the design boundary.",
    missing:
      "Add a request trace screenshot or ADR so the reflection has a concrete starting design.",
  },
  assumption: {
    label: "Changed assumption brief",
    artifact: "Reality pressure map or changed-assumption note",
    section: "What changed after Construct",
    example:
      "Offline retries, deletion requests, burst traffic, or multiple tenants changed the system pressure.",
    claimPrompt:
      "Claim: The project became harder because one original assumption stopped holding.",
    evidencePrompt:
      "Evidence to cite: State the old assumption, the new pressure, the stressed component, and first observable signal.",
    limitationPrompt:
      "What it does not prove: This does not prove the chosen fix is correct; it only identifies the pressure.",
    missing:
      "Name the changed assumption; otherwise Reconstruct can sound like arbitrary refactoring.",
  },
  friction: {
    label: "Friction audit result",
    artifact: "Friction audit table or improvement before/after",
    section: "Friction found while changing the system",
    example:
      "Adding one required event field touched form validation, API validation, storage, summary view, and tests.",
    claimPrompt:
      "Claim: Development scalability was limited by a specific source of friction.",
    evidencePrompt:
      "Evidence to cite: Name the change, the slowest step, the friction score, and the improvement that reduced it.",
    limitationPrompt:
      "What it does not prove: This does not prove all future changes are easy; it describes one representative path.",
    missing:
      "Include one friction observation so the reflection covers development scalability, not only runtime behavior.",
  },
  measurement: {
    label: "Measurement screenshot or table",
    artifact: "Benchmark, metric, trace, log, or database inspection result",
    section: "Evidence from measurement",
    example:
      "A trace separated API time from database time, or a benchmark showed p95 latency under a specific workload.",
    claimPrompt:
      "Claim: One operational question was answered by measurement rather than intuition.",
    evidencePrompt:
      "Evidence to cite: Name the symptom, selected signal, value observed, workload, and date/context of the run.",
    limitationPrompt:
      "What it does not prove: State the workload or environment that was not covered.",
    missing:
      "Add one measurement result; claims about scalability need evidence beyond intuition.",
  },
  workflow: {
    label: "Human-agent workflow trace",
    artifact: "Prompt, agent output, review note, or correction loop",
    section: "How work was delegated and reviewed",
    example:
      "A scout found files, an implementer changed them, and a reviewer or test caught a missing validation path.",
    claimPrompt:
      "Claim: Agent assistance changed the workflow, but human review still owned integration.",
    evidencePrompt:
      "Evidence to cite: Name the delegated role, output, validation command, human correction, and remaining risk.",
    limitationPrompt:
      "What it does not prove: This does not prove delegation is always faster; it shows where it worked or failed locally.",
    missing:
      "Add workflow evidence if AI assistance was used; otherwise note why this dimension did not apply.",
  },
  scaling: {
    label: "Scaling trade-off table",
    artifact: "Scaling planner trade-off table",
    section: "Scaling decision and trade-off",
    example:
      "Queue ingestion relieved write bursts but introduced queue depth, retry, and freshness risks.",
    claimPrompt:
      "Claim: The selected scaling move answered one named pressure while introducing a new cost.",
    evidencePrompt:
      "Evidence to cite: Name the pressure, selected move, expected benefit, new failure mode, and signal to watch.",
    limitationPrompt:
      "What it does not prove: This does not prove the technique is universally best; it is a trade-off for this pressure.",
    missing:
      "Include a scaling trade-off so the reflection does not present a technique as a free improvement.",
  },
  risk: {
    label: "Remaining risk note",
    artifact: "Next-risk note or next-measurement plan",
    section: "Remaining risk and next step",
    example:
      "The next failure could be queue backlog, stale dashboards, noisy tenants, or unclear review ownership.",
    claimPrompt:
      "Claim: The reflection ends with the next uncertainty, not a claim of being done.",
    evidencePrompt:
      "Evidence to cite: Name the remaining risk, first signal to watch, and what action would be taken before scaling further.",
    limitationPrompt:
      "What it does not prove: This is a risk forecast, not evidence that the failure has happened.",
    missing:
      "End with a remaining risk or next measurement so the reflection stays honest about uncertainty.",
  },
};

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-reflection-package-demo]",
)) {
  initializeReflectionPackageDemo(root);
}

function initializeReflectionPackageDemo(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>(
    "[data-reflection-package-form]",
  );
  const inputs = Array.from(
    root.querySelectorAll<HTMLInputElement>(
      "[data-reflection-package-evidence]",
    ),
  );
  const verdict = root.querySelector<HTMLElement>(
    "[data-reflection-package-verdict]",
  );
  const missing = root.querySelector<HTMLElement>(
    "[data-reflection-package-missing]",
  );
  const outline = root.querySelector<HTMLTextAreaElement>(
    "[data-reflection-package-outline]",
  );
  const copy = root.querySelector<HTMLButtonElement>(
    "[data-reflection-package-copy]",
  );

  if (!form || !verdict || !missing || !outline || !copy) {
    return;
  }

  const render = () => {
    const selected = getSelectedEvidence(inputs);
    const missingKeys = evidenceOrder.filter((key) => !selected.includes(key));

    verdict.textContent = `${selected.length} of ${evidenceOrder.length} evidence pieces ready`;
    missing.innerHTML =
      missingKeys.length === 0
        ? `<li class="is-complete">All core evidence categories are represented.</li>`
        : missingKeys
            .map(
              (key) =>
                `<li><strong>${escapeReflectionHtml(evidenceItems[key].label)}</strong><span>${escapeReflectionHtml(evidenceItems[key].missing)}</span></li>`,
            )
            .join("");
    outline.value = buildReflectionOutline(selected, missingKeys);
  };

  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("change", render);
  copy.addEventListener("click", async () => {
    outline.select();

    try {
      await navigator.clipboard.writeText(outline.value);
      copy.textContent = "Copied";
      window.setTimeout(() => {
        copy.textContent = "Copy package";
      }, 1400);
    } catch {
      copy.textContent = "Select text";
    }
  });

  render();
}

function getSelectedEvidence(inputs: HTMLInputElement[]) {
  return inputs
    .filter((input) => input.checked)
    .map((input) => input.value)
    .filter(isEvidenceKey);
}

function isEvidenceKey(value: string): value is EvidenceKey {
  return value in evidenceItems;
}

function buildReflectionOutline(
  selected: EvidenceKey[],
  missing: EvidenceKey[],
) {
  const selectedSections = selected.map((key) => {
    const item = evidenceItems[key];

    return `## ${item.section}

Artifact to attach or cite:
${item.artifact}

Concrete example:
${item.example}

${item.claimPrompt}

${item.evidencePrompt}

${item.limitationPrompt}

Write this paragraph:
- In our project, ...
- The artifact shows ...
- This supports the claim that ...
- It does not prove ...`;
  });
  const missingLines =
    missing.length === 0
      ? ["- No core evidence gaps flagged by the package builder."]
      : missing.map((key) => `- ${evidenceItems[key].missing}`);

  return [
    "# Final reflection package draft",
    "",
    "Thesis: Explain how the project changed when it moved from Construct to Reconstruct to Deconstruct. Every claim below should point to a named artifact.",
    "",
    ...selectedSections,
    "## Evidence gaps to address before submission",
    "",
    ...missingLines,
    "",
    "## Final synthesis",
    "",
    "What did this project teach you about scalability as a technical, architectural, organizational, and agentic concern?",
  ].join("\n");
}

function escapeReflectionHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
