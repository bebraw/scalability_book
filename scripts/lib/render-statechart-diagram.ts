import ELK from "elkjs/lib/elk.bundled.js";
import { deliveryMachineConfig } from "./delivery-statechart.ts";

type StateConfig = {
  initial?: string;
  on?: Record<string, string>;
  onDone?: string;
  states?: Record<string, StateConfig>;
  type?: string;
};

type DiagramNode = {
  children?: DiagramNode[];
  edges?: DiagramEdge[];
  height?: number;
  id: string;
  labels?: Array<{ height: number; id: string; text: string; width: number }>;
  layoutOptions?: Record<string, string>;
  width?: number;
  x?: number;
  y?: number;
  [key: string]: unknown;
};

type DiagramEdge = {
  id: string;
  layoutOptions?: Record<string, string>;
  labels?: Array<{
    height: number;
    id: string;
    text: string;
    width: number;
    x?: number;
    y?: number;
  }>;
  sections?: Array<{
    bendPoints?: Array<{ x: number; y: number }>;
    endPoint: { x: number; y: number };
    startPoint: { x: number; y: number };
  }>;
  sources: string[];
  targets: string[];
};

const stateMetadata = new Map<
  string,
  { initial: boolean; kind: string; label: string }
>();
const layoutContainers = new Map<string, DiagramNode>();

export async function renderStatechartDiagram(): Promise<string> {
  stateMetadata.clear();
  layoutContainers.clear();
  const edges: DiagramEdge[] = [];
  const graph: DiagramNode & { edges: DiagramEdge[] } = {
    id: "delivery-diagram",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.layered.spacing.nodeNodeBetweenLayers": "78",
      "elk.layered.spacing.edgeNodeBetweenLayers": "28",
      "elk.spacing.edgeNode": "20",
      "elk.spacing.nodeNode": "42",
      "elk.padding": "[top=30,left=30,bottom=30,right=30]",
    },
    children: buildStateNodes(
      deliveryMachineConfig.states as Record<string, StateConfig>,
      [],
      deliveryMachineConfig.initial,
      edges,
    ),
    edges: [],
  };
  distributeEdges(graph, edges);

  const elk = new ELK();
  const laidOut = (await elk.layout(
    graph as never,
  )) as unknown as DiagramNode & {
    edges: DiagramEdge[];
  };
  const width = Math.ceil(Number(laidOut.width) || 1200);
  const height = Math.ceil(Number(laidOut.height) || 620);

  return `<svg
  class="statechart-elk-diagram"
  data-statechart-elk
  viewBox="0 0 ${width} ${height}"
  role="img"
  aria-labelledby="statechart-elk-title statechart-elk-description"
  preserveAspectRatio="xMidYMid meet"
>
  <title id="statechart-elk-title">Change delivery statechart</title>
  <desc id="statechart-elk-description">Planning leads to implementation and parallel verification. Failed tests or requested changes return to implementation. Successful verification enables release, while cancellation can leave the active hierarchy at any point.</desc>
  <defs>
    <marker id="statechart-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 8 4 L 0 8 z"></path>
    </marker>
    <marker id="statechart-arrow-return" class="is-return" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 8 4 L 0 8 z"></path>
    </marker>
    <marker id="statechart-arrow-cancel" class="is-cancel" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 8 4 L 0 8 z"></path>
    </marker>
  </defs>
  <g class="statechart-elk-nodes">${renderNodes(laidOut.children || [], 0, 0)}</g>
  <g class="statechart-elk-edges">${renderEdges(laidOut.edges || [], 0, 0)}${renderNestedEdges(laidOut.children || [], 0, 0)}</g>
</svg>`;
}

function buildStateNodes(
  states: Record<string, StateConfig>,
  parentPath: string[],
  initialState: string | undefined,
  edges: DiagramEdge[],
): DiagramNode[] {
  return Object.entries(states).map(([name, state]) => {
    const path = [...parentPath, name];
    const id = path.join(".");
    const children = state.states
      ? buildStateNodes(state.states, path, state.initial, edges)
      : undefined;
    const kind = state.type || (children ? "compound" : "state");

    stateMetadata.set(id, {
      initial: name === initialState,
      kind,
      label: name,
    });
    addTransitions(id, path, state, edges);

    if (!children) {
      const minimumWidth = kind === "final" ? 148 : 124;
      const labelWidth = name.length * 10 + 36;

      return {
        id,
        width: Math.max(minimumWidth, labelWidth),
        height: 64,
      };
    }

    const direction = state.type === "parallel" ? "DOWN" : "RIGHT";
    const node: DiagramNode = {
      id,
      children,
      edges: [],
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": direction,
        "elk.edgeRouting": "ORTHOGONAL",
        "elk.padding": "[top=54,left=26,bottom=26,right=26]",
        "elk.spacing.nodeNode": state.type === "parallel" ? "28" : "38",
        "elk.layered.spacing.nodeNodeBetweenLayers": "68",
      },
    };
    layoutContainers.set(id, node);
    return node;
  });
}

function distributeEdges(graph: DiagramNode, edges: DiagramEdge[]) {
  for (const edge of edges) {
    const source = edge.sources[0]?.split(".") || [];
    const target = edge.targets[0]?.split(".") || [];
    const shared: string[] = [];

    for (
      let index = 0;
      index < Math.min(source.length, target.length);
      index += 1
    ) {
      if (source[index] !== target[index]) break;
      shared.push(source[index]!);
    }

    const owner = layoutContainers.get(shared.join(".")) || graph;
    owner.edges ||= [];
    owner.edges.push(edge);
  }
}

