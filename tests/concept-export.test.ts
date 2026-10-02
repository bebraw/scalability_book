import test from "node:test";
import assert from "node:assert/strict";
import { concepts } from "../shared/concepts.ts";
import { conceptPages } from "../shared/concept-pages.ts";
import { conceptRelationships } from "../shared/concept-relationships.ts";
import { exportConceptGraph } from "../scripts/lib/concept-export.ts";

test("agent exports preserve the authored graph and evidence at each origin", () => {
  const title = "Elements of Scalable Web Development";
  const published = exportConceptGraph("https://scalableweb.dev/", title);
  const preview = exportConceptGraph("http://127.0.0.1:3000/", title);
  assert.match(published.revision, /^[a-f0-9]{64}$/);
  assert.equal(published.revision, preview.revision);
  for (const graph of [published, preview]) {
    const origin = new URL(graph.url).origin;
    assert.equal(graph.schemaVersion, 1);
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
