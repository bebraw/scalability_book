import { createHash } from "node:crypto";
import {
  phases,
  rubricVersion,
  type Course,
  type Phase,
  type Student,
  type Group,
  type Envelope,
  type Submission,
  type Audit,
  type Grade,
} from "../shared/course.ts";
import type {
  AdministrationRevisions,
  AdministrationSection,
  RosterPreview,
} from "../shared/course-administration.ts";
import {
  requireThat,
  obj,
  text,
  array,
  studentId,
  slug,
  date,
  unique,
} from "./course-validation.ts";

export function parseStudents(value: unknown): Student[] {
  const students = array(value, 100).map((item) => {
    const s = obj(item);
    return {
      id: studentId(s.id),
      number: text(s.number, "Student number", 50, true),
      name: text(s.name, "Student name", 120, true),
      login: text(s.login, "GitHub login", 39, true).toLowerCase(),
    };
  });
  requireThat(
    students.every((s) => /^[a-z0-9-]+$/.test(s.login)),
    "Invalid GitHub login.",
  );
  requireThat(
    unique(students.map((s) => s.id)) &&
      unique(students.map((s) => s.number)) &&
      unique(students.map((s) => s.login)),
    "Student IDs, numbers and logins must be unique.",
  );
  return students;
}
export function parseGroups(value: unknown, course: Course): Group[] {
  const groups = array(value, 50).map((item) => {
    const g = obj(item);
    const members = array(g.members, 10).map(studentId);
    requireThat(members.length > 0, "Every group needs a member.");
    return { id: slug(g.id), members };
  });
  requireThat(unique(groups.map((g) => g.id)), "Group IDs must be unique.");
  const members = groups.flatMap((g) => g.members);
  requireThat(unique(members), "A student can belong to one group in a phase.");
  requireThat(
    members.every((id) => course.students.some((s) => s.id === id)),
    "Group members must be on the roster.",
  );
  return groups;
}

const fingerprint = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function rosterPreview(old: Course, next: Course): RosterPreview {
  const added = next.students.filter(
    (s) => !old.students.some((prior) => prior.id === s.id),
  );
  const updated = next.students.filter((s) =>
    old.students.some(
      (prior) => prior.id === s.id && fingerprint(prior) !== fingerprint(s),
    ),
  );
  return {
    added,
    updated,
    unchanged: next.students.length - added.length - updated.length,
    retained: old.students.length,
  };
}
export function administrationRevisions(
  course: Course,
): AdministrationRevisions {
  const groupRevisions = {} as Record<Phase, string>;
  const scheduleRevisions = {} as Record<Phase, string>;
  for (const phase of phases) {
    const { groups, freezeAt, auditAt, evidenceAt, audits } =
      course.phases[phase];
    groupRevisions[phase] = fingerprint(groups);
    scheduleRevisions[phase] = fingerprint({
      freezeAt,
      auditAt,
      evidenceAt,
      audits,
    });
  }
  return {
    students: fingerprint(course.students),
    settings: fingerprint({
      name: course.name,
      staff: course.staff,
      rubric: course.rubric,
    }),
    groups: groupRevisions,
    schedule: scheduleRevisions,
  };
}

function settings(
  course: Course,
  body: Record<string, unknown>,
  actor: string,
) {
  course.name = text(body.name, "Course name", 120, true);
  const staff = array(body.staff, 10).map((value) =>
    value === actor ? actor : studentId(value),
  );
  requireThat(
    staff.length && unique(staff) && staff.includes(actor),
    "Keep yourself as course staff.",
  );
  requireThat(
    body.rubric === course.rubric && body.rubric === rubricVersion,
    "Keep the published rubric version for this run.",
  );
  course.staff = staff;
}

function validateAudits(value: unknown, groups: Group[]) {
  const audits = array(value, 50).map((value) => {
    const a = obj(value);
    return { from: slug(a.from), to: slug(a.to) };
  });
  requireThat(
    audits.every(
      (a) =>
        a.from !== a.to &&
        groups.some((g) => g.id === a.from) &&
        groups.some((g) => g.id === a.to),
    ) &&
      unique(audits.map((a) => a.from)) &&
      unique(audits.map((a) => a.to)),
    "Audits need distinct existing groups and one incoming/outgoing assignment per group.",
  );
  return audits;
}

function frozenSubmissions(records: Envelope[], phase: Phase) {
  return records
    .filter((r) => r.kind === "submission")
    .map((r) => r.value as Submission)
    .filter((s) => s.phase === phase && s.frozenAt);
}

function setGroups(
  next: Course,
  old: Course,
  records: Envelope[],
  phase: Phase,
  value: unknown,
) {
  const groups = parseGroups(value, next);
  requireThat(
    frozenSubmissions(records, phase).every((s) =>
      groups.some(
        (g) =>
          g.id === s.group &&
          JSON.stringify([...g.members].sort()) ===
            JSON.stringify([...s.members].sort()),
      ),
    ),
    "Frozen group membership is preserved. Change groups in a later phase.",
  );
  const retained = new Set(groups.map((g) => g.id));
  requireThat(
    old.phases[phase].groups.every(
      (g) =>
        retained.has(g.id) ||
        !records.some((r) => {
          if ((r.value as { phase?: string }).phase !== phase) return false;
          return (
            (r.kind === "submission" &&
              (r.value as Submission).group === g.id) ||
            (r.kind === "project-grade" &&
              (r.value as Grade).subject === g.id) ||
            (r.kind === "audit" &&
              ((r.value as Audit).from === g.id ||
                (r.value as Audit).to === g.id))
          );
        }),
    ),
    "Groups with saved evidence or assessments must be retained.",
  );
  next.phases[phase].groups = groups;
}

