// Run only against isolated loopback `wrangler dev --local` resources.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createStoredZip } from "./lib/zip.ts";
import {
  phases,
  type Course,
  type CourseFile,
  type Envelope,
  type Submission,
  type RecordHistory,
} from "../shared/course.ts";
import type { SimulationState } from "../shared/course-simulation.ts";
import { pendingWithdrawals } from "../shared/course-enrollment.ts";

const base = new URL(process.env.COURSE_WORKER_URL ?? "http://127.0.0.1:8788");
assert.equal(
  base.hostname,
  "127.0.0.1",
  "This check only writes synthetic records to loopback local storage.",
);
const secret =
  process.env.COURSE_SMOKE_SESSION_SECRET ?? "local-course-smoke-test-only";
const payload = Buffer.from(
  JSON.stringify({
    user: { id: 1, login: "course-smoke-admin" },
    exp: Date.now() + 5 * 60_000,
  }),
).toString("base64url");
const admin = `scalableweb_session=${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
async function response(
  route: string,
  method = "GET",
  body?: unknown,
  cookie = admin,
) {
  return fetch(new URL(route, base), {
    method,
    headers: {
      Cookie: cookie,
      Origin: base.origin,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function call<T = any>(
  route: string,
  method = "GET",
  body?: unknown,
  cookie = admin,
): Promise<T> {
  const res = await response(route, method, body, cookie),
    data = await res.json();
  assert.ok(res.ok, JSON.stringify(data));
  return data;
}
const live = await call<Envelope<Course>>("/api/courses", "POST", {
  name: "Synthetic live isolation sentinel",
});
const discovery = await call<{ environment: string }>("/api/simulation/status");
const control = `/api/simulation/${discovery.environment}/control`;
let status = await call<{ state: Envelope<SimulationState> | null }>(
  `${control}/status`,
);
const initialized = await call<{ state: Envelope<SimulationState> }>(
  `${control}/reset`,
  "POST",
  { expected: status.state?.revision ?? null, preset: "empty" },
);
const scoped = `/api/simulation/${discovery.environment}/${initialized.state.value.generation}`;
let config = await call<Envelope<Course>>(`${scoped}/courses`, "POST", {
  name: "Synthetic local D1/R2 rehearsal",
});
let view = await call(`${scoped}/courses/${config.value.id}`);
config = await call(`${scoped}/courses/${config.value.id}/students`, "PUT", {
  expected: view.administration.students,
  format: "institutional",
  reason: "Synthetic simulation roster",
  students: [1, 2, 3].map((n) => ({
    number: `SIM${n}`,
    firstName: `Synthetic ${n}`,
    lastName: "Example",
    email: `synthetic${n}@example.edu`,
  })),
});
for (const phase of phases)
  config.value.phases[phase].groups = [
    { id: "group-01", members: config.value.students.map((s) => s.id) },
  ];
config = await call(`${scoped}/courses/${config.value.id}/setup`, "PUT", {
  ...config.value,
  expected: config.revision,
  reason: "Approve synthetic trio",
});
status = await call(`${control}/status`);
await call(`${control}/role`, "POST", {
  expected: status.state!.revision,
  course: config.value.id,
  student: config.value.students[0]!.id,
});
view = await call(`${scoped}/courses/${config.value.id}`);
assert.equal(view.staff, false);
assert.equal(view.administration, undefined);
assert.equal(view.config.value.students[1].email, "");
const files = [
  "README.md",
  "app.mjs",
  "app.test.mjs",
  "package.json",
  "package-lock.json",
  "fixture.json",
  ".env.example",
];
const source = createStoredZip(
  await Promise.all(
    files.map(async (name) => ({
      name,
      data: await readFile(
        new URL(`../tests/fixtures/course-source/${name}`, import.meta.url),
      ),
    })),
  ),
);
const uploaded = await fetch(
  new URL(
    `${scoped}/courses/${config.value.id}/files/establish/group-01?scope=technical&name=source.zip`,
    base,
  ),
  {
    method: "POST",
    headers: {
      Cookie: admin,
      Origin: base.origin,
      "Content-Length": String(source.length),
    },
    body: new Uint8Array(source),
  },
);
assert.equal(uploaded.status, 201);
const file = (await uploaded.json()) as Envelope<CourseFile>;
const frozen = await call<Envelope<Submission>>(
  `${scoped}/courses/${config.value.id}/submission/establish/group-01`,
  "PUT",
  {
    expected: null,
    stage: "freeze",
    value: {
      repository: "",
      commit: "a".repeat(40),
      archive: file.value.id,
      setup:
        "Unpack; npm ci --offline --ignore-scripts; npm run fixtures; npm run validate; npm start.",
      evidence:
        "Limited synthetic readiness fixture; higher-load measurements missing.",
      checklist: [
        {
          id: "harness",
          status: "located",
          location: "README.md and app.test.mjs",
        },
        {
          id: "baseline",
          status: "missing",
          location: "Not collected in this boundary rehearsal",
        },
      ],
    },
  },
);
assert.equal(frozen.actor, config.value.students[0]!.id);
const download = await response(
  `${scoped}/courses/${config.value.id}/files/establish/${file.value.id}`,
);
assert.equal(download.status, 200);
assert.deepEqual(
  Buffer.from(await download.arrayBuffer()),
  Buffer.from(source),
);
assert.equal((await response(`/api/courses/${config.value.id}`)).status, 404);
assert.equal(
  (await response(`${scoped}/courses/${config.value.id}/export`)).status,
  403,
);
status = await call(`${control}/status`);
await call(`${control}/role`, "POST", {
  expected: status.state!.revision,
  student: null,
});
const history = await call<{ history: RecordHistory[] }>(
  `${scoped}/courses/${config.value.id}/history?key=${encodeURIComponent(frozen.key)}&revision=${frozen.revision}`,
);
assert.deepEqual(history.history[0]!.value, frozen.value);
const exported = await response(`${scoped}/courses/${config.value.id}/export`);
assert.match(
  exported.headers.get("content-disposition")!,
  /SIMULATION-course-grades/,
);
assert.match(await exported.text(), /^"environment","student_number"/);
await call(`${scoped}/course-auth/request`, "POST", {
  course: config.value.id,
  email: config.value.students[0]!.email,
});
const inbox = await call(`${control}/inbox?course=${config.value.id}`);
assert.equal(inbox.messages.length, 1);
const link = new URL(inbox.messages[0].url);
assert.equal(link.searchParams.get("simulation"), discovery.environment);
const token = new URLSearchParams(link.hash.slice(1)).get("login")!;
const verified = await response(`${scoped}/course-auth/verify`, "POST", {
  token,
});
assert.equal(verified.status, 200);
const cookie = `${admin}; ${verified.headers.get("set-cookie")!.split(";")[0]}`;
assert.match(cookie, /scalableweb_simulation_session=/);
assert.equal(
  (await response(`${scoped}/course-auth/verify`, "POST", { token })).status,
  400,
);
assert.equal(
  (await call(`${scoped}/courses/${config.value.id}`, "GET", undefined, cookie))
    .staff,
  false,
);
status = await call(`${control}/status`);
await call(
  `${control}/role`,
  "POST",
  { expected: status.state!.revision, student: null },
  cookie,
);
assert.equal(
  (
    await response(
      `${scoped}/courses/${config.value.id}`,
      "GET",
      undefined,
      cookie,
    )
  ).status,
  401,
);
await call(`${scoped}/course-auth/request`, "POST", {
  course: config.value.id,
  email: config.value.students[0]!.email,
});
const freshInbox = await call(`${control}/inbox?course=${config.value.id}`);
const freshToken = new URLSearchParams(
  new URL(freshInbox.messages[0].url).hash.slice(1),
).get("login")!;
const fresh = await response(`${scoped}/course-auth/verify`, "POST", {
  token: freshToken,
});
assert.equal(fresh.status, 200);
const expiryCookie = `${admin}; ${fresh.headers.get("set-cookie")!.split(";")[0]}`;
status = await call(`${control}/status`);
await call(`${control}/clock`, "POST", {
  expected: status.state!.revision,
  now: "2026-11-01T08:00:00.000Z",
});
assert.equal(
  (
    await response(
      `${scoped}/courses/${config.value.id}`,
      "GET",
      undefined,
      expiryCookie,
    )
  ).status,
  401,
);
status = await call(`${control}/status`);
await call(`${control}/reset`, "POST", {
  expected: status.state!.revision,
  preset: "empty",
});
assert.equal(
  (await response(`${scoped}/courses/${config.value.id}`)).status,
  409,
);
assert.deepEqual((await call(`/api/courses/${live.value.id}`)).config, live);
status = await call(`${control}/status`);
let seeded = await call<{ state: Envelope<SimulationState> }>(
  `${control}/reset`,
  "POST",
  {
    expected: status.state!.revision,
    preset: "grading-review",
    size: "larger",
  },
);
const concurrentPreparation = await Promise.all([
  response(`${control}/prepare`, "POST", { expected: seeded.state.revision }),
  response(`${control}/prepare`, "POST", { expected: seeded.state.revision }),
]);
assert.deepEqual(
  concurrentPreparation.map((res) => res.status).sort(),
  [200, 409],
);
seeded = await call(`${control}/status`);
for (let i = 0; seeded.state.value.preparing && i < 100; i++)
  seeded = await call(`${control}/prepare`, "POST", {
    expected: seeded.state.revision,
  });
assert.equal(seeded.state.value.preparing, undefined);
const catalog = await call(`${control}/status`),
  presetCourse = catalog.courses[0].id;
const presetBase = `/api/simulation/${discovery.environment}/${seeded.state.value.generation}/courses/${presetCourse}`;
let presetView = await call(presetBase);
assert.equal(presetView.config.value.students.length, 31);
assert.equal(presetView.results[4].result.status, "pending");
const departed = presetView.config.value.students[5];
assert.equal(pendingWithdrawals(presetView.config.value)[0]!.id, departed.id);
assert.equal(presetView.results[5].result.status, "withdrawn");
assert.equal(presetView.results[5].result.grade, null);
const departureGrades = presetView.individuals.filter(
  (g: any) => g.value.subject === departed.id,
);
const departureSubmissions = presetView.submissions.filter((s: any) =>
  s.value.members.includes(departed.id),
);
assert.equal(departureGrades.length, 3);
assert.equal(departureSubmissions.length, 3);
assert.equal(
  (
    await response(`${presetBase}/publish/compare`, "POST", {
      expected: presetView.config.revision,
      published: true,
      reason: "Reject stale synthetic release",
    })
  ).status,
  400,
);
const changed = presetView.individuals.find(
  (g: any) =>
    g.value.phase === "compare" &&
    g.value.subject === presetView.config.value.students[4].id,
);
await call(
  `${presetBase}/individual-grade/compare/${changed.value.subject}`,
  "PUT",
  {
    expected: changed.revision,
    missing: false,
    scores: changed.value.scores,
    feedback: "Checked current synthetic correction",
    reason: "Refresh stale rehearsal grade",
  },
);
await call(`${presetBase}/publish/compare`, "POST", {
  expected: presetView.config.revision,
  published: true,
  reason: "Release current simulation grades",
});
presetView = await call(presetBase);
assert.equal(presetView.results[0].result.grade, 5);
assert.equal(presetView.results[1].result.status, "fail");
assert.ok(presetView.results[1].result.percentage > 90);
assert.equal(presetView.results[2].result.status, "fail");
const sample = presetView.submissions.find(
  (s: any) => s.value.phase === "compare",
);
assert.equal(sample.value.finalEvidence.references.length, 2);
const sampleArchive = await response(
  `${presetBase}/files/compare/${sample.value.archive}`,
);
assert.equal(sampleArchive.status, 200);
assert.equal(new Uint8Array(await sampleArchive.arrayBuffer())[0], 0x50);
const frozenSample = await call(
  `${presetBase}/history?key=${encodeURIComponent(sample.key)}&revision=${sample.value.frozenRevision}`,
);
assert.equal(frozenSample.history[0].value.finalEvidence, undefined);
const presetCsv = await (await response(`${presetBase}/export`)).text();
assert.match(presetCsv, /"SIM002","Ben Example".*"0","fail"/);
assert.deepEqual(
  presetCsv
    .split("\r\n")
    .find((line) => line.includes('"SIM006"'))!
    .split(",")
    .slice(4),
  ['""', '""', '""', '""', '"withdrawn"', '""', '""'],
);
await call(`${presetBase}/enrollment`, "PUT", {
  expected: presetView.administration.students,
  student: departed.id,
  action: "review-withdrawal",
  resolution:
    "PRIVATE rehearsal review: retain frozen members; remaining team and audit fallbacks checked",
  reason: "Complete the withdrawal task using actual D1 storage",
});
const reviewedDeparture = await call(presetBase);
assert.deepEqual(pendingWithdrawals(reviewedDeparture.config.value), []);
assert.deepEqual(
  reviewedDeparture.individuals.filter(
    (g: any) => g.value.subject === departed.id,
  ),
  departureGrades,
);
assert.deepEqual(
  reviewedDeparture.submissions.filter((s: any) =>
    s.value.members.includes(departed.id),
  ),
  departureSubmissions,
);
const departureRole = await call(`${control}/role`, "POST", {
  expected: seeded.state.revision,
  course: presetCourse,
  student: departed.id,
});
const ownDeparture = await call(presetBase);
assert.equal(ownDeparture.results[0].result.status, "withdrawn");
assert.equal(JSON.stringify(ownDeparture).includes("PRIVATE"), false);
assert.equal(
  (await response(`${presetBase}/portfolio/compare/${departed.id}`, "PUT", {}))
    .status,
  403,
);
await call(`${control}/role`, "POST", {
  expected: departureRole.state.revision,
  student: null,
});
assert.deepEqual((await call(`/api/courses/${live.value.id}`)).config, live);
console.log(
  "Local simulation check passed: isolated D1/R2 records and streaming, permissions, frozen history, mock authentication, clock, export and reset; larger grading preset, private withdrawal review/read-only access/blank grade, stale release and mandatory minima verified; live sentinel unchanged.",
);
