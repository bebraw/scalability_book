type PressureAssumptionKey = "burst" | "offline" | "tenants" | "slow-summary";

type IncidentMeasureKey =
  | "latency"
  | "backlog"
  | "duplicates"
  | "usefulness"
  | "rejected";

type IncidentStageKey = "ingress" | "store" | "processor" | "dashboard";
type IncidentPhase = "active" | "complete";

type IncidentMeasures = Record<IncidentMeasureKey, number>;
type IncidentDelta = Partial<IncidentMeasures>;

type PressureAssumption = {
  label: string;
  pressure: string;
  component: string;
  limit: string;
  failure: string;
  signal: string;
  response: string;
  recovery: string;
};

type IncidentProbe = {
  id: string;
  label: string;
  hint: string;
  reading: string;
  interpretation: string;
  correct: boolean;
};

type IncidentAction = {
  id: string;
  label: string;
  cost: number;
  description: string;
  immediate: IncidentDelta;
  delayed: IncidentDelta;
  consequence: string;
  complexityMovesTo: string;
};

type IncidentRound = {
  stage: string;
  clock: string;
  title: string;
  prompt: string;
  summary: string;
  event: string;
  surfaceSignals: string[];
  assumptions: PressureAssumptionKey[];
  disturbance: IncidentDelta;
  probes: IncidentProbe[];
  actions: IncidentAction[];
};

type IncidentState = IncidentMeasures & {
  budget: number;
  evidence: number;
};

type IncidentDecision = {
  round: IncidentRound;
  probe: IncidentProbe;
  action: IncidentAction;
  before: IncidentMeasures;
  after: IncidentMeasures;
};

type IncidentLogEntry = {
  time: string;
  text: string;
  current: boolean;
};

const pressureAssumptions: Record<PressureAssumptionKey, PressureAssumption> = {
  burst: {
    label: "Burst traffic during a 20-minute peak",
    pressure: "Write burst",
    component: "Event ingestion and database boundary",
    limit: "Useful write throughput and database connection capacity.",
    failure: "Requests wait, time out, and encourage clients to retry.",
    signal: "Pool wait rises while API CPU remains below saturation.",
    response:
      "Bound admitted work or acknowledge durable ingestion before optional processing.",
    recovery:
      "Enable ingress backpressure or switch to the prepared asynchronous path.",
  },
  offline: {
    label: "Clients retry after slow or lost responses",
    pressure: "Retry amplification",
    component: "Validation and external-effect boundary",
    limit: "Request budget and deduplication capacity.",
    failure: "Repeated attempts amplify load and can apply duplicate effects.",
    signal:
      "Attempt volume and repeated event identifiers rise without new users.",
    response:
      "Reuse stable idempotency keys, enforce them atomically, and back off retries.",
    recovery:
      "Throttle retries and quarantine repeated events for controlled replay.",
  },
  tenants: {
    label: "One tenant imports historical events",
    pressure: "Noisy-neighbor isolation",
    component: "Shared processor pool",
    limit: "Fair processing capacity across tenants.",
    failure: "One import ages normal events for every other tenant.",
    signal: "Oldest-event age is concentrated in one tenant and work class.",
    response:
      "Cap importer concurrency or move it to an isolated capacity pool.",
    recovery:
      "Throttle the importer and drain interactive work before resuming the batch.",
  },
  "slow-summary": {
    label: "Dashboard summaries lag behind accepted events",
    pressure: "Freshness",
    component: "Derived read model",
    limit: "Processor throughput and acceptable summary age.",
    failure: "The dashboard looks healthy while presenting stale totals.",
    signal: "Oldest-event age grows while ingestion continues to succeed.",
    response:
      "Expose freshness and protect processor capacity for interactive work.",
    recovery:
      "Serve a declared last-known view or pause optional enrichment while draining.",
  },
};

