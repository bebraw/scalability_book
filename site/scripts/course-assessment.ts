import {
  adjustmentFor,
  availableIndividualPoints,
  individualWorkMinimums,
  phases,
  rubricVersion,
  title,
  type Adjustment,
  type Course,
  type CourseAdjustment,
  type Phase,
} from "../../shared/course.ts";
import { e, field, input } from "./course-ui.ts";

export function arrangementSummary(a: Adjustment | CourseAdjustment) {
  const description =
    a.phase === "course"
      ? `Required diary entries across the course: ${a.lectureMinimum}. Available individual points: ${phases.map((p) => `${title(p)} ${a.availablePointsByPhase[p]}`).join(", ")}.`
      : `Lecture activities: ${a.lectureMinimum}; assessment minimum: ${a.assessmentMinimum}; contribution minimum: ${a.contributionMinimum}; available individual points: ${a.availablePoints}.`;
  return `<aside class="course-note"><strong>${title(a.phase)} approved arrangement</strong><p>${e(a.reason)}</p><p>${e(description)}</p></aside>`;
}

export function arrangementForm(course: Course, student: string, phase: Phase) {
  const a = adjustmentFor(course, student, phase);
  const courseWide = course.rubric === rubricVersion;
  const inputs = courseWide
    ? input(
        "lectureMinimum",
        "Diary entries required across the course (0–7)",
        String(a?.lectureMinimum ?? individualWorkMinimums.lectures),
        true,
        "number",
      ) +
      phases
        .map((p) =>
          input(
            `available-${p}`,
            `${title(p)} available individual points (1–21)`,
            String(availableIndividualPoints(a, p)),
            true,
            "number",
          ),
        )
        .join("")
    : input(
        "lectureMinimum",
        "Required complete lecture activities (0–3)",
        String(a?.lectureMinimum ?? 2),
        true,
        "number",
      ) +
      input(
        "assessmentMinimum",
        "Self/peer minimum (0–12)",
        String(a && a.phase !== "course" ? a.assessmentMinimum : 6),
        true,
        "number",
      ) +
      input(
        "contributionMinimum",
        "Contribution minimum (0–3)",
        String(a && a.phase !== "course" ? a.contributionMinimum : 1),
        true,
        "number",
      ) +
      input(
        "availablePoints",
        "Available individual points this phase (1–21)",
        String(availableIndividualPoints(a, phase)),
        true,
        "number",
      );
  return `<details><summary>Approved individual arrangement for ${courseWide ? "the course" : title(phase)}</summary><form data-form="adjustment"><p>Record the replacement activity or adjusted requirement and the reason for it. The student and course staff can see the arrangement.</p>${inputs}${field("reason", "Approved arrangement, replacement activity and reason", a?.reason ?? "", 2000, true)}<button type="submit">Save private arrangement</button></form></details>`;
}

export function arrangementPayload(
  course: Course,
  student: string,
  phase: Phase,
  val: (key: string) => string,
): Adjustment | CourseAdjustment {
  const common = {
    student,
    reason: val("reason"),
    lectureMinimum: Number(val("lectureMinimum")),
  };
  if (course.rubric === rubricVersion)
    return {
      ...common,
      phase: "course",
      availablePointsByPhase: {
        establish: Number(val("available-establish")),
        challenge: Number(val("available-challenge")),
        compare: Number(val("available-compare")),
      },
    };
  return {
    ...common,
    phase,
    assessmentMinimum: Number(val("assessmentMinimum")),
    contributionMinimum: Number(val("contributionMinimum")),
    availablePoints: Number(val("availablePoints")),
  };
}
