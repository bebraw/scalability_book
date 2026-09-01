type FlowNode = {
  detail: readonly string[];
  id: string;
  kicker: string;
  title: readonly string[];
  tone?: "danger" | "emphasis";
};

type FlowNote = {
  detail: readonly string[];
  id: string;
  kicker: string;
};

export type LinearFlowDiagram = {
  description: string;
  feedback?: string;
  id: string;
  nodeHeight: number;
  nodes: readonly FlowNode[];
  notes?: readonly FlowNote[];
  title: string;
};

const left = 34;
const nodeGap = 42;
const nodeTop = 76;
const nodeWidth = 194;

export const pressureEvidenceDiagram: LinearFlowDiagram = {
  id: "pressure-evidence",
  title: "Reason from pressure to evidence",
  description:
    "A five-step reasoning chain moves from a named pressure to the first binding limit, a targeted response, its new trade-off, and evidence that can challenge the claim and begin another pass.",
  nodeHeight: 174,
  nodes: [
    {
      id: "pressure",
      kicker: "1 · INPUT",
      title: ["Pressure"],
      detail: ["Name what changes", "and its plausible range"],
    },
    {
      id: "binding-limit",
      kicker: "2 · LOCATE",
      title: ["Binding limit"],
      detail: ["Find the first boundary", "that threatens the goal"],
    },
    {
      id: "response",
      kicker: "3 · INTERVENE",
      title: ["Response"],
      detail: ["Act at that limit", "rather than elsewhere"],
      tone: "emphasis",
    },
    {
      id: "trade-off",
      kicker: "4 · ACCOUNT",
      title: ["Trade-off"],
      detail: ["Name cost, waiting,", "complexity, or risk", "moved elsewhere"],
    },
    {
      id: "evidence",
      kicker: "5 · CHALLENGE",
      title: ["Evidence"],
      detail: ["Repeat a bounded", "observation of the goal"],
    },
  ],
  feedback: "Evidence can revise the limit, response, or original claim",
};

export const dependencyFailureDiagram: LinearFlowDiagram = {
  id: "dependency-failure",
  title: "How site traffic became a dependency-wide outage",
  description:
    "High production traffic passed through two incorrectly cached Next.js paths. Site demand was amplified into GitHub API traffic until the quota was exhausted, and the site had no meaningful fallback. Local traffic never reached the limit; load testing, quota monitoring, and a fallback would have exposed or reduced the risk.",
  nodeHeight: 190,
  nodes: [
    {
      id: "production-traffic",
      kicker: "PRESSURE",
      title: ["Production", "traffic"],
      detail: ["High-volume page", "requests arrive"],
    },
    {
      id: "cache-paths",
      kicker: "AMPLIFICATION",
      title: ["Two uncached", "paths"],
      detail: ["Requests bypass the", "intended caching"],
      tone: "emphasis",
    },
    {
      id: "github-traffic",
      kicker: "DEPENDENCY",
      title: ["GitHub API", "traffic"],
      detail: ["Site demand becomes", "backend API demand"],
    },
    {
      id: "quota",
      kicker: "BINDING LIMIT",
      title: ["Quota", "exhausted"],
      detail: ["GitHub rejects calls", "until the reset"],
      tone: "danger",
    },
    {
      id: "outage",
      kicker: "USER OUTCOME",
      title: ["Site-wide", "outage"],
      detail: ["Meaningful content", "has no fallback"],
      tone: "danger",
    },
  ],
  notes: [
    {
      id: "local-blind-spot",
      kicker: "WHY LOCAL LOOKED HEALTHY",
      detail: ["Development traffic never approached the external quota."],
    },
    {
      id: "missing-controls",
      kicker: "CONTROLS THAT WOULD HAVE HELPED",
      detail: ["Load testing · quota monitoring · a bounded fallback"],
    },
  ],
};

