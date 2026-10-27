import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { concepts, conceptGroups } from "../shared/concepts.ts";
import { conceptPages } from "../shared/concept-pages.ts";
import { conceptRelationships } from "../shared/concept-relationships.ts";
import {
  layoutNeighborhood,
  layoutEdgeLabels,
  layoutLabeledOverview,
  neighborhood,
  layoutConnection,
} from "../shared/concept-graph.ts";
import { layoutOverview } from "../scripts/lib/concept-layout.ts";
import {
  conceptRoleById,
  conceptRoles,
} from "../shared/concept-presentation.ts";
import { parseJsonc } from "../scripts/lib/text.ts";

test("the authored graph has valid unique edges and connects every concept", () => {
  const ids = new Set(concepts.map((concept) => concept.id));
  assert.equal(ids.size, concepts.length);
  const edges = new Set<string>();
  for (const relation of conceptRelationships) {
    assert.ok(ids.has(relation.source), relation.source);
    assert.ok(ids.has(relation.target), relation.target);
    assert.notEqual(relation.source, relation.target);
    assert.ok(relation.explanation.trim());
    assert.ok(
      relation.label.trim(),
      `Missing label: ${relation.source} ${relation.target}`,
    );
    const key = [relation.source, relation.target].sort().join(" ");
    assert.ok(!edges.has(key), `Duplicate relationship: ${key}`);
    edges.add(key);
  }
  const reached = new Set([concepts[0]!.id]);
  for (let pass = 0; pass < concepts.length; pass++)
    for (const id of [...reached])
      for (const next of neighborhood(id, conceptRelationships))
        reached.add(next);
  assert.deepEqual(
    reached,
    ids,
    "Every concept is discoverable from the graph",
  );
  for (const concept of concepts) {
    assert.ok(concept.contexts.length >= 2, concept.id);
    assert.ok(
      conceptPages.some((page) => page.concepts.includes(concept.id)),
      concept.id,
    );
  }
});

test("direction follows the qualified statement while comparisons stay undirected", () => {
  const find = (source: string, target: string) =>
    conceptRelationships.find(
      (edge) => edge.source === source && edge.target === target,
    )!;
  assert.equal(find("queue", "latency").direction, "directed");
  assert.equal(find("queue", "latency").label, "can add waiting time to");
  assert.equal(find("saturation", "throughput").direction, "directed");
  assert.equal(
    find("measurement-boundary", "latency").label,
    "defines timing scope of",
  );
  assert.equal(find("little-law", "amdahl-law").direction, "undirected");
  assert.equal(find("authority", "state-authority").direction, "undirected");
  assert.ok(neighborhood("latency", conceptRelationships).has("queue"));
  assert.ok(neighborhood("queue", conceptRelationships).has("latency"));
});

test("arrow tips stay outside their destination boxes in every direction", () => {
  for (const b of [
    { x: 300, y: 0 },
    { x: -300, y: 0 },
    { x: 0, y: 300 },
    { x: 0, y: -300 },
    { x: 210, y: 124 },
    { x: -210, y: -124 },
  ]) {
    const a = { x: 0, y: 0 };
    const edge = layoutConnection(a, b);
    assert.ok(Math.abs(edge.x1) > 95 || Math.abs(edge.y1) > 30);
    assert.ok(Math.abs(edge.x2 - b.x) > 95 || Math.abs(edge.y2 - b.y) > 30);
    const angle = (edge.angle * Math.PI) / 180;
    assert.ok(Math.cos(angle) * b.x + Math.sin(angle) * b.y > 0);
  }
});

test("reading membership covers the published book, parts, cases, and project", () => {
  const config = parseJsonc(readFileSync("site.config.jsonc", "utf8")) as {
    chapters: string[];
    parts: { file: string }[];
    caseStudies: { slug: string }[];
  };
  const urls = new Set(conceptPages.map((page) => page.url));
  const ids = new Set(concepts.map((concept) => concept.id));
  for (const file of config.chapters) {
    const base = path.basename(file, ".md");
    const collection = /^[A-Z]_/.test(base) ? "appendices" : "chapters";
    const slug = base.startsWith("00_")
      ? "introduction"
      : base.replace(/^(?:\d+|[A-Z])_/, "").replaceAll("_", "-");
    assert.ok(urls.has(`/${collection}/${slug}/`), file);
  }
  for (const part of config.parts)
    assert.ok(
      urls.has(
        `/parts/${path.basename(part.file, ".md").replace(/^\d+_/, "").replaceAll("_", "-")}/`,
      ),
      part.file,
    );
  for (const item of config.caseStudies)
    assert.ok(urls.has(`/case-studies/${item.slug}/`), item.slug);
  for (const suffix of [
    "introduction/",
    "",
    "establish/",
    "challenge/",
    "compare/",
    "grading/",
  ])
    assert.ok(urls.has(`/project/${suffix}`));
  assert.equal(urls.size, conceptPages.length);
  for (const page of conceptPages) {
    assert.equal(new Set(page.concepts).size, page.concepts.length, page.url);
    for (const id of page.concepts)
      assert.ok(ids.has(id), `${page.url}: ${id}`);
  }
});