const incidentRounds: IncidentRound[] = [
  {
    stage: "Detect",
    clock: "09:02",
    title: "Writes slow while API CPU remains quiet",
    prompt:
      "Which signal identifies the first binding limit, and what is the smallest defensible response?",
    summary:
      "The conference doors just opened. Commit to evidence before changing the system.",
    event: "Arrival demand crosses the current capacity envelope.",
    surfaceSignals: [
      "Offered load climbed from 75 to 140 events per second.",
      "Completed throughput flattened near 110 events per second.",
      "Write p95 crossed the 250 ms objective.",
    ],
    assumptions: ["burst"],
    disturbance: { latency: 200, backlog: 20 },
    probes: [
      {
        id: "api-cpu",
        label: "Inspect API CPU",
        hint: "Is the stateless request tier out of compute?",
        reading: "API CPU is 44%; request concurrency is rising.",
        interpretation:
          "The API has compute headroom. This does not explain the flat completed throughput.",
        correct: false,
      },
      {
        id: "pool-wait",
        label: "Inspect database pool wait",
        hint: "Is admitted work waiting before it can commit?",
        reading: "The pool is 100% busy; p95 connection wait reached 180 ms.",
        interpretation:
          "This identifies the first binding limit: requests wait at the database boundary.",
        correct: true,
      },
      {
        id: "cache-hit",
        label: "Inspect dashboard cache hits",
        hint: "Are repeated reads causing the write slowdown?",
        reading: "Dashboard cache hit rate is 91%; read traffic is stable.",
        interpretation:
          "The read path is not the first boundary in this disturbance.",
        correct: false,
      },
    ],
    actions: [
      {
        id: "api-replicas",
        label: "Add two API replicas",
        cost: 1,
        description:
          "Increase stateless request capacity while leaving the store unchanged.",
        immediate: { latency: -15 },
        delayed: { latency: 55, backlog: 18 },
        consequence:
          "The API admits work faster, but the database remains the boundary and waiting returns.",
        complexityMovesTo: "database concurrency and a larger hidden backlog",
      },
      {
        id: "expand-pool",
        label: "Expand the database pool",
        cost: 2,
        description:
          "Open more connections to remove the visible pool-full condition.",
        immediate: { latency: -105, backlog: -6 },
        delayed: { latency: 85, backlog: 22, usefulness: -3 },
        consequence:
          "The queue briefly clears, then extra in-flight work increases storage contention.",
        complexityMovesTo: "storage contention and longer recovery queues",
      },
      {
        id: "backpressure",
        label: "Enable ingress backpressure",
        cost: 1,
        description:
          "Bound admitted work and return explicit retry guidance above the envelope.",
        immediate: {
          latency: -125,
          backlog: -15,
          rejected: 12,
          usefulness: -6,
        },
        delayed: { latency: -25, backlog: -5 },
        consequence:
          "Tail latency falls and hidden waiting becomes explicit rejection that clients must handle.",
        complexityMovesTo:
          "fairness policy, Retry-After handling, and rejected work",
      },
      {
        id: "async-ingestion",
        label: "Switch to buffered ingestion",
        cost: 2,
        description:
          "Durably accept the event before optional enrichment and summary work.",
        immediate: { latency: -150, backlog: 20, usefulness: -5 },
        delayed: { backlog: 25 },
        consequence:
          "The write path responds quickly, but processing lag becomes the next visible boundary.",
        complexityMovesTo:
          "queue age, delayed summaries, retries, and worker operations",
      },
    ],
  },
  {
    stage: "Contain",
    clock: "09:08",
    title: "Timeouts turn one event into several attempts",
    prompt:
      "Which evidence separates new demand from retry amplification, and which response protects both capacity and correctness?",
    summary:
      "Some clients did not observe a timely success and began resending the same logical events.",
    event:
      "Retry traffic rises without a matching increase in unique check-ins.",
    surfaceSignals: [
      "Request attempts rise faster than unique attendee check-ins.",
      "Several clients report timeouts followed by successful retries.",
      "Accepted-event totals and dashboard totals begin to diverge.",
    ],
    assumptions: ["offline"],
    disturbance: { latency: 70, backlog: 18, duplicates: 10 },
    probes: [
      {
        id: "client-count",
        label: "Count active clients",
        hint: "Did the number of people suddenly grow again?",
        reading: "Active client count is flat; request attempts are up 38%.",
        interpretation:
          "This suggests amplification, but it does not yet show whether logical events repeat.",
        correct: false,
      },
      {
        id: "repeated-ids",
        label: "Compare logical event identifiers",
        hint: "Are physical attempts repeating the same command?",
        reading:
          "Four logical event IDs appear across fourteen physical attempts.",
        interpretation:
          "The repeated identifiers reveal retry amplification and a correctness boundary.",
        correct: true,
      },
      {
        id: "processor-cpu",
        label: "Inspect processor CPU",
        hint: "Are background workers out of compute?",
        reading: "Processor CPU is 52%; some workers are waiting on storage.",
        interpretation:
          "Worker CPU is not the cause of the duplicated logical work.",
        correct: false,
      },
    ],
    actions: [
      {
        id: "retry-contract",
        label: "Apply a bounded retry contract",
        cost: 2,
        description:
          "Reuse stable keys, enforce them atomically, and add exponential backoff.",
        immediate: { latency: -45, backlog: -8, duplicates: -14 },
        delayed: { backlog: -5 },
        consequence:
          "Repeated attempts stop creating effects and retry demand spreads out over time.",
        complexityMovesTo:
          "key retention, receiver enforcement, and retry budgets",
      },
      {
        id: "stable-key",
        label: "Enforce stable idempotency keys",
        cost: 1,
        description:
          "Deduplicate the business effect without changing retry timing.",
        immediate: { duplicates: -14 },
        delayed: {},
        consequence:
          "Correctness recovers, but repeated physical attempts still consume capacity.",
        complexityMovesTo: "atomic key storage and retention",
      },
      {
        id: "retry-backoff",
        label: "Add exponential backoff",
        cost: 1,
        description:
          "Spread attempts over time without adding receiver-side deduplication.",
        immediate: { latency: -65, backlog: -15, duplicates: -3 },
        delayed: { latency: -15 },
        consequence:
          "Amplification falls, but a retry can still repeat an external effect.",
        complexityMovesTo: "client retry policy and delayed completion",
      },
      {
        id: "immediate-retry",
        label: "Retry every timeout immediately",
        cost: 0,
        description:
          "Favor apparent availability by resending until an attempt succeeds.",
        immediate: {
          latency: 110,
          backlog: 35,
          duplicates: 10,
          usefulness: -5,
        },
        delayed: { latency: 45, backlog: 15 },
        consequence:
          "Retries become new load, extending waits and producing more duplicate effects.",
        complexityMovesTo: "an unbounded positive feedback loop",
      },
    ],
  },
  {
    stage: "Recover",
    clock: "09:14",
    title: "One historical import ages everyone else's events",
    prompt:
      "Which signal exposes the unfair work class, and how will you recover without pretending a queue creates capacity?",
    summary:
      "The write API is responding, but the derived dashboard is falling behind unevenly.",
    event: "A large tenant import competes with interactive processing.",
    surfaceSignals: [
      "Oldest-event age rises while accepted writes remain steady.",
      "A historical import began for one tenant at 09:10.",
      "Global worker CPU is 58%, below the fleet alarm threshold.",
    ],
    assumptions: ["tenants", "slow-summary"],
    disturbance: { latency: 55, backlog: 62 },
    probes: [
      {
        id: "global-cpu",
        label: "Inspect global worker CPU",
        hint: "Does one fleet-wide average reveal unfairness?",
        reading: "Global CPU is 58%; no fleet-wide saturation alarm fires.",
        interpretation:
          "The average hides which tenant and work class owns the oldest work.",
        correct: false,
      },
      {
        id: "tenant-age",
        label: "Break event age down by tenant",
        hint: "Is waiting evenly distributed across work classes?",
        reading:
          "Importer events are 94 s old; interactive events are 12 s old and rising.",
        interpretation:
          "The per-tenant distribution exposes a noisy neighbor in the shared processor pool.",
        correct: true,
      },
      {
        id: "database-size",
        label: "Inspect total database size",
        hint: "Did storage volume suddenly cross a physical limit?",
        reading: "Database size grew 0.3%; storage I/O has 41% headroom.",
        interpretation:
          "Total volume is not the immediate boundary; scheduling fairness is.",
        correct: false,
      },
    ],
    actions: [
      {
        id: "isolate-importer",
        label: "Isolate and cap the importer",
        cost: 2,
        description:
          "Give interactive work protected capacity and bound batch concurrency.",
        immediate: {
          latency: -35,
          backlog: -85,
          rejected: 6,
          usefulness: -5,
        },
        delayed: {},
        consequence:
          "Interactive events drain first while the import completes more slowly in isolation.",
        complexityMovesTo:
          "per-tenant scheduling, quotas, and batch completion time",
      },
      {
        id: "scale-workers",
        label: "Add workers to the shared pool",
        cost: 2,
        description:
          "Increase aggregate processing without changing admission or fairness.",
        immediate: { latency: 10, backlog: -55 },
        delayed: {},
        consequence:
          "The queue drains, but more workers increase pressure on the same downstream store.",
        complexityMovesTo:
          "downstream connections, coordination, and operating cost",
      },
      {
        id: "pause-enrichment",
        label: "Pause optional enrichment",
        cost: 1,
        description:
          "Preserve core event processing while temporarily reducing feature value.",
        immediate: { latency: -20, backlog: -60, usefulness: -18 },
        delayed: {},
        consequence:
          "Core summaries catch up, but enriched views remain incomplete until replay.",
        complexityMovesTo:
          "replay work and an explicit degraded-service contract",
      },
      {
        id: "cache-dashboard",
        label: "Cache the current dashboard",
        cost: 1,
        description:
          "Reduce dashboard query work while processors continue to lag.",
        immediate: { latency: -20, usefulness: -12 },
        delayed: {},
        consequence:
          "The page responds quickly but presents an older view of unresolved work.",
        complexityMovesTo: "freshness disclosure and cache invalidation",
      },
    ],
  },
];

