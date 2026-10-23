type LatencyDistanceKey = "userApp" | "appDb";
type LatencyPoint = { x: number; y: number };
type DatabasePlacement = {
  name: string;
  impact: string;
  caveat: string;
};
type HardwareProfile = {
  name: string;
  appWork: number;
  databaseExec: number;
  impact: string;
};

const fiberKilometersPerMillisecond = 200;
const appPoint: LatencyPoint = { x: 390, y: 82 };
const userPoints: Record<number, LatencyPoint> = {
  25: { x: 376, y: 85 },
  500: { x: 340, y: 78 },
  1500: { x: 292, y: 72 },
  7000: { x: 132, y: 102 },
};
const dbPoints: Record<number, LatencyPoint> = {
  1: { x: 407, y: 91 },
  25: { x: 421, y: 92 },
  500: { x: 470, y: 100 },
  1500: { x: 536, y: 125 },
};
const databasePlacements: Record<number, DatabasePlacement> = {
  1: {
    name: "Edge read replica",
    impact:
      "Reads stay close to the application, but writes may still coordinate with a primary database.",
    caveat:
      "Best fit: cached reads, product catalogs, timelines, and other paths that can tolerate replication lag.",
  },
  25: {
    name: "Same metro primary",
    impact:
      "The database is close enough for most interactive requests while keeping one clear source of truth.",
    caveat:
      "Best fit: ordinary transactional paths where correctness matters more than shaving the last millisecond.",
  },
  500: {
    name: "Regional managed database",
    impact:
      "Each query pays a visible network tax. Sequential database calls can become more expensive than application work.",
    caveat:
      "Best fit: simpler operations when users and application servers are concentrated in one region.",
  },
  1500: {
    name: "Home-region primary",
    impact:
      "A distant primary makes every database round trip expensive, especially when the endpoint asks questions one at a time.",
    caveat:
      "Best fit: centralized writes or compliance constraints, but usually paired with caching, batching, or replicas.",
  },
};
const fallbackDatabasePlacement: DatabasePlacement = databasePlacements[1] ?? {
  name: "Database placement",
  impact:
    "The database placement controls how much network wait each query adds.",
  caveat:
    "Measure the read and write path separately before choosing a placement strategy.",
};
const hardwareProfiles: Record<string, HardwareProfile> = {
  shared: {
    name: "Shared or small instance",
    appWork: 35,
    databaseExec: 18,
    impact:
      "Limited CPU, memory, and cache make each stop slower before network distance is counted.",
  },
  production: {
    name: "Typical production instance",
    appWork: 20,
    databaseExec: 8,
    impact:
      "Ordinary compute and database performance: hardware matters, but round trips can still dominate.",
  },
  tuned: {
    name: "Tuned database and warm cache",
    appWork: 12,
    databaseExec: 3,
    impact:
      "Better hardware, indexes, and warm caches reduce service time inside the app and database.",
  },
  contended: {
    name: "CPU or disk contention",
    appWork: 55,
    databaseExec: 30,
    impact:
      "Noisy neighbors, disk waits, or saturated CPU make every query expensive even when the database is nearby.",
  },
};
const fallbackHardwareProfile: HardwareProfile =
  hardwareProfiles.production ?? {
    name: "Custom manual values",
    appWork: 20,
    databaseExec: 8,
    impact:
      "Manual app and database execution values show server work separately from distance.",
  };

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-latency-demo]",
)) {
  initializeLatencyDemo(root);
}

