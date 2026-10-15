import test from "node:test";
import assert from "node:assert/strict";
import { concepts } from "../shared/concepts.ts";
import { conceptPages } from "../shared/concept-pages.ts";
import { conceptRelationships } from "../shared/concept-relationships.ts";
import { readFileSync } from "node:fs";
import { demoCatalog } from "../shared/demo-catalog.ts";
import { demoId, learningResources } from "../shared/learning-resources.ts";
import {
  exportConceptGraph,
  renderConceptAgentGuide,
  renderConceptGraphMarkdown,
} from "../scripts/lib/concept-export.ts";

test("agent exports preserve the authored graph and evidence at each origin", () => {
  const title = "Elements of Scalable Web Development";
  const published = exportConceptGraph("https://scalableweb.dev/", title);
  const preview = exportConceptGraph("http://127.0.0.1:3000/", title);
  assert.match(published.revision, /^[a-f0-9]{64}$/);
  assert.equal(published.revision, preview.revision);
  for (const graph of [published, preview]) {
    const origin = new URL(graph.url).origin;
    assert.equal(graph.schemaVersion, 2);
    assert.deepEqual(graph.relationships, conceptRelationships);
    assert.equal(graph.concepts.length, concepts.length);
    assert.equal(graph.readings.length, conceptPages.length);
    for (const concept of concepts) {
      const exported = graph.concepts.find((item) => item.id === concept.id)!;
      assert.equal(exported.definition, concept.definition);
      assert.equal(exported.assumptions, concept.assumptions);
      assert.equal(exported.example, concept.example);
      assert.equal(exported.misconception, concept.misconception);
      assert.equal(exported.usage?.note, concept.usage?.note);
      assert.equal(new URL(exported.url).hash, `#${concept.id}`);
      assert.equal(new URL(exported.url).origin, origin);
      assert.deepEqual(
        exported.contexts,
        concept.contexts.map((context) => ({
          ...context,
          href: new URL(context.href, origin).href,
        })),
      );
      assert.deepEqual(
        exported.readings,
        conceptPages
          .filter((page) => page.concepts.includes(concept.id))
          .map((page) => new URL(page.url, origin).href),
      );
    }
    for (const href of Object.values(graph.resources))
      assert.equal(new URL(href).origin, origin);
  }
});

test("visual resources connect concepts to valid images and prediction-led gallery activities", () => {
  const ids = new Set(concepts.map(({ id }) => id));
  const resources = new Map(
    learningResources.map((resource) => [resource.id, resource]),
  );
  assert.equal(resources.size, learningResources.length);
  for (const resource of learningResources) {
    assert.ok(resource.conceptIds.length, resource.id);
    for (const id of resource.conceptIds)
      assert.ok(ids.has(id), `${resource.id}: ${id}`);
    assert.ok(resource.caption.trim(), resource.id);
    assert.ok(resource.assumptions.trim(), resource.id);
    assert.ok(resource.images.alt.trim(), resource.id);
    if (resource.kind === "graphic")
      assert.ok(resource.images.svg, resource.id);
  }
  for (const demo of demoCatalog) {
    const id = demoId(demo.title);
    const resource = resources.get(id)!;
    assert.equal(resource.kind, "demo");
    assert.equal(resource.url, `/demos/#${id}`);
    assert.match(readFileSync(demo.include, "utf8"), new RegExp(`id="${id}"`));
    assert.ok(resource.controls!.length, id);
    for (const prompt of Object.values(resource.experiment!))
      assert.ok(prompt.trim(), id);
    assert.equal(
      readFileSync(`site/assets/demo-previews/${id}.png`)
        .subarray(0, 8)
        .toString("hex"),
      "89504e470d0a1a0a",
      id,
    );
  }
  for (const origin of ["https://scalableweb.dev/", "http://127.0.0.1:3100/"]) {
    const graph = exportConceptGraph(origin, "The book");
    for (const concept of graph.concepts) {
      assert.ok(concept.resourceIds.includes(`graph-${concept.id}`));
      for (const id of concept.resourceIds)
        assert.ok(resources.get(id)!.conceptIds.includes(concept.id), id);
    }
    for (const resource of graph.learningResources) {
      for (const url of [
        resource.url,
        resource.images.png,
        resource.images.svg,
      ].filter(Boolean))
        assert.equal(new URL(url!).origin, new URL(origin).origin);
    }
  }
});

test("both agent formats carry graphics, demo assumptions, and a prediction before observation", () => {
  const graph = exportConceptGraph("https://scalableweb.dev/", "The book");
  const lab = graph.learningResources.find(
    ({ id }) => id === "demo-queue-balance-lab",
  )!;
  const concept = graph.concepts.find(({ id }) => id === "little-law")!;
  assert.ok(concept.resourceIds.includes(lab.id));
  assert.match(lab.experiment!.predict, /20 events\/s.*0\.5 to 1 second/);
  assert.match(lab.assumptions, /stable long-run averages/);
  const markdown = renderConceptGraphMarkdown(graph);
  for (const resource of graph.learningResources) {
    assert.ok(markdown.includes(resource.images.png));
    assert.ok(markdown.includes(resource.assumptions));
    if (resource.experiment)
      assert.ok(markdown.includes(resource.experiment.predict));
  }
  const guide = renderConceptAgentGuide(graph);
  assert.match(guide, /concepts\[\]\.resourceIds/);
  const diagram = graph.learningResources.find(
    ({ id }) => id === "graph-little-law",
  )!;
  assert.ok(guide.includes(diagram.images.png));
  assert.ok(guide.includes(lab.images.png));
  assert.match(guide, /Markdown images/);
  assert.match(guide, /static preview of the default view/);
  assert.match(guide, /an HTTP fetch does not run their JavaScript/);
  assert.match(guide, /let the student state a prediction/);
});

test("agent text preserves proposition direction when discovering incoming edges", () => {
  const graph = exportConceptGraph("https://scalableweb.dev/", "The book");
  const markdown = renderConceptGraphMarkdown(graph);
  assert.match(
    markdown,
    /\[Queue\][^\n]*\*\*can add waiting time to\*\* → \[Latency\]/,
  );
  assert.match(
    markdown,
    /\[Little's Law\][^\n]* — \[Amdahl's Law\][^\n]*different questions/,
  );
  assert.doesNotMatch(markdown, /↔/);
  const guide = renderConceptAgentGuide(graph);
  assert.match(guide, /schemaVersion: 2/);
  assert.match(guide, /Following an incoming edge does not reverse its claim/);
  assert.match(guide, /direction: edge.direction/);
});
