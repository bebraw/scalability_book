type DeliveryMode = "ssr" | "isr" | "csr";
type InteractionMode = "mpa" | "hda" | "spa";

type ArchitectureCombination = {
  summary: string;
  document: string;
  transition: string;
  freshness: string;
  client: string;
  caution: string;
};

type ArchitectureParticipantId = "browser" | "edge" | "server" | "database";

type ArchitectureSequenceMessage = {
  detail: string;
  from: ArchitectureParticipantId;
  kind: "background" | "local" | "request" | "response" | "write";
  label: string;
  row: number;
  to: ArchitectureParticipantId;
};

type ArchitectureInteractionEffect = {
  artifact: string;
  coldExtraKb: number;
  completed: string;
  requests: string;
  scope: string;
  state: string;
  transfer: string;
  transferDetail: string;
  transferKb: number;
};

const architectureTransferScaleKb = 50;

const architectureCombinations: Record<
  `${DeliveryMode}-${InteractionMode}`,
  ArchitectureCombination
> = {
  "ssr-mpa": {
    summary:
      "The server renders a complete document for the visit and another complete document after the form submission.",
    document: "Server renders current data per GET",
    transition: "POST → redirect or complete HTML",
    freshness: "Fresh at render time; repeated render work",
    client: "Submit forms and replace the document",
    caution:
      "Simple ownership, but every navigation pays the network and full-document cost.",
  },
  "ssr-hda": {
    summary:
      "The first visit is server-rendered. Later controls ask the server for the HTML fragment that represents the next valid state.",
    document: "Server renders current data per GET",
    transition: "POST → targeted HTML fragment",
    freshness: "Fresh at render time; repeated render work",
    client: "Interpret controls and swap the named target",
    caution:
      "The server keeps transition knowledge, while a small client runtime enables partial updates.",
  },
  "isr-mpa": {
    summary:
      "Visits receive a cached complete document. After the freshness window, the platform regenerates it; form submissions still navigate as documents.",
    document: "Edge serves pre-rendered, cached HTML",
    transition: "POST → redirect to a complete document",
    freshness: "May be stale until regeneration or invalidation",
    client: "Submit forms and replace the document",
    caution:
      "Writes need an invalidation rule, or the redirected page can temporarily show the old activity list.",
  },
  "isr-hda": {
    summary:
      "The initial document can come from an incrementally regenerated cache, while mutations return fresh server-owned HTML fragments.",
    document: "Edge serves pre-rendered, cached HTML",
    transition: "POST → targeted HTML fragment",
    freshness: "Cached document and live fragment can differ",
    client: "Interpret controls and swap the named target",
    caution:
      "This hybrid is valid, but cache invalidation must reconcile the document with later fragment updates.",
  },
  "csr-mpa": {
    summary:
      "A static shell and JavaScript boot in the browser, which fetches JSON and renders the view. A later document navigation repeats that boot sequence.",
    document: "Shell + JavaScript, then JSON data",
    transition: "POST → redirect → boot and render again",
    freshness: "Data can be fresh while the deployed client is stale",
    client: "Fetch data, render views, and manage loading state",
    caution:
      "CSR commonly powers SPAs, but CSR alone does not create client-side routing or persistent SPA state.",
  },
  "csr-hda": {
    summary:
      "The browser renders the initial view from JSON, while later mutations return server-rendered HTML fragments for targeted updates.",
    document: "Shell + JavaScript, then JSON data",
    transition: "POST → targeted HTML fragment",
    freshness: "Client data and server fragments can diverge",
    client: "Render the initial view, then interpret fragment controls",
    caution:
      "This hybrid maintains both JSON-to-UI and HTML-fragment representations; use it only when that split is deliberate.",
  },
  "ssr-spa": {
    summary:
      "The server renders the initial document, then JavaScript initializes client state. Later actions exchange JSON and render locally without document navigation.",
    document: "Server HTML, then client initialization",
    transition: "POST → JSON delta → client render",
    freshness: "Server data and long-lived client state must stay synchronized",
    client: "Own application state, routing, and later rendering",
    caution:
      "The first view is server-rendered, but repeated actions still depend on the downloaded client application and its state model.",
  },
  "isr-spa": {
    summary:
      "A cached document initializes the client application. Once running, later actions exchange JSON and update client state locally.",
    document: "Cached HTML, then client initialization",
    transition: "POST → JSON delta → client render",
    freshness:
      "Cached HTML and long-lived client state can begin at different ages",
    client: "Own application state, routing, and later rendering",
    caution:
      "Initialization combines cache freshness, JavaScript boot, and client/server state synchronization.",
  },
  "csr-spa": {
    summary:
      "The browser boots the application from a shell and JSON. Once initialized, later actions exchange JSON and render from client state.",
    document: "Shell + JavaScript, then JSON data",
    transition: "POST → JSON delta → client render",
    freshness: "Long-lived client state must reconcile every server response",
    client: "Own application state, routing, and all view rendering",
    caution:
      "Warm actions can be compact, but the client carries the rendering, state, compatibility, and recovery machinery.",
  },
};

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-architecture-lens]",
)) {
  initializeArchitectureLens(root);
}