function addTransitions(
  sourceId: string,
  sourcePath: string[],
  state: StateConfig,
  edges: DiagramEdge[],
) {
  for (const [event, target] of Object.entries(state.on || {})) {
    edges.push(createEdge(sourceId, resolveTarget(sourcePath, target), event));
  }

  if (state.onDone) {
    edges.push(
      createEdge(
        sourceId,
        resolveTarget(sourcePath, state.onDone),
        "both regions final",
      ),
    );
  }
}

function resolveTarget(sourcePath: string[], target: string): string {
  if (target.startsWith(`#${deliveryMachineConfig.id}.`)) {
    return target.slice(deliveryMachineConfig.id.length + 2);
  }

  return [...sourcePath.slice(0, -1), target].join(".");
}

function createEdge(
  source: string,
  target: string,
  label: string,
): DiagramEdge {
  const isReturn = ["TESTS_FAIL", "REQUEST_CHANGES"].includes(label);
  const characterWidth = label === label.toUpperCase() ? 10.5 : 8.2;

  return {
    id: `transition-${source}-${label}-${target}`,
    sources: [source],
    targets: [target],
    layoutOptions: {
      "elk.layered.priority.direction": isReturn ? "1" : "20",
    },
    labels: [
      {
        id: `label-${source}-${label}`,
        text: label,
        width: Math.max(72, label.length * characterWidth + 36),
        height: 32,
      },
    ],
  };
}

function renderNodes(
  nodes: DiagramNode[],
  parentX: number,
  parentY: number,
): string {
  return nodes
    .map((node) => {
      const x = parentX + Number(node.x || 0);
      const y = parentY + Number(node.y || 0);
      const width = Number(node.width || 124);
      const height = Number(node.height || 64);
      const metadata = stateMetadata.get(node.id) || {
        initial: false,
        kind: "state",
        label: node.id,
      };
      const classes = [
        "statechart-elk-node",
        `is-${metadata.kind}`,
        metadata.initial ? "is-initial" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const container = Boolean(node.children?.length);
      const labelY = container ? y + 27 : y + height / 2 + 5;
      const labelX = container
        ? x + 14
        : x + width / 2 + (metadata.kind === "final" ? 8 : 0);
      const kindLabel =
        metadata.kind === "parallel" ? "parallel" : metadata.kind;
      const finalMark =
        metadata.kind === "final"
          ? `<circle class="statechart-elk-final-mark" cx="${x + 18}" cy="${y + height / 2}" r="5.5"></circle>`
          : "";
      const initialMark = metadata.initial
        ? `<text class="statechart-elk-initial" x="${x + width - 10}" y="${container ? y + 27 : y + 16}" text-anchor="end">initial</text>`
        : "";
      const kind = container
        ? `<text class="statechart-elk-kind" x="${x + 14}" y="${y + 43}">${escapeXml(kindLabel)} state</text>`
        : "";

      return `<g class="${classes}" data-state-path="${escapeXml(node.id)}">
  <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="9"></rect>
  ${finalMark}
  <text class="statechart-elk-label" x="${labelX}" y="${labelY}"${container ? "" : ' text-anchor="middle"'}>${escapeXml(metadata.label)}</text>
  ${kind}
  ${initialMark}
  ${node.children ? renderNodes(node.children, x, y) : ""}
</g>`;
    })
    .join("");
}

function renderNestedEdges(
  nodes: DiagramNode[],
  parentX: number,
  parentY: number,
): string {
  return nodes
    .map((node) => {
      const x = parentX + Number(node.x || 0);
      const y = parentY + Number(node.y || 0);
      return `${renderEdges(node.edges || [], x, y)}${renderNestedEdges(node.children || [], x, y)}`;
    })
    .join("");
}

function renderEdges(edges: DiagramEdge[], offsetX: number, offsetY: number) {
  return edges
    .map((edge) => {
      const label = edge.labels?.[0];
      const event = label?.text || "transition";
      const special = ["TESTS_FAIL", "REQUEST_CHANGES"].includes(event)
        ? "is-return"
        : event === "CANCEL"
          ? "is-cancel"
          : "";
      const paths = (edge.sections || [])
        .map((section) => {
          const points = [
            section.startPoint,
            ...(section.bendPoints || []),
            section.endPoint,
          ];
          const marker = special
            ? `statechart-arrow-${special.slice(3)}`
            : "statechart-arrow";
          return `<path d="${points.map((point, index) => `${index ? "L" : "M"} ${round(point.x + offsetX)} ${round(point.y + offsetY)}`).join(" ")}" marker-end="url(#${marker})"></path>`;
        })
        .join("");
      const renderedLabel = label
        ? `<g class="statechart-elk-edge-label" transform="translate(${round((label.x || 0) + offsetX)} ${round((label.y || 0) + offsetY)})">
  <rect width="${round(label.width)}" height="${round(label.height)}" rx="11"></rect>
  <text x="${round(label.width / 2)}" y="${round(label.height / 2 + 5.5)}" text-anchor="middle">${escapeXml(event)}</text>
</g>`
        : "";

      return `<g class="statechart-elk-edge ${special}" data-transition-event="${escapeXml(event)}">
  <title>${escapeXml(event)}: ${escapeXml(edge.sources[0] || "")} to ${escapeXml(edge.targets[0] || "")}</title>
  ${paths}
  ${renderedLabel}
</g>`;
    })
    .join("");
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