function initializeLatencyDemo(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>("[data-latency-demo-form]");
  const distanceInputs = Array.from(
    root.querySelectorAll<HTMLSelectElement>("[data-latency-demo-distance]"),
  );
  const overhead = root.querySelector<HTMLInputElement>(
    "[data-latency-demo-overhead]",
  );
  const overheadOutput = root.querySelector<HTMLOutputElement>(
    "[data-latency-demo-overhead-output]",
  );
  const hardware = root.querySelector<HTMLSelectElement>(
    "[data-latency-demo-hardware]",
  );
  const roundtrips = root.querySelector<HTMLInputElement>(
    "[data-latency-demo-db-roundtrips]",
  );
  const roundtripsOutput = root.querySelector<HTMLOutputElement>(
    "[data-latency-demo-db-roundtrips-output]",
  );
  const dbExec = root.querySelector<HTMLInputElement>(
    "[data-latency-demo-db-exec]",
  );
  const dbExecOutput = root.querySelector<HTMLOutputElement>(
    "[data-latency-demo-db-exec-output]",
  );
  const appWork = root.querySelector<HTMLInputElement>(
    "[data-latency-demo-app-work]",
  );
  const appWorkOutput = root.querySelector<HTMLOutputElement>(
    "[data-latency-demo-app-work-output]",
  );
  const metrics = Array.from(
    root.querySelectorAll<HTMLElement>("[data-latency-demo-metric]"),
  );
  const mapLabels = Array.from(
    root.querySelectorAll<HTMLElement>("[data-latency-demo-map]"),
  );
  const verdict = root.querySelector<HTMLElement>(
    "[data-latency-demo-verdict]",
  );
  const breakdown = root.querySelector<HTMLElement>(
    "[data-latency-demo-breakdown]",
  );
  const interpretation = root.querySelector<HTMLElement>(
    "[data-latency-demo-interpretation]",
  );
  const steps = Array.from(
    root.querySelectorAll<HTMLElement>("[data-latency-demo-step]"),
  );
  const tabs = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-latency-demo-tab]"),
  );
  const previous = root.querySelector<HTMLButtonElement>(
    "[data-latency-demo-prev]",
  );
  const next = root.querySelector<HTMLButtonElement>(
    "[data-latency-demo-next]",
  );

  if (
    !form ||
    !overhead ||
    !overheadOutput ||
    !hardware ||
    !roundtrips ||
    !roundtripsOutput ||
    !dbExec ||
    !dbExecOutput ||
    !appWork ||
    !appWorkOutput ||
    !verdict ||
    !breakdown ||
    !interpretation ||
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
    updateLatencyStage(
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
    const distances = getLatencyDistances(distanceInputs);
    const overheadMultiplier = Number(overhead.value);
    const databaseRoundtrips = Number(roundtrips.value);
    const databaseExec = Number(dbExec.value);
    const applicationWork = Number(appWork.value);
    const result = calculateLatencyBudget({
      distances,
      overheadMultiplier,
      databaseRoundtrips,
      databaseExec,
      applicationWork,
    });

    overheadOutput.value = `${overheadMultiplier.toFixed(1)}x`;
    overheadOutput.textContent = `${overheadMultiplier.toFixed(1)}x`;
    roundtripsOutput.value = String(databaseRoundtrips);
    roundtripsOutput.textContent = String(databaseRoundtrips);
    dbExecOutput.value = `${databaseExec} ms`;
    dbExecOutput.textContent = `${databaseExec} ms`;
    appWorkOutput.value = `${applicationWork} ms`;
    appWorkOutput.textContent = `${applicationWork} ms`;
    updateLatencyMetrics(metrics, result);
    updateLatencyMap(root, mapLabels, distances, result);
    updateDatabasePlacementCopy(root, distances.appDb);
    updateHardwareProfileCopy(root, hardware.value);
    verdict.textContent = `${Math.round(result.total)} ms modeled response`;
    breakdown.innerHTML = buildLatencyBreakdown(result)
      .map((item) => `<li>${escapeLatencyHtml(item)}</li>`)
      .join("");
    interpretation.textContent = buildLatencyInterpretation(result);
    updateLatencyStage(root, steps, tabs, previous, next, currentStep, false);
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (currentStep < steps.length - 1) {
      showStep(currentStep + 1, true);
    }
  });
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  hardware.addEventListener("change", () => {
    applyHardwareProfile(hardware.value, appWork, dbExec);
  });
  [appWork, dbExec].forEach((input) => {
    input.addEventListener("input", () => {
      hardware.value = "custom";
    });
  });
  previous.addEventListener("click", () => showStep(currentStep - 1, true));
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => showStep(index, true));
  });

  render();
  showStep(0);
}

