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
  section: string;
  prompt: string;
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
    label: "Architecture decision or request trace",
    section: "Original design and boundary choice",
    prompt:
      "Name the key client, API, data, or workflow boundary and explain why it mattered.",
    missing:
      "Add one architecture decision or request trace so the reflection has a concrete starting design.",
  },
  assumption: {
    label: "Changed assumption or pressure map",
    section: "What changed after Construct",
    prompt:
      "State the assumption that stopped holding and the pressure it created.",
    missing:
      "Name the changed assumption; otherwise Reconstruct can sound like arbitrary refactoring.",
  },
  friction: {
    label: "Friction audit",
    section: "Friction found while changing the system",
    prompt:
      "Describe the slowest or riskiest part of making a small change and what caused it.",
    missing:
      "Include one friction observation so the reflection covers development scalability, not only runtime behavior.",
  },
  measurement: {
    label: "Benchmark or observability result",
    section: "Evidence from measurement",
    prompt:
      "Report one benchmark, log, metric, trace, or inspection result and what it does not prove.",
    missing:
      "Add one measurement result; claims about scalability need evidence beyond intuition.",
  },
  workflow: {
    label: "Human-agent workflow evidence",
    section: "How work was delegated and reviewed",
    prompt:
      "Explain which work was suitable for agents, what humans reviewed, and what signal caught mistakes.",
    missing:
      "Add workflow evidence if AI assistance was used; otherwise note why this dimension did not apply.",
  },
  scaling: {
    label: "Scaling trade-off table",
    section: "Scaling decision and trade-off",
    prompt:
      "Connect one scaling move to the pressure it answered and the new cost or failure mode it introduced.",
    missing:
      "Include a scaling trade-off so the reflection does not present a technique as a free improvement.",
  },
  risk: {
    label: "Remaining risk or next measurement",
    section: "Remaining risk and next step",
    prompt:
      "Name the first thing that would break next and the measurement or simplification you would do before scaling further.",
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
        copy.textContent = "Copy outline";
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

Evidence: ${item.label}
Claim to support: ${item.prompt}`;
  });
  const missingLines =
    missing.length === 0
      ? ["- No core evidence gaps flagged by the package builder."]
      : missing.map((key) => `- ${evidenceItems[key].missing}`);

  return [
    "# Final reflection package",
    "",
    "Thesis: Explain how the project changed when it moved from Construct to Reconstruct to Deconstruct, using evidence rather than general claims.",
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
