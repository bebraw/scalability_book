import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AdministrationRevisions } from "../shared/course-administration.ts";
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
          { id: "red", members: [alice.id] },
          { id: "blue", members: [bob.id] },
          { id: "green", members: [carol.id] },
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
  assert.deepEqual(settings.value.students.at(-1), extra);
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
      groups: [{ id: "", members: [alice.id] }],
      reason: "Initial allocation",
    },
  );
  assert.deepEqual(allocated.value.phases.establish.groups, [
    { id: "group-01", members: [alice.id] },
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
          groups: [{ id: "red", members: [alice.id] }],
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
