import type { Course, Envelope, Grade, Phase } from "./course.ts";
import { groupFor, individualCriteria, rubricVersion } from "./course.ts";

export interface SoloReview {
  phase: Phase;
  group: string;
  reference: {
    repository: string;
    commit: string;
    setup: string;
    probe: string;
  };
  reviewer: string;
  checkIn: string;
  report: string;
  targetRevision: string | null;
  reviewedAt: string | null;
}
export const soloSupported = (course: Course) =>
  course.rubric === rubricVersion && course.requirements === "2026-10-v2";
export const soloGroup = (course: Course, phase: Phase, group: string) =>
  course.phases[phase].groups.some(
    (g) => g.id === group && g.route === "solo" && g.members.length === 1,
  );
export const soloStudent = (course: Course, phase: Phase, student: string) =>
  soloGroup(course, phase, groupFor(course, phase, student) ?? "");
export const soloCriteria = [
  ["Evidence-based self-assessment", 3],
  ["Useful independent implementation review", 3],
  ["Response to feedback and solo reflection", 3],
  ["Reliable contribution and accountable ownership", 3],
] as const;
export const assessmentCriteriaFor = (
  course: Course,
  phase: Phase,
  student: string,
) => (soloStudent(course, phase, student) ? soloCriteria : individualCriteria);
export function soloGradeCurrent(
  course: Course,
  grade: Grade,
  project: boolean,
  reviews: Envelope<SoloReview>[],
  audits: { revision: string; value: { phase: Phase; from: string } }[],
) {
  const group = project
    ? grade.subject
    : groupFor(course, grade.phase, grade.subject);
  if (!group || !soloGroup(course, grade.phase, group)) return true;
  return (
    grade.reviewRevision ===
      (reviews.find(
        (r) => r.value.phase === grade.phase && r.value.group === group,
      )?.revision ?? null) &&
    grade.auditRevision ===
      (audits.find(
        (r) => r.value.phase === grade.phase && r.value.from === group,
      )?.revision ?? null)
  );
}
