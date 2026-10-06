// Run against an isolated `wrangler dev --local` instance, never a live course.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { authHash } from "../worker/course-auth.ts";
import type { AdministrationRevisions } from "../shared/course-administration.ts";
import type { InquiryThread } from "../shared/course-inquiry.ts";
import type {
  GroupProposal,
  WorkingAgreement,
} from "../shared/course-formation.ts";
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
    {
      id: "red",
      members: ["github:1"],
      exception: "Approved small synthetic fixture",
    },
    {
      id: "blue",
      members: ["github:2"],
      exception: "Approved small synthetic fixture",
    },
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
const inquirySource = {
  url: new URL("/chapters/benchmarking/", base).href,
  anchor: "p-worker-inquiry-check",
  title: "Observation intervals",
  excerpt: "Use a common observation interval.",
  kind: "passage",
  revision: "synthetic-worker-check",
  conceptIds: ["queue"],
};
const inquiryQuery = `/${id}/inquiry?source=${encodeURIComponent(JSON.stringify(inquirySource))}&question=reading`;
assert.equal(
  (
    await fetch(new URL(`/api/courses${inquiryQuery}`, base), {
      headers: { Cookie: student },
    })
  ).status,
  403,
);
await call(
  `/${id}/inquiry/attempts`,
  "POST",
  {
    source: inquirySource,
    question: "reading",
    noteId: crypto.randomUUID(),
    noteRevision: crypto.randomUUID(),
  },
  student,
);
const inquiry = await call<Envelope<InquiryThread>>(
  `/${id}/inquiry`,
  "POST",
  {
    source: inquirySource,
    question: "reading",
    audience: { kind: "group", phase: "establish", group: "blue" },
    kind: "question",
    body: "Synthetic private group inquiry",
    provenance: "Local binding check",
    links: [],
  },
  student,
);
const inquiryPage = await call<{
  threads: Envelope<InquiryThread>[];
  next: string | null;
}>(inquiryQuery, "GET", undefined, student);
assert.equal(inquiryPage.threads.length, 1);
assert.equal(inquiryPage.threads[0]!.key, inquiry.key);
assert.equal(inquiryPage.next, null);
const courseView = await call(`/${id}`, "GET", undefined, student);
assert.equal(
  JSON.stringify(courseView).includes("Synthetic private group inquiry"),
  false,
);
assert.equal(
  (
    await fetch(
      new URL(`/api/courses/${id}/inquiry/${inquiry.value.id}`, base),
      { headers: { Cookie: outsider } },
    )
  ).status,
  403,
);
const inquiryReply = await call<Envelope<InquiryThread>>(
  `/${id}/inquiry/${inquiry.value.id}/replies`,
  "POST",
  {
    expected: inquiry.revision,
    kind: "check",
    body: "Synthetic instructor observation",
  },
);
assert.equal(inquiryReply.value.posts.length, 2);
assert.equal(
  (
    await fetch(
      new URL(`/api/courses/${id}/inquiry/${inquiry.value.id}/replies`, base),
      {
        method: "POST",
        headers: {
          Cookie: student,
          Origin: base.origin,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expected: inquiry.revision,
          kind: "question",
          body: "Stale reply",
        }),
      },
    )
  ).status,
  409,
);
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
const technicalBytes = new TextEncoder().encode(
  "operation,result\ntransition,passed\n",
);
const technicalUpload = await fetch(
  new URL(
    `/api/courses/${id}/files/establish/blue?scope=technical&purpose=evidence&name=results.csv`,
    base,
  ),
  {
    method: "POST",
    body: technicalBytes,
    headers: {
      Cookie: student,
      Origin: base.origin,
      "Content-Length": String(technicalBytes.length),
    },
  },
);
assert.equal(technicalUpload.status, 201, await technicalUpload.clone().text());
const technicalFile = (await technicalUpload.json()) as Envelope<CourseFile>;
const response = await call<Envelope<Submission>>(
  `/${id}/submission/establish/blue`,
  "PUT",
  {
    expected: frozen.revision,
    stage: "evidence",
    value: {
      response: "Responded to audit; source revision retained",
      finalEvidence: {
        index:
          "Technical lifecycle results; shared baseline remains incomplete.",
        files: [technicalFile.value.id],
        checklist: [
          {
            id: "harness",
            status: "located",
            location: "README.md and results.csv",
          },
          {
            id: "baseline",
            status: "missing",
            location:
              "Synthetic fixture does not contain full measured profiles.",
          },
        ],
        references: [],
      },
    },
  },
  student,
);
assert.equal(response.value.archive, frozen.value.archive);
assert.equal(response.value.frozenRevision, frozen.value.frozenRevision);
assert.deepEqual(response.value.checklist, frozen.value.checklist);
const technicalDownload = await fetch(
  new URL(`/api/courses/${id}/files/establish/${technicalFile.value.id}`, base),
  { headers: { Cookie: student } },
);
assert.equal(technicalDownload.status, 200);
assert.deepEqual(
  new Uint8Array(await technicalDownload.arrayBuffer()),
  technicalBytes,
);
const readOnly = await call<Envelope<Submission>>(
  `/${id}/submission/establish/blue?frozenRevision=${frozen.value.frozenRevision}`,
  "GET",
  undefined,
  student,
);
assert.equal(readOnly.value.finalEvidence!.files[0], technicalFile.value.id);
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
const view = await call<{ administration: AdministrationRevisions }>(`/${id}`);
config = await call(`/${id}/students`, "PUT", {
  expected: view.administration.students,
  format: "institutional",
  students: [
    {
      number: "T003",
      firstName: "Email",
      lastName: "Student",
      email: "worker-test@example.edu",
    },
  ],
  reason: "Synthetic email enrollment",
});
const emailStudent = config.value.students.find((s) => s.number === "T003")!;
assert.ok(emailStudent.enrollment?.enrolledAt);
assert.equal(
  emailStudent.enrollment.lateAt,
  emailStudent.enrollment.enrolledAt,
);
const enrollmentView = await call<{ administration: AdministrationRevisions }>(
  `/${id}`,
);
config = await call(`/${id}/enrollment`, "PUT", {
  expected: enrollmentView.administration.students,
  student: emailStudent.id,
  late: true,
  catchUp:
    "Synthetic catch-up plan: agree the future-phase allocation and complete missed individual activities.",
  reason: "PRIVATE synthetic enrollment reason",
});
const token = crypto.randomUUID().replaceAll("-", "") + "01234567890";
const expires = new Date(Date.now() + 900_000).toISOString();
assert.match(id, /^[a-f0-9-]{36}$/);
assert.match(emailStudent.id, /^student:[a-f0-9-]{36}$/);
// Seed only a synthetic credential into the isolated local D1 database. No mail
// delivery or test-auth endpoint is enabled in the deployed Worker.
const seed = spawnSync(
  "rtk",
  [
    "proxy",
    "npx",
    "wrangler",
    "d1",
    "execute",
    "COURSE_DB",
    "--config",
    "wrangler.course.jsonc",
    "--local",
    "--persist-to",
    process.env.COURSE_SMOKE_D1_STATE ?? "/tmp/course-worker-state",
    "--command",
    `INSERT INTO course_login_links(token_hash, course_id, student_id, email, expires_at, ready) VALUES('${authHash(token)}', '${id}', '${emailStudent.id}', 'worker-test@example.edu', '${expires}', 1)`,
  ],
  { encoding: "utf8" },
);
assert.equal(seed.status, 0, seed.stderr);
const verify = (credential: string) =>
  fetch(new URL("/api/course-auth/verify", base), {
    method: "POST",
    headers: { Origin: base.origin, "Content-Type": "application/json" },
    body: JSON.stringify({ token: credential }),
  });
