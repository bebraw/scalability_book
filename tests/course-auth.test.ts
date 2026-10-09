import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { localCourseStores } from "../scripts/lib/local-courses.ts";
import { handleCourses, type CourseUser } from "../worker/courses.ts";
import {
  handleCourseAuth,
  courseSessionUser,
  authHash,
} from "../worker/course-auth.ts";
import {
  emptyPortfolio,
  phases,
  type Course,
  type Envelope,
} from "../shared/course.ts";
import {
  mappedRoster,
  rosterHeaders,
  csvRows,
} from "../shared/course-roster.ts";
import type { AdministrationRevisions } from "../shared/course-administration.ts";
const before = "2026-01-01T00:00:00.000Z";
const admin: CourseUser = { id: "github:1", login: "instructor" };
const imported = {
  number: "S001",
  firstName: "Alice",
  lastName: "Example",
  email: "alice@example.edu",
};
function fixture(t: test.TestContext) {
  const dir = mkdtempSync(path.join(tmpdir(), "course-auth-"));
  const stores = localCourseStores(dir);
  t.after(() => {
    stores.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const request = (
    route: string,
    method = "GET",
    body?: unknown,
    cookie = "",
  ) =>
    new Request(`https://book.test${route}`, {
      method,
      headers: {
        Origin: "https://book.test",
        Cookie: cookie,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  async function course(
    route: string,
    method = "GET",
    body?: unknown,
    user: CourseUser | null = admin,
  ) {
    const response = await handleCourses(
      request(`/api/courses${route}`, method, body),
      { ...stores, user, admins: ["instructor"], now: before },
    );
    const data = await response.json();
    assert.ok(response.ok, JSON.stringify(data));
    return data;
  }
  const auth = (
    route: string,
    body?: unknown,
    cookie = "",
    now = before,
    mail = stores.mail,
  ) =>
    handleCourseAuth(
      request(`/api/course-auth/${route}`, body ? "POST" : "GET", body, cookie),
      {
        ...stores,
        mail,
        githubUser: admin,
        admins: ["instructor"],
        local: true,
        now,
        mockInbox: stores.mail,
      },
    );
  async function create() {
    const record = (await course("", "POST", {
      name: "Institutional roster",
    })) as Envelope<Course>;
    await enroll(record.value.id, [imported]);
    return (await course(`/${record.value.id}`)).config as Envelope<Course>;
  }
  async function enroll(id: string, students: unknown[]) {
    const v = (await course(`/${id}`)) as {
      administration: AdministrationRevisions;
    };
    return course(`/${id}/students`, "PUT", {
      expected: v.administration.students,
      students,
      format: "institutional",
      reason: "Institutional roster update",
    }) as Promise<Envelope<Course>>;
  }
  async function link(id: string) {
    assert.equal(
      (await auth("request", { course: id, email: imported.email })).status,
      202,
    );
    const [message] = await stores.mail.list(id);
    return new URLSearchParams(new URL(message!.url).hash.slice(1)).get(
      "login",
    )!;
  }
  return { ...stores, request, course, signIn: auth, create, enroll, link };
}

test("institutional imports and corrections preserve legacy ownership, groups and grade history", async (t) => {
  const f = fixture(t);
  const initial = (await f.course("", "POST", {
    name: "Legacy course",
  })) as Envelope<Course>;
  const id = initial.value.id;
  const legacy = {
    ...initial.value,
    students: [
      {
        id: "github:2",
        number: imported.number,
        name: "Alice Example",
        login: "alice",
      },
    ],
  };
  for (const phase of phases)
    legacy.phases[phase].groups = [
      {
        id: "red",
        members: ["github:2"],
        exception: "Retained historical group",
      },
    ];
  await f.course(`/${id}/setup`, "PUT", {
    ...legacy,
    expected: initial.revision,
    reason: "Historical GitHub roster",
  });
  const portfolio = {
    ...emptyPortfolio("establish", "github:2"),
    self: "Acceptance checks",
    peers: "Specific peer feedback",
    reflection: "Response and group reflection",
    contribution: "Reviewed an important decision",
  };
  const saved = await f.course(
    `/${id}/portfolio/establish/github:2`,
    "PUT",
    { expected: null, stage: "submit", value: portfolio },
    { id: "github:2", login: "alice" },
  );
  const grade = await f.course(
    `/${id}/individual-grade/establish/github:2`,
    "PUT",
    {
      expected: null,
      scores: Array(13).fill(0),
      feedback: "Incomplete participation assessed",
      reason: "Initial assessment",
      missing: false,
    },
  );
  let record = await f.enroll(id, [
    imported,
    {
      number: "S002",
      firstName: "Bob",
      lastName: "Example",
      email: "bob@example.edu",
    },
  ]);
  assert.equal(record.value.students[0]!.id, "github:2");
  assert.match(record.value.students[1]!.id, /^student:/);
  assert.equal(record.value.students[1]!.login, "");
  assert.deepEqual(record.value.phases, legacy.phases);
  const prior = await f.course(`/${id}`);
  const legacyUpdate = (await f.course(`/${id}/students`, "PUT", {
    expected: prior.administration.students,
    students: [
      {
        id: "github:2",
        number: imported.number,
        name: "Alice Example",
        login: "alice-renamed",
      },
    ],
    reason: "Legacy integration updates a GitHub profile",
  })) as Envelope<Course>;
  assert.equal(legacyUpdate.value.students[0]!.email, imported.email);
  assert.equal(legacyUpdate.value.students[0]!.firstName, imported.firstName);
  record = await f.enroll(id, [
    { ...imported, firstName: "Alicia", email: "alicia@example.edu" },
  ]);
  assert.equal(record.value.students.length, 2);
  assert.equal(record.value.students[0]!.id, "github:2");
  const view = await f.course(`/${id}`);
  assert.equal(view.portfolios[0].revision, saved.revision);
  assert.equal(view.individuals[0].revision, grade.revision);
  const history = await f.store.history(saved.key, saved.revision);
  assert.equal(history[0]!.value.student, "github:2");
  await f.enroll(id, [
    { ...imported, id: "github:2", number: "S001-Corrected" },
  ]);
  assert.equal(
    (await f.course(`/${id}`)).config.value.students[0].id,
    "github:2",
  );
});

test("magic links are single-use, expiring and course-scoped; imported students need no GitHub account", async (t) => {
  const f = fixture(t),
    record = await f.create(),
    id = record.value.id;
  const token = await f.link(id);
  const [first, second] = await Promise.all([
    f.signIn("verify", { token }),
    f.signIn("verify", { token }),
  ]);
  assert.deepEqual([first.status, second.status].sort(), [200, 400]);
  const successful = first.ok ? first : second;
  const cookie = successful.headers.get("set-cookie")!.split(";")[0]!;
  assert.match(successful.headers.get("set-cookie")!, /HttpOnly.*SameSite=Lax/);
  const user = await courseSessionUser(
    f.request("/api/courses", "GET", undefined, cookie),
    { ...f, now: before },
  );
  assert.equal(user!.id, record.value.students[0]!.id);
  assert.equal(user!.provider, "email");
  assert.equal(user!.courseId, id);
  const view = await f.course(`/${id}`, "GET", undefined, user);
  assert.equal(view.staff, false);
  assert.equal(view.access, undefined);
  const other = await f.create();
  const denied = await handleCourses(
    f.request(`/api/courses/${other.value.id}`),
    { ...f, user, admins: ["Alice Example"], now: before },
  );
  assert.equal(denied.status, 403);
  const list = await f.course("", "GET", undefined, user);
  assert.equal(list.canCreate, false);
  assert.equal(list.courses.length, 1);
  const expired = await f.link(id);
  assert.equal(
    (
      await f.signIn(
        "verify",
        { token: expired },
        "",
        "2026-01-01T00:15:00.000Z",
      )
    ).status,
    400,
  );
  assert.equal(
    await courseSessionUser(
      f.request("/api/courses", "GET", undefined, cookie),
      { ...f, now: "2026-01-08T00:00:00.000Z" },
    ),
    null,
  );
  assert.equal((await f.signIn("logout", {}, cookie)).status, 200);
  assert.equal(
    await courseSessionUser(
      f.request("/api/courses", "GET", undefined, cookie),
      { ...f, now: before },
    ),
    null,
  );
  assert.equal((await f.auth.activity(id)).length, 1);
});

test("email sign-in carries a bounded internal activity destination without changing credential rules", async (t) => {
  const f = fixture(t);
  const record = await f.create();
  const target =
    "/chapters/benchmarking/?inquiry=1&inquiryActivity=prediction#source";
  for (const [returnTo, expected] of [
    [target, target],
    ["https://evil.test", "/"],
    ["x".repeat(4097), null],
  ]) {
    assert.equal(
      (
        await f.signIn("request", {
          course: record.value.id,
          email: imported.email,
          returnTo,
        })
      ).status,
      202,
    );
    const [mail] = await f.mail.list(record.value.id);
    const url = new URL(mail!.url);
    assert.equal(url.searchParams.get("returnTo"), expected);
    assert.equal(url.pathname, "/course/");
    const token = new URLSearchParams(url.hash.slice(1)).get("login");
    assert.equal((await f.signIn("verify", { token })).status, 200);
    assert.equal((await f.signIn("verify", { token })).status, 400);
  }
});

test("unknown and throttled emails have the same response; mail failure and corrections revoke credentials", async (t) => {
  const f = fixture(t),
    record = await f.create(),
    id = record.value.id;
  const token = await f.link(id);
  const known = await f.signIn("request", {
    course: id,
    email: imported.email,
  });
  const unknown = await f.signIn("request", {
    course: id,
    email: "unknown@example.edu",
  });
  assert.equal(known.status, unknown.status);
  assert.deepEqual(await known.json(), await unknown.json());
  await f.signIn("request", { course: id, email: imported.email });
  const throttled = await f.signIn("request", {
    course: id,
    email: imported.email,
  });
  assert.equal(throttled.status, 202);
  assert.equal((await f.mail.list(id)).length, 3);
  const verified = await f.signIn("verify", { token });
  const cookie = verified.headers.get("set-cookie")!.split(";")[0]!;
  const unused = new URLSearchParams(
    new URL((await f.mail.list(id))[0]!.url).hash.slice(1),
  ).get("login")!;
  await f.enroll(id, [{ ...imported, email: "corrected@example.edu" }]);
  assert.equal((await f.signIn("verify", { token: unused })).status, 400);
  assert.equal(
    await courseSessionUser(
      f.request("/api/courses", "GET", undefined, cookie),
      { ...f, now: before },
    ),
    null,
  );
  let failedToken = "";
  const failingMail = {
    async send(message: { url: string }) {
      failedToken = new URLSearchParams(new URL(message.url).hash.slice(1)).get(
        "login",
      )!;
      throw new Error("Mock failure");
    },
    list: f.mail.list,
  };
  const failed = await f.signIn(
    "request",
    { course: id, email: "corrected@example.edu" },
    "",
    before,
    failingMail,
  );
  assert.equal(failed.status, 202);
  assert.equal((await f.signIn("verify", { token: failedToken })).status, 400);
  assert.equal(await f.auth.consume(authHash(failedToken), before), null);
  assert.equal((await f.course(`/${id}`)).config.value.students.length, 1);
});

test("duplicate and conflicting enrollment records are rejected; student directory hides institutional details", async (t) => {
  const f = fixture(t),
    record = await f.create(),
    id = record.value.id;
  const v = await f.course(`/${id}`);
  for (const rows of [
    [imported, imported],
    [imported, { ...imported, number: "S002" }],
    [{ ...imported, number: "S002" }],
  ]) {
    const result = await handleCourses(
      f.request(`/api/courses/${id}/students`, "POST", {
        expected: v.administration.students,
        format: "institutional",
        students: rows,
      }),
      { ...f, user: admin, admins: ["instructor"], now: before },
    );
    assert.equal(result.status, 400);
  }
  await f.enroll(id, [
    {
      number: "S002",
      firstName: "Bob",
      lastName: "Example",
      email: "bob@example.edu",
    },
  ]);
  const token = await f.link(id),
    signed = await f.signIn("verify", { token });
  const cookie = signed.headers.get("set-cookie")!.split(";")[0]!;
  const user = await courseSessionUser(
    f.request("/", "GET", undefined, cookie),
    { ...f, now: before },
  );
  const view = await f.course(`/${id}`, "GET", undefined, user);
  const bob = view.config.value.students.find(
    (s: { name: string }) => s.name === "Bob Example",
  );
  assert.equal(bob.number, "");
  assert.equal(bob.email, "");
  const inbox = await f.signIn("mock-inbox?course=" + id, undefined, cookie);
  assert.equal(inbox.status, 403);
  const attacker = await handleCourseAuth(
    f.request(
      "/api/course-auth/request",
      "POST",
      { course: id, email: imported.email },
      "",
    ),
    { ...f, now: before },
  );
  assert.equal(attacker.status, 202);
  const crossOrigin = new Request("https://book.test/api/course-auth/verify", {
    method: "POST",
    headers: {
      Origin: "https://attacker.test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });
  assert.equal(
    (await handleCourseAuth(crossOrigin, { ...f, now: before })).status,
    403,
  );
});

test("institutional column mapping supports exported headers and quoted names without silent ambiguity", () => {
  const source =
    '\uFEFFStudent code,Given name,Family name,University email,Extra\r\nS1,"Alice, A.","O""Brien",alice@example.edu,ignored\r\n';
  assert.equal(rosterHeaders(source).length, 5);
  assert.deepEqual(
    mappedRoster(source, {
      student_id: "Student code",
      first_name: "Given name",
      last_name: "Family name",
      email: "University email",
    }),
    [
      {
        number: "S1",
        firstName: "Alice, A.",
        lastName: 'O"Brien',
        email: imported.email,
      },
    ],
  );
  assert.throws(() => rosterHeaders("ID,ID,email"), /distinct/);
  assert.throws(() => csvRows('id,name\nS1,"Unclosed'), /unclosed/);
  assert.throws(() => csvRows('id,name\nS1,"Name"junk'), /Unexpected/);
  assert.throws(
    () =>
      mappedRoster(source, {
        student_id: "Student code",
        first_name: "Student code",
        last_name: "Family name",
        email: "University email",
      }),
    /distinct/,
  );
});
test("production cookies require HTTPS and login links use the configured origin", async (t) => {
  const f = fixture(t),
    record = await f.create();
  const response = await handleCourseAuth(
    f.request("/api/course-auth/request", "POST", {
      course: record.value.id,
      email: imported.email,
    }),
    { ...f, now: before, loginOrigin: "https://scalableweb.dev" },
  );
  assert.equal(response.status, 202);
  const mail = (await f.mail.list(record.value.id))[0]!;
  const link = new URL(mail.url);
  assert.equal(link.origin, "https://scalableweb.dev");
  assert.equal(link.searchParams.has("token"), false);
  const token = new URLSearchParams(link.hash.slice(1)).get("login");
  const signed = await handleCourseAuth(
    f.request("/api/course-auth/verify", "POST", { token }),
    { ...f, now: before },
  );
  assert.equal(signed.status, 200);
  assert.match(
    signed.headers.get("set-cookie")!,
    /HttpOnly; Secure; SameSite=Lax/,
  );
});
test("client request and verification limits reset at the next window", async (t) => {
  const f = fixture(t),
    record = await f.create();
  const body = { course: record.value.id, email: "unknown@example.edu" };
  for (let i = 0; i < 30; i++)
    assert.equal((await f.signIn("request", body)).status, 202);
  assert.equal((await f.signIn("request", body)).status, 429);
  for (let i = 0; i < 15; i++)
    assert.equal(
      (await f.signIn("verify", { token: "a".repeat(43) })).status,
      400,
    );
  assert.equal(
    (await f.signIn("verify", { token: "a".repeat(43) })).status,
    429,
  );
  const next = "2026-01-01T00:10:00.000Z";
  assert.equal((await f.signIn("request", body, "", next)).status, 202);
  assert.equal(
    (await f.signIn("verify", { token: "a".repeat(43) }, "", next)).status,
    400,
  );
  assert.equal((await f.mail.list(record.value.id)).length, 0);
});
