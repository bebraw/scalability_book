import assert from "node:assert/strict";
import test from "node:test";
import { createTracker, parseMutation } from "./tracker.ts";

const mutation = parseMutation(process.env.TRACKER_MUTATION);

test(`records one authorized event (${mutation})`, () => {
  const tracker = createTracker(mutation);
  const result = tracker.recordEvent({
    workspaceId: "W1",
    actorId: "alice",
    commandId: "C1",
    type: "work_started",
  });

  assert.equal(result.kind, "recorded");
  assert.equal(result.replayed, false);
  assert.deepEqual(
    tracker.listEvents("W1").map((event) => event.type),
    ["work_started"],
  );
});

test(`rejects an unknown workspace (${mutation})`, () => {
  const tracker = createTracker(mutation);
  const result = tracker.recordEvent({
    workspaceId: "missing",
    actorId: "alice",
    commandId: "C2",
    type: "work_started",
  });

  assert.deepEqual(result, {
    kind: "rejected",
    reason: "workspace_not_found",
  });
});
