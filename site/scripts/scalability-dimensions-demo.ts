type DimensionKey = "demand" | "data" | "contributors" | "change";
type PressureKey = "traffic" | "history" | "contributors" | "requirements";

type Dimension = {
  label: string;
  radarLabel: string;
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
  scorePoints: RadarPoint[];
};

type RadarAnimationState = {
  frame: number;
};

const dimensions: Record<DimensionKey, Dimension> = {
  demand: {
    label: "Demand",
    radarLabel: "Demand",
    component:
      "Browser work, request paths, dependencies, and compute capacity",
    signal:
      "tail latency, error rate, utilization, and queue depth during peaks",
    tradeoff:
      "Extra capacity can improve headroom while increasing cost and operational complexity.",
  },
  data: {
    label: "Data",
    radarLabel: "Data",
    component: "Event storage, indexes, and derived views",
    signal:
      "write latency, query time, storage growth, recovery time, and retention cost",
    tradeoff:
      "Keeping all history exact, available, and immediately queryable can become expensive.",
  },
  contributors: {
    label: "Contributors",
    radarLabel: "Contributors",
    component: "Project guidance, ownership, review capacity, and integration",
    signal:
      "lead time, review delay, conflicting changes, rework, and failed integrations",
    tradeoff:
      "More parallel human or agent work can increase output faster than the project can review and integrate it.",
  },
  change: {
    label: "Change",
    radarLabel: "Change",
    component:
      "Contracts, dependencies, migrations, tests, and deployment paths",
    signal:
      "change fan-out, regression rate, migration effort, and recovery time",
    tradeoff:
      "Stronger compatibility and review controls preserve safety while adding work to each change.",
  },
};

const pressures: Record<PressureKey, Pressure> = {
  traffic: {
    label: "Many people submit events at the same time",
    weights: {
      demand: 3,
      data: 1,
      contributors: 0,
      change: 0,
    },
  },
  history: {
    label: "Event history grows for months",
    weights: {
      demand: 1,
      data: 3,
      contributors: 0,
      change: 0,
    },
  },
  contributors: {
    label: "Several teams or agents change the codebase",
    weights: {
      demand: 0,
      data: 0,
      contributors: 3,
      change: 1,
    },
  },
  requirements: {
    label: "Event types and rules change every week",
    weights: {
      demand: 0,
      data: 0,
      contributors: 1,
      change: 3,
    },
  },
};

const dimensionOrder: DimensionKey[] = [
  "demand",
  "data",
  "contributors",
  "change",
];

const radarCenter = 120;
const radarRadius = 72;
const radarLabelRadius = 92;
const radarAnimationDuration = 360;
const dimensionMaximums = Object.fromEntries(
  dimensionOrder.map((dimensionKey) => [
    dimensionKey,
    Object.values(pressures).reduce(
      (total, pressure) => total + pressure.weights[dimensionKey],
      0,
    ),
  ]),
) as Record<DimensionKey, number>;

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
    const pressurePoints = calculateDimensionScores(selected);
    const scores = normalizeDimensionScores(pressurePoints);
    const primary = getPrimaryDimensions(scores);
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
    updateDimensionMetrics(metrics, selected.length === 0 ? [] : primary);
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

function normalizeDimensionScores(scores: Record<DimensionKey, number>) {
  return Object.fromEntries(
    dimensionOrder.map((dimension) => [
      dimension,
      scores[dimension] / Math.max(1, dimensionMaximums[dimension]),
    ]),
  ) as Record<DimensionKey, number>;
}

function getPrimaryDimensions(scores: Record<DimensionKey, number>) {
  const highestScore = Math.max(...Object.values(scores));

  return dimensionOrder.filter(
    (dimension) => scores[dimension] === highestScore,
  );
}

function getRadarGeometry(scores: Record<DimensionKey, number>): RadarGeometry {
  const scorePoints = dimensionOrder.map((key, index) => {
    const angle = getRadarAngle(index);
    const scoreRadius = scores[key] * radarRadius;

    return getRadarPoint(radarCenter, radarCenter, scoreRadius, angle);
  });

  return { scorePoints };
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
      const key = dimensionOrder[index] ?? "demand";

      return `<circle class="dimensions-demo-radar-score-point" data-dimensions-demo-radar-vertex="${key}" cx="${score.x}" cy="${score.y}" r="3.8">
          <title>${escapeDimensionsHtml(dimensions[key].label)}: ${formatDimensionExposure(scores[key])}</title>
        </circle>`;
    })
    .join("");

  return `<figure class="dimensions-demo-radar-chart" data-dimensions-demo-radar-chart>
    <svg viewBox="0 0 240 240" role="img" aria-labelledby="dimensions-radar-title dimensions-radar-desc" focusable="false">
      <title id="dimensions-radar-title">Scalability dimensions radar</title>
      <desc id="dimensions-radar-desc">A four-axis radar chart comparing each dimension's share of the maximum modeled pressure for demand, data, contributors, and change.</desc>
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
      title.textContent = `${dimensions[key].label}: ${formatDimensionExposure(scores[key])}`;
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
  return dimensions[key].radarLabel;
}

function updateDimensionMetrics(nodes: HTMLElement[], primary: DimensionKey[]) {
  nodes.forEach((node) => {
    const key = node.dataset.dimensionsDemoMetric;

    if (primary.length === 0) {
      node.textContent = "-";
    } else if (key === "primary") {
      node.textContent = formatDimensionList(primary);
    } else if (key === "component") {
      node.textContent = primary
        .map((dimension) => dimensions[dimension].component)
        .join("; ");
    } else if (key === "signal") {
      node.textContent = primary
        .map((dimension) => dimensions[dimension].signal)
        .join("; ");
    }
  });
}

function buildDimensionsVerdict(
  selected: PressureKey[],
  primary: DimensionKey[],
) {
  if (selected.length === 0) {
    return "Pick project pressures";
  }

  return `${selected.length} pressure${selected.length === 1 ? "" : "s"}: ${formatCompactDimensionList(primary)}`;
}

function buildDimensionsInterpretation(
  selected: PressureKey[],
  primary: DimensionKey[],
) {
  if (selected.length === 0) {
    return "Choose pressures that would matter if the event tracker succeeded.";
  }

  if (primary.length === 1) {
    const dimension = dimensions[primary[0] ?? "demand"];

    return `${dimension.label} has the highest relative pressure. ${dimension.tradeoff}`;
  }

  return `${formatDimensionList(primary)} share the highest relative pressure, showing why scalability cannot be reduced to one axis. ${primary.map((dimension) => dimensions[dimension].tradeoff).join(" ")}`;
}

function formatDimensionList(keys: DimensionKey[]) {
  const labels = keys.map((key) => dimensions[key].label);

  if (labels.length < 2) {
    return labels[0] ?? "";
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function formatCompactDimensionList(keys: DimensionKey[]) {
  const labels = keys.map((key) => dimensions[key].radarLabel);

  if (labels.length < 2) {
    return labels[0] ?? "";
  }

  return `${labels.slice(0, -1).join(", ")} + ${labels[labels.length - 1]}`;
}

function formatDimensionExposure(score: number) {
  return `${Math.round(score * 100)}% of modeled pressure`;
}

function escapeDimensionsHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
