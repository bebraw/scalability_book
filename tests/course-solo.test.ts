import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { localCourseStores } from "../scripts/lib/local-courses.ts";
import { handleCourses } from "../worker/courses.ts";
import {
  phases,
  projectCriteria,
  emptyPortfolio,
  type Course,
  type Envelope,
  type Submission,
  type Grade,
} from "../shared/course.ts";
import type { SoloReview } from "../shared/course-solo.ts";
import {
  updateAdministration,
  administrationRevisions,
} from "../worker/course-administration.ts";

const teacher = { id: "github:1", login: "teacher" };
const student = { id: "github:2", login: "solo" };
const before = "2026-10-01T00:00:00.000Z",
  during = "2026-10-04T00:00:00.000Z",
  after = "2026-10-06T00:00:00.000Z";

async function fixture(t: test.TestContext) {
  const directory = mkdtempSync(path.join(tmpdir(), "course-solo-"));
  const stores = localCourseStores(directory);
  t.after(() => {
    stores.close();
    rmSync(directory, { recursive: true, force: true });
  });
  async function request(
    route: string,
    method = "GET",
    body?: unknown,
    user = teacher,
    now = before,
  ) {
    return handleCourses(
      new Request(`https://book.test/api/courses${route}`, {
        method,
        headers: {
          Origin: "https://book.test",
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
      { ...stores, user, admins: [teacher.login], now },
    );
  }
  async function good<T = any>(
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
    name: "Synthetic solo course",
  });
  const course = structuredClone(config.value);
  course.students = [
    { ...student, number: "SYNTHETIC1", name: "Solo Example" },
  ];
  for (const phase of phases)
    course.phases[phase] = {
      freezeAt: "2026-10-03T00:00:00.000Z",
      auditAt: "2026-10-05T00:00:00.000Z",
      evidenceAt: "2026-10-07T00:00:00.000Z",
      groups: [
        {
          id: "solo",
          members: [student.id],
          route: "solo",
          exception: "Approved solo route, agreed workload and review",
        },
      ],
      audits: [],
      published: false,
    };
  config = await good(`/${course.id}/setup`, "PUT", {
    ...course,
    expected: config.revision,
    reason: "Approve all three solo phases",
  });
  const id = course.id;
  const plan = {
    reviewer: "Instructor Example",
    checkIn: "",
    report: "",
    reference: {
      repository: "https://example.com/reference",
      commit: "b".repeat(40),
      setup: "Clean checkout; install; seed synthetic data; run checks",
      probe:
        "Apply the released phase-specific vertical slice; use the common audit tool policy",
    },
  };
  async function freeze(phase: string, commit = "a".repeat(40)) {
    const bytes = new Uint8Array([1, 2, 3]);
    const uploaded = await handleCourses(
      new Request(
        `https://book.test/api/courses/${id}/files/${phase}/solo?scope=technical&name=synthetic.zip`,
        {
          method: "POST",
          headers: {
            Origin: "https://book.test",
            "Content-Length": String(bytes.length),
          },
          body: bytes,
        },
      ),
      { ...stores, user: student, admins: [teacher.login], now: before },
    );
    assert.equal(uploaded.status, 201);
    const file = (await uploaded.json()) as any;
    return good<Envelope<Submission>>(
      `/${id}/submission/${phase}/solo`,
      "PUT",
      {
        expected: null,
        stage: "freeze",
        value: {
          repository: "",
          commit,
          archive: file.value.id,
          setup: "Supported setup and checks",
          evidence: "Synthetic phase evidence with limitations",
        },
      },
      student,
    );
  }
  return { ...stores, id, config, plan, request, good, freeze };
}

test("a solo student completes all three phases with independent review, portfolios, grading and retained A/B evidence", async (t) => {
  const f = await fixture(t);
  const frozen: Envelope<Submission>[] = [];
  for (const phase of phases) {
    const route = `/${f.id}/solo-review/${phase}/solo`;
    let review = await f.good<Envelope<SoloReview>>(route, "PUT", {
      expected: null,
      reason: "Arrange independent review",
      value: f.plan,
    });
    const hidden = await f.good(`/${f.id}`, "GET", undefined, student);
    assert.equal(hidden.soloReviews[0].value.reference.repository, "");
    assert.equal(
      (
        await f.request(
          `/${f.id}/audit/${phase}/solo`,
          "PUT",
          { expected: null, report: "Premature" },
          student,
        )
      ).status,
      409,
    );
    if (phase === "establish")
      await assert.rejects(
        f.freeze(phase, f.plan.reference.commit.toUpperCase()),
        /different implementations/,
      );
    const source = await f.freeze(phase);
    frozen.push(source);
    assert.equal(
      (
        await f.request(
          route,
          "PUT",
          {
            expected: review.revision,
            reason: "Forged reviewer",
            value: { ...f.plan, report: "Self review" },
          },
          student,
          during,
        )
      ).status,
      403,
    );
    const revealed = await f.good(
      `/${f.id}`,
      "GET",
      undefined,
      student,
      during,
    );
    assert.equal(
      revealed.soloReviews.find((r: any) => r.value.phase === phase).value
        .reference.commit,
      "b".repeat(40),
    );
    const project = {
      expected: null,
      scores: projectCriteria(phase).map((c) => c[1]),
      feedback: "Criterion evidence reviewed",
      missing: false,
      reason: "Assessment",
    };
    assert.equal(
      (
        await f.request(
          `/${f.id}/project-grade/${phase}/solo`,
          "PUT",
          project,
          teacher,
          after,
        )
      ).status,
      409,
    );
    review = await f.good(
      route,
      "PUT",
      {
        expected: review.revision,
        reason: "Record actual independent evidence",
        value: {
          ...f.plan,
          checkIn:
            "Prediction, competing explanation, check and acceptance defended",
          report:
            "Independent setup and change-probe audit with timing and findings",
        },
      },
      teacher,
      during,
    );
    assert.equal(review.value.targetRevision, source.value.frozenRevision);
    await f.good(
      `/${f.id}/audit/${phase}/solo`,
      "PUT",
      {
        expected: null,
        report:
          "Reference audit: prior exposure, setup time, bounded probe, checks, patch and limitations",
      },
      student,
      during,
    );
    assert.equal(
      (
        await f.request(
          route,
          "PUT",
          {
            expected: review.revision,
            reason: "Change reference",
            value: {
              ...review.value,
              reference: { ...f.plan.reference, commit: "c".repeat(40) },
            },
          },
          teacher,
          during,
        )
      ).status,
      409,
    );
    const portfolio = emptyPortfolio(phase, student.id);
    portfolio.lectures = portfolio.lectures.map(() => ({
      mode: "remote",
      participation: "Completed the announced remote activity",
      idea: "Concrete idea",
      connection: "Linked to phase evidence",
    }));
    Object.assign(portfolio, {
      self: "Evidence-based self assessment",
      peers: "Useful independent implementation review",
      reflection: "Response to human feedback and one adjustment",
      contribution: "Consequential decision and accountable acceptance",
    });
    await f.good(
      `/${f.id}/portfolio/${phase}/${student.id}`,
      "PUT",
      { expected: null, stage: "submit", value: portfolio },
      student,
      after,
    );
    const references =
      phase === "compare"
        ? frozen.slice(0, 2).map((r, i) => ({
            phase: phases[i],
            group: "solo",
            frozenRevision: r.value.frozenRevision,
          }))
        : [];
    await f.good(
      `/${f.id}/submission/${phase}/solo`,
      "PUT",
      {
        expected: source.revision,
        stage: "evidence",
        value: {
          response: "Response to independent findings",
          finalEvidence: {
            index: "Complete phase evidence",
            files: [],
            checklist: [],
            references,
          },
        },
      },
      student,
      after,
    );
    await f.good(
      `/${f.id}/project-grade/${phase}/solo`,
      "PUT",
      project,
      teacher,
      after,
    );
    await f.good(
      `/${f.id}/individual-grade/${phase}/${student.id}`,
      "PUT",
      {
        expected: null,
        scores: [1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 3, 3],
        feedback: "Solo equivalent criteria supported by evidence",
        missing: false,
        reason: "Assessment",
      },
      teacher,
      after,
    );
    const view = await f.good(`/${f.id}`, "GET", undefined, teacher, after);
    await f.good(
      `/${f.id}/publish/${phase}`,
      "POST",
      {
        expected: view.config.revision,
        published: true,
        reason: "Release current solo assessments",
      },
      teacher,
      after,
    );
  }
  const view = await f.good(`/${f.id}`, "GET", undefined, student, after);
  assert.equal(view.results[0].result.status, "pass");
  assert.equal(view.results[0].result.earned, 153);
  assert.equal(view.results[0].result.available, 153);
  assert.equal(view.results[0].result.grade, 5);
  assert.equal(
    view.submissions.find((r: any) => r.value.phase === "compare").value
      .finalEvidence.references.length,
    2,
  );
  const csv = await f.request(
    `/${f.id}/export`,
    "GET",
    undefined,
    teacher,
    after,
  );
  assert.ok((await csv.text()).includes('"153"'));
  const oldGrade = view.projects.find(
    (r: Envelope<Grade>) => r.value.phase === "establish",
  );
  const review = view.soloReviews.find(
    (r: Envelope<SoloReview>) => r.value.phase === "establish",
  );
  await f.good(
    `/${f.id}/solo-review/establish/solo`,
    "PUT",
    {
      expected: review.revision,
      reason: "Correct independent evidence",
      value: { ...review.value, report: "Corrected finding" },
    },
    teacher,
    after,
  );
  const changed = await f.good(`/${f.id}`, "GET", undefined, teacher, after);
  assert.equal(changed.results[0].result.status, "pending");
  assert.ok(
    changed.projects.some(
      (r: Envelope<Grade>) => r.revision === oldGrade.revision,
    ),
  );
  assert.equal(
    (
      await f.request(
        `/${f.id}/publish/establish`,
        "POST",
        {
          expected: changed.config.revision,
          published: true,
          reason: "Attempt stale release",
        },
        teacher,
        after,
      )
    ).status,
    400,
  );
  assert.equal(
    changed.submissions.find(
      (r: Envelope<Submission>) => r.value.phase === "establish",
    ).value.frozenRevision,
    frozen[0]!.value.frozenRevision,
  );
});

test("solo allocation requires explicit approval and a supported edition; frozen routes cannot be rewritten", async (t) => {
  const f = await fixture(t),
    course = f.config.value;
  const unsupported = {
    ...course,
    requirements: "unsupported-edition",
  };
  const groups = course.phases.establish.groups;
  assert.throws(
    () =>
      updateAdministration(
        unsupported,
        [],
        "groups",
        "establish",
        {
          expected: administrationRevisions(unsupported).groups.establish,
          groups,
        },
        teacher.id,
        before,
      ),
    /solo route needs/,
  );
  assert.throws(
    () =>
      updateAdministration(
        course,
        [],
        "groups",
        "establish",
        {
          expected: administrationRevisions(course).groups.establish,
          groups: groups.map((g) => ({ ...g, exception: "" })),
        },
        teacher.id,
        before,
      ),
    /approval|Explain instructor approval/,
  );
  const source = await f.freeze("establish");
  assert.throws(
    () =>
      updateAdministration(
        course,
        [source],
        "groups",
        "establish",
        {
          expected: administrationRevisions(course).groups.establish,
          groups: groups.map((g) => ({ ...g, route: "group" })),
        },
        teacher.id,
        before,
      ),
    /Frozen group membership/,
  );
  const response = await f.request(
    `/${f.id}/solo-review/establish/solo`,
    "PUT",
    {
      expected: null,
      reason: "Invalid URL",
      value: {
        ...f.plan,
        reference: { ...f.plan.reference, repository: "javascript:alert(1)" },
      },
    },
  );
  assert.equal(response.status, 400);
});

test("independent technical reviews open to the class without exposing the solo discussion or private portfolio", async (t) => {
  const f = await fixture(t);
  const observer = { id: "github:3", login: "observer" };
  await f.good(`/${f.id}/setup`, "PUT", {
    ...f.config.value,
    students: [
      ...f.config.value.students,
      { ...observer, number: "SYNTHETIC2", name: "Class Example" },
    ],
    expected: f.config.revision,
    reason: "Add a synthetic classmate for access checks",
  });
  const source = await f.freeze("establish");
  const review = await f.good<Envelope<SoloReview>>(
    `/${f.id}/solo-review/establish/solo`,
    "PUT",
    {
      expected: null,
      reason: "Record independent review",
      value: {
        ...f.plan,
        checkIn: "Private instructor discussion",
        report: "Shareable technical audit",
      },
    },
    teacher,
    during,
  );
  await f.good(
    `/${f.id}/portfolio/establish/${student.id}`,
    "PUT",
    {
      expected: null,
      stage: "draft",
      value: {
        ...emptyPortfolio("establish", student.id),
        self: "Private reflection",
      },
    },
    student,
    during,
  );
  const closed = await f.good(`/${f.id}`, "GET", undefined, observer, during);
  assert.equal(closed.soloReviews.length, 0);
  assert.equal(closed.portfolios.length, 0);
  const opened = await f.good(`/${f.id}`, "GET", undefined, observer, after);
  assert.equal(opened.soloReviews[0].value.report, "Shareable technical audit");
  assert.equal(
    opened.soloReviews[0].value.targetRevision,
    source.value.frozenRevision,
  );
  assert.equal(opened.soloReviews[0].value.checkIn, "");
  assert.equal(opened.soloReviews[0].value.reference.repository, "");
  assert.equal(opened.portfolios.length, 0);
  const own = await f.good(`/${f.id}`, "GET", undefined, student, after);
  assert.equal(
    own.soloReviews[0].value.checkIn,
    "Private instructor discussion",
  );
  assert.equal(own.portfolios[0].value.self, "Private reflection");
  assert.equal(
    (
      await f.request(
        `/${f.id}/solo-review/establish/solo`,
        "PUT",
        {
          expected: "stale-revision",
          reason: "Concurrent correction",
          value: review.value,
        },
        teacher,
        after,
      )
    ).status,
    409,
  );
});

test("a solo student can use an assigned course group for the outgoing audit without a supplied reference", async (t) => {
  const f = await fixture(t);
  const peer = { id: "github:3", login: "peer" };
  const course = structuredClone(f.config.value);
  course.students.push({ ...peer, number: "SYNTHETIC2", name: "Peer Example" });
  course.phases.establish.groups.push({
    id: "peer",
    members: [peer.id],
    exception: "Approved small synthetic group",
  });
  course.phases.establish.audits = [
    { from: "solo", to: "peer" },
    { from: "peer", to: "solo" },
  ];
  await f.good(`/${f.id}/setup`, "PUT", {
    ...course,
    expected: f.config.revision,
    reason: "Arrange mixed group and solo audit assignments",
  });
  const review = await f.good<Envelope<SoloReview>>(
    `/${f.id}/solo-review/establish/solo`,
    "PUT",
    {
      expected: null,
      reason: "Arrange human review; outgoing course group assigned",
      value: {
        ...f.plan,
        reference: { repository: "", commit: "", setup: "", probe: "" },
      },
    },
  );
  assert.equal(review.value.reference.commit, "");
  await f.freeze("establish");
  let view = await f.good(`/${f.id}`);
  await f.good(
    `/${f.id}/schedule/establish`,
    "PUT",
    {
      ...view.config.value.phases.establish,
      audits: [{ from: "peer", to: "solo" }],
      expected: view.administration.schedule.establish,
      reason: "Arrange a reference fallback before any outgoing audit",
    },
    teacher,
    during,
  );
  assert.equal(
    (
      await f.request(
        `/${f.id}/audit/establish/solo`,
        "PUT",
        {
          expected: null,
          report: "An empty reference must not count as an audit",
        },
        student,
        during,
      )
    ).status,
    409,
  );
  await f.good(
    `/${f.id}/solo-review/establish/solo`,
    "PUT",
    {
      expected: review.revision,
      value: f.plan,
      reason: "Supply the first complete reference fallback",
    },
    teacher,
    during,
  );
  view = await f.good(`/${f.id}`);
  await f.good(
    `/${f.id}/schedule/establish`,
    "PUT",
    {
      ...view.config.value.phases.establish,
      audits: course.phases.establish.audits,
      expected: view.administration.schedule.establish,
      reason: "Retain the assigned course group for this outgoing audit",
    },
    teacher,
    during,
  );
  const bytes = new Uint8Array([1, 2, 3]);
  const upload = await handleCourses(
    new Request(
      `https://book.test/api/courses/${f.id}/files/establish/peer?scope=technical&name=synthetic.zip`,
      {
        method: "POST",
        headers: {
          Origin: "https://book.test",
          "Content-Length": String(bytes.length),
        },
        body: bytes,
      },
    ),
    { ...f, user: peer, admins: [teacher.login], now: before },
  );
  assert.equal(upload.status, 201);
  const file = (await upload.json()) as any;
  const target = await f.good<Envelope<Submission>>(
    `/${f.id}/submission/establish/peer`,
    "PUT",
    {
      expected: null,
      stage: "freeze",
      value: {
        repository: "",
        commit: "c".repeat(40),
        archive: file.value.id,
        setup: "Synthetic setup",
        evidence: "Synthetic evidence",
      },
    },
    peer,
  );
  const audit = await f.good(
    `/${f.id}/audit/establish/solo`,
    "PUT",
    {
      expected: null,
      report: "Independent technical audit of the assigned group",
    },
    student,
    during,
  );
  assert.equal(audit.value.to, "peer");
  assert.equal(audit.value.targetRevision, target.value.frozenRevision);
  assert.equal(audit.value.reference, undefined);
});
