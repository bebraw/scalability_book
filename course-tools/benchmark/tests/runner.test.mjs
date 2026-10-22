import test from "node:test";
import assert from "node:assert/strict";
import {
  makeFixture,
  makeOperations,
  median,
  nearestRank,
} from "../protocol.mjs";
import { runProfile, runBaseline } from "../runner.mjs";

const metadata = Object.fromEntries(
  [
    "name",
    "version",
    "implementation",
    "commit",
    "environment",
    "configuration",
    "boundary",
    "persistence",
    "retryPolicy",
    "cachePolicy",
  ].map((key) => [key, `synthetic-unit-fixture-${key}`]),
);
function fake(overrides = {}) {
  let resource = 0;
  let resets = 0;
  return {
    metadata,
    get resets() {
      return resets;
    },
    reset: async () => {
      resets++;
    },
    execute: async (op) => {
      resource++;
      return { outcome: op.kind === "reject" ? "expected_rejection" : "valid" };
    },
    quiesce: async () => true,
    verify: async () => ({
      checks: [{ name: "synthetic fixture invariant", ok: true }],
    }),
    reconcile: async (operations) =>
      operations.map((o) => ({ id: o.id, outcome: "not_committed" })),
    resource: async () => ({
      name: "synthetic-counter",
      unit: "test-units",
      kind: "cumulative",
      value: resource,
      boundary: "Unit test only; no application measurement.",
    }),
    ...overrides,
  };
}
const small = {
  name: "diagnostic-unit-test",
  operations: 20,
  concurrency: 4,
  measured: false,
};

