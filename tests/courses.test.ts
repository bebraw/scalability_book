import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AdministrationRevisions } from "../shared/course-administration.ts";
import {
  pendingCatchUps,
  pendingWithdrawals,
} from "../shared/course-enrollment.ts";
import { localCourseStores } from "../scripts/lib/local-courses.ts";
import {
  handleCourses,
  maxCourseFileBytes,
  type CourseUser,
} from "../worker/courses.ts";
import {
  phases,
  rubricVersion,
  calculateResult,
  csvCell,
  emptyPortfolio,
  type Course,
  type Envelope,
  type Submission,
  type Portfolio,
  type Grade,
  type CourseFile,
  type Student,
} from "../shared/course.ts";
const admin = { id: "github:1", login: "instructor" };
const alice = { id: "github:2", login: "alice" };
const bob = { id: "github:3", login: "bob" };
const carol = { id: "github:4", login: "carol" };
const before = "2026-01-01T00:00:00.000Z",
  freeze = "2026-01-03T00:00:00.000Z",
  during = "2026-01-04T00:00:00.000Z",
  auditClose = "2026-01-05T00:00:00.000Z",
  evidenceTime = "2026-01-06T00:00:00.000Z",
  after = "2026-01-08T00:00:00.000Z";
const projectScores = [6, 4, 5, 3, 2, 4, 4, 2];
const individualScores = [1, 1, 1, 1, 1, 1, 0, 0, 0, 2, 1, 2, 1];
function fixture(t: test.TestContext) {
  const dir = mkdtempSync(path.join(tmpdir(), "course-system-"));
  const stores = localCourseStores(dir);
  t.after(() => {
    stores.close();
    rmSync(dir, { recursive: true, force: true });
  });
  async function request(
    route: string,
    method = "GET",
    body?: unknown,
    user: CourseUser | null = admin,
    now = before,
    headers: Record<string, string> = {},
  ) {
    return handleCourses(
      new Request(`https://book.test/api/courses${route}`, {
        method,
        headers: {
          Origin: "https://book.test",
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...headers,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
      { user, admins: ["instructor"], now, ...stores },
    );
  }
  async function good<T>(
    route: string,
    method = "GET",
    body?: unknown,
    user: CourseUser | null = admin,
    now = before,
  ): Promise<T> {
    const response = await request(route, method, body, user, now);
    const data = await response.json();
    assert.ok(response.ok, JSON.stringify(data));
    return data as T;
  }
  async function create() {
    let record = await good<Envelope<Course>>("", "POST", {
      name: "Test course",
    });
    const course = structuredClone(record.value);
    course.students = [alice, bob, carol].map((s, i) => ({
      ...s,
      name: s.login,
      number: `S${i + 1}`,
    }));
    for (const p of phases)
      course.phases[p] = {
        freezeAt: freeze,
        auditAt: auditClose,
        evidenceAt: "2026-01-07T00:00:00.000Z",
        groups: [
          {
            id: "red",
            members: [alice.id],
            exception: "Approved small synthetic fixture",
          },
          {
            id: "blue",
            members: [bob.id],
            exception: "Approved small synthetic fixture",
          },
          {
            id: "green",
            members: [carol.id],
            exception: "Approved small synthetic fixture",
          },
        ],
        audits: [
          { from: "red", to: "blue" },
          { from: "blue", to: "green" },
          { from: "green", to: "red" },
        ],
        published: false,
      };
    record = await good(`/${course.id}/setup`, "PUT", {
      ...course,
      expected: record.revision,
      reason: "Announced course setup",
    });
    return record;
  }
  async function upload(
    course: string,
    phase: string,
    owner: string,
    user: CourseUser,
    scope = "technical",
    now = before,
    name = "source.zip",
  ) {
    const data = new TextEncoder().encode(
      "archive bytes for an immutable source snapshot",
    );
    const response = await handleCourses(
      new Request(
        `https://book.test/api/courses/${course}/files/${phase}/${encodeURIComponent(owner)}?scope=${scope}&name=${encodeURIComponent(name)}`,
        {
          method: "POST",
          body: data,
          headers: {
            Origin: "https://book.test",
            "Content-Length": String(data.length),
          },
        },
      ),
      { user, admins: ["instructor"], now, ...stores },
    );
    const record = await response.json();
    assert.ok(response.ok, JSON.stringify(record));
    return record as Envelope<CourseFile>;
  }
  async function submit(
    course: string,
    phase: string,
    group: string,
    user: CourseUser,
  ) {
    const file = await upload(course, phase, group, user);
    return good<Envelope<Submission>>(
      `/${course}/submission/${phase}/${group}`,
      "PUT",
      {
        expected: null,
        stage: "freeze",
        value: {
          repository: "https://github.com/example/project",
          commit: "a".repeat(40),
          archive: file.value.id,
          setup: "npm install; npm test; run with seed data",
          evidence: "Measured under stated conditions, limitations reported",
        },
      },
      user,
    );
  }
  return { ...stores, request, good, create, upload, submit };
}
test("focused administration preserves other workflows and rejects conflicts in the same workflow", async (t) => {
  const f = fixture(t);
  const record = await f.create();
  const id = record.value.id;
  const initial = await f.good<{ administration: AdministrationRevisions }>(
    `/${id}`,
  );
  const extra = {
    id: "github:5",
    login: "dan",
    name: "Dan Example",
    number: "S4",
  };
  await f.good(`/${id}/students`, "PUT", {
    expected: initial.administration.students,
    students: [extra],
    reason: "Late enrollment",
  });
  const settings = await f.good<Envelope<Course>>(`/${id}/settings`, "PUT", {
    expected: initial.administration.settings,
    name: "Renamed course",
    staff: [admin.id],
    rubric: rubricVersion,
    reason: "Correct course name",
  });
  assert.equal(settings.value.students.length, 4);
  assert.deepEqual(settings.value.students.at(-1), {
    ...extra,
    enrollment: { enrolledAt: before, lateAt: null, catchUp: "", reason: "" },
  });
  assert.equal(settings.value.name, "Renamed course");
  const conflict = await f.request(`/${id}/settings`, "PUT", {
    expected: initial.administration.settings,
    name: "Stale name",
    staff: [admin.id],
    rubric: rubricVersion,
    reason: "Another name change",
  });
  assert.equal(conflict.status, 409);
  const history = await f.good<{ history: { reason: string }[] }>(
    `/${id}/history?key=${encodeURIComponent(record.key)}`,
  );
  assert.ok(history.history.some((r) => r.reason === "Late enrollment"));
  assert.ok(history.history.some((r) => r.reason === "Correct course name"));
});
test("late enrollment records a private catch-up plan without changing frozen work, grades or requirements", async (t) => {
  const f = fixture(t);
  const record = await f.create();
  const id = record.value.id;
  const frozen = await f.submit(id, "establish", "red", alice);
  const addedAt = "2026-01-02T00:00:00.000Z";
  type View = {
    config: Envelope<Course>;
    administration: AdministrationRevisions;
    submissions: Envelope<Submission>[];
    projects: Envelope<Grade>[];
    results: { student: Student; result: Result }[];
  };
  const initial = await f.good<View>(`/${id}`);
  const roster = await f.good<Envelope<Course>>(
    `/${id}/students`,
    "PUT",
    {
      expected: initial.administration.students,
      format: "institutional",
      students: [
        {
          number: "S4",
          firstName: "Dan",
          lastName: "Example",
          email: "dan@example.edu",
        },
      ],
      reason: "Late institutional enrollment",
    },
    admin,
    addedAt,
  );
  const dan = roster.value.students.at(-1)!;
  assert.deepEqual(dan.enrollment, {
    enrolledAt: addedAt,
    lateAt: addedAt,
    catchUp: "",
    reason: "",
  });
  assert.deepEqual(
    pendingCatchUps(roster.value).map((s) => s.id),
    [dan.id],
  );
  const grade = await f.good<Envelope<Grade>>(
    `/${id}/project-grade/establish/red`,
    "PUT",
    {
      expected: null,
      scores: projectScores,
      feedback: "Frozen implementation evidence",
      missing: false,
      reason: "Initial project assessment",
    },
    admin,
    after,
  );
  const previous = await f.good<View>(`/${id}`, "GET", undefined, admin, after);
  const arrangement = {
    expected: previous.administration.students,
    student: dan.id,
    late: true,
    catchUp:
      "Agree allocation with staff; complete the missed activities and assessment by the published evidence deadline.",
    reason: "PRIVATE instructor enrollment note",
  };
  assert.equal(
    (await f.request(`/${id}/enrollment`, "PUT", arrangement, alice, after))
      .status,
    403,
  );
  assert.equal(
    (await f.request(`/${id}/enrollment`, "GET", undefined, admin, after))
      .status,
    403,
  );
  assert.equal(
    (
      await f.request(
        `/${id}/enrollment`,
        "PUT",
        { ...arrangement, reason: "" },
        admin,
        after,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request(
        `/${id}/enrollment`,
        "PUT",
        { ...arrangement, student: "github:999" },
        admin,
        after,
      )
    ).status,
    404,
  );
  // A settings change uses a separate fingerprint and cannot discard this plan.
  await f.good(
    `/${id}/settings`,
    "PUT",
    {
      expected: previous.administration.settings,
      name: "Renamed run",
      staff: [admin.id],
      rubric: rubricVersion,
      reason: "Correct run name",
    },
    admin,
    after,
  );
  const saved = await f.good<Envelope<Course>>(
    `/${id}/enrollment`,
    "PUT",
    arrangement,
    admin,
    after,
  );
  assert.equal(saved.value.name, "Renamed run");
  assert.equal(saved.value.students.at(-1)!.enrollment!.lateAt, addedAt);
  assert.deepEqual(pendingCatchUps(saved.value), []);
  assert.deepEqual(saved.value.phases, previous.config.value.phases);
  assert.deepEqual(saved.value.adjustments, previous.config.value.adjustments);
  const next = await f.good<View>(`/${id}`, "GET", undefined, admin, after);
  assert.deepEqual(
    next.submissions.find((s) => s.key === frozen.key),
    frozen,
  );
  assert.deepEqual(
    next.projects.find((g) => g.key === grade.key),
    grade,
  );
  assert.deepEqual(
    next.results,
    previous.results.map((r) => ({
      ...r,
      student: saved.value.students.find((s) => s.id === r.student.id)!,
    })),
  );
  assert.equal(
    (await f.request(`/${id}/enrollment`, "PUT", arrangement, admin, after))
      .status,
    409,
  );
  const other = await f.good<View>(`/${id}`, "GET", undefined, alice, after);
  assert.equal(
    other.config.value.students.find((s) => s.id === dan.id)!.enrollment,
    undefined,
  );
  assert.ok(!JSON.stringify(other).includes(arrangement.reason));
  const own = await f.good<View>(
    `/${id}`,
    "GET",
    undefined,
    { id: dan.id, login: "", courseId: id, provider: "email" },
    after,
  );
  assert.equal(
    own.config.value.students.find((s) => s.id === dan.id)!.enrollment!.catchUp,
    arrangement.catchUp,
  );
  assert.ok(!JSON.stringify(own).includes(arrangement.reason));
  const corrected = await f.good<Envelope<Course>>(
    `/${id}/students`,
    "PUT",
    {
      expected: next.administration.students,
      format: "institutional",
      students: [
        {
          id: dan.id,
          number: "S4-corrected",
          firstName: "Daniel",
          lastName: "Example",
          email: "dan@example.edu",
        },
      ],
      reason: "Correct the institutional record",
    },
    admin,
    after,
  );
  assert.equal(corrected.value.students.at(-1)!.id, dan.id);
  assert.deepEqual(
    corrected.value.students.at(-1)!.enrollment,
    saved.value.students.at(-1)!.enrollment,
  );
  const history = await f.store.history(record.key);
  assert.ok(history.some((h) => h.reason === arrangement.reason));
  const historical = await f.store.history(record.key, saved.revision);
  assert.equal(
    (historical[0]!.value as Course).students.at(-1)!.enrollment!.catchUp,
    arrangement.catchUp,
  );
});

test("withdrawal preserves frozen work and history, prevents new assessment, and excludes inactive students and groups from release", async (t) => {
  const f = fixture(t);
  const created = await f.create(),
    id = created.value.id;
  const frozen = await f.submit(id, "establish", "red", alice);
  const oldGrade = await f.good<Envelope<Grade>>(
    `/${id}/project-grade/establish/red`,
    "PUT",
    {
      expected: null,
      scores: projectScores,
      missing: false,
      feedback: "Historical project assessment",
      reason: "Before departure",
    },
  );
  const frozenHistory = await f.store.history(frozen.key);
  const gradeHistory = await f.store.history(oldGrade.key);
  const initial: any = await f.good(`/${id}`);
  assert.equal(
    (
      await f.request(
        `/${id}/enrollment`,
        "PUT",
        {
          expected: initial.administration.students,
          student: alice.id,
          action: "withdraw",
          reason: "PRIVATE departure reason",
        },
        alice,
      )
    ).status,
    403,
  );
  const withdrew = await f.good<Envelope<Course>>(
    `/${id}/enrollment`,
    "PUT",
    {
      expected: initial.administration.students,
      student: alice.id,
      action: "withdraw",
      reason: "PRIVATE departure reason",
    },
    admin,
    during,
  );
  const departed = withdrew.value.students.find((s) => s.id === alice.id)!;
  assert.equal(departed.enrollment!.withdrawal!.at, during);
  assert.equal(pendingWithdrawals(withdrew.value)[0]!.id, alice.id);
  assert.deepEqual(withdrew.value.phases, created.value.phases);
  assert.deepEqual(await f.store.get(frozen.key), frozen);
  assert.deepEqual(await f.store.history(frozen.key), frozenHistory);
  assert.deepEqual(await f.store.get(oldGrade.key), oldGrade);
  assert.deepEqual(await f.store.history(oldGrade.key), gradeHistory);
  const own: any = await f.good(`/${id}`, "GET", undefined, alice, during);
  assert.equal(own.results[0].result.status, "withdrawn");
  assert.equal(own.results[0].result.grade, null);
  assert.deepEqual(own.results[0].result.pending, []);
  assert.equal(JSON.stringify(own).includes("PRIVATE departure reason"), false);
  assert.equal(
    (
      await f.request(
        `/${id}/files/establish/${frozen.value.archive}`,
        "GET",
        undefined,
        alice,
        during,
      )
    ).status,
    200,
  );
  for (const route of [
    "portfolio/establish/" + alice.id,
    "submission/establish/red",
    "working-agreement/establish/red",
    "group-preference/establish",
    "audit/establish/red",
  ])
    assert.equal(
      (await f.request(`/${id}/${route}`, "PUT", {}, alice, during)).status,
      403,
    );
  assert.equal(
    (
      await f.request(
        `/${id}/files/establish/red?scope=technical`,
        "POST",
        {},
        alice,
        during,
      )
    ).status,
    403,
  );
  for (const route of [
    "individual-grade/establish/" + alice.id,
    "project-grade/establish/red",
  ])
    assert.equal(
      (
        await f.request(
          `/${id}/${route}`,
          "PUT",
          { expected: null },
          admin,
          during,
        )
      ).status,
      409,
    );
  assert.equal(
    (
      await f.request(`/${id}/enrollment`, "PUT", {
        expected: initial.administration.students,
        student: alice.id,
        action: "reinstate",
        reason: "Stale request",
      })
    ).status,
    409,
  );

  for (const phase of phases) {
    for (const [group, user] of [
      ["blue", bob],
      ["green", carol],
    ] as const) {
      const submission = await f.submit(id, phase, group, user);
      const portfolio = {
        ...emptyPortfolio(phase, user.id),
        lectures: [0, 1, 2].map((i) => ({
          mode: i < 2 ? "live" : "missing",
          participation: i < 2 ? "Reviewed the model" : "",
          idea: "A concrete queue",
          connection: "Linked source evidence",
        })),
        self: "Contribution and next improvement",
        peers: "Specific feedback",
        reflection: "Response and adjustment",
        contribution: "Challenged a decision using source evidence",
      };
      await f.good(
        `/${id}/portfolio/${phase}/${user.id}`,
        "PUT",
        { expected: null, stage: "submit", value: portfolio },
        user,
        evidenceTime,
      );
      await f.good(`/${id}/project-grade/${phase}/${group}`, "PUT", {
        expected: null,
        scores:
          phase === "establish" ? projectScores : [6, 4, 5, 3, 2, 3, 5, 2],
        missing: false,
        feedback: "Current group evidence",
        reason: "Assess active group",
      });
      await f.good(`/${id}/individual-grade/${phase}/${user.id}`, "PUT", {
        expected: null,
        scores: individualScores,
        missing: false,
        feedback: "Current private evidence",
        reason: "Assess active student",
      });
      assert.ok(submission.value.frozenAt);
    }
    const view: any = await f.good(`/${id}`);
    await f.good(`/${id}/publish/${phase}`, "POST", {
      expected: view.config.revision,
      published: true,
      reason: "Release active students without grading the departed student",
    });
  }
  const released: any = await f.good(`/${id}`);
  assert.equal(
    released.results.find((r: any) => r.student.id === bob.id).result.status,
    "pass",
  );
  assert.equal(
    released.results.find((r: any) => r.student.id === alice.id).result.status,
    "withdrawn",
  );
  assert.equal(
    released.individuals.some((g: any) => g.value.subject === alice.id),
    false,
  );
  const csv = await (await f.request(`/${id}/export`)).text();
  const row = csv.split("\r\n").find((line) => line.includes('"S1"'))!;
  assert.deepEqual(row.split(",").slice(3, 11), [
    '""',
    '""',
    '""',
    '""',
    '"withdrawn"',
    '""',
    '""',
  ]);

  await f.good(`/${id}/enrollment`, "PUT", {
    expected: released.administration.students,
    student: alice.id,
    action: "review-withdrawal",
    resolution:
      "PRIVATE team review: frozen members retained; future allocations and staff audit fallback checked",
    reason: "Reviewed group consequences",
  });
  const reviewed: any = await f.good(`/${id}`);
  assert.deepEqual(pendingWithdrawals(reviewed.config.value), []);
  const privateOwn: any = await f.good(`/${id}`, "GET", undefined, alice);
  assert.equal(
    privateOwn.config.value.students.find((s: Student) => s.id === alice.id)
      .enrollment.withdrawal.resolution,
    "",
  );
  const other: any = await f.good(`/${id}`, "GET", undefined, bob);
  assert.equal(
    other.config.value.students.find((s: Student) => s.id === alice.id)
      .enrollment,
    undefined,
  );
  assert.equal(JSON.stringify(other).includes("PRIVATE team review"), false);
  await f.good(`/${id}/students`, "PUT", {
    expected: reviewed.administration.students,
    format: "institutional",
    students: [
      {
        number: "S1",
        firstName: "Alice",
        lastName: "Corrected",
        email: "alice@institution.invalid",
      },
    ],
    reason: "Correct a retained historical identity",
  });
  const corrected: any = await f.good(`/${id}`);
  assert.deepEqual(
    corrected.config.value.students.find((s: Student) => s.id === alice.id)
      .enrollment,
    reviewed.config.value.students.find((s: Student) => s.id === alice.id)
      .enrollment,
  );
  await f.good(`/${id}/enrollment`, "PUT", {
    expected: corrected.administration.students,
    student: alice.id,
    action: "reinstate",
    reason: "Correct an erroneous withdrawal",
  });
  const reinstated: any = await f.good(`/${id}`);
  assert.equal(
    reinstated.results.find((r: any) => r.student.id === alice.id).result
      .status,
    "pending",
  );
  assert.deepEqual(await f.store.get(frozen.key), frozen);
  assert.deepEqual(await f.store.history(oldGrade.key), gradeHistory);
  assert.equal(
    (
      await f.request(`/${id}/publish/challenge`, "POST", {
        expected: reinstated.config.revision,
        published: true,
        reason: "Must assess the reinstated student first",
      })
    ).status,
    400,
  );
});

test("old rosters retain unknown arrival dates and staff can correct the late-arrival flag with a reason", async (t) => {
  const f = fixture(t);
  const record = await f.create();
  const legacy = structuredClone(record);
  for (const s of legacy.value.students) delete s.enrollment;
  legacy.revision = crypto.randomUUID();
  assert.equal(
    await f.store.save(legacy, record.revision, "Historical roster fixture"),
    true,
  );
  const id = record.value.id;
  const view = await f.good<{ administration: AdministrationRevisions }>(
    `/${id}`,
  );
  const marked = await f.good<Envelope<Course>>(`/${id}/enrollment`, "PUT", {
    expected: view.administration.students,
    student: alice.id,
    late: true,
    catchUp: "",
    reason: "Record an earlier late arrival",
  });
  assert.equal(marked.value.students[0]!.enrollment!.enrolledAt, null);
  assert.deepEqual(
    pendingCatchUps(marked.value).map((s) => s.id),
    [alice.id],
  );
  const current = await f.good<{ administration: AdministrationRevisions }>(
    `/${id}`,
  );
  const restored = await f.good<Envelope<Course>>(`/${id}/enrollment`, "PUT", {
    expected: current.administration.students,
    student: alice.id,
    late: false,
    catchUp: "",
    reason: "Correct the late-arrival designation",
  });
  assert.equal(restored.value.students[0]!.enrollment!.lateAt, null);
  assert.deepEqual(pendingCatchUps(restored.value), []);
  assert.equal(restored.value.students[1]!.enrollment, undefined);
});
test("phase administration saves only the selected phase", async (t) => {
  const f = fixture(t);
  const record = await f.create();
  const id = record.value.id;
  const view = await f.good<{ administration: AdministrationRevisions }>(
    `/${id}`,
  );
  const schedule = { ...record.value.phases.establish, evidenceAt: after };
  await f.good(`/${id}/schedule/establish`, "PUT", {
    expected: view.administration.schedule.establish,
    ...schedule,
    reason: "Extend Establish evidence",
  });
  const next = await f.good<Envelope<Course>>(
    `/${id}/schedule/challenge`,
    "PUT",
    {
      expected: view.administration.schedule.challenge,
      ...record.value.phases.challenge,
      evidenceAt: "2026-01-09T00:00:00.000Z",
      reason: "Extend Challenge evidence",
    },
  );
  assert.equal(next.value.phases.establish.evidenceAt, after);
  assert.equal(
    next.value.phases.challenge.evidenceAt,
    "2026-01-09T00:00:00.000Z",
  );
  assert.deepEqual(next.value.phases.compare, record.value.phases.compare);
  const stale = await f.request(`/${id}/schedule/establish`, "PUT", {
    expected: view.administration.schedule.establish,
    ...schedule,
    reason: "Stale schedule",
  });
  assert.equal(stale.status, 409);
});
test("roster preview validates incremental imports without writing or removing omitted students", async (t) => {
  const f = fixture(t);
  const record = await f.create();
  const id = record.value.id;
  const view = await f.good<{ administration: AdministrationRevisions }>(
    `/${id}`,
  );
  const corrected = { ...record.value.students[0]!, name: "Alice Corrected" };
  const body = {
    expected: view.administration.students,
    students: [corrected],
    reason: "Name correction",
  };
  const preview = await f.good<{
    added: unknown[];
    updated: unknown[];
    unchanged: number;
  }>(`/${id}/students`, "POST", body);
  assert.deepEqual(preview.added, []);
  assert.deepEqual(preview.updated, [corrected]);
  assert.equal(preview.unchanged, 2);
  const untouched = await f.store.get<Course>(record.key);
  assert.equal(untouched!.revision, record.revision);
  const conflict = await f.request(`/${id}/students`, "POST", {
    ...body,
    students: [
      {
        id: "github:99",
        login: "new",
        number: corrected.number,
        name: "Different student",
      },
    ],
  });
  assert.equal(conflict.status, 400);
  const saved = await f.good<Envelope<Course>>(`/${id}/students`, "PUT", body);
  assert.equal(saved.value.students.length, 3);
  assert.equal(saved.value.students[0]!.id, alice.id);
  assert.equal(saved.value.students[0]!.name, "Alice Corrected");
  assert.deepEqual(saved.value.phases, record.value.phases);
});
test("focused administration is staff-only and retains frozen groups and deadline locks", async (t) => {
  const f = fixture(t);
  const record = await f.create();
  const id = record.value.id;
  const studentView = await f.good<Record<string, unknown>>(
    `/${id}`,
    "GET",
    undefined,
    alice,
  );
  assert.equal(studentView.administration, undefined);
  for (const action of [
    "students",
    "settings",
    "groups/establish",
    "schedule/establish",
  ])
    assert.equal(
      (await f.request(`/${id}/${action}`, "PUT", {}, alice)).status,
      403,
    );
  await f.submit(id, "establish", "red", alice);
  const v = await f.good<{ administration: AdministrationRevisions }>(`/${id}`);
  const groups = structuredClone(record.value.phases.establish.groups);
  groups[0]!.members = [carol.id];
  groups[2]!.members = [alice.id];
  assert.equal(
    (
      await f.request(`/${id}/groups/establish`, "PUT", {
        expected: v.administration.groups.establish,
        groups,
        reason: "Attempt frozen membership change",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request(`/${id}/schedule/establish`, "PUT", {
        expected: v.administration.schedule.establish,
        ...record.value.phases.establish,
        freezeAt: "2026-01-04T00:00:00.000Z",
        reason: "Attempt to move frozen implementation deadline",
      })
    ).status,
    400,
  );
});
test("group allocation generates identifiers and retains established IDs across phases", async (t) => {
  const f = fixture(t);
  const record = await f.good<Envelope<Course>>("", "POST", {
    name: "New cohort",
  });
  const id = record.value.id;
  for (const phase of ["establish", "challenge"] as const) {
    const state = await f.good<{ administration: AdministrationRevisions }>(
      `/${id}`,
    );
    await f.good(`/${id}/formation/${phase}`, "PUT", {
      expected: state.administration.groups[phase],
      deadline: "2026-01-02T00:00:00.000Z",
      correctionUntil: "2026-01-03T00:00:00.000Z",
      reason: "Open synthetic group formation",
    });
  }
  let view = await f.good<{ administration: AdministrationRevisions }>(
    `/${id}`,
  );
  await f.good(`/${id}/students`, "PUT", {
    expected: view.administration.students,
    students: [{ ...alice, name: "Alice Example", number: "S1" }],
    reason: "Import roster",
  });
  view = await f.good(`/${id}`);
  const allocated = await f.good<Envelope<Course>>(
    `/${id}/groups/establish`,
    "PUT",
    {
      expected: view.administration.groups.establish,
      groups: [
        {
          id: "",
          members: [alice.id],
          exception: "Approved small synthetic fixture",
        },
      ],
      reason: "Initial allocation",
    },
  );
  assert.deepEqual(allocated.value.phases.establish.groups, [
    {
      id: "group-01",
      members: [alice.id],
      exception: "Approved small synthetic fixture",
    },
  ]);
  const next = await f.good<Envelope<Course>>(
    `/${id}/groups/challenge`,
    "PUT",
    {
      expected: view.administration.groups.challenge,
      groups: allocated.value.phases.establish.groups,
      reason: "Retain groups",
    },
  );
  assert.deepEqual(
    next.value.phases.challenge.groups,
    allocated.value.phases.establish.groups,
  );
  const arbitrary = await f.request(`/${id}/groups/compare`, "PUT", {
    expected: view.administration.groups.compare,
    groups: [{ id: "made-up", members: [alice.id] }],
    reason: "Manual ID",
  });
  assert.equal(arbitrary.status, 400);
});
test("scores cannot bypass phase hurdles; pending differs from explicitly assessed zero", () => {
  const course: Course = {
    id: "x",
    name: "x",
    rubric: rubricVersion,
    staff: [],
    students: [],
    adjustments: [],
    phases: Object.fromEntries(
      phases.map((p) => [
        p,
        {
          freezeAt: freeze,
          auditAt: auditClose,
          evidenceAt: after,
          groups: [
            {
              id: "red",
              members: [alice.id],
              exception: "Approved small synthetic fixture",
            },
          ],
          audits: [],
          published: true,
        },
      ]),
    ) as unknown as Course["phases"],
  };
  const projects: Grade[] = phases.map((p) => ({
    phase: p,
    subject: "red",
    scores: projectScores,
    feedback: "",
    evidenceRevision: null,
    missing: false,
  }));
  const portfolios = phases.map((p) => ({
    ...emptyPortfolio(p, alice.id),
    submittedAt: before,
  }));
  const individuals: Grade[] = phases.map((p) => ({
    phase: p,
    subject: alice.id,
    scores: [...individualScores],
    feedback: "",
    evidenceRevision: null,
    missing: false,
  }));
  const passing = calculateResult(
    course,
    alice.id,
    [],
    portfolios,
    projects,
    individuals,
  );
  assert.equal(passing.earned, 126);
  assert.equal(passing.available, 153);
  assert.equal(passing.grade, 4);
  const weakProject = projects.map((g, i) =>
    i === 0 ? { ...g, scores: [0, 0, 5, 3, 0, 0, 0, 1] } : g,
  );
  const projectFail = calculateResult(
    course,
    alice.id,
    [],
    portfolios,
    weakProject,
    individuals,
  );
  assert.ok(projectFail.percentage > 50);
  assert.equal(projectFail.grade, 0);
  const pending = calculateResult(course, alice.id, [], [], projects, []);
  assert.equal(pending.earned, 90);
  assert.equal(pending.grade, null);
  assert.equal(pending.status, "pending");
  const zero = individuals.map((g) => ({
    ...g,
    missing: true,
    scores: Array(13).fill(0),
  }));
  const fail = calculateResult(course, alice.id, [], [], projects, zero);
  assert.equal(fail.percentage > 50, true);
  assert.equal(fail.grade, 0);
  assert.equal(fail.status, "fail");
  const highButNoContribution = individuals.map((g) => ({
    ...g,
    scores: [1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 3, 0],
  }));
  assert.equal(
    calculateResult(
      course,
      alice.id,
      [],
      portfolios,
      projects,
      highButNoContribution,
    ).grade,
    0,
  );
  course.adjustments.push({
    student: alice.id,
    phase: "establish",
    lectureMinimum: 1,
    assessmentMinimum: 6,
    contributionMinimum: 1,
    availablePoints: 18,
    reason: "Approved replacement",
  });
  individuals[0]!.scores[3] = 0;
  individuals[0]!.scores[4] = 0;
  individuals[0]!.scores[5] = 0;
  const adjusted = calculateResult(
    course,
    alice.id,
    [],
    portfolios,
    projects,
    individuals,
  );
  assert.equal(adjusted.available, 150);
  assert.equal(adjusted.status, "pass");
});
test("course and portfolio identity isolation, delayed cohort access, and private attachments", async (t) => {
  const f = fixture(t),
    config = await f.create(),
    id = config.value.id;
  const red = await f.submit(id, "establish", "red", alice),
    blue = await f.submit(id, "establish", "blue", bob),
    green = await f.submit(id, "establish", "green", carol);
  const privateFile = await f.upload(
    id,
    "establish",
    alice.id,
    alice,
    "private",
    before,
    "diary.html",
  );
  const portfolio = {
    ...emptyPortfolio("establish", alice.id),
    self: "Private self",
    peers: "Confidential report",
    reflection: "Group conditions",
    contribution: "Reviewed a decision",
    files: [privateFile.value.id],
  };
  await f.good(
    `/${id}/portfolio/establish/${alice.id}`,
    "PUT",
    { expected: null, stage: "submit", value: portfolio },
    alice,
  );
  assert.equal(
    (
      await f.request(
        `/${id}/portfolio/establish/${alice.id}`,
        "PUT",
        { expected: null, stage: "submit", value: portfolio },
        bob,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request(`/${id}`, "GET", undefined, {
        id: "github:99",
        login: "instructor-lookalike",
      })
    ).status,
    403,
  );
  assert.equal((await f.request(`/${id}`, "GET", undefined, null)).status, 401);
  type Visible = {
    submissions: Envelope<Submission>[];
    portfolios: Envelope<Portfolio>[];
    files: Envelope<CourseFile>[];
    projects: Envelope<Grade>[];
    config: Envelope<Course>;
  };
  const early = await f.good<Visible>(`/${id}`, "GET", undefined, alice);
  assert.deepEqual(
    early.submissions.map((r) => r.value.group),
    ["red"],
  );
  const assigned = await f.good<Visible>(
    `/${id}`,
    "GET",
    undefined,
    alice,
    during,
  );
  assert.deepEqual(
    assigned.submissions.map((r) => r.value.group),
    ["blue", "red"],
  );
  assert.equal(
    (
      await f.request(
        `/${id}/files/establish/${green.value.archive}`,
        "GET",
        undefined,
        alice,
        during,
      )
    ).status,
    404,
  );
  const classView = await f.good<Visible>(
    `/${id}`,
    "GET",
    undefined,
    bob,
    after,
  );
  assert.equal(classView.submissions.length, 3);
  assert.equal(classView.portfolios.length, 0);
  assert.equal(
    classView.files.some((r) => r.value.id === privateFile.value.id),
    false,
  );
  assert.equal(
    JSON.stringify(classView).includes("Confidential report"),
    false,
  );
  assert.equal(
    classView.config.value.students.find((s) => s.id === alice.id)!.number,
    "",
  );
  assert.equal(
    (
      await f.request(
        `/${id}/files/establish/${privateFile.value.id}`,
        "GET",
        undefined,
        bob,
        after,
      )
    ).status,
    404,
  );
  const archive = await f.request(
    `/${id}/files/establish/${red.value.archive}`,
    "GET",
    undefined,
    bob,
    after,
  );
  assert.equal(archive.status, 200);
  assert.match(archive.headers.get("content-disposition")!, /attachment/);
  assert.equal(archive.headers.get("cache-control"), "private, no-store");
  assert.match(await archive.text(), /immutable source/);
  assert.equal(
    (
      await f.request(
        `/${id}/history?key=${encodeURIComponent(red.key)}`,
        "GET",
        undefined,
        bob,
        after,
      )
    ).status,
    403,
  );
  const second = await f.good<Envelope<Course>>("", "POST", {
    name: "Separate run",
  });
  assert.equal(
    (await f.request(`/${second.value.id}`, "GET", undefined, alice)).status,
    403,
  );
  assert.equal(blue.value.members[0], bob.id);
});
test("freezing preserves original membership and evidence; audits refer to that revision; stale edits conflict", async (t) => {
  const f = fixture(t),
    config = await f.create(),
    id = config.value.id;
  const target = await f.submit(id, "establish", "blue", bob);
  assert.equal(
    (
      await f.request(
        `/${id}/submission/establish/blue`,
        "PUT",
        {
          expected: target.revision,
          stage: "freeze",
          value: { setup: "replace" },
        },
        bob,
      )
    ).status,
    409,
  );
  const audit = await f.good<Envelope>(
    `/${id}/audit/establish/red`,
    "PUT",
    {
      expected: null,
      report:
        "Setup 4m; no prior inspection; same tools; change probe 30m; linked evidence",
    },
    alice,
    during,
  );
  assert.equal(
    (audit.value as { targetRevision: string }).targetRevision,
    target.revision,
  );
  const response = await f.good<Envelope<Submission>>(
    `/${id}/submission/establish/blue`,
    "PUT",
    {
      expected: target.revision,
      stage: "evidence",
      value: { response: "Accepted findings; separate correction branch" },
    },
    bob,
    evidenceTime,
  );
  assert.equal(response.value.commit, target.value.commit);
  assert.equal(response.value.archive, target.value.archive);
  assert.equal(
    (
      await f.request(
        `/${id}/submission/establish/blue`,
        "PUT",
        {
          expected: target.revision,
          stage: "evidence",
          value: { response: "stale tab" },
        },
        bob,
        evidenceTime,
      )
    ).status,
    409,
  );
  const history = await f.store.history(target.key);
  assert.equal(history.length, 2);
  assert.deepEqual(
    (await f.store.history(target.key, target.revision))[0]!.value,
    target.value,
  );
  const changed = structuredClone(config.value);
  changed.phases.establish.groups.find((g) => g.id === "blue")!.members = [
    alice.id,
  ];
  changed.phases.establish.groups.find((g) => g.id === "red")!.members = [
    bob.id,
  ];
  assert.equal(
    (
      await f.request(`/${id}/setup`, "PUT", {
        ...changed,
        expected: config.revision,
        reason: "Move frozen membership",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request(
        `/${id}/audit/establish/red`,
        "PUT",
        { expected: audit.revision, report: "late" },
        alice,
        after,
      )
    ).status,
    409,
  );
});
test("complete course flow scores once per group, releases privately, exports final grades, retains corrections", async (t) => {
  const f = fixture(t);
  let config = await f.create();
  const id = config.value.id;
  for (const phase of phases) {
    for (const [group, user] of [
      ["red", alice],
      ["blue", bob],
      ["green", carol],
    ] as const) {
      const submission = await f.submit(id, phase, group, user);
      const portfolio = {
        ...emptyPortfolio(phase, user.id),
        lectures: [0, 1, 2].map((i) => ({
          mode: i < 2 ? ("live" as const) : ("missing" as const),
          participation: i < 2 ? "Participated in activity" : "",
          idea: "Concrete model",
          connection: "Linked project evidence",
        })),
        self: "Contribution and next improvement",
        peers: "Specific feedback to teammates",
        reflection: "Response and adjustment",
        contribution: "Challenged a decision with linked evidence",
      };
      const saved = await f.good<Envelope<Portfolio>>(
        `/${id}/portfolio/${phase}/${user.id}`,
        "PUT",
        { expected: null, stage: "submit", value: portfolio },
        user,
        evidenceTime,
      );
      const pointScores =
        phase === "establish" ? projectScores : [6, 4, 5, 3, 2, 3, 5, 2];
      assert.equal(
        (
          await f.request(
            `/${id}/project-grade/${phase}/${group}`,
            "PUT",
            {
              expected: null,
              scores: pointScores,
              feedback: "Try to grade myself",
              missing: false,
              reason: "invalid",
            },
            user,
            after,
          )
        ).status,
        403,
      );
      const assessed = await f.good<Envelope<Grade>>(
        `/${id}/project-grade/${phase}/${group}`,
        "PUT",
        {
          expected: null,
          scores: pointScores,
          feedback: "Criterion reasons and evidence",
          missing: false,
          reason: "Initial project assessment",
        },
        admin,
        after,
      );
      assert.equal(assessed.value.evidenceRevision, submission.revision);
      await f.good(
        `/${id}/individual-grade/${phase}/${user.id}`,
        "PUT",
        {
          expected: null,
          scores: individualScores,
          feedback: "Corroborated contribution, feedback and lecture evidence",
          missing: false,
          reason: "Initial individual assessment",
        },
        admin,
        after,
      );
      assert.equal(saved.value.student, user.id);
    }
    const privateView = await f.good<{
      projects: Envelope[];
      individuals: Envelope[];
      results: { result: Result }[];
    }>(`/${id}`, "GET", undefined, alice, after);
    assert.equal(
      privateView.projects.some((g) => (g.value as Grade).phase === phase),
      false,
    );
    config = await f.good(
      `/${id}/publish/${phase}`,
      "POST",
      {
        expected: config.revision,
        published: true,
        reason: "Assessment completed and released",
      },
      admin,
      after,
    );
  }
  const student = await f.good<{
    projects: Envelope[];
    individuals: Envelope[];
    results: { result: Result }[];
  }>(`/${id}`, "GET", undefined, alice, after);
  assert.equal(student.projects.length, 3);
  assert.equal(student.individuals.length, 3);
  assert.equal(student.results[0]!.result.grade, 4);
  assert.equal(student.results[0]!.result.earned, 126);
  const csv = await f.request(`/${id}/export`, "GET", undefined, admin, after);
  assert.match(await csv.text(), /"126","153","82.35","4","pass"/);
  assert.equal(
    (await f.request(`/${id}/export`, "GET", undefined, bob, after)).status,
    403,
  );
  const p = (await f.store.list<Portfolio>(id, "portfolio")).find(
    (r) => r.value.phase === "establish" && r.value.student === alice.id,
  )!;
  await f.good(
    `/${id}/portfolio/establish/${alice.id}`,
    "PUT",
    {
      expected: p.revision,
      stage: "submit",
      value: { ...p.value, self: "Corrected self evidence" },
      reason: "Approved correction",
    },
    admin,
    after,
  );
  const corrected = await f.good<{ results: { result: Result }[] }>(
    `/${id}`,
    "GET",
    undefined,
    alice,
    after,
  );
  assert.equal(corrected.results[0]!.result.status, "pending");
  assert.equal(corrected.results[0]!.result.grade, null);
  assert.equal((await f.store.history(p.key)).length, 2);
});
test("writes check origin, bounded bodies and upload size; CAS also checks course configuration", async (t) => {
  const f = fixture(t),
    config = await f.create(),
    id = config.value.id;
  assert.equal(
    (
      await f.request(`/${id}/setup`, "PUT", {}, admin, before, {
        Origin: "https://other.test",
      })
    ).status,
    403,
  );
  assert.equal(
    (await f.request(`/${id}/setup`, "PUT", { padding: "x".repeat(97_000) }))
      .status,
    413,
  );
  const staleConfig = config.revision;
  await f.good(`/${id}/adjustment`, "PUT", {
    expected: config.revision,
    adjustment: {
      student: alice.id,
      phase: "establish",
      lectureMinimum: 1,
      assessmentMinimum: 6,
      contributionMinimum: 1,
      availablePoints: 18,
      reason: "Approved absence; replacement diary activity",
    },
  });
  const arbitrary: Envelope = {
    key: `${id}:portfolio:establish:${alice.id}`,
    courseId: id,
    kind: "portfolio",
    value: {},
    revision: crypto.randomUUID(),
    updatedAt: before,
    actor: alice.id,
  };
  assert.equal(
    await f.store.save(arbitrary, null, "Stale setup", {
      key: config.key,
      revision: staleConfig,
    }),
    false,
  );
  assert.equal(await f.store.get(arbitrary.key), null);
  const response = await handleCourses(
    new Request(
      `https://book.test/api/courses/${id}/files/establish/red?scope=technical&name=big.zip`,
      {
        method: "POST",
        headers: {
          Origin: "https://book.test",
          "Content-Length": String(maxCourseFileBytes + 1),
        },
        body: "tiny",
      },
    ),
    { user: alice, admins: [], now: before, ...f },
  );
  assert.equal(response.status, 413);
  const truncated = await handleCourses(
    new Request(
      `https://book.test/api/courses/${id}/files/establish/red?scope=technical&name=truncated.zip`,
      {
        method: "POST",
        headers: { Origin: "https://book.test", "Content-Length": "20" },
        body: "tiny",
      },
    ),
    { user: alice, admins: [], now: before, ...f },
  );
  assert.equal(truncated.status, 400);
  assert.equal((await f.store.list(id, "file")).length, 0);
  assert.equal(
    (await f.request("", "POST", { name: "Unauthorised run" }, alice)).status,
    403,
  );
  assert.equal(
    (
      await f.request(`/${id}/adjustment`, "PUT", {
        expected: config.revision,
        adjustment: {
          student: alice.id,
          phase: "establish",
          lectureMinimum: 3,
          assessmentMinimum: 12,
          contributionMinimum: 1,
          availablePoints: 1,
          reason: "Impossible arrangement",
        },
      })
    ).status,
    400,
  );
  assert.equal(csvCell('  =HYPERLINK("evil")'), '"\'  =HYPERLINK(""evil"")"');
});
