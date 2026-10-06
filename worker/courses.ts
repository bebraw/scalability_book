import { createHash } from "node:crypto";
import {
  phases,
  rubricVersion,
  projectCriteria,
  calculateResult,
  csvCell,
  recordKey,
  type Phase,
  type Course,
  type Envelope,
  type Submission,
  type Portfolio,
  type Audit,
  type Grade,
  type CourseFile,
  type Adjustment,
} from "../shared/course.ts";
import {
  Problem,
  requireThat,
  obj,
  text,
  integer,
  array,
  studentId,
  scores,
  unique,
} from "./course-validation.ts";
import {
  administrationRevisions,
  updateAdministration,
  updateLegacySetup,
  rosterPreview,
} from "./course-administration.ts";
import {
  administrationSections,
  type AdministrationSection,
} from "../shared/course-administration.ts";
import { boundedJson, sameOrigin } from "./course-http.ts";
import type { CourseAuthStore } from "./course-auth-store.ts";
import type { CourseStore, FileStore } from "./course-store.ts";
import {
  studentFormation,
  type WorkingAgreement,
} from "../shared/course-formation.ts";
import { configureFormation, updateFormation } from "./course-formation.ts";
import { updateEnrollment } from "./course-enrollment.ts";
import {
  studentEnrollment,
  activeStudent,
  activeStudents,
  activeGroups,
} from "../shared/course-enrollment.ts";
import {
  requirementVersion,
  requirementsFor,
} from "../shared/course-requirements.ts";
import {
  soloGroup,
  soloStudent,
  soloGradeCurrent,
  type SoloReview,
} from "../shared/course-solo.ts";
import { parseSoloReview, soloReviewReady } from "./course-solo.ts";
import { parseChecklist, parseFinalEvidence } from "./course-submission.ts";
import { handleCourseInquiry } from "./course-inquiry.ts";
export interface CourseUser {
  id: string;
  login: string;
  provider?: "github" | "email";
  courseId?: string;
}
export interface CourseContext {
  user: CourseUser | null;
  store?: CourseStore;
  files?: FileStore;
  admins: string[];
  now?: string;
  auth?: CourseAuthStore;
  exportEnvironment?: "simulation";
}
export const maxCourseFileBytes = 20 * 1024 * 1024;
const privateHeaders = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
};
const reply = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: privateHeaders });
export function staffAllowed(
  course: Course,
  user: CourseUser,
  admins: string[],
) {
  return (
    user.provider !== "email" &&
    (course.staff.includes(user.id) ||
      admins.includes(user.login.toLowerCase()))
  );
}
function team(course: Course, phase: Phase, group: string) {
  const result = course.phases[phase].groups.find((g) => g.id === group);
  requireThat(result, "Unknown group.", 404);
  return result;
}
function inTeam(course: Course, phase: Phase, group: string, user: CourseUser) {
  return (
    (!course.phases[phase].formation ||
      Boolean(course.phases[phase].formation?.publishedAt)) &&
    team(course, phase, group).members.includes(user.id)
  );
}
function parseAdjustment(value: unknown, course: Course): Adjustment {
  const a = obj(value);
  requireThat(phases.includes(a.phase as Phase), "Unknown phase.");
  const student = studentId(a.student);
  requireThat(
    course.students.some((s) => s.id === student),
    "Unknown student.",
  );
  const adjustment: Adjustment = {
    student,
    phase: a.phase as Phase,
    lectureMinimum: integer(a.lectureMinimum, 0, 3),
    assessmentMinimum: integer(a.assessmentMinimum, 0, 12),
    contributionMinimum: integer(a.contributionMinimum, 0, 3),
    availablePoints: integer(a.availablePoints, 1, 21),
    reason: text(
      a.reason,
      "Approved arrangement and replacement activity",
      2000,
      true,
    ),
  };
  requireThat(
    adjustment.availablePoints >=
      3 * adjustment.lectureMinimum +
        Math.max(adjustment.assessmentMinimum, adjustment.contributionMinimum),
    "The approved available points must make the adjusted passing requirements achievable.",
  );
  return adjustment;
}
function visibleRecords(
  course: Course,
  records: Envelope[],
  user: CourseUser,
  staff: boolean,
  now: string,
) {
  const subs = records.filter(
    (r) => r.kind === "submission",
  ) as Envelope<Submission>[];
  const ownGroups = new Set(
    subs
      .filter((r) => r.value.frozenAt && r.value.members.includes(user.id))
      .map((r) => `${r.value.phase}:${r.value.group}`),
  );
  for (const phase of phases)
    for (const group of course.phases[phase].groups)
      if (inTeam(course, phase, group.id, user))
        ownGroups.add(`${phase}:${group.id}`);
  const canRead = (s: Submission) =>
    staff ||
    ownGroups.has(`${s.phase}:${s.group}`) ||
    Boolean(
      s.frozenAt &&
      (now >= course.phases[s.phase].auditAt ||
        (now >= course.phases[s.phase].freezeAt &&
          course.phases[s.phase].audits.some(
            (a) => a.to === s.group && ownGroups.has(`${s.phase}:${a.from}`),
          ))),
    );
  const visibleSubs = subs
    .filter((r) => canRead(r.value))
    .map((r) => {
      if (
        staff ||
        ownGroups.has(`${r.value.phase}:${r.value.group}`) ||
        r.value.submittedAt
      )
        return r;
      const value = { ...r.value, response: "" };
      delete value.finalEvidence;
      return { ...r, value };
    });
  const portfolios = records.filter(
    (r) =>
      r.kind === "portfolio" &&
      (staff || (r.value as Portfolio).student === user.id),
  ) as Envelope<Portfolio>[];
  const audits = records.filter((r) => {
    if (r.kind !== "audit") return false;
    const a = r.value as Audit;
    return (
      staff ||
      ownGroups.has(`${a.phase}:${a.from}`) ||
      ownGroups.has(`${a.phase}:${a.to}`) ||
      now >= course.phases[a.phase].auditAt
    );
  }) as Envelope<Audit>[];
  const projects = records.filter(
    (r) =>
      r.kind === "project-grade" &&
      (staff ||
        (course.phases[(r.value as Grade).phase].published &&
          ownGroups.has(
            `${(r.value as Grade).phase}:${(r.value as Grade).subject}`,
          ))),
  ) as Envelope<Grade>[];
  const individuals = records.filter(
    (r) =>
      r.kind === "individual-grade" &&
      (staff ||
        (course.phases[(r.value as Grade).phase].published &&
          (r.value as Grade).subject === user.id)),
  ) as Envelope<Grade>[];
  const attached = new Set([
    ...visibleSubs.map((r) => r.value.archive),
    ...visibleSubs.flatMap((r) => r.value.finalEvidence?.files ?? []),
    ...portfolios.flatMap((r) => r.value.files),
  ]);
  const files = records.filter(
    (r) =>
      r.kind === "file" &&
      (staff ||
        attached.has((r.value as CourseFile).id) ||
        ((r.value as CourseFile).scope === "private"
          ? (r.value as CourseFile).owner === user.id
          : ownGroups.has(
              `${(r.value as CourseFile).phase}:${(r.value as CourseFile).owner}`,
            ))),
  ) as Envelope<CourseFile>[];
  return {
    submissions: visibleSubs,
    portfolios,
    soloReviews: records
      .filter(
        (r) =>
          r.kind === "solo-review" &&
          (staff ||
            ownGroups.has(
              `${(r.value as SoloReview).phase}:${(r.value as SoloReview).group}`,
            ) ||
            (now >= course.phases[(r.value as SoloReview).phase].auditAt &&
              Boolean((r.value as SoloReview).report))),
      )
      .map((r) => {
        const review = r as Envelope<SoloReview>;
        const own = ownGroups.has(
          `${review.value.phase}:${review.value.group}`,
        );
        return staff ||
          (own && now >= course.phases[review.value.phase].freezeAt)
          ? review
          : {
              ...review,
              value: {
                ...review.value,
                ...(!own ? { checkIn: "" } : {}),
                reference: { repository: "", commit: "", setup: "", probe: "" },
              },
            };
      }),
    audits,
    projects,
    individuals,
    files,
  };
}
export async function handleCourses(
  request: Request,
  context: CourseContext,
): Promise<Response> {
  const { user, store, files, admins } = context;
  if (!user) return reply({ message: "Sign in to open your course." }, 401);
  if (!store)
    return reply({ message: "Course storage is not configured yet." }, 503);
  const now = context.now ?? new Date().toISOString();
  const url = new URL(request.url);
  const bootstrap =
    user.provider !== "email" && admins.includes(user.login.toLowerCase());
  try {
    const parts = url.pathname
      .replace(/^\/api\/courses\/?/, "")
      .split("/")
      .filter(Boolean)
      .map((part) => {
        try {
          return decodeURIComponent(part);
        } catch {
          throw new Problem("Invalid URL.");
        }
      });
    const [id, action, phaseText, subject] = parts;
    requireThat(parts.length <= 4, "Unknown course route.", 404);
    if (request.method !== "GET") sameOrigin(request);
    if (!id) {
      if (request.method === "GET") {
        const all = (await store.courses()) as Envelope<Course>[];
        return reply({
          canCreate: bootstrap,
          user,
          courses: all
            .filter(
              (r) =>
                (user.provider !== "email" || user.courseId === r.value.id) &&
                (staffAllowed(r.value, user, admins) ||
                  r.value.students.some((s) => s.id === user.id)),
            )
            .map((r) => ({
              id: r.value.id,
              name: r.value.name,
              staff: staffAllowed(r.value, user, admins),
            })),
        });
      }
      requireThat(request.method === "POST", "Method not allowed.", 405);
      requireThat(
        bootstrap,
        "Only course administrators can create course runs.",
        403,
      );
      const body = await boundedJson(request);
      const courseId = crypto.randomUUID();
      const scheduleFor = (i: number): Course["phases"][Phase] => {
        const start = Date.parse(now) + (i + 1) * 21 * 86400000;
        return {
          freezeAt: new Date(start).toISOString(),
          auditAt: new Date(start + 3 * 86400000).toISOString(),
          evidenceAt: new Date(start + 5 * 86400000).toISOString(),
          groups: [],
          audits: [],
          published: false,
        };
      };
      const course: Course = {
        requirements: requirementVersion,
        id: courseId,
        name: text(body.name, "Course name", 120, true),
        rubric: rubricVersion,
        staff: [user.id],
        students: [],
        adjustments: [],
        phases: {
          establish: scheduleFor(0),
          challenge: scheduleFor(1),
          compare: scheduleFor(2),
        },
      };
      const record: Envelope<Course> = {
        key: recordKey(courseId, "course"),
        courseId,
        kind: "course",
        value: course,
        revision: crypto.randomUUID(),
        updatedAt: now,
        actor: user.id,
      };
      requireThat(
        await store.save(record, null, "Course created"),
        "Course already exists.",
        409,
      );
      return reply(record, 201);
    }
    requireThat(
      user.provider !== "email" || user.courseId === id,
      "You are not enrolled in this course.",
      403,
    );
    const config = await store.get<Course>(recordKey(id, "course"));
    requireThat(config, "Course not found.", 404);
    const course = config.value;
    const staff = staffAllowed(course, user, admins);
    requireThat(
      staff || course.students.some((s) => s.id === user.id),
      "You are not enrolled in this course.",
      403,
    );
    if (action === "inquiry")
      return handleCourseInquiry(
        request,
        { config, store, user, staff, now },
        phaseText,
        subject,
      );
    if (!staff && request.method !== "GET")
      requireThat(
        course.students.some((s) => s.id === user.id && activeStudent(s)),
        "Your enrollment is withdrawn. Saved work remains available to view; contact staff to correct your enrollment.",
        403,
      );
    const records = await store.list(id, undefined, { excludeInquiry: true });
    const values = <T>(kind: string) =>
      records.filter((r) => r.kind === kind).map((r) => r.value as T);
    // A changed evidence record needs another assessment. Retain the old score for
    // history and feedback, but do not use it as a current passing result.
    const currentGrades = (kind: string, evidenceKind: string) =>
      values<Grade>(kind).filter((g) => {
        const evidence = records.find(
          (r) => r.key === recordKey(id, evidenceKind, g.phase, g.subject),
        );
        return (
          g.evidenceRevision === (evidence?.revision ?? null) &&
          soloGradeCurrent(
            course,
            g,
            kind === "project-grade",
            records.filter(
              (r) => r.kind === "solo-review",
            ) as Envelope<SoloReview>[],
            records.filter((r) => r.kind === "audit") as Envelope<Audit>[],
          )
        );
      });
    async function save<T>(
      kind: string,
      phase: string,
      who: string,
      value: T,
      expected: unknown,
      reason: string,
    ) {
      requireThat(
        expected === null || typeof expected === "string",
        "Supply the saved revision or null.",
      );
      const record: Envelope<T> = {
        key: recordKey(id!, kind, phase, who),
        courseId: id!,
        kind,
        value,
        revision: crypto.randomUUID(),
        updatedAt: now,
        actor: user!.id,
      };
      if (kind === "submission") {
        const submission = record.value as Submission;
        if (submission.frozenAt && !submission.frozenRevision)
          submission.frozenRevision = record.revision;
      }
      requireThat(
        JSON.stringify(value).length <=
          (kind === "course"
            ? 900_000
            : kind === "submission"
              ? 64_000
              : 30_000),
        "Record is too large.",
        413,
      );
      requireThat(
        await store!.save(
          record,
          expected as string | null,
          reason,
          kind === "course"
            ? undefined
            : { key: config!.key, revision: config!.revision },
        ),
        "This record or course setup changed. Reload before saving; your text has not been saved.",
        409,
      );
      return record;
    }
    if (!action) {
      requireThat(request.method === "GET", "Method not allowed.", 405);
      const visible = visibleRecords(course, records, user, staff, now);
      const students = staff
        ? course.students
        : course.students.map((s) => ({
            ...studentEnrollment(s, user.id),
            number: s.id === user.id ? s.number : "",
            ...(s.email ? { email: s.id === user.id ? s.email : "" } : {}),
          }));
      const displayedCourse = staff
        ? course
        : {
            ...course,
            staff: [],
            students,
            adjustments: course.adjustments.filter(
              (a) => a.student === user.id,
            ),
            phases: Object.fromEntries(
              phases.map((phase) => [
                phase,
                {
                  ...course.phases[phase],
                  groups:
                    course.phases[phase].formation &&
                    !course.phases[phase].formation!.publishedAt
                      ? []
                      : course.phases[phase].groups.map((g) => ({
                          ...g,
                          ...(g.exception
                            ? {
                                exception:
                                  "Instructor-approved group size exception.",
                              }
                            : {}),
                        })),
                  ...(course.phases[phase].formation
                    ? {
                        formation: studentFormation(
                          course.phases[phase].formation!,
                          user.id,
                          activeStudents(course).map((s) => s.id),
                        ),
                      }
                    : {}),
                },
              ]),
            ) as Course["phases"],
          };
      const results = (
        staff ? students : students.filter((s) => s.id === user.id)
      ).map((s) => ({
        student: s,
        result: calculateResult(
          course,
          s.id,
          values("submission"),
          values("portfolio"),
          currentGrades("project-grade", "submission"),
          currentGrades("individual-grade", "portfolio"),
          staff,
        ),
      }));
      return reply({
        config: { ...config, value: displayedCourse },
        staff,
        user,
        now,
        ...(staff
          ? {
              administration: administrationRevisions(course),
              access: context.auth ? await context.auth.activity(id) : [],
            }
          : {}),
        ...visible,
        agreements: records.filter((r) => {
          if (r.kind !== "working-agreement") return false;
          if (staff) return true;
          const agreement = r.value as WorkingAgreement,
            schedule = course.phases[agreement.phase];
          return (
            (!schedule.formation || Boolean(schedule.formation.publishedAt)) &&
            schedule.groups.some(
              (g) => g.id === agreement.group && g.members.includes(user.id),
            )
          );
        }),
        results,
      });
    }
    if (action === "history") {
      requireThat(
        staff && request.method === "GET",
        "Staff access required.",
        403,
      );
      const key = url.searchParams.get("key");
      requireThat(key && key.startsWith(id + ":"), "Invalid record key.");
      const version = url.searchParams.get("revision");
      requireThat(
        !version || /^[a-f0-9-]{36}$/.test(version),
        "Invalid revision.",
      );
      return reply({ history: await store.history(key, version ?? undefined) });
    }
    if (action === "export") {
      requireThat(
        staff && request.method === "GET",
        "Staff access required.",
        403,
      );
      const lines = [
        [
          ...(context.exportEnvironment ? ["environment"] : []),
          "student_number",
          "name",
          "identity_id",
          "earned",
          "available",
          "percent",
          "grade",
          "status",
          "pending",
          "unmet_requirements",
        ]
          .map(csvCell)
          .join(","),
      ];
      for (const student of course.students) {
        // Export only released assessments; unpublished instructor drafts are never final grades.
        const r = calculateResult(
          course,
          student.id,
          values("submission"),
          values("portfolio"),
          currentGrades("project-grade", "submission"),
          currentGrades("individual-grade", "portfolio"),
        );
        lines.push(
          [
            ...(context.exportEnvironment ? ["Simulation"] : []),
            student.number,
            student.name,
            student.id,
            r.status === "withdrawn" ? "" : r.earned,
            r.status === "withdrawn" ? "" : r.available,
            r.status === "withdrawn" ? "" : r.percentage.toFixed(2),
            r.grade ?? "",
            r.status,
            r.pending.join("; "),
            r.unmet.join("; "),
          ]
            .map(csvCell)
            .join(","),
        );
      }
      return new Response(lines.join("\r\n") + "\r\n", {
        headers: {
          ...privateHeaders,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="course-grades.csv"',
        },
      });
    }
    if (administrationSections.includes(action as AdministrationSection)) {
      requireThat(
        staff &&
          (request.method === "PUT" ||
            (action === "students" && request.method === "POST")),
        "Staff access required.",
        403,
      );
      requireThat(!subject, "Unknown administration route.", 404);
      const body = await boundedJson(request);
      const next = updateAdministration(
        course,
        records,
        action as AdministrationSection,
        phaseText,
        body,
        user.id,
        now,
      );
      if (request.method === "POST") return reply(rosterPreview(course, next));
      return reply(
        await save(
          "course",
          "",
          "",
          next,
          config.revision,
          text(body.reason, "Change reason", 2000, true),
        ),
      );
    }
    if (action === "setup") {
      requireThat(
        staff && request.method === "PUT",
        "Staff access required.",
        403,
      );
      const body = await boundedJson(request);
      const next = updateLegacySetup(course, records, body, user.id, now);
      return reply(
        await save(
          "course",
          "",
          "",
          next,
          body.expected,
          text(body.reason, "Change reason", 2000, true),
        ),
      );
    }
    if (action === "enrollment") {
      requireThat(
        staff && request.method === "PUT",
        "Staff access required.",
        403,
      );
      requireThat(!phaseText && !subject, "Unknown enrollment route.", 404);
      const body = await boundedJson(request);
      requireThat(
        body.expected === administrationRevisions(course).students,
        "The roster or enrollment arrangement changed. Reload before saving; your text has not been saved.",
        409,
      );
      const next = updateEnrollment(course, body, now);
      return reply(
        await save(
          "course",
          "",
          "",
          next,
          config.revision,
          text(body.reason, "Enrollment arrangement reason", 2000, true),
        ),
      );
    }
    if (action === "adjustment") {
      requireThat(
        staff && request.method === "PUT",
        "Staff access required.",
        403,
      );
      const body = await boundedJson(request);
      const adjustment = parseAdjustment(body.adjustment, course);
      requireThat(
        course.students.some(
          (s) => s.id === adjustment.student && activeStudent(s),
        ),
        "Withdrawn students receive no assessment or final grade. Reinstate enrollment before recording an arrangement.",
        409,
      );
      const next = structuredClone(course);
      next.adjustments = next.adjustments.filter(
        (a) =>
          !(a.student === adjustment.student && a.phase === adjustment.phase),
      );
      next.adjustments.push(adjustment);
      const grade = values<Grade>("individual-grade").find(
        (g) => g.phase === adjustment.phase && g.subject === adjustment.student,
      );
      requireThat(
        !grade ||
          grade.scores.reduce((a, b) => a + b, 0) <= adjustment.availablePoints,
        "Available points cannot be lower than earned individual points.",
      );
      return reply(
        await save("course", "", "", next, body.expected, adjustment.reason),
      );
    }
    requireThat(phases.includes(phaseText as Phase), "Unknown phase.", 404);
    const phase = phaseText as Phase;
    const schedule = course.phases[phase];
    if (
      [
        "formation",
        "group-preference",
        "group-proposal",
        "group-confirmation",
      ].includes(action)
    ) {
      requireThat(request.method === "PUT", "Method not allowed.", 405);
      const body = await boundedJson(request);
      if (action === "formation" && !schedule.formation)
        requireThat(
          !schedule.published &&
            now < schedule.freezeAt &&
            !values<Submission>("submission").some(
              (s) => s.phase === phase && s.frozenAt,
            ),
          "Open formation before work freezes. Existing frozen membership must be retained.",
          409,
        );
      const next =
        action === "formation"
          ? (requireThat(staff && !subject, "Staff access required.", 403),
            configureFormation(course, phase, body, now))
          : updateFormation(course, phase, action, subject, body, user.id, now);
      const saved = await save(
        "course",
        "",
        "",
        next,
        config.revision,
        action === "formation"
          ? text(body.reason, "Formation change reason", 2000, true)
          : "Student group formation response",
      );
      return reply(action === "formation" ? saved : { ok: true });
    }
    if (action === "working-agreement") {
      requireThat(
        subject &&
          request.method === "PUT" &&
          (staff || inTeam(course, phase, subject, user)),
        "Group member or staff access required.",
        403,
      );
      team(course, phase, subject);
      const body = await boundedJson(request);
      const value: WorkingAgreement = {
        phase,
        group: subject,
        text: text(body.text, "Working agreement", 2000, true),
      };
      return reply(
        await save(
          "working-agreement",
          phase,
          subject,
          value,
          body.expected,
          "Group working agreement updated",
        ),
      );
    }
    if (action === "publish") {
      requireThat(
        staff && request.method === "POST",
        "Staff access required.",
        403,
      );
      const body = await boundedJson(request);
      const next = structuredClone(course);
      if (body.published === true) {
        requireThat(
          activeStudents(course).length > 0,
          "Add an active roster first.",
        );
        requireThat(
          activeStudents(course).every((s) =>
            schedule.groups.some((g) => g.members.includes(s.id)),
          ),
          "Every student needs a group for this phase.",
        );
        requireThat(
          activeGroups(course, phase).every((g) =>
            currentGrades("project-grade", "submission").some(
              (x) => x.phase === phase && x.subject === g.id,
            ),
          ) &&
            activeStudents(course).every((s) =>
              currentGrades("individual-grade", "portfolio").some(
                (x) => x.phase === phase && x.subject === s.id,
              ),
            ),
          "Assess every group and student against the current evidence, including explicit missing-work scores, before releasing the phase.",
        );
      }
      requireThat(
        typeof body.published === "boolean",
        "Specify whether results are released.",
      );
      next.phases[phase].published = body.published;
      return reply(
        await save(
          "course",
          "",
          "",
          next,
          body.expected,
          text(body.reason, "Release reason", 2000, true),
        ),
      );
    }
    requireThat(subject, "Missing group or student identifier.", 404);
    if (action === "submission" && request.method === "GET") {
      const visible = visibleRecords(course, records, user, staff, now);
      const submission = visible.submissions.find(
        (r) =>
          r.value.phase === phase &&
          r.value.group === subject &&
          r.value.frozenAt,
      );
      requireThat(
        submission,
        "Frozen submission not found or access has not opened.",
        404,
      );
      const pinned = url.searchParams.get("frozenRevision");
      requireThat(
        !pinned || pinned === submission.value.frozenRevision,
        "The referenced frozen revision does not match.",
        409,
      );
      return reply(submission);
    }
    if (action === "files") {
      requireThat(files, "File storage is not configured yet.", 503);
      if (request.method === "GET") {
        const visible = visibleRecords(course, records, user, staff, now);
        const file = visible.files.find(
          (r) => r.value.id === subject && r.value.phase === phase,
        );
        requireThat(file, "File not found or access has not opened.", 404);
        const body = await files.get(subject);
        requireThat(body, "File is unavailable. Contact course staff.", 404);
        const safeName = file.value.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        return new Response(body, {
          headers: {
            ...privateHeaders,
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="${safeName}"`,
            "Content-Security-Policy": "sandbox",
            "Content-Length": String(file.value.bytes),
          },
        });
      }
      requireThat(request.method === "POST", "Method not allowed.", 405);
      const scope = url.searchParams.get("scope");
      const purpose = url.searchParams.get("purpose") ?? "source";
      requireThat(
        purpose === "source" || purpose === "evidence",
        "Choose a source archive or technical evidence attachment.",
      );
      const lateUpload =
        purpose === "evidence"
          ? now > schedule.evidenceAt
          : now >= schedule.freezeAt;
      requireThat(
        scope === "technical" || scope === "private",
        "Specify file visibility.",
      );
      if (scope === "technical") {
        team(course, phase, subject);
        requireThat(
          staff || inTeam(course, phase, subject, user),
          "Group access required.",
          403,
        );
        const existing = values<Submission>("submission").find(
          (s) => s.phase === phase && s.group === subject,
        );
        if (purpose === "evidence") {
          requireThat(
            existing?.frozenAt,
            "Freeze the implementation before attaching final technical evidence.",
            409,
          );
          requireThat(
            now <= schedule.evidenceAt || staff,
            "The evidence deadline has passed. Ask staff about a correction.",
            409,
          );
        } else
          requireThat(
            !existing?.frozenAt && (now < schedule.freezeAt || staff),
            "The source snapshot is frozen.",
            409,
          );
        if (lateUpload)
          text(
            url.searchParams.get("reason"),
            "Staff late-upload reason",
            2000,
            true,
          );
      } else
        requireThat(
          course.students.some((s) => s.id === subject) &&
            (staff || subject === user.id),
          "Private portfolio access required.",
          403,
        );
      const length = Number(request.headers.get("content-length"));
      requireThat(
        Number.isInteger(length) &&
          length > 0 &&
          length <= maxCourseFileBytes &&
          request.body,
        "Files must be 1 byte to 20 MiB and declare their length.",
        413,
      );
      requireThat(
        records.filter(
          (r) =>
            r.kind === "file" &&
            (r.value as CourseFile).owner === subject &&
            (r.value as CourseFile).phase === phase,
        ).length < 12,
        "At most 12 uploads per owner and phase. Contact staff for cleanup.",
        409,
      );
      const name = text(url.searchParams.get("name"), "File name", 150, true);
      if (scope === "technical" && purpose === "source")
        requireThat(
          /\.(zip|tar|tgz|tar\.gz)$/i.test(name),
          "Upload a source archive (.zip, .tar, .tgz or .tar.gz).",
        );
      const fileId = crypto.randomUUID();
      const hash = createHash("sha256");
      let actual = 0;
      const checked = request.body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            actual += chunk.length;
            if (actual > length || actual > maxCourseFileBytes)
              throw new Problem("File exceeds its declared size.", 413);
            hash.update(chunk);
            controller.enqueue(chunk);
          },
          flush() {
            if (actual !== length)
              throw new Problem("File length does not match the upload.", 400);
          },
        }),
      );
      try {
        await files.put(fileId, checked, length);
        const value: CourseFile = {
          id: fileId,
          phase,
          scope,
          owner: subject,
          name,
          bytes: length,
          sha256: hash.digest("hex"),
          uploadedAt: now,
          ...(scope === "technical" ? { purpose } : {}),
        };
        return reply(
          await save(
            "file",
            phase,
            fileId,
            value,
            null,
            lateUpload && scope === "technical"
              ? `Staff late upload: ${url.searchParams.get("reason")}`
              : "File uploaded",
          ),
          201,
        );
      } catch (error) {
        await files.delete(fileId);
        throw error;
      }
    }
    const body = await boundedJson(request);
    requireThat(request.method === "PUT", "Method not allowed.", 405);
    const find = <T>(kind: string) =>
      records.find((r) => r.key === recordKey(id, kind, phase, subject)) as
        | Envelope<T>
        | undefined;
    if (action === "submission") {
      const group = team(course, phase, subject);
      requireThat(
        staff || inTeam(course, phase, group.id, user),
        "Group access required.",
        403,
      );
      const old = find<Submission>("submission");
      const data = obj(body.value);
      let value: Submission;
      if (old?.value.frozenAt) {
        requireThat(
          now <= schedule.evidenceAt || staff,
          "The evidence deadline has passed. Ask staff about a correction.",
          409,
        );
        requireThat(
          body.stage === "evidence" || body.stage === "evidence-draft",
          "Frozen code, setup and initial evidence are preserved.",
          409,
        );
        value = {
          ...old.value,
          response: text(
            data.response ?? old.value.response,
            "Author response",
            8000,
            body.stage === "evidence",
          ),
          finalEvidence: parseFinalEvidence(
            course,
            phase,
            subject,
            data,
            records,
            old.value,
          ),
          submittedAt: body.stage === "evidence" ? now : null,
        };
      } else {
        requireThat(
          now < schedule.freezeAt || staff,
          "The implementation deadline has passed. Ask staff about a late submission.",
          409,
        );
        const repository = text(data.repository ?? "", "Repository URL", 500);
        if (repository)
          try {
            const u = new URL(repository);
            requireThat(
              u.protocol === "https:" && !u.username && !u.password,
              "Use an HTTPS repository URL without credentials.",
            );
          } catch {
            throw new Problem("Use a valid HTTPS repository URL.");
          }
        const commit = text(data.commit, "Full commit hash", 64, true);
        requireThat(
          /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(commit),
          "Use the full commit hash.",
        );
        const archive = text(
          data.archive,
          "Archive ID",
          36,
          body.stage === "freeze",
        );
        if (archive)
          requireThat(
            values<CourseFile>("file").some(
              (f) =>
                f.id === archive &&
                f.scope === "technical" &&
                f.purpose !== "evidence" &&
                f.owner === subject &&
                f.phase === phase,
            ),
            "Choose this group's uploaded source archive.",
          );
        requireThat(
          body.stage === "draft" || body.stage === "freeze",
          "Choose save draft or freeze implementation.",
        );
        value = {
          requirements: requirementsFor(course).version,
          checklist: parseChecklist(
            course,
            phase,
            data.checklist,
            old?.value.checklist,
          ),
          phase,
          group: subject,
          members: [...group.members],
          repository,
          commit,
          archive,
          setup: text(
            data.setup,
            "Setup and validation instructions",
            8000,
            true,
          ),
          evidence: text(
            data.evidence,
            "Initial evidence and limitations",
            8000,
            true,
          ),
          response: "",
          frozenAt: body.stage === "freeze" ? now : null,
          frozenRevision: null,
          submittedAt: null,
        };
      }
      const reason = staff
        ? text(body.reason, "Staff submission reason", 2000, true)
        : `Group ${body.stage}`;
      if (soloGroup(course, phase, subject) && value.frozenAt) {
        const reference = values<SoloReview>("solo-review").find(
          (r) => r.phase === phase && r.group === subject,
        )?.reference;
        requireThat(
          !reference?.commit || reference.commit !== value.commit.toLowerCase(),
          "The solo source and assigned reference must be different implementations.",
        );
      }
      return reply(
        await save("submission", phase, subject, value, body.expected, reason),
      );
    }
    if (action === "solo-review") {
      requireThat(
        staff,
        "Only course staff can arrange or record independent solo reviews.",
        403,
      );
      const value = parseSoloReview(
        course,
        records,
        phase,
        subject,
        body.value,
        now,
      );
      return reply(
        await save(
          "solo-review",
          phase,
          subject,
          value,
          body.expected,
          text(
            body.reason,
            "Solo review arrangement or correction reason",
            2000,
            true,
          ),
        ),
      );
    }
    if (action === "portfolio") {
      requireThat(
        course.students.some((s) => s.id === subject) &&
          (staff || subject === user.id),
        "Private portfolio access required.",
        403,
      );
      requireThat(
        now <= schedule.evidenceAt || staff,
        "The evidence deadline has passed. Ask staff about a correction.",
        409,
      );
      const data = obj(body.value);
      const lectures = array(data.lectures, 3).map((item) => {
        const l = obj(item);
        requireThat(
          ["live", "remote", "missing"].includes(l.mode as string),
          "Choose live, remote or missing participation.",
        );
        return {
          mode: l.mode as "live" | "remote" | "missing",
          participation: text(l.participation, "Participation evidence", 1000),
          idea: text(l.idea, "Concrete idea", 1800),
          connection: text(l.connection, "Connection", 1800),
        };
      });
      requireThat(lectures.length === 3, "Keep three lecture entries.");
      const fileIds = array(data.files, 10).map((value) =>
        text(value, "Attachment ID", 36, true),
      );
      requireThat(
        unique(fileIds) &&
          fileIds.every((id) =>
            values<CourseFile>("file").some(
              (f) =>
                f.id === id &&
                f.scope === "private" &&
                f.owner === subject &&
                f.phase === phase,
            ),
          ),
        "Choose your own portfolio attachments.",
      );
      requireThat(
        body.stage === "draft" || body.stage === "submit",
        "Choose save draft or submit portfolio.",
      );
      const value: Portfolio = {
        phase,
        student: subject,
        lectures,
        files: fileIds,
        self: text(data.self, "Self-assessment", 2500, body.stage === "submit"),
        peers: text(
          data.peers,
          soloStudent(course, phase, subject)
            ? "Private independent implementation review"
            : "Private peer feedback",
          2500,
          body.stage === "submit",
        ),
        reflection: text(
          data.reflection,
          soloStudent(course, phase, subject)
            ? "Response to feedback and solo reflection"
            : "Response and group reflection",
          2500,
          body.stage === "submit",
        ),
        contribution: text(
          data.contribution,
          "Decision challenged, tested or reviewed",
          2500,
          body.stage === "submit",
        ),
        submittedAt: body.stage === "submit" ? now : null,
      };
      const old = find<Portfolio>("portfolio");
      requireThat(
        !old?.value.submittedAt || body.stage === "submit",
        "Resubmit a correction; keep the submitted status.",
      );
      return reply(
        await save(
          "portfolio",
          phase,
          subject,
          value,
          body.expected,
          staff
            ? text(body.reason, "Staff reason", 2000, true)
            : `Portfolio ${body.stage}`,
        ),
      );
    }
    if (action === "audit") {
      const assignment = schedule.audits.find((a) => a.from === subject);
      const solo = records.find(
        (r) =>
          r.kind === "solo-review" &&
          (r.value as SoloReview).phase === phase &&
          (r.value as SoloReview).group === subject,
      ) as Envelope<SoloReview> | undefined;
      requireThat(
        assignment || (soloGroup(course, phase, subject) && solo),
        "No audit assigned. Contact staff.",
        409,
      );
      requireThat(
        staff || inTeam(course, phase, subject, user),
        "Assigned auditor access required.",
        403,
      );
      requireThat(
        staff || (now >= schedule.freezeAt && now <= schedule.auditAt),
        "The audit window is not open.",
        409,
      );
      if (!assignment && solo) {
        requireThat(
          solo.value.reference.repository &&
            solo.value.reference.commit &&
            solo.value.reference.setup &&
            solo.value.reference.probe,
          "Staff must arrange a complete reference audit or assign another course group.",
          409,
        );
        requireThat(
          !values<Submission>("submission").some(
            (s) =>
              s.phase === phase &&
              s.group === subject &&
              s.commit.toLowerCase() === solo.value.reference.commit,
          ),
          "The reference audit must inspect a different implementation.",
        );
        const value: Audit = {
          phase,
          from: subject,
          to: `reference-${subject}`,
          targetRevision: solo.value.reference.commit,
          reference: solo.value.reference,
          report: text(
            body.report,
            "Setup, timing, prior inspection, tool policy, change probe and findings",
            10000,
            true,
          ),
          submittedAt: now,
        };
        return reply(
          await save(
            "audit",
            phase,
            subject,
            value,
            body.expected,
            staff
              ? text(body.reason, "Staff audit reason", 2000, true)
              : "Reference audit submitted",
          ),
        );
      }
      const target = records.find(
        (r) =>
          r.kind === "submission" &&
          (r.value as Submission).phase === phase &&
          (r.value as Submission).group === assignment!.to,
      ) as Envelope<Submission> | undefined;
      requireThat(
        target?.value.frozenAt,
        "The assigned group has no frozen implementation. Contact staff for a fallback.",
        409,
      );
      requireThat(
        target.value.frozenRevision,
        "Frozen revision is unavailable.",
        409,
      );
      const history = await store.history(
        target.key,
        target.value.frozenRevision,
      );
      const frozen = history.find(
        (r) =>
          (r.value as Submission).frozenAt === target.value.frozenAt &&
          !(r.value as Submission).submittedAt,
      );
      requireThat(frozen, "Frozen revision is unavailable.", 409);
      const value: Audit = {
        phase,
        from: subject,
        to: assignment!.to,
        targetRevision: frozen.revision,
        report: text(
          body.report,
          "Setup, timing, prior inspection, tool policy, change probe and findings",
          10000,
          true,
        ),
        submittedAt: now,
      };
      return reply(
        await save(
          "audit",
          phase,
          subject,
          value,
          body.expected,
          staff
            ? text(body.reason, "Staff audit reason", 2000, true)
            : "Assigned audit submitted",
        ),
      );
    }
    if (action === "project-grade" || action === "individual-grade") {
      requireThat(staff, "Only course staff can assess work.", 403);
      const project = action === "project-grade";
      if (project) team(course, phase, subject);
      else
        requireThat(
          course.students.some((s) => s.id === subject),
          "Unknown student.",
        );
      requireThat(
        project
          ? activeGroups(course, phase).some((g) => g.id === subject)
          : course.students.some((s) => s.id === subject && activeStudent(s)),
        "Withdrawn students receive no assessment or final grade. Only groups with active students need project assessment.",
        409,
      );
      requireThat(
        typeof body.missing === "boolean",
        "Record whether work is missing.",
      );
      const evidence = find<Submission | Portfolio>(
        project ? "submission" : "portfolio",
      );
      requireThat(
        body.missing ||
          (project
            ? (evidence?.value as Submission)?.frozenAt
            : (evidence?.value as Portfolio)?.submittedAt),
        "Assess submitted evidence or explicitly record missing work.",
      );
      const soloSubjectGroup = project
        ? subject
        : course.phases[phase].groups.find((g) => g.members.includes(subject))
            ?.id;
      const isSolo = Boolean(
        soloSubjectGroup && soloGroup(course, phase, soloSubjectGroup),
      );
      const soloReview = records.find(
        (r) =>
          r.kind === "solo-review" &&
          (r.value as SoloReview).phase === phase &&
          (r.value as SoloReview).group === soloSubjectGroup,
      ) as Envelope<SoloReview> | undefined;
      const outgoing = records.find(
        (r) =>
          r.kind === "audit" &&
          (r.value as Audit).phase === phase &&
          (r.value as Audit).from === soloSubjectGroup,
      ) as Envelope<Audit> | undefined;
      const soloSubmission = values<Submission>("submission").find(
        (r) => r.phase === phase && r.group === soloSubjectGroup,
      );
      requireThat(
        !isSolo ||
          body.missing ||
          soloReviewReady(soloReview?.value, outgoing?.value, soloSubmission),
        "Complete the solo instructor discussion, incoming independent audit and outgoing audit before assessment, or explicitly assess missing work.",
        409,
      );
      const pointScores = scores(
        body.scores,
        project
          ? projectCriteria(phase).map((c) => c[1])
          : [1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 3, 3],
      );
      if (body.missing)
        requireThat(
          pointScores.every((s) => s === 0),
          "Missing work receives explicit zero scores.",
        );
      if (!project && evidence && !body.missing) {
        const portfolio = evidence.value as Portfolio;
        for (let i = 0; i < 3; i++) {
          const entry = portfolio.lectures[i]!;
          requireThat(
            pointScores[i * 3] === 0 ||
              (entry.mode !== "missing" && entry.participation),
            "Participation points require recorded live or equivalent remote evidence.",
          );
        }
      }
      const adjustment = course.adjustments.find(
        (a) => a.student === subject && a.phase === phase,
      );
      if (!project)
        requireThat(
          pointScores.reduce((a, b) => a + b, 0) <=
            (adjustment?.availablePoints ?? 21),
          "Scores exceed the approved available individual points.",
        );
      const value: Grade = {
        phase,
        subject,
        scores: pointScores,
        feedback: text(
          body.feedback,
          "Criterion reasons and missing evidence",
          8000,
          true,
        ),
        evidenceRevision: evidence?.revision ?? null,
        ...(isSolo
          ? {
              reviewRevision: soloReview?.revision ?? null,
              auditRevision: outgoing?.revision ?? null,
            }
          : {}),
        missing: body.missing,
        reason: text(
          body.reason,
          "Assessment or correction reason",
          2000,
          true,
        ),
      };
      const result = await save(
        action,
        phase,
        subject,
        value,
        body.expected,
        value.reason!,
      );
      return reply(result);
    }
    throw new Problem("Unknown course action.", 404);
  } catch (error) {
    if (error instanceof Problem)
      return reply({ message: error.message }, error.status);
    console.error(
      JSON.stringify({
        event: "course_request_failed",
        method: request.method,
        error: error instanceof Error ? error.name : "Unknown",
      }),
    );
    return reply(
      {
        message:
          "The course request failed. Your change may not have been saved; reload to check.",
      },
      500,
    );
  }
}
