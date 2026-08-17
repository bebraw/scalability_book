import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createTracker,
  mutationNames,
  parseMutation,
} from "../labs/concern-directed-mutation/tracker.ts";

test("mutation fixture exposes one baseline and three named faults", () => {
  assert.deepEqual(mutationNames, [
    "baseline",
    "authorization-bypass",
    "retry-duplication",
    "archive-write",
  ]);
  assert.throws(() => parseMutation("unknown"), /Unknown mutation/);
});

test("the starter happy path is shared by every fixture mode", () => {
  for (const mutation of mutationNames) {
    const tracker = createTracker(mutation);
    const result = tracker.recordEvent({
      workspaceId: "W1",
      actorId: "alice",
      commandId: "C1",
      type: "work_started",
    });

    assert.equal(result.kind, "recorded", mutation);
    assert.equal(tracker.listEvents("W1").length, 1, mutation);
  }
});

test("the mutation runner distinguishes a baseline pass from bad selection", () => {
  const runner = fileURLToPath(
    new URL("../labs/concern-directed-mutation/run.ts", import.meta.url),
  );
  const baseline = spawnSync(process.execPath, [runner, "baseline"], {
    encoding: "utf8",
  });
  const unknown = spawnSync(process.execPath, [runner, "unknown"], {
    encoding: "utf8",
  });

  assert.ifError(baseline.error);
  assert.equal(
    baseline.status,
    0,
    `Baseline failed:\n${baseline.stdout}\n${baseline.stderr}`,
  );
  assert.ifError(unknown.error);
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /Unknown mutation/);
});