const initialIncidentState: IncidentState = {
  latency: 110,
  backlog: 8,
  duplicates: 0,
  usefulness: 100,
  rejected: 0,
  budget: 6,
  evidence: 0,
};

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-pressure-map-demo]",
)) {
  initializePressureMapDemo(root);
}

function initializePressureMapDemo(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>(
    "[data-pressure-map-demo-form]",
  );
  const incidentGrid = root.querySelector<HTMLElement>(
    ".pressure-incident-grid",
  );
  const decisionPanel = root.querySelector<HTMLElement>(
    ".pressure-incident-decision",
  );
  const verdict = root.querySelector<HTMLElement>(
    "[data-pressure-map-demo-verdict]",
  );
  const summary = root.querySelector<HTMLElement>(
    "[data-pressure-map-demo-summary]",
  );
  const clock = root.querySelector<HTMLTimeElement>(
    "[data-pressure-map-demo-clock]",
  );
  const roundLabel = root.querySelector<HTMLElement>(
    "[data-pressure-map-demo-round-label]",
  );
  const roundTitle = root.querySelector<HTMLElement>(
    "[data-pressure-map-demo-round-title]",
  );
  const prompt = root.querySelector<HTMLElement>(
    "[data-pressure-map-demo-prompt]",
  );
  const surface = root.querySelector<HTMLElement>(
    "[data-pressure-map-demo-surface]",
  );
  const probeOptions = root.querySelector<HTMLElement>(
    '[data-pressure-map-demo-options="probe"]',
  );
  const actionOptions = root.querySelector<HTMLElement>(
    '[data-pressure-map-demo-options="action"]',
  );
  const probeReadout = root.querySelector<HTMLElement>(
    "[data-pressure-map-demo-probe-readout]",
  );
  const costNote = root.querySelector<HTMLElement>(
    "[data-pressure-map-demo-cost-note]",
  );
  const commit = root.querySelector<HTMLButtonElement>(
    "[data-pressure-map-demo-commit]",
  );
  const budgetOutput = root.querySelector<HTMLOutputElement>(
    "[data-pressure-map-demo-budget]",
  );
  const log = root.querySelector<HTMLOListElement>(
    "[data-pressure-map-demo-log]",
  );
  const debrief = root.querySelector<HTMLElement>(
    "[data-pressure-map-demo-debrief]",
  );
  const resultTitle = root.querySelector<HTMLElement>(
    "[data-pressure-map-demo-result-title]",
  );
  const result = root.querySelector<HTMLElement>(
    "[data-pressure-map-demo-result]",
  );
  const constraints = root.querySelector<HTMLElement>(
    "[data-pressure-map-demo-constraints]",
  );
  const board = root.querySelector<HTMLElement>(
    "[data-pressure-map-demo-board]",
  );
  const artifact = root.querySelector<HTMLTextAreaElement>(
    "[data-pressure-map-demo-artifact]",
  );
  const copy = root.querySelector<HTMLButtonElement>(
    "[data-pressure-map-demo-copy]",
  );
  const reset = root.querySelector<HTMLButtonElement>(
    "[data-pressure-map-demo-reset]",
  );
  const metricNodes = new Map(
    Array.from(
      root.querySelectorAll<HTMLElement>("[data-pressure-map-demo-metric]"),
    ).map((node) => [node.dataset.pressureMapDemoMetric ?? "", node]),
  );
  const metricStateNodes = new Map(
    Array.from(
      root.querySelectorAll<HTMLElement>(
        "[data-pressure-map-demo-metric-state]",
      ),
    ).map((node) => [node.dataset.pressureMapDemoMetricState ?? "", node]),
  );
  const stageNodes = new Map(
    Array.from(
      root.querySelectorAll<HTMLElement>("[data-pressure-map-demo-stage]"),
    ).map((node) => [node.dataset.pressureMapDemoStage ?? "", node]),
  );
  const stageStatusNodes = new Map(
    Array.from(
      root.querySelectorAll<HTMLElement>(
        "[data-pressure-map-demo-stage-status]",
      ),
    ).map((node) => [node.dataset.pressureMapDemoStageStatus ?? "", node]),
  );
  const progressNodes = Array.from(
    root.querySelectorAll<HTMLElement>("[data-pressure-map-demo-step]"),
  );

  if (
    !form ||
    !incidentGrid ||
    !decisionPanel ||
    !verdict ||
    !summary ||
    !clock ||
    !roundLabel ||
    !roundTitle ||
    !prompt ||
    !surface ||
    !probeOptions ||
    !actionOptions ||
    !probeReadout ||
    !costNote ||
    !commit ||
    !budgetOutput ||
    !log ||
    !debrief ||
    !resultTitle ||
    !result ||
    !constraints ||
    !board ||
    !artifact ||
    !copy ||
    !reset ||
    progressNodes.length !== 4
  ) {
    return;
  }

  let phase: IncidentPhase = "active";
  let roundIndex = 0;
  let state = cloneIncidentState(initialIncidentState);
  let pendingDelta: IncidentDelta = {};
  let selectedProbeId = "";
  let selectedActionId = "";
  let decisions: IncidentDecision[] = [];
  let logEntries: IncidentLogEntry[] = [];

  const enterRound = (index: number) => {
    const round = incidentRounds[index];
    if (!round) {
      return;
    }

    state = applyIncidentDelta(state, pendingDelta);
    pendingDelta = {};
    state = applyIncidentDelta(state, getRoundDisturbance(round, decisions));
    selectedProbeId = "";
    selectedActionId = "";
    logEntries = logEntries.map((entry) => ({ ...entry, current: false }));
    logEntries.push({ time: round.clock, text: round.event, current: true });
  };

  const resetIncident = () => {
    phase = "active";
    roundIndex = 0;
    state = cloneIncidentState(initialIncidentState);
    pendingDelta = {};
    selectedProbeId = "";
    selectedActionId = "";
    decisions = [];
    logEntries = [
      {
        time: "08:55",
        text: "Baseline stable at 75 events per second.",
        current: false,
      },
    ];
    enterRound(0);
    incidentGrid.hidden = false;
    incidentGrid.dataset.phase = "active";
    decisionPanel.hidden = false;
    debrief.hidden = true;
    root.dataset.pressureIncidentState = "active";
    render();
  };

  const getActiveRound = () => incidentRounds[roundIndex];

  const getSelectedProbe = () =>
    getActiveRound()?.probes.find((probe) => probe.id === selectedProbeId);

  const getSelectedAction = () =>
    getActiveRound()?.actions.find((action) => action.id === selectedActionId);

  const renderRound = () => {
    const round = getActiveRound();
    if (!round) {
      return;
    }

    verdict.textContent = `Round ${roundIndex + 1} of ${incidentRounds.length} · ${round.stage}`;
    summary.textContent = round.summary;
    clock.textContent = round.clock;
    clock.dateTime = `2026-01-01T${round.clock}:00`;
    roundLabel.textContent = `Round ${String(roundIndex + 1).padStart(2, "0")} · ${round.stage}`;
    roundTitle.textContent = round.title;
    prompt.textContent = round.prompt;
    surface.innerHTML = round.surfaceSignals
      .map((signal) => `<li>${escapePressureMapHtml(signal)}</li>`)
      .join("");
    probeOptions.innerHTML = buildProbeOptions(round.probes, selectedProbeId);
    actionOptions.innerHTML = buildActionOptions(
      round.actions,
      selectedActionId,
      state.budget,
    );
    budgetOutput.value = `${state.budget} unit${state.budget === 1 ? "" : "s"}`;
    budgetOutput.textContent = budgetOutput.value;
    renderSelection();
  };

  const renderSelection = () => {
    const probe = getSelectedProbe();
    const action = getSelectedAction();

    probeReadout.innerHTML = probe
      ? `<span>Probe reading</span>
        <strong>${escapePressureMapHtml(probe.reading)}</strong>
        <p>Use this observation to decide whether the signal identifies the first binding limit.</p>`
      : `<span>Probe not selected</span>
        <p>Choose one signal to reveal its reading before you act.</p>`;

    if (action) {
      costNote.textContent = `${action.cost} budget unit${action.cost === 1 ? "" : "s"}. This response moves complexity to ${action.complexityMovesTo}.`;
    } else {
      costNote.textContent =
        "The response and its displaced complexity will carry into the next round.";
    }

    commit.disabled =
      !probe || !action || action.cost > state.budget || phase !== "active";
  };

  const render = () => {
    renderIncidentMetrics(state, metricNodes, metricStateNodes);
    renderIncidentStages(state, stageNodes, stageStatusNodes);
    renderIncidentLog(log, logEntries);
    renderIncidentProgress(progressNodes, roundIndex, phase);

    if (phase === "active") {
      renderRound();
    } else {
      renderDebrief();
    }
  };

  const commitDecision = () => {
    const round = getActiveRound();
    const probe = getSelectedProbe();
    const action = getSelectedAction();

    if (
      phase !== "active" ||
      !round ||
      !probe ||
      !action ||
      action.cost > state.budget
    ) {
      return;
    }

    const before = getIncidentMeasures(state);
    state = applyIncidentDelta(state, action.immediate);
    state.budget -= action.cost;
    state.evidence += probe.correct ? 1 : 0;
    pendingDelta = combineIncidentDeltas(pendingDelta, action.delayed);
    decisions.push({
      round,
      probe,
      action,
      before,
      after: getIncidentMeasures(state),
    });
    logEntries = logEntries.map((entry) => ({ ...entry, current: false }));
    logEntries.push({
      time: round.clock,
      text: `${action.label}: ${action.consequence}`,
      current: false,
    });

    roundIndex += 1;
    if (roundIndex >= incidentRounds.length) {
      state = applyIncidentDelta(state, pendingDelta);
      pendingDelta = {};
      phase = "complete";
      logEntries.push({
        time: "09:18",
        text: "The immediate incident window closes; the pressure map is ready for review.",
        current: true,
      });
      decisionPanel.hidden = true;
      incidentGrid.dataset.phase = "complete";
      debrief.hidden = false;
    } else {
      enterRound(roundIndex);
    }

    render();
    if (phase === "complete") {
      resultTitle.focus();
    }
  };

  const renderDebrief = () => {
    const assessment = assessIncident(state);
    const assumptions = getObservedAssumptions();

    verdict.textContent = assessment.title;
    summary.textContent = `${assessment.metCount} of ${assessment.constraints.length} operating constraints met; ${state.evidence} of ${incidentRounds.length} binding signals identified.`;
    resultTitle.textContent = assessment.title;
    result.textContent = `${assessment.metCount}/${assessment.constraints.length} constraints met`;
    result.dataset.state = assessment.state;
    root.dataset.pressureIncidentState = assessment.state;
    constraints.innerHTML = buildConstraintCards(assessment.constraints);
    board.innerHTML = buildPressureMapBoard(assumptions);
    artifact.value = buildIncidentArtifact(
      state,
      decisions,
      assumptions,
      assessment,
    );
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    commitDecision();
  });

  form.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    if (target.matches("[data-pressure-map-demo-probe]")) {
      selectedProbeId = target.value;
    } else if (target.matches("[data-pressure-map-demo-action]")) {
      selectedActionId = target.value;
    } else {
      return;
    }

    renderSelection();
  });

  copy.addEventListener("click", async () => {
    artifact.select();

    try {
      await navigator.clipboard.writeText(artifact.value);
      copy.textContent = "Copied";
      window.setTimeout(() => {
        copy.textContent = "Copy brief";
      }, 1400);
    } catch {
      copy.textContent = "Select text";
    }
  });

  reset.addEventListener("click", resetIncident);
  resetIncident();
}

