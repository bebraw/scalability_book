import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtempSync, rmSync, symlinkSync, mkdirSync, linkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { localCourseStores } from "../scripts/lib/local-courses.ts";
import { localCourseSimulation } from "../scripts/lib/local-course-simulation.ts";
import {
  handleSimulation,
  simulationTeacherAllowed,
} from "../worker/course-simulation.ts";
import { handleCourses } from "../worker/courses.ts";
import { handleCourseAuth } from "../worker/course-auth.ts";
import {
  simulationStores,
  simulationFileMarker,
  simulationEnvironmentKey,
  simulationInitialTime,
  type SimulationState,
} from "../worker/course-simulation-store.ts";
import {
  d1SimulationEnvironment,
  assertLiveCourseStorage,
} from "../worker/course-simulation-environment.ts";
import {
  phases,
  recordKey,
  emptyPortfolio,
  type Course,
  type Envelope,
} from "../shared/course.ts";
import worker from "../worker/index.ts";
import { simulationProvisioningFiles } from "../scripts/lib/course-simulation-provisioning.ts";
import { createStoredZip } from "../scripts/lib/zip.ts";

test("the actual submission handler uses simulated time, student ownership, scoped files and frozen history", async (t) => {
  const f = await fixture(t),
    course = f.enrolled.value;
  const students = course.students.map((s) => s.id);
  for (const phase of phases)
    course.phases[phase].groups = [
      {
        id: "red",
        members: students,
        exception: "Synthetic approved pair for boundary verification",
      },
    ];
  await json(
    await f.domain(`courses/${course.id}/setup`, "PUT", {
      ...course,
      expected: f.enrolled.revision,
      reason: "Approve synthetic pair",
    }),
  );
  let control = await f.status();
  await json(
    await f.api("control/role", "POST", {
      expected: control.state.revision,
      course: course.id,
      student: students[0],
    }),
  );
  const bytes = createStoredZip([
    {
      name: "README.md",
      data: new TextEncoder().encode(
        "Synthetic boundary archive. Baseline measurements are explicitly missing.",
      ),
    },
  ]);
  const uploadRequest = new Request(
    `${origin}/api/simulation/${f.simulation.id}/${f.initial.value.generation}/courses/${course.id}/files/establish/red?scope=technical&name=source.zip`,
    {
      method: "POST",
      headers: { Origin: origin, "Content-Length": String(bytes.length) },
      body: bytes,
    },
  );
  const file = await json(
    await handleSimulation(uploadRequest, {
      environment: f.simulation,
      teacher,
      authorized: true,
      local: true,
    }),
  );
  const frozen = await json(
    await f.domain(`courses/${course.id}/submission/establish/red`, "PUT", {
      expected: null,
      stage: "freeze",
      value: {
        repository: "",
        commit: "a".repeat(40),
        archive: file.value.id,
        setup:
          "Unpack and inspect the synthetic README; this is not a complete assessed project.",
        evidence: "Baseline measurement missing.",
        checklist: [
          {
            id: "baseline",
            status: "missing",
            location: "Not collected in this boundary fixture",
          },
        ],
      },
    }),
  );
  assert.equal(frozen.actor, students[0]);
  assert.equal(frozen.value.frozenAt, simulationInitialTime);
  assert.deepEqual(frozen.value.members, students);
  const download = await f.domain(
    `courses/${course.id}/files/establish/${file.value.id}`,
  );
  assert.equal(download.status, 200);
  assert.deepEqual(
    Buffer.from(await download.arrayBuffer()),
    Buffer.from(bytes),
  );
  assert.equal(
    (
      await handleCourses(
        request(`/api/courses/${course.id}/files/establish/${file.value.id}`),
        { ...f.live, user: teacher, admins: [teacher.login] },
      )
    ).status,
    404,
  );
  control = await f.status();
  await json(
    await f.api("control/clock", "POST", {
      expected: control.state.revision,
      now: "2026-11-01T08:00:00.000Z",
    }),
  );
  assert.equal(
    (
      await f.domain(`courses/${course.id}/submission/establish/red`, "PUT", {
        expected: frozen.revision,
        stage: "evidence",
        value: { response: "Late response" },
      })
    ).status,
    409,
  );
  const view = await json(await f.domain(`courses/${course.id}`));
  assert.equal(view.now, "2026-11-01T08:00:00.000Z");
  assert.equal(
    view.config.value.phases.establish.freezeAt,
    course.phases.establish.freezeAt,
  );
  const history = await simulationStores(
    f.simulation,
    teacher.id,
    f.initial.value,
  ).store.history(frozen.key, frozen.revision);
  assert.deepEqual(history[0]!.value, frozen.value);
});

