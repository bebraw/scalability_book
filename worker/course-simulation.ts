import type { Course, Envelope } from "../shared/course.ts";
import { recordKey } from "../shared/course.ts";
import {
  courseSessionUser,
  handleCourseAuth,
  courseSessionCookie,
  authHash,
} from "./course-auth.ts";
import { handleCourses, type CourseUser } from "./courses.ts";
import { staffAllowed } from "./courses.ts";
import type { CourseStore } from "./course-store.ts";
import { boundedJson, sameOrigin } from "./course-http.ts";
import { Problem, requireThat, text } from "./course-validation.ts";
import {
  simulationCookie,
  simulationInitialTime,
  simulationStateKey,
  simulationStores,
  type SimulationEnvironment,
  type SimulationState,
} from "./course-simulation-store.ts";

interface SimulationContext {
  environment?: SimulationEnvironment;
  // This identity is supplied by the outer GitHub/local adapter, never request JSON.
  teacher: CourseUser | null;
  authorized: boolean;
  local?: boolean;
}
export async function simulationTeacherAllowed(
  teacher: CourseUser | null,
  admins: string[],
  liveStore?: CourseStore,
) {
  if (!teacher || teacher.provider === "email") return false;
  if (admins.includes(teacher.login.toLowerCase())) return true;
  return Boolean(
    liveStore &&
    (await liveStore.courses()).some((record) =>
      staffAllowed(record.value as Course, teacher, admins),
    ),
  );
}
const reply = (value: unknown, status = 200, extra?: HeadersInit) =>
  Response.json(value, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Course-Environment": "simulation",
      ...Object.fromEntries(new Headers(extra)),
    },
  });
const expireSession = (local: boolean) =>
  `${simulationCookie}=; Path=/api/simulation/; HttpOnly; ${local ? "" : "Secure; "}SameSite=Lax; Max-Age=0`;

function domainRequest(request: Request, pathname: string) {
  const url = new URL(request.url);
  url.pathname = pathname;
  const headers = new Headers(request.headers);
  // A live course session is never read by the simulation, or vice versa.
  const token = headers
    .get("cookie")
    ?.match(
      /(?:^|;\s*)scalableweb_simulation_session=([a-zA-Z0-9_-]{43})(?:;|$)/,
    )?.[1];
  headers.delete("cookie");
  if (token) headers.set("cookie", `${courseSessionCookie}=${token}`);
  return new Request(url, {
    method: request.method,
    headers,
    ...(request.body ? { body: request.body, duplex: "half" as const } : {}),
  });
}
function simulationResponse(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("X-Course-Environment", "simulation");
  const cookie = headers.get("set-cookie");
  if (cookie)
    headers.set(
      "set-cookie",
      cookie
        .replace(`${courseSessionCookie}=`, `${simulationCookie}=`)
        .replace("Path=/;", "Path=/api/simulation/;"),
    );
  if (headers.get("content-type")?.startsWith("text/csv")) {
    headers.set(
      "Content-Disposition",
      'attachment; filename="SIMULATION-course-grades.csv"',
    );
  }
  return new Response(response.body, { status: response.status, headers });
}

