type WorkflowModeKey = "solo" | "agent-weak" | "agent-harnessed";
type WorkflowSignalKey = "setup" | "context" | "tests";

type WorkflowMode = {
  title: string;
  copy: string;
  defaultSignals: Record<WorkflowSignalKey, number>;
  actors: Array<{
    label: string;
    role: string;
    risk: string;
  }>;
  baseReviewMinutes: number;
  automation: number;
};

const workflowModes: Record<WorkflowModeKey, WorkflowMode> = {
  solo: {
    title: "Human implements manually",
    copy: "The human reads, edits, tests, and prepares the review package.",
    defaultSignals: { setup: 3, context: 3, tests: 2 },
    actors: [
      {
        label: "Human",
        role: "Frames the change, edits code, and decides what is correct.",
        risk: "Cognitive load",
      },
      {
        label: "Tools",
        role: "Run the app, formatter, tests, and checks.",
        risk: "Slow feedback",
      },
      {
        label: "Reviewer",
        role: "Checks assumptions and asks for fixes.",
        risk: "Late discovery",
      },
    ],
    baseReviewMinutes: 35,
    automation: 1,
  },
  "agent-weak": {
    title: "Agent drafts with weak project context",
    copy: "The agent writes faster, but unclear setup and weak tests push more work into human review.",
    defaultSignals: { setup: 1, context: 1, tests: 1 },
    actors: [
      {
        label: "Human",
        role: "Writes the prompt, reads the diff, and catches missing intent.",
        risk: "Hidden assumptions",
      },
      {
        label: "Agent",
        role: "Finds files and drafts a plausible implementation.",
        risk: "Wrong local pattern",
      },
      {
        label: "Tools",
        role: "Expose syntax, type, and test failures when they exist.",
        risk: "Weak signal",
      },
      {
        label: "Reviewer",
        role: "Verifies behavior and asks for correction loops.",
        risk: "Rework",
      },
    ],
    baseReviewMinutes: 42,
    automation: 2,
  },
  "agent-harnessed": {
    title: "Agent works with clear harness and tests",
    copy: "Instructions, seed data, and focused tests let the agent use local feedback before review.",
    defaultSignals: { setup: 4, context: 4, tests: 4 },
    actors: [
      {
        label: "Human",
        role: "Defines intent and checks product judgment.",
        risk: "Wrong goal",
      },
      {
        label: "Agent",
        role: "Makes the change and runs the expected checks.",
        risk: "Overreach",
      },
      {
        label: "Harness",
        role: "Provides setup, conventions, tests, and review checklist.",
        risk: "Outdated guidance",
      },
      {
        label: "Reviewer",
        role: "Reviews a smaller, better-evidenced diff.",
        risk: "Residual judgment",
      },
    ],
    baseReviewMinutes: 22,
    automation: 4,
  },
};

const signalLabels: Record<WorkflowSignalKey, string> = {
  setup: "Can run project locally",
  context: "Examples show the local pattern",
  tests: "Failing test captures expected behavior",
};
const signalEvidence: Record<
  WorkflowSignalKey,
  {
    weak: string;
    partial: string;
    strong: string;
    action: string;
  }
> = {
  setup: {
    weak: "Setup is still a conversation. The reviewer becomes the runtime environment.",
    partial:
      "A command exists, but missing data or configuration still creates guesswork.",
    strong: "The change can be run with known data before review.",
    action:
      "Add one setup command, seed data, and the required environment defaults.",
  },
  context: {
    weak: "The agent has to infer architecture and style from scattered files.",
    partial:
      "There are examples, but the intended pattern is not named clearly.",
    strong:
      "The expected local pattern is visible before implementation starts.",
    action:
      "Point to the closest example and document the convention being followed.",
  },
  tests: {
    weak: "Correctness is mostly manual review and clicking through the app.",
    partial:
      "Some checks exist, but they do not pin down the requested behavior.",
    strong: "A focused failing test can reject the wrong implementation.",
    action:
      "Add the smallest failing test or scripted check for the expected behavior.",
  },
};
const fallbackWorkflowMode = workflowModes.solo;

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-workflow-demo]",
)) {
  initializeWorkflowDemo(root);
}

