import type { GraphEdge, GraphPoint } from "../../shared/concept-graph.ts";
import {
  conceptSubgroups,
  type ConceptSubgroup,
} from "../../shared/concept-presentation.ts";
import { routeConcepts } from "./concept-routing.ts";

export type ConceptCluster = {
  group: string;
  x: number;
  y: number;
  width: number;
  height: number;
  count: number;
};

export type ConceptSubgroupBounds = ConceptSubgroup & {
  x: number;
  y: number;
  width: number;
  height: number;
};

// Editorial order and equal topic regions make the map a stable reading atlas.
// Subgroups own rows; relationships retain their own obstacle-avoiding routes.
// Placement and routing run only during the build, never in the browser.
export async function layoutOverview(
  nodes: { id: string; group: string }[],
  edges: readonly GraphEdge[],
  groups: readonly string[],
) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const sections = conceptSubgroups
    .filter((subgroup) => groups.includes(subgroup.group))
    .map((subgroup) => ({
      ...subgroup,
      conceptIds: subgroup.conceptIds.filter((id) => nodeById.has(id)),
    }))
    .filter((subgroup) => subgroup.conceptIds.length);
  const groupedIds = new Set(sections.flatMap((section) => section.conceptIds));
  for (const node of nodes) {
    if (!groupedIds.has(node.id))
      throw new Error(`Missing presentation subgroup for concept ${node.id}`);
  }
  const order = [...new Set(sections.map((section) => section.group))];
  if (!order.length) throw new Error("Cannot lay out an empty concept map");

  const cardWidth = 190;
  const horizontalStride = 230;
  const minimumRowStride = 140;
  const firstNodeY = 225;
  const inset = 36;
  const gap = 110;
  const margin = 70;
  const maxMembers = Math.max(
    ...sections.map((section) => section.conceptIds.length),
  );
  const maxRows = Math.max(
    ...order.map(
      (group) => sections.filter((section) => section.group === group).length,
    ),
  );
  const rowSpan = (maxRows - 1) * minimumRowStride;
  const regionWidth =
    (maxMembers - 1) * horizontalStride + cardWidth + inset * 2;
  const regionHeight = firstNodeY + rowSpan + 80;
  const columns = Math.min(2, order.length);
  const clusters: ConceptCluster[] = order.map((group, index) => ({
    group,
    x: margin + (index % columns) * (regionWidth + gap),
    y: margin + Math.floor(index / columns) * (regionHeight + gap),
    width: regionWidth,
    height: regionHeight,
    count: nodes.filter((node) => node.group === group).length,
  }));
  const subgroups: ConceptSubgroupBounds[] = [];
  const points: GraphPoint[] = [];
  for (const cluster of clusters) {
    const members = sections.filter(
      (section) => section.group === cluster.group,
    );
    // Three-row regions share the same first and last baselines as four-row
    // regions, instead of accumulating unused space at their lower edge.
    const stride =
      members.length > 1 ? rowSpan / (members.length - 1) : minimumRowStride;
    members.forEach((section, index) => {
      const nodeY = cluster.y + firstNodeY + index * stride;
      const y = nodeY - 81;
      subgroups.push({
        ...section,
        x: cluster.x + inset,
        y,
        width: regionWidth - inset * 2,
        height: Math.min(stride - 14, cluster.y + regionHeight - inset - y),
      });
      section.conceptIds.forEach((id, column) => {
        if (nodeById.get(id)!.group !== section.group)
          throw new Error(
            `Subgroup ${section.id} has the wrong topic for ${id}`,
          );
        points.push({
          id,
          x: cluster.x + inset + cardWidth / 2 + column * horizontalStride,
          y: nodeY,
        });
      });
    });
  }
  const headings = subgroups.map((subgroup) => ({
    x: subgroup.x - 6,
    y: subgroup.y,
    width: 260,
    height: 26,
  }));
  const routes = await routeConcepts(points, edges, clusters, headings);
  // Include outer detours in the fitted view, not just the aligned rectangles.
  const routePoints = routes.flatMap((route) => route.points);
  const dx = Math.max(0, inset - Math.min(...routePoints.map(({ x }) => x)));
  const dy = Math.max(0, inset - Math.min(...routePoints.map(({ y }) => y)));
  for (const point of [...points, ...clusters, ...subgroups, ...routePoints]) {
    point.x += dx;
    point.y += dy;
  }
  return {
    width: Math.ceil(
      Math.max(
        ...clusters.map((cluster) => cluster.x + cluster.width + margin),
        ...routePoints.map(({ x }) => x + inset),
      ),
    ),
    height: Math.ceil(
      Math.max(
        ...clusters.map((cluster) => cluster.y + cluster.height + margin),
        ...routePoints.map(({ y }) => y + inset),
      ),
    ),
    points,
    clusters,
    subgroups,
    routes,
  };
}
