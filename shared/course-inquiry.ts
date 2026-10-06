import { phases, type Course, type Phase } from "./course.ts";
import { activeStudent } from "./course-enrollment.ts";
import {
  learningAssert,
  learningObject,
  learningText,
  type LearningSource,
} from "./learning-workspace.ts";

export const inquiryQuestions = [
  "reading",
  "prediction",
  "evidence",
  "session",
] as const;
export type InquiryQuestion = (typeof inquiryQuestions)[number];
export interface InquiryAudience {
  kind: "group" | "cohort";
  phase: Phase | null;
  group: string | null;
  members: string[];
}
export interface InquiryPost {
  id: string;
  author: string;
  name: string;
  kind: "question" | "observation" | "check" | "disagreement" | "summary";
  body: string;
  provenance: string;
  links: { url: string; caption: string }[];
  createdAt: string;
  editedAt: string | null;
  removedAt: string | null;
  reason: string;
}
export interface InquiryThread {
  id: string;
  courseId: string;
  sourceId: string;
  source: LearningSource;
  question: InquiryQuestion;
  audience: InquiryAudience;
  posts: InquiryPost[];
  createdAt: string;
  closedAt: string | null;
}
export interface InquiryAttempt {
  student: string;
  sourceId: string;
  recordedAt: string;
  localRevisionFingerprint: string;
}
export interface InquiryOffer {
  id: string;
  courseId: string;
  author: string;
  attribution: string;
  source: LearningSource;
  body: string;
  provenance: string;
  offeredAt: string;
  status: "offered" | "reviewed" | "declined" | "withdrawn";
  curatedText: string;
  reason: string;
  reviewedAt: string | null;
}
export function inquiryAudience(
  value: unknown,
  course: Course,
  student: string,
  staff: boolean,
): InquiryAudience {
  const input = learningObject(value);
  learningAssert(
    input.kind === "group" || input.kind === "cohort",
    "Choose a group or course-cohort audience.",
  );
  if (input.kind === "cohort")
    return { kind: "cohort", phase: null, group: null, members: [] };
  learningAssert(
    phases.includes(input.phase as Phase),
    "Choose a project phase.",
  );
  const phase = input.phase as Phase;
  const group = course.phases[phase].groups.find(
    (group) => group.id === input.group,
  );
  learningAssert(
    group &&
      (!course.phases[phase].formation ||
        course.phases[phase].formation?.publishedAt),
    "The group allocation is not published.",
    403,
  );
  learningAssert(
    staff || group.members.includes(student),
    "You are not in this phase group.",
    403,
  );
  return {
    kind: "group",
    phase,
    group: group.id,
    members: group.members.filter((id) =>
      course.students.some((s) => s.id === id && activeStudent(s)),
    ),
  };
}
export function inquiryMember(
  thread: InquiryThread,
  course: Course,
  student: string,
  staff: boolean,
): boolean {
  if (staff) return true;
  if (!course.students.some((s) => s.id === student && activeStudent(s)))
    return false;
  if (thread.audience.kind === "cohort") return true;
  const { phase, group, members } = thread.audience;
  return Boolean(
    phase &&
    members.includes(student) &&
    (!course.phases[phase].formation ||
      course.phases[phase].formation?.publishedAt) &&
    course.phases[phase].groups.some(
      (current) => current.id === group && current.members.includes(student),
    ),
  );
}
export const inquiryOwnPosts = (thread: InquiryThread, student: string) => ({
  ...thread,
  audience: { ...thread.audience, members: [] },
  posts: thread.posts.filter((post) => post.author === student),
});
export function inquiryQuestion(value: unknown): InquiryQuestion {
  const question = learningText(
    value ?? "reading",
    "Inquiry question",
    30,
    true,
  );
  learningAssert(
    (inquiryQuestions as readonly string[]).includes(question),
    "Choose an inquiry activity.",
  );
  return question as InquiryQuestion;
}
export function publicInquiryMarkdown(offer: InquiryOffer) {
  learningAssert(
    offer.status === "reviewed" && offer.curatedText.trim(),
    "Review the offered contribution before preparing public text.",
    409,
  );
  const url = new URL(offer.source.url);
  url.hash = offer.source.anchor;
  const safe = (text: string) =>
    text
      .replace(/[<>]/g, "")
      .replace(/\[/g, "\\[")
      .replace(/\]/g, "\\]")
      .replace(/\r?\n/g, " ");
  // Editors place this text through the ordinary reviewed Markdown publishing workflow.
  return `## Reader note\n\n${safe(offer.curatedText)}\n\n— ${safe(offer.attribution)}${offer.provenance ? ` (${safe(offer.provenance)})` : ""}\n\nSource: [${safe(offer.source.title)}](${url.href})\n`;
}