test("simulation initialization files mark only empty storage and never overwrite another environment", async (t) => {
  const f = await fixture(t),
    directory = path.join(f.directory, "empty-worker-resources"),
    stores = localCourseStores(directory);
  const db = new DatabaseSync(path.join(directory, "course.sqlite"));
  const liveDb = new DatabaseSync(path.join(f.directory, "course.sqlite"));
  t.after(() => {
    liveDb.close();
    db.close();
    stores.close();
  });
  const generated = simulationProvisioningFiles("teacher-worker-v1");
  db.exec(generated.sql);
  const marker = await stores.store.get(simulationEnvironmentKey);
  assert.deepEqual(marker!.value, {
    mode: "simulation",
    id: "teacher-worker-v1",
  });
  assert.deepEqual(JSON.parse(generated.marker), marker!.value);
  db.exec(simulationProvisioningFiles("another-environment").sql);
  assert.deepEqual(await stores.store.get(simulationEnvironmentKey), marker);
  liveDb.exec(generated.sql);
  assert.equal(await f.live.store.get(simulationEnvironmentKey), null);
  assert.throws(
    () => simulationProvisioningFiles("unsafe'identifier"),
    /simulation identifier/,
  );
});

const teacher = { id: "github:1", login: "instructor" };
const otherTeacher = { id: "github:2", login: "other-instructor" };
const origin = "https://book.test";
const request = (route: string, method = "GET", body?: unknown, cookie = "") =>
  new Request(origin + route, {
    method,
    headers: {
      Origin: origin,
      Cookie: cookie,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
async function json<T = any>(response: Response): Promise<T> {
  const data = await response.json();
  assert.ok(response.ok, JSON.stringify(data));
  return data;
}
async function fixture(t: test.TestContext) {
  const directory = mkdtempSync(path.join(tmpdir(), "course-simulation-"));
  const live = localCourseStores(directory);
  const simulation = await localCourseSimulation(directory);
  t.after(() => {
    simulation.close();
    live.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const liveCourse = await json<Envelope<Course>>(
    await handleCourses(
      request("/api/courses", "POST", { name: "Synthetic live sentinel" }),
      {
        ...live,
        user: teacher,
        admins: [teacher.login],
        now: "2025-01-01T00:00:00.000Z",
      },
    ),
  );
  const api = (
    route: string,
    method = "GET",
    body?: unknown,
    cookie = "",
    controller = teacher,
  ) =>
    handleSimulation(
      request(
        `/api/simulation/${simulation.id}/${route}`,
        method,
        body,
        cookie,
      ),
      {
        environment: simulation,
        teacher: controller,
        authorized: true,
        local: true,
      },
    );
  const status = (controller = teacher) =>
    api("control/status", "GET", undefined, "", controller).then(json);
  const reset = async (controller = teacher) => {
    const current = await status(controller);
    return json(
      await api(
        "control/reset",
        "POST",
        { expected: current.state?.revision ?? null, preset: "empty" },
        "",
        controller,
      ),
    );
  };
  const initialized = await reset();
  const initial = initialized.state as Envelope<SimulationState>;
  const domain = (
    route: string,
    method = "GET",
    body?: unknown,
    cookie = "",
    controller = teacher,
    generation = initial.value.generation,
  ) => api(`${generation}/${route}`, method, body, cookie, controller);
  const create = async (
    controller = teacher,
    generation = initial.value.generation,
  ) =>
    json<Envelope<Course>>(
      await domain(
        "courses",
        "POST",
        { name: "Synthetic rehearsal" },
        "",
        controller,
        generation,
      ),
    );
  const course = await create();
  const view = await json(await domain(`courses/${course.value.id}`));
  const enrolled = await json<Envelope<Course>>(
    await domain(`courses/${course.value.id}/students`, "PUT", {
      expected: view.administration.students,
      format: "institutional",
      reason: "Synthetic roster for rehearsal",
      students: [
        {
          number: "SIM001",
          firstName: "Alice",
          lastName: "Example",
          email: "alice@example.edu",
        },
        {
          number: "SIM002",
          firstName: "Bob",
          lastName: "Example",
          email: "bob@example.edu",
        },
      ],
    }),
  );
  return {
    directory,
    simulation,
    live,
    liveCourse,
    api,
    status,
    reset,
    initial,
    domain,
    create,
    enrolled,
  };
}

test("simulation isolates live records, teachers, generations and files; resets do not delete live work", async (t) => {
  const f = await fixture(t),
    id = f.enrolled.value.id;
  const sentinel = await f.live.store.get(f.liveCourse.key);
  const history = await f.live.store.history(
    f.liveCourse.key,
    f.liveCourse.revision,
  );
  assert.equal(
    (await f.domain(`courses/${f.liveCourse.value.id}`)).status,
    404,
  );
  assert.equal(
    (
      await handleCourses(request(`/api/courses/${id}`), {
        ...f.live,
        user: teacher,
        admins: [teacher.login],
      })
    ).status,
    404,
  );
  const wrongEnvironment = request(
    `/api/simulation/wrong-environment/${f.initial.value.generation}/courses`,
    "POST",
    { name: "Must not write" },
  );
  assert.equal(
    (
      await handleSimulation(wrongEnvironment, {
        environment: f.simulation,
        teacher,
        authorized: true,
      })
    ).status,
    409,
  );
  assert.equal((await f.status(otherTeacher)).state, null);
  assert.equal(
    (await f.domain(`courses/${id}`, "GET", undefined, "", otherTeacher))
      .status,
    409,
  );
  const other = await f.reset(otherTeacher);
  assert.equal(
    (
      await f.domain(
        `courses/${id}`,
        "GET",
        undefined,
        "",
        otherTeacher,
        other.state.value.generation,
      )
    ).status,
    404,
  );
  const stores = simulationStores(f.simulation, teacher.id, f.initial.value),
    second = simulationStores(f.simulation, otherTeacher.id, other.state.value);
  const file = crypto.randomUUID(),
    bytes = new TextEncoder().encode("Synthetic evidence");
  await stores.files.put(file, new Blob([bytes]).stream(), bytes.length);
  assert.equal(await second.files.get(file), null);
  assert.equal(await f.live.files.get(file), null);
  assert.equal(
    await new Response(await stores.files.get(file)).text(),
    "Synthetic evidence",
  );
  const exported = await f.domain(`courses/${id}/export`);
  assert.equal(
    exported.headers.get("content-disposition"),
    'attachment; filename="SIMULATION-course-grades.csv"',
  );
  const csv = await exported.text();
  assert.match(csv, /^"environment","student_number",/);
  assert.match(csv, /\r\n"Simulation","SIM001","Alice Example",/);
  const reset = await f.reset();
  assert.notEqual(reset.state.value.generation, f.initial.value.generation);
  assert.equal((await f.domain("courses")).status, 409);
  assert.equal(
    (
      await f.domain(
        `courses/${id}`,
        "GET",
        undefined,
        "",
        teacher,
        reset.state.value.generation,
      )
    ).status,
    404,
  );
  assert.equal(
    await simulationStores(
      f.simulation,
      teacher.id,
      reset.state.value,
    ).files.get(file),
    null,
  );
  assert.equal(
    (await f.status(otherTeacher)).state.revision,
    other.state.revision,
  );
  assert.deepEqual(await f.live.store.get(f.liveCourse.key), sentinel);
  assert.deepEqual(
    await f.live.store.history(f.liveCourse.key, f.liveCourse.revision),
    history,
  );
});

test("mock student role uses actual student permissions and cannot choose live/foreign identities", async (t) => {
  const f = await fixture(t),
    course = f.enrolled.value,
    alice = course.students[0]!,
    bob = course.students[1]!;
  for (const phase of phases)
    course.phases[phase].groups = [
      { id: "red", members: [alice.id], exception: "Synthetic smaller group" },
      { id: "blue", members: [bob.id], exception: "Synthetic smaller group" },
    ];
  await json(
    await f.domain(`courses/${course.id}/setup`, "PUT", {
      ...course,
      expected: f.enrolled.revision,
      reason: "Synthetic approved teams",
    }),
  );
  await json(
    await f.domain(
      `courses/${course.id}/portfolio/establish/${bob.id}`,
      "PUT",
      {
        expected: null,
        stage: "draft",
        reason: "Synthetic private portfolio for permission checks",
        value: {
          ...emptyPortfolio("establish", bob.id),
          reflection: "Private synthetic Bob reflection",
        },
      },
    ),
  );
  const current = await f.status();
  assert.equal(
    (
      await f.api("control/role", "POST", {
        expected: current.state.revision,
        course: f.liveCourse.value.id,
        student: teacher.id,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await f.api("control/role", "POST", {
        expected: current.state.revision,
        course: course.id,
        student: "nonexistent",
      })
    ).status,
    404,
  );
  const role = await json(
    await f.api("control/role", "POST", {
      expected: current.state.revision,
      course: course.id,
      student: alice.id,
    }),
  );
  const student = await json(await f.domain(`courses/${course.id}`));
  assert.equal(student.staff, false);
  assert.equal(student.administration, undefined);
  assert.equal(student.user.id, alice.id);
  assert.equal(student.user.provider, "email");
  assert.equal(student.portfolios.length, 0);
  assert.equal(
    student.config.value.students.find((s: any) => s.id === bob.id).email,
    "",
  );
  assert.equal(
    (await f.domain("courses", "POST", { name: "Escalation" })).status,
    403,
  );
  assert.equal(
    (
      await f.domain(`courses/${course.id}/settings`, "PUT", {
        expected: "anything",
        name: "Escalation",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await f.domain(
        `courses/${course.id}/portfolio/establish/${bob.id}`,
        "PUT",
        {
          expected: null,
          stage: "draft",
          value: emptyPortfolio("establish", bob.id),
        },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await f.domain(
        `courses/${course.id}/project-grade/establish/red`,
        "PUT",
        { expected: null, scores: [], reason: "Escalation" },
      )
    ).status,
    403,
  );
  assert.equal((await f.domain(`courses/${course.id}/export`)).status, 403);
  assert.equal(
    (
      await f.api("control/role", "POST", {
        expected: current.state.revision,
        student: null,
      })
    ).status,
    409,
  );
  const staff = await f.api("control/role", "POST", {
    expected: role.state.revision,
    student: null,
  });
  assert.match(
    staff.headers.get("set-cookie")!,
    /scalableweb_simulation_session=;.*Max-Age=0/,
  );
  assert.equal(
    (await json(await f.domain(`courses/${course.id}`))).staff,
    true,
  );
  const fake = request(
    `/api/simulation/${f.simulation.id}/control/reset`,
    "POST",
    { expected: null, teacher },
  );
  assert.equal(
    (
      await handleSimulation(fake, {
        environment: f.simulation,
        teacher: null,
        authorized: false,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await handleSimulation(fake, {
        environment: f.simulation,
        teacher: { ...teacher, provider: "email" },
        authorized: true,
      })
    ).status,
    403,
  );
  assert.equal(
    await simulationTeacherAllowed(
      { ...teacher, provider: "email" },
      [teacher.login],
      f.live.store,
    ),
    false,
  );
  assert.equal(await simulationTeacherAllowed(teacher, [], f.live.store), true);
});

test("simulation magic links use a mock inbox, isolated cookies and clock; expired sessions cannot inherit staff", async (t) => {
  const f = await fixture(t),
    id = f.enrolled.value.id;
  const login = async () => {
    assert.equal(
      (
        await f.domain("course-auth/request", "POST", {
          course: id,
          email: "alice@example.edu",
        })
      ).status,
      202,
    );
    const inbox = await json(await f.api(`control/inbox?course=${id}`));
    const url = new URL(inbox.messages[0].url);
    assert.equal(url.searchParams.get("simulation"), f.simulation.id);
    assert.equal(
      url.searchParams.get("generation"),
      f.initial.value.generation,
    );
    return new URLSearchParams(url.hash.slice(1)).get("login")!;
  };
  const expired = await login();
  let control = await f.status();
  await json(
    await f.api("control/clock", "POST", {
      expected: control.state.revision,
      now: "2026-10-05T08:16:00.000Z",
    }),
  );
  assert.equal(
    (await f.domain("course-auth/verify", "POST", { token: expired })).status,
    400,
  );
  const token = await login();
  assert.equal(
    (
      await handleCourseAuth(
        request("/api/course-auth/verify", "POST", { token }),
        { ...f.live, now: "2026-10-05T08:16:00.000Z" },
      )
    ).status,
    400,
  );
  const signed = await f.domain("course-auth/verify", "POST", { token });
  assert.equal(signed.status, 200);
  const setCookie = signed.headers.get("set-cookie")!;
  assert.match(setCookie, /^scalableweb_simulation_session=/);
  assert.match(setCookie, /Path=\/api\/simulation\/; HttpOnly;/);
  assert.equal(setCookie.includes("scalableweb_course_session="), false);
  const cookie = setCookie.split(";")[0]!;
  assert.equal(
    (await f.domain("course-auth/verify", "POST", { token })).status,
    400,
  );
  const student = await json(
    await f.domain(`courses/${id}`, "GET", undefined, cookie),
  );
  assert.equal(student.staff, false);
  assert.equal(student.user.provider, "email");
  assert.equal((await f.live.mail.list(id)).length, 0);
  // The same token under the live cookie name is ignored by simulation.
  const ignored = cookie.replace(
    "scalableweb_simulation_session",
    "scalableweb_course_session",
  );
  assert.equal(
    (await json(await f.domain(`courses/${id}`, "GET", undefined, ignored)))
      .staff,
    true,
  );
  control = await f.status();
  await json(
    await f.api(
      "control/role",
      "POST",
      { expected: control.state.revision, student: null },
      cookie,
    ),
  );
  assert.equal(
    (await f.domain(`courses/${id}`, "GET", undefined, cookie)).status,
    401,
  );
  const fresh = await f.domain("course-auth/verify", "POST", {
    token: await login(),
  });
  assert.equal(fresh.status, 200);
  const expiryCookie = fresh.headers.get("set-cookie")!.split(";")[0]!;
  control = await f.status();
  assert.equal(
    (
      await f.api("control/clock", "POST", {
        expected: control.state.revision,
        now: simulationInitialTime,
      })
    ).status,
    400,
  );
  await json(
    await f.api("control/clock", "POST", {
      expected: control.state.revision,
      now: "2026-10-13T08:16:00.000Z",
    }),
  );
  assert.equal(
    (await f.domain(`courses/${id}`, "GET", undefined, expiryCookie)).status,
    401,
  );
  const status = await json(
    await f.domain("course-auth/status", "GET", undefined, expiryCookie),
  );
  assert.equal(status.authenticated, false);
  assert.equal(status.user, null);
});

test("one teacher's simulated clock cleanup and inbox retention cannot expire or prune another teacher", async (t) => {
  const f = await fixture(t),
    other = await f.reset(otherTeacher);
  const a = simulationStores(f.simulation, teacher.id, f.initial.value),
    b = simulationStores(f.simulation, otherTeacher.id, other.state.value);
  const grant = {
    course: "synthetic-run",
    student: "synthetic-student",
    email: "synthetic@example.edu",
    expiresAt: "2026-10-05T08:15:00.000Z",
  };
  await a.auth.issue("same-hash", grant);
  await a.auth.ready("same-hash");
  await b.auth.issue("same-hash", grant);
  await b.auth.ready("same-hash");
  await a.auth.saveSession("same-session", grant);
  await b.auth.saveSession("same-session", grant);
  await a.auth.quota("same-limit", 1, grant.expiresAt);
  await b.auth.quota("same-limit", 1, grant.expiresAt);
  await a.auth.cleanup("2026-11-01T00:00:00.000Z");
  assert.equal(await a.auth.consume("same-hash", simulationInitialTime), null);
  assert.deepEqual(
    await b.auth.consume("same-hash", simulationInitialTime),
    grant,
  );
  assert.deepEqual(
    await b.auth.session("same-session", simulationInitialTime),
    grant,
  );
  assert.equal(await b.auth.quota("same-limit", 1, grant.expiresAt), false);
  assert.equal(await a.auth.quota("same-limit", 1, grant.expiresAt), true);
  const mail = {
    course: "synthetic-run",
    courseName: "Synthetic",
    to: grant.email,
    url: origin + "/course/#login=synthetic",
    expiresAt: grant.expiresAt,
  };
  await b.mail.send(mail);
  for (let i = 0; i < 1001; i++) await a.mail.send(mail);
  assert.equal((await b.mail.list(mail.course)).length, 1);
  assert.equal((await a.mail.list(mail.course)).length, 50);
  assert.equal(
    await f.live.auth.session("same-session", simulationInitialTime),
    null,
  );
});

function d1Port(db: DatabaseSync) {
  const query = (sql: string, values: any[] = []) => ({
    first: async () => db.prepare(sql).get(...values) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...values) }),
    run: async () => db.prepare(sql).run(...values),
  });
  return {
    prepare(sql: string) {
      return {
        ...query(sql),
        bind(...values: any[]) {
          return { ...query(sql, values), sql, values };
        },
      };
    },
    async batch(queries: any[]) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const results = queries.map((q) => {
          const results = db.prepare(q.sql).all(...q.values);
          return {
            results,
            meta: {
              changes: db.prepare("SELECT changes() AS count").get()!.count,
            },
          };
        });
        db.exec("COMMIT");
        return results;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}
function bucketPort(entries = new Map<string, string>()) {
  return {
    entries,
    async head(key: string) {
      return entries.has(key)
        ? { size: Buffer.byteLength(entries.get(key)!) }
        : null;
    },
    async get(key: string) {
      const text = entries.get(key);
      return text === undefined
        ? null
        : {
            size: Buffer.byteLength(text),
            text: async () => text,
            body: new Blob([text]).stream(),
          };
    },
    async put(key: string, value: string) {
      entries.set(key, value);
    },
    async delete(key: string) {
      entries.delete(key);
    },
  };
}
const githubCookie = (user = teacher) => {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Date.now() + 60_000,
      user: { id: Number(user.id.split(":")[1]), login: user.login },
    }),
  ).toString("base64url");
  return `scalableweb_session=${payload}.${createHmac("sha256", "synthetic-session-secret").update(payload).digest("base64url")}`;
};

test("Worker routing requires verified staff, matching markers and separate backing resources; mail never falls through", async (t) => {
  const f = await fixture(t);
  const liveDb = new DatabaseSync(path.join(f.directory, "course.sqlite")),
    simDb = new DatabaseSync(
      path.join(f.directory, "course-simulation/course.sqlite"),
    );
  t.after(() => {
    simDb.close();
    liveDb.close();
  });
  const livePort = d1Port(liveDb),
    simPort = d1Port(simDb),
    liveBucket = bucketPort(),
    simulationBucket = bucketPort(
      new Map([
        [
          simulationFileMarker,
          JSON.stringify({ mode: "simulation", id: f.simulation.id }),
        ],
      ]),
    );
  let deliveries = 0;
  const env = {
    ASSETS: { fetch: async () => new Response("not an API") },
    SESSION_SECRET: "synthetic-session-secret",
    COURSE_ADMIN_GITHUB_LOGINS: teacher.login,
    COURSE_DB: livePort,
    COURSE_FILES: liveBucket,
    COURSE_SIMULATION_DB: simPort,
    COURSE_SIMULATION_FILES: simulationBucket,
    COURSE_SIMULATION_ID: f.simulation.id,
    COURSE_EMAIL_ENABLED: "true",
    COURSE_MAIL: {
      async send() {
        deliveries++;
      },
    },
  };
  const route = `/api/simulation/${f.simulation.id}/${f.initial.value.generation}/course-auth/request`;
  const dispatch = (runtime = env, cookie = githubCookie()) =>
    worker.fetch(
      request(
        route,
        "POST",
        { course: f.enrolled.value.id, email: "alice@example.edu" },
        cookie,
      ),
      runtime as any,
    );
  assert.equal((await dispatch()).status, 202);
  assert.equal(deliveries, 0);
  assert.equal((await dispatch(env, "")).status, 403);
  assert.equal(
    (await dispatch(env, githubCookie({ id: "github:88", login: "student" })))
      .status,
    403,
  );
  assert.equal(
    (await dispatch({ ...env, COURSE_SIMULATION_ID: "wrong-id" })).status,
    503,
  );
  assert.equal(
    (await dispatch({ ...env, COURSE_SIMULATION_DB: livePort })).status,
    503,
  );
  assert.equal(
    (await dispatch({ ...env, COURSE_SIMULATION_FILES: liveBucket })).status,
    503,
  );
  // Two distinct binding wrappers around one database are still aliases.
  assert.equal(
    (await dispatch({ ...env, COURSE_DB: d1Port(simDb) })).status,
    503,
  );
  assert.equal(
    (
      await dispatch({
        ...env,
        COURSE_FILES: bucketPort(simulationBucket.entries),
      })
    ).status,
    503,
  );
  const missing = { ...env } as any;
  delete missing.COURSE_SIMULATION_DB;
  assert.equal((await dispatch(missing)).status, 503);
  const fake = request(route, "POST", {
    course: f.enrolled.value.id,
    email: "alice@example.edu",
  });
  fake.headers.set("x-course-test-user", "1");
  assert.equal((await worker.fetch(fake, env as any)).status, 403);
  assert.equal(deliveries, 0);
  assert.equal((await f.live.mail.list(f.enrolled.value.id)).length, 0);
  assert.deepEqual(
    (await f.live.store.courses()).map((r) => r.courseId),
    [f.liveCourse.value.id],
  );
  await assert.rejects(
    assertLiveCourseStorage(f.simulation.store),
    /simulation database/i,
  );
  const wrongMarker = d1SimulationEnvironment(
    f.simulation.id,
    simPort as any,
    bucketPort(
      new Map([
        [
          simulationFileMarker,
          JSON.stringify({ mode: "simulation", id: "wrong-id" }),
        ],
      ]),
    ) as any,
  );
  await assert.rejects(
    wrongMarker.assertIsolated(),
    /identity does not match/i,
  );
});

test("local simulation refuses pre-existing live records and filesystem aliases before initialization", async (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), "simulation-paths-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const nested = path.join(directory, "course-simulation");
  mkdirSync(nested);
  const existing = localCourseStores(nested);
  await existing.store.save(
    {
      key: "sentinel",
      courseId: "sentinel",
      kind: "course",
      revision: "sentinel",
      value: { retained: true },
      actor: "synthetic",
      updatedAt: simulationInitialTime,
    },
    null,
    "Synthetic live sentinel",
  );
  existing.close();
  await assert.rejects(
    localCourseSimulation(directory),
    /Refusing to mark existing records/,
  );
  const inspect = localCourseStores(nested);
  assert.equal(await inspect.store.get(simulationEnvironmentKey), null);
  assert.deepEqual((await inspect.store.get("sentinel"))!.value, {
    retained: true,
  });
  inspect.close();
  rmSync(nested, { recursive: true });
  const target = path.join(directory, "live-target");
  mkdirSync(target);
  symlinkSync(target, nested);
  await assert.rejects(
    localCourseSimulation(directory),
    /cannot alias another directory/,
  );
  rmSync(nested);
  mkdirSync(nested);
  const targetDb = localCourseStores(target);
  targetDb.close();
  symlinkSync(
    path.join(target, "course.sqlite"),
    path.join(nested, "course.sqlite"),
  );
  await assert.rejects(
    localCourseSimulation(directory),
    /cannot be symbolic links/,
  );
  rmSync(path.join(nested, "course.sqlite"));
  linkSync(
    path.join(target, "course.sqlite"),
    path.join(nested, "course.sqlite"),
  );
  await assert.rejects(
    localCourseSimulation(directory),
    /cannot be hard links/,
  );
});
