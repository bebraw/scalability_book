import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import {
  phases,
  projectCriteria,
  emptyPortfolio,
  recordKey,
  type Course,
  type Envelope,
  type RecordHistory,
  type Phase,
  type Portfolio,
  type Submission,
} from "../shared/course.ts";
import {
  simulationPresetVersion,
  type SimulationSelection,
  type SimulationState,
} from "../shared/course-simulation.ts";
import { createStoredZip } from "../shared/zip.ts";
import { handleCourses, type CourseUser } from "./courses.ts";
import { administrationRevisions } from "./course-administration.ts";
import { requireThat } from "./course-validation.ts";
import type { CourseStore, FileStore } from "./course-store.ts";
import {
  simulationInitialTime,
  simulationStores,
  type SimulationEnvironment,
} from "./course-simulation-store.ts";
import {
  simulationSource,
  simulationRoster,
  rehearsalAudit,
  rehearsalEvidence,
} from "./course-simulation-fixtures.ts";

type SeedOperation =
  | {
      type: "record";
      record: Envelope;
      expected: string | null;
      reason: string;
    }
  | { type: "file"; id: string; data: string };
interface SeedPlan {
  version: typeof simulationPresetVersion;
  generation: string;
  teacher: string;
  selection: SimulationSelection;
  now: string;
  operations: SeedOperation[];
}
const maxPlanBytes = 2 * 1024 * 1024;
const batchSize = 6;
const reason =
  "Authored synthetic rehearsal fixture; not an academic assessment";
const instant = (day: string) => `${day}T08:00:00.000Z`;
const bytesStream = (bytes: Uint8Array) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });

