import type { Course, Student } from "../../shared/course.ts";
import {
  pendingCatchUps,
  pendingWithdrawals,
  activeStudent,
} from "../../shared/course-enrollment.ts";
import { e, field, option } from "./course-ui.ts";

export function enrollmentStatus(student: Student) {
  const enrollment = student.enrollment;
  if (enrollment?.withdrawal)
    return `Withdrawn · ${enrollment.withdrawal.reviewedAt ? "arrangements recorded" : "arrangements need review"}`;
  if (enrollment?.lateAt)
    return enrollment.catchUp
      ? "Late arrival · catch-up recorded"
      : "Late arrival · catch-up required";
  return enrollment?.catchUp ? "Arrangement recorded" : "No catch-up required";
}

export function staffEnrollment(course: Course) {
  const student = course.students[0];
  if (!student) return "";
  const withdrawn = !activeStudent(student);
  return `<details data-enrollment-panel><summary>Enrollment, catch-up and withdrawals</summary><p>Record enrollment changes with a private reason. Withdrawn students receive no final grade; their work and history remain available. Review group and audit arrangements separately.</p><form data-form="enrollment" data-current-student="${e(student.id)}"><label class="course-field">Student for enrollment arrangement<select name="student" data-enrollment-select>${course.students.map((s) => option(s.id, `${s.name} · ${s.number}`, student.id)).join("")}</select></label><p data-enrollment-status>${e(enrollmentStatus(student))}</p><div data-catch-up-fields ${withdrawn ? "hidden" : ""}><label class="course-check"><input type="checkbox" name="late" ${student.enrollment?.lateAt ? "checked" : ""}>Late arrival</label>${field("catchUp", "Agreed catch-up arrangement (visible to this student)", student.enrollment?.catchUp ?? "", 2000)}<p class="course-muted">Recording a plan does not change deadlines, frozen membership or passing requirements. Allocate the student in Groups; use an approved individual arrangement in the gradebook if a replacement activity is needed.</p></div><div data-withdrawal-fields ${withdrawn ? "" : "hidden"}>${field("resolution", "Group and audit arrangements after withdrawal (private to staff)", student.enrollment?.withdrawal?.resolution ?? "", 2000)}<p>Review remaining members, future allocations and audit fallbacks. Frozen membership stays intact. Save each group change with its own reason.</p></div>${field("reason", "Enrollment arrangement reason (private to staff)", "", 2000, true)}<div class="course-form-actions"><button type="submit" value="catch-up" ${withdrawn ? "hidden" : ""}>Save enrollment arrangement</button><button type="submit" value="withdraw" class="course-quiet" formnovalidate ${withdrawn ? "hidden" : ""}>Mark student withdrawn</button><button type="submit" value="review-withdrawal" ${withdrawn ? "" : "hidden"}>Record withdrawal arrangements</button><button type="submit" value="reinstate" class="course-quiet" formnovalidate ${withdrawn ? "" : "hidden"}>Reinstate student</button></div></form></details>`;
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
  const withdrawn = !activeStudent(student);
  (form.elements.namedItem("resolution") as HTMLTextAreaElement).value =
    student.enrollment?.withdrawal?.resolution ?? "";
  form.querySelector<HTMLElement>("[data-catch-up-fields]")!.hidden = withdrawn;
  form.querySelector<HTMLElement>("[data-withdrawal-fields]")!.hidden =
    !withdrawn;
  for (const button of form.querySelectorAll<HTMLButtonElement>(
    "button[value]",
  ))
    button.hidden = ["withdraw", "catch-up"].includes(button.value)
      ? withdrawn
      : !withdrawn;
  form.dataset.currentStudent = id;
  delete form.dataset.dirty;
  form.closest("details")!.open = true;
  (
    form.elements.namedItem(
      withdrawn ? "resolution" : "catchUp",
    ) as HTMLTextAreaElement
  ).focus();
}

export function catchUpQueue(course: Course) {
  const pending = pendingCatchUps(course);
  return pending.length
    ? `<aside class="course-note"><strong>Catch-up arrangements required</strong><p>Agree a plan with each late arrival and allocate a group where needed.</p><ul>${pending.map((s) => `<li><button type="button" class="course-quiet" data-enrollment-student="${e(s.id)}">Record catch-up for ${e(s.name)}</button></li>`).join("")}</ul></aside>`
    : "";
}

export function ownEnrollment(student: Student | undefined) {
  const enrollment = student?.enrollment;
  if (enrollment?.withdrawal)
    return `<aside class="course-note"><strong>Withdrawn from this course</strong><p>Recorded ${e(new Date(enrollment.withdrawal.at).toLocaleString())}. No final grade is assigned. You can view saved work; contact your instructor to correct your enrollment.</p></aside>`;
  if (!enrollment?.lateAt && !enrollment?.catchUp) return "";
  return `<aside class="course-note"><strong>My catch-up arrangement</strong><p class="course-evidence">${e(enrollment.catchUp || "Contact your instructor to agree and record a catch-up plan.")}</p><p>Course deadlines and passing requirements still apply unless your instructor records a separate approved arrangement.</p></aside>`;
}

export function withdrawalQueue(course: Course) {
  const pending = pendingWithdrawals(course);
  return pending.length
    ? `<aside class="course-note"><strong>Withdrawal arrangements need review</strong><p>Check remaining group members, future allocations and audit fallbacks. Saved work and frozen membership are retained; withdrawn students receive no final grade.</p><ul>${pending.map((s) => `<li><button type="button" class="course-quiet" data-enrollment-student="${e(s.id)}">Review withdrawal for ${e(s.name)}</button></li>`).join("")}</ul></aside>`
    : "";
}
