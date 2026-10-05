// Run against an isolated `wrangler dev --local` instance, never a live course.
import assert from "node:assert/strict";
import type {
  Course,
  Envelope,
  CourseFile,
  Submission,
} from "../shared/course.ts";
const base = new URL(process.env.COURSE_WORKER_URL ?? "http://127.0.0.1:8788");
assert.equal(
  base.hostname,
  "127.0.0.1",
  "This smoke test only writes to loopback local storage.",
);
const secret =
  process.env.COURSE_SMOKE_SESSION_SECRET ?? "local-course-smoke-test-only";
async function session(id: number, login: string) {
  const payload = Buffer.from(
    JSON.stringify({ user: { id, login }, exp: Date.now() + 60_000 }),
  ).toString("base64url");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = Buffer.from(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)),
  ).toString("base64url");
  return `scalableweb_session=${payload}.${sig}`;
}
const admin = await session(1, "course-smoke-admin"),
  student = await session(2, "student"),
  outsider = await session(99, "outsider");
const asset = await fetch(new URL("/course.js", base));
assert.equal(asset.status, 200);
assert.equal(
  asset.headers.get("cache-control"),
  "public, max-age=0, must-revalidate",
);
async function call<T>(
  route: string,
  method = "GET",
  body?: unknown,
  cookie = admin,
): Promise<T> {
  const response = await fetch(new URL(`/api/courses${route}`, base), {
    method,
    headers: {
      Cookie: cookie,
      Origin: base.origin,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  assert.ok(response.ok, JSON.stringify(data));
  return data as T;
}
let config = await call<Envelope<Course>>("", "POST", {
  name: "Isolated Worker storage check",
});
const id = config.value.id;
const course = structuredClone(config.value);
course.students = [
  {
    id: "github:1",
    name: "Instructor student",
    number: "T001",
    login: "course-smoke-admin",
  },
  { id: "github:2", name: "Student", number: "T002", login: "student" },
];
for (const phase of Object.values(course.phases)) {
  phase.groups = [
    { id: "red", members: ["github:1"] },
    { id: "blue", members: ["github:2"] },
  ];
  phase.audits = [
    { from: "red", to: "blue" },
    { from: "blue", to: "red" },
  ];
}
config = await call(`/${id}/setup`, "PUT", {
  ...course,
  expected: config.revision,
  reason: "Smoke test roster and assignments",
});
const source = new TextEncoder().encode("streamed Worker R2 archive bytes");
const upload = await fetch(
  new URL(
    `/api/courses/${id}/files/establish/blue?scope=technical&name=source.zip`,
    base,
  ),
  {
    method: "POST",
    body: source,
    headers: {
      Cookie: student,
      Origin: base.origin,
      "Content-Length": String(source.length),
    },
  },
);
const file = (await upload.json()) as Envelope<CourseFile>;
assert.ok(upload.ok, JSON.stringify(file));
assert.equal(file.value.bytes, source.length);
assert.equal(file.value.sha256.length, 64);
const frozen = await call<Envelope<Submission>>(
  `/${id}/submission/establish/blue`,
  "PUT",
  {
    expected: null,
    stage: "freeze",
    value: {
      repository: "https://github.com/example/project",
      commit: "a".repeat(40),
      archive: file.value.id,
      setup: "Run seed data and tests",
      evidence: "Bounded evidence and known limits",
    },
  },
  student,
);
const audit = await call<Envelope>(`/${id}/audit/establish/red`, "PUT", {
  expected: null,
  report:
    "Staff fallback audit; setup 3m, probe 30m, recorded tools and conditions",
  reason: "Staff fallback",
});
assert.equal(
  (audit.value as { targetRevision: string }).targetRevision,
  frozen.revision,
);
const response = await call<Envelope<Submission>>(
  `/${id}/submission/establish/blue`,
  "PUT",
  {
    expected: frozen.revision,
    stage: "evidence",
    value: { response: "Responded to audit; source revision retained" },
  },
  student,
);
const stale = await fetch(
  new URL(`/api/courses/${id}/submission/establish/blue`, base),
  {
    method: "PUT",
    headers: {
      Cookie: student,
      Origin: base.origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      expected: frozen.revision,
      stage: "evidence",
      value: { response: "stale update" },
    }),
  },
);
assert.equal(stale.status, 409);
const history = await call<{ history: Envelope[] }>(
  `/${id}/history?key=${encodeURIComponent(frozen.key)}`,
);
assert.equal(history.history.length, 2);
const original = await call<{ history: Envelope[] }>(
  `/${id}/history?key=${encodeURIComponent(frozen.key)}&revision=${frozen.revision}`,
);
assert.equal((original.history[0]!.value as Submission).archive, file.value.id);
const project = await call<Envelope>(
  `/${id}/project-grade/establish/blue`,
  "PUT",
  {
    expected: null,
    scores: [6, 4, 5, 3, 2, 4, 4, 2],
    missing: false,
    feedback: "Checked against frozen archive and response",
    reason: "Storage smoke assessment",
  },
);
assert.equal(
  (project.value as { evidenceRevision: string }).evidenceRevision,
  response.revision,
);
const download = await fetch(
  new URL(`/api/courses/${id}/files/establish/${file.value.id}`, base),
  { headers: { Cookie: student } },
);
assert.equal(download.status, 200);
assert.deepEqual(new Uint8Array(await download.arrayBuffer()), source);
const forbidden = await fetch(new URL(`/api/courses/${id}`, base), {
  headers: { Cookie: outsider },
});
assert.equal(forbidden.status, 403);
const forged = await fetch(new URL(`/api/courses/${id}`, base), {
  headers: {
    Cookie: "scalableweb_session=forged.invalid",
    "x-course-test-user": "1",
  },
});
assert.equal(forged.status, 401);
console.log(
  "Local Worker check passed: verified sessions, D1 guarded writes/history, streamed R2 uploads/downloads, immutable snapshots, audit binding and access isolation.",
);
