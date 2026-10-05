import {
  phases,
  type Course,
  type Student,
  type Envelope,
  type Submission,
} from "../shared/course.ts";
import { emptyEnrollment } from "../shared/course-enrollment.ts";
import { requireThat, studentId, text } from "./course-validation.ts";

export function enrollStudents(
  course: Course,
  students: Student[],
  records: Envelope[],
  now: string,
) {
  const late =
    phases.some((phase) => {
      const formation = course.phases[phase].formation;
      return formation?.publishedAt || (formation && now >= formation.deadline);
    }) ||
    records.some(
      (r) => r.kind === "submission" && (r.value as Submission).frozenAt,
    ) ||
    now >= course.phases.establish.freezeAt;
  return students.map((student) => {
    if (course.students.some((old) => old.id === student.id)) return student;
    return {
      ...student,
      enrollment: { ...emptyEnrollment(now), lateAt: late ? now : null },
    };
  });
}

export function updateEnrollment(
  course: Course,
  body: Record<string, unknown>,
  now: string,
) {
  const next = structuredClone(course);
  const id = studentId(body.student);
  const student = next.students.find((s) => s.id === id);
  requireThat(student, "Unknown enrolled student.", 404);
  requireThat(
    typeof body.late === "boolean",
    "Specify whether this is a late arrival.",
  );
  const prior = student.enrollment ?? emptyEnrollment();
  student.enrollment = {
    ...prior,
    lateAt: body.late ? (prior.lateAt ?? now) : null,
    catchUp: text(body.catchUp, "Agreed catch-up arrangement", 2000),
    reason: text(body.reason, "Enrollment arrangement reason", 2000, true),
  };
  return next;
}
