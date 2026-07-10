type EvalTaskId = "bottleneck" | "benchmark" | "data-model";
type ModelId = "strong" | "small";
type RubricKey = "grounding" | "specificity" | "measurement";

type EvalTask = {
  id: EvalTaskId;
  label: string;
  context: string;
  prompt: string;
  rubric: string[];
  outputs: Record<ModelId, string>;
};

type ModelAttempt = {
  id: ModelId;
  label: string;
  latency: number;
  cost: number;
  sampleScores: Record<EvalTaskId, Record<RubricKey, number>>;
};

const tasks: Record<EvalTaskId, EvalTask> = {
  bottleneck: {
    id: "bottleneck",
    label: "Find one likely scaling bottleneck",
    context:
      "README: Users record workflow events and view the latest activity per project. Code excerpt: GET /events loads events with SELECT * FROM events WHERE project_id = ? ORDER BY created_at DESC LIMIT 50. The migration defines indexes on project_id and event_type, but not created_at.",
    prompt:
      "You are helping with the Reconstruct phase of a course project.\nUse only the context below. If something is missing, say what you cannot know.\n\nTask: Find one likely scaling bottleneck in the event tracking project.\n\nRequired output:\n- Bottleneck:\n- Evidence from the context:\n- Why it matters under higher load:\n- One measurement that would confirm or reject it:",
    rubric: [
      "Grounded in the supplied context rather than generic advice.",
      "Names a concrete query, endpoint, file, or data flow.",
      "Explains a measurement that could confirm or reject the claim.",
    ],
    outputs: {
      strong:
        "Bottleneck: the latest-events read path for GET /events.\nEvidence from the context: the endpoint sorts each project's events by created_at, but the migration only mentions indexes on project_id and event_type.\nWhy it matters under higher load: as project event volume grows, the database may scan or sort too much data to return the latest 50 events.\nOne measurement that would confirm or reject it: seed projects with increasing event counts and record p95 latency plus the query plan for the ORDER BY created_at query.",
      small:
        "Bottleneck: the database could become slow when there are many events.\nEvidence from the context: the app stores workflow events and users view activity.\nWhy it matters under higher load: more events usually means slower pages.\nOne measurement that would confirm or reject it: run a load test and see if it is slow.",
    },
  },
  benchmark: {
    id: "benchmark",
    label: "Produce a benchmark plan",
    context:
      "Project: a conference check-in event tracker. Users submit check-in events, organizers view the latest arrivals, and admins filter events by session. The Reconstruct assumption is 20,000 events during a 30-minute arrival peak.",
    prompt:
      "You are helping with the Reconstruct phase of a course project.\nUse only the context below.\n\nTask: Propose one benchmark plan.\n\nRequired output:\n- Workload:\n- Load level:\n- Metrics:\n- What the result does not prove:",
    rubric: [
      "Defines a workload that matches the project workflow.",
      "States a concrete load level rather than 'many users'.",
      "Includes latency, throughput, error rate, and at least one limitation.",
    ],
    outputs: {
      strong:
        "Workload: submit check-in events while organizers repeatedly load the latest arrivals and admins filter by session.\nLoad level: simulate 20,000 events over 30 minutes, with short bursts of 100 concurrent submitters.\nMetrics: write p95 latency, latest-arrivals p95 latency, filter latency, throughput, error rate, database CPU, and query count per request.\nWhat the result does not prove: it does not prove production behavior because the data, network, hardware, and user timing are synthetic.",
      small:
        "Workload: test check-ins and admin viewing.\nLoad level: use lots of users.\nMetrics: speed and errors.\nWhat the result does not prove: it may be different in production.",
    },
  },
  "data-model": {
    id: "data-model",
    label: "Explain the event data model",
    context:
      "Schema excerpt: Project(id, name), User(id, email), Event(id, project_id, actor_id, event_type, payload_json, created_at). README: events describe actions inside one project. Some events are created by system jobs, so actor_id can be null.",
    prompt:
      "You are helping with the Reconstruct phase of a course project.\nUse only the context below.\n\nTask: Explain the event data model.\n\nRequired output:\n- Main entities:\n- How events relate to them:\n- One unclear assumption:",
    rubric: [
      "Names the core entities and relationships.",
      "Accounts for nullable actor_id instead of inventing a user for every event.",
      "Identifies one assumption that should be clarified before redesign.",
    ],
    outputs: {
      strong:
        "Main entities: Project, User, and Event.\nHow events relate to them: each Event belongs to one Project through project_id. An Event may refer to the User who caused it through actor_id, but actor_id can be null for system-created events. payload_json stores event-specific details.\nOne unclear assumption: the schema does not show which event_type values are allowed or how payload_json is validated for each type.",
      small:
        "Main entities: projects, users, and events.\nHow events relate to them: users create events in projects and the event has data in JSON.\nOne unclear assumption: the database may need more tables later.",
    },
  },
};

