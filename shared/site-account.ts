import { safeReturnTo } from "./exercises.ts";

export interface GitHubAccount {
  id: number;
  login: string;
  avatarUrl?: string | null;
  url?: string | null;
}
export interface CourseAccount {
  id: string;
  login: string;
  provider?: "github" | "email";
  courseId?: string;
}
export interface SiteAccount {
  local: boolean;
  github: {
    available: boolean;
    user: GitHubAccount | null;
    loginUrl: string | null;
  };
  course: {
    available: boolean;
    emailAvailable: boolean;
    user: CourseAccount | null;
  };
  answers: { userId: string; label: string } | null;
}

/** Inputs must come from verified sessions, never request bodies or profile matches. */
export function siteAccount(options: {
  github: GitHubAccount | null;
  course: CourseAccount | null;
  githubAvailable: boolean;
  courseAvailable: boolean;
  emailAvailable: boolean;
  local?: boolean;
}): SiteAccount {
  const github =
    options.github &&
    Number.isSafeInteger(options.github.id) &&
    options.github.id > 0
      ? options.github
      : null;
  const email =
    options.course?.provider === "email" && options.course.courseId
      ? options.course
      : null;
  return {
    local: Boolean(options.local),
    github: {
      available: options.githubAvailable,
      user: github,
      loginUrl:
        options.githubAvailable && !options.local
          ? "/api/auth/github/start"
          : null,
    },
    course: {
      available: options.courseAvailable,
      emailAvailable: options.emailAvailable,
      user: options.course,
    },
    // Keep existing GitHub ownership when both sessions are active. Local editor
    // answers also retain their historical key. Email enrollments never merge.
    answers: github
      ? {
          userId:
            options.local && github.id === 1
              ? "local-editor"
              : `github:${github.id}`,
          label: options.local ? github.login : `@${github.login}`,
        }
      : email
        ? {
            userId: `course:${email.courseId}:${email.id}`,
            label: `${email.login} · ${email.courseId}`,
          }
        : null,
  };
}

export function courseSignInDestination(course: string, returnTo: string) {
  const query = new URLSearchParams({ returnTo: safeReturnTo(returnTo) });
  if (course) query.set("course", course);
  return `/course/?${query}`;
}
