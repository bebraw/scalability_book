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
    sampleScores: {
      bottleneck: [2, 2, 2],
      benchmark: [2, 2, 2],
      "data-model": [2, 2, 2],
    },
  },
  {
    id: "y",
    label: "Attempt Y",
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
  cards.addEventListener("input", (event) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (target.matches("[data-model-output]")) {
      const card = target.closest<HTMLElement>("[data-model-card]")!;
      card.dataset.origin = "entered";
      clearAttemptEvidence(card);
      for (const check of root.querySelectorAll<HTMLInputElement>(
        "[data-model-eval-check]",
      ))
        check.checked = false;
    }
    const task = tasks[taskSelect.value as EvalTaskId] ?? tasks.bottleneck;
    updateScores(root, task, results, verdict, conclusion);
  });
  cards.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-model-eval-sample], [data-model-eval-worked]",
    );

    if (!button) {
      return;
    }

    const model = (button.dataset.modelEvalSample ??
      button.dataset.modelEvalWorked) as ModelId | undefined;
    const task = tasks[taskSelect.value as EvalTaskId] ?? tasks.bottleneck;
    const modelConfig = models.find((candidate) => candidate.id === model);

    if (!model || !modelConfig) {
      return;
    }

    if (button.hasAttribute("data-model-eval-worked")) {
      for (const [key, value] of modelConfig.sampleScores[task.id].entries()) {
        root.querySelector<HTMLInputElement>(
          `[data-model="${model}"][data-rubric="${key}"]`,
        )!.value = String(value);
      }
    } else fillModelSample(root, task, modelConfig);
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
  const card = root.querySelector<HTMLElement>(
    `[data-model-card="${model.id}"]`,
  )!;
  card.dataset.origin = "sample";
  clearAttemptEvidence(card);
  for (const check of root.querySelectorAll<HTMLInputElement>(
    "[data-model-eval-check]",
  ))
    check.checked = false;
}

