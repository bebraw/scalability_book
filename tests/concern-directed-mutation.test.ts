import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createTracker,
  mutationNames,
  parseMutation,
} from "../labs/concern-directed-mutation/tracker.ts";

test("mutation fixture exposes two correct variants and three named faults", () => {
  assert.deepEqual(mutationNames, [
    "baseline",
    "storage-refactor",
    "authorization-bypass",
    "retry-duplication",
    "archive-write",
  ]);
  assert.throws(() => parseMutation("unknown"), /Unknown fixture mode/);
});

for (const mode of ["baseline", "storage-refactor"] as const) {
  test(`${mode} preserves authorization, retry identity, archive rules, and event order`, () => {
    const tracker = createTracker(mode);
    const firstCommand = {
      workspaceId: "W1",
      actorId: "alice",
      commandId: "C1",
      type: "work_started",
    } as const;

    assert.deepEqual(tracker.recordEvent({ ...firstCommand, actorId: "bob" }), {
      kind: "rejected",
      reason: "forbidden",
    });
    assert.deepEqual(tracker.listEvents("W1"), []);
    assert.deepEqual(tracker.recordEvent(firstCommand), {
      kind: "recorded",
      event: { ...firstCommand, id: "E1" },
      replayed: false,
    });
    assert.deepEqual(tracker.recordEvent(firstCommand), {
      kind: "recorded",
      event: { ...firstCommand, id: "E1" },
      replayed: true,
    });
    assert.deepEqual(
      tracker.recordEvent({ ...firstCommand, type: "work_completed" }),
      { kind: "rejected", reason: "command_conflict" },
    );

    const secondCommand = {
      ...firstCommand,
      commandId: "C2",
      type: "work_completed",
    } as const;
    assert.deepEqual(tracker.recordEvent(secondCommand), {
      kind: "recorded",
      event: { ...secondCommand, id: "E2" },
      replayed: false,
    });
    assert.equal(tracker.archiveWorkspace("W1"), true);
    assert.deepEqual(
      tracker.recordEvent({ ...firstCommand, commandId: "C3" }),
      {
        kind: "rejected",
        reason: "workspace_archived",
      },
    );
    // Retrying accepted work after archival returns its original result.
    assert.deepEqual(tracker.recordEvent(firstCommand), {
      kind: "recorded",
      event: { ...firstCommand, id: "E1" },
      replayed: true,
    });
    assert.deepEqual(tracker.recordEvent({ ...firstCommand, actorId: "bob" }), {
      kind: "rejected",
      reason: "forbidden",
    });
    assert.deepEqual(tracker.listEvents("W1"), [
      { ...firstCommand, id: "E1" },
      { ...secondCommand, id: "E2" },
    ]);
    assert.deepEqual(tracker.listEvents("missing"), []);
    assert.equal(tracker.archiveWorkspace("missing"), false);
  });
}

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

test("the mutation runner accepts the refactor without calling it a surviving mutant", () => {
  const runner = fileURLToPath(
    new URL("../labs/concern-directed-mutation/run.ts", import.meta.url),
  );
  const baseline = spawnSync(process.execPath, [runner, "baseline"], {
    encoding: "utf8",
  });
  const refactor = spawnSync(process.execPath, [runner, "storage-refactor"], {
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
  assert.ifError(refactor.error);
  assert.equal(
    refactor.status,
    0,
    `Refactor failed:\n${refactor.stdout}\n${refactor.stderr}`,
  );
  assert.match(refactor.stdout, /behavior-preserving storage refactor/);
  assert.doesNotMatch(refactor.stdout, /mutant survived/);
  assert.ifError(unknown.error);
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /Unknown fixture mode/);
});
