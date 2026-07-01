type DimensionKey = "users" | "data" | "teams" | "change" | "cost";
type PressureKey =
  | "traffic"
  | "history"
  | "contributors"
  | "requirements"
  | "budget";

type Dimension = {
  label: string;
  component: string;
  signal: string;
  tradeoff: string;
};

type Pressure = {
  label: string;
  weights: Record<DimensionKey, number>;
};

type RadarPoint = {
  x: number;
  y: number;
};

type RadarGeometry = {
  maxScore: number;
  scorePoints: RadarPoint[];
};

type RadarAnimationState = {
  frame: number;
};

const dimensions: Record<DimensionKey, Dimension> = {
  users: {
    label: "Users",
    component: "Request path and concurrency limits",
    signal: "p95 latency, error rate, and queue depth during peaks",
    tradeoff: "Capacity techniques can add cost and operational complexity.",
  },
  data: {
    label: "Data",
    component: "Event storage, indexes, and derived views",
    signal: "write latency, query time, storage growth, and retention cost",
    tradeoff: "Keeping all data exact and queryable can become expensive.",
  },
  teams: {
    label: "Teams",
    component: "Module boundaries, ownership, and contracts",
    signal:
      "pull request size, review delay, duplicated work, and merge conflicts",
    tradeoff:
      "More boundaries help coordination but require explicit contracts.",
  },
  change: {
    label: "Change",
    component: "Tests, schemas, migrations, and decision records",
    signal: "time to change one event rule without breaking old behavior",
    tradeoff:
      "Fast iteration needs guardrails, not only faster code generation.",
  },
  cost: {
    label: "Cost and energy",
    component: "Compute, storage, bandwidth, and repeated work",
    signal: "useful events processed per unit of infrastructure",
    tradeoff: "Overprovisioning may hide problems while wasting resources.",
  },
};

const pressures: Record<PressureKey, Pressure> = {
  traffic: {
    label: "Many people submit events at the same time",
    weights: { users: 3, data: 1, teams: 0, change: 0, cost: 1 },
  },
  history: {
    label: "Event history grows for months",
    weights: { users: 0, data: 3, teams: 0, change: 1, cost: 2 },
  },
  contributors: {
    label: "Several teams or agents change the codebase",
    weights: { users: 0, data: 0, teams: 3, change: 2, cost: 0 },
  },
  requirements: {
    label: "Event types and rules change every week",
    weights: { users: 0, data: 1, teams: 1, change: 3, cost: 0 },
  },
  budget: {
    label: "Infrastructure cost and energy use must stay bounded",
    weights: { users: 1, data: 1, teams: 0, change: 0, cost: 3 },
  },
};

const dimensionOrder: DimensionKey[] = [
  "users",
  "data",
  "teams",
  "change",
  "cost",
];

const radarCenter = 120;
const radarRadius = 72;
const radarLabelRadius = 99;
const radarAnimationDuration = 360;
const radarMaxScore = Math.max(
  1,
  ...dimensionOrder.map((dimensionKey) =>
    Object.values(pressures).reduce(
      (total, pressure) => total + pressure.weights[dimensionKey],
      0,
    ),
  ),
);

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-dimensions-demo]",
)) {
  initializeDimensionsDemo(root);
}

function initializeDimensionsDemo(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>(
    "[data-dimensions-demo-form]",
  );
  const inputs = Array.from(
    root.querySelectorAll<HTMLInputElement>("[data-dimensions-demo-pressure]"),
  );
  const radar = root.querySelector<HTMLElement>("[data-dimensions-demo-radar]");
  const metrics = Array.from(
    root.querySelectorAll<HTMLElement>("[data-dimensions-demo-metric]"),
  );
  const verdict = root.querySelector<HTMLElement>(
    "[data-dimensions-demo-verdict]",
  );
  const interpretation = root.querySelector<HTMLElement>(
    "[data-dimensions-demo-interpretation]",
  );

  if (!form || !radar || !verdict || !interpretation) {
    return;
  }

  let previousGeometry: RadarGeometry | undefined;
  const animationState: RadarAnimationState = { frame: 0 };

  const render = () => {
    const selected = getSelectedPressures(inputs);
    const scores = calculateDimensionScores(selected);
    const primary = getPrimaryDimension(scores);
    const nextGeometry = getRadarGeometry(scores);

    if (!radar.querySelector("[data-dimensions-demo-radar-chart]")) {
      radar.innerHTML = buildDimensionRadar(scores, nextGeometry);
    } else {
      updateRadarVertexTitles(radar, scores);
      animateRadarGeometry(
        radar,
        previousGeometry ?? nextGeometry,
        nextGeometry,
        animationState,
      );
    }

    previousGeometry = nextGeometry;
    updateDimensionMetrics(metrics, primary);
    verdict.textContent = buildDimensionsVerdict(selected, primary);
    interpretation.textContent = buildDimensionsInterpretation(
      selected,
      primary,
    );
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });
  form.addEventListener("change", render);

  render();
}

