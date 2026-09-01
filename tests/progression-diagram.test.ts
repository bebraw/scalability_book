import assert from "node:assert/strict";
import test from "node:test";
import {
  courseProgressionDiagram,
  renderProgressionDiagram,
} from "../scripts/lib/render-progression-diagram.ts";

test("course progression diagram exposes its structure and accessible summary", () => {
  const rendered = renderProgressionDiagram(courseProgressionDiagram);

  assert.match(rendered, /role="img"/);
  assert.match(
    rendered,
    /aria-labelledby="course-progression-title course-progression-description"/,
  );
  assert.match(
    rendered,
    /<title id="course-progression-title">One application, three development systems<\/title>/,
  );
  assert.match(rendered, /data-progression-stage="establish"/);
  assert.match(rendered, /data-progression-stage="challenge"/);
  assert.match(rendered, /data-progression-stage="compare"/);
  assert.match(rendered, /Implementation A/);
  assert.match(rendered, /Implementation B/);
  assert.match(rendered, /Implementation C/);
  assert.equal(rendered.match(/FRESH CODEBASE/g)?.length, 3);
  assert.match(rendered, /Compare three builds/);
  assert.match(rendered, /and development/);
  assert.match(rendered, />systems<\/tspan>/);
  assert.match(
    rendered,
    /application code and implementation-specific tests do not carry forward/,
  );
});

test("progression renderer rejects a diagram without a progression", () => {
  assert.throws(
    () =>
      renderProgressionDiagram({
        ...courseProgressionDiagram,
        stages: [courseProgressionDiagram.stages[0]!],
      }),
    /requires at least two stages/,
  );
});