function updateLatencyMap(
  root: HTMLElement,
  labels: HTMLElement[],
  distances: Record<LatencyDistanceKey, number>,
  result: ReturnType<typeof calculateLatencyBudget>,
) {
  const fallbackUserPoint: LatencyPoint = { x: 340, y: 78 };
  const fallbackDbPoint: LatencyPoint = { x: 407, y: 91 };
  const userPoint = userPoints[distances.userApp] ?? fallbackUserPoint;
  const dbPoint = dbPoints[distances.appDb] ?? fallbackDbPoint;
  const userNode = root.querySelector<SVGGElement>(
    "[data-latency-demo-node='user']",
  );
  const appNode = root.querySelector<SVGGElement>(
    "[data-latency-demo-node='app']",
  );
  const dbNode = root.querySelector<SVGGElement>(
    "[data-latency-demo-node='db']",
  );
  const userRoute = root.querySelector<SVGPathElement>(
    "[data-latency-demo-route='userApp']",
  );
  const dbRoute = root.querySelector<SVGPathElement>(
    "[data-latency-demo-route='appDb']",
  );

  userNode?.setAttribute("transform", pointTransform(userPoint));
  appNode?.setAttribute("transform", pointTransform(appPoint));
  dbNode?.setAttribute("transform", pointTransform(dbPoint));
  userRoute?.setAttribute("d", routePath(userPoint, appPoint, -42));
  dbRoute?.setAttribute("d", routePath(appPoint, dbPoint, 32));
  root.style.setProperty(
    "--latency-user-route-width",
    String(routeWidth(distances.userApp)),
  );
  root.style.setProperty(
    "--latency-db-route-width",
    String(routeWidth(distances.appDb)),
  );

  labels.forEach((label) => {
    const key = label.dataset.latencyDemoMap;

    if (key === "userDistance") {
      label.textContent = `${distances.userApp.toLocaleString()} km`;
    } else if (key === "dbDistance") {
      label.textContent = `${distances.appDb.toLocaleString()} km`;
    } else if (key === "userLatency") {
      label.textContent = `${formatLatency(result.userRttFloor)} ms RTT floor`;
    } else if (key === "dbLatency") {
      label.textContent = `${formatLatency(result.dbRttFloor)} ms RTT floor`;
    }
  });
}

function pointTransform(point: LatencyPoint) {
  return `translate(${point.x} ${point.y})`;
}

function routePath(start: LatencyPoint, end: LatencyPoint, bend: number) {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2 + bend;

  return `M${start.x} ${start.y} Q${midX} ${midY} ${end.x} ${end.y}`;
}

function routeWidth(distanceKm: number) {
  return Math.max(2, Math.min(10, 2 + Math.log10(distanceKm + 1) * 2));
}

function getLatencyDistances(inputs: HTMLSelectElement[]) {
  return inputs.reduce(
    (distances, input) => {
      const key = input.dataset.latencyDemoDistance as
        | LatencyDistanceKey
        | undefined;

      if (key) {
        distances[key] = Number(input.value);
      }

      return distances;
    },
    { userApp: 500, appDb: 1 } as Record<LatencyDistanceKey, number>,
  );
}

function calculateLatencyBudget({
  distances,
  overheadMultiplier,
  databaseRoundtrips,
  databaseExec,
  applicationWork,
}: {
  distances: Record<LatencyDistanceKey, number>;
  overheadMultiplier: number;
  databaseRoundtrips: number;
  databaseExec: number;
  applicationWork: number;
}) {
  const userRttFloor = roundTripFloor(distances.userApp);
  const dbRttFloor = roundTripFloor(distances.appDb);
  const userNetwork = userRttFloor * overheadMultiplier;
  const dbNetworkPerTrip = dbRttFloor * overheadMultiplier;
  const sequentialDb = databaseRoundtrips * (dbNetworkPerTrip + databaseExec);
  const batchedTrips = Math.min(2, databaseRoundtrips);
  const batchedDb =
    batchedTrips * dbNetworkPerTrip + databaseRoundtrips * databaseExec;
  const physical = userRttFloor + databaseRoundtrips * dbRttFloor;
  const total = userNetwork + sequentialDb + applicationWork;
  const avoidable = Math.max(0, sequentialDb - batchedDb);

  return {
    userRttFloor,
    dbRttFloor,
    userNetwork,
    dbNetworkPerTrip,
    databaseRoundtrips,
    databaseExec,
    applicationWork,
    serverExecution: databaseRoundtrips * databaseExec + applicationWork,
    sequentialDb,
    batchedDb,
    physical,
    total,
    avoidable,
  };
}

function roundTripFloor(distanceKm: number) {
  return (distanceKm / fiberKilometersPerMillisecond) * 2;
}

