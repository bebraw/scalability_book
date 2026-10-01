export type GraphPoint = { id: string; x: number; y: number };
export type GraphEdge = { source: string; target: string };

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
        Math.floor(position / 2) * (labels ? (focus ? 116 : 160) : 90),
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
  edges: (GraphEdge & { label: string })[],
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
        y: neighbor.y - 46,
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
          points.reduce((sum, point) => sum + overlap(point, 99, 34) * 10, 0) +
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
          Math.abs(x - point.x) < width / 2 + 99 && Math.abs(y - point.y) < 46,
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
    const caption = { ...edge, ...best, width };
    placed.push(caption);
    return caption;
  });
}

// The overview uses the actual authored edges, with mild thematic attraction.
// Repulsion and rectangle collision keep labels apart. No fixed node IDs or
// manually maintained coordinates are needed as the reference grows.
export function layoutOverview(
  nodes: { id: string; group: string }[],
  edges: readonly GraphEdge[],
  groups: readonly string[],
) {
  const width = 1400,
    height = 1100;
  const points = nodes.map((node, index) => {
    const group = groups.indexOf(node.group);
    const angle = -Math.PI / 2 + (group * Math.PI * 2) / groups.length;
    const offset = index * 2.399963;
    return {
      id: node.id,
      x: width / 2 + 360 * Math.cos(angle) + 140 * Math.cos(offset),
      y: height / 2 + 300 * Math.sin(angle) + 140 * Math.sin(offset),
      group,
      vx: 0,
      vy: 0,
    };
  });
  const byId = new Map(points.map((point) => [point.id, point]));
  for (let iteration = 0; iteration < 420; iteration++) {
    for (let i = 0; i < points.length; i++) {
      const a = points[i]!;
      for (let j = i + 1; j < points.length; j++) {
        const b = points[j]!;
        const dx = a.x - b.x || 0.1,
          dy = a.y - b.y || 0.1;
        const distance = Math.max(20, Math.hypot(dx, dy));
        const force = 12000 / (distance * distance);
        a.vx += (dx / distance) * force;
        a.vy += (dy / distance) * force;
        b.vx -= (dx / distance) * force;
        b.vy -= (dy / distance) * force;
        if (Math.abs(dx) < 205 && Math.abs(dy) < 76) {
          const sx = (205 - Math.abs(dx)) / 205;
          const sy = (76 - Math.abs(dy)) / 76;
          if (sx < sy) {
            const push = Math.sign(dx) * (205 - Math.abs(dx)) * 0.15;
            a.vx += push;
            b.vx -= push;
          } else {
            const push = Math.sign(dy) * (76 - Math.abs(dy)) * 0.15;
            a.vy += push;
            b.vy -= push;
          }
        }
      }
    }
    for (const edge of edges) {
      const a = byId.get(edge.source),
        b = byId.get(edge.target);
      if (!a || !b) continue;
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const force = (distance - 250) * 0.003;
      a.vx += (dx / distance) * force;
      a.vy += (dy / distance) * force;
      b.vx -= (dx / distance) * force;
      b.vy -= (dy / distance) * force;
    }
    for (const point of points) {
      const angle = -Math.PI / 2 + (point.group * Math.PI * 2) / groups.length;
      point.vx += (width / 2 + 390 * Math.cos(angle) - point.x) * 0.003;
      point.vy += (height / 2 + 310 * Math.sin(angle) - point.y) * 0.003;
      point.vx *= 0.65;
      point.vy *= 0.65;
      point.x = Math.max(110, Math.min(width - 110, point.x + point.vx));
      point.y = Math.max(50, Math.min(height - 50, point.y + point.vy));
    }
  }
  // Finish with collision-only relaxation so attractive edges cannot leave
  // two labels overlapping in the published overview.
  for (let pass = 0; pass < 160; pass++) {
    for (let i = 0; i < points.length; i++) {
      const a = points[i]!;
      for (let j = i + 1; j < points.length; j++) {
        const b = points[j]!;
        const dx = a.x - b.x || 0.1,
          dy = a.y - b.y || 0.1;
        const overlapX = 205 - Math.abs(dx),
          overlapY = 76 - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;
        if (overlapX < overlapY) {
          const push = (Math.sign(dx) * (overlapX + 0.5)) / 2;
          a.x += push;
          b.x -= push;
        } else {
          const push = (Math.sign(dy) * (overlapY + 0.5)) / 2;
          a.y += push;
          b.y -= push;
        }
        for (const point of [a, b]) {
          point.x = Math.max(110, Math.min(width - 110, point.x));
          point.y = Math.max(50, Math.min(height - 50, point.y));
        }
      }
    }
  }
  return {
    width,
    height,
    points: points.map(({ id, x, y }) => ({
      id,
      x: Math.round(x),
      y: Math.round(y),
    })),
  };
}
