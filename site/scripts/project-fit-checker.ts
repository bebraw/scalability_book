type FieldName =
  | "domain"
  | "actors"
  | "entities"
  | "events"
  | "workflow"
  | "views"
  | "volume"
  | "tenants"
  | "expensiveQuery"
  | "failure"
  | "privacy"
  | "change";

type ProjectFitElements = {
  root: HTMLElement;
  form: HTMLFormElement;
  score: HTMLElement;
  verdict: HTMLElement;
  checks: HTMLElement;
  warnings: HTMLElement;
  output: HTMLTextAreaElement;
  copy: HTMLButtonElement | null;
  next: HTMLButtonElement;
  previous: HTMLButtonElement;
  steps: HTMLElement[];
  tabs: HTMLButtonElement[];
  fields: Record<FieldName, HTMLTextAreaElement | HTMLInputElement>;
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

  const copyButton = elements.copy;

  copyButton?.addEventListener("click", async () => {
    await navigator.clipboard?.writeText(elements.output.value);
    copyButton.textContent = "Copied";
    window.setTimeout(() => {
      copyButton.textContent = "Copy brief";
    }, 1400);
  });

  showStep(0);
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
  const warnings = root.querySelector<HTMLElement>(
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
    !warnings ||
    !output ||
    !previous ||
    !next ||
    steps.length === 0 ||
    tabs.length !== steps.length
  ) {
    return null;
  }

  const fields = Object.fromEntries(
    [
      "domain",
      "actors",
      "entities",
      "events",
      "workflow",
      "views",
      "volume",
      "tenants",
      "expensiveQuery",
      "failure",
      "privacy",
      "change",
    ].map((name) => [
      name,
      form.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        `[name="${name}"]`,
      ),
    ]),
  ) as Record<FieldName, HTMLTextAreaElement | HTMLInputElement | null>;

  if (Object.values(fields).some((field) => !field)) {
    return null;
  }

  return {
    root,
    form,
    score,
    verdict,
    checks,
    warnings,
    output,
    copy: root.querySelector<HTMLButtonElement>("[data-project-fit-copy]"),
    next,
    previous,
    steps,
    tabs,
    fields: fields as Record<FieldName, HTMLTextAreaElement | HTMLInputElement>,
  };
}

function updateProjectFit(
  elements: ProjectFitElements,
  currentStep: number,
  focusStep: boolean,
) {
  const values = getValues(elements.fields);
  const eventCount = countListItems(values.events);
  const entityCount = countListItems(values.entities);
  const actorCount = countListItems(values.actors);
  const viewCount = countListItems(values.views);
  const checks = [
    {
      label: "At least three event types",
      pass: eventCount >= 3,
      hint: "Name concrete events such as run-started or item-purchased.",
    },
    {
      label: "At least one domain entity",
      pass: entityCount >= 1,
      hint: "Events should describe or affect something besides themselves.",
    },
    {
      label: "At least one actor or role",
      pass: actorCount >= 1,
      hint: "Name who creates, views, or depends on the events.",
    },
    {
      label: "A workflow or state transition",
      pass: hasText(values.workflow),
      hint: "The system should have behavior that changes over time.",
    },
    {
      label: "A query, view, or summary",
      pass: viewCount >= 1,
      hint: "You need something you can benchmark and later redesign.",
    },
    {
      label: "A plausible 100x volume story",
      pass: hasText(values.volume),
      hint: "Explain what changes when event count grows sharply.",
    },
    {
      label: "Many groups, tenants, or locations",
      pass: hasText(values.tenants),
      hint: "The domain should scale beyond one local instance.",
    },
    {
      label: "An expensive historical query",
      pass: hasText(values.expensiveQuery),
      hint: "Identify the first query or aggregation likely to hurt.",
    },
    {
      label: "Retries, duplicates, delays, or missing events",
      pass: hasText(values.failure),
      hint: "The later architecture needs a failure pressure to handle.",
    },
    {
      label: "Privacy, retention, or resource concern",
      pass: hasText(values.privacy),
      hint: "Event data accumulates and may describe user behavior.",
    },
    {
      label: "A future change pressure",
      pass: hasText(values.change),
      hint: "Name what would become hard to change later.",
    },
  ];
  const score = checks.filter((check) => check.pass).length;
  const warnings = getWarnings(values, { eventCount, entityCount, viewCount });

  elements.score.textContent = `${score}/${checks.length}`;
  elements.verdict.textContent = getVerdict(score, checks.length, warnings);
  elements.checks.innerHTML = checks.map(renderCheck).join("");
  elements.warnings.innerHTML = warnings.length
    ? warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")
    : "<li>No major scope warnings yet.</li>";
  elements.output.value = buildBrief(values, score, checks.length, warnings);
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
    currentStep === finalStep ? "Select brief" : "Next";
  if (elements.copy) {
    elements.copy.hidden = currentStep !== finalStep;
  }

  if (focusStep) {
    const activeStep = elements.steps[currentStep];

    if (!activeStep) {
      return;
    }

    requestAnimationFrame(() => {
      const focusTarget =
        activeStep.querySelector<HTMLElement>("input, textarea");

      focusTarget?.focus({ preventScroll: true });
    });
  }
}