function getSelectedPressures(inputs: HTMLInputElement[]) {
  return inputs
    .filter((input) => input.checked)
    .map((input) => input.value)
    .filter(isPressureKey);
}

function isPressureKey(value: string): value is PressureKey {
  return value in pressures;
}

function calculateDimensionScores(selected: PressureKey[]) {
  const scores = Object.fromEntries(
    dimensionOrder.map((key) => [key, 0]),
  ) as Record<DimensionKey, number>;

  selected.forEach((pressureKey) => {
    const pressure = pressures[pressureKey];

    dimensionOrder.forEach((dimensionKey) => {
      scores[dimensionKey] += pressure.weights[dimensionKey];
    });
  });

  return scores;
}

function getPrimaryDimension(scores: Record<DimensionKey, number>) {
  return dimensionOrder.reduce((best, current) =>
    scores[current] > scores[best] ? current : best,
  );
}

function getRadarGeometry(scores: Record<DimensionKey, number>): RadarGeometry {
  const scorePoints = dimensionOrder.map((key, index) => {
    const angle = getRadarAngle(index);
    const scoreRadius = (scores[key] / radarMaxScore) * radarRadius;

    return getRadarPoint(radarCenter, radarCenter, scoreRadius, angle);
  });

  return { maxScore: radarMaxScore, scorePoints };
}

function buildDimensionRadar(
  scores: Record<DimensionKey, number>,
  geometry: RadarGeometry,
) {
  const axisPoints = dimensionOrder.map((key, index) => {
    const angle = getRadarAngle(index);
    const outer = getRadarPoint(radarCenter, radarCenter, radarRadius, angle);
    const label = getRadarPoint(
      radarCenter,
      radarCenter,
      radarLabelRadius,
      angle,
    );

    return { angle, key, label, outer };
  });
  const rings = [0.25, 0.5, 0.75, 1]
    .map((scale) =>
      axisPoints
        .map(({ angle }) =>
          formatRadarPoint(
            getRadarPoint(radarCenter, radarCenter, radarRadius * scale, angle),
          ),
        )
        .join(" "),
    )
    .map(
      (points) =>
        `<polygon class="dimensions-demo-radar-ring" points="${points}" />`,
    )
    .join("");
  const axes = axisPoints
    .map(
      ({ key, label, outer }) =>
        `<line class="dimensions-demo-radar-axis" x1="${radarCenter}" y1="${radarCenter}" x2="${outer.x}" y2="${outer.y}" />
        <circle class="dimensions-demo-radar-point" cx="${outer.x}" cy="${outer.y}" r="2.6" />
        <text class="dimensions-demo-radar-label" x="${label.x}" y="${label.y}">${escapeDimensionsHtml(getRadarLabel(key))}</text>`,
    )
    .join("");
  const scorePoints = geometry.scorePoints
    .map((score) => formatRadarPoint(score))
    .join(" ");
  const selectedPoints = geometry.scorePoints
    .map((score, index) => {
      const key = dimensionOrder[index] ?? "users";

      return `<circle class="dimensions-demo-radar-score-point" data-dimensions-demo-radar-vertex="${key}" cx="${score.x}" cy="${score.y}" r="3.8">
          <title>${escapeDimensionsHtml(dimensions[key].label)}: ${scores[key]} pressure point${scores[key] === 1 ? "" : "s"}</title>
        </circle>`;
    })
    .join("");

  return `<figure class="dimensions-demo-radar-chart" data-dimensions-demo-radar-chart>
    <svg viewBox="0 0 240 240" role="img" aria-labelledby="dimensions-radar-title dimensions-radar-desc" focusable="false">
      <title id="dimensions-radar-title">Scalability dimensions radar</title>
      <desc id="dimensions-radar-desc">A five-axis radar chart comparing pressure points for users, data, teams, change, and cost.</desc>
      <g class="dimensions-demo-radar-grid">
        ${rings}
        ${axes}
      </g>
      <polygon class="dimensions-demo-radar-shape" data-dimensions-demo-radar-shape points="${scorePoints}" />
      ${selectedPoints}
    </svg>
  </figure>`;
}