// Construct the scenario with the existing handlers before touching persistent
// records. Capture each accepted write, including its history and actor.
export async function buildSimulationPlan(
  selection: SimulationSelection,
  generation: string,
  teacher: CourseUser,
): Promise<SeedPlan> {
  const operations: SeedOperation[] = [],
    records = new Map<string, Envelope>(),
    histories: RecordHistory[] = [],
    uploads = new Map<string, Uint8Array>();
  const store: CourseStore = {
    async get<T>(key: string) {
      return (
        (structuredClone(records.get(key)) as Envelope<T> | undefined) ?? null
      );
    },
    async list<T>(course: string, kind?: string) {
      return structuredClone(
        [...records.values()].filter(
          (r) => r.courseId === course && (!kind || r.kind === kind),
        ),
      ) as Envelope<T>[];
    },
    async courses() {
      return structuredClone(
        [...records.values()].filter((r) => r.kind === "course"),
      );
    },
    async history(key, revision) {
      return structuredClone(
        histories.filter(
          (r) => r.key === key && (!revision || r.revision === revision),
        ),
      );
    },
    async save(record, expected, why, guard) {
      if (
        (records.get(record.key)?.revision ?? null) !== expected ||
        (guard && records.get(guard.key)?.revision !== guard.revision)
      )
        return false;
      records.set(record.key, structuredClone(record));
      histories.push({ ...structuredClone(record), reason: why });
      operations.push({
        type: "record",
        record: structuredClone(record),
        expected,
        reason: why,
      });
      return true;
    },
  };
  const files: FileStore = {
    async put(id, body, length) {
      const bytes = new Uint8Array(await new Response(body).arrayBuffer());
      requireThat(bytes.length === length, "Invalid rehearsal upload.", 503);
      uploads.set(id, bytes);
      operations.push({
        type: "file",
        id,
        data: Buffer.from(bytes).toString("base64"),
      });
    },
    async get(id) {
      const bytes = uploads.get(id);
      return bytes ? bytesStream(bytes) : null;
    },
    async delete(id) {
      uploads.delete(id);
    },
  };
  let now = simulationInitialTime,
    course: Envelope<Course>;
  const origin = "https://simulation.invalid";
  async function call<T>(
    path: string,
    method: string,
    body?: unknown,
    student?: string,
    binary?: Uint8Array,
  ) {
    const response = await handleCourses(
      new Request(`${origin}/api/courses${path}`, {
        method,
        headers: {
          Origin: origin,
          ...(binary
            ? { "Content-Length": String(binary.length) }
            : { "Content-Type": "application/json" }),
        },
        ...(binary
          ? { body: new Uint8Array(binary) }
          : body
            ? { body: JSON.stringify(body) }
            : {}),
      }),
      {
        store,
        files,
        now,
        admins: [teacher.login.toLowerCase()],
        user: student
          ? {
              id: student,
              login: "Synthetic student",
              provider: "email",
              courseId: course.value.id,
            }
          : teacher,
      },
    );
    const result = (await response.json()) as T & { message?: string };
    requireThat(
      response.ok,
      `Rehearsal fixture rejected: ${result.message ?? response.status}`,
      503,
    );
    const changed = result as unknown as Envelope<Course>;
    if (changed.kind === "course") course = changed;
    else if (course) course = (await store.get<Course>(course.key))!;
    return result;
  }
  const config = (action: string, body: unknown) =>
    call<Envelope<Course>>(`/${course.value.id}/${action}`, "PUT", body);
  async function importRoster(rows: ReturnType<typeof simulationRoster>) {
    await config("students", {
      format: "institutional",
      expected: administrationRevisions(course.value).students,
      students: rows,
      reason,
    });
  }
  async function formation(phase: Phase, publish = false) {
    const index = phases.indexOf(phase),
      deadline = new Date(
        Date.parse(simulationInitialTime) + (index * 21 + 7) * 86400000,
      ).toISOString(),
      correctionUntil = new Date(
        Date.parse(deadline) + 2 * 86400000,
      ).toISOString();
    await config(`formation/${phase}`, {
      expected: administrationRevisions(course.value).groups[phase],
      deadline,
      correctionUntil,
      publish,
      reason,
    });
  }
  async function groups(
    phase: Phase,
    members: string[][],
    extra?: { name?: string; proposal?: string }[],
  ) {
    await config(`groups/${phase}`, {
      expected: administrationRevisions(course.value).groups[phase],
      groups: members.map((ids, i) => ({
        id: course.value.phases[phase].groups[i]?.id ?? "",
        name: extra?.[i]?.name ?? `Synthetic team ${i + 1}`,
        members: ids,
        ...(extra?.[i]?.proposal ? { proposal: extra[i]!.proposal } : {}),
        exception:
          ids.length === 3
            ? ""
            : "Synthetic instructor-approved size exception for rehearsal",
      })),
      reason,
    });
  }
  async function audits(phase: Phase) {
    const schedule = course.value.phases[phase],
      gs = schedule.groups;
    await config(`schedule/${phase}`, {
      ...schedule,
      audits: gs.map((g, i) => ({
        from: g.id,
        to: gs[(i + 1) % gs.length]!.id,
      })),
      expected: administrationRevisions(course.value).schedule[phase],
      reason,
    });
  }
  const chunks = (ids: string[]) =>
    Array.from({ length: Math.ceil(ids.length / 3) }, (_, i) =>
      ids.slice(i * 3, i * 3 + 3),
    );
  course = await call<Envelope<Course>>("", "POST", {
    name: `Simulation · ${selection.id === "preparation" ? "Course preparation" : "Grading review"} · ${selection.size}`,
  });
  const roster = simulationRoster(selection.size);
  await importRoster(
    selection.id === "grading-review" ? roster.slice(0, -1) : roster,
  );
  for (const phase of phases) await formation(phase);
  let students = course.value.students.map((s) => s.id);

  if (selection.id === "preparation") {
    async function propose(ids: string[], name: string, confirm: boolean) {
      await call(
        `/${course.value.id}/group-proposal/establish`,
        "PUT",
        { expected: null, members: ids, name },
        ids[0],
      );
      let proposal = course.value.phases.establish.formation!.proposals.at(-1)!;
      if (confirm)
        for (const id of ids.slice(1)) {
          await call(
            `/${course.value.id}/group-confirmation/establish/${proposal.id}`,
            "PUT",
            { expected: proposal.revision, confirm: true },
            id,
          );
          proposal = course.value.phases.establish.formation!.proposals.find(
            (p) => p.id === proposal.id,
          )!;
        }
      return proposal;
    }
    const ready = await propose(students.slice(0, 3), "Confirmed trio", true);
    await propose(students.slice(3, 7), "Four-person request", true);
    await propose(students.slice(7, 9), "Invitation awaiting consent", false);
    for (const id of students.slice(9))
      await call(
        `/${course.value.id}/group-preference/establish`,
        "PUT",
        {
          expected: null,
          request: "assign",
          available: true,
          availability:
            "Synthetic constraint: available Tuesday afternoons or remote evenings.",
          support: "Please match a group that can alternate meeting times.",
        },
        id,
      );
    await groups(
      "establish",
      [ready.members],
      [{ name: ready.name, proposal: ready.id }],
    );
    return {
      version: simulationPresetVersion,
      generation,
      teacher: teacher.id,
      selection,
      now,
      operations,
    };
  }

  await groups("establish", chunks(students));
  await audits("establish");
  await formation("establish", true);
  const source = createStoredZip(
    Object.entries(simulationSource).map(([name, data]) => ({
      name,
      data: new TextEncoder().encode(data),
    })),
  );
  const commit = createHash("sha1").update(source).digest("hex");
  const portfolio = (
    phase: Phase,
    student: string,
    index: number,
  ): Portfolio => ({
    ...emptyPortfolio(phase, student),
    lectures: Array.from({ length: 3 }, (_, i) =>
      index === 1 && phase === "challenge" && i > 0
        ? {
            mode: "missing" as const,
            participation: "",
            idea: "",
            connection: "",
          }
        : {
            mode: i === 1 ? ("remote" as const) : ("live" as const),
            participation: `Synthetic activity ${i + 1}: reviewed the transition diagram ${i === 1 ? "remotely and wrote an equivalent worked example" : "in the discussion group"}.`,
            idea: "A summary count is a derived view; keeping it separate requires an explicit consistency rule.",
            connection:
              "Compared summary() with advance() and proposed one shared state definition to prevent drift.",
          },
    ),
    self: "I owned the summary review and checked the empty-state case. app.test.mjs records that result; no load or persistence claim follows from it.",
    peers:
      "A teammate explained transition ownership clearly. I asked them to document what happens after done, and reviewed the guard together.",
    reflection:
      "The cold-read audit exposed duplicated state names. We would centralize that list and repeat the same checks; the frozen archive retains the original design.",
    contribution:
      "I challenged the claim that passing small functional checks implied scalable operation and requested a separate comparable load experiment.",
  });
  async function submitPortfolio(
    phase: Phase,
    id: string,
    index: number,
    correction = false,
  ) {
    const old = await store.get(
      recordKey(course.value.id, "portfolio", phase, id),
    );
    const value = portfolio(phase, id, index);
    if (correction)
      value.reflection +=
        " Correction: the proposed state-list extraction is future work, not a merged change.";
    return call<Envelope<Portfolio>>(
      `/${course.value.id}/portfolio/${phase}/${id}`,
      "PUT",
      { expected: old?.revision ?? null, stage: "submit", value },
      id,
    );
  }
  async function freeze(phase: Phase) {
    for (const group of course.value.phases[phase].groups) {
      const file = await call<Envelope<{ id: string }>>(
        `/${course.value.id}/files/${phase}/${group.id}?scope=technical&name=synthetic-tracker.zip`,
        "POST",
        undefined,
        group.members[0],
        source,
      );
      await call(
        `/${course.value.id}/submission/${phase}/${group.id}`,
        "PUT",
        {
          expected: null,
          stage: "freeze",
          value: {
            repository: "",
            commit,
            archive: file.value.id,
            setup: simulationSource["README.md"],
            evidence: rehearsalEvidence,
            checklist: [
              {
                id: "harness",
                status: "located",
                location: "README.md; package.json; package-lock.json",
              },
              {
                id: "baseline",
                status: "missing",
                location:
                  "No performance measurement collected in this rehearsal source",
              },
            ],
          },
        },
        group.members[0],
      );
      await call(
        `/${course.value.id}/working-agreement/${phase}/${group.id}`,
        "PUT",
        {
          expected: null,
          text: "Synthetic agreement: rotate driver and reviewer each meeting; review reproducibility before freezing; ask the instructor about blocked audit access.",
        },
        group.members[0],
      );
    }
  }
  async function audit(phase: Phase) {
    for (const assignment of course.value.phases[phase].audits) {
      const group = course.value.phases[phase].groups.find(
        (g) => g.id === assignment.from,
      )!;
      await call(
        `/${course.value.id}/audit/${phase}/${group.id}`,
        "PUT",
        { expected: null, report: rehearsalAudit },
        group.members[0],
      );
    }
  }
  async function final(phase: Phase) {
    for (const group of course.value.phases[phase].groups) {
      const submission = await store.get<Submission>(
        recordKey(course.value.id, "submission", phase, group.id),
      );
      if (!submission) continue; // The late arrival has explicit missing A work.
      const attachment = new TextEncoder().encode(rehearsalAudit);
      const file = await call<Envelope<{ id: string }>>(
        `/${course.value.id}/files/${phase}/${group.id}?scope=technical&purpose=evidence&name=audit-response.txt`,
        "POST",
        undefined,
        group.members[0],
        attachment,
      );
      const references =
        phase === "compare"
          ? (await store.list<Submission>(course.value.id, "submission"))
              .filter(
                (r) =>
                  r.value.members.includes(group.members[0]!) &&
                  r.value.phase !== "compare",
              )
              .map((r) => ({
                phase: r.value.phase,
                group: r.value.group,
                frozenRevision: r.value.frozenRevision,
              }))
          : [];
      await call(
        `/${course.value.id}/submission/${phase}/${group.id}`,
        "PUT",
        {
          expected: submission.revision,
          stage: "evidence",
          value: {
            response: rehearsalEvidence,
            finalEvidence: {
              index: rehearsalEvidence,
              files: [file.value.id],
              references,
              checklist: submission.value.checklist,
            },
          },
        },
        group.members[0],
      );
    }
  }
  async function assess(phase: Phase) {
    for (const group of course.value.phases[phase].groups) {
      const missing = !(await store.get(
        recordKey(course.value.id, "submission", phase, group.id),
      ));
      await call(
        `/${course.value.id}/project-grade/${phase}/${group.id}`,
        "PUT",
        {
          expected: null,
          missing,
          scores: projectCriteria(phase).map((c) => (missing ? 0 : c[1])),
          feedback: missing
            ? "No frozen implementation was supplied. Explicit synthetic missing-work score."
            : "Authored simulation score: all rubric criteria satisfied in the imagined project. The tiny rehearsal archive does not substantiate this score; use it to explore grading gates and release.",
          reason,
        },
      );
    }
    for (const [index, id] of course.value.students
      .map((s) => s.id)
      .entries()) {
      const missing = !(await store.get(
        recordKey(course.value.id, "portfolio", phase, id),
      ));
      const scores = missing
        ? Array(13).fill(0)
        : [1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 3, 3];
      if (!missing && phase === "challenge" && index === 1)
        scores.splice(3, 6, 0, 0, 0, 0, 0, 0);
      await call(`/${course.value.id}/individual-grade/${phase}/${id}`, "PUT", {
        expected: null,
        missing,
        scores,
        feedback: missing
          ? "Portfolio missing: explicit zero scores. The project total cannot waive individual requirements."
          : index === 1 && phase === "challenge"
            ? "Only one lecture activity has complete evidence. The phase requires two even with full project scores."
            : "Synthetic criterion scores match the authored participation, reflection, peer-review and contribution evidence.",
        reason,
      });
    }
  }
  now = instant("2026-10-25");
  await freeze("establish");
  now = instant("2026-10-27");
  await audit("establish");
  await importRoster(roster.slice(-1));
  students = course.value.students.map((s) => s.id);
  await groups("establish", [
    ...course.value.phases.establish.groups.map((g) => g.members),
    students.slice(-1),
  ]);
  const laterGroups = chunks(students.slice(0, -4));
  laterGroups.push(students.slice(-4));
  for (const phase of ["challenge", "compare"] as const) {
    await groups(phase, laterGroups);
    await audits(phase);
    await formation(phase, true);
  }
  now = instant("2026-10-30");
  await final("establish");
  for (const [index, id] of students.slice(0, -1).entries())
    await submitPortfolio("establish", id, index);
  await assess("establish");
  await call(`/${course.value.id}/publish/establish`, "POST", {
    expected: course.revision,
    published: true,
    reason,
  });
  for (const phase of ["challenge", "compare"] as const) {
    now = instant(phase === "challenge" ? "2026-11-15" : "2026-12-06");
    await freeze(phase);
    now = instant(phase === "challenge" ? "2026-11-17" : "2026-12-08");
    await audit(phase);
    now = instant(phase === "challenge" ? "2026-11-20" : "2026-12-11");
    await final(phase);
    for (const [index, id] of students.entries())
      if (!(phase === "compare" && index === 2))
        await submitPortfolio(phase, id, index);
    await assess(phase);
    if (phase === "challenge")
      await call(`/${course.value.id}/publish/${phase}`, "POST", {
        expected: course.revision,
        published: true,
        reason,
      });
  }
  // Resubmitting a correction retains the old score but makes its revision stale.
  await submitPortfolio("compare", students[4]!, 4, true);
  // A departure after evidence and assessment retains those records, creates a
  // teacher review task and suppresses a final grade through the real handler.
  now = instant("2026-12-12");
  await config("enrollment", {
    expected: administrationRevisions(course.value).students,
    student: students[5],
    action: "withdraw",
    reason:
      "PRIVATE rehearsal departure after submitted work; review remaining members and audit arrangements",
  });
  now = instant("2026-12-13");
  return {
    version: simulationPresetVersion,
    generation,
    teacher: teacher.id,
    selection,
    now,
    operations,
  };
}