function updateLatencyMetrics(
  nodes: HTMLElement[],
  result: ReturnType<typeof calculateLatencyBudget>,
) {
  nodes.forEach((node) => {
    const key = node.dataset.latencyDemoMetric;

    if (key === "userFloor") {
      node.textContent = `${formatLatency(result.userRttFloor)} ms`;
    } else if (key === "dbFloor") {
      node.textContent = `${formatLatency(result.dbRttFloor)} ms`;
    } else if (key === "sequentialDb") {
      node.textContent = `${formatLatency(result.sequentialDb)} ms`;
    } else if (key === "batchedDb") {
      node.textContent = `${formatLatency(result.batchedDb)} ms`;
    } else if (key === "roundtripPenalty") {
      node.textContent = `${formatLatency(result.avoidable)} ms`;
    } else if (key === "dbTripNetwork") {
      node.textContent = `${formatLatency(result.dbNetworkPerTrip)} ms`;
    } else if (key === "serverExecution") {
      node.textContent = `${formatLatency(result.serverExecution)} ms`;
    } else if (key === "total") {
      node.textContent = `${formatLatency(result.total)} ms`;
    } else if (key === "physical") {
      node.textContent = `${formatLatency(result.physical)} ms`;
    } else if (key === "avoidable") {
      node.textContent = `${formatLatency(result.avoidable)} ms`;
    } else if (key === "hundred") {
      node.textContent = `${(result.total / 10).toFixed(1)} s`;
    }
  });
}

function updateDatabasePlacementCopy(root: HTMLElement, distanceKm: number) {
  const placement = databasePlacements[distanceKm] ?? fallbackDatabasePlacement;

  root
    .querySelectorAll<HTMLElement>("[data-latency-demo-db-placement]")
    .forEach((node) => {
      node.textContent = placement.name;
    });
  root
    .querySelectorAll<HTMLElement>("[data-latency-demo-db-impact]")
    .forEach((node) => {
      node.textContent = placement.impact;
    });
  root
    .querySelectorAll<HTMLElement>("[data-latency-demo-db-caveat]")
    .forEach((node) => {
      node.textContent = placement.caveat;
    });
}

function applyHardwareProfile(
  key: string,
  appWork: HTMLInputElement,
  dbExec: HTMLInputElement,
) {
  const profile = hardwareProfiles[key];

  if (!profile) {
    return;
  }

  appWork.value = String(profile.appWork);
  dbExec.value = String(profile.databaseExec);
}

function updateHardwareProfileCopy(root: HTMLElement, key: string) {
  const profile =
    key === "custom" ? fallbackHardwareProfile : hardwareProfiles[key];
  const resolvedProfile = profile ?? fallbackHardwareProfile;

  root
    .querySelectorAll<HTMLElement>("[data-latency-demo-hardware-name]")
    .forEach((node) => {
      node.textContent =
        key === "custom" ? "Custom manual values" : resolvedProfile.name;
    });
  root
    .querySelectorAll<HTMLElement>("[data-latency-demo-hardware-impact]")
    .forEach((node) => {
      node.textContent =
        key === "custom"
          ? "Manual app and database execution values show server work separately from distance."
          : resolvedProfile.impact;
    });
}

function buildLatencyBreakdown(
  result: ReturnType<typeof calculateLatencyBudget>,
) {
  return [
    `User to application network wait: about ${formatLatency(result.userNetwork)} ms, including routing overhead.`,
    `${result.databaseRoundtrips} sequential database round trips: about ${formatLatency(
      result.sequentialDb,
    )} ms.`,
    `Application work before response: ${formatLatency(result.applicationWork)} ms.`,
    `The physical network floor alone is about ${formatLatency(
      result.physical,
    )} ms before server, database, and routing overhead.`,
    `Batching the database access into at most two round trips would save roughly ${formatLatency(
      result.avoidable,
    )} ms on this path.`,
  ];
}

function buildLatencyInterpretation(
  result: ReturnType<typeof calculateLatencyBudget>,
) {
  const databaseNetwork = result.databaseRoundtrips * result.dbNetworkPerTrip;
  return `Modeled user-to-application network wait is ${formatLatency(result.userNetwork)} ms; database network wait is ${formatLatency(databaseNetwork)} ms; server execution is ${formatLatency(result.serverExecution)} ms. Batching into at most two trips saves ${formatLatency(result.avoidable)} ms of repeated database network wait while keeping query execution unchanged. Compare placement and query changes separately, including their correctness and operating obligations, before choosing an intervention.`;
}

function formatLatency(value: number) {
  if (value < 10) {
    return value.toFixed(1);
  }

  return String(Math.round(value));
}

function updateLatencyStage(
  root: HTMLElement,
  steps: HTMLElement[],
  tabs: HTMLButtonElement[],
  previous: HTMLButtonElement,
  next: HTMLButtonElement,
  currentStep: number,
  focusStep: boolean,
) {
  const finalStep = steps.length - 1;

  root.dataset.latencyDemoCurrentStep = String(currentStep);
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

function escapeLatencyHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
