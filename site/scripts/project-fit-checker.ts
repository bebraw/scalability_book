type FieldName =
  | "workspaceMeaning"
  | "itemMeaning"
  | "experience"
  | "runtime"
  | "rendering"
  | "storage"
  | "curiosity"
  | "architecture"
  | "deployment"
  | "boundary"
  | "friction"
  | "question"
  | "evidence"
  | "auditPlan"
  | "stretch";

type ProjectFitField =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

type ProjectFitElements = {
  root: HTMLElement;
  form: HTMLFormElement;
  score: HTMLElement;
  verdict: HTMLElement;
  meter: HTMLElement[];
  checks: HTMLElement;
  questions: HTMLElement;
  output: HTMLTextAreaElement;
  copy: HTMLButtonElement | null;
  next: HTMLButtonElement;
  previous: HTMLButtonElement;
  steps: HTMLElement[];
  tabs: HTMLButtonElement[];
  fields: Record<FieldName, ProjectFitField>;
};

type DirectionValues = Record<FieldName, string>;

const fieldNames: FieldName[] = [
  "workspaceMeaning",
  "itemMeaning",
  "experience",
  "runtime",
  "rendering",
  "storage",
  "curiosity",
  "architecture",
  "deployment",
  "boundary",
  "friction",
  "question",
  "evidence",
  "auditPlan",
  "stretch",
];

const interpretationPresets: Record<
  string,
  Partial<Record<FieldName, string>>
> = {
  operations: {
    workspaceMeaning: "An operations room for one service or team",
    itemMeaning: "A case that moves from reported to active to resolved",
    experience:
      "An operator should see what changed, what failed, and what needs attention without opening every item.",
  },
  studio: {
    workspaceMeaning: "A studio for one creative production",
    itemMeaning: "A scene or asset moving from idea to active work to approved",
    experience:
      "A producer should understand progress and recent decisions without interrupting the people doing the work.",
  },
  field: {
    workspaceMeaning: "A field site or research campaign",
    itemMeaning:
      "An observation or sample moving from planned to collected to processed",
    experience:
      "A researcher should record activity quickly and determine what happened later, even when the environment is imperfect.",
  },
  agents: {
    workspaceMeaning: "One agent fleet run",
    itemMeaning:
      "A delegated agent task moving from queued to active to complete",
    experience:
      "A reviewer should spot stalled work, retries, handoffs, and human intervention from the event history.",
  },
};

const stackPresets: Record<string, Partial<Record<FieldName, string>>> = {
  next: {
    runtime: "TypeScript with Next.js",
    rendering: "Rich browser client backed by an API",
    storage: "Postgres",
  },
  elixir: {
    runtime: "Elixir with Phoenix and LiveView",
    rendering: "Live server-driven interface",
    storage: "Postgres through Ecto",
  },
  python: {
    runtime: "Python with FastAPI, templates, and HTMX",
    rendering: "Server-rendered pages and forms",
    storage: "SQLite for local work, with a documented migration path",
  },
  minimal: {
    runtime: "A small web runtime with few dependencies",
    rendering: "Server-rendered pages and forms",
    storage: "An embedded persistent database",
  },
};

const tools = document.querySelectorAll<HTMLElement>("[data-project-fit]");

for (const tool of tools) {
  const elements = getElements(tool);

  if (!elements) {
    continue;
  }

  let currentStep = 0;
  const update = () => updateProjectFit(elements, currentStep, false);
  const showStep = (step: number) => {
    currentStep = Math.max(0, Math.min(step, elements.steps.length - 1));
    updateProjectFit(elements, currentStep, true);
  };

  elements.form.addEventListener("input", update);
  elements.form.addEventListener("change", update);
  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (currentStep < elements.steps.length - 1) {
      showStep(currentStep + 1);
      return;
    }

    elements.output.select();
  });
  elements.previous.addEventListener("click", () => showStep(currentStep - 1));
  elements.tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => showStep(index));
  });
  initializeHelpTooltips(elements.root);
  initializePresetButtons(
    elements,
    "[data-project-fit-preset]",
    "projectFitPreset",
    interpretationPresets,
    update,
  );
  initializePresetButtons(
    elements,
    "[data-project-fit-stack]",
    "projectFitStack",
    stackPresets,
    update,
  );

  const copyButton = elements.copy;

  copyButton?.addEventListener("click", async () => {
    try {
      await navigator.clipboard?.writeText(elements.output.value);
      copyButton.textContent = "Copied";
    } catch {
      elements.output.select();
      copyButton.textContent = "Selected";
    }

    window.setTimeout(() => {
      copyButton.textContent = "Copy direction";
    }, 1400);
  });

  showStep(0);
}

