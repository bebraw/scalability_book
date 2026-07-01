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
  setup: 0.25,
  comprehension: 0.75,
  change: 1,
  testing: 0.75,
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
        baseMinutes: 2,
      },
      {
        phase: "Locate",
        task: "Find where event fields are defined and validated.",
        friction: "comprehension",
        baseMinutes: 3,
      },
      {
        phase: "Edit",
        task: "Update the form, API, storage shape, and summary view.",
        friction: "change",
        baseMinutes: 7,
      },
      {
        phase: "Verify",
        task: "Prove missing required data is rejected.",
        friction: "testing",
        baseMinutes: 4,
      },
      {
        phase: "Review",
        task: "Explain why UI and backend rules now match.",
        friction: "comprehension",
        baseMinutes: 3,
      },
      {
        phase: "Fix loop",
        task: "Revisit a missed path if review or testing finds drift.",
        friction: "testing",
        baseMinutes: 3,
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
        baseMinutes: 2,
      },
      {
        phase: "Seed",
        task: "Create believable events instead of testing an empty app.",
        friction: "setup",
        baseMinutes: 1,
      },
      {
        phase: "Locate",
        task: "Find the screen and workflow the author expects you to inspect.",
        friction: "comprehension",
        baseMinutes: 1,
      },
      {
        phase: "Verify",
        task: "Decide whether behavior is broken or only missing data.",
        friction: "testing",
        baseMinutes: 2,
      },
      {
        phase: "Review",
        task: "Write feedback that separates setup problems from code problems.",
        friction: "comprehension",
        baseMinutes: 1,
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
        baseMinutes: 5,
      },
      {
        phase: "Edit",
        task: "Add filtering without duplicating query logic in multiple places.",
        friction: "change",
        baseMinutes: 8,
      },
      {
        phase: "Verify",
        task: "Check empty, small, and noisy datasets.",
        friction: "testing",
        baseMinutes: 5,
      },
      {
        phase: "Review",
        task: "Show that the filter and summary share the same assumptions.",
        friction: "comprehension",
        baseMinutes: 3,
      },
      {
        phase: "Fix loop",
        task: "Repair performance or data-shape surprises found during review.",
        friction: "change",
        baseMinutes: 4,
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
        baseMinutes: 5,
      },
      {
        phase: "Trace",
        task: "Decide whether UI, API, seed data, or import code created it.",
        friction: "comprehension",
        baseMinutes: 6,
      },
      {
        phase: "Edit",
        task: "Guard future writes and decide what to do with existing data.",
        friction: "change",
        baseMinutes: 7,
      },
      {
        phase: "Verify",
        task: "Add evidence that the bug cannot silently return.",
        friction: "testing",
        baseMinutes: 5,
      },
      {
        phase: "Review",
        task: "Explain the migration or cleanup risk.",
        friction: "change",
        baseMinutes: 4,
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
const fallbackImprovement: Improvement = improvements["schema-validation"] ?? {
  title: "Shared schema validation at boundaries",
  copy: "The UI and backend reject the same invalid event shapes.",
  effects: { comprehension: 1, change: 1, testing: 1 },
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
  const metrics = Array.from(
    root.querySelectorAll<HTMLElement>("[data-friction-demo-metric]"),
  );
  const process = root.querySelector<HTMLElement>(
    "[data-friction-demo-process]",
  );
  const files = root.querySelector<HTMLElement>("[data-friction-demo-files]");
  const verdict = root.querySelector<HTMLElement>(
    "[data-friction-demo-verdict]",
  );
  const scenarioCopy = root.querySelector<HTMLElement>(
    "[data-friction-demo-scenario-copy]",
  );
  const improvementCopy = root.querySelector<HTMLElement>(
    "[data-friction-demo-improvement-copy]",
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

  if (
    !form ||
    !scenarioSelect ||
    !improvementSelect ||
    !assistanceSelect ||
    !process ||
    !files ||
    !verdict ||
    !scenarioCopy ||
    !improvementCopy ||
    !agentCopy ||
    !interpretation ||
    !artifact ||
    !copy
  ) {
    return;
  }

  const render = () => {
    const scenario = scenarios[scenarioSelect.value] ?? fallbackScenario;
    const improvement =
      improvements[improvementSelect.value] ?? fallbackImprovement;
    const assistance = getAssistanceMode(assistanceSelect.value);
    const scores = getScores(scoreInputs);
    const result = calculateFriction(scenario, scores, improvement, assistance);

    scenarioCopy.textContent = scenario.copy;
    files.innerHTML = scenario.files
      .map((file) => `<li>${escapeFrictionHtml(file)}</li>`)
      .join("");
    improvementCopy.textContent = improvement.copy;
    agentCopy.textContent = assistance.copy;
    process.innerHTML = buildProcess(scenario, scores, assistance);
    updateFrictionMetrics(metrics, result);
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
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });
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

function escapeFrictionHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
