import { e, option, localDate } from "./course-ui.ts";
import type { Envelope, Student } from "../../shared/course.ts";
import type { SimulationState } from "../../shared/course-simulation.ts";

interface SimulationStatus {
  environment: string;
  state: Envelope<SimulationState> | null;
  courses: { id: string; name: string; students: Student[] }[];
}
const query = new URLSearchParams(location.search);
export const simulationMode = query.has("simulation");
const environment = query.get("simulation") ?? "";
let generation = query.get("generation") ?? "";
let status: SimulationStatus | null = null;
let panel: HTMLElement | null = null;
let activeRole: SimulationState["role"] | undefined;
let controlsDirty = false;
export function courseApiUrl(url: string) {
  if (!simulationMode) return url;
  if (
    url === "/api/courses" ||
    url.startsWith("/api/courses/") ||
    url.startsWith("/api/course-auth/")
  ) {
    if (
      !/^[a-z0-9][a-z0-9-]{2,63}$/.test(environment) ||
      !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(generation)
    )
      throw new Error(
        "Start a valid teacher simulation before opening its records.",
      );
    return `/api/simulation/${environment}/${generation}${url.slice(4)}`;
  }
  return url;
}
async function control<T>(action: string, body?: unknown): Promise<T> {
  const response = await fetch(
    `/api/simulation/${encodeURIComponent(environment)}/control/${action}`,
    {
      method: body ? "POST" : "GET",
      credentials: "same-origin",
      ...(body
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.message);
  return data as T;
}
function controls() {
  if (!status?.state)
    return `<p>Start an empty rehearsal to work with synthetic records.</p><button type="button" data-simulation-reset>Start empty rehearsal</button>`;
  const state = status.state.value;
  const role = activeRole === undefined ? state.role : activeRole;
  const selected = role ? JSON.stringify(role) : "staff";
  return `<p class="course-muted">Each instructor has their own records and clock. Mock email stays in the inbox below.</p>
  <div class="course-grid"><form data-simulation-role><label>Rehearsal role <select name="role">${option("staff", "Instructor", selected)}${status.courses.map((c) => `<optgroup label="${e(c.name)}">${c.students.map((s) => option(JSON.stringify({ course: c.id, student: s.id }), s.name, selected)).join("")}</optgroup>`).join("")}</select></label><button>Switch role</button></form>
  <form data-simulation-clock><label>Advance simulation time <input type="datetime-local" name="now" required value="${localDate(state.now)}" min="${localDate(state.now)}"></label><button>Advance clock</button></form></div>
  <div class="course-actions">${status.courses.map((c) => `<button type="button" class="course-quiet" data-simulation-inbox="${e(c.id)}">Mock inbox · ${e(c.name)}</button>`).join("")}<button type="button" class="course-quiet" data-simulation-reset>Reset to empty rehearsal</button></div><div data-simulation-mail></div>`;
}
function renderPanel() {
  if (!panel) return;
  panel.innerHTML = `<div class="course-section-heading"><div><p class="course-eyebrow">Simulation</p><strong>Synthetic teacher rehearsal</strong>${status?.state ? `<p>Clock: ${e(new Date(status.state.value.now).toLocaleString())}</p>` : ""}</div><a href="/admin/courses/">Leave simulation</a></div><details><summary>Teacher controls</summary>${controls()}</details>`;
}
export async function initializeSimulation(
  root: HTMLElement,
  allowNavigation: () => boolean,
  tell: (message: string, error?: boolean) => void,
) {
  if (!simulationMode) return true;
  panel = document.createElement("aside");
  panel.className = "course-simulation";
  panel.setAttribute("aria-label", "Simulation environment");
  root.prepend(panel);
  // The indicator remains visible even when configuration/authentication fails.
  renderPanel();
  panel.addEventListener("input", () => {
    controlsDirty = true;
  });
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(environment))
    throw new Error("Invalid simulation environment.");
  status = await control<SimulationStatus>("status");
  if (generation && generation !== status.state?.value.generation)
    throw new Error(
      "This simulation was reset. Open it again from the instructor workspace.",
    );
  generation = status.state?.value.generation ?? "";
  if (generation) {
    const url = new URL(location.href);
    url.searchParams.set("generation", generation);
    history.replaceState(null, "", url);
  }
  renderPanel();
  const reload = () => {
    const url = new URL(location.href);
    url.searchParams.delete("course");
    url.searchParams.delete("generation");
    url.hash = "";
    location.assign(url);
  };
  panel.addEventListener("click", async (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "button",
    );
    if (
      !button ||
      (!button.hasAttribute("data-simulation-reset") &&
        !button.dataset.simulationInbox)
    )
      return;
    if (button.hasAttribute("data-simulation-reset") && !allowNavigation())
      return;
    button.disabled = true;
    try {
      if (button.hasAttribute("data-simulation-reset")) {
        if (
          status?.state &&
          !window.confirm(
            "Reset your synthetic rehearsal? Current mock records will no longer be available in this generation.",
          )
        )
          return;
        await control("reset", { expected: status?.state?.revision ?? null });
        reload();
      } else {
        const data = await control<{
          messages: { to: string; url: string; expiresAt: string }[];
        }>(
          `inbox?course=${encodeURIComponent(button.dataset.simulationInbox!)}`,
        );
        panel!.querySelector("[data-simulation-mail]")!.innerHTML =
          `<h3>Mock inbox</h3>${data.messages.length ? data.messages.map((m) => `<p><strong>${e(m.to)}</strong> · expires ${e(new Date(m.expiresAt).toLocaleString())}<br><a href="${e(m.url)}">Confirm mock sign-in</a></p>`).join("") : "<p>No messages yet. Use Email sign-in to request a mock link.</p>"}`;
      }
    } catch (error) {
      tell((error as Error).message, true);
    } finally {
      button.disabled = false;
    }
  });
  panel.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!allowNavigation()) return;
    const form = event.target as HTMLFormElement,
      values = new FormData(form),
      button = form.querySelector("button")!;
    button.disabled = true;
    try {
      if (form.hasAttribute("data-simulation-role")) {
        const role = String(values.get("role"));
        await control("role", {
          expected: status!.state!.revision,
          ...(role === "staff" ? { student: null } : JSON.parse(role)),
        });
      } else
        await control("clock", {
          expected: status!.state!.revision,
          now: new Date(String(values.get("now"))).toISOString(),
        });
      reload();
    } catch (error) {
      tell((error as Error).message, true);
    } finally {
      button.disabled = false;
    }
  });
  return Boolean(generation);
}
export async function offerSimulation(root: HTMLElement) {
  if (simulationMode || root.querySelector("[data-simulation-entry]")) return;
  let response: Response;
  try {
    response = await fetch("/api/simulation/status", {
      credentials: "same-origin",
    });
  } catch {
    return;
  }
  if (!response.ok) return;
  let data: { environment?: string };
  try {
    data = await response.json();
  } catch {
    return;
  }
  if (!data.environment || !/^[a-z0-9][a-z0-9-]{2,63}$/.test(data.environment))
    return;
  const link = document.createElement("a");
  link.className = "course-button";
  link.dataset.simulationEntry = "";
  link.href = `/admin/courses/?simulation=${encodeURIComponent(data.environment)}`;
  link.textContent = "Open teacher simulation";
  root.prepend(link);
}
export async function refreshSimulation(role: SimulationState["role"]) {
  if (!simulationMode) return;
  status = await control<SimulationStatus>("status");
  if (status.state?.value.generation !== generation)
    throw new Error(
      "The simulation changed. Open it again from the instructor workspace.",
    );
  activeRole = role;
  if (!controlsDirty) renderPanel();
}
export async function returnToSimulationInstructor() {
  await control("role", {
    expected: status?.state?.revision ?? null,
    student: null,
  });
}