function isStepComplete(elements: ProjectFitElements, step: number) {
  const values = getValues(elements.fields);

  switch (step) {
    case 0:
      return (
        hasText(values.domain) &&
        countListItems(values.actors) >= 1 &&
        countListItems(values.entities) >= 1
      );
    case 1:
      return (
        countListItems(values.events) >= 3 &&
        hasText(values.workflow) &&
        countListItems(values.views) >= 1
      );
    case 2:
      return (
        hasText(values.volume) &&
        hasText(values.tenants) &&
        hasText(values.expensiveQuery)
      );
    case 3:
      return (
        hasText(values.failure) &&
        hasText(values.privacy) &&
        hasText(values.change)
      );
    case 4:
      return true;
    default:
      return false;
  }
}

function getValues(fields: ProjectFitElements["fields"]) {
  return Object.fromEntries(
    Object.entries(fields).map(([name, field]) => [name, field.value.trim()]),
  ) as Record<FieldName, string>;
}

function renderCheck(check: { label: string; pass: boolean; hint: string }) {
  return `<li class="${check.pass ? "is-pass" : "is-missing"}">
    <span aria-hidden="true">${check.pass ? "✓" : "!"}</span>
    <strong>${escapeHtml(check.label)}</strong>
    <small>${escapeHtml(check.hint)}</small>
  </li>`;
}

function getVerdict(total: number, possible: number, warnings: string[]) {
  if (total >= possible - 1 && warnings.length === 0) {
    return "Strong candidate for Construct, Reconstruct, and Deconstruct.";
  }

  if (total >= Math.ceil(possible * 0.7)) {
    return "Promising, but tighten the missing pressure points before building.";
  }

  return "Too thin or underspecified. Narrow the domain, then add richer events and scaling pressure.";
}

function getWarnings(
  values: Record<FieldName, string>,
  counts: { eventCount: number; entityCount: number; viewCount: number },
) {
  const warnings: string[] = [];
  const allText = Object.values(values).join(" ").toLowerCase();

  if (counts.eventCount < 3) {
    warnings.push(
      "The project may collapse into a CRUD app unless it has more event variety.",
    );
  }

  if (counts.entityCount === 0) {
    warnings.push(
      "The model needs at least one domain object affected by events.",
    );
  }

  if (counts.viewCount === 0) {
    warnings.push(
      "Without a view or query, benchmarking and observability become abstract.",
    );
  }

  if (/\b(editor|drag|canvas|visual builder|polished ui)\b/.test(allText)) {
    warnings.push(
      "Watch for product/UI scope creep. Keep Construct focused on event tracking.",
    );
  }

  if (!hasText(values.failure)) {
    warnings.push(
      "Add a failure story so Reconstruct has something concrete to redesign.",
    );
  }

  if (!hasText(values.tenants)) {
    warnings.push(
      "Add a many-instance story so scaling is not only about one local dataset.",
    );
  }

  return warnings;
}

function buildBrief(
  values: Record<FieldName, string>,
  score: number,
  possible: number,
  warnings: string[],
) {
  return `# Project Brief

## Domain

${orPlaceholder(values.domain)}

## Actors or roles

${asMarkdownList(values.actors)}

## Domain entities

${asMarkdownList(values.entities)}

## Event types

${asMarkdownList(values.events)}

## Workflow or state transition

${orPlaceholder(values.workflow)}

## Views, queries, or summaries

${asMarkdownList(values.views)}

## Scaling pressures to revisit

- 100x event volume: ${orPlaceholder(values.volume)}
- Many tenants/groups/projects: ${orPlaceholder(values.tenants)}
- Expensive query or history view: ${orPlaceholder(values.expensiveQuery)}
- Failure, retries, duplicates, or delays: ${orPlaceholder(values.failure)}
- Privacy, retention, or resource concern: ${orPlaceholder(values.privacy)}
- Future change pressure: ${orPlaceholder(values.change)}

## Fit check

Score: ${score}/${possible}

${warnings.length ? warnings.map((warning) => `- ${warning}`).join("\n") : "- No major scope warnings yet."}
`;
}

function asMarkdownList(value: string) {
  const items = splitList(value);

  if (items.length === 0) {
    return "- TODO";
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function countListItems(value: string) {
  return splitList(value).length;
}

function splitList(value: string) {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasText(value: string) {
  return value.trim().length >= 8;
}

function orPlaceholder(value: string) {
  return value || "TODO";
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
