import type { Course, Student } from "../../shared/course.ts";
import { pendingCatchUps } from "../../shared/course-enrollment.ts";
import { e, field, option } from "./course-ui.ts";

export function enrollmentStatus(student: Student) {
  const enrollment = student.enrollment;
  if (enrollment?.lateAt)
    return enrollment.catchUp
      ? "Late arrival · catch-up recorded"
      : "Late arrival · catch-up required";
  return enrollment?.catchUp ? "Arrangement recorded" : "No catch-up required";
}

export function staffEnrollment(course: Course) {
  const student = course.students[0];
  if (!student) return "";
  return `<details data-enrollment-panel><summary>Late arrivals and catch-up arrangements</summary><p>Agree a plan with the student and record it here. The student sees their own plan; the change reason stays private to staff. Missing plans remain in the review queue.</p><form data-form="enrollment" data-current-student="${e(student.id)}"><label class="course-field">Student for enrollment arrangement<select name="student" data-enrollment-select>${course.students.map((s) => option(s.id, `${s.name} · ${s.number}`, student.id)).join("")}</select></label><p data-enrollment-status>${e(enrollmentStatus(student))}</p><label class="course-check"><input type="checkbox" name="late" ${student.enrollment?.lateAt ? "checked" : ""}>Late arrival</label>${field("catchUp", "Agreed catch-up arrangement (visible to this student)", student.enrollment?.catchUp ?? "", 2000)}<p class="course-muted">Recording a plan does not change deadlines, frozen membership or passing requirements. Allocate the student in Groups; use an approved individual arrangement in the gradebook if a replacement activity is needed.</p>${field("reason", "Enrollment arrangement reason (private to staff)", "", 2000, true)}<button type="submit">Save enrollment arrangement</button></form></details>`;
}

export function loadEnrollment(
  form: HTMLFormElement,
  course: Course,
  id: string,
) {
  const student = course.students.find((s) => s.id === id)!;
  (form.elements.namedItem("student") as HTMLSelectElement).value = id;
  (form.elements.namedItem("late") as HTMLInputElement).checked =
    !!student.enrollment?.lateAt;
  (form.elements.namedItem("catchUp") as HTMLTextAreaElement).value =
    student.enrollment?.catchUp ?? "";
  (form.elements.namedItem("reason") as HTMLTextAreaElement).value = "";
  form.querySelector("[data-enrollment-status]")!.textContent =
    enrollmentStatus(student);
  form.dataset.currentStudent = id;
  delete form.dataset.dirty;
  form.closest("details")!.open = true;
  (form.elements.namedItem("catchUp") as HTMLTextAreaElement).focus();
}

export function catchUpQueue(course: Course) {
  const pending = pendingCatchUps(course);
  return pending.length
    ? `<aside class="course-note"><strong>Catch-up arrangements required</strong><p>Agree a plan with each late arrival and allocate a group where needed.</p><ul>${pending.map((s) => `<li><button type="button" class="course-quiet" data-enrollment-student="${e(s.id)}">Record catch-up for ${e(s.name)}</button></li>`).join("")}</ul></aside>`
    : "";
}

export function ownEnrollment(student: Student | undefined) {
  const enrollment = student?.enrollment;
  if (!enrollment?.lateAt && !enrollment?.catchUp) return "";
  return `<aside class="course-note"><strong>My catch-up arrangement</strong><p class="course-evidence">${e(enrollment.catchUp || "Contact your instructor to agree and record a catch-up plan.")}</p><p>Course deadlines and passing requirements still apply unless your instructor records a separate approved arrangement.</p></aside>`;
}
