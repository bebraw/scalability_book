import assert from "node:assert/strict";
import test from "node:test";
import {
  injectBookDiagrams,
  renderBookDiagrams,
} from "../scripts/lib/render-book-diagrams.ts";

test("book diagram registry renders every configured accessible SVG", () => {
  const diagrams = renderBookDiagrams();

  assert.deepEqual(
    [...diagrams.keys()],
    [
      "course-progression",
      "pressure-evidence",
      "dependency-failure",
      "shared-knowledge-boundary",
      "three-connected-loops",
    ],
  );

  for (const [id, diagram] of diagrams) {
    assert.match(diagram, new RegExp(`data-book-diagram="${id}"`));
    assert.match(diagram, /role="img"/);
    assert.match(diagram, /aria-labelledby="[^"]+"/);
    assert.match(diagram, /<title id="[^"]+">/);
    assert.match(diagram, /<desc id="[^"]+">/);
  }
});

test("book diagram placeholders resolve by id and reject unknown diagrams", () => {
  const diagrams = renderBookDiagrams();
  const rendered = injectBookDiagrams(
    '<figure><div data-book-diagram-placeholder="pressure-evidence"></div></figure>',
    diagrams,
  );

  assert.match(rendered, /data-book-diagram="pressure-evidence"/);
  assert.doesNotMatch(rendered, /data-book-diagram-placeholder/);
  assert.throws(
    () =>
      injectBookDiagrams(
        '<div data-book-diagram-placeholder="missing"></div>',
        diagrams,
      ),
    /Unknown book diagram: missing/,
  );
});