const signed = await verify(token);
assert.equal(signed.status, 200, await signed.clone().text());
const emailCookie = signed.headers.get("set-cookie")!.split(";")[0]!;
const emailView = await call<{
  config: Envelope<Course>;
  staff: boolean;
  user: { id: string };
}>(`/${id}`, "GET", undefined, emailCookie);
assert.equal(emailView.staff, false);
assert.equal(emailView.user.id, emailStudent.id);
assert.equal(
  emailView.config.value.students.find((s) => s.id === emailStudent.id)!
    .enrollment!.catchUp,
  config.value.students.find((s) => s.id === emailStudent.id)!.enrollment!
    .catchUp,
);
assert.equal(JSON.stringify(emailView).includes("PRIVATE"), false);
assert.equal((await verify(token)).status, 400);
let formationView = await call<{
  config: Envelope<Course>;
  administration: AdministrationRevisions;
}>(`/${id}`);
const formationDates = {
  deadline: new Date(Date.now() + 3 * 86400000).toISOString(),
  correctionUntil: new Date(Date.now() + 5 * 86400000).toISOString(),
};
await call(`/${id}/formation/challenge`, "PUT", {
  expected: formationView.administration.groups.challenge,
  ...formationDates,
  reason: "Open synthetic formation in D1",
});
assert.deepEqual(
  await call(
    `/${id}/group-preference/challenge`,
    "PUT",
    {
      expected: null,
      request: "assign",
      available: true,
      availability: "PRIVATE synthetic availability",
      support: "PRIVATE synthetic matching constraint",
    },
    emailCookie,
  ),
  { ok: true },
);
assert.deepEqual(
  await call(
    `/${id}/group-proposal/challenge`,
    "PUT",
    {
      expected: null,
      members: [emailStudent.id, "github:2"],
      name: "Worker pair",
    },
    emailCookie,
  ),
  { ok: true },
);
const proposed = await call<{ config: Envelope<Course> }>(
  `/${id}`,
  "GET",
  undefined,
  emailCookie,
);
const proposal = proposed.config.value.phases.challenge.formation!
  .proposals[0] as GroupProposal;
