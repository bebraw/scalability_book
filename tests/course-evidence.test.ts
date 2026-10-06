import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { localCourseStores } from "../scripts/lib/local-courses.ts";
import { handleCourses, type CourseUser } from "../worker/courses.ts";
import {
  phases,
  type Course,
  type CourseFile,
  type Envelope,
  type Result,
  type Submission,
} from "../shared/course.ts";
import type { AdministrationRevisions } from "../shared/course-administration.ts";
import { createStoredZip } from "../scripts/lib/zip.ts";

const teacher = { id: "github:1", login: "teacher" },
  alice = { id: "github:2", login: "alice" },
  bob = { id: "github:3", login: "bob" };
const before = "2026-01-01T00:00:00.000Z",
  during = "2026-01-04T00:00:00.000Z",
  opened = "2026-01-05T00:00:00.000Z",
  after = "2026-01-08T00:00:00.000Z";
type View = {
  config: Envelope<Course>;
  administration: AdministrationRevisions;
  submissions: Envelope<Submission>[];
  files: Envelope<CourseFile>[];
  results: { result: Result }[];
};
async function fixture(t: test.TestContext) {
  const dir = mkdtempSync(path.join(tmpdir(), "course-evidence-")),
    stores = localCourseStores(dir);
  t.after(() => {
    stores.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const request = (
    route: string,
    method = "GET",
    body?: unknown,
    user: CourseUser = teacher,
    now = before,
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
      { ...stores, user, admins: [teacher.login], now },
    );
  async function good<T>(
    route: string,
    method = "GET",
    body?: unknown,
    user = teacher,
    now = before,
  ): Promise<T> {
    const response = await request(route, method, body, user, now),
      data = await response.json();
    assert.ok(response.ok, JSON.stringify(data));
    return data as T;
  }
  let config = await good<Envelope<Course>>("", "POST", {
    name: "Synthetic evidence course",
  });
  const course = structuredClone(config.value),
    id = course.id;
  course.students = [alice, bob].map((s, i) => ({
    ...s,
    number: `TEST${i}`,
    name: s.login,
  }));
  for (const phase of phases)
    course.phases[phase] = {
      freezeAt: "2026-01-03T00:00:00.000Z",
      auditAt: opened,
      evidenceAt: "2026-01-07T00:00:00.000Z",
      published: false,
      groups: [
        { id: "red", members: [alice.id], exception: "Synthetic pair fixture" },
        { id: "blue", members: [bob.id], exception: "Synthetic pair fixture" },
      ],
      audits: [
        { from: "blue", to: "red" },
        { from: "red", to: "blue" },
      ],
    };
  config = await good(`/${id}/setup`, "PUT", {
    ...course,
    expected: config.revision,
    reason: "Synthetic course setup",
  });
  async function upload(
    phase: string,
    purpose = "source",
    user = alice,
    now = before,
    owner = "red",
    scope = "technical",
    reason = "",
  ) {
    const bytes =
      purpose === "source"
        ? createStoredZip([
            {
              name: "README.md",
              data: new TextEncoder().encode(
                "Synthetic archive; see controlled reproduction fixture.",
              ),
            },
          ])
        : Buffer.from("Later technical evidence");
    return handleCourses(
      new Request(
        `https://book.test/api/courses/${id}/files/${phase}/${encodeURIComponent(owner)}?scope=${scope}&purpose=${purpose}&name=${purpose === "source" ? "source.zip" : "results.csv"}&reason=${encodeURIComponent(reason)}`,
        {
          method: "POST",
          headers: {
            Origin: "https://book.test",
            "Content-Length": String(bytes.length),
          },
          body: bytes,
        },
      ),
      { ...stores, user, admins: [teacher.login], now },
    );
  }
  async function freeze(phase: string) {
    const response = await upload(phase);
    assert.equal(response.status, 201);
    const file = (await response.json()) as Envelope<CourseFile>;
    return good<Envelope<Submission>>(
      `/${id}/submission/${phase}/red`,
      "PUT",
      {
        expected: null,
        stage: "freeze",
        value: {
          repository: "",
          archive: file.value.id,
          commit: "a".repeat(40),
          setup:
            "Unpack; npm ci; initialize synthetic fixtures; run application; npm test.",
          evidence:
            "The baseline measurement is incomplete and declared missing.",
          checklist: [
            {
              id: "harness",
              status: "located",
              location: "README.md and test.mjs",
            },
            {
              id: "baseline",
              status: "missing",
              location:
                "Higher-concurrency measurements have not been collected.",
            },
          ],
        },
      },
      alice,
    );
  }
  return { ...stores, id, request, good, upload, freeze };
}
test("final evidence preserves the frozen implementation, hides drafts/attachments and invalidates old assessments", async (t) => {
  const f = await fixture(t),
    frozen = await f.freeze("establish");
  assert.equal(frozen.value.repository, "");
  assert.equal(frozen.value.requirements, "2026-10-v2");
  assert.equal(
    frozen.value.checklist!.find((r) => r.id === "baseline")!.status,
    "missing",
  );
  assert.equal(
    (await f.upload("establish", "source", alice, during)).status,
    409,
  );
  const privateResponse = await f.upload(
    "establish",
    "evidence",
    alice,
    during,
    alice.id,
    "private",
  );
  assert.equal(privateResponse.status, 201);
  const privateFile = (await privateResponse.json()) as Envelope<CourseFile>;
  const upload = await f.upload("establish", "evidence", alice, during);
  assert.equal(upload.status, 201);
  const file = (await upload.json()) as Envelope<CourseFile>;
  await f.good(
    `/${f.id}/project-grade/establish/red`,
    "PUT",
    {
      expected: null,
      scores: [6, 4, 5, 3, 2, 4, 4, 2],
      feedback: "Assessed initial evidence",
      missing: false,
      reason: "Initial assessment",
    },
    teacher,
    during,
  );
  const bad = {
    expected: frozen.revision,
    stage: "evidence",
    value: {
      response: "Response",
      finalEvidence: {
        index: "Must not expose private material",
        files: [privateFile.value.id],
      },
    },
  };
  assert.equal(
    (
      await f.request(
        `/${f.id}/submission/establish/red`,
        "PUT",
        bad,
        alice,
        during,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request(
        `/${f.id}/submission/establish/red`,
        "PUT",
        bad,
        bob,
        during,
      )
    ).status,
    403,
  );
  const finalEvidence = {
    index:
      "Completed pressure results; remaining measurements are explicitly missing.",
    files: [file.value.id],
    checklist: [
      { id: "pressure", status: "located", location: "results.csv" },
      {
        id: "baseline",
        status: "missing",
        location: "Measured baseline still incomplete.",
      },
    ],
    references: [],
  };
  const draft = await f.good<Envelope<Submission>>(
    `/${f.id}/submission/establish/red`,
    "PUT",
    {
      expected: frozen.revision,
      stage: "evidence-draft",
      value: { response: "Draft author response", finalEvidence },
    },
    alice,
    during,
  );
  assert.equal(draft.value.submittedAt, null);
  const staff = await f.good<View>(
    `/${f.id}`,
    "GET",
    undefined,
    teacher,
    during,
  );
  assert.equal(staff.results[0]!.result.breakdown[0]!.project, null);
  for (const now of [during, opened]) {
    const auditor = await f.good<View>(`/${f.id}`, "GET", undefined, bob, now);
    assert.equal(
      auditor.submissions.find((r) => r.value.group === "red")!.value
        .finalEvidence,
      undefined,
    );
    assert.equal(
      auditor.files.some(
        (r) =>
          r.value.id === file.value.id || r.value.id === privateFile.value.id,
      ),
      false,
    );
    assert.equal(
      (
        await f.request(
          `/${f.id}/files/establish/${file.value.id}`,
          "GET",
          undefined,
          bob,
          now,
        )
      ).status,
      404,
    );
  }
  const own = await f.good<View>(`/${f.id}`, "GET", undefined, alice, opened);
  assert.ok(own.files.some((r) => r.value.id === file.value.id));
  const submitted = await f.good<Envelope<Submission>>(
    `/${f.id}/submission/establish/red`,
    "PUT",
    {
      expected: draft.revision,
      stage: "evidence",
      value: {
        response: "Audit addressed; known limits retained",
        finalEvidence,
        archive: privateFile.value.id,
        setup: "Attempted replacement",
        evidence: "Attempted replacement",
        members: [bob.id],
        checklist: [],
      },
    },
    alice,
    opened,
  );
  for (const field of [
    "archive",
    "repository",
    "commit",
    "setup",
    "evidence",
    "members",
    "checklist",
    "frozenAt",
    "frozenRevision",
  ] as const)
    assert.deepEqual(
      submitted.value[field],
      frozen.value[field],
      `Frozen ${field} is preserved`,
    );
  const publicView = await f.good<View>(
    `/${f.id}`,
    "GET",
    undefined,
    bob,
    opened,
  );
  assert.ok(publicView.files.some((r) => r.value.id === file.value.id));
  assert.ok(!publicView.files.some((r) => r.value.id === privateFile.value.id));
  assert.equal(
    (
      await f.request(
        `/${f.id}/files/establish/${file.value.id}`,
        "GET",
        undefined,
        bob,
        opened,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await f.request(
        `/${f.id}/files/establish/${privateFile.value.id}`,
        "GET",
        undefined,
        bob,
        opened,
      )
    ).status,
    404,
  );
  assert.equal(
    (await f.upload("establish", "evidence", alice, after)).status,
    409,
  );
  assert.equal(
    (
      await f.request(
        `/${f.id}/submission/establish/red`,
        "PUT",
        {
          expected: submitted.revision,
          stage: "evidence",
          value: { response: "Late correction" },
        },
        alice,
        after,
      )
    ).status,
    409,
  );
  assert.equal(
    (await f.upload("establish", "evidence", teacher, after)).status,
    400,
  );
  assert.equal(
    (
      await f.upload(
        "establish",
        "evidence",
        teacher,
        after,
        "red",
        "technical",
        "Approved technical correction",
      )
    ).status,
    201,
  );
  const correction = await f.good<Envelope<Submission>>(
    `/${f.id}/submission/establish/red`,
    "PUT",
    {
      expected: submitted.revision,
      stage: "evidence",
      value: { response: "Approved late response" },
      reason: "Instructor correction",
    },
    teacher,
    after,
  );
  assert.deepEqual(
    correction.value.finalEvidence,
    submitted.value.finalEvidence,
  );
  const history = await f.store.history(frozen.key, frozen.revision);
  assert.deepEqual(history[0]!.value, frozen.value);
});
test("Compare links existing A/B frozen records; invalid references and false presence markers are rejected", async (t) => {
  const f = await fixture(t),
    a = await f.freeze("establish"),
    b = await f.freeze("challenge"),
    c = await f.freeze("compare");
  const references = [a, b].map((r) => ({
    phase: r.value.phase,
    group: r.value.group,
    frozenRevision: r.value.frozenRevision,
  }));
  const payload = {
    expected: c.revision,
    stage: "evidence",
    value: {
      response: "Audit and conditional comparison",
      finalEvidence: {
        index: "C's indexed evidence with existing A and B records",
        files: [],
        references,
        checklist: [
          {
            id: "c-index",
            status: "located",
            location: "Earlier A/B records and final index",
          },
        ],
      },
    },
  };
  assert.equal(
    (
      await f.request(
        `/${f.id}/submission/compare/red`,
        "PUT",
        {
          ...payload,
          value: {
            ...payload.value,
            finalEvidence: {
              ...payload.value.finalEvidence,
              references: [
                { ...references[0], frozenRevision: crypto.randomUUID() },
              ],
            },
          },
        },
        alice,
        opened,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await f.request(
        `/${f.id}/submission/compare/red`,
        "PUT",
        {
          ...payload,
          value: {
            ...payload.value,
            finalEvidence: {
              ...payload.value.finalEvidence,
              checklist: [{ id: "c-index", status: "located", location: "" }],
            },
          },
        },
        alice,
        opened,
      )
    ).status,
    400,
  );
  const saved = await f.good<Envelope<Submission>>(
    `/${f.id}/submission/compare/red`,
    "PUT",
    payload,
    alice,
    opened,
  );
  assert.deepEqual(saved.value.finalEvidence!.references, references);
  const view = await f.good<View>(`/${f.id}`, "GET", undefined, alice, opened);
  assert.equal(
    view.files.filter((r) => r.value.purpose === "source").length,
    3,
  );
  const read = await f.good<Envelope<Submission>>(
    `/${f.id}/submission/establish/red?frozenRevision=${a.value.frozenRevision}`,
    "GET",
    undefined,
    bob,
    opened,
  );
  assert.equal(read.value.archive, a.value.archive);
  assert.equal(
    (
      await f.request(
        `/${f.id}/submission/establish/red?frozenRevision=${crypto.randomUUID()}`,
        "GET",
        undefined,
        bob,
        opened,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await f.request(
        `/${f.id}/submission/establish/red`,
        "GET",
        undefined,
        bob,
        before,
      )
    ).status,
    404,
  );
});
