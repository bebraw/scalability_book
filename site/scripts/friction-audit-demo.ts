type FrictionKey = "setup" | "comprehension" | "change" | "testing";
type AssistanceKey = "human" | "weak-agent" | "harnessed-agent";

type Scenario = {
  title: string;
  copy: string;
  files: string[];
  process: ProcessStep[];
};

type Improvement = {
  title: string;
  copy: string;
  effects: Partial<Record<FrictionKey, number>>;
};

type ProcessStep = {
  phase: string;
  task: string;
  friction: FrictionKey;
  baseMinutes: number;
};

type AssistanceMode = {
  title: string;
  copy: string;
  speed: Record<FrictionKey, number>;
  reworkMultiplier: number;
  risk: "Low" | "Medium" | "High";
};

const frictionWeights: Record<FrictionKey, number> = {
  setup: 9,
  comprehension: 11,
  change: 12,
  testing: 10,
};

const frictionMinutePenalty: Record<FrictionKey, number> = {
  setup: 1,
  comprehension: 2,
  change: 2.5,
  testing: 1.5,
};

const frictionLabels: Record<FrictionKey, string> = {
  setup: "Setup",
  comprehension: "Comprehension",
  change: "Change",
  testing: "Testing",
};

// Basis: docs/friction-audit-estimate-basis.md. The agent multipliers are
// bounded by published studies that show both constrained-task speedups and
// mature-codebase slowdowns, so this is a calibrated teaching model rather
// than a productivity forecast.
const assistanceModes: Record<AssistanceKey, AssistanceMode> = {
  human: {
    title: "Human only",
    copy: "The team does the search, edit, test, and review work manually.",
    speed: { setup: 1, comprehension: 1, change: 1, testing: 1 },
    reworkMultiplier: 1,
    risk: "Medium",
  },
  "weak-agent": {
    title: "Agent with weak project context",
    copy: "The agent drafts edits faster, but missing setup, unclear boundaries, and weak tests create review and rework.",
    speed: { setup: 1.05, comprehension: 1.05, change: 0.8, testing: 1.05 },
    reworkMultiplier: 1.35,
    risk: "High",
  },
  "harnessed-agent": {
    title: "Agent with good instructions and tests",
    copy: "Clear project instructions, seed data, and focused tests let the agent move faster with fewer correction loops.",
    speed: { setup: 0.85, comprehension: 0.8, change: 0.65, testing: 0.75 },
    reworkMultiplier: 0.7,
    risk: "Low",
  },
};
const fallbackAssistanceMode: AssistanceMode = assistanceModes.human ?? {
  title: "Human only",
  copy: "The team does the search, edit, test, and review work manually.",
  speed: { setup: 1, comprehension: 1, change: 1, testing: 1 },
  reworkMultiplier: 1,
  risk: "Medium",
};