function initializeArchitectureLens(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>(
    "[data-architecture-lens-form]",
  );
  const runButton = root.querySelector<HTMLButtonElement>(
    "[data-architecture-lens-run]",
  );
  const trace = root.querySelector<HTMLElement>(
    "[data-architecture-lens-trace]",
  );
  const browser = root.querySelector<HTMLElement>(
    "[data-architecture-lens-browser]",
  );
  const status = root.querySelector<HTMLElement>(
    ".architecture-lens-browser-status",
  );
  const events = root.querySelector<HTMLElement>(
    "[data-architecture-lens-events]",
  );
  const draft = root.querySelector<HTMLInputElement>(
    "[data-architecture-lens-draft]",
  );
  const sessionActions = root.querySelector<HTMLInputElement>(
    "[data-architecture-lens-session-actions]",
  );

  if (
    !form ||
    !runButton ||
    !trace ||
    !browser ||
    !status ||
    !events ||
    !draft ||
    !sessionActions
  ) {
    return;
  }

  let runRevision = 0;

  const renderSession = () => {
    const delivery = getSelectedMode<DeliveryMode>(
      root,
      "[data-architecture-lens-delivery]",
      "ssr",
    );
    const interaction = getSelectedMode<InteractionMode>(
      root,
      "[data-architecture-lens-interaction]",
      "mpa",
    );
    const effect = getArchitectureInteractionEffect(delivery, interaction);
    const actions = Number(sessionActions.value);
    const requests = Number(effect.requests) * actions;
    const transferKb = effect.transferKb * actions;
    const work =
      interaction === "mpa"
        ? `${actions} document replacement${actions === 1 ? "" : "s"}`
        : interaction === "hda"
          ? `${actions} fragment swap${actions === 1 ? "" : "s"}`
          : `${actions} client render${actions === 1 ? "" : "s"}`;

    setArchitectureLensText(
      root,
      "[data-architecture-lens-session-count]",
      `${actions} action${actions === 1 ? "" : "s"}`,
    );
    setArchitectureLensText(
      root,
      "[data-architecture-lens-session-summary]",
      `${requests} request${requests === 1 ? "" : "s"} · ≈${formatArchitectureKilobytes(transferKb)} KB responses · ${work}`,
    );
  };

  const render = () => {
    runRevision += 1;
    const delivery = getSelectedMode<DeliveryMode>(
      root,
      "[data-architecture-lens-delivery]",
      "ssr",
    );
    const interaction = getSelectedMode<InteractionMode>(
      root,
      "[data-architecture-lens-interaction]",
      "mpa",
    );
    const combination = architectureCombinations[`${delivery}-${interaction}`];
    const effect = getArchitectureInteractionEffect(delivery, interaction);

    root.dataset.delivery = delivery;
    root.dataset.interaction = interaction;
    setArchitectureLensText(
      root,
      "[data-architecture-lens-delivery-badge]",
      delivery.toUpperCase(),
    );
    setArchitectureLensText(
      root,
      "[data-architecture-lens-interaction-badge]",
      interaction.toUpperCase(),
    );
    setArchitectureLensText(
      root,
      "[data-architecture-lens-title]",
      `${delivery.toUpperCase()} + ${interaction.toUpperCase()}`,
    );
    setArchitectureLensText(
      root,
      "[data-architecture-lens-summary]",
      combination.summary,
    );
    setArchitectureLensText(
      root,
      "[data-architecture-lens-caution]",
      combination.caution,
    );
    setArchitectureLensText(
      root,
      "[data-architecture-lens-freshness]",
      delivery === "ssr"
        ? "Rendered now"
        : delivery === "isr"
          ? "Cached · revalidate 60 s"
          : "Client rendered · API data",
    );
    for (const [key, value] of Object.entries(combination).filter(
      ([key]) => !["summary", "caution"].includes(key),
    )) {
      setArchitectureLensText(
        root,
        `[data-architecture-lens-fact="${key}"]`,
        value,
      );
    }
    for (const key of ["artifact", "requests", "scope", "state"] as const) {
      setArchitectureLensText(
        root,
        `[data-architecture-lens-receipt="${key}"]`,
        effect[key],
      );
    }
    setArchitectureLensText(
      root,
      "[data-architecture-lens-transfer-label]",
      effect.transfer,
    );
    setArchitectureLensText(
      root,
      "[data-architecture-lens-transfer-detail]",
      effect.transferDetail,
    );
    const transfer = root.querySelector<HTMLElement>(
      "[data-architecture-lens-transfer]",
    );
    transfer?.style.setProperty(
      "--transfer-warm",
      `${(effect.transferKb / architectureTransferScaleKb) * 100}%`,
    );
    transfer?.style.setProperty(
      "--transfer-cold-extra",
      `${(effect.coldExtraKb / architectureTransferScaleKb) * 100}%`,
    );

    trace.innerHTML = buildArchitectureTrace(delivery, interaction);
    browser.classList.remove("is-replacing", "is-swapping", "is-rendering");
    events
      .querySelectorAll("[data-added-event]")
      .forEach((event) => event.remove());
    draft.value = "Compare cache behavior";
    status.textContent = `Projected: ${effect.requests} browser request${effect.requests === "1" ? "" : "s"}; ${effect.scope.toLowerCase()}.`;
    renderSession();
    runButton.disabled = false;
  };

  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("change", (event) => {
    const target = event.target as HTMLElement;
    if (
      target.matches(
        "[data-architecture-lens-delivery], [data-architecture-lens-interaction]",
      )
    ) {
      render();
    }
  });
  sessionActions.addEventListener("input", renderSession);
  runButton.addEventListener("click", () => {
    const revision = ++runRevision;
    const delivery = getSelectedMode<DeliveryMode>(
      root,
      "[data-architecture-lens-delivery]",
      "ssr",
    );
    const interaction = getSelectedMode<InteractionMode>(
      root,
      "[data-architecture-lens-interaction]",
      "mpa",
    );
    const effect = getArchitectureInteractionEffect(delivery, interaction);
    const steps = Array.from(
      trace.querySelectorAll<HTMLElement>("[data-architecture-lens-step]"),
    );

    runButton.disabled = true;
    status.textContent = "POST /events leaves the browser…";
    browser.classList.remove("is-replacing", "is-swapping", "is-rendering");
    void browser.offsetWidth;
    steps.forEach((step) => step.classList.remove("is-active", "is-complete"));

    steps.forEach((step, index) => {
      window.setTimeout(() => {
        if (revision !== runRevision) return;
        steps
          .slice(0, index)
          .forEach((item) => item.classList.add("is-complete"));
        step.classList.add("is-active");
      }, index * 360);
    });

    window.setTimeout(
      () => {
        if (revision !== runRevision) return;
        steps.forEach((step) => {
          step.classList.remove("is-active");
          step.classList.add("is-complete");
        });
        browser.classList.add(
          interaction === "mpa"
            ? "is-replacing"
            : interaction === "hda"
              ? "is-swapping"
              : "is-rendering",
        );
        events
          .querySelectorAll("[data-added-event]")
          .forEach((event) => event.remove());
        events.insertAdjacentHTML(
          "beforeend",
          "<li data-added-event><span>11:20</span>Architecture study</li>",
        );
        if (interaction === "mpa") draft.value = "";
        status.textContent = effect.completed;
        runButton.disabled = false;
      },
      steps.length * 360 + 120,
    );
  });

  render();
}