function getRoundDisturbance(
  round: IncidentRound,
  decisions: IncidentDecision[],
) {
  let disturbance = { ...round.disturbance };
  const chosenActions = new Set(decisions.map(({ action }) => action.id));

  if (round.stage === "Contain" && chosenActions.has("backpressure")) {
    disturbance = combineIncidentDeltas(disturbance, {
      backlog: -6,
      duplicates: -6,
    });
  }

  if (round.stage === "Contain" && chosenActions.has("async-ingestion")) {
    disturbance = combineIncidentDeltas(disturbance, { latency: -20 });
  }

  return disturbance;
}

function buildProbeOptions(probes: IncidentProbe[], selectedId: string) {
  return probes
    .map(
      (probe) => `<label>
        <input
          type="radio"
          name="pressure-incident-probe"
          value="${escapePressureMapHtml(probe.id)}"
          data-pressure-map-demo-probe
          ${probe.id === selectedId ? "checked" : ""}
        />
        <span>
          <strong>${escapePressureMapHtml(probe.label)}</strong>
          <small>${escapePressureMapHtml(probe.hint)}</small>
        </span>
      </label>`,
    )
    .join("");
}

function buildActionOptions(
  actions: IncidentAction[],
  selectedId: string,
  budget: number,
) {
  return actions
    .map((action) => {
      const unavailable = action.cost > budget;

      return `<label class="${unavailable ? "is-unavailable" : ""}">
        <input
          type="radio"
          name="pressure-incident-action"
          value="${escapePressureMapHtml(action.id)}"
          data-pressure-map-demo-action
          ${action.id === selectedId ? "checked" : ""}
          ${unavailable ? "disabled" : ""}
        />
        <span>
          <strong>${escapePressureMapHtml(action.label)}</strong>
          <small>${escapePressureMapHtml(action.description)}</small>
        </span>
        <em>${action.cost} unit${action.cost === 1 ? "" : "s"}</em>
      </label>`;
    })
    .join("");
}

