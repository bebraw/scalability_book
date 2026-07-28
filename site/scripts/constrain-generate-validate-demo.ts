type CgvConstraint = "platform" | "scope" | "acceptance";
type CgvPhase = "constrain" | "generated" | "validated" | "complete";

type CgvCandidate = Record<CgvConstraint, boolean>;

const cgvConstraintKeys: CgvConstraint[] = ["platform", "scope", "acceptance"];
const cgvExpectedCsv = `title,location
Architecture clinic,Room 204
"Build, measure, learn",Main hall
"API ""office hours""",Online`;

for (const root of document.querySelectorAll<HTMLElement>("[data-cgv-demo]")) {
  initializeCgvDemo(root);
}

function initializeCgvDemo(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>("[data-cgv-form]");
  const action = root.querySelector<HTMLButtonElement>("[data-cgv-action]");
  const reset = root.querySelector<HTMLButtonElement>("[data-cgv-reset]");
  const status = root.querySelector<HTMLElement>("[data-cgv-status]");
  const title = root.querySelector<HTMLElement>("[data-cgv-candidate-title]");
  const candidateView = root.querySelector<HTMLElement>("[data-cgv-candidate]");
  const reading = root.querySelector<HTMLElement>("[data-cgv-reading]");
  const roundView = root.querySelector<HTMLElement>("[data-cgv-round]");
  const download = root.querySelector<HTMLButtonElement>("[data-cgv-download]");

  if (
    !form ||
    !action ||
    !reset ||
    !status ||
    !title ||
    !candidateView ||
    !reading ||
    !roundView ||
    !download
  ) {
    return;
  }

  let phase: CgvPhase = "constrain";
  let round = 1;
  let candidate: CgvCandidate | null = null;

  const renderConstrain = (feedback = false) => {
    phase = "constrain";
    candidate = null;
    action.disabled = false;
    download.disabled = true;
    action.textContent =
      round === 1 ? "Generate candidate" : "Generate revision";
    status.textContent = `Round ${round} · constrain the change`;
    title.textContent = feedback
      ? "Validation feedback became constraints"
      : "No candidate generated";
    candidateView.innerHTML = feedback
      ? `<p><strong>Boundary revised.</strong> The next candidate receives the checks that failed in the previous round.</p>`
      : "Choose the constraints the candidate should receive.";
    reading.textContent = feedback
      ? "The loop is useful because the next attempt is narrower, not merely newer. Generate again with the revised boundary."
      : "Generation is not evidence. Generate a candidate, then run the checks.";
    cgvRenderChecks(root, null);
    cgvRenderStages(root, "constrain", round > 1);
    roundView.textContent = `Round ${round}`;
  };

  const renderGenerated = () => {
    candidate = cgvReadConstraints(root);
    phase = "generated";
    status.textContent = `Round ${round} · candidate generated`;
    title.textContent = "Candidate ready for independent checks";
    candidateView.innerHTML = cgvCandidateMarkup(candidate);
    reading.textContent =
      "The candidate looks plausible, but its own description is not proof. Validate each declared boundary.";
    action.textContent = "Validate candidate";
    cgvRenderChecks(root, null);
    cgvRenderStages(root, "generate", round > 1);
  };

  const renderValidated = () => {
    if (!candidate) return;
    phase = "validated";
    const failures = cgvConstraintKeys.filter((key) => !candidate![key]);
    cgvRenderChecks(root, candidate);
    cgvRenderStages(root, "validate", round > 1);

    if (failures.length === 0) {
      status.textContent = `Round ${round} · all checks pass`;
      title.textContent = "Evidence supports this candidate";
      reading.textContent =
        "The candidate satisfies the three stated boundaries. Human judgment can now focus on whether the requested change is valuable and the constraints were sufficient.";
      action.textContent = "Accept evidence";
    } else {
      status.textContent = `Round ${round} · ${failures.length} check${failures.length === 1 ? "" : "s"} failed`;
      title.textContent = "Candidate rejected by the harness";
      reading.textContent = `${cgvFailureSummary(failures)} Feed those failures back as explicit constraints before generating again.`;
      action.textContent = "Use failures as constraints";
    }
  };

  const applyValidation = () => {
    if (!candidate) return;
    const failures = cgvConstraintKeys.filter((key) => !candidate![key]);

    if (failures.length === 0) {
      phase = "complete";
      status.textContent = `Round ${round} · loop complete`;
      action.textContent = "Loop complete";
      action.disabled = true;
      download.disabled = false;
      reading.textContent =
        "The validated patch is now applied to the fixture. Click Export CSV to download the artifact that passed these checks.";
      root.classList.remove("is-cgv-looping");
      root.classList.add("is-cgv-complete");
      return;
    }

    for (const key of failures) {
      const input = root.querySelector<HTMLInputElement>(
        `[data-cgv-constraint][value="${key}"]`,
      );
      if (input) input.checked = true;
    }
    round += 1;
    root.classList.remove("is-cgv-complete");
    renderConstrain(true);
  };

  action.addEventListener("click", () => {
    if (phase === "constrain") renderGenerated();
    else if (phase === "generated") renderValidated();
    else if (phase === "validated") applyValidation();
  });

  form.addEventListener("change", () => {
    if (phase !== "constrain") {
      status.textContent = `Round ${round} · constraints changed`;
      renderConstrain(false);
    }
  });

  reset.addEventListener("click", () => {
    for (const input of root.querySelectorAll<HTMLInputElement>(
      "[data-cgv-constraint]",
    )) {
      input.checked = input.value === "platform";
    }
    round = 1;
    root.classList.remove("is-cgv-complete");
    renderConstrain(false);
  });

  download.addEventListener("click", () => {
    if (download.disabled) return;
    const url = URL.createObjectURL(
      new Blob([cgvExpectedCsv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "events.csv";
    link.click();
    URL.revokeObjectURL(url);
  });

  renderConstrain(false);
}

function cgvReadConstraints(root: HTMLElement): CgvCandidate {
  return {
    platform: cgvIsChecked(root, "platform"),
    scope: cgvIsChecked(root, "scope"),
    acceptance: cgvIsChecked(root, "acceptance"),
  };
}

function cgvIsChecked(root: HTMLElement, key: CgvConstraint) {
  return Boolean(
    root.querySelector<HTMLInputElement>(
      `[data-cgv-constraint][value="${key}"]`,
    )?.checked,
  );
}

function cgvCandidateMarkup(candidate: CgvCandidate) {
  const files = candidate.scope
    ? ["events/export.ts", "events/export.test.ts"]
    : ["app.ts", "events.ts", "shared/csv.ts", "package.json"];
  const csv = candidate.acceptance
    ? cgvExpectedCsv
    : `title,location
Architecture clinic,Room 204
Build, measure, learn,Main hall
API "office hours",Online`;

  return `<div class="cgv-artifact-grid">
<section><span>Generated patch · ${files.length} files</span><ul>${files.map((file) => `<li>${file}</li>`).join("")}</ul><p><b>Download API</b> ${candidate.platform ? "Blob + URL.createObjectURL" : "node:fs.writeFileSync"}</p></section>
<section><span>Observed export · events.csv</span><pre>${csv}</pre></section>
</div>`;
}

function cgvRenderChecks(root: HTMLElement, candidate: CgvCandidate | null) {
  const evidence: Record<
    CgvConstraint,
    { pending: string; pass: string; fail: string }
  > = {
    platform: {
      pending: "Can clicking Export create a download?",
      pass: "PASS — the click emitted events.csv through the Blob API.",
      fail: "FAIL — node:fs is not available in the browser.",
    },
    scope: {
      pending: "Did the patch stay inside export.ts and export.test.ts?",
      pass: "PASS — both changed files are inside the declared boundary.",
      fail: "FAIL — app.ts, events.ts, shared/csv.ts, and package.json changed.",
    },
    acceptance: {
      pending: "Are commas and quotation marks escaped?",
      pass: "PASS — “Build, measure, learn” remains one CSV field.",
      fail: "FAIL — “Build, measure, learn” was split into three fields.",
    },
  };

  for (const key of cgvConstraintKeys) {
    const item = root.querySelector<HTMLElement>(`[data-cgv-check="${key}"]`);
    const marker = item?.querySelector<HTMLElement>("i");
    const detail = item?.querySelector<HTMLElement>("[data-cgv-check-detail]");
    if (!item || !marker || !detail) continue;

    item.classList.remove("is-pass", "is-fail");
    if (!candidate) {
      marker.textContent = "—";
      detail.textContent = evidence[key].pending;
    } else if (candidate[key]) {
      item.classList.add("is-pass");
      marker.textContent = "✓";
      detail.textContent = evidence[key].pass;
    } else {
      item.classList.add("is-fail");
      marker.textContent = "×";
      detail.textContent = evidence[key].fail;
    }
  }
}

function cgvRenderStages(
  root: HTMLElement,
  current: "constrain" | "generate" | "validate",
  looping: boolean,
) {
  const order = ["constrain", "generate", "validate"];
  const currentIndex = order.indexOf(current);
  for (const stage of root.querySelectorAll<HTMLElement>("[data-cgv-stage]")) {
    const index = order.indexOf(stage.dataset.cgvStage || "");
    stage.classList.toggle("is-current", index === currentIndex);
    stage.classList.toggle("is-complete", index < currentIndex);
  }
  root.classList.toggle("is-cgv-looping", looping);
}

function cgvFailureSummary(failures: CgvConstraint[]) {
  const labels: Record<CgvConstraint, string> = {
    platform: "The candidate crossed the browser runtime boundary.",
    scope: "The patch expanded beyond the intended files.",
    acceptance: "The CSV behavior failed difficult values.",
  };
  return failures.map((failure) => labels[failure]).join(" ");
}
