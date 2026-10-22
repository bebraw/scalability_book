export const protocolVersion = "work-activity-baseline-v1";
export const profiles = [
  {
    name: "warm-up",
    operations: 100,
    concurrency: 1,
    repetitions: 1,
    measured: false,
  },
  {
    name: "steady",
    operations: 500,
    concurrency: 4,
    repetitions: 3,
    measured: true,
  },
  {
    name: "higher-concurrency",
    operations: 200,
    concurrency: 16,
    repetitions: 3,
    measured: true,
  },
];
export const actors = ["actor-01", "actor-02", "actor-03", "actor-04"];
export const eventTypes = ["item_created", "work_started", "work_completed"];

export function makeFixture() {
  const workspaces = Array.from({ length: 8 }, (_, i) => ({
    key: `workspace-${String(i + 1).padStart(2, "0")}`,
    name: `workspace-${String(i + 1).padStart(2, "0")}`,
  }));
  const items = [];
  // Interleave workspaces so distinct transition targets also spread across them.
  for (let i = 0; i < 50; i++)
    for (let w = 0; w < 8; w++)
      items.push({
        key: `${workspaces[w].key}/item-${String(i + 1).padStart(3, "0")}`,
        workspaceKey: workspaces[w].key,
        title: `Fixture item ${String(i + 1).padStart(3, "0")}`,
        state: i < 20 ? "open" : i < 35 ? "in_progress" : "done",
        actor: actors[(w * 50 + i) % 4],
      });
  return { workspaces, items, actors: [...actors] };
}

function randomFor(seed) {
  let value = 2166136261;
  for (const c of String(seed))
    value = Math.imul(value ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeOperations(count, seed, runKey, fixture = makeFixture()) {
  if (!Number.isInteger(count) || count <= 0 || count % 20 !== 0)
    throw new Error("Operation count must be a positive multiple of 20.");
  const initial = fixture.items.filter((i) => i.state === "open");
  const active = fixture.items.filter((i) => i.state === "in_progress");
  if (count / 4 > initial.length || count / 10 > active.length)
    throw new Error(
      "Fixture does not have enough distinct transition targets.",
    );
  const mix = [
    ...Array(6).fill("feed"),
    ...Array(3).fill("summary"),
    ...Array(4).fill("create"),
    ...Array(3).fill("start"),
    ...Array(2).fill("finish"),
    ...Array(2).fill("reject"),
  ];
  const counters = {
    feed: 0,
    summary: 0,
    create: 0,
    start: 0,
    finish: 0,
    reject: 0,
  };
  const operations = [];
  for (let n = 0; n < count; n++) {
    const kind = mix[n % 20];
    const index = counters[kind]++;
    const operation = { id: `${runKey}-${kind}-${index}`, kind };
    if (kind === "feed") {
      if (index % 3 === 1)
        operation.workspaceKey =
          fixture.workspaces[Math.floor(index / 3) % 8].key;
      if (index % 3 === 2)
        operation.eventType = eventTypes[Math.floor(index / 3) % 3];
    } else if (kind === "summary" || kind === "create") {
      operation.workspaceKey = fixture.workspaces[index % 8].key;
      if (kind === "create") {
        operation.title = `Benchmark ${operation.id}`;
        operation.actor = actors[index % 4];
      }
    } else {
      const target =
        kind === "finish"
          ? active[index]
          : initial[(kind === "reject" ? count * 0.15 : 0) + index];
      operation.itemKey = target.key;
      operation.workspaceKey = target.workspaceKey;
      operation.actor = actors[index % 4];
      operation.state = kind === "start" ? "in_progress" : "done";
    }
    operations.push(operation);
  }
  const random = randomFor(seed);
  for (let i = operations.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [operations[i], operations[j]] = [operations[j], operations[i]];
  }
  return operations;
}

export function median(values) {
  if (
    !values.length ||
    values.some((v) => typeof v !== "number" || !Number.isFinite(v))
  )
    return null;
  const sorted = [...values].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}
export function nearestRank(values, fraction) {
  if (!values.length) return null;
  return [...values].sort((a, b) => a - b)[
    Math.ceil(fraction * values.length) - 1
  ];
}