const models: ModelAttempt[] = [
  {
    id: "strong",
    label: "Stronger model",
    latency: 18,
    cost: 0.42,
    sampleScores: {
      bottleneck: { grounding: 2, specificity: 2, measurement: 2 },
      benchmark: { grounding: 2, specificity: 2, measurement: 2 },
      "data-model": { grounding: 2, specificity: 2, measurement: 2 },
    },
  },
  {
    id: "small",
    label: "Smaller model",
    latency: 6,
    cost: 0.04,
    sampleScores: {
      bottleneck: { grounding: 1, specificity: 1, measurement: 1 },
      benchmark: { grounding: 1, specificity: 0, measurement: 1 },
      "data-model": { grounding: 1, specificity: 1, measurement: 0 },
    },
  },
];

const rubricLabels: Record<RubricKey, string> = {
  grounding: "Grounding",
  specificity: "Specificity",
  measurement: "Measurement",
};

const rubricHelp: Record<RubricKey, string> = {
  grounding:
    "0 = unsupported or invented. 1 = partly grounded. 2 = clearly uses the supplied context as evidence.",
  specificity:
    "0 = generic. 1 = names a broad area. 2 = points to a concrete query, endpoint, file, entity, or data flow.",
  measurement:
    "0 = no check. 1 = vague check. 2 = actionable metric, test, query plan, log signal, or benchmark.",
};

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-model-eval]",
)) {
  initializeEvalDemo(root);
}