const scenarios: Record<string, Scenario> = {
  "required-field": {
    title: "Add a required event property",
    copy: "A new event type needs one required field in the UI, API, storage, and summary view.",
    files: ["Event form", "API validation", "Storage shape", "Summary view"],
    process: [
      {
        phase: "Setup",
        task: "Start the app with representative seed events.",
        friction: "setup",
        baseMinutes: 8,
      },
      {
        phase: "Locate",
        task: "Find where event fields are defined and validated.",
        friction: "comprehension",
        baseMinutes: 10,
      },
      {
        phase: "Edit",
        task: "Update the form, API, storage shape, and summary view.",
        friction: "change",
        baseMinutes: 16,
      },
      {
        phase: "Verify",
        task: "Prove missing required data is rejected.",
        friction: "testing",
        baseMinutes: 10,
      },
      {
        phase: "Review",
        task: "Explain why UI and backend rules now match.",
        friction: "comprehension",
        baseMinutes: 8,
      },
      {
        phase: "Fix loop",
        task: "Revisit a missed path if review or testing finds drift.",
        friction: "testing",
        baseMinutes: 8,
      },
    ],
  },
  "reviewer-setup": {
    title: "Run the project as a reviewer",
    copy: "A teammate has to install, seed, and inspect the project before giving useful feedback.",
    files: ["README", "Env file", "Seed data", "Main workflow"],
    process: [
      {
        phase: "Setup",
        task: "Find the runtime, install dependencies, and configure env vars.",
        friction: "setup",
        baseMinutes: 12,
      },
      {
        phase: "Seed",
        task: "Create believable events instead of testing an empty app.",
        friction: "setup",
        baseMinutes: 10,
      },
      {
        phase: "Locate",
        task: "Find the screen and workflow the author expects you to inspect.",
        friction: "comprehension",
        baseMinutes: 8,
      },
      {
        phase: "Verify",
        task: "Decide whether behavior is broken or only missing data.",
        friction: "testing",
        baseMinutes: 10,
      },
      {
        phase: "Review",
        task: "Write feedback that separates setup problems from code problems.",
        friction: "change",
        baseMinutes: 8,
      },
    ],
  },
  "filter-summary": {
    title: "Add a filterable event summary",
    copy: "A dashboard needs a filter by event type and a count grouped by day.",
    files: ["Event loader", "Filter UI", "Summary query", "Empty states"],
    process: [
      {
        phase: "Locate",
        task: "Understand how events are stored, loaded, and summarized.",
        friction: "comprehension",
        baseMinutes: 14,
      },
      {
        phase: "Edit",
        task: "Add filtering without duplicating query logic in multiple places.",
        friction: "change",
        baseMinutes: 18,
      },
      {
        phase: "Verify",
        task: "Check empty, small, and noisy datasets.",
        friction: "testing",
        baseMinutes: 12,
      },
      {
        phase: "Review",
        task: "Show that the filter and summary share the same assumptions.",
        friction: "comprehension",
        baseMinutes: 8,
      },
      {
        phase: "Fix loop",
        task: "Repair performance or data-shape surprises found during review.",
        friction: "change",
        baseMinutes: 10,
      },
    ],
  },
  "production-bug": {
    title: "Explain a production data bug",
    copy: "Some events appear under two names because event types are free-form strings.",
    files: ["Write path", "Import code", "Existing data", "Regression test"],
    process: [
      {
        phase: "Locate",
        task: "Find where invalid event names entered the system.",
        friction: "comprehension",
        baseMinutes: 12,
      },
      {
        phase: "Trace",
        task: "Decide whether UI, API, seed data, or import code created it.",
        friction: "comprehension",
        baseMinutes: 14,
      },
      {
        phase: "Edit",
        task: "Guard future writes and decide what to do with existing data.",
        friction: "change",
        baseMinutes: 16,
      },
      {
        phase: "Verify",
        task: "Add evidence that the bug cannot silently return.",
        friction: "testing",
        baseMinutes: 12,
      },
      {
        phase: "Review",
        task: "Explain the migration or cleanup risk.",
        friction: "change",
        baseMinutes: 8,
      },
    ],
  },
};
const fallbackScenario: Scenario = scenarios["required-field"] ?? {
  title: "Change request",
  copy: "Score a small change path to see where repeated work appears.",
  files: ["Relevant module", "Tests", "Review notes"],
  process: [
    {
      phase: "Locate",
      task: "Find the relevant code.",
      friction: "comprehension",
      baseMinutes: 10,
    },
    {
      phase: "Edit",
      task: "Make the change.",
      friction: "change",
      baseMinutes: 12,
    },
    {
      phase: "Verify",
      task: "Verify behavior.",
      friction: "testing",
      baseMinutes: 10,
    },
  ],
};

