type EvalTaskId = "bottleneck" | "benchmark" | "data-model";
type ModelId = "x" | "y";

type RubricCriterion = {
  label: string;
  expectation: string;
};

type EvalTask = {
  id: EvalTaskId;
  label: string;
  context: string;
  prompt: string;
  rubric: [RubricCriterion, RubricCriterion, RubricCriterion];
  outputs: Record<ModelId, string>;
};

type ModelAttempt = {
  id: ModelId;
  label: string;
  latency: number;
  cost: number;
  sampleScores: Record<EvalTaskId, [number, number, number]>;
};

const tasks: Record<EvalTaskId, EvalTask> = {
  bottleneck: {
    id: "bottleneck",
    label: "Find one likely scaling bottleneck",
    context:
      "Invented implementation excerpt: Users create work items in workspaces, advance their lifecycle, and inspect the activity feed. Each accepted creation or transition records one event. GET /events?workspace=<id> reads SELECT * FROM activity_events WHERE workspace_id = ? ORDER BY occurred_at DESC, id DESC LIMIT 50. The migration declares separate indexes on workspace_id and event_type, with no composite index matching the filter and ordering.",
    prompt:
      "You are examining a Work Activity Tracker implementation.\nUse only the context below. If something is missing, say what you cannot know.\n\nTask: Find one likely scaling bottleneck.\n\nRequired output:\n- Bottleneck:\n- Evidence from the context:\n- Why it matters under higher load:\n- One measurement that would confirm or reject it:",
    rubric: [
      {
        label: "Grounding",
        expectation:
          "Clearly uses the supplied context as evidence without inventing facts.",
      },
      {
        label: "Specificity",
        expectation:
          "Names the concrete query or read path and explains why its work may grow.",
      },
      {
        label: "Measurement",
        expectation:
          "Names a measurement that could confirm or reject the proposed bottleneck.",
      },
    ],
    outputs: {
      x: "Bottleneck: the workspace activity-feed read path for GET /events?workspace=<id>.\nEvidence from the context: the query filters by workspace_id and orders by occurred_at and id; no matching composite index is declared.\nWhy it matters under higher load: growing event history may increase the scan or sort work needed to return 50 rows. The actual query plan is not supplied.\nOne measurement that would confirm or reject it: seed increasing history per workspace, inspect the query plan, and measure feed p95 under the same concurrent read/write workload.",
      y: "Bottleneck: the database could become slow when there are many events.\nEvidence from the context: the app stores activity events and users view a feed.\nWhy it matters under higher load: more events usually means slower pages.\nOne measurement that would confirm or reject it: run a load test and see if it is slow.",
    },
  },
  benchmark: {
    id: "benchmark",
    label: "Produce a benchmark plan",
    context:
      "Invented pressure scenario: A Work Activity Tracker receives 20,000 valid work-item creations and lifecycle transitions across eight workspaces during 30 minutes. Readers inspect workspace activity feeds and filter by event type while writes continue. Each accepted action must record exactly one event with its workspace, work item, actor, and occurrence time. This is a teaching workload, not the required course benchmark.",
    prompt:
      "You are examining a Work Activity Tracker implementation.\nUse only the context below.\n\nTask: Propose one benchmark plan.\n\nRequired output:\n- Workload:\n- Load level:\n- Metrics:\n- What the result does not prove:",
    rubric: [
      {
        label: "Workload",
        expectation:
          "Covers valid work-item actions and concurrent feed reads, with the matching-event check.",
      },
      {
        label: "Load level",
        expectation:
          "States an executable load schedule consistent with the supplied action count and duration.",
      },
      {
        label: "Metrics and limits",
        expectation:
          "Includes latency, accepted throughput, errors, and a limit on what the result proves.",
      },
    ],
    outputs: {
      x: "Workload: create and advance work items across eight workspaces while readers inspect feeds and filter by event type. Use eligible items for each transition and check that every accepted action has one matching event.\nLoad level: submit 20,000 actions over 30 minutes, cycling create, start, and complete for separate items; schedule 100 feed reads per minute, divided across workspace and event-type filters.\nMetrics: action and feed p95 latency, accepted actions per second, errors, missing or duplicate events, and database CPU.\nWhat the result does not prove: synthetic data, scheduling, network, and hardware do not establish production capacity or every failure mode.",
      y: "Workload: test work-item updates and feed viewing.\nLoad level: use lots of users.\nMetrics: speed and errors.\nWhat the result does not prove: it may be different in production.",
    },
  },
  "data-model": {
    id: "data-model",
    label: "Explain the work-item and activity model",
    context:
      "Invented schema excerpt: Workspace(id, name), WorkItem(id, workspace_id, title, state), ActivityEvent(id, workspace_id, work_item_id, event_type, actor, occurred_at). README: items move from open to in_progress to done. Creation and each successful transition record one matching event; rejected transitions change neither state nor successful-event history. Every event identifies its workspace, work item, actor, and occurrence time. Transaction boundaries and database constraints are not shown.",
    prompt:
      "You are examining a Work Activity Tracker implementation.\nUse only the context below.\n\nTask: Explain the work-item and activity model.\n\nRequired output:\n- Main entities:\n- Relationships and lifecycle rules:\n- One unclear enforcement assumption:",
    rubric: [
      {
        label: "Entities",
        expectation:
          "Identifies Workspace, WorkItem, and ActivityEvent and their distinct roles.",
      },
      {
        label: "Relationships and lifecycle",
        expectation:
          "Connects items and events to their workspace and explains accepted versus rejected lifecycle actions.",
      },
      {
        label: "Uncertainty",
        expectation:
          "Names an unresolved enforcement question without inventing a transaction or database guarantee.",
      },
    ],
    outputs: {
      x: "Main entities: Workspace groups work; WorkItem stores a title and current lifecycle state; ActivityEvent records a past action with its actor and occurrence time.\nRelationships and lifecycle rules: each item belongs to a workspace, and each event refers to that item and the same workspace. Creating an item or making an allowed forward transition records one matching event. A rejected transition must change neither item state nor successful-event history.\nOne unclear enforcement assumption: the excerpt does not show whether state changes and event inserts commit atomically if a write fails.",
      y: "Main entities: Workspace groups work, WorkItem stores a task, and ActivityEvent stores its history.\nRelationships and lifecycle rules: users update items in workspaces and events record those updates.\nOne unclear enforcement assumption: the database may need more tables later.",
    },
  },
};

