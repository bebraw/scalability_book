type LatencyDistanceKey = "userApp" | "appDb";
type LatencyPoint = { x: number; y: number };
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
  if (
    !form ||
    !overhead ||
    !overheadOutput ||
    !roundtrips ||
    !roundtripsOutput ||
    !dbExec ||
    !dbExecOutput ||
    !appWork ||
    !appWorkOutput ||
    !verdict ||
    !breakdown ||
    !interpretation
  ) {
    return;
  }

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
    verdict.textContent = `${Math.round(result.total)} ms modeled response`;
    breakdown.innerHTML = buildLatencyBreakdown(result)
      .map((item) => `<li>${escapeLatencyHtml(item)}</li>`)
      .join("");
    interpretation.textContent = buildLatencyInterpretation(result);
  };

  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  render();
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
    } else if (key === "batchedTotal") {
      node.textContent = `${formatLatency(result.total - result.avoidable)} ms`;
    }
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
    `If query dependencies allow at most two trips, batching would save ${formatLatency(
      result.avoidable,
    )} ms on this path.`,
  ];
}

function buildLatencyInterpretation(
  result: ReturnType<typeof calculateLatencyBudget>,
) {
  const databaseNetwork = result.databaseRoundtrips * result.dbNetworkPerTrip;
  return `Modeled user-to-application network wait is ${formatLatency(result.userNetwork)} ms; database network wait is ${formatLatency(databaseNetwork)} ms; server execution is ${formatLatency(result.serverExecution)} ms. Batching into at most two trips saves ${formatLatency(result.avoidable)} ms of repeated database network wait while keeping query execution unchanged. This assumes query inputs are available in at most two dependency rounds, identical results and unchanged total query execution. If those assumptions fail, the saving does not follow.`;
}

function formatLatency(value: number) {
  if (value < 10) {
    return value.toFixed(1);
  }

  return String(Math.round(value));
}

function escapeLatencyHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