const improvements: Record<string, Improvement> = {
  "setup-script": {
    title: "One-command setup with seed data",
    copy: "Everyone starts from the same runnable project and known data.",
    effects: { setup: 2, testing: 1 },
  },
  "schema-validation": {
    title: "Shared schema validation at boundaries",
    copy: "The UI and backend reject the same invalid event shapes.",
    effects: { comprehension: 1, change: 1, testing: 1 },
  },
  "focused-tests": {
    title: "Focused tests for the important behavior",
    copy: "A reviewer can verify the risky path without manually clicking through the whole app.",
    effects: { testing: 3, change: 1 },
  },
  "small-review": {
    title: "Smaller change boundary and review checklist",
    copy: "The diff has a clear responsibility, and repeated review comments become a checklist.",
    effects: { comprehension: 1, change: 2 },
  },
};
const fallbackImprovement: Improvement = improvements["setup-script"] ?? {
  title: "One-command setup with seed data",
  copy: "Everyone starts from the same runnable project and known data.",
  effects: { setup: 2, testing: 1 },
};

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-friction-demo]",
)) {
  initializeFrictionDemo(root);
}

function initializeFrictionDemo(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>("[data-friction-demo-form]");
  const scenarioSelect = root.querySelector<HTMLSelectElement>(
    "[data-friction-demo-scenario]",
  );
  const improvementSelect = root.querySelector<HTMLSelectElement>(
    "[data-friction-demo-improvement]",
  );
  const assistanceSelect = root.querySelector<HTMLSelectElement>(
    "[data-friction-demo-assistance]",
  );
  const scoreInputs = Array.from(
    root.querySelectorAll<HTMLInputElement>("[data-friction-demo-score]"),
  );
  const outputs = Array.from(
    root.querySelectorAll<HTMLOutputElement>("[data-friction-demo-output]"),
  );
  const metrics = Array.from(
    root.querySelectorAll<HTMLElement>("[data-friction-demo-metric]"),
  );
  const process = root.querySelector<HTMLElement>(
    "[data-friction-demo-process]",
  );
  const files = root.querySelector<HTMLElement>("[data-friction-demo-files]");
  const bars = root.querySelector<HTMLElement>("[data-friction-demo-bars]");
  const verdict = root.querySelector<HTMLElement>(
    "[data-friction-demo-verdict]",
  );
  const scenarioTitle = root.querySelector<HTMLElement>(
    "[data-friction-demo-scenario-title]",
  );
  const scenarioCopy = root.querySelector<HTMLElement>(
    "[data-friction-demo-scenario-copy]",
  );
  const improvementTitle = root.querySelector<HTMLElement>(
    "[data-friction-demo-improvement-title]",
  );
  const improvementCopy = root.querySelector<HTMLElement>(
    "[data-friction-demo-improvement-copy]",
  );
  const agentTitle = root.querySelector<HTMLElement>(
    "[data-friction-demo-agent-title]",
  );
  const agentCopy = root.querySelector<HTMLElement>(
    "[data-friction-demo-agent-copy]",
  );
  const interpretation = root.querySelector<HTMLElement>(
    "[data-friction-demo-interpretation]",
  );
  const artifact = root.querySelector<HTMLTextAreaElement>(
    "[data-friction-demo-artifact]",
  );
  const copy = root.querySelector<HTMLButtonElement>(
    "[data-friction-demo-copy]",
  );
  const steps = Array.from(
    root.querySelectorAll<HTMLElement>("[data-friction-demo-step]"),
  );
  const tabs = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-friction-demo-tab]"),
  );
  const previous = root.querySelector<HTMLButtonElement>(
    "[data-friction-demo-prev]",
  );
  const next = root.querySelector<HTMLButtonElement>(
    "[data-friction-demo-next]",
  );

  if (
    !form ||
    !scenarioSelect ||
    !improvementSelect ||
    !assistanceSelect ||
    !process ||
    !files ||
    !bars ||
    !verdict ||
    !scenarioTitle ||
    !scenarioCopy ||
    !improvementTitle ||
    !improvementCopy ||
    !agentTitle ||
    !agentCopy ||
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
  const showStep = (step: number, focusStep = false) => {
    currentStep = Math.max(0, Math.min(step, steps.length - 1));
    updateFrictionStage(steps, tabs, previous, next, currentStep, focusStep);
  };
  const render = () => {
    const scenario = scenarios[scenarioSelect.value] ?? fallbackScenario;
    const improvement =
      improvements[improvementSelect.value] ?? fallbackImprovement;
    const assistance = getAssistanceMode(assistanceSelect.value);
    const scores = getScores(scoreInputs);
    const result = calculateFriction(scenario, scores, improvement, assistance);

    scenarioTitle.textContent = scenario.title;
    scenarioCopy.textContent = scenario.copy;
    files.innerHTML = scenario.files
      .map((file) => `<li>${escapeFrictionHtml(file)}</li>`)
      .join("");
    improvementTitle.textContent = improvement.title;
    improvementCopy.textContent = improvement.copy;
    agentTitle.textContent = assistance.title;
    agentCopy.textContent = assistance.copy;
    process.innerHTML = buildProcess(scenario, scores, assistance);
    outputs.forEach((output) => {
      const key = output.dataset.frictionDemoOutput as FrictionKey | undefined;

      if (key) {
        output.value = String(scores[key]);
        output.textContent = String(scores[key]);
      }
    });
    updateFrictionMetrics(metrics, result);
    bars.innerHTML = buildBars(scores);
    verdict.textContent = `${result.before} min change path`;
    interpretation.textContent = buildFrictionInterpretation(
      result,
      improvement,
    );
    artifact.value = buildFrictionArtifact(
      scenario,
      result,
      improvement,
      assistance,
    );
    updateFrictionStage(steps, tabs, previous, next, currentStep, false);
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (currentStep < steps.length - 1) {
      showStep(currentStep + 1, true);
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
        copy.textContent = "Copy audit";
      }, 1400);
    } catch {
      copy.textContent = "Select text";
    }
  });

  render();
  showStep(0);
}

