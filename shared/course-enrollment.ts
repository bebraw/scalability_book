import type { Course, Enrollment, Student } from "./course.ts";

export const emptyEnrollment = (
  enrolledAt: string | null = null,
): Enrollment => ({
  enrolledAt,
  lateAt: null,
  catchUp: "",
  reason: "",
});
export const pendingCatchUps = (course: Course) =>
  course.students.filter((s) => s.enrollment?.lateAt && !s.enrollment.catchUp);
export function studentEnrollment(student: Student, viewer: string): Student {
  const { enrollment, ...publicFields } = student;
  return student.id === viewer && enrollment
    ? { ...publicFields, enrollment: { ...enrollment, reason: "" } }
    : publicFields;
}
