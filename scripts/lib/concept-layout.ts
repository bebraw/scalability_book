import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode } from "elkjs/lib/elk-api.js";
import type { GraphEdge, GraphPoint } from "../../shared/concept-graph.ts";
import { routeConcepts } from "./concept-routing.ts";

export type ConceptCluster = {
  group: string;
  x: number;
  y: number;
  width: number;
  height: number;
  count: number;
};

// Keep placement, packing and routing separate. A global layered layout
// otherwise stretches mutually connected topics into a chain. These stages
// run at build time; the browser still receives ordinary SVG.
export async function layoutOverview(
  nodes: { id: string; group: string }[],
  edges: readonly GraphEdge[],
  groups: readonly string[],
) {
  const elk = new ELK();
  const local: ElkNode[] = [];
  for (const group of groups) {
    const ids = new Set(
      nodes.filter((node) => node.group === group).map(({ id }) => id),
    );
    local.push(
      await elk.layout({
        id: group,
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": "DOWN",
          "elk.edgeRouting": "ORTHOGONAL",
          "elk.randomSeed": "17",
          "elk.spacing.nodeNode": "48",
          "elk.spacing.componentComponent": "48",
          "elk.layered.spacing.nodeNodeBetweenLayers": "48",
          "elk.spacing.edgeNode": "18",
          "elk.spacing.edgeEdge": "12",
          "elk.padding": "[top=100,left=36,bottom=36,right=36]",
        },
        children: [...ids].map((id) => ({ id, width: 190, height: 60 })),
        edges: edges
          .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
          .map((edge, index) => ({
            id: `local-${index}`,
            sources: [edge.source],
            targets: [edge.target],
          })),
      }),
    );
  }
  const groupOf = new Map(nodes.map((node) => [node.id, node.group]));
  const localPoint = new Map(
    local.flatMap((region) =>
      region.children!.map((node) => [node.id, node] as const),
    ),
  );
  const aspect = 1.8;
  let best: { layout: ElkNode; score: number } | undefined;
  // Exhaustive for the current four regions; bounded if the taxonomy grows.
  for (const order of candidateOrders(local)) {
    const layout: ElkNode = await elk.layout({
      id: "concepts",
      layoutOptions: {
        "elk.algorithm": "rectpacking",
        "elk.aspectRatio": String(aspect),
        "elk.spacing.nodeNode": "120",
        "elk.padding": "[top=100,left=100,bottom=100,right=100]",
        "elk.rectpacking.widthApproximation.optimizationGoal":
          "MAX_SCALE_DRIVEN",
      },
      children: order.map((region) => ({
        id: region.id,
        width: region.width!,
        height: region.height!,
      })),
    });
    const boxes = new Map(layout.children!.map((box) => [box.id, box]));
    let distance = 0;
    for (const edge of edges) {
      const a = boxes.get(groupOf.get(edge.source)!)!,
        b = boxes.get(groupOf.get(edge.target)!)!;
      if (a === b) continue;
      const source = localPoint.get(edge.source)!,
        target = localPoint.get(edge.target)!;
      distance +=
        Math.abs(a.x! + source.x! - b.x! - target.x!) +
        Math.abs(a.y! + source.y! - b.y! - target.y!);
    }
    // Reward readable fitted scale and shorter cross-topic connections.
    const fitted = Math.min(aspect / layout.width!, 1 / layout.height!);
    const score = distance / (fitted * fitted);
    if (!best || score < best.score) best = { layout, score };
  }
  const packed = best!.layout;
  const packedByGroup = new Map(packed.children!.map((box) => [box.id, box]));
  const clusters: ConceptCluster[] = [];
  const points: GraphPoint[] = [];
  // Output order remains the authored topic order, independent of placement.
  for (const region of local) {
    const box = packedByGroup.get(region.id)!;
    clusters.push({
      group: region.id,
      x: box.x!,
      y: box.y!,
      width: box.width!,
      height: box.height!,
      count: region.children!.length,
    });
    for (const node of region.children!)
      points.push({
        id: node.id,
        x: box.x! + node.x! + 95,
        y: box.y! + node.y! + 30,
      });
  }
  const routes = await routeConcepts(points, edges, clusters);
  // Include outer detours in the fitted view, not just the packed rectangles.
  const routePoints = routes.flatMap((route) => route.points);
  const dx = Math.max(0, 36 - Math.min(...routePoints.map(({ x }) => x)));
  const dy = Math.max(0, 36 - Math.min(...routePoints.map(({ y }) => y)));
  for (const point of [...points, ...clusters, ...routePoints]) {
    point.x += dx;
    point.y += dy;
  }
  return {
    width: Math.ceil(
      Math.max(packed.width! + dx, ...routePoints.map(({ x }) => x + 36)),
    ),
    height: Math.ceil(
      Math.max(packed.height! + dy, ...routePoints.map(({ y }) => y + 36)),
    ),
    points,
    clusters,
    routes,
  };
}

function candidateOrders<T>(items: T[]): T[][] {
  const orders: T[][] = [];
  const visit = (prefix: T[], remaining: T[]) => {
    if (orders.length >= 24) return;
    if (!remaining.length) {
      orders.push(prefix);
      return;
    }
    remaining.forEach((item, index) =>
      visit(
        [...prefix, item],
        remaining.filter((_, i) => i !== index),
      ),
    );
  };
  visit([], items);
  return orders;
}
