import type { GraphEdge, RoutePoint } from "./concept-graph.ts";

export type LabelBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};
export type RoutedLabel = RoutePoint & {
  width: number;
  anchorX: number;
  anchorY: number;
};

export function connectionLabelWidth(label: string) {
  return Math.max(50, label.length * 7 + 14);
}

function box(x: number, y: number, width: number, height: number): LabelBounds {
  return {
    left: x - width / 2,
    right: x + width / 2,
    top: y - height / 2,
    bottom: y + height / 2,
  };
}

export function segmentBounds(a: RoutePoint, b: RoutePoint): LabelBounds {
  return {
    left: Math.min(a.x, b.x),
    right: Math.max(a.x, b.x),
    top: Math.min(a.y, b.y),
    bottom: Math.max(a.y, b.y),
  };
}

function intersects(a: LabelBounds, b: LabelBounds) {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  );
}

export function overviewHeadingBounds(
  regions: readonly RoutePoint[],
  subgroups: readonly (RoutePoint & { width: number })[],
  scale: number,
): LabelBounds[] {
  // Detailed and exported maps scale section positions while keeping their text
  // at its reading size. Reserve both the subgroup title and its right-aligned count.
  return [
    ...regions.map(({ x, y }) => box(x * scale + 118, y * scale + 35, 220, 70)),
    ...subgroups.flatMap(({ x, y, width }) => [
      box(x * scale + 126, y * scale + 11, 260, 30),
      box((x + width) * scale - 10, y * scale + 11, 28, 30),
    ]),
  ];
}

export function layoutRouteLabels(
  nodes: readonly RoutePoint[],
  edges: readonly (GraphEdge & {
    label: string;
    route?: RoutePoint[] | undefined;
  })[],
  bounds: { width: number; height: number },
  protectedAreas: LabelBounds[],
  preview: string,
) {
  const routes = edges
    .filter((edge) => edge.route?.length)
    .map((edge) => {
      const segments = edge.route!.slice(1).map((b, i) => {
        const a = edge.route![i]!;
        return {
          a,
          b,
          bounds: segmentBounds(a, b),
          length: Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
        };
      });
      return {
        edge,
        segments,
        length: segments.reduce((sum, s) => sum + s.length, 0),
      };
    })
    .sort((a, b) => a.length - b.length);
  const labels = new Map<GraphEdge, RoutedLabel>();
  const padding = preview ? 3 : 7;
  const obstacles = [
    ...protectedAreas,
    ...nodes.map((p) => box(p.x, p.y, 190 + padding * 2, 60 + padding * 2)),
  ];
  // The unexpanded map has narrower corridors. A preview can place a label
  // up to one card width away to keep a neighboring shaft visible.
  const gaps = preview
    ? [-6, 7, 32, 56, 80, 104, 128, 152, 176]
    : [-6, 7, 32, 56, 80];
  // Short, direct connections have few possible label positions. Reserve those
  // first so a long detour can use another part of its route.
  for (const route of routes) {
    const width = connectionLabelWidth(route.edge.label);
    // Keep preview labels near the concept the reader is tracing when its
    // route extends beyond the viewport.
    const preferred =
      route.edge.source === preview
        ? 0
        : route.edge.target === preview
          ? 1
          : 0.5;
    const others = routes
      .filter((r) => r !== route)
      .flatMap((r) => r.segments.map((s) => s.bounds));
    let best: RoutedLabel | undefined;
    let bestScore = Infinity;
    let distance = 0;
    for (const { a, b, length } of route.segments) {
      const horizontal = a.y === b.y;
      const side = horizontal ? 11 : width / 2;
      const offsets = [
        0,
        ...gaps.flatMap((gap) => [side + gap, -(side + gap)]),
      ];
      const steps = Math.max(1, Math.ceil(length / 20));
      for (let i = 0; i < steps; i++) {
        const t = (i + 0.5) / steps;
        const anchorX = a.x + (b.x - a.x) * t;
        const anchorY = a.y + (b.y - a.y) * t;
        const proximity = Math.abs(
          (distance + length * t) / route.length - preferred,
        );
        const nearBend =
          Math.min(t, 1 - t) * length < (horizontal ? width / 2 : 11) + 8;
        // First try inline positions, including shifting the text box toward
        // one side of a vertical lane. Only a crowded lane needs a leader.
        for (const offset of offsets) {
          let score =
            proximity +
            Number(nearBend) +
            Number(offset !== 0) +
            Math.max(0, Math.abs(offset) - side);
          if (score >= bestScore) continue;
          const x = anchorX + (horizontal ? 0 : offset);
          const y = anchorY + (horizontal ? offset : 0);
          const rect = box(x, y, width, 22);
          const leader = box(
            (x + anchorX) / 2,
            (y + anchorY) / 2,
            Math.abs(x - anchorX) + 1,
            Math.abs(y - anchorY) + 1,
          );
          if (
            rect.left < 4 ||
            rect.right > bounds.width - 4 ||
            rect.top < 4 ||
            rect.bottom > bounds.height - 4 ||
            obstacles.some(
              (obstacle) =>
                intersects(rect, obstacle) || intersects(leader, obstacle),
            )
          )
            continue;
          if (others.some((other) => intersects(rect, other))) continue;
          for (const other of others) {
            // A text box masks a crossing shaft entirely. A leader crossing
            // is still visible, but prefer a clear approach whenever possible.
            if (intersects(leader, other)) score += 12;
            if (score >= bestScore) break;
          }
          if (score < bestScore) {
            bestScore = score;
            best = { x, y, width, anchorX, anchorY };
          }
        }
      }
      distance += length;
    }
    if (best) {
      labels.set(route.edge, best);
      obstacles.push(box(best.x, best.y, width + 8, 30));
    }
  }
  return labels;
}