function initializeEvalDemo(root: HTMLElement) {
  const taskSelect = root.querySelector<HTMLSelectElement>(
    "[data-model-eval-task]",
  );
  const prompt = root.querySelector<HTMLTextAreaElement>(
    "[data-model-eval-prompt]",
  );
  const context = root.querySelector<HTMLElement>("[data-model-eval-context]");
  const rubric = root.querySelector<HTMLElement>("[data-model-eval-rubric]");
  const cards = root.querySelector<HTMLElement>("[data-model-eval-cards]");
  const results = root.querySelector<HTMLElement>("[data-model-eval-results]");
  const verdict = root.querySelector<HTMLElement>("[data-model-eval-verdict]");
  const conclusion = root.querySelector<HTMLElement>(
    "[data-model-eval-conclusion]",
  );
  const steps = Array.from(
    root.querySelectorAll<HTMLElement>("[data-model-eval-step]"),
  );
  const tabs = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-model-eval-tab]"),
  );
  const previous = root.querySelector<HTMLButtonElement>(
    "[data-model-eval-prev]",
  );
  const next = root.querySelector<HTMLButtonElement>("[data-model-eval-next]");
  const form = root.querySelector<HTMLFormElement>("[data-model-eval-form]");

  if (
    !taskSelect ||
    !prompt ||
    !context ||
    !rubric ||
    !cards ||
    !results ||
    !verdict ||
    !conclusion ||
    !previous ||
    !next ||
    !form ||
    steps.length === 0 ||
    tabs.length !== steps.length
  ) {
    return;
  }

  let currentStep = 0;
  const showStep = (step: number, focusStep = false) => {
    currentStep = Math.max(0, Math.min(step, steps.length - 1));
    updateModelEvalStage(
      root,
      steps,
      tabs,
      previous,
      next,
      currentStep,
      focusStep,
    );
  };
  const render = () => {
    const task = tasks[taskSelect.value as EvalTaskId] ?? tasks.bottleneck;

    prompt.value = task.prompt;
    context.textContent = task.context;
    rubric.innerHTML = task.rubric
      .map((item) => `<li>${escapeModelEvalHtml(item)}</li>`)
      .join("");
    cards.innerHTML = models
      .map((model) => renderModelCard(model, task))
      .join("");
    updateScores(root, task, results, verdict, conclusion);
    updateModelEvalStage(root, steps, tabs, previous, next, currentStep, false);
  };

  taskSelect.addEventListener("change", render);
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (currentStep < steps.length - 1) {
      showStep(currentStep + 1, true);
    }
  });
  previous.addEventListener("click", () => showStep(currentStep - 1, true));
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => showStep(index, true));
  });
  cards.addEventListener("input", () => {
    const task = tasks[taskSelect.value as EvalTaskId] ?? tasks.bottleneck;
    updateScores(root, task, results, verdict, conclusion);
  });
  cards.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-model-eval-sample]",
    );

    if (!button) {
      return;
    }

    const model = button.dataset.modelEvalSample as ModelId | undefined;
    const task = tasks[taskSelect.value as EvalTaskId] ?? tasks.bottleneck;
    const modelConfig = models.find((candidate) => candidate.id === model);

    if (!model || !modelConfig) {
      return;
    }

    fillModelSample(root, task, modelConfig);
    updateScores(root, task, results, verdict, conclusion);
  });
  root.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-model-eval-sample-all]",
    );

    if (!button) {
      return;
    }

    const task = tasks[taskSelect.value as EvalTaskId] ?? tasks.bottleneck;
    models.forEach((model) => fillModelSample(root, task, model));
    updateScores(root, task, results, verdict, conclusion);
  });
  root.addEventListener("change", () => {
    const task = tasks[taskSelect.value as EvalTaskId] ?? tasks.bottleneck;
    updateScores(root, task, results, verdict, conclusion);
  });

  render();
  showStep(0);
}

function fillModelSample(
  root: HTMLElement,
  task: EvalTask,
  model: ModelAttempt,
) {
  const output = root.querySelector<HTMLTextAreaElement>(
    `[data-model-output="${model.id}"]`,
  );

  if (output) {
    output.value = task.outputs[model.id];
  }

  for (const [key, value] of Object.entries(model.sampleScores[task.id]) as [
    RubricKey,
    number,
  ][]) {
    const input = root.querySelector<HTMLInputElement>(
      `[data-model="${model.id}"][data-rubric="${key}"]`,
    );

    if (input) {
      input.value = String(value);
    }
  }
}

function renderModelCard(model: ModelAttempt, task: EvalTask) {
  const sliders = (Object.keys(rubricLabels) as RubricKey[])
    .map((key) => {
      const helpId = `model-eval-help-${model.id}-${key}`;

      return `<div class="model-eval-slider">
        <span class="model-eval-slider-label">
          <span>${escapeModelEvalHtml(rubricLabels[key])}</span>
          <button
            type="button"
            class="model-eval-help"
            aria-label="Help for ${escapeModelEvalHtml(rubricLabels[key])}"
            aria-describedby="${helpId}"
          >?</button>
          <span id="${helpId}" role="tooltip">${escapeModelEvalHtml(rubricHelp[key])}</span>
        </span>
        <input aria-label="${escapeModelEvalHtml(rubricLabels[key])} score for ${escapeModelEvalHtml(model.label)}" type="range" min="0" max="2" step="1" value="0" data-model="${model.id}" data-rubric="${key}" />
        <output data-score-output="${model.id}-${key}">0</output>
      </div>`;
    })
    .join("");

  return `<article class="model-eval-card" data-model-card="${model.id}">
    <header>
      <h4>${escapeModelEvalHtml(model.label)}</h4>
      <span>${model.latency}s / ${model.cost.toFixed(2)} EUR</span>
    </header>
    <label class="model-eval-output-field">
      <span>Model output</span>
      <textarea data-model-output="${model.id}" rows="9" placeholder="Paste the output from ${escapeModelEvalHtml(model.label.toLowerCase())} here."></textarea>
    </label>
    <button type="button" class="model-eval-sample" data-model-eval-sample="${model.id}">
      Use sample output
    </button>
    <div class="model-eval-sliders">${sliders}</div>
  </article>`;
}

