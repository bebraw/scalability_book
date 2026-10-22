import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";
import {
  protocolVersion,
  profiles,
  makeFixture,
  makeOperations,
  median,
  nearestRank,
} from "./protocol.mjs";

const message = (error) => String(error?.message || error);
const isWrite = (operation) => !["feed", "summary"].includes(operation.kind);

// Node timers can fire before a performance.now() deadline because their clock
// has a different resolution. Recheck the deadline before reporting a timeout.
function atDeadline(milliseconds, callback) {
  const expiresAt = performance.now() + milliseconds;
  let timer;
  const check = () => {
    const remaining = expiresAt - performance.now();
    if (remaining > 0) timer = setTimeout(check, Math.ceil(remaining));
    else callback();
  };
  timer = setTimeout(check, Math.ceil(milliseconds));
  return () => clearTimeout(timer);
}

async function bounded(work, milliseconds, label) {
  const controller = new AbortController();
  let cancelDeadline;
  try {
    return await Promise.race([
      Promise.resolve().then(() => work(controller.signal)),
      new Promise((_, reject) => {
        cancelDeadline = atDeadline(milliseconds, () => {
          reject(new Error(`${label} exceeded its deadline.`));
          controller.abort();
        });
      }),
    ]);
  } finally {
    cancelDeadline?.();
  }
}

export function checkAdapter(adapter) {
  for (const name of [
    "reset",
    "execute",
    "quiesce",
    "verify",
    "reconcile",
    "resource",
  ])
    if (typeof adapter[name] !== "function")
      throw new Error(`Adapter must implement ${name}().`);
  for (const name of [
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
  ])
    if (
      typeof adapter.metadata?.[name] !== "string" ||
      !adapter.metadata[name].trim()
    )
      throw new Error(`Adapter metadata.${name} must be explicit.`);
}

function resourceDelta(before, after, valid) {
  if (
    !before ||
    !after ||
    before.name !== after.name ||
    before.unit !== after.unit ||
    before.kind !== after.kind ||
    ![before.value, after.value].every(Number.isFinite)
  )
    return {
      available: false,
      detail: "A consistent application resource proxy was unavailable.",
    };
  const value =
    after.kind === "cumulative" ? after.value - before.value : after.value;
  if (value < 0 || !["cumulative", "gauge"].includes(after.kind))
    return { available: false, detail: "Invalid resource observations." };
  return {
    available: true,
    name: after.name,
    unit: after.unit,
    kind: after.kind,
    boundary: after.boundary ?? before.boundary ?? "Not described",
    before: before.value,
    after: after.value,
    value,
    perValidCompletion: valid ? value / valid : null,
  };
}

