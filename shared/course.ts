import type { GroupFormation } from "./course-formation.ts";
import type {
  EvidenceCheckpoint,
  PhaseReference,
} from "./course-requirements.ts";
// Published rubric v1. Keep historical runs on this version when adding rubrics.
export const phases = ["establish", "challenge", "compare"] as const;
export type Phase = (typeof phases)[number];
export const rubricVersion = "2026-10-individual-minima-v1";
export const commonCriteria = [
  ["Required behavior and correctness", 6],
  ["Reproducible setup and operation", 4],
  ["Scalability evidence and reasoning", 5],
  ["Architecture and change capacity", 3],
  ["Responsible development workflow", 2],
] as const;
export const phaseCriteria = {
  establish: [
    ["Local workflow and project harness", 4],
    ["Baseline and bounded claims", 4],
    ["Ownership and reflection", 2],
  ],
  challenge: [
    ["Fresh and comparable implementation B", 3],
    ["Architecture, friction and pressure", 5],
    ["A–B interpretation", 2],
  ],
  compare: [
    ["Fleet, integration and trace", 3],
    ["Applied scaling and deployment", 5],
    ["Final engineering judgment", 2],
  ],
} as const;
export const individualCriteria = [
  ["Evidence-based self-assessment", 3],
  ["Useful peer feedback", 3],
  ["Response and group reflection", 3],
  ["Reliable contribution and shared ownership", 3],
] as const;
export const lectureCriteria = [
  ["Live or equivalent remote participation", 1],
  ["Concrete idea in diary", 1],
  ["Connection to evidence or decision", 1],
] as const;
export function projectCriteria(phase: Phase) {
  return [...commonCriteria, ...phaseCriteria[phase]];
}
export const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export interface Student {
  id: string;
  number: string;
  name: string;
  login: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  enrollment?: Enrollment;
}
export interface Enrollment {
  enrolledAt: string | null;
  lateAt: string | null;
  catchUp: string;
  reason: string;
}
export interface Group {
  id: string;
  members: string[];
  name?: string;
  exception?: string;
  proposal?: string;
}
export interface PhaseSetup {
  freezeAt: string;
  auditAt: string;
  evidenceAt: string;
  groups: Group[];
  audits: { from: string; to: string }[];
  published: boolean;
  formation?: GroupFormation;
}
export interface Adjustment {
  student: string;
  phase: Phase;
  lectureMinimum: number;
  assessmentMinimum: number;
  contributionMinimum: number;
  availablePoints: number;
  reason: string;
}
export interface Course {
  requirements?: string;
  nextGroupNumber?: number;
  id: string;
  name: string;
  rubric: typeof rubricVersion;
  staff: string[];
  students: Student[];
  phases: Record<Phase, PhaseSetup>;
  adjustments: Adjustment[];
}
export interface Envelope<T = unknown> {
  key: string;
  courseId: string;
  kind: string;
  value: T;
  revision: string;
  updatedAt: string;
  actor: string;
}
export interface Submission {
  requirements?: string;
  checklist?: EvidenceCheckpoint[];
  finalEvidence?: {
    index: string;
    files: string[];
    checklist: EvidenceCheckpoint[];
    references: PhaseReference[];
  };
  phase: Phase;
  group: string;
  members: string[];
  repository: string;
  commit: string;
  archive: string;
  setup: string;
  evidence: string;
  response: string;
  frozenAt: string | null;
  frozenRevision: string | null;
  submittedAt: string | null;
}
export interface Portfolio {
  phase: Phase;
  student: string;
  lectures: {
    mode: "live" | "remote" | "missing";
    participation: string;
    idea: string;
    connection: string;
  }[];
  self: string;
  peers: string;
  reflection: string;
  contribution: string;
  files: string[];
  submittedAt: string | null;
}
export interface Audit {
  phase: Phase;
  from: string;
  to: string;
  targetRevision: string;
  report: string;
  submittedAt: string;
}
export interface Grade {
  phase: Phase;
  subject: string;
  scores: number[];
  feedback: string;
  evidenceRevision: string | null;
  missing: boolean;
  reason?: string;
}
export interface CourseFile {
  purpose?: "source" | "evidence";
  id: string;
  phase: Phase;
  scope: "technical" | "private";
  owner: string;
  name: string;
  bytes: number;
  sha256: string;
  uploadedAt: string;
}
export interface Result {
  earned: number;
  available: number;
  percentage: number;
  pending: string[];
  unmet: string[];
  grade: number | null;
  status: "pending" | "fail" | "pass";
  breakdown: {
    phase: Phase;
    project: number | null;
    lecture: number | null;
    completed: number | null;
    assessment: number | null;
    contribution: number | null;
    published: boolean;
  }[];
}
export const recordKey = (
  course: string,
  kind: string,
  phase = "",
  subject = "",
) => [course, kind, phase, subject].filter(Boolean).join(":");
export const emptyPortfolio = (phase: Phase, student: string): Portfolio => ({
  phase,
  student,
  lectures: Array.from({ length: 3 }, () => ({
    mode: "missing",
    participation: "",
    idea: "",
    connection: "",
  })),
  self: "",
  peers: "",
  reflection: "",
  contribution: "",
  files: [],
  submittedAt: null,
});
export function groupFor(
  course: Course,
  phase: Phase,
  student: string,
  submissions: Submission[] = [],
) {
  return (
    submissions.find(
      (s) => s.phase === phase && s.frozenAt && s.members.includes(student),
    )?.group ??
    course.phases[phase].groups.find((g) => g.members.includes(student))?.id
  );
}
const sum = (scores: number[]) => scores.reduce((a, b) => a + b, 0);
export function calculateResult(
  course: Course,
  student: string,
  submissions: Submission[],
  portfolios: Portfolio[],
  projects: Grade[],
  individuals: Grade[],
  includeUnpublished = false,
): Result {
  const pending: string[] = [],
    unmet: string[] = [];
  let earned = 0,
    available = 153;
  const breakdown = phases.map((phase) => {
    const published = course.phases[phase].published;
    const group = groupFor(course, phase, student, submissions);
    const project =
      published || includeUnpublished
        ? projects.find((g) => g.phase === phase && g.subject === group)
        : undefined;
    const individual =
      published || includeUnpublished
        ? individuals.find((g) => g.phase === phase && g.subject === student)
        : undefined;
    const portfolio = portfolios.find(
      (p) => p.phase === phase && p.student === student,
    );
    const adjustment = course.adjustments.find(
      (a) => a.student === student && a.phase === phase,
    );
    available += (adjustment?.availablePoints ?? 21) - 21;
    const projectPoints = project ? sum(project.scores) : null;
    const lecture = individual ? sum(individual.scores.slice(0, 9)) : null;
    const completed = individual
      ? [0, 3, 6].filter((i) => sum(individual.scores.slice(i, i + 3)) === 3)
          .length
      : null;
    const assessment = individual ? sum(individual.scores.slice(9)) : null;
    const contribution = individual?.scores[12] ?? null;
    earned += (projectPoints ?? 0) + (lecture ?? 0) + (assessment ?? 0);
    if (projectPoints === null)
      pending.push(`${title(phase)} project assessment`);
    else if (projectPoints < 10)
      unmet.push(`${title(phase)} project: ${projectPoints}/30; needs 10`);
    if (individual === undefined)
      pending.push(`${title(phase)} individual assessment`);
    else {
      if ((completed ?? 0) < (adjustment?.lectureMinimum ?? 2))
        unmet.push(
          `${title(phase)}: ${completed}/3 completed lecture activities; needs ${adjustment?.lectureMinimum ?? 2}`,
        );
      if (
        !portfolio?.submittedAt ||
        (assessment ?? 0) < (adjustment?.assessmentMinimum ?? 6)
      )
        unmet.push(
          `${title(phase)} self/peer assessment: submitted work and ${adjustment?.assessmentMinimum ?? 6}/12 required`,
        );
      if ((contribution ?? 0) < (adjustment?.contributionMinimum ?? 1))
        unmet.push(
          `${title(phase)} contribution: needs ${adjustment?.contributionMinimum ?? 1}/3`,
        );
    }
    return {
      phase,
      project: projectPoints,
      lecture,
      completed,
      assessment,
      contribution,
      published,
    };
  });
  const percentage = (100 * earned) / available;
  if (!pending.length && percentage < 50)
    unmet.push("Total below 50% of available points");
  const status = pending.length ? "pending" : unmet.length ? "fail" : "pass";
  const grade =
    status === "pending"
      ? null
      : status === "fail"
        ? 0
        : percentage >= 90
          ? 5
          : percentage >= 80
            ? 4
            : percentage >= 70
              ? 3
              : percentage >= 60
                ? 2
                : 1;
  return {
    earned,
    available,
    percentage,
    pending,
    unmet,
    grade,
    status,
    breakdown,
  };
}
// RFC 4180 quoting and spreadsheet formula neutralisation, including leading whitespace.
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^\s*[=+@-]/.test(text)) text = "'" + text;
  return `"${text.replaceAll('"', '""')}"`;
}