function getScores(inputs: HTMLInputElement[]) {
  return inputs.reduce(
    (scores, input) => {
      const key = input.dataset.frictionDemoScore as FrictionKey | undefined;

      if (key) {
        scores[key] = Number(input.value);
      }

      return scores;
    },
    {
      setup: 0,
      comprehension: 0,
      change: 0,
      testing: 0,
    } as Record<FrictionKey, number>,
  );
}

function calculateFriction(
  scenario: Scenario,
  scores: Record<FrictionKey, number>,
  improvement: Improvement,
  assistance: AssistanceMode,
) {
  const before = estimateMinutes(scenario, scores, assistance);
  const improvedScores = { ...scores };

  Object.entries(improvement.effects).forEach(([key, effect]) => {
    const frictionKey = key as FrictionKey;
    improvedScores[frictionKey] = Math.max(
      0,
      improvedScores[frictionKey] - effect,
    );
  });

  const after = estimateMinutes(scenario, improvedScores, assistance);
  const saved = Math.max(0, before - after);
  const loops = Math.max(
    1,
    Math.round(
      ((scores.setup + scores.testing + scores.comprehension) / 3) *
        assistance.reworkMultiplier,
    ),
  );
  const largest = (Object.keys(scores) as FrictionKey[]).reduce(
    (winner, key) =>
      scores[key] * frictionWeights[key] >
      scores[winner] * frictionWeights[winner]
        ? key
        : winner,
  );

  return {
    before,
    after,
    saved,
    loops,
    largest,
    scores,
    improvedScores,
    assistanceRisk: assistance.risk,
  };
}

function estimateMinutes(
  scenario: Scenario,
  scores: Record<FrictionKey, number>,
  assistance: AssistanceMode,
) {
  return scenario.process.reduce(
    (total, step) => total + processStepMinutes(step, scores, assistance),
    0,
  );
}

