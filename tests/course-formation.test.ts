import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { localCourseStores } from "../scripts/lib/local-courses.ts";
import { handleCourses, type CourseUser } from "../worker/courses.ts";
import { recordKey, type Course, type Envelope } from "../shared/course.ts";
import type { GroupProposal } from "../shared/course-formation.ts";
const admin = { id: "github:1", login: "instructor" };
const now = "2026-01-01T00:00:00.000Z";
const deadline = "2026-01-05T00:00:00.000Z";
const correctionUntil = "2026-01-07T00:00:00.000Z";
const students = [2, 3, 4, 5, 6, 7, 8].map((id) => ({
  id: `github:${id}`,
  number: `TEST${id}`,
  name: `Synthetic Student ${id}`,
  login: `student${id}`,
}));
async function fixture(t: test.TestContext) {
  const directory = mkdtempSync(path.join(tmpdir(), "course-formation-"));
  const stores = localCourseStores(directory);
  t.after(() => {
    stores.close();
    rmSync(directory, { recursive: true, force: true });
  });
  let id = "";
  const request = (
    route: string,
    body?: unknown,
    user: CourseUser | null = admin,
    at = now,
    method = body ? "PUT" : "GET",
  ) =>
    handleCourses(
      new Request(`https://book.test/api/courses${route}`, {
        method,
        headers: {
          Origin: "https://book.test",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
      { ...stores, user, admins: ["instructor"], now: at },
    );
  async function good(
    route: string,
    body?: unknown,
    user: CourseUser = admin,
    at = now,
    method?: string,
  ) {
    const response = await request(route, body, user, at, method);
    const data = await response.json();
    assert.ok(response.ok, JSON.stringify(data));
    return data;
  }
  const created = await good(
    "",
    { name: "Formation fixture" },
    admin,
    now,
    "POST",
  );
  id = created.value.id;
  let view = await good(`/${id}`);
  await good(`/${id}/students`, {
    expected: view.administration.students,
    students,
    reason: "Synthetic cohort",
  });
  async function open(phase = "establish", publish = false) {
    const view = await good(`/${id}`);
    return good(`/${id}/formation/${phase}`, {
      expected: view.administration.groups[phase],
      deadline,
      correctionUntil,
      publish,
      reason: "Teacher formation decision",
    });
  }
  async function groups(phase: string, value: unknown[]) {
    const view = await good(`/${id}`);
    return good(`/${id}/groups/${phase}`, {
      expected: view.administration.groups[phase],
      groups: value,
      reason: "Teacher membership approval",
    });
  }
  async function propose(
    user: CourseUser,
    members: string[],
    prior?: GroupProposal,
  ) {
    const response = await good(
      `/${id}/group-proposal/establish${prior ? `/${prior.id}` : ""}`,
      {
        expected: prior?.revision ?? null,
        members,
        name: "Optional team name",
      },
      user,
    );
    assert.deepEqual(response, { ok: true });
    const record = (await good(`/${id}`, undefined, user))
      .config as Envelope<Course>;
    return record.value.phases.establish.formation!.proposals.at(-1)!;
  }
  async function confirm(
    user: CourseUser,
    prior: GroupProposal,
    confirm = true,
  ) {
    const response = await good(
      `/${id}/group-confirmation/establish/${prior.id}`,
      { expected: prior.revision, confirm },
      user,
    );
    assert.deepEqual(response, { ok: true });
    const record = (await good(`/${id}`, undefined, user))
      .config as Envelope<Course>;
    return record.value.phases.establish.formation!.proposals.find(
      (p) => p.id === prior.id,
    )!;
  }
  return { ...stores, request, good, open, groups, propose, confirm, id };
}
test("partial proposals require every member's confirmation; allocation, publication and four-member exceptions are distinct", async (t) => {
  const f = await fixture(t);
  assert.equal(
    (
      await f.request(
        `/${f.id}/group-proposal/establish`,
        { expected: null, members: [students[0]!.id] },
        students[0]!,
      )
    ).status,
    409,
  );
  await f.open();
  let pair = await f.propose(
    students[0]!,
    students.slice(0, 2).map((s) => s.id),
  );
  let view = await f.good(`/${f.id}`);
  assert.equal(
    (
      await f.request(`/${f.id}/groups/establish`, {
        expected: view.administration.groups.establish,
        groups: [
          {
            id: "",
            members: students.slice(0, 3).map((s) => s.id),
            proposal: pair.id,
          },
        ],
        reason: "Cannot accept an unconfirmed proposal",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request(
        `/${f.id}/group-confirmation/establish/${pair.id}`,
        { expected: pair.revision, confirm: true },
        students[2]!,
      )
    ).status,
    403,
  );
  const old = pair;
  pair = await f.confirm(students[1]!, pair);
  assert.equal(
    (
      await f.request(
        `/${f.id}/group-confirmation/establish/${pair.id}`,
        { expected: old.revision, confirm: true },
        students[1]!,
      )
    ).status,
    409,
  );
  let quartet = await f.propose(
    students[3]!,
    students.slice(3).map((s) => s.id),
  );
  for (const s of students.slice(4)) quartet = await f.confirm(s, quartet);
  view = await f.good(`/${f.id}`);
  const allocation = [
    {
      id: "",
      members: students.slice(0, 3).map((s) => s.id),
      proposal: pair.id,
      name: "Trio",
    },
    {
      id: "",
      members: students.slice(3).map((s) => s.id),
      proposal: quartet.id,
      name: "Quartet",
    },
  ];
  assert.equal(
    (
      await f.request(`/${f.id}/groups/establish`, {
        expected: view.administration.groups.establish,
        groups: allocation,
        reason: "Missing fourth-member exception",
      })
    ).status,
    400,
  );
  const saved = (await f.groups("establish", [
    allocation[0]!,
    { ...allocation[1], exception: "PRIVATE: approved cohort remainder" },
  ])) as Envelope<Course>;
  assert.deepEqual(
    saved.value.phases.establish.groups.map((g) => g.id),
    ["group-01", "group-02"],
  );
  const unpublished = await f.good(`/${f.id}`, undefined, students[0]!);
  assert.deepEqual(unpublished.config.value.phases.establish.groups, []);
  assert.equal(
    (
      await f.request(
        `/${f.id}/submission/establish/group-01`,
        { expected: null, stage: "draft", value: {} },
        students[0]!,
      )
    ).status,
    403,
  );
  await f.open("establish", true);
  const publicView = await f.good(`/${f.id}`, undefined, students[0]!);
  assert.equal(publicView.config.value.phases.establish.groups.length, 2);
  assert.equal(JSON.stringify(publicView).includes("PRIVATE"), false);
  assert.equal(
    (
      await f.request(
        `/${f.id}/group-confirmation/establish/${pair.id}`,
        { expected: pair.revision, confirm: false },
        students[1]!,
      )
    ).status,
    409,
  );
  const agreement = await f.good(
    `/${f.id}/working-agreement/establish/group-01`,
    {
      expected: null,
      text: "Meet weekly; communicate early; review missed commitments together.",
    },
    students[2]!,
  );
  assert.equal(
    (await f.good(`/${f.id}`, undefined, students[0]!)).agreements.length,
    1,
  );
  assert.equal(
    (await f.good(`/${f.id}`, undefined, students[3]!)).agreements.length,
    0,
  );
  assert.equal(
    (
      await f.request(
        `/${f.id}/working-agreement/establish/group-01`,
        { expected: agreement.revision, text: "Unauthorized edit" },
        students[3]!,
      )
    ).status,
    403,
  );
});
test("working agreements require an existing group and stay private until its allocation is published", async (t) => {
  const f = await fixture(t);
  const invalidKey = recordKey(
    f.id,
    "working-agreement",
    "establish",
    "group-99",
  );
  const before = await f.good(`/${f.id}`);
  const invalid = await f.request(
    `/${f.id}/working-agreement/establish/group-99`,
    { expected: null, text: "This group does not exist." },
  );
  assert.equal(invalid.status, 404);
  assert.equal(await f.store.get(invalidKey), null);
  assert.deepEqual(await f.store.history(invalidKey), []);
  assert.deepEqual((await f.good(`/${f.id}`)).config, before.config);

  await f.open();
  await f.groups("establish", [
    { id: "", members: students.slice(0, 3).map((s) => s.id) },
    {
      id: "",
      members: students.slice(3).map((s) => s.id),
      exception: "Approve four for the synthetic cohort remainder",
    },
  ]);
  const agreement = await f.good(
    `/${f.id}/working-agreement/establish/group-01`,
    {
      expected: null,
      text: "PRIVATE TEAM PLAN: discuss availability together.",
    },
  );
  assert.equal((await f.good(`/${f.id}`)).agreements.length, 1);
  const unpublished = await f.good(`/${f.id}`, undefined, students[0]!);
  assert.deepEqual(unpublished.agreements, []);
  assert.equal(
    JSON.stringify(unpublished).includes("PRIVATE TEAM PLAN"),
    false,
  );
  assert.equal(
    (
      await f.request(
        `/${f.id}/working-agreement/establish/group-01`,
        {
          expected: agreement.revision,
          text: "Cannot edit before publication",
        },
        students[0]!,
      )
    ).status,
    403,
  );

  await f.open("establish", true);
  assert.equal(
    (await f.good(`/${f.id}`, undefined, students[0]!)).agreements[0].value
      .text,
    agreement.value.text,
  );
  assert.deepEqual(
    (await f.good(`/${f.id}`, undefined, students[3]!)).agreements,
    [],
  );
  const edited = await f.good(
    `/${f.id}/working-agreement/establish/group-01`,
    {
      expected: agreement.revision,
      text: "Published members agree to meet weekly.",
    },
    students[0]!,
  );
  assert.equal(
    (await f.good(`/${f.id}`, undefined, students[1]!)).agreements[0].revision,
    edited.revision,
  );
  // An ungraded agreement can outlive an unused allocation. Its history remains
  // available to staff, but no student inherits access to an absent group.
  const allocated = (await f.good(`/${f.id}`)).config.value.phases.establish
    .groups;
  await f.groups("establish", [allocated[1]]);
  assert.deepEqual(
    (await f.good(`/${f.id}`, undefined, students[0]!)).agreements,
    [],
  );
  assert.equal(
    (await f.good(`/${f.id}`)).agreements[0].revision,
    edited.revision,
  );
  assert.equal(
    (
      await f.store.history(
        recordKey(f.id, "working-agreement", "establish", "group-01"),
      )
    ).length,
    2,
  );
});
test("private matching constraints and unrelated invitations stay private; edits re-request consent and close at the deadline", async (t) => {
  const f = await fixture(t);
  await f.open();
  await f.good(
    `/${f.id}/group-preference/establish`,
    {
      expected: null,
      request: "assign",
      available: true,
      availability: "PRIVATE EVENING TIMETABLE",
      support: "PRIVATE SUPPORT CONSTRAINT",
    },
    students[0]!,
  );
  let proposal = await f.propose(
    students[0]!,
    students.slice(0, 3).map((s) => s.id),
  );
  proposal = await f.confirm(students[1]!, proposal);
  const edited = await f.propose(
    students[0]!,
    students.slice(0, 2).map((s) => s.id),
    proposal,
  );
  assert.deepEqual(edited.confirmed, [students[0]!.id]);
  const other = await f.good(`/${f.id}`, undefined, students[3]!);
  assert.equal(JSON.stringify(other).includes("PRIVATE"), false);
  assert.equal(
    other.config.value.phases.establish.formation.preferences[0].available,
    true,
  );
  assert.equal(
    other.config.value.phases.establish.formation.proposals.length,
    0,
  );
  const own = await f.good(`/${f.id}`, undefined, students[0]!);
  assert.equal(
    own.config.value.phases.establish.formation.preferences[0].support,
    "PRIVATE SUPPORT CONSTRAINT",
  );
  assert.equal(
    (await f.request(`/${f.id}/formation/establish`, {}, students[0]!)).status,
    403,
  );
  assert.equal(
    (
      await f.request(
        `/${f.id}/group-preference/establish`,
        {
          expected: null,
          request: "assign",
          available: false,
          availability: "",
          support: "",
        },
        students[1]!,
        deadline,
      )
    ).status,
    409,
  );
  const view = await f.good(`/${f.id}`);
  assert.equal(
    (
      await f.request(`/${f.id}/formation/establish`, {
        expected: view.administration.groups.establish,
        deadline,
        correctionUntil,
        publish: true,
        reason: "Incomplete allocation",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request(`/${f.id}/groups/establish`, {
        expected: view.administration.groups.establish,
        groups: [
          {
            id: "",
            members: students.slice(0, 5).map((s) => s.id),
            exception: "Cannot override max four",
          },
        ],
        reason: "Too many members",
      })
    ).status,
    400,
  );
});
test("later-phase transfers retain frozen ownership and grade history; small continuing groups require an exception", async (t) => {
  const f = await fixture(t);
  await f.open();
  const roster = students.map((s) => s.id);
  const allocated = (await f.groups("establish", [
    { id: "", members: roster.slice(0, 3) },
    { id: "", members: roster.slice(3), exception: "Approved fourth member" },
  ])) as Envelope<Course>;
  await f.open("establish", true);
  const upload = await handleCourses(
    new Request(
      `https://book.test/api/courses/${f.id}/files/establish/group-01?scope=technical&name=source.zip`,
      {
        method: "POST",
        headers: { Origin: "https://book.test", "Content-Length": "4" },
        body: "tiny",
      },
    ),
    { ...f, user: students[0]!, admins: ["instructor"], now },
  );
  assert.equal(upload.status, 201);
  const file = await upload.json();
  const frozen = await f.good(
    `/${f.id}/submission/establish/group-01`,
    {
      expected: null,
      stage: "freeze",
      value: {
        repository: "https://example.com/synthetic-fixture",
        commit: "a".repeat(40),
        archive: file.value.id,
        setup: "Run the synthetic setup",
        evidence: "Synthetic baseline evidence",
      },
    },
    students[0]!,
  );
  const grade = await f.good(`/${f.id}/project-grade/establish/group-01`, {
    expected: null,
    scores: Array(8).fill(0),
    feedback: "Synthetic evidence assessment",
    reason: "Initial assessment",
    missing: false,
  });
  await f.open("challenge");
  const original = allocated.value.phases.establish.groups;
  const transferred = [
    {
      ...original[0],
      members: [roster[0], roster[1]],
      exception: "Approved smaller continuing group after transfer",
    },
    {
      ...original[1],
      members: [roster[2], roster[3], roster[4], roster[5]],
      exception: "Approved fourth member",
    },
    {
      id: "",
      members: [roster[6]],
      exception: "Explicit instructor catch-up arrangement",
    },
  ];
  await f.groups("challenge", transferred);
  const view = await f.good(`/${f.id}`);
  assert.equal(
    (
      await f.request(`/${f.id}/groups/establish`, {
        expected: view.administration.groups.establish,
        groups: transferred,
        reason: "Cannot rewrite frozen membership",
      })
    ).status,
    400,
  );
  assert.deepEqual(
    (await f.store.history(frozen.key, frozen.revision))[0]!.value,
    frozen.value,
  );
  assert.equal((await f.store.get(grade.key))!.revision, grade.revision);
  assert.deepEqual(
    (await f.store.get<Course>(recordKey(f.id, "course")))!.value.phases
      .establish.groups,
    original,
  );
});
