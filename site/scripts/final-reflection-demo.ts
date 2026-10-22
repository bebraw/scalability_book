type EvidenceKey = "implementation" | "fleet" | "experiment" | "decision";

type EvidenceItem = {
  label: string;
  artifact: string;
  section: string;
  evidencePrompt: string;
  limitationPrompt: string;
  missing: string;
};

const evidenceOrder: EvidenceKey[] = [
  "implementation",
  "fleet",
  "experiment",
  "decision",
];

const evidenceItems: Record<EvidenceKey, EvidenceItem> = {
  implementation: {
    label: "Implementation",
    artifact:
      "Accepted C revision and common submission bundle; links to A and B",
    section: "1. Implementation",
    evidencePrompt:
      "Link setup, configuration, time and resource use, acceptance checks, architecture, pressure and friction evidence, and the cross-team audit and response.",
    limitationPrompt:
      "Identify the checked revisions, environment, failed checks, and unverified properties.",
    missing:
      "Link implementation C and its common evidence, including the cross-team audit and response; reuse the submitted A and B records.",
  },
  fleet: {
    label: "Fleet evidence",
    artifact:
      "Fleet plan, compact actual-run record, and at least two debugging findings",
    section: "2. Fleet evidence",
    evidencePrompt:
      "Connect the task graph to the actual run and at least two debugging findings, and include coordination measurements, B–C case analysis, supplied matched-trace analysis, and one workflow-level formal-model analysis; trace import and your own matched pair are optional.",
    limitationPrompt:
      "Include failed attempts and human review; record missing usage or trace data, supplied-trace provenance and comparison limits, and alternative explanations for the B–C result.",
    missing:
      "Connect the fleet plan, actual-run record and two debugging findings to coordination measurements, supplied matched-trace analysis, and the workflow model.",
  },
  experiment: {
    label: "Scaling and deployment experiment",
    artifact:
      "Application model, before-and-after scaling response, and deployed workload evidence",
    section: "3. Scaling and deployment experiment",
    evidencePrompt:
      "Link one application-level formal-model analysis, the implemented response, every measurement repetition under the same procedure, its new failure or recovery check, and the realistic deployment run.",
    limitationPrompt:
      "Name the implementation, revisions, workload, environment, and resource proxy; retain disappointing results and state what the deployment does not prove.",
    missing:
      "Link the application model, implemented and remeasured scaling response, new failure or recovery obligation, and realistic deployed-workload evidence.",
  },
  decision: {
    label: "Final decision",
    artifact:
      "A–B–C evidence matrix, target architecture, trade-off table, and one decision narrative",
    section: "4. Final decision",
    evidencePrompt:
      "Establish the comparison, explain consequential results, bound attribution to models or orchestration, and choose an architecture and workflow for stated constraints with a revisit condition.",
    limitationPrompt:
      "Label observation, inference, and proposal; mark missing evidence, rejected alternatives, human responsibilities, the owner of operations and correction, and the next saturation signal or measurement.",
    missing:
      "Use the evidence matrix to support one conditional decision, with the target architecture, trade-offs, ownership, and a revisit condition.",
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

    verdict.textContent = `${selected.length} of ${evidenceOrder.length} bundles selected`;
    missing.innerHTML =
      missingKeys.length === 0
        ? `<li class="is-complete">All four bundles selected. Verify their evidence against the specification; selection does not establish completeness.</li>`
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
        copy.textContent = "Copy evidence index";
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

Evidence to link:
${item.artifact}

${item.evidencePrompt}

Limits to record:
${item.limitationPrompt}

Artifact links and interpretation:
[Add links and explain the evidence here.]`;
  });
  const missingLines =
    missing.length === 0
      ? [
          "- All four bundles are selected; check the linked evidence against the specification before submission.",
        ]
      : missing.map((key) => `- ${evidenceItems[key].missing}`);

  return [
    "# Compare evidence index",
    "",
    "Use four sections in one evidence index. Link each artifact once and reuse it across the analysis; these sections do not require separate documents.",
    "",
    ...selectedSections,
    "## Bundles still to assemble or verify",
    "",
    ...missingLines,
    "",
    "Requirements: /project/compare/#what-to-do-and-submit",
  ].join("\n");
}

function escapeReflectionHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