function updateScores(
  root: HTMLElement,
  task: EvalTask,
  results: HTMLElement,
  verdict: HTMLElement,
  conclusion: HTMLElement,
) {
  const checks = Array.from(
    root.querySelectorAll<HTMLInputElement>("[data-model-eval-check]"),
  );
  const checkScore = checks.filter((check) => check.checked).length;
  const rows = models.map((model) => {
    const quality = getQualityScore(root, model.id);
    const output = root.querySelector<HTMLTextAreaElement>(
      `[data-model-output="${model.id}"]`,
    );

    return {
      model,
      quality,
      checks: checkScore,
      total: quality + checkScore,
      hasOutput: Boolean(output?.value.trim()),
    };
  });
  const best = [...rows].sort(
    (a, b) => b.total - a.total || a.model.cost - b.model.cost,
  )[0];
  const cheapest = [...rows].sort((a, b) => a.model.cost - b.model.cost)[0];

  if (!best || !cheapest) {
    return;
  }

  for (const output of root.querySelectorAll<HTMLOutputElement>(
    "[data-score-output]",
  )) {
    const [modelId, key] = output.dataset.scoreOutput?.split("-") ?? [];
    const input = root.querySelector<HTMLInputElement>(
      `[data-model="${modelId}"][data-rubric="${key}"]`,
    );

    if (input) {
      output.value = input.value;
      output.textContent = input.value;
    }
  }

  results.innerHTML = rows
    .map(
      (row) => `<tr>
        <td>${escapeModelEvalHtml(row.model.label)}</td>
        <td>${row.quality}/6</td>
        <td>${row.checks}/3</td>
        <td>${row.model.latency}s</td>
        <td>${row.model.cost.toFixed(2)} EUR</td>
      </tr>`,
    )
    .join("");

  verdict.textContent = rows.every((row) => row.hasOutput)
    ? `${best.model.label}: ${best.total}/9`
    : "Paste outputs to score";
  conclusion.textContent = buildConclusion(task, best, cheapest);
}

function getQualityScore(root: HTMLElement, model: ModelId) {
  return Array.from(
    root.querySelectorAll<HTMLInputElement>(
      `[data-model="${model}"][data-rubric]`,
    ),
  ).reduce((total, input) => total + Number(input.value), 0);
}

function buildConclusion(
  task: EvalTask,
  best: { model: ModelAttempt; total: number; hasOutput?: boolean },
  cheapest: { model: ModelAttempt; total: number; hasOutput?: boolean },
) {
  if (!best.hasOutput || !cheapest.hasOutput) {
    return "Paste both model outputs, then score them against the rubric before drawing a local conclusion.";
  }

  if (best.model.id === cheapest.model.id) {
    return `${best.model.label} is both the highest-scoring and cheapest option on "${task.label}". That supports using it for this narrow task, but only after checking more examples.`;
  }

  return `${best.model.label} scores higher on "${task.label}", while ${cheapest.model.label} is cheaper and faster. A defensible report would say which failure pattern matters more: answer quality, review time, latency, or cost.`;
}

function updateModelEvalStage(
  root: HTMLElement,
  steps: HTMLElement[],
  tabs: HTMLButtonElement[],
  previous: HTMLButtonElement,
  next: HTMLButtonElement,
  currentStep: number,
  focusStep: boolean,
) {
  const finalStep = steps.length - 1;

  root.dataset.modelEvalCurrentStep = String(currentStep);
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

function escapeModelEvalHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