function renderIncidentMetrics(
  state: IncidentState,
  metricNodes: Map<string, HTMLElement>,
  metricStateNodes: Map<string, HTMLElement>,
) {
  const values: Record<string, string> = {
    latency: `${state.latency} ms`,
    backlog: `${state.backlog} s`,
    duplicates: String(state.duplicates),
    usefulness: `${state.usefulness}%`,
    rejected: `${state.rejected}%`,
    budget: String(state.budget),
  };

  metricNodes.forEach((node, key) => {
    node.textContent = values[key] ?? "—";
  });

  metricStateNodes.forEach((node, key) => {
    if (isIncidentMeasureKey(key)) {
      node.dataset.state = getMeasureState(key, state[key]);
    }
  });
}

function renderIncidentStages(
  state: IncidentState,
  stageNodes: Map<string, HTMLElement>,
  stageStatusNodes: Map<string, HTMLElement>,
) {
  const stages: Record<
    IncidentStageKey,
    { status: string; state: "safe" | "warning" | "critical" }
  > = {
    ingress:
      state.latency > 350
        ? { status: "Requests waiting", state: "critical" }
        : state.rejected > 0
          ? { status: `${state.rejected}% guarded`, state: "warning" }
          : { status: "Accepting", state: "safe" },
    store:
      state.latency > 350
        ? { status: "Pool saturated", state: "critical" }
        : state.latency > 250
          ? { status: "Pool strained", state: "warning" }
          : { status: "Within envelope", state: "safe" },
    processor:
      state.backlog > 100
        ? { status: "Falling behind", state: "critical" }
        : state.backlog > 60
          ? { status: "Backlog rising", state: "warning" }
          : { status: "Keeping up", state: "safe" },
    dashboard:
      state.usefulness < 60 || state.backlog > 100
        ? { status: "Not trustworthy", state: "critical" }
        : state.usefulness < 75 || state.backlog > 60
          ? { status: "Freshness at risk", state: "warning" }
          : { status: "Current", state: "safe" },
  };

  (
    Object.entries(stages) as Array<
      [IncidentStageKey, (typeof stages)[IncidentStageKey]]
    >
  ).forEach(([key, value]) => {
    const stage = stageNodes.get(key);
    const status = stageStatusNodes.get(key);
    if (stage) {
      stage.dataset.state = value.state;
    }
    if (status) {
      status.textContent = value.status;
    }
  });
}

