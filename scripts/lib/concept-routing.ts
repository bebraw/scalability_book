import { AvoidLib } from "libavoid-js";
import type { GraphEdge, GraphPoint } from "../../shared/concept-graph.ts";

let initialized: Promise<void> | undefined;

// Build-only visibility-graph/A* routing. Nodes and region headings are
// obstacles; equivalent side pins allow a choice of attachment positions.
// Extra heading boxes reserve subgroup labels without blocking entire rows.
export async function routeConcepts(
  points: GraphPoint[],
  edges: readonly GraphEdge[],
  regions: { x: number; y: number; width: number; height: number }[],
  headings: { x: number; y: number; width: number; height: number }[] = [],
) {
  await (initialized ??= AvoidLib.load());
  const avoid = AvoidLib.getInstance();
  const router = new avoid.Router(avoid.OrthogonalRouting);
  try {
    for (const [parameter, value] of [
      [avoid.segmentPenalty, 40],
      [avoid.crossingPenalty, 500],
      [avoid.fixedSharedPathPenalty, 500],
      [avoid.shapeBufferDistance, 12],
      [avoid.idealNudgingDistance, 10],
    ])
      router.setRoutingParameter(parameter!, value!);
    router.setRoutingOption(
      avoid.nudgeOrthogonalSegmentsConnectedToShapes,
      true,
    );
    const rectangle = (x: number, y: number, width: number, height: number) => {
      const a = new avoid.Point(x, y),
        b = new avoid.Point(x + width, y + height);
      const polygon = new avoid.Rectangle(a, b);
      const shape = new avoid.ShapeRef(router, polygon);
      // ShapeRef copies the polygon. Router owns shapes and their pins.
      avoid.destroy(polygon);
      avoid.destroy(a);
      avoid.destroy(b);
      return shape;
    };
    for (const region of regions)
      rectangle(region.x + 12, region.y + 12, region.width - 24, 60);
    for (const heading of headings)
      rectangle(heading.x, heading.y, heading.width, heading.height);
    const shapes = new Map(
      points.map((point) => {
        const shape = rectangle(point.x - 95, point.y - 30, 190, 60);
        for (const [x, y, direction] of [
          [0, 0.5, avoid.ConnDirLeft],
          [1, 0.5, avoid.ConnDirRight],
          [0.5, 0, avoid.ConnDirUp],
          [0.5, 1, avoid.ConnDirDown],
        ]) {
          const pin = new avoid.ShapeConnectionPin(
            shape,
            1,
            x!,
            y!,
            true,
            0,
            direction!,
          );
          pin.setExclusive(false);
        }
        return [point.id, shape] as const;
      }),
    );
    const connectors = edges.map((edge) => {
      const source = new avoid.ConnEnd(shapes.get(edge.source)!, 1);
      const target = new avoid.ConnEnd(shapes.get(edge.target)!, 1);
      const connector = new avoid.ConnRef(router, source, target);
      connector.setHateCrossings(true);
      avoid.destroy(source);
      avoid.destroy(target);
      return connector;
    });
    router.processTransaction();
    return connectors.map((connector, index) => {
      const line = connector.displayRoute();
      if (line.size() < 2)
        throw new Error(
          `No route for ${edges[index]!.source} → ${edges[index]!.target}`,
        );
      const route = Array.from({ length: line.size() }, (_, i) => {
        const point = line.get_ps(i);
        return {
          x: Math.round(point.x * 1000) / 1000,
          y: Math.round(point.y * 1000) / 1000,
        };
      }).filter(
        (point, i, route) =>
          !i || point.x !== route[i - 1]!.x || point.y !== route[i - 1]!.y,
      );
      return { ...edges[index]!, points: route };
    });
  } finally {
    // Router destruction also deletes its remaining shapes and connectors.
    avoid.destroy(router);
  }
}