function initializePresetButtons(
  elements: ProjectFitElements,
  selector: string,
  datasetKey: "projectFitPreset" | "projectFitStack",
  presets: Record<string, Partial<Record<FieldName, string>>>,
  update: () => void,
) {
  for (const button of elements.root.querySelectorAll<HTMLButtonElement>(
    selector,
  )) {
    button.addEventListener("click", () => {
      const key = button.dataset[datasetKey];
      const preset = key ? presets[key] : null;

      if (!preset) {
        return;
      }

      for (const [name, value] of Object.entries(preset)) {
        const field = elements.fields[name as FieldName];

        if (field && value) {
          field.value = value;
        }
      }

      button
        .closest(".project-fit-presets")
        ?.querySelectorAll("button")
        .forEach((candidate) => {
          candidate.classList.toggle("is-selected", candidate === button);
        });
      update();
    });
  }
}

function initializeHelpTooltips(root: HTMLElement) {
  const buttons = Array.from(
    root.querySelectorAll<HTMLButtonElement>(".project-fit-help"),
  );
  const closeAll = () => {
    for (const button of buttons) {
      const tooltip = getTooltip(button);

      button.setAttribute("aria-expanded", "false");
      tooltip?.classList.remove("is-open");
    }
  };
  const repositionOpen = () => {
    for (const button of buttons) {
      const tooltip = getTooltip(button);

      if (tooltip?.classList.contains("is-open")) {
        positionTooltip(root, button, tooltip);
      }
    }
  };

  for (const button of buttons) {
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("pointerenter", () => showTooltip(root, button));
    button.addEventListener("focus", () => showTooltip(root, button));
    button.addEventListener("pointerleave", () => hideTooltip(button));
    button.addEventListener("blur", () => hideTooltip(button));
    button.addEventListener("click", (event) => {
      event.preventDefault();
      showTooltip(root, button);
    });
  }

  window.addEventListener("resize", repositionOpen);
  window.addEventListener("scroll", repositionOpen, true);
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAll();
    }
  });
}

function showTooltip(root: HTMLElement, button: HTMLButtonElement) {
  const tooltip = getTooltip(button);

  if (!tooltip) {
    return;
  }

  button.setAttribute("aria-expanded", "true");
  tooltip.classList.add("is-open");
  positionTooltip(root, button, tooltip);
}

function hideTooltip(button: HTMLButtonElement) {
  const tooltip = getTooltip(button);

  button.setAttribute("aria-expanded", "false");
  tooltip?.classList.remove("is-open");
}

function hideTooltips(root: HTMLElement) {
  for (const button of root.querySelectorAll<HTMLButtonElement>(
    ".project-fit-help",
  )) {
    hideTooltip(button);
  }
}

function getTooltip(button: HTMLButtonElement) {
  const tooltipId = button.getAttribute("aria-describedby");

  if (!tooltipId) {
    return null;
  }

  return document.getElementById(tooltipId);
}

function positionTooltip(
  root: HTMLElement,
  button: HTMLButtonElement,
  tooltip: HTMLElement,
) {
  const margin = 12;
  const gap = 10;
  const maxWidth = 288;
  const rootRect = root.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  const boundaryLeft = Math.max(margin, rootRect.left + margin);
  const boundaryRight = Math.min(
    window.innerWidth - margin,
    rootRect.right - margin,
  );
  const width = Math.max(
    Math.min(maxWidth, boundaryRight - boundaryLeft),
    Math.min(220, window.innerWidth - margin * 2),
  );
  const buttonCenter = buttonRect.left + buttonRect.width / 2;
  const left = clamp(
    buttonCenter - 32,
    boundaryLeft,
    Math.max(boundaryLeft, boundaryRight - width),
  );

  tooltip.style.inlineSize = `${width}px`;
  tooltip.style.left = `${left}px`;
  tooltip.style.top = "0";
  tooltip.style.setProperty(
    "--project-fit-tooltip-arrow-x",
    `${clamp(buttonCenter - left, 18, width - 18)}px`,
  );

  const tooltipHeight = tooltip.getBoundingClientRect().height;
  const fitsBelow =
    buttonRect.bottom + gap + tooltipHeight <= window.innerHeight - margin;
  const top = fitsBelow
    ? buttonRect.bottom + gap
    : Math.max(margin, buttonRect.top - gap - tooltipHeight);

  tooltip.dataset.placement = fitsBelow ? "bottom" : "top";
  tooltip.style.top = `${top}px`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getElements(root: HTMLElement): ProjectFitElements | null {
  const form = root.querySelector<HTMLFormElement>("[data-project-fit-form]");
  const score = root.querySelector<HTMLElement>("[data-project-fit-score]");
  const verdict = root.querySelector<HTMLElement>("[data-project-fit-verdict]");
  const checks = root.querySelector<HTMLElement>("[data-project-fit-checks]");
  const questions = root.querySelector<HTMLElement>(
    "[data-project-fit-warnings]",
  );
  const output = root.querySelector<HTMLTextAreaElement>(
    "[data-project-fit-output]",
  );
  const previous = root.querySelector<HTMLButtonElement>(
    "[data-project-fit-prev]",
  );
  const next = root.querySelector<HTMLButtonElement>("[data-project-fit-next]");
  const steps = Array.from(
    root.querySelectorAll<HTMLElement>("[data-project-fit-step]"),
  );
  const tabs = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-project-fit-tab]"),
  );

  if (
    !form ||
    !score ||
    !verdict ||
    !checks ||
    !questions ||
    !output ||
    !previous ||
    !next ||
    steps.length === 0 ||
    tabs.length !== steps.length
  ) {
    return null;
  }

  const fields = Object.fromEntries(
    fieldNames.map((name) => [
      name,
      form.querySelector<ProjectFitField>(`[name="${name}"]`),
    ]),
  ) as Record<FieldName, ProjectFitField | null>;

  if (Object.values(fields).some((field) => !field)) {
    return null;
  }

  return {
    root,
    form,
    score,
    verdict,
    meter: Array.from(
      root.querySelectorAll<HTMLElement>(".project-fit-meter i"),
    ),
    checks,
    questions,
    output,
    copy: root.querySelector<HTMLButtonElement>("[data-project-fit-copy]"),
    next,
    previous,
    steps,
    tabs,
    fields: fields as Record<FieldName, ProjectFitField>,
  };
}

