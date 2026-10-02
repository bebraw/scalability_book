import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { concepts } from "../shared/concepts.ts";
import { explorations, exportExplorations } from "../shared/explorations.ts";
import {
  exportConceptGraph,
  renderConceptGraphMarkdown,
} from "../scripts/lib/concept-export.ts";
import {
  renderExplorationAgentStart,
  renderExplorationDiscussion,
} from "../scripts/lib/exploration-html.ts";

test("task explorations have unique IDs, authored prompts, and valid concept membership", () => {
  assert.equal(
    new Set(explorations.map(({ id }) => id)).size,
    explorations.length,
  );
  const ids = new Set(concepts.map(({ id }) => id));
  for (const activity of explorations) {
    assert.match(activity.id, /^[a-z0-9-]+$/);
    for (const id of activity.conceptIds)
      assert.ok(ids.has(id), `${activity.id}: ${id}`);
    const source = readFileSync(`explorations/${activity.id}.md`, "utf8");
    const discussion = readFileSync(
      `explorations/${activity.id}.discussion.md`,
      "utf8",
    );
    assert.match(source, /## Scenario/);
    assert.match(source, /## Investigate\n\n1\./);
    assert.ok(discussion.trim(), activity.id);
    assert.doesNotMatch(source, /\{\{ import|Show worked reasoning/);
  }
});

test("agent starts remain answer-free and keep independent study and authored reasoning retrievable", () => {
  for (const origin of ["https://scalableweb.dev/", "http://127.0.0.1:3100/"]) {
    const graph = exportConceptGraph(origin, "The book");
    assert.deepEqual(graph.explorations, exportExplorations(origin));
    const markdown = renderConceptGraphMarkdown(graph);
    for (const activity of graph.explorations) {
      const source = readFileSync(`explorations/${activity.id}.md`, "utf8");
      const discussion = readFileSync(
        `explorations/${activity.id}.discussion.md`,
        "utf8",
      );
      const start = renderExplorationAgentStart(activity, source, origin);
      const answer = renderExplorationDiscussion(activity, discussion, origin);
      assert.ok(!start.includes(discussion.trim()), activity.id);
      assert.ok(answer.includes(discussion.trim()), activity.id);
      assert.match(start, /ask the first investigation question\. Then wait/);
      assert.match(
        start,
        /Do not invent execution, measurements, permissions, or completion/,
      );
      assert.ok(start.includes(activity.discussionUrl), activity.id);
      assert.ok(markdown.includes(activity.agentUrl), activity.id);
      assert.ok(markdown.includes(activity.task.href), activity.id);
      for (const href of [
        activity.url,
        activity.agentUrl,
        activity.discussionUrl,
        activity.graphUrl,
        activity.task.href,
        activity.reading.href,
      ]) {
        assert.equal(new URL(href).origin, new URL(origin).origin);
      }
      assert.doesNotMatch(start, /\]\(\//);
      for (const id of activity.conceptIds) {
        assert.ok(
          graph.concepts
            .find((concept) => concept.id === id)!
            .explorationIds.includes(activity.id),
        );
      }
    }
    const confidence = graph.explorations.find(
      ({ id }) => id === "confidence-before-routing",
    )!;
    const start = renderExplorationAgentStart(
      confidence,
      readFileSync("explorations/confidence-before-routing.md", "utf8"),
      origin,
    );
    assert.doesNotMatch(start, /60%|12\/20/);
  }
});

test("the moved explanation fixture retains its sequential and restart behavior", async () => {
  const source = readFileSync(
    "explorations/challenge-an-explanation.md",
    "utf8",
  );
  const code = source.match(/```js\n([\s\S]*?)\n```/)![1]!;
  const makeRecorder = new Function(`${code}\nreturn makeRecorder;`)() as (
    append: (id: string) => Promise<void>,
  ) => (id: string) => Promise<void>;
  const events: string[] = [];
  const append = async (id: string) => {
    events.push(id);
  };
  const record = makeRecorder(append);
  await record("C7");
  assert.deepEqual(events, ["C7"]);
  await record("C7");
  assert.deepEqual(events, ["C7"]);
  await makeRecorder(append)("C7");
  assert.deepEqual(events, ["C7", "C7"]);
});
