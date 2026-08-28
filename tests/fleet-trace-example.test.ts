import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const fixtureUrl = new URL(
  "../specifications/examples/fleet-trace/example.trace.json",
  import.meta.url,
);
const schemaUrl = new URL(
  "../specifications/examples/fleet-trace/trace.schema.json",
  import.meta.url,
);

test("portable fleet trace keeps references and lifecycle events coherent", async () => {
  const trace = JSON.parse(await readFile(fixtureUrl, "utf8"));
  const schema = JSON.parse(await readFile(schemaUrl, "utf8"));

  assert.equal(trace.schema_version, schema.properties.schema_version.const);
  assert.equal(trace.tasks.length, 3);
  assert.equal(
    trace.actors.filter((actor) => actor.kind === "agent").length,
    2,
  );
  assert.equal(
    trace.actors.filter((actor) => actor.kind === "human").length,
    1,
  );

  const actorIds = uniqueIds(trace.actors, "actor");
  const taskIds = uniqueIds(trace.tasks, "task");
  uniqueIds(trace.events, "event");

  for (const task of trace.tasks) {
    assert.ok(actorIds.has(task.assigned_actor_id));
    assert.ok(task.depends_on.every((dependency) => taskIds.has(dependency)));
  }

  const sequences = trace.events.map((event) => event.sequence);
  assert.deepEqual(
    sequences,
    [...sequences].sort((left, right) => left - right),
  );
  assert.equal(new Set(sequences).size, sequences.length);

  for (const event of trace.events) {
    assert.ok(taskIds.has(event.task_id));
    assert.ok(actorIds.has(event.actor_id));
  }

  const eventTypes = new Set(trace.events.map((event) => event.type));
  for (const requiredType of [
    "delegation",
    "task_started",
    "task_completed",
    "handoff",
    "failure",
    "retry",
    "validation",
    "review",
    "human_intervention",
  ]) {
    assert.ok(eventTypes.has(requiredType), `missing ${requiredType} event`);
  }

  for (const task of trace.tasks) {
    const taskEvents = trace.events.filter(
      (event) => event.task_id === task.id,
    );
    assert.equal(
      taskEvents.filter((event) => event.type === "task_created").length,
      1,
    );
    assert.equal(
      taskEvents.filter((event) => event.type === "task_started").length,
      1,
    );
    assert.equal(
      taskEvents.filter((event) => event.type === "task_completed").length,
      1,
    );
  }
});

function uniqueIds(records, label) {
  const ids = records.map((record) => record.id);
  assert.equal(new Set(ids).size, ids.length, `${label} IDs must be unique`);
  return new Set(ids);
}
