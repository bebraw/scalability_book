import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { localCourseStores } from "../scripts/lib/local-courses.ts";
import { localCourseSimulation } from "../scripts/lib/local-course-simulation.ts";
import { handleSimulation } from "../worker/course-simulation.ts";
import { simulationStores } from "../worker/course-simulation-store.ts";
import {
  projectCriteria,
  type Course,
  type Envelope,
  type Grade,
} from "../shared/course.ts";
import type { SimulationState } from "../shared/course-simulation.ts";
import { pendingWithdrawals } from "../shared/course-enrollment.ts";

const teacher = { id: "github:1", login: "instructor" },
  origin = "https://book.test";
async function json(response: Response): Promise<any> {
  const data = await response.json();
  assert.ok(response.ok, JSON.stringify(data));
  return data;
}
async function fixture(t: test.TestContext) {
  const directory = await mkdtemp(path.join(tmpdir(), "course-presets-"));
  const live = localCourseStores(directory),
    simulation = await localCourseSimulation(directory);
  t.after(() => {
    simulation.close();
    live.close();
    return rm(directory, { recursive: true, force: true });
  });
  const api = (
    route: string,
    method = "GET",
    body?: unknown,
    environment = simulation,
  ) =>
    handleSimulation(
      new Request(`${origin}/api/simulation/${simulation.id}/${route}`, {
        method,
        headers: {
          Origin: origin,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
      { environment, teacher, authorized: true, local: true },
    );
  const status = () => api("control/status").then(json);
  async function start(preset = "preparation", size = "compact") {
    const previous = await status();
    return (
      await json(
        await api("control/reset", "POST", {
          expected: previous.state?.revision ?? null,
          preset,
          size,
        }),
      )
    ).state as Envelope<SimulationState>;
  }
  async function finish(state: Envelope<SimulationState>) {
    for (let i = 0; state.value.preparing && i < 100; i++)
      state = (
        await json(
          await api("control/prepare", "POST", { expected: state.revision }),
        )
      ).state;
    assert.equal(state.value.preparing, undefined);
    return state;
  }
  return { directory, live, simulation, api, status, start, finish };
}

test("preparation presets retain pending consent, private matching, a four-person request and generated allocation for both cohort sizes", async (t) => {
  const f = await fixture(t);
  for (const size of ["compact", "larger"]) {
    let state = await f.start("preparation", size);
    assert.ok(state.value.preparing);
    assert.deepEqual((await f.status()).courses, []);
    assert.equal(
      (await f.api(`${state.value.generation}/courses`)).status,
      409,
    );
    assert.equal(
      (
        await f.api("control/clock", "POST", {
          expected: state.revision,
          now: "2026-10-06T08:00:00.000Z",
        })
      ).status,
      409,
    );
    state = await f.finish(state);
    const listing = await json(
      await f.api(`${state.value.generation}/courses`),
    );
    const id = listing.courses[0].id;
    const view = await json(
      await f.api(`${state.value.generation}/courses/${id}`),
    );
    const course: Course = view.config.value;
    assert.equal(course.students.length, size === "compact" ? 10 : 31);
    assert.ok(
      course.students.every(
        (s) => s.email?.endsWith(".invalid") && s.number.startsWith("SIM"),
      ),
    );
    const formation = course.phases.establish.formation!;
    assert.equal(formation.publishedAt, null);
    assert.equal(course.phases.establish.groups[0]!.id, "group-01");
    assert.equal(formation.proposals[0]!.confirmed.length, 3);
    assert.equal(formation.proposals[1]!.confirmed.length, 4);
    assert.equal(formation.proposals[2]!.confirmed.length, 1);
    assert.ok(formation.preferences.every((p) => p.request === "assign"));
    assert.equal(
      (
        await f.api(
          `${state.value.generation}/courses/${id}/formation/establish`,
          "PUT",
          {
            expected: view.administration.groups.establish,
            deadline: formation.deadline,
            correctionUntil: formation.correctionUntil,
            publish: true,
            reason: "Premature publication test",
          },
        )
      ).status,
      400,
    );
    const role = (
      await json(
        await f.api("control/role", "POST", {
          expected: state.revision,
          course: id,
          student: course.students[7]!.id,
        }),
      )
    ).state;
    const student = await json(
      await f.api(`${state.value.generation}/courses/${id}`),
    );
    assert.equal(student.staff, false);
    assert.deepEqual(student.config.value.phases.establish.groups, []);
    assert.equal(
      student.config.value.phases.establish.formation.proposals.length,
      1,
    );
    assert.ok(
      student.config.value.phases.establish.formation.preferences.every(
        (p: any) => !p.support,
      ),
    );
    assert.ok(
      student.config.value.students
        .filter((s: any) => s.id !== course.students[7]!.id)
        .every((s: any) => !s.email && !s.number),
    );
    await json(
      await f.api("control/role", "POST", {
        expected: role.revision,
        student: null,
      }),
    );
    const csv = await f.api(`control/roster?size=${size}`);
    assert.match(csv.headers.get("content-disposition")!, /SIMULATION-roster/);
    assert.equal(
      (await csv.text()).trim().split("\r\n").length,
      course.students.length + 1,
    );
  }
  assert.equal(
    (
      await f.api("control/reset", "POST", {
        expected: (await f.status()).state.revision,
        preset: "unknown",
      })
    ).status,
    400,
  );
});

test("grading presets exercise frozen evidence, late arrival, withdrawal, stale release, explicit missing work and high totals failing individual minima", async (t) => {
  const f = await fixture(t);
  for (const size of ["compact", "larger"]) {
    let state = await f.finish(await f.start("grading-review", size));
    const courseId = (await f.status()).courses[0].id;
    const base = `${state.value.generation}/courses/${courseId}`;
    let view = await json(await f.api(base));
    const course: Course = view.config.value;
    assert.equal(course.students.length, size === "compact" ? 10 : 31);
    assert.equal(view.now, "2026-12-13T08:00:00.000Z");
    assert.equal(course.phases.challenge.groups.at(-1)!.members.length, 4);
    assert.ok(course.phases.challenge.groups.at(-1)!.exception);
    const late = course.students.at(-1)!;
    assert.equal(late.enrollment!.lateAt, "2026-10-27T08:00:00.000Z");
    assert.equal(late.enrollment!.catchUp, "");
    const departed = course.students[5]!;
    assert.equal(
      departed.enrollment!.withdrawal!.at,
      "2026-12-12T08:00:00.000Z",
    );
    assert.equal(pendingWithdrawals(course)[0]!.id, departed.id);
    const departedGrades = view.individuals.filter(
      (r: Envelope<Grade>) => r.value.subject === departed.id,
    );
    assert.equal(departedGrades.length, 3);
    const departedSubmissions = view.submissions.filter((r: any) =>
      r.value.members.includes(departed.id),
    );
    assert.equal(departedSubmissions.length, 3);
    assert.equal(
      view.portfolios.filter(
        (p: any) =>
          p.value.student === course.students[2]!.id &&
          p.value.phase === "compare",
      ).length,
      0,
    );
    assert.equal(
      view.individuals.find(
        (g: Envelope<Grade>) =>
          g.value.phase === "compare" &&
          g.value.subject === course.students[2]!.id,
      ).value.missing,
      true,
    );
    assert.equal(
      view.results.find((r: any) => r.student.id === course.students[4]!.id)
        .result.status,
      "pending",
    );
    assert.equal(
      (
        await f.api(`${base}/publish/compare`, "POST", {
          expected: view.config.revision,
          published: true,
          reason: "Stale release must fail",
        })
      ).status,
      400,
    );
    // Review the changed portfolio with the existing assessment action.
    const stale = view.individuals.find(
      (g: Envelope<Grade>) =>
        g.value.phase === "compare" &&
        g.value.subject === course.students[4]!.id,
    );
    await json(
      await f.api(
        `${base}/individual-grade/compare/${course.students[4]!.id}`,
        "PUT",
        {
          expected: stale.revision,
          missing: false,
          scores: stale.value.scores,
          feedback:
            "Reviewed correction against the current synthetic portfolio",
          reason: "Refresh stale assessment",
        },
      ),
    );
    await json(
      await f.api(`${base}/publish/compare`, "POST", {
        expected: view.config.revision,
        published: true,
        reason: "Release reviewed synthetic work",
      }),
    );
    view = await json(await f.api(base));
    const result = (index: number) =>
      view.results.find((r: any) => r.student.id === course.students[index]!.id)
        .result;
    assert.equal(result(0).status, "pass");
    assert.equal(result(0).grade, 5);
    assert.equal(result(1).status, "fail");
    assert.ok(result(1).percentage > 90);
    assert.match(result(1).unmet.join(" "), /1\/3 completed lecture/);
    assert.equal(result(2).status, "fail");
    assert.ok(result(2).percentage > 80);
    assert.match(result(2).unmet.join(" "), /self\/peer assessment/);
    assert.equal(result(4).status, "pass");
    assert.equal(result(5).status, "withdrawn");
    assert.equal(result(5).grade, null);
    assert.equal(result(course.students.length - 1).status, "fail");
    const comparison = view.submissions.find(
      (r: any) => r.value.phase === "compare",
    );
    assert.equal(comparison.value.finalEvidence.references.length, 2);
    const archive = await f.api(
      `${base}/files/compare/${comparison.value.archive}`,
    );
    assert.equal(archive.status, 200);
    assert.equal(new Uint8Array(await archive.arrayBuffer())[0], 0x50);
    const history = await json(
      await f.api(
        `${base}/history?key=${encodeURIComponent(comparison.key)}&revision=${comparison.value.frozenRevision}`,
      ),
    );
    assert.equal(history.history.length, 1);
    assert.equal(history.history[0].value.finalEvidence, undefined);
    assert.equal(
      history.history[0].value.members.length,
      comparison.value.members.length,
    );
    assert.ok(view.audits.length >= 9);
    const csv = await f.api(`${base}/export`);
    const exported = await csv.text();
    assert.match(exported, /"SIM002","Ben Example".*"0","fail"/);
    assert.deepEqual(
      exported
        .split("\r\n")
        .find((line) => line.includes('"SIM006"'))!
        .split(",")
        .slice(4, 11),
      ['""', '""', '""', '""', '"withdrawn"', '""', '""'],
    );
    await json(
      await f.api(`${base}/enrollment`, "PUT", {
        expected: view.administration.students,
        student: departed.id,
        action: "review-withdrawal",
        resolution:
          "PRIVATE review: remaining members completed work; frozen membership and staff audit arrangements retained",
        reason: "Review the authored departure",
      }),
    );
    const reviewed = await json(await f.api(base));
    assert.deepEqual(pendingWithdrawals(reviewed.config.value), []);
    assert.deepEqual(
      reviewed.individuals.filter(
        (r: Envelope<Grade>) => r.value.subject === departed.id,
      ),
      departedGrades,
    );
    assert.deepEqual(
      reviewed.submissions.filter((r: any) =>
        r.value.members.includes(departed.id),
      ),
      departedSubmissions,
    );
    state = (
      await json(
        await f.api("control/role", "POST", {
          expected: state.revision,
          course: courseId,
          student: departed.id,
        }),
      )
    ).state;
    const departedView = await json(await f.api(base));
    assert.equal(departedView.results[0].result.status, "withdrawn");
    assert.equal(JSON.stringify(departedView).includes("PRIVATE"), false);
    assert.equal(
      (await f.api(`${base}/portfolio/compare/${departed.id}`, "PUT", {}))
        .status,
      403,
    );
    state = (
      await json(
        await f.api("control/role", "POST", {
          expected: state.revision,
          student: null,
        }),
      )
    ).state;
    state = (
      await json(
        await f.api("control/role", "POST", {
          expected: state.revision,
          course: courseId,
          student: course.students[1]!.id,
        }),
      )
    ).state;
    const studentView = await json(await f.api(base));
    assert.equal(studentView.results.length, 1);
    assert.equal(studentView.results[0].result.status, "fail");
    assert.ok(
      studentView.portfolios.every(
        (p: any) => p.value.student === course.students[1]!.id,
      ),
    );
    await json(
      await f.api("control/role", "POST", {
        expected: state.revision,
        student: null,
      }),
    );
  }
});

test("an interrupted or concurrently resumed preparation is idempotent and reset makes its staged records unreachable", async (t) => {
  const f = await fixture(t);
  let state = await f.start();
  let writes = 0;
  const flaky = {
    ...f.simulation,
    store: {
      ...f.simulation.store,
      async save(...args: Parameters<typeof f.simulation.store.save>) {
        if (args[0].kind !== "simulation-state" && ++writes === 2)
          throw new Error("Synthetic interrupted persistence");
        return f.simulation.store.save(...args);
      },
    },
  };
  assert.equal(
    (
      await f.api(
        "control/prepare",
        "POST",
        { expected: state.revision },
        flaky,
      )
    ).status,
    503,
  );
  assert.equal((await f.status()).state.value.preparing.cursor, 0);
  const attempts = await Promise.all([
    f.api("control/prepare", "POST", { expected: state.revision }),
    f.api("control/prepare", "POST", { expected: state.revision }),
  ]);
  assert.deepEqual(attempts.map((r) => r.status).sort(), [200, 409]);
  state = (await f.status()).state;
  const staged = simulationStores(f.simulation, teacher.id, {
    ...state.value,
    generation: state.value.preparing!.generation,
  });
  const course = (await staged.store.courses())[0]!;
  const history = await staged.store.history(course.key);
  assert.equal(new Set(history.map((r) => r.revision)).size, history.length);
  const abandoned = state.value.preparing!.generation;
  const fresh = await f.start("empty");
  assert.equal(
    (await f.api("control/prepare", "POST", { expected: state.revision }))
      .status,
    409,
  );
  assert.equal(
    (await f.api(`${abandoned}/courses/${course.courseId}`)).status,
    409,
  );
  assert.deepEqual(
    (await json(await f.api(`${fresh.value.generation}/courses`))).courses,
    [],
  );
  assert.deepEqual(await f.live.store.courses(), []);
});

test("the downloadable synthetic source unpacks, installs offline, validates and reproduces its documented demo", async (t) => {
  const f = await fixture(t),
    response = await f.api("control/source");
  assert.equal(response.status, 200);
  const archive = path.join(f.directory, "source.zip"),
    unpacked = path.join(f.directory, "unpacked");
  await writeFile(archive, new Uint8Array(await response.arrayBuffer()));
  execFileSync("rtk", ["proxy", "unzip", "-q", archive, "-d", unpacked]);
  const env = {
    ...process.env,
    npm_config_cache: path.join(f.directory, "npm-cache"),
  };
  delete env.NODE_TEST_CONTEXT;
  const run = (args: string[]) =>
    execFileSync("rtk", ["proxy", "npm", ...args], {
      cwd: unpacked,
      env,
      encoding: "utf8",
    });
  run(["ci", "--offline", "--ignore-scripts"]);
  assert.match(run(["test"]), /pass 2/);
  assert.match(
    run(["run", "demo"]),
    /"summary":\{"todo":0,"doing":1,"done":0\}/,
  );
  assert.ok(!(await readdir(unpacked)).includes("node_modules"));
});
