import {
  courseSignInDestination,
  type SiteAccount,
} from "../../shared/site-account.ts";

export async function readAccount(): Promise<SiteAccount> {
  const response = await fetch("/api/account/status", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error("Account status could not be checked. Try again.");
  return response.json();
}
export function rememberedCourse() {
  try {
    return sessionStorage.getItem("book-course-context") ?? "";
  } catch {
    return "";
  }
}
export function rememberCourse(course: string) {
  if (!/^[a-z0-9-]{1,48}$/.test(course)) return;
  try {
    sessionStorage.setItem("book-course-context", course);
  } catch {
    /* Course links remain usable without browser storage. */
  }
}
export function currentCourse() {
  return (
    new URL(location.href).searchParams.get("course") ?? rememberedCourse()
  );
}
export function signInDestination(
  returnTo = location.pathname + location.search + location.hash,
  course = currentCourse(),
) {
  return courseSignInDestination(course, returnTo);
}
export function openAccount(
  course = currentCourse(),
  returnTo = location.pathname + location.search + location.hash,
) {
  document.dispatchEvent(
    new CustomEvent("book-account-open", { detail: { course, returnTo } }),
  );
}
