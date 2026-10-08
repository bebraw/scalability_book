export type ProgressionStage = {
  build: string;
  phase: string;
  setup: readonly [string, string];
};

export type ProgressionDiagram = {
  carryForward: string;
  description: string;
  id: string;
  outcome: {
    detail: string;
    title: readonly string[];
  };
  reset: string;
  shared: {
    detail: string;
    title: string;
  };
  stages: readonly ProgressionStage[];
  title: string;
};

const stageWidth = 224;
const stageHeight = 184;
const stageGap = 64;
const left = 34;
const stageTop = 222;
const outcomeWidth = 240;

export const courseProgressionDiagram: ProgressionDiagram = {
  id: "course-progression",
  title: "One application, three development systems",
  description:
    "A shared Work Activity Tracker specification feeds three fresh implementations. Domain knowledge, evidence, and development skill accumulate from Establish through Challenge and Compare, while application code and implementation-specific tests do not carry between builds. Establish uses a large model, Challenge a small model, and Compare a declared fleet of small models, large models, or a mixture. The three results are compared at the end.",
  shared: {
    title: "One Work Activity Tracker specification",
    detail: "Acceptance material · pressures · reporting categories",
  },
  stages: [
    {
      phase: "Establish",
      build: "Implementation A",
      setup: ["Large model", "Single-agent workflow"],
    },
    {
      phase: "Challenge",
      build: "Implementation B",
      setup: ["Small model", "Single-agent workflow"],
    },
    {
      phase: "Compare",
      build: "Implementation C",
      setup: ["Declared agent fleet", "Small, large, or mixed"],
    },
  ],
  outcome: {
    title: ["Compare three builds", "and development", "systems"],
    detail: "Reflect on evidence, trade-offs, and fit",
  },
  carryForward: "Domain knowledge · evidence · development skill",
  reset:
    "Fresh implementation each phase: application code and implementation-specific tests do not carry forward",
};