function clearAttemptEvidence(card: HTMLElement) {
  for (const input of card.querySelectorAll<HTMLInputElement>(
    "[data-rubric], [data-rubric-evidence], [data-observation]",
  )) {
    input.value = input.hasAttribute("data-rubric") ? "0" : "";
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
        <label class="model-eval-evidence">Supporting excerpt or reason
          <input type="text" aria-label="Evidence for ${escapeModelEvalHtml(criterion.label)} in ${escapeModelEvalHtml(model.label)}" data-rubric-evidence="${key}" />
        </label>
      </div>`;
    })
    .join("");

  return `<article class="model-eval-card" data-model-card="${model.id}" data-origin="entered">
    <header>
      <h4>${escapeModelEvalHtml(model.label)}</h4>
      <span data-attempt-origin>No output recorded</span>
    </header>
    <label class="model-eval-output-field">
      <span>Model output</span>
      <textarea data-model-output="${model.id}" rows="9" placeholder="Paste the output from ${escapeModelEvalHtml(model.label.toLowerCase())} here."></textarea>
    </label>
    <button type="button" class="model-eval-sample" data-model-eval-sample="${model.id}">
      Use sample output
    </button>
    <div class="model-eval-sliders">${sliders}</div>
    <button type="button" class="model-eval-sample" data-model-eval-worked="${model.id}" disabled>Reveal worked scores</button>
    <fieldset class="model-eval-observations">
      <legend>Reported run observations · optional</legend>
      <label>Elapsed seconds<input type="number" min="0" step="any" data-observation="elapsed" aria-label="Elapsed seconds for ${escapeModelEvalHtml(model.label)}" /></label>
      <label>Cost in EUR<input type="number" min="0" step="any" data-observation="cost" aria-label="Cost in EUR for ${escapeModelEvalHtml(model.label)}" /></label>
      <label>Source record<input type="text" data-observation="source" aria-label="Source record for ${escapeModelEvalHtml(model.label)}" placeholder="Run ID, log or notes reference" /></label>
    </fieldset>
  </article>`;
}

function updateScores(
  root: HTMLElement,
  task: EvalTask,
  results: HTMLElement,
  verdict: HTMLElement,
  conclusion: HTMLElement,
) {
  const protocolComplete = Array.from(
    root.querySelectorAll<HTMLInputElement>("[data-model-eval-check]"),
  ).every((check) => check.checked);
  const rows = models.map((model) => {
    const card = root.querySelector<HTMLElement>(
      `[data-model-card="${model.id}"]`,
    )!;
    const sample = card.dataset.origin === "sample";
    const hasOutput = Boolean(
      card
        .querySelector<HTMLTextAreaElement>("[data-model-output]")
        ?.value.trim(),
    );
    card.querySelector<HTMLElement>("[data-attempt-origin]")!.textContent =
      !hasOutput
        ? "No output recorded"
        : sample
          ? "Authored sample · no run observations"
          : "Entered output · observations are self-reported";
    card.querySelector<HTMLButtonElement>(
      "[data-model-eval-worked]",
    )!.disabled = !sample;
    for (const input of card.querySelectorAll<HTMLInputElement>(
      "[data-observation]",
    ))
      input.disabled = sample;
    const source = card
      .querySelector<HTMLInputElement>('[data-observation="source"]')!
      .value.trim();
    const observation = (key: string) => {
      const raw = card.querySelector<HTMLInputElement>(
        `[data-observation="${key}"]`,
      )!.value;
      if (sample || !hasOutput || !raw.trim()) return "Not recorded";
      const number = Number(raw);
      if (!Number.isFinite(number) || number < 0) return "Invalid value";
      return source
        ? `${number}${key === "elapsed" ? " s" : " EUR"}`
        : "Source required";
    };
    const quality = getQualityScore(root, model.id);
    const supported = Array.from(
      card.querySelectorAll<HTMLInputElement>("[data-rubric-evidence]"),
    ).every((input) => input.value.trim());
    return {
      model,
      quality,
      hasOutput,
      sample,
      supported,
      source,
      elapsed: observation("elapsed"),
      cost: observation("cost"),
    };
  });
  for (const output of root.querySelectorAll<HTMLOutputElement>(
    "[data-score-output]",
  )) {
    const [modelId, key] = output.dataset.scoreOutput!.split("-");
    const value = root.querySelector<HTMLInputElement>(
      `[data-model="${modelId}"][data-rubric="${key}"]`,
    )!.value;
    output.value = value;
    output.textContent = value;
  }
  results.innerHTML = rows
    .map(
      (row) =>
        `<tr><td>${escapeModelEvalHtml(row.model.label)}<br/><small>${row.sample ? "Authored sample" : "Entered output"}</small></td><td>${row.quality}/6</td><td>${row.elapsed}</td><td>${row.cost}</td><td>${escapeModelEvalHtml(row.sample ? "No model run" : row.source || "Not recorded")}</td></tr>`,
    )
    .join("");
  const allHaveOutput = rows.every((row) => row.hasOutput);
  const highest = Math.max(...rows.map((row) => row.quality));
  const winners = rows.filter((row) => row.quality === highest);
  const labels = winners.map((row) => row.model.label).join(" / ");
  verdict.textContent = allHaveOutput
    ? `${labels}: ${highest}/6`
    : "Paste outputs to score";
  conclusion.textContent = [
    !allHaveOutput
      ? "Paste both model outputs, then score them against the rubric before drawing a local conclusion."
      : winners.length > 1
        ? `The attempts tie on the manual rubric for "${task.label}". No cost or latency tie-break is inferred.`
        : `${labels} scores higher on the manual rubric for "${task.label}"; this is a judgment about these outputs, not a model ranking.`,
    allHaveOutput && rows.some((row) => !row.supported)
      ? "Add a supporting excerpt or reason for each criterion before defending the scores."
      : "",
    "Missing observations remain unknown. Reported elapsed time and cost need their source records and do not include unrecorded correction effort.",
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