function updateFrictionMetrics(
  nodes: HTMLElement[],
  result: ReturnType<typeof calculateFriction>,
) {
  nodes.forEach((node) => {
    const key = node.dataset.frictionDemoMetric;

    if (key === "before") {
      node.textContent = `${result.before} min`;
    } else if (key === "after") {
      node.textContent = `${result.after} min`;
    } else if (key === "saved") {
      node.textContent = `${result.saved} min`;
    } else if (key === "loops") {
      node.textContent = `${result.loops}`;
    } else if (key === "agentRisk") {
      node.textContent = result.assistanceRisk;
    } else if (key === "largest") {
      node.textContent = frictionLabels[result.largest];
    }
  });
}

function buildBars(scores: Record<FrictionKey, number>) {
  return (Object.keys(scores) as FrictionKey[])
    .map((key) => {
      return `<div class="friction-demo-bar-row">
        <span>${frictionLabels[key]}</span>
        <meter min="0" max="5" value="${scores[key]}"></meter>
        <strong>${scores[key]}</strong>
      </div>`;
    })
    .join("");
}

function buildProcess(
  scenario: Scenario,
  scores: Record<FrictionKey, number>,
  assistance: AssistanceMode,
) {
  return scenario.process
    .map((step, index) => {
      const minutes = processStepMinutes(step, scores, assistance);

      return `<article class="friction-demo-process-step">
        <span>${index + 1}</span>
        <div>
          <strong>${escapeFrictionHtml(step.phase)}</strong>
          <p>${escapeFrictionHtml(step.task)}</p>
        </div>
        <small>${frictionLabels[step.friction]} friction</small>
        <em>${minutes} min</em>
      </article>`;
    })
    .join("");
}

function processStepMinutes(
  step: ProcessStep,
  scores: Record<FrictionKey, number>,
  assistance: AssistanceMode,
) {
  return Math.round(
    (step.baseMinutes +
      scores[step.friction] * frictionMinutePenalty[step.friction]) *
      assistance.speed[step.friction],
  );
}

function buildFrictionInterpretation(
  result: ReturnType<typeof calculateFriction>,
  improvement: Improvement,
) {
  if (result.saved >= 18) {
    return `${improvement.title} removes a meaningful amount of repeated work. This is a good first Reconstruct improvement.`;
  }

  if (result.loops >= 4) {
    return "The change path is likely to loop. Pick an improvement that gives faster feedback before changing more code.";
  }

  return "The path is workable, but the audit still names where the next repeated delay will come from.";
}

function buildFrictionArtifact(
  scenario: Scenario,
  result: ReturnType<typeof calculateFriction>,
  improvement: Improvement,
  assistance: AssistanceMode,
) {
  return [
    `Friction audit: ${scenario.title}`,
    "",
    `Estimated change path: ${result.before} min before improvement, ${result.after} min after.`,
    `Largest source: ${frictionLabels[result.largest]}.`,
    `Likely rework loops: ${result.loops}.`,
    `Assistance mode: ${assistance.title}.`,
    `Agent rework risk: ${result.assistanceRisk}.`,
    "",
    "Scores:",
    `- Setup: ${result.scores.setup}/5`,
    `- Comprehension: ${result.scores.comprehension}/5`,
    `- Change: ${result.scores.change}/5`,
    `- Testing: ${result.scores.testing}/5`,
    "",
    `Chosen improvement: ${improvement.title}`,
    improvement.copy,
    "",
    "Next action:",
    "Implement the chosen feedback-loop improvement before adding more features.",
  ].join("\n");
}

function getAssistanceMode(value: string) {
  if (
    value === "human" ||
    value === "weak-agent" ||
    value === "harnessed-agent"
  ) {
    return assistanceModes[value] ?? fallbackAssistanceMode;
  }

  return fallbackAssistanceMode;
}

function updateFrictionStage(
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

function escapeFrictionHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