function renderIncidentLog(
  node: HTMLOListElement,
  entries: IncidentLogEntry[],
) {
  node.innerHTML = entries
    .map(
      (entry) => `<li class="${entry.current ? "is-current" : ""}">
        <time>${escapePressureMapHtml(entry.time)}</time>
        <p>${escapePressureMapHtml(entry.text)}</p>
      </li>`,
    )
    .join("");
  node.scrollTop = node.scrollHeight;
}

function renderIncidentProgress(
  nodes: HTMLElement[],
  roundIndex: number,
  phase: IncidentPhase,
) {
  const activeIndex = phase === "complete" ? incidentRounds.length : roundIndex;

  nodes.forEach((node, index) => {
    node.classList.toggle("is-complete", index < activeIndex);
    node.classList.toggle("is-active", index === activeIndex);
    if (index === activeIndex) {
      node.setAttribute("aria-current", "step");
    } else {
      node.removeAttribute("aria-current");
    }
  });
}

function assessIncident(state: IncidentState) {
  const constraints = [
    {
      label: "Write p95",
      value: `${state.latency} ms`,
      target: "≤ 250 ms",
      met: state.latency <= 250,
    },
    {
      label: "Oldest event",
      value: `${state.backlog} s`,
      target: "≤ 60 s",
      met: state.backlog <= 60,
    },
    {
      label: "Duplicate effects",
      value: String(state.duplicates),
      target: "≤ 2",
      met: state.duplicates <= 2,
    },
    {
      label: "Modeled usefulness",
      value: `${state.usefulness}%`,
      target: "≥ 75%",
      met: state.usefulness >= 75,
    },
    {
      label: "Explicit rejection",
      value: `${state.rejected}%`,
      target: "≤ 20%",
      met: state.rejected <= 20,
    },
  ];
  const metCount = constraints.filter(({ met }) => met).length;

  if (metCount === constraints.length) {
    return {
      title: "Useful with declared trade-offs",
      state: "safe",
      metCount,
      constraints,
    };
  }

  if (metCount >= constraints.length - 1) {
    return {
      title: "Operating near the boundary",
      state: "warning",
      metCount,
      constraints,
    };
  }

  return {
    title: "Outside the competence envelope",
    state: "critical",
    metCount,
    constraints,
  };
}