function getArchitectureInteractionEffect(
  delivery: DeliveryMode,
  interaction: InteractionMode,
): ArchitectureInteractionEffect {
  if (interaction === "spa") {
    return {
      artifact: "JSON delta",
      coldExtraKb: 0,
      completed:
        "1 request completed. JSON updated client state; the affected UI rerendered and the local draft stayed.",
      requests: "1",
      scope: "Client state + affected UI",
      state: "Preserved",
      transfer: "≈0.8 KB",
      transferDetail: "event JSON response",
      transferKb: 0.8,
    };
  }

  if (interaction === "hda") {
    return {
      artifact: "HTML fragment",
      coldExtraKb: 0,
      completed:
        "1 request completed. Only #activity-list changed; the local draft stayed.",
      requests: "1",
      scope: "#activity-list only",
      state: "Preserved",
      transfer: "≈1.2 KB",
      transferDetail: "activity-list fragment",
      transferKb: 1.2,
    };
  }

  const requests = delivery === "csr" ? "3" : "2";
  const csr = delivery === "csr";
  return {
    artifact: csr ? "Shell + JS + JSON" : "Complete HTML",
    coldExtraKb: csr ? 45 : 0,
    completed: `${requests} requests completed. The document was replaced; unsaved DOM state reset.`,
    requests,
    scope: "Whole document",
    state: "Reset",
    transfer: csr ? "≈5 KB warm / ≈50 KB cold" : "≈18 KB",
    transferDetail: csr
      ? "shell + JSON; cold cache adds JavaScript"
      : "complete document",
    transferKb: csr ? 5 : 18,
  };
}

