export type GraphPoint = { id: string; x: number; y: number };
export type GraphEdge = { source: string; target: string };

export type RoutePoint = { x: number; y: number };
export type GraphLayout = {
  width: number;
  height: number;
  points: GraphPoint[];
  routeFor?(edge: GraphEdge): RoutePoint[] | undefined;
};

export function routePath(points: readonly RoutePoint[]) {
  return points
    .map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`)
    .join(" ");
}

export function routeConnection(points: readonly RoutePoint[]) {
  const route = points.map((point) => ({ ...point }));
  const start = route[0]!,
    next = route[1]!;
  const end = route.at(-1)!,
    previous = route.at(-2)!;
  const startLength = Math.hypot(next.x - start.x, next.y - start.y);
  const endLength = Math.hypot(end.x - previous.x, end.y - previous.y);
  start.x += ((next.x - start.x) / startLength) * Math.min(3, startLength / 3);
  start.y += ((next.y - start.y) / startLength) * Math.min(3, startLength / 3);
  const angle = Math.atan2(end.y - previous.y, end.x - previous.x);
  end.x -= Math.cos(angle) * Math.min(6, endLength / 3);
  end.y -= Math.sin(angle) * Math.min(6, endLength / 3);
  return {
    path: routePath(route),
    x2: end.x,
    y2: end.y,
    angle: (angle * 180) / Math.PI,
  };
}

function nearestRoutePoint(point: RoutePoint, route: readonly RoutePoint[]) {
  let best = route[0]!,
    distance = Infinity;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1]!,
      b = route[i]!;
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.x - a.x) * dx + (point.y - a.y) * dy) /
          (dx * dx + dy * dy || 1),
      ),
    );
    const candidate = { x: a.x + t * dx, y: a.y + t * dy };
    const d = Math.hypot(candidate.x - point.x, candidate.y - point.y);
    if (d < distance) {
      best = candidate;
      distance = d;
    }
  }
  return best;
}

// Stop at the node boundary so arrowheads remain visible outside its box.
export function layoutConnection(
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const inset = length ? Math.min(95 / Math.abs(dx), 30 / Math.abs(dy)) : 0;
  const start = inset + (length ? 3 / length : 0);
  const end = inset + (length ? 6 / length : 0);
  const x1 = a.x + dx * start,
    y1 = a.y + dy * start;
  const x2 = b.x - dx * end,
    y2 = b.y - dy * end;
  return {
    x1,
    y1,
    x2,
    y2,
    path: `M ${x1} ${y1} L ${x2} ${y2}`,
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}

export const labeledOverviewScale = 1.7;

export function scaleOverviewRoute(
  points: readonly RoutePoint[],
  factor: number,
  sourceCenter: RoutePoint,
  targetCenter: RoutePoint,
) {
  const route = points.map(({ x, y }) => ({ x: x * factor, y: y * factor }));
  if (factor === 1) return route;
  // The labelled layout spreads card centers and routing lanes apart, but
  // keeps each card 190 by 60. Extend each terminal segment back to its card.
  const attach = (tip: RoutePoint, next: RoutePoint, center: RoutePoint) => {
    const vertical = tip.x === next.x;
    const along = vertical ? "y" : "x";
    const across = vertical ? "x" : "y";
    const pin = {
      ...tip,
      [along]: center[along] + (tip[along] - center[along]) / factor,
    };
    const offset = tip[across] - center[across];
    if (Math.abs(offset) <= (vertical ? 95 : 30) - 12) return [pin];
    // A nudged lane can pass outside the flat side of the smaller card.
    // Turn at the old boundary to reach the original pin without a diagonal.
    pin[across] = center[across] + offset / factor;
    return [pin, { ...tip, [across]: pin[across] }, tip];
  };
  return [
    ...attach(route[0]!, route[1]!, sourceCenter),
    ...route.slice(1, -1),
    ...attach(route.at(-1)!, route.at(-2)!, targetCenter).reverse(),
  ];
}

export function layoutLabeledOverview(
  points: GraphPoint[],
  width: number,
  height: number,
) {
  return {
    points: points.map((point) => ({
      ...point,
      x: point.x * labeledOverviewScale,
      y: point.y * labeledOverviewScale,
    })),
    width: width * labeledOverviewScale,
    height: height * labeledOverviewScale,
  };
}

export function neighborhood(
  id: string,
  edges: readonly GraphEdge[],
): Set<string> {
  const ids = new Set([id]);
  for (const edge of edges) {
    if (edge.source === id || edge.target === id) {
      ids.add(edge.source);
      ids.add(edge.target);
    }
  }
  return ids;
}

const focusCaptionOffset = 62;

// Each neighbor has a separate path from the bottom of the focal card.
// The outermost lanes turn first, leaving the inner lanes clear for later rows.
function layoutFocusedNeighborhood(focus: string, neighbors: string[]) {
  const rows = Math.ceil(neighbors.length / 2);
  // Keep every port on the straight bottom edge even as more neighbors are authored.
  const laneSpacing = Math.min(12, 80 / Math.max(rows, 1));
  const center = 220 + rows * laneSpacing;
  const focusY = 42;
  const points: GraphPoint[] = [{ id: focus, x: center, y: focusY }];
  const routes = new Map<string, RoutePoint[]>();
  neighbors.forEach((id, index) => {
    const row = Math.floor(index / 2);
    const left = index % 2 === 0;
    const x = left ? 110 : center * 2 - 110;
    const y = 166 + row * 116;
    const laneX = center + (left ? -1 : 1) * (rows - row) * laneSpacing;
    const captionY = y - focusCaptionOffset;
    points.push({ id, x, y });
    routes.set(id, [
      { x: laneX, y: focusY + 30 },
      { x: laneX, y: captionY },
      { x, y: captionY },
      { x, y: y - 30 },
    ]);
  });
  return {
    points,
    width: center * 2,
    height: Math.max(100, points.at(-1)!.y + 40),
    routeFor({ source, target }: GraphEdge) {
      if (source === focus) return routes.get(target);
      if (target === focus) return routes.get(source)?.slice().reverse();
    },
  };
}

export function layoutNeighborhood(
  ids: string[],
  focus = "",
  labels = false,
): GraphLayout {
  if (focus && ids.includes(focus))
    return layoutFocusedNeighborhood(
      focus,
      ids.filter((id) => id !== focus),
    );
  const points = ids.map((id, index) => ({
    id,
    x: index % 2 ? 325 : 115,
    y: (labels ? 66 : 42) + Math.floor(index / 2) * (labels ? 200 : 90),
  }));
  return {
    points,
    width: 440,
    height: Math.max(
      100,
      (labels ? 64 : 40) + Math.max(...points.map((point) => point.y), 0),
    ),
  };
}

// Captions sit above neighbors in a focused map. Other views place them along
// their edge, avoiding node boxes and earlier captions where space permits.
export function layoutEdgeLabels(
  points: GraphPoint[],
  edges: (GraphEdge & { label: string; route?: RoutePoint[] | undefined })[],
  bounds: { width: number; height: number },
  focus = "",
) {
  const byId = new Map(points.map((point) => [point.id, point]));
  const placed: { x: number; y: number; width: number }[] = [];
  return edges.map((edge) => {
    const a = byId.get(edge.source)!,
      b = byId.get(edge.target)!;
    const width = Math.max(50, edge.label.length * 7 + 14);
    if (focus && (edge.source === focus || edge.target === focus)) {
      const neighbor = edge.source === focus ? b : a;
      const y = neighbor.y - focusCaptionOffset;
      return {
        ...edge,
        x: neighbor.x,
        y,
        width,
        anchorX: neighbor.x,
        anchorY: y,
      };
    }
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    let best = {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      anchorX: (a.x + b.x) / 2,
      anchorY: (a.y + b.y) / 2,
      score: Infinity,
    };
    for (const t of [0.5, 0.35, 0.65, 0.2, 0.8]) {
      for (const offset of [0, -24, 24, -48, 48, -72, 72, -96, 96]) {
        const anchorX = a.x + dx * t,
          anchorY = a.y + dy * t;
        const x = Math.max(
          width / 2 + 6,
          Math.min(
            bounds.width - width / 2 - 6,
            anchorX - (dy / length) * offset,
          ),
        );
        const y = Math.max(
          16,
          Math.min(bounds.height - 16, anchorY + (dx / length) * offset),
        );
        const overlap = (
          box: { x: number; y: number },
          halfWidth: number,
          halfHeight: number,
        ) =>
          Math.max(0, width / 2 + halfWidth - Math.abs(x - box.x)) *
          Math.max(0, 12 + halfHeight - Math.abs(y - box.y));
        const score =
          points.reduce((sum, point) => sum + overlap(point, 111, 46) * 10, 0) +
          placed.reduce(
            (sum, box) => sum + overlap(box, box.width / 2 + 4, 14) * 4,
            0,
          ) +
          Math.abs(offset) * 0.1 +
          Math.abs(t - 0.5);
        if (score < best.score) best = { x, y, anchorX, anchorY, score };
      }
    }
    const blocked = (x: number, y: number) =>
      points.some(
        (point) =>
          Math.abs(x - point.x) < width / 2 + 111 && Math.abs(y - point.y) < 58,
      ) ||
      placed.some(
        (box) =>
          Math.abs(x - box.x) < (width + box.width) / 2 + 4 &&
          Math.abs(y - box.y) < 26,
      );
    // Dense views sometimes have no free spot beside the line. Search the
    // remaining canvas and connect the caption back with a short leader.
    if (blocked(best.x, best.y)) {
      let distance = Infinity;
      for (let y = 16; y < bounds.height - 16; y += 24) {
        for (let x = width / 2 + 6; x < bounds.width - width / 2 - 6; x += 24) {
          if (blocked(x, y)) continue;
          const t = Math.max(
            0.1,
            Math.min(
              0.9,
              ((x - a.x) * dx + (y - a.y) * dy) / (length * length),
            ),
          );
          const anchorX = a.x + dx * t,
            anchorY = a.y + dy * t;
          const score =
            Math.hypot(x - anchorX, y - anchorY) + Math.abs(t - 0.5);
          if (score < distance) {
            distance = score;
            best = { x, y, anchorX, anchorY, score };
          }
        }
      }
    }
    if (edge.route) {
      const anchor = nearestRoutePoint(best, edge.route);
      best.anchorX = anchor.x;
      best.anchorY = anchor.y;
    }
    const caption = { ...edge, ...best, width };
    placed.push(caption);
    return caption;
  });
}
