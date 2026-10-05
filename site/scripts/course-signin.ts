import { e, input } from "./course-ui.ts";
export function courseSignIn(
  course: string,
  githubUrl: string | null,
  local: boolean,
  token: string | null = null,
) {
  if (token)
    return `<section class="course-section"><h3>Confirm course sign-in</h3><p>Continue to sign in using the link from your institutional inbox. This link can be used once and expires after 15 minutes.</p><form data-form="email-verify"><button type="submit">Sign in to my course</button></form></section>`;
  return `<section class="course-section"><h3>Student sign-in</h3><p>Use the institutional email your instructor imported. Requesting a link does not enroll you in a course.</p><form data-form="email-request">${course ? `<input type="hidden" name="course" value="${e(course)}">` : input("course", "Course run ID from your instructor", "")}${input("email", "Institutional email", "", true, "email")}<button type="submit">Email me a sign-in link</button></form>${local ? '<aside class="course-note">Local development uses a mock inbox. Your local instructor can open it from Students; no mail is sent.</aside>' : ""}${githubUrl ? `<p><a href="${e(githubUrl)}?returnTo=${encodeURIComponent(location.pathname + location.search)}">Staff and existing GitHub accounts: sign in with GitHub</a></p>` : ""}</section>`;
}