export function renderLinearFlowDiagram(diagram: LinearFlowDiagram): string {
  if (diagram.nodes.length < 2) {
    throw new Error("A linear flow diagram requires at least two nodes");
  }

  const width =
    left * 2 +
    diagram.nodes.length * nodeWidth +
    (diagram.nodes.length - 1) * nodeGap;
  const noteTop = nodeTop + diagram.nodeHeight + 58;
  const height = diagram.notes ? noteTop + 112 : noteTop + 62;
  const markerId = `${diagram.id}-arrow`;
  const titleId = `${diagram.id}-title`;
  const descriptionId = `${diagram.id}-description`;
  const nodeCenters = diagram.nodes.map(
    (_node, index) => left + index * (nodeWidth + nodeGap) + nodeWidth / 2,
  );

  return `<svg
  class="book-diagram linear-flow-diagram"
  data-book-diagram="${escapeXml(diagram.id)}"
  viewBox="0 0 ${width} ${height}"
  role="img"
  aria-labelledby="${titleId} ${descriptionId}"
  preserveAspectRatio="xMidYMid meet"
>
  <title id="${titleId}">${escapeXml(diagram.title)}</title>
  <desc id="${descriptionId}">${escapeXml(diagram.description)}</desc>
  <defs>
    <marker id="${markerId}" class="book-diagram-marker" viewBox="0 0 8 8" refX="8" refY="4" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M 0 0 L 8 4 L 0 8 z"></path>
    </marker>
  </defs>

  <g class="linear-flow-connectors" aria-hidden="true">
    ${diagram.nodes
      .slice(0, -1)
      .map((_node, index) => {
        const sourceX = left + index * (nodeWidth + nodeGap) + nodeWidth;
        const targetX = left + (index + 1) * (nodeWidth + nodeGap) - 10;
        const y = nodeTop + diagram.nodeHeight / 2;
        return `<path d="M ${sourceX} ${y} L ${targetX} ${y}" marker-end="url(#${markerId})"></path>`;
      })
      .join("\n    ")}
  </g>

  <g class="linear-flow-nodes">
    ${diagram.nodes
      .map((node, index) => renderNode(node, index))
      .join("\n    ")}
  </g>

  ${diagram.feedback ? renderFeedback(diagram.feedback) : ""}
  ${diagram.notes ? renderNotes(diagram.notes) : ""}
</svg>`;

  function renderNode(node: FlowNode, index: number): string {
    const x = left + index * (nodeWidth + nodeGap);
    const titleY = nodeTop + 63;
    const detailY = titleY + (node.title.length - 1) * 23 + 35;
    const classes = [
      "book-diagram-node",
      "linear-flow-node",
      node.tone ? `is-${node.tone}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    return `<g class="${classes}" data-diagram-container="${escapeXml(node.id)}" data-diagram-node="${escapeXml(node.id)}">
      <rect x="${x}" y="${nodeTop}" width="${nodeWidth}" height="${diagram.nodeHeight}" rx="12"></rect>
      <text class="book-diagram-kicker" x="${x + 18}" y="${nodeTop + 29}">${escapeXml(node.kicker)}</text>
      <text class="book-diagram-title" x="${x + 18}" y="${titleY}">${renderLines(node.title, x + 18, 23)}</text>
      <text class="book-diagram-detail" x="${x + 18}" y="${detailY}">${renderLines(node.detail, x + 18, 21)}</text>
    </g>`;
  }

  function renderFeedback(label: string): string {
    const firstCenter = nodeCenters[0]!;
    const lastCenter = nodeCenters.at(-1)!;
    const lineY = noteTop + 12;
    const labelWidth = 470;
    const labelX = width / 2 - labelWidth / 2;

    return `<g class="linear-flow-feedback" data-diagram-container="feedback">
      <path d="M ${lastCenter} ${nodeTop + diagram.nodeHeight} L ${lastCenter} ${lineY} L ${firstCenter} ${lineY} L ${firstCenter} ${nodeTop + diagram.nodeHeight + 10}" marker-end="url(#${markerId})"></path>
      <rect x="${labelX}" y="${lineY - 20}" width="${labelWidth}" height="40" rx="20"></rect>
      <text x="${width / 2}" y="${lineY + 5}" text-anchor="middle">${escapeXml(label)}</text>
    </g>`;
  }

  function renderNotes(notes: readonly FlowNote[]): string {
    const noteGap = 24;
    const noteWidth =
      (width - left * 2 - noteGap * (notes.length - 1)) / notes.length;

    return `<g class="linear-flow-notes">
      ${notes
        .map((note, index) => {
          const x = left + index * (noteWidth + noteGap);
          return `<g class="linear-flow-note" data-diagram-container="${escapeXml(note.id)}">
          <rect x="${x}" y="${noteTop}" width="${noteWidth}" height="88" rx="10"></rect>
          <text class="book-diagram-kicker" x="${x + 18}" y="${noteTop + 29}">${escapeXml(note.kicker)}</text>
          <text class="book-diagram-detail" x="${x + 18}" y="${noteTop + 59}">${renderLines(note.detail, x + 18, 20)}</text>
        </g>`;
        })
        .join("\n      ")}
    </g>`;
  }
}

function renderLines(
  lines: readonly string[],
  x: number,
  lineHeight: number,
): string {
  return lines
    .map(
      (line, index) =>
        `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join("");
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