export async function prepareSimulation(
  environment: SimulationEnvironment,
  teacher: CourseUser,
  state: SimulationState,
  selection: SimulationSelection,
) {
  const generation = crypto.randomUUID(),
    plan = await buildSimulationPlan(selection, generation, teacher);
  const id = crypto.randomUUID(),
    bytes = new TextEncoder().encode(JSON.stringify(plan));
  requireThat(
    bytes.length <= maxPlanBytes,
    "Rehearsal plan exceeds its storage limit.",
    503,
  );
  const stores = simulationStores(environment, teacher.id, {
    ...state,
    generation,
  });
  await stores.files.put(id, bytesStream(bytes), bytes.length);
  return {
    selection,
    generation,
    plan: id,
    cursor: 0,
    total: plan.operations.length,
    now: plan.now,
  };
}

export async function advanceSimulationPreparation(
  environment: SimulationEnvironment,
  teacher: CourseUser,
  current: Envelope<SimulationState>,
): Promise<SimulationState> {
  const job = current.value.preparing;
  requireThat(
    job && job.selection.version === simulationPresetVersion,
    "Restart this rehearsal to use the current fixture edition.",
    409,
  );
  // The control revision guards every persistent record write. Concurrent or
  // retried chunks can replay identical writes, but cannot change another job.
  const guarded = {
    ...environment,
    store: {
      ...environment.store,
      save: (record: Envelope, expected: string | null, why: string) =>
        environment.store.save(record, expected, why, {
          key: current.key,
          revision: current.revision,
        }),
    },
  };
  const stores = simulationStores(guarded, teacher.id, {
    ...current.value,
    generation: job.generation,
  });
  const body = await stores.files.get(job.plan);
  requireThat(
    body,
    "Rehearsal plan is unavailable. Reset to start again.",
    503,
  );
  const reader = body.getReader(),
    parts: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      requireThat(length <= maxPlanBytes, "Invalid rehearsal plan size.", 503);
      parts.push(value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  const plan = JSON.parse(Buffer.concat(parts).toString("utf8")) as SeedPlan;
  requireThat(
    plan.version === simulationPresetVersion &&
      plan.generation === job.generation &&
      plan.teacher === teacher.id &&
      JSON.stringify(plan.selection) === JSON.stringify(job.selection) &&
      plan.now === job.now &&
      plan.operations.length === job.total &&
      Number.isInteger(job.cursor) &&
      job.cursor >= 0 &&
      job.cursor <= job.total,
    "Rehearsal plan identity is invalid.",
    503,
  );
  const end = Math.min(job.cursor + batchSize, job.total);
  for (const operation of plan.operations.slice(job.cursor, end)) {
    if (operation.type === "file") {
      const bytes = new Uint8Array(Buffer.from(operation.data, "base64"));
      await stores.files.put(operation.id, bytesStream(bytes), bytes.length);
    } else {
      if (
        (
          await stores.store.history(
            operation.record.key,
            operation.record.revision,
          )
        ).length
      )
        continue;
      let saved = false;
      try {
        saved = await stores.store.save(
          operation.record,
          operation.expected,
          operation.reason,
        );
      } catch (error) {
        // A concurrent replay can reach the same history primary key before
        // this batch executes. Verify that exact accepted write before retrying.
        if (
          !(
            await stores.store.history(
              operation.record.key,
              operation.record.revision,
            )
          ).length
        )
          throw error;
      }
      requireThat(
        saved ||
          (
            await stores.store.history(
              operation.record.key,
              operation.record.revision,
            )
          ).length,
        "Rehearsal preparation changed. Refresh to continue.",
        409,
      );
    }
  }
  if (end === job.total) {
    const { preparing: _, ...state } = current.value;
    return {
      ...state,
      generation: job.generation,
      now: job.now,
      role: null,
      preset: job.selection,
    };
  }
  return { ...current.value, preparing: { ...job, cursor: end } };
}