test("the complete overview reserves breathing room between concept cards", async () => {
  const layout = await layoutOverview(
    concepts,
    conceptRelationships,
    conceptGroups,
  );
  for (const point of layout.points) {
    assert.ok(point.x >= 95 && point.x <= layout.width - 95, point.id);
    assert.ok(point.y >= 30 && point.y <= layout.height - 30, point.id);
  }
  for (let i = 0; i < layout.points.length; i++) {
    for (let j = i + 1; j < layout.points.length; j++) {
      const a = layout.points[i]!,
        b = layout.points[j]!;
      assert.ok(
        Math.abs(a.x - b.x) >= 222 || Math.abs(a.y - b.y) >= 92,
        `${a.id} crowds ${b.id}`,
      );
    }
  }
});

test("every concept has an editorial role independently of its topic", () => {
  assert.deepEqual(
    new Set(Object.keys(conceptRoleById)),
    new Set(concepts.map(({ id }) => id)),
  );
  for (const concept of concepts)
    assert.ok(conceptRoleById[concept.id]! in conceptRoles);
  assert.equal(conceptRoleById["contention"], "property");
  assert.equal(conceptRoleById["goodhart-law"], "model");
  assert.equal(conceptRoleById["cache"], "mechanism");
});

test("laws live with their subject matter while keeping their explanatory role", () => {
  assert.deepEqual(
    [...conceptGroups],
    ["Evidence", "Development", "Architecture", "Operations"],
  );
  const byId = new Map(concepts.map((concept) => [concept.id, concept]));
  for (const [id, group] of [
    ["little-law", "Evidence"],
    ["lusser-law", "Evidence"],
    ["amdahl-law", "Development"],
    ["contention", "Operations"],
  ])
    assert.equal(byId.get(id!)!.group, group);
  for (const id of ["little-law", "amdahl-law", "lusser-law", "goodhart-law"])
    assert.equal(conceptRoleById[id], "model");
  assert.equal(conceptRoleById["contention"], "property");
  assert.equal(
    conceptRelationships.filter(
      (edge) => byId.get(edge.source)!.group !== byId.get(edge.target)!.group,
    ).length,
    45,
  );
});

test("clustered routing preserves all endpoints, avoids nodes and reduces crossings", async (t) => {
  const layout = await layoutOverview(
    concepts,
    conceptRelationships,
    conceptGroups,
  );
  const repeated = await layoutOverview(
    concepts,
    conceptRelationships,
    conceptGroups,
  );
  assert.deepEqual(
    layout,
    repeated,
    "The same registry produces the same static layout",
  );
  const byId = new Map(layout.points.map((point) => [point.id, point]));
  const aspect = layout.width / layout.height;
  const occupied =
    layout.clusters.reduce(
      (area, cluster) => area + cluster.width * cluster.height,
      0,
    ) /
    (layout.width * layout.height);
  assert.ok(
    aspect >= 1.2 && aspect <= 2.2,
    `Unbalanced overview aspect: ${aspect}`,
  );
  assert.ok(
    occupied >= 0.58,
    `Topic regions occupy only ${Math.round(occupied * 100)}% of the canvas`,
  );
  assert.ok(
    Math.min(1086 / layout.width, 558 / layout.height) > 0.25,
    "The reviewed desktop canvas should fit the map above 25% scale",
  );
  assert.equal(layout.routes.length, conceptRelationships.length);
  for (const cluster of layout.clusters) {
    const members = concepts.filter(
      (concept) => concept.group === cluster.group,
    );
    assert.equal(cluster.count, members.length);
    for (const member of members) {
      const point = byId.get(member.id)!;
      assert.ok(
        point.x - 95 >= cluster.x && point.x + 95 <= cluster.x + cluster.width,
      );
      assert.ok(
        point.y - 30 >= cluster.y && point.y + 30 <= cluster.y + cluster.height,
      );
    }
    for (const other of layout.clusters)
      if (other !== cluster)
        assert.ok(
          cluster.x + cluster.width <= other.x ||
            other.x + other.width <= cluster.x ||
            cluster.y + cluster.height <= other.y ||
            other.y + other.height <= cluster.y,
          `${cluster.group} overlaps ${other.group}`,
        );
  }
  for (const [index, route] of layout.routes.entries()) {
    const relation = conceptRelationships[index]!;
    assert.equal(route.source, relation.source);
    assert.equal(route.target, relation.target);
    for (const [endpoint, id] of [
      [route.points[0]!, relation.source],
      [route.points.at(-1)!, relation.target],
    ] as const) {
      const node = byId.get(id)!;
      const dx = Math.abs(endpoint.x - node.x),
        dy = Math.abs(endpoint.y - node.y);
      assert.ok(
        (Math.abs(dx - 95) < 0.001 && dy <= 30.001) ||
          (Math.abs(dy - 30) < 0.001 && dx <= 95.001),
        `Route is not attached to ${id}`,
      );
    }
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1]!,
        b = route.points[i]!;
      assert.ok(
        a.x === b.x || a.y === b.y,
        "Routes use explicit orthogonal segments",
      );
      for (const node of layout.points) {
        if (node.id === route.source || node.id === route.target) continue;
        const intersects =
          a.x === b.x
            ? a.x > node.x - 95 + 0.001 &&
              a.x < node.x + 95 - 0.001 &&
              Math.max(a.y, b.y) > node.y - 30 + 0.001 &&
              Math.min(a.y, b.y) < node.y + 30 - 0.001
            : a.y > node.y - 30 + 0.001 &&
              a.y < node.y + 30 - 0.001 &&
              Math.max(a.x, b.x) > node.x - 95 + 0.001 &&
              Math.min(a.x, b.x) < node.x + 95 - 0.001;
        assert.ok(
          !intersects,
          `${route.source} → ${route.target} crosses ${node.id}`,
        );
      }
    }
  }
  // The previous 45-concept layout had 487 proper segment crossings. Count
  // them independently of ELK, excluding shared endpoints and collinear runs.
  const orientation = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number },
  ) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  let crossings = 0;
  for (const [i, a] of layout.routes.entries())
    for (const b of layout.routes.slice(i + 1)) {
      if ([a.source, a.target].some((id) => id === b.source || id === b.target))
        continue;
      for (let p = 1; p < a.points.length; p++)
        for (let q = 1; q < b.points.length; q++) {
          const x = a.points[p - 1]!,
            y = a.points[p]!,
            z = b.points[q - 1]!,
            w = b.points[q]!;
          if (
            orientation(x, y, z) * orientation(x, y, w) < 0 &&
            orientation(z, w, x) * orientation(z, w, y) < 0
          )
            crossings++;
        }
    }
  assert.ok(
    crossings < 190,
    `${crossings} crossings exceed the reviewed layout budget`,
  );
  t.diagnostic(`${crossings} proper segment crossings; previous layout: 487`);
});