const models: ModelAttempt[] = [
  {
    id: "x",
    label: "Attempt X",
    latency: 18,
    cost: 0.42,
    sampleScores: {
      bottleneck: [2, 2, 2],
      benchmark: [2, 2, 2],
      "data-model": [2, 2, 2],
    },
  },
  {
    id: "y",
    label: "Attempt Y",
    latency: 6,
    cost: 0.04,
    sampleScores: {
      bottleneck: [1, 1, 1],
      benchmark: [1, 0, 1],
      "data-model": [2, 1, 0],
    },
  },
];

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

    prompt.value = `${task.prompt}\n\nInput context:\n${task.context}`;
    context.textContent = task.context;
    rubric.innerHTML = task.rubric
      .map(
        (criterion) => `<li>${escapeModelEvalHtml(criterion.expectation)}</li>`,
      )
      .join("");
    cards.innerHTML = models
      .map((model) => renderModelCard(model, task))
      .join("");
    for (const check of root.querySelectorAll<HTMLInputElement>(
      "[data-model-eval-check]",
    )) {
      check.checked = false;
    }
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

  for (const [key, value] of model.sampleScores[task.id].entries()) {
    const input = root.querySelector<HTMLInputElement>(
      `[data-model="${model.id}"][data-rubric="${key}"]`,
    );

    if (input) {
      input.value = String(value);
    }
  }
}

function renderModelCard(model: ModelAttempt, task: EvalTask) {
  const sliders = task.rubric
    .map((criterion, key) => {
      const helpId = `model-eval-help-${model.id}-${key}`;

      return `<div class="model-eval-slider">
        <span class="model-eval-slider-label">
          <span>${escapeModelEvalHtml(criterion.label)}</span>
          <button
            type="button"
            class="model-eval-help"
            aria-label="Help for ${escapeModelEvalHtml(criterion.label)}"
            aria-describedby="${helpId}"
          >?</button>
          <span id="${helpId}" role="tooltip">0 = missing or incorrect. 1 = partly meets the criterion. 2 = ${escapeModelEvalHtml(criterion.expectation)}</span>
        </span>
        <input aria-label="${escapeModelEvalHtml(criterion.label)} score for ${escapeModelEvalHtml(model.label)}" type="range" min="0" max="2" step="1" value="0" data-model="${model.id}" data-rubric="${key}" />
        <output data-score-output="${model.id}-${key}">0</output>
      </div>`;
    })
    .join("");

  return `<article class="model-eval-card" data-model-card="${model.id}">
    <header>
      <h4>${escapeModelEvalHtml(model.label)}</h4>
      <span>Illustrative: ${model.latency}s / ${model.cost.toFixed(2)} EUR</span>
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
  const protocolComplete = checks.every((check) => check.checked);
  const rows = models.map((model) => {
    const quality = getQualityScore(root, model.id);
    const output = root.querySelector<HTMLTextAreaElement>(
      `[data-model-output="${model.id}"]`,
    );

    return {
      model,
      quality,
      hasOutput: Boolean(output?.value.trim()),
    };
  });
  const best = [...rows].sort(
    (a, b) => b.quality - a.quality || a.model.cost - b.model.cost,
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
        <td>${row.model.latency}s</td>
        <td>${row.model.cost.toFixed(2)} EUR</td>
      </tr>`,
    )
    .join("");

  const allHaveOutput = rows.every((row) => row.hasOutput);
  verdict.textContent = allHaveOutput
    ? `${best.model.label}: ${best.quality}/6`
    : "Paste outputs to score";
  conclusion.textContent = [
    allHaveOutput
      ? buildConclusion(task, best, cheapest)
      : "Paste both model outputs, then score them against the rubric before drawing a local conclusion.",
    protocolComplete
      ? ""
      : "Complete the comparison protocol before interpreting these scores.",
  ]
    .filter(Boolean)
    .join(" ");
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
  best: { model: ModelAttempt; quality: number; hasOutput?: boolean },
  cheapest: { model: ModelAttempt; quality: number; hasOutput?: boolean },
) {
  if (!best.hasOutput || !cheapest.hasOutput) {
    return "Paste both model outputs, then score them against the rubric before drawing a local conclusion.";
  }

  if (best.model.id === cheapest.model.id) {
    return `Under the illustrative cost assumptions, ${best.model.label} is both the highest-scoring and cheapest option on "${task.label}". Measure actual cost and test more examples before choosing a model for this task.`;
  }

  return `${best.model.label} scores higher on "${task.label}", while ${cheapest.model.label} has lower illustrative cost and latency. Replace those assumptions with measurements from your runs. A defensible report would say which failure pattern matters more: answer quality, review time, latency, or cost.`;
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
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
