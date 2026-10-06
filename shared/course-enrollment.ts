import type { Course, Enrollment, Student, Phase } from "./course.ts";

export const activeStudent = (student: Student) =>
  !student.enrollment?.withdrawal;
export const activeStudents = (course: Course) =>
  course.students.filter(activeStudent);
export const activeGroups = (course: Course, phase: Phase) => {
  const active = new Set(activeStudents(course).map((s) => s.id));
  return course.phases[phase].groups.filter((g) =>
    g.members.some((id) => active.has(id)),
  );
};
export const pendingWithdrawals = (course: Course) =>
  course.students.filter(
    (s) => s.enrollment?.withdrawal && !s.enrollment.withdrawal.reviewedAt,
  );

export const emptyEnrollment = (
  enrolledAt: string | null = null,
): Enrollment => ({
  enrolledAt,
  lateAt: null,
  catchUp: "",
  reason: "",
});
export const pendingCatchUps = (course: Course) =>
  activeStudents(course).filter(
    (s) => s.enrollment?.lateAt && !s.enrollment.catchUp,
  );
export function studentEnrollment(student: Student, viewer: string): Student {
  const { enrollment, ...publicFields } = student;
  return student.id === viewer && enrollment
    ? {
        ...publicFields,
        enrollment: {
          ...enrollment,
          reason: "",
          ...(enrollment.withdrawal
            ? { withdrawal: { ...enrollment.withdrawal, resolution: "" } }
            : {}),
        },
      }
    : publicFields;
}