function initializeWorkflowDemo(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>("[data-workflow-demo-form]");
  const modeSelect = root.querySelector<HTMLSelectElement>(
    "[data-workflow-demo-mode]",
  );
  const modeTitle = root.querySelector<HTMLElement>(
    "[data-workflow-demo-mode-title]",
  );
  const modeCopy = root.querySelector<HTMLElement>(
    "[data-workflow-demo-mode-copy]",
  );
  const loop = root.querySelector<HTMLElement>("[data-workflow-demo-loop]");
  const signals = Array.from(
    root.querySelectorAll<HTMLInputElement>("[data-workflow-demo-signal]"),
  );
  const outputs = Array.from(
    root.querySelectorAll<HTMLOutputElement>("[data-workflow-demo-output]"),
  );
  const metrics = Array.from(
    root.querySelectorAll<HTMLElement>("[data-workflow-demo-metric]"),
  );
  const evidence = root.querySelector<HTMLElement>(
    "[data-workflow-demo-evidence]",
  );
  const verdict = root.querySelector<HTMLElement>(
    "[data-workflow-demo-verdict]",
  );
  const interpretation = root.querySelector<HTMLElement>(
    "[data-workflow-demo-interpretation]",
  );
  const artifact = root.querySelector<HTMLTextAreaElement>(
    "[data-workflow-demo-artifact]",
  );
  const copy = root.querySelector<HTMLButtonElement>(
    "[data-workflow-demo-copy]",
  );
  const steps = Array.from(
    root.querySelectorAll<HTMLElement>("[data-workflow-demo-step]"),
  );
  const tabs = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-workflow-demo-tab]"),
  );
  const previous = root.querySelector<HTMLButtonElement>(
    "[data-workflow-demo-prev]",
  );
  const next = root.querySelector<HTMLButtonElement>(
    "[data-workflow-demo-next]",
  );

  if (
    !form ||
    !modeSelect ||
    !modeTitle ||
    !modeCopy ||
    !loop ||
    !evidence ||
    !verdict ||
    !interpretation ||
    !artifact ||
    !copy ||
    !previous ||
    !next ||
    steps.length === 0 ||
    tabs.length !== steps.length
  ) {
    return;
  }

  let currentStep = 0;
  let previousMode = modeSelect.value;
  const showStep = (step: number, focusStep = false) => {
    currentStep = Math.max(0, Math.min(step, steps.length - 1));
    updateWorkflowStage(steps, tabs, previous, next, currentStep, focusStep);
  };
  const render = () => {
    const mode = getWorkflowMode(modeSelect.value);
    const signalScores = getSignalScores(signals);
    const result = calculateWorkflow(mode, signalScores);

    modeTitle.textContent = mode.title;
    modeCopy.textContent = mode.copy;
    loop.innerHTML = buildWorkflowLoop(mode);
    outputs.forEach((output) => {
      const key = output.dataset.workflowDemoOutput as
        | WorkflowSignalKey
        | undefined;

      if (key) {
        output.value = String(signalScores[key]);
        output.textContent = String(signalScores[key]);
      }
    });
    updateWorkflowMetrics(metrics, result);
    evidence.innerHTML = buildWorkflowEvidence(signalScores);
    verdict.textContent = `${result.loops} loop${result.loops === 1 ? "" : "s"} likely`;
    interpretation.textContent = buildWorkflowInterpretation(result);
    artifact.value = buildWorkflowArtifact(mode, signalScores, result);
    updateWorkflowStage(steps, tabs, previous, next, currentStep, false);
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (currentStep < steps.length - 1) {
      showStep(currentStep + 1, true);
    }
  });
  modeSelect.addEventListener("change", () => {
    const mode = getWorkflowMode(modeSelect.value);

    if (modeSelect.value !== previousMode) {
      applyWorkflowSignalDefaults(signals, mode);
      previousMode = modeSelect.value;
    }
  });
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  previous.addEventListener("click", () => showStep(currentStep - 1, true));
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => showStep(index, true));
  });
  copy.addEventListener("click", async () => {
    artifact.select();

    try {
      await navigator.clipboard.writeText(artifact.value);
      copy.textContent = "Copied";
      window.setTimeout(() => {
        copy.textContent = "Copy package";
      }, 1400);
    } catch {
      copy.textContent = "Select text";
    }
  });

  applyWorkflowSignalDefaults(signals, getWorkflowMode(modeSelect.value));
  render();
  showStep(0);
}

function applyWorkflowSignalDefaults(
  inputs: HTMLInputElement[],
  mode: WorkflowMode,
) {
  inputs.forEach((input) => {
    const key = input.dataset.workflowDemoSignal as
      | WorkflowSignalKey
      | undefined;

    if (key) {
      input.value = String(mode.defaultSignals[key]);
    }
  });
}

function getWorkflowMode(value: string): WorkflowMode {
  if (
    value === "solo" ||
    value === "agent-weak" ||
    value === "agent-harnessed"
  ) {
    return workflowModes[value];
  }

  return fallbackWorkflowMode;
}

function getSignalScores(inputs: HTMLInputElement[]) {
  return inputs.reduce(
    (scores, input) => {
      const key = input.dataset.workflowDemoSignal as
        | WorkflowSignalKey
        | undefined;

      if (key) {
        scores[key] = Number(input.value);
      }

      return scores;
    },
    { setup: 0, context: 0, tests: 0 } as Record<WorkflowSignalKey, number>,
  );
}