test("fixed fixture independently satisfies all required cardinalities and stages", () => {
  const fixture = makeFixture();
  assert.equal(fixture.workspaces.length, 8);
  assert.equal(fixture.items.length, 400);
  assert.deepEqual(fixture.actors, [
    "actor-01",
    "actor-02",
    "actor-03",
    "actor-04",
  ]);
  for (let n = 1; n <= 8; n++) {
    const key = `workspace-${String(n).padStart(2, "0")}`;
    const items = fixture.items.filter((i) => i.workspaceKey === key);
    assert.equal(items.filter((i) => i.state === "open").length, 20);
    assert.equal(items.filter((i) => i.state === "in_progress").length, 15);
    assert.equal(items.filter((i) => i.state === "done").length, 15);
  }
  assert.equal(new Set(fixture.items.map((i) => i.key)).size, 400);
});
test("500 operations retain the published mix, balanced reads, and independent targets", () => {
  const operations = makeOperations(500, "known-seed", "steady-1");
  assert.deepEqual(
    Object.fromEntries(
      ["feed", "summary", "create", "start", "finish", "reject"].map((kind) => [
        kind,
        operations.filter((o) => o.kind === kind).length,
      ]),
    ),
    { feed: 150, summary: 75, create: 100, start: 75, finish: 50, reject: 50 },
  );
  const feeds = operations.filter((o) => o.kind === "feed");
  assert.equal(feeds.filter((o) => !o.workspaceKey && !o.eventType).length, 50);
  assert.equal(feeds.filter((o) => o.workspaceKey).length, 50);
  assert.equal(feeds.filter((o) => o.eventType).length, 50);
  const targets = operations
    .filter((o) => ["start", "finish", "reject"].includes(o.kind))
    .map((o) => o.itemKey);
  assert.equal(new Set(targets).size, 175);
  assert.equal(new Set(operations.map((o) => o.id)).size, 500);
  const fixture = makeFixture();
  for (const o of operations.filter((o) => o.itemKey))
    assert.equal(
      fixture.items.find((i) => i.key === o.itemKey).state,
      o.kind === "finish" ? "in_progress" : "open",
    );
});
test("seed fixes logical order independently of run titles", () => {
  assert.deepEqual(
    makeOperations(200, "same", "run"),
    makeOperations(200, "same", "run"),
  );
  assert.notDeepEqual(
    makeOperations(200, "same", "run"),
    makeOperations(200, "different", "run"),
  );
  assert.throws(
    () => makeOperations(5000, "same", "run"),
    /distinct transition targets/,
  );
});
test("latency summaries use the stipulated nearest-rank p95 and a conventional median", () => {
  const values = Array.from({ length: 200 }, (_, i) => i + 1).reverse();
  assert.equal(nearestRank(values, 0.95), 190);
  assert.equal(median(values), 100.5);
  assert.equal(nearestRank([100, 2, 1], 0.95), 100);
  assert.equal(median([9, 1, 3]), 3);
  assert.equal(nearestRank([], 0.95), null);
});
test("closed-loop workers count validated rejections without hiding useful reads and writes", async () => {
  let active = 0,
    maximum = 0;
  const adapter = fake({
    execute: async (op) => {
      active++;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      return { outcome: op.kind === "reject" ? "expected_rejection" : "valid" };
    },
  });
  const result = await runProfile(adapter, small);
  assert.equal(result.counts.valid, 20);
  assert.equal(result.counts.reads, 9);
  assert.equal(result.counts.writes, 9);
  assert.equal(result.counts.expectedRejections, 2);
  assert.equal(result.latency.sampleCount, 20);
  assert.ok(maximum > 1 && maximum <= 4);
  assert.ok(result.maxActive <= 4);
  assert.equal(result.observations.length, 20);
});
test("an unchecked rejection is an error and never a fast valid completion", async () => {
  const result = await runProfile(
    fake({ execute: async () => ({ outcome: "valid" }) }),
    small,
  );
  assert.equal(result.counts.valid, 18);
  assert.equal(result.counts.expectedRejections, 0);
  assert.equal(result.counts.errors, 2);
  assert.equal(result.latency.sampleCount, 18);
});
test("an adapter crash is retained with write reconciliation", async () => {
  const result = await runProfile(
    fake({
      execute: async (op) => {
        if (op.kind === "create") throw new Error("application unavailable");
        return {
          outcome: op.kind === "reject" ? "expected_rejection" : "valid",
        };
      },
    }),
    small,
  );
  assert.equal(result.counts.errors, 4);
  assert.equal(result.reconciliation.length, 4);
  assert.ok(
    result.observations
      .filter((o) => o.kind === "create")
      .every((o) => o.error === "application unavailable"),
  );
});
test("a timed-out committed write stays censored and is reconciled separately", async () => {
  const pending = [];
  const adapter = fake({
    execute: async (op) => {
      if (op.kind === "create") {
        const wait = new Promise((resolve) => setTimeout(resolve, 100));
        pending.push(wait);
        await wait;
      }
      return { outcome: op.kind === "reject" ? "expected_rejection" : "valid" };
    },
    quiesce: async () => {
      await Promise.all(pending);
      return true;
    },
    reconcile: async (operations) =>
      operations.map((o) => ({ id: o.id, outcome: "committed" })),
  });
  const result = await runProfile(adapter, small, {
    operationTimeoutMs: 30,
    observationTimeoutMs: 1000,
  });
  assert.equal(result.counts.timedOut, 4);
  assert.equal(result.latency.sampleCount, 16);
  assert.equal(result.reconciliation.length, 4);
  assert.ok(result.reconciliation.every((r) => r.outcome === "committed"));
  assert.ok(
    result.observations
      .filter((o) => o.status === "timed_out")
      .every((o) => o.lowerBoundMs >= 30 && o.latencyMs === undefined),
  );
});
test("an early timer wake-up cannot report a timeout before the declared deadline", async (t) => {
  const nativeTimeout = globalThis.setTimeout;
  t.after(() => {
    globalThis.setTimeout = nativeTimeout;
  });
  // Exaggerate the observed clock-resolution mismatch to make this boundary
  // reproducible without relying on machine load or a lucky timer alignment.
  globalThis.setTimeout = (callback, milliseconds, ...args) =>
    nativeTimeout(callback, Math.max(1, milliseconds - 8), ...args);
  const result = await runProfile(
    fake({ execute: async () => new Promise(() => {}) }),
    { ...small, concurrency: 20 },
    { operationTimeoutMs: 20 },
  );
  assert.equal(result.counts.timedOut, 20);
  assert.equal(result.latency.sampleCount, 0);
  assert.ok(
    result.observations.every(
      (o) => o.lowerBoundMs >= 20 && o.latencyMs === undefined,
    ),
  );
});
test("overall deadline stops dispatch even when a fractional timer boundary is rounded", async () => {
  const result = await runProfile(
    fake({
      execute: async () => new Promise(() => {}),
      quiesce: async () => false,
    }),
    { ...small, concurrency: 3 },
    { operationTimeoutMs: 1000, runDeadlineMs: 25.8 },
  );
  assert.equal(result.counts.dispatched, 3);
  assert.equal(result.counts.unfinished, 3);
  assert.equal(result.counts.notStarted, 17);
  assert.equal(result.counts.timedOut, 0);
  assert.equal(result.latency.p95Ms, null);
  assert.ok(
    result.observations
      .filter((o) => o.status === "not_started")
      .every((o) => o.knownQueuedDurationMs >= 25.8),
  );
});
test("the suite never resets after unproven quiescence", async () => {
  const adapter = fake({ quiesce: async () => false });
  const report = await runBaseline(adapter);
  assert.equal(adapter.resets, 1);
  assert.equal(report.runs.length, 1);
  assert.equal(report.complete, false);
  assert.match(report.failure, /Quiescence/);
});
test("missing reconciliation observations remain explicitly unresolved", async () => {
  const adapter = fake({
    execute: async (op) => {
      if (op.kind === "create") throw new Error("uncertain write");
      return { outcome: op.kind === "reject" ? "expected_rejection" : "valid" };
    },
    reconcile: async () => [],
  });
  const result = await runProfile(adapter, small);
  assert.equal(result.reconciliation.length, 4);
  assert.ok(result.reconciliation.every((r) => r.outcome === "unresolved"));
});
test("post-run failed checks override an adapter's optimistic ok flag", async () => {
  const result = await runProfile(
    fake({
      verify: async () => ({
        ok: true,
        checks: [{ name: "summary matches real state", ok: false }],
      }),
    }),
    small,
  );
  assert.equal(result.verification.ok, false);
  assert.equal(result.counts.valid, 20);
});
test("unavailable application resources are not replaced by runner memory or invented zeros", async () => {
  const result = await runProfile(
    fake({
      resource: async () => {
        throw new Error("unavailable");
      },
    }),
    small,
  );
  assert.equal(result.resource.available, false);
  assert.deepEqual(result.resourceErrors, ["unavailable", "unavailable"]);
  assert.equal(result.counts.valid, 20);
});
test("the full fixed suite retains warm-up and all six measured repetitions", async () => {
  const adapter = fake();
  const result = await runBaseline(adapter);
  assert.equal(result.complete, true);
  assert.equal(adapter.resets, 7);
  assert.equal(result.runs.length, 7);
  assert.equal(result.runs.filter((r) => r.measured).length, 6);
  assert.deepEqual(
    result.summaries.map((s) => [s.profile, s.repetitions]),
    [
      ["steady", 3],
      ["higher-concurrency", 3],
    ],
  );
  assert.equal(
    result.runs.reduce((n, r) => n + r.counts.scheduled, 0),
    2200,
  );
  assert.ok(
    result.summaries.every(
      (s) =>
        s.allOperationsValid &&
        s.allChecksPassed &&
        s.allResourceProxiesAvailable,
    ),
  );
});
test("partial suite results are checkpointed before the next reset", async () => {
  const seen = [];
  let resets = 0;
  const adapter = fake({
    reset: async () => {
      if (++resets === 3) throw new Error("third reset failed");
    },
  });
  const report = await runBaseline(adapter, {
    onUpdate: async (value) =>
      seen.push({
        runs: value.runs.length,
        complete: value.complete,
        failure: value.failure,
      }),
  });
  assert.equal(report.runs.length, 2);
  assert.equal(report.complete, false);
  assert.match(report.failure, /third reset failed/);
  assert.deepEqual(
    seen.map((s) => s.runs),
    [0, 1, 2, 2],
  );
  assert.equal(seen.at(-1).failure, "third reset failed");
});
