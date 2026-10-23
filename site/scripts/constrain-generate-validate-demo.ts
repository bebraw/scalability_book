type CgvConstraint = "platform" | "scope" | "acceptance";
type CgvPhase =
  | "constrain"
  | "generated"
  | "validated"
  | "revising"
  | "complete";

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
      round === 1 ? "Generate candidate" : "Generate revised candidate";
    status.textContent = `Round ${round} · constrain the change`;
    title.textContent = feedback
      ? "The explicit revision became constraints"
      : "No candidate generated";
    candidateView.innerHTML = feedback
      ? `<p><strong>Project memory updated.</strong> The next candidate receives the requirements learned in the previous round.</p>`
      : "Choose the constraints the candidate should receive.";
    reading.textContent = feedback
      ? "The next attempt is informed by recorded learning, not merely by an instruction to try again. Generate with the revised boundary."
      : "This is a scripted model of the loop. Generate an example, then inspect its simulated checks.";
    cgvRenderChecks(root, null);
    cgvRenderStages(root, "constrain", round > 1);
    roundView.textContent = `Round ${round}`;
  };

  const renderGenerated = () => {
    candidate = cgvReadConstraints(root);
    phase = "generated";
    status.textContent = `Round ${round} · candidate generated`;
    title.textContent = "Candidate ready for simulated checks";
    candidateView.innerHTML = cgvCandidateMarkup(candidate);
    reading.textContent =
      "The candidate and check results are authored examples. Inspect the modeled boundaries, then use the local starter for executed evidence.";
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
      status.textContent = `Round ${round} · all simulated checks pass`;
      title.textContent = "Scripted checks accept this example";
      reading.textContent =
        "The authored example matches these three constraints. Real agent output still needs independently executed checks; an instruction does not guarantee conformance.";
      action.textContent = "Accept example";
    } else {
      status.textContent = `Round ${round} · ${failures.length} simulated check${failures.length === 1 ? "" : "s"} failed`;
      title.textContent = "Example rejected by scripted checks";
      reading.textContent = `${cgvFailureSummary(failures)} Feed those failures back as explicit constraints before generating again.`;
      action.textContent = "Revise project memory";
    }
  };

  const advanceAfterValidation = () => {
    if (!candidate) return;
    const failures = cgvConstraintKeys.filter((key) => !candidate![key]);

    if (failures.length === 0) {
      phase = "complete";
      status.textContent = `Round ${round} · loop complete`;
      action.textContent = "Loop complete";
      action.disabled = true;
      download.disabled = false;
      reading.textContent =
        "The scripted loop is complete. Download the authored example CSV, or implement and test the CSV starter locally.";
      root.classList.remove("is-cgv-looping");
      root.classList.add("is-cgv-complete");
      return;
    }

    phase = "revising";
    status.textContent = `Round ${round} · revise project memory`;
    title.textContent = "Evidence became an explicit revision";
    candidateView.innerHTML = cgvRevisionMarkup(failures);
    reading.textContent =
      "Record what the failed checks taught before another candidate is generated. This keeps the specification and implementation from drifting apart.";
    action.textContent = "Apply revision to next round";
    cgvRenderStages(root, "revise", true);
  };

  const applyRevision = () => {
    if (!candidate) return;
    const failures = cgvConstraintKeys.filter((key) => !candidate![key]);

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
    else if (phase === "validated") advanceAfterValidation();
    else if (phase === "revising") applyRevision();
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
<section><span>Scripted patch · ${files.length} files</span><ul>${files.map((file) => `<li>${file}</li>`).join("")}</ul><p><b>Download API</b> ${candidate.platform ? "Blob + URL.createObjectURL" : "node:fs.writeFileSync"}</p></section>
<section><span>Example export · events.csv</span><pre>${csv}</pre></section>
</div>`;
}

function cgvRevisionMarkup(failures: CgvConstraint[]) {
  const revisions: Record<CgvConstraint, string> = {
    platform: "Architecture: export must run in the browser without Node APIs.",
    scope: "Change boundary: edit only the export module and its test.",
    acceptance: "Acceptance: preserve fields containing commas or quotes.",
  };

  return `<div class="cgv-revision">
<span>Project memory · proposed revision</span>
<ul>${failures.map((failure) => `<li>${revisions[failure]}</li>`).join("")}</ul>
</div>`;
}

function cgvRenderChecks(root: HTMLElement, candidate: CgvCandidate | null) {
  const evidence: Record<
    CgvConstraint,
    { pending: string; pass: string; fail: string }
  > = {
    platform: {
      pending: "Can clicking Export create a download?",
      pass: "Simulated pass — this example uses browser APIs; no download test has run.",
      fail: "Simulated fail — this example uses a Node-only API in a browser.",
    },
    scope: {
      pending: "Did the patch stay inside export.ts and export.test.ts?",
      pass: "Simulated pass — the supplied file list stays inside the declared boundary.",
      fail: "Simulated fail — the supplied patch lists app.ts, events.ts, shared/csv.ts and package.json.",
    },
    acceptance: {
      pending: "Are commas and quotation marks escaped?",
      pass: "Simulated pass — the supplied CSV preserves commas and quotation marks.",
      fail: "Simulated fail — “Build, measure, learn” was split into three fields.",
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
  current: "constrain" | "generate" | "validate" | "revise",
  looping: boolean,
) {
  const order = ["constrain", "generate", "validate", "revise"];
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
