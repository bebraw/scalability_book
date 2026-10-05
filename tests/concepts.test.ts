import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { concepts, conceptGroups } from "../shared/concepts.ts";
import { conceptPages } from "../shared/concept-pages.ts";
import { conceptRelationships } from "../shared/concept-relationships.ts";
import {
  layoutOverview,
  layoutNeighborhood,
  layoutEdgeLabels,
  layoutLabeledOverview,
  neighborhood,
  layoutConnection,
} from "../shared/concept-graph.ts";
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

test("the complete overview reserves breathing room between concept cards", () => {
  const layout = layoutOverview(concepts, conceptRelationships, conceptGroups);
  for (const point of layout.points) {
    assert.ok(point.x >= 95 && point.x <= layout.width - 95, point.id);
    assert.ok(point.y >= 30 && point.y <= layout.height - 30, point.id);
  }
  for (let i = 0; i < layout.points.length; i++) {
    for (let j = i + 1; j < layout.points.length; j++) {
      const a = layout.points[i]!,
        b = layout.points[j]!;
      assert.ok(
        Math.abs(a.x - b.x) >= 238 || Math.abs(a.y - b.y) >= 106,
        `${a.id} crowds ${b.id}`,
      );
    }
  }
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

test("the labeled overview keeps captions clear of nodes and other captions", () => {
  const overview = layoutOverview(
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