export async function runProfile(adapter, profile, options = {}) {
  checkAdapter(adapter);
  const {
    seed = "course-2026",
    runKey = profile.name,
    operationTimeoutMs = 10000,
    runDeadlineMs = 300000,
    preparationTimeoutMs = 300000,
    observationTimeoutMs = 10000,
  } = options;
  for (const [name, value] of Object.entries({
    operationTimeoutMs,
    runDeadlineMs,
    preparationTimeoutMs,
    observationTimeoutMs,
  }))
    if (!Number.isFinite(value) || value <= 0)
      throw new Error(`${name} must be positive.`);
  if (!Number.isInteger(profile.concurrency) || profile.concurrency < 1)
    throw new Error("Concurrency must be a positive integer.");
  const fixture = makeFixture();
  const operations = makeOperations(profile.operations, seed, runKey, fixture);
  await bounded(
    (signal) => adapter.reset(fixture, { signal }),
    preparationTimeoutMs,
    "Fixture reset/seed",
  );
  const resourceErrors = [];
  const sampleResource = async () => {
    try {
      return await bounded(
        (signal) => adapter.resource({ signal }),
        observationTimeoutMs,
        "Resource observation",
      );
    } catch (error) {
      resourceErrors.push(message(error));
      return null;
    }
  };
  const before = await sampleResource();
  const observations = operations.map((operation) => ({
    id: operation.id,
    kind: operation.kind,
    status: "not_started",
  }));
  const start = performance.now();
  let next = 0,
    active = 0,
    maxActive = 0,
    runExpired = false;
  async function worker() {
    while (
      !runExpired &&
      next < operations.length &&
      performance.now() - start < runDeadlineMs
    ) {
      const index = next++;
      const operation = operations[index];
      const dispatchedAt = performance.now();
      const observation = observations[index];
      observation.dispatchedAtMs = dispatchedAt - start;
      active++;
      maxActive = Math.max(maxActive, active);
      const controller = new AbortController();
      let cancelDeadline;
      const remainingRun = runDeadlineMs - (dispatchedAt - start);
      const limit = Math.min(operationTimeoutMs, remainingRun);
      const deadlineStatus =
        remainingRun <= operationTimeoutMs ? "unfinished" : "timed_out";
      try {
        const execution = Promise.resolve()
          .then(() => adapter.execute(operation, { signal: controller.signal }))
          .then(
            (result) => ({ result }),
            (error) => ({ error: message(error) }),
          );
        const completed = await Promise.race([
          execution,
          new Promise((resolve) => {
            cancelDeadline = atDeadline(limit, () => {
              resolve({ deadline: deadlineStatus });
              controller.abort();
            });
          }),
        ]);
        const elapsed = performance.now() - dispatchedAt;
        if (completed.deadline || elapsed >= limit) {
          observation.status = completed.deadline || deadlineStatus;
          observation.lowerBoundMs = elapsed;
          if (observation.status === "unfinished") runExpired = true;
        } else if (completed.error) {
          observation.status = "error";
          observation.error = completed.error;
          observation.observedDurationMs = elapsed;
        } else if (
          completed.result?.outcome ===
          (operation.kind === "reject" ? "expected_rejection" : "valid")
        ) {
          observation.status = completed.result.outcome;
          observation.latencyMs = elapsed;
        } else {
          observation.status = "error";
          observation.error =
            "Adapter did not validate the expected logical outcome.";
          observation.observedDurationMs = elapsed;
        }
      } finally {
        cancelDeadline?.();
        active--;
      }
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(profile.concurrency, operations.length) },
      worker,
    ),
  );
  const elapsedMs = performance.now() - start;
  for (const o of observations)
    if (o.status === "not_started") o.knownQueuedDurationMs = elapsedMs;
  let safeToReset = false;
  let quiescenceError;
  try {
    safeToReset =
      (await bounded(
        (signal) => adapter.quiesce({ signal }),
        observationTimeoutMs,
        "Quiescence",
      )) === true;
  } catch (error) {
    quiescenceError = message(error);
  }
  const after = await sampleResource();
  const unknown = operations.filter(
    (operation, i) =>
      isWrite(operation) &&
      ["timed_out", "unfinished", "error"].includes(observations[i].status),
  );
  let reconciliation = [];
  let reconciliationError;
  if (unknown.length) {
    try {
      const returned = await bounded(
        (signal) => adapter.reconcile(unknown, { signal }),
        observationTimeoutMs,
        "Write reconciliation",
      );
      reconciliation = unknown.map((o) => {
        const result = Array.isArray(returned)
          ? returned.find((r) => r.id === o.id)
          : undefined;
        return result &&
          ["committed", "not_committed", "unresolved"].includes(result.outcome)
          ? { id: o.id, outcome: result.outcome, detail: result.detail ?? "" }
          : {
              id: o.id,
              outcome: "unresolved",
              detail: "No valid reconciliation observation.",
            };
      });
    } catch (error) {
      reconciliationError = message(error);
      reconciliation = unknown.map((o) => ({
        id: o.id,
        outcome: "unresolved",
      }));
    }
  }
  let verification;
  try {
    verification = await bounded(
      (signal) =>
        adapter.verify({
          fixture,
          operations,
          observations,
          reconciliation,
          signal,
        }),
      observationTimeoutMs,
      "Post-run verification",
    );
    if (
      !Array.isArray(verification?.checks) ||
      !verification.checks.length ||
      verification.checks.some((c) => typeof c.ok !== "boolean" || !c.name)
    )
      throw new Error(
        "Verification must return named checks with boolean outcomes.",
      );
    verification = {
      ...verification,
      ok: verification.checks.every((c) => c.ok),
    };
  } catch (error) {
    verification = {
      ok: false,
      checks: [
        { name: "post-run verification", ok: false, detail: message(error) },
      ],
    };
  }
  const latencies = observations
    .filter((o) => ["valid", "expected_rejection"].includes(o.status))
    .map((o) => o.latencyMs);
  const count = (status) =>
    observations.filter((o) => o.status === status).length;
  const completedValid = latencies.length;
  const counts = {
    scheduled: operations.length,
    dispatched: observations.filter((o) => o.dispatchedAtMs !== undefined)
      .length,
    valid: completedValid,
    reads: observations.filter(
      (o) => o.status === "valid" && ["feed", "summary"].includes(o.kind),
    ).length,
    writes: observations.filter(
      (o) => o.status === "valid" && !["feed", "summary"].includes(o.kind),
    ).length,
    expectedRejections: count("expected_rejection"),
    errors: count("error"),
    timedOut: count("timed_out"),
    unfinished: count("unfinished"),
    notStarted: count("not_started"),
  };
  return {
    profile: profile.name,
    measured: profile.measured ?? true,
    runKey,
    seed,
    concurrency: profile.concurrency,
    maxActive,
    operationTimeoutMs,
    runDeadlineMs,
    elapsedMs,
    counts,
    validCompletionsPerSecond: elapsedMs
      ? completedValid / (elapsedMs / 1000)
      : null,
    latency: {
      sampleCount: latencies.length,
      medianMs: median(latencies),
      p95Ms: nearestRank(latencies, 0.95),
      percentile: "nearest rank ceil(0.95*n)",
      conditionalOnValidCompletion: true,
    },
    resource: resourceDelta(before, after, completedValid),
    resourceErrors,
    safeToReset,
    quiescenceError,
    reconciliation,
    reconciliationError,
    verification,
    operations,
    observations,
  };
}