export async function handleSimulation(
  request: Request,
  context: SimulationContext,
): Promise<Response> {
  try {
    requireThat(
      context.teacher &&
        context.authorized &&
        context.teacher.provider !== "email",
      "Instructor access required for simulation.",
      403,
    );
    requireThat(
      context.environment,
      "Teacher simulation is not configured.",
      503,
    );
    const environment = context.environment,
      teacher = context.teacher;
    await environment.assertIsolated();
    const url = new URL(request.url);
    if (url.pathname === "/api/simulation/status" && request.method === "GET")
      return reply({
        environment: environment.id,
        local: Boolean(context.local),
      });
    const match = url.pathname.match(
      /^\/api\/simulation\/([a-z0-9-]+)\/([^/]+)(.*)$/,
    );
    requireThat(
      match && match[1] === environment.id,
      "Simulation environment does not match this request.",
      409,
    );
    if (request.method !== "GET") sameOrigin(request);
    const key = simulationStateKey(teacher.id);
    const current = await environment.store.get<SimulationState>(key);
    const state = current?.value;
    if (state)
      requireThat(
        current.kind === "simulation-state" &&
          state.version === 1 &&
          /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(
            state.generation,
          ),
        "Simulation control state is invalid.",
        503,
      );
    const control = match[2] === "control";
    const action = match[3];
    if (control && action === "/status" && request.method === "GET") {
      const courses = state
        ? await simulationStores(environment, teacher.id, state).store.courses()
        : [];
      return reply({
        environment: environment.id,
        state: current,
        courses: courses.map((r) => ({
          id: r.courseId,
          name: (r.value as Course).name,
          students: (r.value as Course).students,
        })),
      });
    }
    if (
      control &&
      request.method === "POST" &&
      ["/reset", "/clock", "/role"].includes(action!)
    ) {
      const body = await boundedJson(request);
      requireThat(
        body.expected === (current?.revision ?? null),
        "Simulation controls changed. Refresh before saving.",
        409,
      );
      let next: SimulationState;
      if (action === "/reset") {
        // Reset selects a new inaccessible namespace. It never deletes a resource.
        next = {
          version: 1,
          generation: crypto.randomUUID(),
          now: simulationInitialTime,
          role: null,
        };
      } else {
        requireThat(state, "Start a simulation before changing it.", 409);
        next = { ...state };
        if (action === "/clock") {
          const now = text(body.now, "Simulation time", 24, true);
          requireThat(
            Number.isFinite(Date.parse(now)) &&
              new Date(now).toISOString() === now &&
              now >= state.now,
            "Advance to a valid ISO time; reset to start again.",
          );
          next.now = now;
        } else if (body.student === null) next.role = null;
        else {
          const course = text(body.course, "Simulation course", 48, true),
            student = text(body.student, "Mock student", 100, true);
          const config = await simulationStores(
            environment,
            teacher.id,
            state,
          ).store.get<Course>(recordKey(course, "course"));
          requireThat(
            config?.value.students.some((s) => s.id === student),
            "Choose a student from this simulation generation.",
            404,
          );
          next.role = { course, student };
        }
      }
      const record: Envelope<SimulationState> = {
        key,
        courseId: key,
        kind: "simulation-state",
        value: next,
        revision: crypto.randomUUID(),
        updatedAt: new Date().toISOString(),
        actor: teacher.id,
      };
      requireThat(
        await environment.store.save(
          record,
          current?.revision ?? null,
          `Simulation ${action!.slice(1)}`,
        ),
        "Simulation controls changed. Refresh before saving.",
        409,
      );
      if ((action === "/role" || action === "/reset") && state) {
        const token = request.headers
          .get("cookie")
          ?.match(
            /(?:^|;\s*)scalableweb_simulation_session=([a-zA-Z0-9_-]{43})(?:;|$)/,
          )?.[1];
        if (token)
          await simulationStores(
            environment,
            teacher.id,
            state,
          ).auth.deleteSession(authHash(token));
      }
      return reply(
        { environment: environment.id, state: record },
        200,
        action === "/role" || action === "/reset"
          ? { "Set-Cookie": expireSession(Boolean(context.local)) }
          : undefined,
      );
    }
    requireThat(state, "Start a simulation before opening its records.", 409);
    const stores = simulationStores(environment, teacher.id, state);
    if (control && action === "/inbox" && request.method === "GET") {
      const course = text(
        url.searchParams.get("course"),
        "Simulation course",
        48,
        true,
      );
      requireThat(
        await stores.store.get(recordKey(course, "course")),
        "Simulation course not found.",
        404,
      );
      return reply({ messages: await stores.mail.list(course) });
    }
    requireThat(
      !control && match[2] === state.generation,
      "This simulation generation was reset. Refresh the simulation.",
      409,
    );
    requireThat(
      action === "/courses" ||
        action?.startsWith("/courses/") ||
        action?.startsWith("/course-auth/"),
      "Unknown simulation route.",
      404,
    );
    const adapted = domainRequest(request, `/api${action}`);
    const staffUser = { ...teacher, provider: "github" as const };
    let user = await courseSessionUser(adapted, stores);
    if (!user && state.role) {
      const config = await stores.store.get<Course>(
        recordKey(state.role.course, "course"),
      );
      const student = config?.value.students.find(
        (s) => s.id === state.role!.student,
      );
      requireThat(
        student,
        "The selected mock student no longer exists. Return to the instructor role.",
        409,
      );
      user = {
        id: student.id,
        login: student.name,
        provider: "email",
        courseId: state.role.course,
      };
    }
    // Expired/invalid simulated email sessions do not inherit the controller's
    // instructor permissions. The controller can explicitly select a role again.
    if (
      !user &&
      !request.headers.get("cookie")?.includes(`${simulationCookie}=`)
    )
      user = staffUser;
    const admins = [teacher.login.toLowerCase()];
    if (action?.startsWith("/course-auth/")) {
      return simulationResponse(
        await handleCourseAuth(adapted, {
          ...stores,
          admins,
          githubUser: user,
          local: Boolean(context.local),
          loginParameters: {
            simulation: environment.id,
            generation: state.generation,
          },
          ...(context.local ? { mockInbox: stores.mail } : {}),
        }),
      );
    }
    return simulationResponse(
      await handleCourses(adapted, {
        ...stores,
        user,
        admins,
        exportEnvironment: "simulation",
      }),
    );
  } catch (error) {
    if (error instanceof Problem)
      return reply({ message: error.message }, error.status);
    console.error(
      JSON.stringify({
        event: "course_simulation_failed",
        method: request.method,
      }),
    );
    return reply(
      { message: "Teacher simulation is temporarily unavailable." },
      503,
    );
  }
}