function buildConstraintCards(
  constraints: ReturnType<typeof assessIncident>["constraints"],
) {
  return constraints
    .map(
      ({ label, value, target, met }) => `<article data-state="${
        met ? "safe" : "critical"
      }">
        <span>${met ? "Within" : "Outside"}</span>
        <strong>${escapePressureMapHtml(value)}</strong>
        <p>${escapePressureMapHtml(label)} · target ${escapePressureMapHtml(
          target,
        )}</p>
      </article>`,
    )
    .join("");
}

function getObservedAssumptions() {
  return [...new Set(incidentRounds.flatMap(({ assumptions }) => assumptions))];
}

function buildPressureMapBoard(selected: PressureAssumptionKey[]) {
  return selected
    .map((key, index) => {
      const assumption = pressureAssumptions[key];

      return `<article class="pressure-map-card">
        <span>${index + 1}</span>
        <div>
          <strong>${escapePressureMapHtml(assumption.label)}</strong>
          <dl>
            <div>
              <dt>Stressed part</dt>
              <dd>${escapePressureMapHtml(assumption.component)}</dd>
            </div>
            <div>
              <dt>Limit approached</dt>
              <dd>${escapePressureMapHtml(assumption.limit)}</dd>
            </div>
            <div>
              <dt>Likely failure</dt>
              <dd>${escapePressureMapHtml(assumption.failure)}</dd>
            </div>
            <div>
              <dt>First signal</dt>
              <dd>${escapePressureMapHtml(assumption.signal)}</dd>
            </div>
            <div>
              <dt>Prepared recovery</dt>
              <dd>${escapePressureMapHtml(assumption.recovery)}</dd>
            </div>
          </dl>
        </div>
        <small>${escapePressureMapHtml(assumption.pressure)}</small>
      </article>`;
    })
    .join("");
}