export async function runBaseline(adapter, options = {}) {
  checkAdapter(adapter);
  const fixture = makeFixture();
  const report = {
    protocolVersion,
    requirements: "2026-10-v2",
    generatedAt: new Date().toISOString(),
    metadata: { ...adapter.metadata },
    fixtureSha256: createHash("sha256")
      .update(JSON.stringify(fixture))
      .digest("hex"),
    runs: [],
    summaries: [],
    complete: false,
  };
  const publish = async () => {
    if (options.onUpdate) await options.onUpdate(report);
  };
  await publish();
  for (const profile of profiles)
    for (let repetition = 1; repetition <= profile.repetitions; repetition++) {
      try {
        const result = await runProfile(adapter, profile, {
          ...options,
          runKey: `${profile.name}-${repetition}`,
        });
        report.runs.push(result);
        if (!result.safeToReset) {
          report.failure =
            "Quiescence was not established; subsequent resets and repetitions were stopped.";
          await publish();
          return report;
        }
        if (!profile.measured && !result.verification.ok) {
          report.failure =
            "Warm-up correctness failed; no measured baseline was attempted.";
          await publish();
          return report;
        }
        await publish();
      } catch (error) {
        report.failure = message(error);
        await publish();
        return report;
      }
    }
  report.complete = true;
  for (const profile of profiles.filter((p) => p.measured)) {
    const runs = report.runs.filter((r) => r.profile === profile.name);
    report.summaries.push({
      profile: profile.name,
      repetitions: runs.length,
      medianValidCompletionsPerSecond: median(
        runs.map((r) => r.validCompletionsPerSecond),
      ),
      medianP95Ms: median(runs.map((r) => r.latency.p95Ms)),
      allChecksPassed: runs.every((r) => r.verification.ok),
      allOperationsValid: runs.every(
        (r) => r.counts.valid === r.counts.scheduled,
      ),
      allResourceProxiesAvailable: runs.every((r) => r.resource.available),
    });
  }
  await publish();
  return report;
}