assert.deepEqual(
  await call(
    `/${id}/group-confirmation/challenge/${proposal.id}`,
    "PUT",
    { expected: proposal.revision, confirm: true },
    student,
  ),
  { ok: true },
);
const otherView = await call<{ config: Envelope<Course> }>(
  `/${id}`,
  "GET",
  undefined,
  student,
);
assert.equal(JSON.stringify(otherView).includes("PRIVATE"), false);
assert.equal(
  otherView.config.value.students.find((s) => s.id === emailStudent.id)!
    .enrollment,
  undefined,
);
assert.equal(otherView.config.value.phases.challenge.groups.length, 0);
formationView = await call(`/${id}`);
await call(`/${id}/schedule/challenge`, "PUT", {
  expected: formationView.administration.schedule.challenge,
  ...formationView.config.value.phases.challenge,
  audits: [],
  reason: "Clear unused future audit allocation",
});
formationView = await call(`/${id}`);
await call(`/${id}/groups/challenge`, "PUT", {
  expected: formationView.administration.groups.challenge,
  groups: [
    {
      id: "blue",
      members: ["github:1", "github:2", emailStudent.id],
      proposal: proposal.id,
      name: "Worker trio",
    },
  ],
  reason: "Approve confirmed pair with instructor-allocated third member",
});
formationView = await call(`/${id}`);
await call(`/${id}/formation/challenge`, "PUT", {
  expected: formationView.administration.groups.challenge,
  ...formationDates,
  publish: true,
  reason: "Publish synthetic approved groups",
});
const agreement = await call<Envelope<WorkingAgreement>>(
  `/${id}/working-agreement/challenge/blue`,
  "PUT",
  {
    expected: null,
    text: "Synthetic weekly meeting, shared review and missed-commitment agreement.",
  },
  emailCookie,
);
assert.equal(agreement.value.group, "blue");
assert.deepEqual(
  (await call<{ config: Envelope<Course> }>(`/${id}`)).config.value.phases
    .establish.groups,
  course.phases.establish.groups,
);
const beforeWithdrawal = await call<{
  config: Envelope<Course>;
  administration: AdministrationRevisions;
}>(`/${id}`);
await call(`/${id}/enrollment`, "PUT", {
  expected: beforeWithdrawal.administration.students,
  student: "github:2",
  action: "withdraw",
  reason: "PRIVATE synthetic withdrawal reason",
});
const withdrawn = await call<{
  config: Envelope<Course>;
  administration: AdministrationRevisions;
  projects: Envelope[];
  results: {
    student: { id: string };
    result: { status: string; grade: number | null };
  }[];
}>(`/${id}`);
assert.equal(
  withdrawn.results.find((r) => r.student.id === "github:2")!.result.status,
  "withdrawn",
);
assert.equal(
  withdrawn.results.find((r) => r.student.id === "github:2")!.result.grade,
  null,
);
assert.deepEqual(
  withdrawn.config.value.phases,
  beforeWithdrawal.config.value.phases,
);
assert.deepEqual(
  (
    await call<{ history: Envelope[] }>(
      `/${id}/history?key=${encodeURIComponent(frozen.key)}`,
    )
  ).history,
  history.history,
);
assert.equal(
  withdrawn.projects.find((p) => p.key === project.key)!.revision,
  project.revision,
);
const retainedArchive = await fetch(
  new URL(`/api/courses/${id}/files/establish/${file.value.id}`, base),
  { headers: { Cookie: student } },
);
assert.deepEqual(new Uint8Array(await retainedArchive.arrayBuffer()), source);
for (const [route, cookie, status] of [
  ["portfolio/establish/github:2", student, 403],
  ["project-grade/establish/blue", admin, 409],
  ["individual-grade/establish/github:2", admin, 409],
] as const) {
  const denied = await fetch(new URL(`/api/courses/${id}/${route}`, base), {
    method: "PUT",
    headers: {
      Cookie: cookie,
      Origin: base.origin,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(denied.status, status);
}
const withdrawalCsv = await fetch(new URL(`/api/courses/${id}/export`, base), {
  headers: { Cookie: admin },
});
assert.deepEqual(
  (await withdrawalCsv.text())
    .split("\r\n")
    .find((line) => line.includes('"T002"'))!
    .split(",")
    .slice(3),
  ['""', '""', '""', '""', '"withdrawn"', '""', '""'],
);
await call(`/${id}/enrollment`, "PUT", {
  expected: withdrawn.administration.students,
  student: "github:2",
  action: "review-withdrawal",
  resolution:
    "PRIVATE review: preserve frozen membership; check future allocations and audit fallbacks",
  reason: "Reviewed synthetic withdrawal",
});
const ownWithdrawal = await call(`/${id}`, "GET", undefined, student);
assert.equal(JSON.stringify(ownWithdrawal).includes("PRIVATE"), false);
const reviewed = await call<{ administration: AdministrationRevisions }>(
  `/${id}`,
);
await call(`/${id}/enrollment`, "PUT", {
  expected: reviewed.administration.students,
  student: "github:2",
  action: "reinstate",
  reason: "Correct synthetic mistaken withdrawal",
});
assert.deepEqual(
  (
    await call<{ history: Envelope[] }>(
      `/${id}/history?key=${encodeURIComponent(frozen.key)}`,
    )
  ).history,
  history.history,
);
assert.equal(
  (
    await fetch(new URL(`/api/course-auth/mock-inbox?course=${id}`, base), {
      headers: { Cookie: admin },
    })
  ).status,
  404,
);
assert.equal(
  (
    await fetch(new URL("/api/course-auth/logout", base), {
      method: "POST",
      headers: { Origin: base.origin, Cookie: emailCookie },
    })
  ).status,
  200,
);
assert.equal(
  (
    await fetch(new URL(`/api/courses/${id}`, base), {
      headers: { Cookie: emailCookie },
    })
  ).status,
  401,
);
console.log(
  "Local Worker check passed: GitHub/email sessions, single-use D1 links, enrollment/catch-up/withdrawal and reinstatement, private review and blank withdrawn grades, consent/publication and private matching, attempt-gated peer inquiry and stale replies, working agreement, guarded history, streamed R2 source/technical evidence, retained checklists and immutable snapshots, read-only submission and access isolation.",
);
