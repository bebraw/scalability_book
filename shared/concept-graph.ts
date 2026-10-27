export type GraphPoint = { id: string; x: number; y: number };
export type GraphEdge = { source: string; target: string };

export type RoutePoint = { x: number; y: number };

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
  return {
    x1: a.x + dx * start,
    y1: a.y + dy * start,
    x2: b.x - dx * end,
    y2: b.y - dy * end,
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}

export const labeledOverviewScale = 1.7;

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

// A compact, deterministic reading layout. It places the focal idea first,
// followed by its neighbors, and grows vertically rather than shrinking text.
export function layoutNeighborhood(ids: string[], focus = "", labels = false) {
  const ordered =
    focus && ids.includes(focus)
      ? [focus, ...ids.filter((id) => id !== focus)]
      : ids;
  const points = ordered.map((id, index) => {
    if (focus && index === 0) return { id, x: 220, y: 42 };
    const position = focus ? index - 1 : index;
    return {
      id,
      x: position % 2 ? 325 : 115,
      y:
        (focus ? (labels ? 166 : 142) : labels ? 66 : 42) +
        Math.floor(position / 2) * (labels ? (focus ? 116 : 200) : 90),
    };
  });
  return {
    points,
    width: 440,
    height: Math.max(
      100,
      (labels && !focus ? 64 : 40) +
        Math.max(...points.map((point) => point.y), 0),
    ),
  };
}

// Captions sit above neighbors in a focused map. Other views place them along
// their edge, avoiding node boxes and earlier captions where space permits.
export function layoutEdgeLabels(
  points: GraphPoint[],
  edges: (GraphEdge & { label: string; route?: RoutePoint[] })[],
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
      return {
        ...edge,
        x: neighbor.x,
        y: neighbor.y - 62,
        width,
        anchorX: neighbor.x,
        anchorY: neighbor.y - 30,
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