function buildIncidentArtifact(
  state: IncidentState,
  decisions: IncidentDecision[],
  assumptions: PressureAssumptionKey[],
  assessment: ReturnType<typeof assessIncident>,
) {
  return [
    "Incident pressure brief",
    "",
    "Scenario: Conference check-in event pipeline",
    "Model boundary: Deterministic teaching scenario; values are not measured deployment capacity.",
    `Outcome: ${assessment.title}`,
    `Operating constraints met: ${assessment.metCount}/${assessment.constraints.length}`,
    `Binding signals identified: ${state.evidence}/${incidentRounds.length}`,
    `Change budget remaining: ${state.budget}/6`,
    "",
    "Decision trace:",
    ...decisions.flatMap(({ round, probe, action, before, after }, index) => [
      `${index + 1}. ${round.clock} · ${round.stage}`,
      `   Investigation: ${probe.label}`,
      `   Reading: ${probe.reading}`,
      `   Boundary evidence: ${probe.correct ? "matched" : "did not identify the first limit"}`,
      `   Response: ${action.label} (${action.cost} budget unit${action.cost === 1 ? "" : "s"})`,
      `   Immediate change: p95 ${before.latency}→${after.latency} ms; oldest event ${before.backlog}→${after.backlog} s; duplicates ${before.duplicates}→${after.duplicates}.`,
      `   Consequence: ${action.consequence}`,
      `   Complexity moved to: ${action.complexityMovesTo}.`,
    ]),
    "",
    "Final operating view:",
    ...assessment.constraints.map(
      ({ label, value, target, met }) =>
        `- ${label}: ${value} (target ${target}) — ${met ? "within" : "outside"}`,
    ),
    "",
    "Observed pressure map:",
    ...assumptions.flatMap((key) => {
      const assumption = pressureAssumptions[key];

      return [
        `- Assumption: ${assumption.label}`,
        `  Pressure: ${assumption.pressure}`,
        `  Stressed part: ${assumption.component}`,
        `  Limit approached: ${assumption.limit}`,
        `  Likely failure: ${assumption.failure}`,
        `  First signal: ${assumption.signal}`,
        `  Response: ${assumption.response}`,
        `  Prepared recovery: ${assumption.recovery}`,
      ];
    }),
    "",
    "Debrief:",
    "Explain which response you would keep, which trade-off remains, and which measurement a real deployment would need before treating this model as evidence.",
  ].join("\n");
}

function getMeasureState(key: IncidentMeasureKey, value: number) {
  if (key === "latency") {
    return value <= 250 ? "safe" : value <= 350 ? "warning" : "critical";
  }
  if (key === "backlog") {
    return value <= 60 ? "safe" : value <= 100 ? "warning" : "critical";
  }
  if (key === "duplicates") {
    return value <= 2 ? "safe" : value <= 8 ? "warning" : "critical";
  }
  if (key === "usefulness") {
    return value >= 75 ? "safe" : value >= 60 ? "warning" : "critical";
  }

  return value <= 20 ? "safe" : value <= 30 ? "warning" : "critical";
}

function isIncidentMeasureKey(value: string): value is IncidentMeasureKey {
  return [
    "latency",
    "backlog",
    "duplicates",
    "usefulness",
    "rejected",
  ].includes(value);
}

function getIncidentMeasures(state: IncidentState): IncidentMeasures {
  return {
    latency: state.latency,
    backlog: state.backlog,
    duplicates: state.duplicates,
    usefulness: state.usefulness,
    rejected: state.rejected,
  };
}

function cloneIncidentState(state: IncidentState): IncidentState {
  return { ...state };
}

function applyIncidentDelta(
  state: IncidentState,
  delta: IncidentDelta,
): IncidentState {
  return {
    ...state,
    latency: clampIncidentValue(state.latency + (delta.latency ?? 0), 50, 999),
    backlog: clampIncidentValue(state.backlog + (delta.backlog ?? 0), 0, 999),
    duplicates: clampIncidentValue(
      state.duplicates + (delta.duplicates ?? 0),
      0,
      999,
    ),
    usefulness: clampIncidentValue(
      state.usefulness + (delta.usefulness ?? 0),
      0,
      100,
    ),
    rejected: clampIncidentValue(
      state.rejected + (delta.rejected ?? 0),
      0,
      100,
    ),
  };
}

function combineIncidentDeltas(
  first: IncidentDelta,
  second: IncidentDelta,
): IncidentDelta {
  return {
    latency: (first.latency ?? 0) + (second.latency ?? 0),
    backlog: (first.backlog ?? 0) + (second.backlog ?? 0),
    duplicates: (first.duplicates ?? 0) + (second.duplicates ?? 0),
    usefulness: (first.usefulness ?? 0) + (second.usefulness ?? 0),
    rejected: (first.rejected ?? 0) + (second.rejected ?? 0),
  };
}

function clampIncidentValue(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function escapePressureMapHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