function updateProjectFit(
  elements: ProjectFitElements,
  currentStep: number,
  focusStep: boolean,
) {
  const values = getValues(elements.fields);
  const anchors = getAnchors(values);
  const completeCount = anchors.filter((anchor) => anchor.complete).length;
  const questions = getQuestions(values);

  elements.score.textContent = `${completeCount}/${anchors.length} choices recorded`;
  elements.verdict.textContent = getVerdict(completeCount);
  elements.meter.forEach((segment, index) => {
    segment.classList.toggle("is-active", index < completeCount);
  });
  elements.checks.innerHTML = anchors.map(renderAnchor).join("");
  elements.questions.innerHTML = questions
    .map((question) => `<li>${escapeHtml(question)}</li>`)
    .join("");
  elements.output.value = buildDirection(values, questions);
  updateStage(elements, currentStep, focusStep);
}

function updateStage(
  elements: ProjectFitElements,
  currentStep: number,
  focusStep: boolean,
) {
  const finalStep = elements.steps.length - 1;

  hideTooltips(elements.root);
  elements.root.dataset.projectFitCurrentStep = String(currentStep);
  elements.steps.forEach((step, index) => {
    const active = index === currentStep;

    step.hidden = !active;
    step.classList.toggle("is-active", active);
    step.setAttribute("aria-hidden", String(!active));
  });
  elements.tabs.forEach((tab, index) => {
    const active = index === currentStep;

    if (active) {
      tab.setAttribute("aria-current", "step");
    } else {
      tab.removeAttribute("aria-current");
    }
    tab.classList.toggle("is-active", active);
    tab.classList.toggle("is-complete", isStepComplete(elements, index));
  });
  elements.previous.disabled = currentStep === 0;
  elements.next.textContent =
    currentStep === finalStep ? "Select direction" : "Next";
  if (elements.copy) {
    elements.copy.hidden = currentStep !== finalStep;
  }

  if (focusStep) {
    const activeStep = elements.steps[currentStep];

    requestAnimationFrame(() => {
      activeStep
        ?.querySelector<HTMLElement>("input, textarea, select")
        ?.focus({ preventScroll: true });
    });
  }
}

function isStepComplete(elements: ProjectFitElements, step: number) {
  const values = getValues(elements.fields);
  const anchors = getAnchors(values);

  if (step >= 0 && step < anchors.length) {
    return anchors[step]?.complete ?? false;
  }

  return step === elements.steps.length - 1;
}

function getValues(fields: ProjectFitElements["fields"]) {
  return Object.fromEntries(
    Object.entries(fields).map(([name, field]) => [name, field.value.trim()]),
  ) as DirectionValues;
}

function getAnchors(values: DirectionValues) {
  return [
    {
      label: "Interpretation",
      complete:
        hasText(values.workspaceMeaning) &&
        hasText(values.itemMeaning) &&
        hasText(values.experience),
      detail: "Meaning, user, and experience",
    },
    {
      label: "Technical material",
      complete:
        hasText(values.runtime) &&
        hasText(values.storage) &&
        hasText(values.curiosity),
      detail: "Stack, persistence, and reason",
    },
    {
      label: "System shape",
      complete:
        hasText(values.architecture) &&
        hasText(values.deployment) &&
        hasText(values.boundary),
      detail: "Architecture, run path, and boundary",
    },
    {
      label: "Learning experiment",
      complete:
        hasText(values.question) &&
        hasText(values.evidence) &&
        hasText(values.auditPlan),
      detail: "Question, evidence, and legibility",
    },
  ];
}

