type ActivationMode = "hydration" | "islands" | "resumability";

type ActivationRegionState = "active" | "deferred" | "reference" | "static";

type ActivationStep = {
  detail: string;
  kind: "execute" | "network" | "ready" | "wait";
  label: string;
};

type ActivationModel = {
  actionJs: string;
  boundary: string;
  caution: string;
  initialJs: string;
  initialSteps: ActivationStep[];
  initialWork: string;
  label: string;
  pressure: string;
  regions: Record<string, ActivationRegionState>;
  runSteps: ActivationStep[];
  state: string;
  summary: string;
  title: string;
};

const activationModels: Record<ActivationMode, ActivationModel> = {
  hydration: {
    actionJs: "0 KB",
    boundary: "all 5 regions",
    caution:
      "The first action is ready immediately, but the browser paid for code and replay across regions the user may never touch.",
    initialJs: "≈54 KB",
    initialSteps: [
      {
        detail: "Useful markup and initial state",
        kind: "network",
        label: "Receive server HTML",
      },
      {
        detail: "Framework and application bundle",
        kind: "network",
        label: "Download ≈54 KB JS",
      },
      {
        detail: "Recover client state across all five regions",
        kind: "execute",
        label: "Replay component tree",
      },
      {
        detail: "Controls can now receive events",
        kind: "ready",
        label: "Attach listeners",
      },
    ],
    initialWork: "Replay 5 regions",
    label: "Hydration",
    pressure: "initial client work",
    regions: {
      chart: "active",
      feed: "active",
      filters: "active",
      form: "active",
      header: "active",
    },
    runSteps: [
      {
        detail: "Listener is already attached",
        kind: "ready",
        label: "Deliver click",
      },
      {
        detail: "Update client state and affected UI",
        kind: "execute",
        label: "Run event handler",
      },
    ],
    state: "Initial props snapshot",
    summary:
      "This baseline places all five regions in one client tree and hydrates them on page load. The browser runs that tree to recover state and listeners. Other hydration designs can leave content server-only and hydrate smaller client regions.",
    title: "Replay all five client regions",
  },
  islands: {
    actionJs: "≈14 KB island",
    boundary: "record-form region",
    caution:
      "Initial work shrinks, but shared state and communication become explicit costs as the number of interactive regions grows.",
    initialJs: "≈5 KB runtime",
    initialSteps: [
      {
        detail: "Static regions and island markers",
        kind: "network",
        label: "Receive server HTML",
      },
      {
        detail: "Discover visible and interaction triggers",
        kind: "execute",
        label: "Load ≈5 KB runtime",
      },
      {
        detail: "Record form remains dormant",
        kind: "wait",
        label: "Wait at island boundary",
      },
    ],
    initialWork: "Register 3 islands",
    label: "Islands",
    pressure: "region boundaries",
    regions: {
      chart: "deferred",
      feed: "static",
      filters: "deferred",
      form: "deferred",
      header: "static",
    },
    runSteps: [
      {
        detail: "Runtime identifies the record-form island",
        kind: "ready",
        label: "Capture first click",
      },
      {
        detail: "Component code for this region",
        kind: "network",
        label: "Fetch ≈14 KB island",
      },
      {
        detail: "Recover only the form region",
        kind: "execute",
        label: "Hydrate island",
      },
      {
        detail: "Continue the requested action",
        kind: "ready",
        label: "Run event handler",
      },
    ],
    state: "Props per island",
    summary:
      "The page declares explicit interactive regions. Static HTML stays inert, while the record form loads and hydrates only when the user asks for it.",
    title: "Wake one explicit region",
  },
  resumability: {
    actionJs: "≈2.4 KB handler",
    boundary: "event handler",
    caution:
      "Replay disappears, but state must be serializable and the compiler or runtime must preserve exact continuation points.",
    initialJs: "≈3.1 KB runtime",
    initialSteps: [
      {
        detail: "Markup, state, and handler references",
        kind: "network",
        label: "Receive serialized HTML",
      },
      {
        detail: "Index continuation references",
        kind: "execute",
        label: "Load ≈3.1 KB runtime",
      },
      {
        detail: "No component tree replay",
        kind: "wait",
        label: "Pause at handler boundary",
      },
    ],
    initialWork: "Index handler refs",
    label: "Resumability",
    pressure: "serialization and tooling",
    regions: {
      chart: "reference",
      feed: "static",
      filters: "reference",
      form: "reference",
      header: "static",
    },
    runSteps: [
      {
        detail: "Runtime reads the serialized listener reference",
        kind: "ready",
        label: "Resolve click target",
      },
      {
        detail: "Only the continuation needed now",
        kind: "network",
        label: "Fetch ≈2.4 KB handler",
      },
      {
        detail: "Continue from serialized state",
        kind: "execute",
        label: "Resume event handler",
      },
    ],
    state: "State + handler refs",
    summary:
      "The server serializes enough information for the browser to continue at an event boundary. The first click loads its handler without replaying the component tree.",
    title: "Continue where the server stopped",
  },
};

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-activation-lens]",
)) {
  initializeActivationLens(root);
}