export function renderProgressionDiagram(diagram: ProgressionDiagram): string {
  if (diagram.stages.length < 2) {
    throw new Error("A progression diagram requires at least two stages");
  }

  const outcomeX = left + diagram.stages.length * (stageWidth + stageGap);
  const width = outcomeX + outcomeWidth + left;
  const height = 590;
  const sharedWidth =
    diagram.stages.length * stageWidth + (diagram.stages.length - 1) * stageGap;
  const stageCenters = diagram.stages.map(
    (_stage, index) => left + index * (stageWidth + stageGap) + stageWidth / 2,
  );
  const outcomeCenter = outcomeX + outcomeWidth / 2;
  const railY = 456;
  const titleId = `${diagram.id}-title`;
  const descriptionId = `${diagram.id}-description`;
  const arrowId = `${diagram.id}-arrow`;
  const sharedArrowId = `${diagram.id}-shared-arrow`;

  return `<svg
  class="book-diagram progression-diagram"
  data-book-diagram="${escapeXml(diagram.id)}"
  data-progression-diagram="${escapeXml(diagram.id)}"
  viewBox="0 0 ${width} ${height}"
  role="img"
  aria-labelledby="${titleId} ${descriptionId}"
  preserveAspectRatio="xMidYMid meet"
>
  <title id="${titleId}">${escapeXml(diagram.title)}</title>
  <desc id="${descriptionId}">${escapeXml(diagram.description)}</desc>
  <defs>
    <marker id="${arrowId}" class="progression-arrow-marker" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M 0 0 L 8 4 L 0 8 z"></path>
    </marker>
    <marker id="${sharedArrowId}" class="progression-shared-arrow-marker" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M 0 0 L 8 4 L 0 8 z"></path>
    </marker>
  </defs>

  <g class="progression-shared" data-progression-container="shared">
    <rect x="${left}" y="24" width="${sharedWidth}" height="112" rx="12"></rect>
    <text class="progression-kicker" x="${left + 22}" y="53">SHARED ACROSS EVERY BUILD</text>
    <text class="progression-shared-title" x="${left + 22}" y="83">${escapeXml(diagram.shared.title)}</text>
    <text class="progression-detail" x="${left + 22}" y="111">${escapeXml(diagram.shared.detail)}</text>
  </g>

  <g class="progression-shared-links" aria-hidden="true">
    ${stageCenters
      .map(
        (center) =>
          `<path d="M ${center} 136 L ${center} ${stageTop - 12}" marker-end="url(#${sharedArrowId})"></path>`,
      )
      .join("\n    ")}
  </g>

  <g class="progression-stages">
    ${diagram.stages.map((stage, index) => renderStage(stage, index)).join("\n    ")}
  </g>

  <g class="progression-learning" data-progression-container="carry-forward" aria-hidden="true">
    ${stageCenters
      .map(
        (center) =>
          `<path d="M ${center} ${stageTop + stageHeight} L ${center} ${railY}"></path>`,
      )
      .join("\n    ")}
    <path d="M ${stageCenters[0]} ${railY} L ${outcomeCenter} ${railY} L ${outcomeCenter} ${stageTop + stageHeight}" marker-end="url(#${arrowId})"></path>
    <rect x="${left + 18}" y="435" width="${Math.min(600, sharedWidth - 36)}" height="37" rx="18.5"></rect>
    <text x="${left + 36}" y="460">CARRY FORWARD · ${escapeXml(diagram.carryForward)}</text>
  </g>

  <g class="progression-outcome" data-progression-container="outcome">
    <rect x="${outcomeX}" y="${stageTop}" width="${outcomeWidth}" height="${stageHeight}" rx="12"></rect>
    <text class="progression-kicker" x="${outcomeX + 20}" y="${stageTop + 31}">FINAL REFLECTION</text>
    <text class="progression-outcome-title" x="${outcomeX + 20}" y="${stageTop + 69}">
      ${diagram.outcome.title
        .map(
          (line, index) =>
            `<tspan x="${outcomeX + 20}" dy="${index === 0 ? 0 : 25}">${escapeXml(line)}</tspan>`,
        )
        .join("\n      ")}
    </text>
    <text class="progression-detail" x="${outcomeX + 20}" y="${stageTop + 150}">
      ${renderWrappedText(diagram.outcome.detail, outcomeX + 20, 21, 23)}
    </text>
  </g>

  <g class="progression-reset" data-progression-container="reset">
    <rect x="${left}" y="509" width="${width - left * 2}" height="55" rx="9"></rect>
    <path d="M ${left + 20} 527 L ${left + 36} 543 M ${left + 36} 527 L ${left + 20} 543"></path>
    <text x="${left + 53}" y="540">${escapeXml(diagram.reset)}</text>
  </g>
</svg>`;

  function renderStage(stage: ProgressionStage, index: number): string {
    const x = left + index * (stageWidth + stageGap);

    return `<g class="progression-stage" data-progression-container="stage-${index + 1}" data-progression-stage="${escapeXml(stage.phase.toLocaleLowerCase())}">
      <rect x="${x}" y="${stageTop}" width="${stageWidth}" height="${stageHeight}" rx="12"></rect>
      <text class="progression-kicker" x="${x + 20}" y="${stageTop + 31}">PHASE ${index + 1} · ${escapeXml(stage.phase.toLocaleUpperCase())}</text>
      <text class="progression-stage-title" x="${x + 20}" y="${stageTop + 70}">${escapeXml(stage.build)}</text>
      <text class="progression-detail" x="${x + 20}" y="${stageTop + 104}">
        <tspan x="${x + 20}" dy="0">${escapeXml(stage.setup[0])}</tspan>
        <tspan x="${x + 20}" dy="25">${escapeXml(stage.setup[1])}</tspan>
      </text>
      <g class="progression-fresh" data-progression-container="stage-${index + 1}-fresh-codebase">
        <rect x="${x + 20}" y="${stageTop + 145}" width="136" height="25" rx="12.5"></rect>
        <text x="${x + 33}" y="${stageTop + 162}">FRESH CODEBASE</text>
      </g>
    </g>`;
  }
}

function renderWrappedText(
  value: string,
  x: number,
  maximumCharacters: number,
  lineHeight: number,
): string {
  const lines = wrapWords(value, maximumCharacters);
  return lines
    .map(
      (line, index) =>
        `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join("");
}

function wrapWords(value: string, maximumCharacters: number): string[] {
  const lines: string[] = [];

  for (const word of value.split(/\s+/)) {
    const current = lines.at(-1);
    if (!current || current.length + word.length + 1 > maximumCharacters) {
      lines.push(word);
    } else {
      lines[lines.length - 1] = `${current} ${word}`;
    }
  }

  return lines;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
