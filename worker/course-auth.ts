import { createHash, randomBytes } from "node:crypto";
import { recordKey, type Course } from "../shared/course.ts";
import type { CourseStore } from "./course-store.ts";
import { staffAllowed, type CourseUser } from "./courses.ts";
import type { CourseAuthStore } from "./course-auth-store.ts";
import type { MockMailStore } from "./course-mock-mail.ts";
import { boundedJson, sameOrigin } from "./course-http.ts";
import { safeReturnTo } from "../shared/exercises.ts";
import {
  institutionalEmail,
  Problem,
  requireThat,
  text,
} from "./course-validation.ts";

export const linkLifetimeSeconds = 15 * 60;
export const sessionLifetimeSeconds = 7 * 24 * 60 * 60;
export const courseSessionCookie = "scalableweb_course_session";
export const authHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export interface LoginMail {
  course: string;
  courseName: string;
  to: string;
  url: string;
  expiresAt: string;
}
export interface CourseMailTransport {
  send(message: LoginMail): Promise<void>;
}
export interface AuthContext {
  store?: CourseStore;
  auth?: CourseAuthStore;
  mail?: CourseMailTransport;
  now?: string;
  local?: boolean;
  githubUser?: CourseUser | null;
  githubLoginUrl?: string | null;
  mockInbox?: MockMailStore;
  admins?: string[];
  defer?: (task: Promise<void>) => void;
  loginOrigin?: string;
  loginParameters?: Record<string, string>;
}
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  Vary: "Cookie",
  "Referrer-Policy": "no-referrer",
};
const reply = (value: unknown, status = 200, extra?: HeadersInit) =>
  Response.json(value, {
    status,
    headers: { ...headers, ...Object.fromEntries(new Headers(extra)) },
  });
const cookie = (value: string, local: boolean, maxAge: number) =>
  `${courseSessionCookie}=${value}; Path=/; HttpOnly; ${local ? "" : "Secure; "}SameSite=Lax; Max-Age=${maxAge}`;
function sessionToken(request: Request) {
  const value = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)scalableweb_course_session=([a-zA-Z0-9_-]{43})(?:;|$)/);
  return value?.[1] ?? null;
}
export async function courseSessionUser(
  request: Request,
  context: Pick<AuthContext, "auth" | "store" | "now">,
): Promise<CourseUser | null> {
  const token = sessionToken(request);
  if (!token || !context.auth || !context.store) return null;
  const value = await context.auth.session(
    authHash(token),
    context.now ?? new Date().toISOString(),
  );
  if (!value) return null;
  const course = await context.store.get<Course>(
    recordKey(value.course, "course"),
  );
  const student = course?.value.students.find(
    (s) => s.id === value.student && s.email === value.email,
  );
  return student
    ? {
        id: student.id,
        login: student.name,
        provider: "email",
        courseId: value.course,
      }
    : null;
}

async function quota(
  request: Request,
  auth: CourseAuthStore,
  now: string,
  scope: string,
  identifier: string,
  maximum: number,
) {
  const window = 10 * 60 * 1000;
  const start = Math.floor(Date.parse(now) / window) * window;
  const ip = request.headers.get("CF-Connecting-IP") ?? "loopback";
  return auth.quota(
    `${scope}:${start}:${authHash(identifier || ip)}`,
    maximum,
    new Date(start + window).toISOString(),
  );
}