function formatArchitectureKilobytes(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getSelectedMode<T extends string>(
  root: HTMLElement,
  selector: string,
  fallback: T,
) {
  return (root.querySelector<HTMLInputElement>(`${selector}:checked`)?.value ??
    fallback) as T;
}

function setArchitectureLensText(
  root: HTMLElement,
  selector: string,
  value: string,
) {
  const target = root.querySelector<HTMLElement>(selector);
  if (target) target.textContent = value;
}

function buildArchitectureTrace(
  delivery: DeliveryMode,
  interaction: InteractionMode,
) {
  const participants: Array<{
    detail: string;
    id: ArchitectureParticipantId;
    label: string;
  }> = [
    { id: "browser", label: "Browser", detail: "client" },
    { id: "edge", label: "Edge cache", detail: "delivery" },
    { id: "server", label: "Server", detail: "rules + HTML" },
    { id: "database", label: "Database", detail: "durable state" },
  ];
  const messages = buildArchitectureSequenceMessages(delivery, interaction);
  const participantIndex = new Map(
    participants.map((participant, index) => [participant.id, index]),
  );
  const participantMarkup = participants
    .map(
      (
        participant,
      ) => `<div class="architecture-sequence-participant${delivery === "ssr" && participant.id === "edge" ? " is-idle" : ""}">
        <span>${participant.label}</span>
        <small>${participant.detail}</small>
      </div>`,
    )
    .join("");
  const lifelineMarkup = participants
    .map(
      (participant) =>
        `<i class="architecture-sequence-lifeline${delivery === "ssr" && participant.id === "edge" ? " is-idle" : ""}" aria-hidden="true"></i>`,
    )
    .join("");
  const messageMarkup = messages
    .map((message, index) => {
      const from = participantIndex.get(message.from) ?? 0;
      const to = participantIndex.get(message.to) ?? from;
      const left = (Math.min(from, to) + 0.5) * 25;
      const width = Math.abs(to - from) * 25;
      const direction = to < from ? "is-reverse" : "is-forward";
      const self = to === from ? "is-local" : "";

      return `<li
        class="architecture-sequence-message is-${message.kind} ${direction} ${self}"
        style="--message-left: ${left}%; --message-width: ${width}%; --message-row: ${message.row}"
        data-architecture-lens-step
      >
        <span><strong>${message.label}</strong><small>${message.detail}</small></span>
        <i aria-hidden="true"></i>
      </li>`;
    })
    .join("");

  return `<div class="architecture-sequence" data-architecture-sequence>
    <div class="architecture-sequence-axis" aria-hidden="true"><span>time</span><i></i></div>
    <div class="architecture-sequence-participants">${participantMarkup}</div>
    <div class="architecture-sequence-plot">
      <div class="architecture-sequence-lifelines" aria-hidden="true">${lifelineMarkup}</div>
      <div class="architecture-sequence-phase architecture-sequence-phase--load"><span>01</span> Initial document</div>
      <div class="architecture-sequence-phase architecture-sequence-phase--action"><span>02</span> Record event</div>
      <ol aria-label="Messages in chronological order">${messageMarkup}</ol>
    </div>
  </div>`;
}

function buildArchitectureSequenceMessages(
  delivery: DeliveryMode,
  interaction: InteractionMode,
): ArchitectureSequenceMessage[] {
  const initial: ArchitectureSequenceMessage[] =
    delivery === "ssr"
      ? [
          sequenceMessage(
            1,
            "browser",
            "server",
            "GET /activity",
            "document request",
            "request",
          ),
          sequenceMessage(
            2,
            "server",
            "database",
            "Read activities",
            "render needs current data",
            "request",
          ),
          sequenceMessage(
            3,
            "server",
            "browser",
            "Complete HTML",
            "rendered for this request",
            "response",
          ),
        ]
      : delivery === "isr"
        ? [
            sequenceMessage(
              1,
              "browser",
              "edge",
              "GET /activity",
              "document request",
              "request",
            ),
            sequenceMessage(
              2,
              "edge",
              "browser",
              "Cached HTML",
              "serve immediately",
              "response",
            ),
            sequenceMessage(
              3,
              "edge",
              "server",
              "Revalidate",
              "after freshness window",
              "background",
            ),
            sequenceMessage(
              4,
              "server",
              "database",
              "Read activities",
              "regenerate from current data",
              "background",
            ),
            sequenceMessage(
              5,
              "server",
              "edge",
              "Refreshed HTML",
              "replace cached document",
              "background",
            ),
          ]
        : [
            sequenceMessage(
              1,
              "browser",
              "edge",
              "GET /activity",
              "request application shell",
              "request",
            ),
            sequenceMessage(
              2,
              "edge",
              "browser",
              "HTML shell + JS",
              "download and boot client",
              "response",
            ),
            sequenceMessage(
              3,
              "browser",
              "server",
              "GET /api/activities",
              "request view data",
              "request",
            ),
            sequenceMessage(
              4,
              "server",
              "database",
              "Read activities",
              "query current data",
              "request",
            ),
            sequenceMessage(
              5,
              "server",
              "browser",
              "JSON activities",
              "data, not UI",
              "response",
            ),
            sequenceMessage(
              6,
              "browser",
              "browser",
              interaction === "spa" ? "Initialize SPA" : "Render view",
              interaction === "spa"
                ? "create client state + UI"
                : "JavaScript creates the UI",
              "local",
            ),
          ];

  if (interaction === "spa" && delivery !== "csr") {
    initial.push(
      sequenceMessage(
        delivery === "isr" ? 6 : 5,
        "browser",
        "browser",
        "Initialize SPA",
        "hydrate client state + controls",
        "local",
      ),
    );
  }
  const interactionMessages: ArchitectureSequenceMessage[] = [
    sequenceMessage(
      8,
      "browser",
      "server",
      "POST /events",
      "record Architecture study",
      "request",
    ),
    sequenceMessage(
      9,
      "server",
      "database",
      "Persist event",
      "validate, then write",
      "write",
    ),
  ];

  if (delivery === "isr") {
    interactionMessages.push(
      sequenceMessage(
        10,
        "server",
        "edge",
        "Invalidate /activity",
        "keep the document cache coherent",
        "background",
      ),
    );
  }

  if (interaction === "spa") {
    const responseRow = delivery === "isr" ? 11 : 10;
    interactionMessages.push(
      sequenceMessage(
        responseRow,
        "server",
        "browser",
        "JSON event",
        "data, not HTML",
        "response",
      ),
      sequenceMessage(
        responseRow + 1,
        "browser",
        "browser",
        "Update client state",
        "render affected UI",
        "local",
      ),
    );
  } else if (interaction === "hda") {
    const responseRow = delivery === "isr" ? 11 : 10;
    interactionMessages.push(
      sequenceMessage(
        responseRow,
        "server",
        "browser",
        "HTML fragment",
        "#activity-list + next controls",
        "response",
      ),
      sequenceMessage(
        responseRow + 1,
        "browser",
        "browser",
        "Swap target",
        "no document navigation",
        "local",
      ),
    );
  } else if (delivery === "csr") {
    interactionMessages.push(
      sequenceMessage(
        10,
        "server",
        "browser",
        "303 See Other",
        "navigate after the write",
        "response",
      ),
      sequenceMessage(
        11,
        "browser",
        "edge",
        "GET /activity",
        "request application shell",
        "request",
      ),
      sequenceMessage(
        12,
        "edge",
        "browser",
        "HTML shell + JS",
        "boot client again",
        "response",
      ),
      sequenceMessage(
        13,
        "browser",
        "server",
        "GET /api/activities",
        "fetch current data",
        "request",
      ),
      sequenceMessage(
        14,
        "server",
        "browser",
        "JSON activities",
        "data, not UI",
        "response",
      ),
      sequenceMessage(
        15,
        "browser",
        "browser",
        "Render view",
        "JavaScript replaces the UI",
        "local",
      ),
    );
  } else {
    const redirectRow = delivery === "isr" ? 11 : 10;
    const documentSource: ArchitectureParticipantId =
      delivery === "isr" ? "edge" : "server";
    interactionMessages.push(
      sequenceMessage(
        redirectRow,
        "server",
        "browser",
        "303 See Other",
        "navigate after the write",
        "response",
      ),
      sequenceMessage(
        redirectRow + 1,
        "browser",
        documentSource,
        "GET /activity",
        "follow redirect",
        "request",
      ),
      sequenceMessage(
        redirectRow + 2,
        documentSource,
        "browser",
        "Complete HTML",
        delivery === "isr" ? "new cache entry" : "fresh server render",
        "response",
      ),
    );
  }

  return [...initial, ...interactionMessages];
}

function sequenceMessage(
  row: number,
  from: ArchitectureParticipantId,
  to: ArchitectureParticipantId,
  label: string,
  detail: string,
  kind: ArchitectureSequenceMessage["kind"],
): ArchitectureSequenceMessage {
  return { detail, from, kind, label, row, to };
}
