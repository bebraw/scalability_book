import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tracker } from "./app.mjs";

test("synthetic lifecycle and event checks", () => {
  const app = tracker(JSON.parse(readFileSync("fixture.json", "utf8")));
  const item = app.create("sample", "Synthetic work", "actor-01");
  assert.throws(() => app.advance(item.id, "done", "actor-01"));
  assert.equal(item.state, "open");
  assert.equal(app.state.events.length, 1);
  app.advance(item.id, "active", "actor-01");
  app.advance(item.id, "done", "actor-01");
  assert.deepEqual(app.summary("sample"), { open: 0, active: 0, done: 1 });
  assert.deepEqual(
    app.state.events.map((e) => e.type),
    ["item_created", "work_started", "work_completed"],
  );
});