function updateRadarVertexTitles(
  radar: HTMLElement,
  scores: Record<DimensionKey, number>,
) {
  dimensionOrder.forEach((key) => {
    const vertex = radar.querySelector<SVGCircleElement>(
      `[data-dimensions-demo-radar-vertex="${key}"]`,
    );
    const title = vertex?.querySelector("title");

    if (title) {
      title.textContent = `${dimensions[key].label}: ${scores[key]} pressure point${scores[key] === 1 ? "" : "s"}`;
    }
  });
}

function animateRadarGeometry(
  radar: HTMLElement,
  from: RadarGeometry,
  to: RadarGeometry,
  animationState: RadarAnimationState,
) {
  const shape = radar.querySelector<SVGPolygonElement>(
    "[data-dimensions-demo-radar-shape]",
  );
  const vertices = Array.from(
    radar.querySelectorAll<SVGCircleElement>(
      "[data-dimensions-demo-radar-vertex]",
    ),
  );

  if (!shape || vertices.length !== dimensionOrder.length) {
    return;
  }

  cancelAnimationFrame(animationState.frame);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    applyRadarGeometry(shape, vertices, to.scorePoints);
    animationState.frame = 0;

    return;
  }

  const startedAt = performance.now();
  const frame = (now: number) => {
    const progress = Math.min((now - startedAt) / radarAnimationDuration, 1);
    const eased = easeOutCubic(progress);
    const points = to.scorePoints.map((target, index) => {
      const origin = from.scorePoints[index] ?? target;

      return {
        x: origin.x + (target.x - origin.x) * eased,
        y: origin.y + (target.y - origin.y) * eased,
      };
    });

    applyRadarGeometry(shape, vertices, points);

    if (progress < 1) {
      animationState.frame = requestAnimationFrame(frame);
    } else {
      animationState.frame = 0;
    }
  };

  animationState.frame = requestAnimationFrame(frame);
}

function applyRadarGeometry(
  shape: SVGPolygonElement,
  vertices: SVGCircleElement[],
  points: RadarPoint[],
) {
  shape.setAttribute("points", points.map(formatRadarPoint).join(" "));
  vertices.forEach((vertex, index) => {
    const point = points[index] ??
      points[0] ?? { x: radarCenter, y: radarCenter };

    vertex.setAttribute("cx", String(point.x));
    vertex.setAttribute("cy", String(point.y));
  });
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function getRadarAngle(index: number) {
  return -Math.PI / 2 + (index * 2 * Math.PI) / dimensionOrder.length;
}

function getRadarPoint(
  centerX: number,
  centerY: number,
  radius: number,
  angle: number,
) {
  return {
    x: Math.round((centerX + Math.cos(angle) * radius) * 10) / 10,
    y: Math.round((centerY + Math.sin(angle) * radius) * 10) / 10,
  };
}

function formatRadarPoint(point: { x: number; y: number }) {
  return `${point.x},${point.y}`;
}

function getRadarLabel(key: DimensionKey) {
  return key === "cost" ? "Cost" : dimensions[key].label;
}

function updateDimensionMetrics(nodes: HTMLElement[], primary: DimensionKey) {
  const dimension = dimensions[primary];

  nodes.forEach((node) => {
    const key = node.dataset.dimensionsDemoMetric;

    if (key === "primary") {
      node.textContent = dimension.label;
    } else if (key === "component") {
      node.textContent = dimension.component;
    } else if (key === "signal") {
      node.textContent = dimension.signal;
    }
  });
}

function buildDimensionsVerdict(
  selected: PressureKey[],
  primary: DimensionKey,
) {
  if (selected.length === 0) {
    return "Pick project pressures";
  }

  return `${selected.length} pressure${selected.length === 1 ? "" : "s"} point to ${dimensions[primary].label}`;
}

function buildDimensionsInterpretation(
  selected: PressureKey[],
  primary: DimensionKey,
) {
  if (selected.length === 0) {
    return "Choose pressures that would matter if the event tracker succeeded.";
  }

  return `${dimensions[primary].label} scalability matters first, but the trade-off is: ${dimensions[primary].tradeoff}`;
}

function escapeDimensionsHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