export async function handleCourseAuth(
  request: Request,
  context: AuthContext,
): Promise<Response> {
  const url = new URL(request.url);
  const now = context.now ?? new Date().toISOString();
  try {
    if (request.method !== "GET") sameOrigin(request);
    if (
      url.pathname === "/api/course-auth/status" &&
      request.method === "GET"
    ) {
      const user =
        (await courseSessionUser(request, context)) ??
        context.githubUser ??
        null;
      return reply({
        authenticated: Boolean(user),
        user,
        local: Boolean(context.local),
        loginUrl: context.githubLoginUrl ?? null,
      });
    }
    if (
      url.pathname === "/api/course-auth/logout" &&
      request.method === "POST"
    ) {
      const token = sessionToken(request);
      if (token && context.auth)
        await context.auth.deleteSession(authHash(token));
      return reply({ ok: true }, 200, {
        "Set-Cookie": cookie("", Boolean(context.local), 0),
      });
    }
    requireThat(
      context.auth && context.store,
      "Course sign-in is unavailable.",
      503,
    );
    const auth = context.auth,
      store = context.store;
    if (
      url.pathname === "/api/course-auth/mock-inbox" &&
      request.method === "GET"
    ) {
      requireThat(
        context.local && context.mockInbox,
        "Unknown sign-in route.",
        404,
      );
      const user =
        (await courseSessionUser(request, context)) ?? context.githubUser;
      const courseId = text(
        url.searchParams.get("course"),
        "Course ID",
        48,
        true,
      );
      const course = await store.get<Course>(recordKey(courseId, "course"));
      requireThat(
        course &&
          user &&
          staffAllowed(course.value, user, context.admins ?? []),
        "Staff access required.",
        403,
      );
      return reply({ messages: await context.mockInbox.list(courseId) });
    }
    requireThat(request.method === "POST", "Method not allowed.", 405);
    const body = await boundedJson(request);
    if (url.pathname === "/api/course-auth/request") {
      requireThat(
        context.mail,
        "Course login email is not configured yet.",
        503,
      );
      const mail = context.mail;
      const courseId = text(body.course, "Course run ID", 48, true);
      const email = institutionalEmail(body.email);
      const returnTo =
        typeof body.returnTo === "string" && body.returnTo.length <= 4096
          ? safeReturnTo(body.returnTo)
          : null;
      await auth.cleanup(now);
      requireThat(
        await quota(request, auth, now, "request-ip", "", 30),
        "Too many sign-in requests. Try again in ten minutes.",
        429,
      );
      const allowed = await quota(
        request,
        auth,
        now,
        "request-email",
        `${courseId}:${email}`,
        3,
      );
      const course = await store.get<Course>(recordKey(courseId, "course"));
      const student = course?.value.students.find((s) => s.email === email);
      if (allowed && student && course) {
        const token = randomBytes(32).toString("base64url"),
          hash = authHash(token);
        const expiresAt = new Date(
          Date.parse(now) + linkLifetimeSeconds * 1000,
        ).toISOString();
        await auth.issue(hash, {
          course: courseId,
          student: student.id,
          email,
          expiresAt,
        });
        const deliver = async () => {
          try {
            const loginUrl = new URL(
              "/course/",
              context.loginOrigin ?? url.origin,
            );
            loginUrl.searchParams.set("course", courseId);
            if (returnTo) loginUrl.searchParams.set("returnTo", returnTo);
            for (const [key, value] of Object.entries(
              context.loginParameters ?? {},
            ))
              loginUrl.searchParams.set(key, value);
            loginUrl.hash = `login=${token}`;
            await mail.send({
              course: courseId,
              courseName: course.value.name,
              to: email,
              url: loginUrl.href,
              expiresAt,
            });
            await auth.ready(hash);
          } catch {
            await auth.discard(hash);
            console.error(
              JSON.stringify({
                event: "course_login_delivery_failed",
                course: courseId,
              }),
            );
          }
        };
        if (context.defer) context.defer(deliver());
        else await deliver();
      }
      return reply(
        {
          message:
            "If that address is enrolled, a sign-in link will arrive shortly. Links expire after 15 minutes. You can request up to three links per ten minutes.",
        },
        202,
      );
    }
    if (url.pathname === "/api/course-auth/verify") {
      requireThat(
        await quota(request, auth, now, "verify-ip", "", 15),
        "Too many attempts. Try again in ten minutes.",
        429,
      );
      const token = text(body.token, "Sign-in link", 43, true);
      requireThat(
        /^[a-zA-Z0-9_-]{43}$/.test(token),
        "This sign-in link is invalid or expired.",
        400,
      );
      const value = await auth.consume(authHash(token), now);
      requireThat(
        value,
        "This sign-in link is invalid, expired or already used.",
        400,
      );
      const course = await store.get<Course>(recordKey(value.course, "course"));
      const student = course?.value.students.find(
        (s) => s.id === value.student && s.email === value.email,
      );
      requireThat(
        student,
        "This sign-in link is invalid, expired or already used.",
        400,
      );
      const session = randomBytes(32).toString("base64url");
      await auth.saveSession(authHash(session), {
        ...value,
        expiresAt: new Date(
          Date.parse(now) + sessionLifetimeSeconds * 1000,
        ).toISOString(),
      });
      await auth.recordAccess(value.course, student.id, now);
      return reply({ course: value.course }, 200, {
        "Set-Cookie": cookie(
          session,
          Boolean(context.local),
          sessionLifetimeSeconds,
        ),
      });
    }
    throw new Problem("Unknown sign-in route.", 404);
  } catch (error) {
    if (error instanceof Problem)
      return reply({ message: error.message }, error.status);
    console.error(
      JSON.stringify({ event: "course_auth_failed", method: request.method }),
    );
    return reply(
      { message: "Course sign-in is temporarily unavailable." },
      503,
    );
  }
}