function calculateWorkflow(
  mode: WorkflowMode,
  scores: Record<WorkflowSignalKey, number>,
) {
  const feedback = scores.setup + scores.context + scores.tests;
  const missingFeedback = 15 - feedback;
  const loops = Math.max(
    1,
    Math.round((missingFeedback + Math.max(0, 3 - mode.automation)) / 4),
  );
  const reviewMinutes = Math.max(
    10,
    Math.round(
      mode.baseReviewMinutes + missingFeedback * 4 - mode.automation * 5,
    ),
  );
  const leverage =
    mode.automation >= 4 && feedback >= 10
      ? "High"
      : mode.automation >= 2 && feedback >= 7
        ? "Medium"
        : "Low";

  return { loops, reviewMinutes, leverage, feedback };
}

function buildWorkflowLoop(mode: WorkflowMode) {
  return mode.actors
    .map(
      (actor, index) => `<article class="workflow-demo-node">
        <span>${index + 1}</span>
        <div>
          <strong>${escapeWorkflowHtml(actor.label)}</strong>
          <p>${escapeWorkflowHtml(actor.role)}</p>
        </div>
        <small>${escapeWorkflowHtml(actor.risk)}</small>
      </article>`,
    )
    .join("");
}

function updateWorkflowMetrics(
  nodes: HTMLElement[],
  result: ReturnType<typeof calculateWorkflow>,
) {
  nodes.forEach((node) => {
    const key = node.dataset.workflowDemoMetric;

    if (key === "loops") {
      node.textContent = String(result.loops);
    } else if (key === "review") {
      node.textContent = `${result.reviewMinutes} min`;
    } else if (key === "leverage") {
      node.textContent = result.leverage;
    }
  });
}

function buildWorkflowInterpretation(
  result: ReturnType<typeof calculateWorkflow>,
) {
  if (result.leverage === "High") {
    return "The workflow has enough local feedback that the human can review intent instead of rediscovering basic issues.";
  }

  if (result.loops >= 3) {
    return "The workflow is likely to bounce between agent, tools, and reviewer. Improve setup, context, or tests before asking for more output.";
  }

  return "The workflow can move, but some review work is still compensating for weak local feedback.";
}

function buildWorkflowEvidence(scores: Record<WorkflowSignalKey, number>) {
  return (Object.entries(scores) as Array<[WorkflowSignalKey, number]>)
    .map(([key, value]) => {
      const evidence = signalEvidence[key];
      const level = value >= 4 ? "strong" : value >= 2 ? "partial" : "weak";
      const label =
        value >= 4 ? "Ready signal" : value >= 2 ? "Partial signal" : "Gap";
      const text = evidence[level];

      return `<li>
        <span>${escapeWorkflowHtml(label)}</span>
        <strong>${escapeWorkflowHtml(signalLabels[key])}</strong>
        <p>${escapeWorkflowHtml(text)}</p>
        <small>${escapeWorkflowHtml(evidence.action)}</small>
      </li>`;
    })
    .join("");
}

function buildWorkflowArtifact(
  mode: WorkflowMode,
  scores: Record<WorkflowSignalKey, number>,
  result: ReturnType<typeof calculateWorkflow>,
) {
  return [
    `Workflow: ${mode.title}`,
    "",
    `Likely correction loops: ${result.loops}`,
    `Human review load: ${result.reviewMinutes} min`,
    `Automation leverage: ${result.leverage}`,
    "",
    "Feedback signals:",
    ...Object.entries(scores).map(
      ([key, value]) =>
        `- ${signalLabels[key as WorkflowSignalKey]}: ${value}/5`,
    ),
    "",
    "Concrete feedback improvements:",
    ...(Object.entries(scores) as Array<[WorkflowSignalKey, number]>).map(
      ([key, value]) => {
        const status =
          value >= 4 ? "keep" : value >= 2 ? "tighten" : "add first";

        return `- ${status}: ${signalEvidence[key].action}`;
      },
    ),
    "",
    "Human-in-the-loop rule:",
    "Keep the human responsible for intent, judgment, and acceptance. Move repeatable feedback into setup, tests, conventions, and review checklists.",
  ].join("\n");
}

function updateWorkflowStage(
  steps: HTMLElement[],
  tabs: HTMLButtonElement[],
  previous: HTMLButtonElement,
  next: HTMLButtonElement,
  currentStep: number,
  focusStep: boolean,
) {
  const finalStep = steps.length - 1;

  steps.forEach((step, index) => {
    const active = index === currentStep;

    step.hidden = !active;
    step.classList.toggle("is-active", active);
    step.setAttribute("aria-hidden", String(!active));
  });
  tabs.forEach((tab, index) => {
    const active = index === currentStep;

    if (active) {
      tab.setAttribute("aria-current", "step");
    } else {
      tab.removeAttribute("aria-current");
    }

    tab.classList.toggle("is-active", active);
    tab.classList.toggle("is-complete", index < currentStep);
  });
  previous.disabled = currentStep === 0;
  next.textContent = currentStep === finalStep ? "Done" : "Next";
  next.disabled = currentStep === finalStep;

  if (focusStep) {
    requestAnimationFrame(() => {
      steps[currentStep]
        ?.querySelector<HTMLElement>("select, textarea, input, button")
        ?.focus({ preventScroll: true });
    });
  }
}

function escapeWorkflowHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