test("focused connection captions fit without covering concept nodes", () => {
  for (const concept of concepts) {
    const ids = [...neighborhood(concept.id, conceptRelationships)];
    const edges = conceptRelationships.filter(
      (edge) => edge.source === concept.id || edge.target === concept.id,
    );
    const layout = layoutNeighborhood(ids, concept.id, true);
    const captions = layoutEdgeLabels(layout.points, edges, layout, concept.id);
    for (const caption of captions) {
      assert.ok(
        caption.x - caption.width / 2 >= 0 &&
          caption.x + caption.width / 2 <= layout.width,
        caption.label,
      );
      assert.ok(
        caption.y - 11 >= 0 && caption.y + 11 <= layout.height,
        caption.label,
      );
      for (const point of layout.points) {
        assert.ok(
          Math.abs(caption.x - point.x) >= caption.width / 2 + 95 ||
            Math.abs(caption.y - point.y) >= 41,
          `${caption.label} covers ${point.id}`,
        );
      }
    }
  }
});

test("the labeled overview keeps captions clear of nodes and other captions", async () => {
  const overview = await layoutOverview(
    concepts,
    conceptRelationships,
    conceptGroups,
  );
  const layout = layoutLabeledOverview(
    overview.points,
    overview.width,
    overview.height,
  );
  const captions = layoutEdgeLabels(
    layout.points,
    conceptRelationships,
    layout,
  );
  for (const [index, caption] of captions.entries()) {
    for (const point of layout.points) {
      assert.ok(
        Math.abs(caption.x - point.x) >= caption.width / 2 + 95 ||
          Math.abs(caption.y - point.y) >= 41,
        `${caption.label} covers ${point.id}`,
      );
    }
    for (const other of captions.slice(index + 1)) {
      assert.ok(
        Math.abs(caption.x - other.x) >= (caption.width + other.width) / 2 ||
          Math.abs(caption.y - other.y) >= 22,
        `${caption.label} covers ${other.label}`,
      );
    }
  }
});

test("scoped and filtered connection captions stay clear in every reading", () => {
  const views = [
    ...conceptPages.map((page) => ({ name: page.url, ids: page.concepts })),
    ...conceptGroups.map((group) => ({
      name: group,
      ids: concepts
        .filter((concept) => concept.group === group)
        .map((concept) => concept.id),
    })),
    {
      name: "All topics matching a filter",
      ids: concepts.map((concept) => concept.id),
    },
  ];
  for (const view of views) {
    const ids = new Set(view.ids);
    const edges = conceptRelationships.filter(
      (edge) => ids.has(edge.source) && ids.has(edge.target),
    );
    const layout = layoutNeighborhood([...ids], "", true);
    const captions = layoutEdgeLabels(layout.points, edges, layout);
    for (const [index, caption] of captions.entries()) {
      for (const point of layout.points)
        assert.ok(
          Math.abs(caption.x - point.x) >= caption.width / 2 + 95 ||
            Math.abs(caption.y - point.y) >= 41,
          `${view.name}: ${caption.label} covers ${point.id}`,
        );
      for (const other of captions.slice(index + 1))
        assert.ok(
          Math.abs(caption.x - other.x) >= (caption.width + other.width) / 2 ||
            Math.abs(caption.y - other.y) >= 22,
          `${view.name}: ${caption.label} covers ${other.label}`,
        );
    }
  }
});