function initializeActivationLens(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>(
    "[data-activation-lens-form]",
  );
  const runButton = root.querySelector<HTMLButtonElement>(
    "[data-activation-lens-run]",
  );
  const trace = root.querySelector<HTMLOListElement>(
    "[data-activation-lens-trace]",
  );

  if (!form || !runButton || !trace) {
    return;
  }

  let revision = 0;

  const render = () => {
    revision += 1;
    const mode = getActivationMode(root);
    const model = activationModels[mode];
    root.dataset.activationMode = mode;
    root.dataset.activationPhase = "initial";
    runButton.disabled = false;

    setActivationText(root, "[data-activation-lens-mode-badge]", model.label);
    setActivationText(
      root,
      "[data-activation-lens-boundary-badge]",
      model.boundary,
    );
    setActivationText(
      root,
      "[data-activation-lens-phase]",
      "Before interaction",
    );
    setActivationText(
      root,
      ".activation-lens-browser-status",
      getInitialStatus(mode),
    );
    setActivationText(
      root,
      '[data-activation-lens-metric="initial-js"]',
      model.initialJs,
    );
    setActivationText(
      root,
      '[data-activation-lens-metric="initial-work"]',
      model.initialWork,
    );
    setActivationText(
      root,
      '[data-activation-lens-metric="action-js"]',
      model.actionJs,
    );
    setActivationText(
      root,
      '[data-activation-lens-metric="state"]',
      model.state,
    );
    setActivationText(root, "[data-activation-lens-title]", model.title);
    setActivationText(root, "[data-activation-lens-summary]", model.summary);
    setActivationText(root, "[data-activation-lens-pressure]", model.pressure);
    setActivationText(root, "[data-activation-lens-caution]", model.caution);

    renderActivationRegions(root, model);
    renderActivationTrace(trace, model.initialSteps);
  };

  form.addEventListener("change", (event) => {
    if (
      event.target instanceof HTMLInputElement &&
      event.target.matches("[data-activation-lens-mode]")
    ) {
      render();
    }
  });

  runButton.addEventListener("click", async () => {
    const currentRevision = ++revision;
    const mode = getActivationMode(root);
    const model = activationModels[mode];
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 1
      : 260;

    root.dataset.activationPhase = "running";
    runButton.disabled = true;
    setActivationText(
      root,
      "[data-activation-lens-phase]",
      "First interaction",
    );
    setActivationText(
      root,
      ".activation-lens-browser-status",
      "Tracing the first record-event interaction…",
    );
    renderActivationTrace(trace, model.runSteps);

    const steps = Array.from(
      trace.querySelectorAll<HTMLElement>("[data-activation-step]"),
    );

    for (let index = 0; index < steps.length; index += 1) {
      if (currentRevision !== revision) {
        return;
      }
      const step = steps[index];
      if (!step) {
        continue;
      }
      step.classList.add("is-active");
      if (mode !== "hydration" && index === 1) {
        root
          .querySelector<HTMLElement>("[data-activation-target]")
          ?.classList.add("is-loading");
      }
      await waitForActivationStep(delay);
      step.classList.remove("is-active");
      step.classList.add("is-complete");
    }

    if (currentRevision !== revision) {
      return;
    }

    const target = root.querySelector<HTMLElement>("[data-activation-target]");
    target?.classList.remove("is-loading");
    target?.classList.add("is-invoked");
    const targetState = target?.querySelector<HTMLElement>(
      "[data-activation-region-state]",
    );
    if (targetState) {
      targetState.textContent =
        mode === "islands" ? "island active" : "handled";
    }
    root.dataset.activationPhase = "complete";
    setActivationText(root, "[data-activation-lens-phase]", "Action handled");
    setActivationText(
      root,
      ".activation-lens-browser-status",
      getCompleteStatus(mode),
    );
    runButton.disabled = false;
  });

  render();
}

