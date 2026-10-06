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
  const prior = student.enrollment ?? emptyEnrollment();
  const reason = text(body.reason, "Enrollment arrangement reason", 2000, true);
  if (body.action === "withdraw") {
    requireThat(!prior.withdrawal, "This student is already withdrawn.", 409);
    student.enrollment = {
      ...prior,
      reason,
      withdrawal: { at: now, resolution: "", reviewedAt: null },
    };
    return next;
  }
  if (body.action === "review-withdrawal") {
    requireThat(prior.withdrawal, "This student has not withdrawn.", 409);
    student.enrollment = {
      ...prior,
      reason,
      withdrawal: {
        ...prior.withdrawal,
        resolution: text(
          body.resolution,
          "Group and audit arrangements",
          2000,
          true,
        ),
        reviewedAt: now,
      },
    };
    return next;
  }
  if (body.action === "reinstate") {
    requireThat(prior.withdrawal, "This student is already active.", 409);
    const { withdrawal: _withdrawal, ...retained } = prior;
    student.enrollment = { ...retained, reason };
    return next;
  }
  requireThat(
    body.action === undefined || body.action === "catch-up",
    "Choose a known enrollment action.",
  );
  requireThat(
    typeof body.late === "boolean",
    "Specify whether this is a late arrival.",
  );
  requireThat(
    !prior.withdrawal,
    "Reinstate the student before changing their catch-up arrangement.",
    409,
  );
  student.enrollment = {
    ...prior,
    lateAt: body.late ? (prior.lateAt ?? now) : null,
    catchUp: text(body.catchUp, "Agreed catch-up arrangement", 2000),
    reason,
  };
  return next;
}