function renderAnchor(anchor: {
  label: string;
  complete: boolean;
  detail: string;
}) {
  return `<li class="${anchor.complete ? "is-pass" : "is-missing"}">
    <span aria-hidden="true">${anchor.complete ? "✓" : "·"}</span>
    <strong>${escapeHtml(anchor.label)}</strong>
    <small>${escapeHtml(
      anchor.complete
        ? `${anchor.detail} recorded`
        : `${anchor.detail} still open`,
    )}</small>
  </li>`;
}

function getVerdict(completeCount: number) {
  switch (completeCount) {
    case 4:
      return "A coherent direction is ready for discussion—not locked in.";
    case 3:
      return "The implementation has a shape. Resolve one more anchor.";
    case 2:
      return "A direction is emerging. Connect the choices to evidence.";
    case 1:
      return "One anchor is set. Let it inform the next decision.";
    default:
      return "Begin by choosing the app’s purpose.";
  }
}

function getQuestions(values: DirectionValues) {
  const questions: string[] = [];

  if (!hasText(values.workspaceMeaning) || !hasText(values.itemMeaning)) {
    questions.push(
      "What vocabulary will make the shared workspace and work-item model feel concrete in your version?",
    );
  }
  if (!hasText(values.experience)) {
    questions.push(
      "Which user and moment should the interface make unusually clear or easy?",
    );
  }
  if (!hasText(values.runtime) || !hasText(values.storage)) {
    questions.push(
      "Which runtime and persistence choice gives the group a useful constraint or learning opportunity?",
    );
  }
  if (!hasText(values.curiosity)) {
    questions.push(
      "Why is this stack interesting for the group beyond familiarity or novelty?",
    );
  }
  if (!hasText(values.architecture) || !hasText(values.boundary)) {
    questions.push(
      "Where should state transitions, event creation, and derived views meet—or remain separate?",
    );
  }
  if (!hasText(values.deployment)) {
    questions.push(
      "What is the one supported path another group will use to run this stack?",
    );
  }
  if (!hasText(values.question) || !hasText(values.evidence)) {
    questions.push(
      "What can this implementation teach you, and what evidence could change your mind?",
    );
  }
  if (!hasText(values.auditPlan)) {
    questions.push(
      "What seed data, pinned versions, and validation command will make an unfamiliar stack inspectable?",
    );
  }
  if (hasText(values.stretch)) {
    questions.push(
      "What condition must the common core satisfy before the optional stretch begins?",
    );
  }
  if (values.architecture.includes("event-oriented")) {
    questions.push(
      "What is the simplest read model that keeps the event-oriented experiment understandable?",
    );
  }
  if (questions.length === 0) {
    questions.push(
      "Which choice would you reconsider first if the local model or cross-team audit struggles with this direction?",
    );
  }

  return questions;
}

function buildDirection(values: DirectionValues, questions: string[]) {
  return `# Implementation Direction

## Common contract

We will implement the shared Work Activity Tracker behavior and acceptance scenarios. The choices below describe our interpretation, not changes to the common requirements.

## Interpretation

- Workspace means: ${orPlaceholder(values.workspaceMeaning)}
- Work item means: ${orPlaceholder(values.itemMeaning)}
- Intended user experience: ${orPlaceholder(values.experience)}

## Technical material

- Language and framework: ${orPlaceholder(values.runtime)}
- Interaction approach: ${orPlaceholder(values.rendering)}
- Persistence: ${orPlaceholder(values.storage)}
- Reason for the stack: ${orPlaceholder(values.curiosity)}

## System shape

- Starting architecture: ${orPlaceholder(values.architecture)}
- Supported run environment: ${orPlaceholder(values.deployment)}
- Boundary to keep visible: ${orPlaceholder(values.boundary)}
- Expected first friction: ${orPlaceholder(values.friction)}

## Learning experiment

- Question: ${orPlaceholder(values.question)}
- Evidence: ${orPlaceholder(values.evidence)}
- Cross-team legibility plan: ${orPlaceholder(values.auditPlan)}
- Optional stretch after the core: ${orPlaceholder(values.stretch)}

## Questions to discuss

${questions.map((question) => `- ${question}`).join("\n")}
`;
}

function hasText(value: string) {
  return value.trim().length >= 5;
}

function orPlaceholder(value: string) {
  return value || "Open decision";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}