function getActivationMode(root: HTMLElement): ActivationMode {
  const selected = root.querySelector<HTMLInputElement>(
    "[data-activation-lens-mode]:checked",
  )?.value;
  return selected === "islands" || selected === "resumability"
    ? selected
    : "hydration";
}

function renderActivationRegions(root: HTMLElement, model: ActivationModel) {
  for (const region of root.querySelectorAll<HTMLElement>(
    "[data-activation-region]",
  )) {
    const key = region.dataset.activationRegion || "";
    const state = model.regions[key] || "static";
    region.classList.remove(
      "is-active",
      "is-deferred",
      "is-invoked",
      "is-loading",
      "is-reference",
      "is-static",
    );
    region.classList.add(`is-${state}`);
    const label = region.querySelector<HTMLElement>(
      "[data-activation-region-state]",
    );
    if (label) {
      label.textContent = getActivationRegionLabel(state);
    }
  }
}

function getActivationRegionLabel(state: ActivationRegionState) {
  if (state === "active") return "replayed";
  if (state === "deferred") return "island · waiting";
  if (state === "reference") return "handler ref";
  return "static HTML";
}

function renderActivationTrace(
  trace: HTMLOListElement,
  steps: ActivationStep[],
) {
  trace.replaceChildren(
    ...steps.map((step, index) => {
      const item = document.createElement("li");
      item.dataset.activationStep = String(index + 1);
      item.dataset.kind = step.kind;

      const marker = document.createElement("span");
      marker.textContent = String(index + 1).padStart(2, "0");
      const copy = document.createElement("div");
      const label = document.createElement("strong");
      label.textContent = step.label;
      const detail = document.createElement("small");
      detail.textContent = step.detail;
      copy.append(label, detail);
      item.append(marker, copy);
      return item;
    }),
  );
}

function setActivationText(root: HTMLElement, selector: string, value: string) {
  const element = root.querySelector<HTMLElement>(selector);
  if (element) element.textContent = value;
}

function getInitialStatus(mode: ActivationMode) {
  if (mode === "islands") {
    return "Static regions are useful; three declared islands are waiting for their triggers.";
  }
  if (mode === "resumability") {
    return "Serialized handler references are ready; the component tree was not replayed.";
  }
  return "All five regions in this baseline's client tree have replayed and their listeners are attached.";
}

function getCompleteStatus(mode: ActivationMode) {
  if (mode === "islands") {
    return "The record-form island loaded, hydrated, and handled the click.";
  }
  if (mode === "resumability") {
    return "The handler chunk loaded and continued from serialized state without replay.";
  }
  return "The already attached listener handled the click with no additional JavaScript.";
}

function waitForActivationStep(delay: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, delay));
}