function setSchedule(
  next: Course,
  old: Course,
  records: Envelope[],
  phase: Phase,
  input: Record<string, unknown>,
  now: string,
) {
  const freezeAt = date(input.freezeAt),
    auditAt = date(input.auditAt),
    evidenceAt = date(input.evidenceAt);
  requireThat(
    freezeAt < auditAt && auditAt <= evidenceAt,
    "Deadlines must run implementation → audit → evidence.",
  );
  if (
    now >= old.phases[phase].freezeAt ||
    frozenSubmissions(records, phase).length
  )
    requireThat(
      freezeAt === old.phases[phase].freezeAt,
      "The implementation deadline is locked once work freezes or the audit opens.",
    );
  if (now >= old.phases[phase].auditAt)
    requireThat(
      auditAt === old.phases[phase].auditAt,
      "The closed audit window cannot be moved; class access has already opened.",
    );
  const audits = validateAudits(input.audits, next.phases[phase].groups);
  if (
    records.some(
      (r) => r.kind === "audit" && (r.value as Audit).phase === phase,
    )
  )
    requireThat(
      JSON.stringify(audits) === JSON.stringify(old.phases[phase].audits),
      "Assignments with submitted audits are retained.",
    );
  Object.assign(next.phases[phase], { freezeAt, auditAt, evidenceAt, audits });
}

function allocateGroups(course: Course, value: unknown) {
  const known = new Set(
    phases.flatMap((phase) => course.phases[phase].groups.map((g) => g.id)),
  );
  let nextNumber = Math.max(
    course.nextGroupNumber ?? 1,
    ...[...known].map((id) => {
      const match = /^group-([0-9]+)$/.exec(id);
      return match ? Number(match[1]) + 1 : 1;
    }),
  );
  const groups = array(value, 50).map((value) => {
    const g = obj(value);
    const id = text(g.id, "Group identifier", 48);
    requireThat(
      !id || known.has(id),
      "New group identifiers are generated automatically. Reuse an existing ID or leave it empty.",
    );
    return {
      id: id || `group-${String(nextNumber++).padStart(2, "0")}`,
      members: g.members,
    };
  });
  course.nextGroupNumber = nextNumber;
  return groups;
}

export function updateAdministration(
  course: Course,
  records: Envelope[],
  section: AdministrationSection,
  phaseText: string | undefined,
  body: Record<string, unknown>,
  actor: string,
  now: string,
): Course {
  const revisions = administrationRevisions(course);
  const perPhase = section === "groups" || section === "schedule";
  requireThat(
    !perPhase || phases.includes(phaseText as Phase),
    "Unknown phase.",
    404,
  );
  requireThat(perPhase || !phaseText, "Unknown administration route.", 404);
  const phase = phaseText as Phase;
  const expected = perPhase ? revisions[section][phase] : revisions[section];
  requireThat(
    body.expected === expected,
    "This administration form changed. Reload before saving; your text has not been saved.",
    409,
  );
  const next = structuredClone(course);
  if (section === "settings") settings(next, body, actor);
  else if (section === "students") {
    const imported = parseStudents(body.students);
    const updates = new Map(imported.map((s) => [s.id, s]));
    next.students = parseStudents([
      ...course.students.map((s) => updates.get(s.id) ?? s),
      ...imported.filter(
        (s) => !course.students.some((old) => old.id === s.id),
      ),
    ]);
  } else if (section === "groups") {
    setGroups(next, course, records, phase, allocateGroups(next, body.groups));
    validateAudits(next.phases[phase].audits, next.phases[phase].groups);
  } else setSchedule(next, course, records, phase, body, now);
  return next;
}

// Retain the existing integration endpoint, using the same cross-workflow rules.
export function updateLegacySetup(
  course: Course,
  records: Envelope[],
  body: Record<string, unknown>,
  actor: string,
  now: string,
): Course {
  const next = structuredClone(course);
  next.students = parseStudents(body.students);
  settings(next, { ...body, rubric: body.rubric ?? course.rubric }, actor);
  const configurations = obj(body.phases);
  for (const phase of phases) {
    const input = obj(configurations[phase]);
    setGroups(next, course, records, phase, input.groups);
    setSchedule(next, course, records, phase, input, now);
  }
  const retained = new Set(next.students.map((s) => s.id));
  requireThat(
    course.students.every(
      (s) =>
        retained.has(s.id) ||
        !records.some(
          (r) =>
            (r.value as { student?: string }).student === s.id ||
            (r.kind === "individual-grade" &&
              (r.value as Grade).subject === s.id),
        ),
    ),
    "Students with assessment records must remain on the roster.",
  );
  return next;
}
