import { e, option, localDate } from "./course-ui.ts";
import type { Envelope, Student } from "../../shared/course.ts";
import {
  simulationPresetVersion,
  type SimulationState,
} from "../../shared/course-simulation.ts";

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
  const fixtures = `<p class="course-muted">For a manual walkthrough: <a href="/api/simulation/${e(environment)}/control/roster?size=compact">Download mock roster (10 students)</a> · <a href="/api/simulation/${e(environment)}/control/roster?size=larger">Larger roster (31)</a> · <a href="/api/simulation/${e(environment)}/control/source">Download tiny source fixture</a>. The source demonstrates transitions and summary; its README states the missing project work.</p>`;
  const presetForm = `<form data-simulation-preset><div class="course-grid"><label>Starting scenario <select name="preset">${option("preparation", "Course preparation", status?.state?.value.preset?.id ?? "preparation")}${option("grading-review", "Grading review", status?.state?.value.preset?.id ?? "preparation")}${option("empty", "Empty rehearsal", status?.state?.value.preset?.id ?? "preparation")}</select></label><label>Cohort size <select name="size">${option("compact", "Compact · 10 students", status?.state?.value.preset?.size ?? "compact")}${option("larger", "Larger · 31 students", status?.state?.value.preset?.size ?? "compact")}</select></label></div><button>${status?.state ? "Restart selected scenario" : "Start selected scenario"}</button></form>${fixtures}`;
  if (!status?.state)
    return `<p>Choose a synthetic starting point. Fixture edition ${e(simulationPresetVersion)}.</p>${presetForm}`;
  const state = status.state.value;
  if (state.preparing)
    return `<p role="status">Preparing ${e(state.preparing.selection.id)}: ${state.preparing.cursor}/${state.preparing.total} steps saved. The rehearsal opens when preparation finishes.</p><button type="button" data-simulation-continue>Continue preparation</button>${presetForm}`;
  const role = activeRole === undefined ? state.role : activeRole;
  const selected = role ? JSON.stringify(role) : "staff";
  return `<p class="course-muted">Each instructor has their own records and clock. Mock email stays in the inbox below. Fixture edition ${e(state.preset?.version ?? "manual")}.</p>
  <div class="course-grid"><form data-simulation-role><label>Rehearsal role <select name="role">${option("staff", "Instructor", selected)}${status.courses.map((c) => `<optgroup label="${e(c.name)}">${c.students.map((s) => option(JSON.stringify({ course: c.id, student: s.id }), s.name, selected)).join("")}</optgroup>`).join("")}</select></label><button>Switch role</button></form>
  <form data-simulation-clock><label>Advance simulation time <input type="datetime-local" name="now" required value="${localDate(state.now)}" min="${localDate(state.now)}"></label><button>Advance clock</button></form></div>
  <div class="course-actions">${status.courses.map((c) => `<button type="button" class="course-quiet" data-simulation-inbox="${e(c.id)}">Mock inbox · ${e(c.name)}</button>`).join("")}<button type="button" class="course-quiet" data-simulation-reset>Reset to empty rehearsal</button></div><div data-simulation-mail></div><details><summary>Choose a starting scenario</summary>${presetForm}</details>`;
}
function renderPanel() {
  if (!panel) return;
  const open =
    panel.querySelector<HTMLDetailsElement>("details")?.open ??
    Boolean(status?.state?.value.preparing);
  panel.innerHTML = `<div class="course-section-heading"><div><p class="course-eyebrow">Simulation</p><strong>Synthetic teacher rehearsal</strong>${status?.state ? `<p>Clock: ${e(new Date(status.state.value.now).toLocaleString())}</p>` : ""}</div><a href="/admin/courses/">Leave simulation</a></div><details ${open ? "open" : ""}><summary>Teacher controls</summary>${controls()}</details>`;
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
  const continuePreparation = async () => {
    while (status?.state?.value.preparing) {
      const result = await control<Pick<SimulationStatus, "state">>("prepare", {
        expected: status.state.revision,
      });
      status = { ...status, state: result.state };
      renderPanel();
      panel!.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
        button.disabled = true;
      });
    }
    reload();
  };
  panel.addEventListener("click", async (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "button",
    );
    if (
      !button ||
      (!button.hasAttribute("data-simulation-reset") &&
        !button.hasAttribute("data-simulation-continue") &&
        !button.dataset.simulationInbox)
    )
      return;
    if (
      (button.hasAttribute("data-simulation-reset") ||
        button.hasAttribute("data-simulation-continue")) &&
      !allowNavigation()
    )
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
        await control("reset", {
          expected: status?.state?.revision ?? null,
          preset: "empty",
        });
        reload();
      } else if (button.hasAttribute("data-simulation-continue")) {
        await continuePreparation();
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
      if (status?.state?.value.preparing) {
        status = await control<SimulationStatus>("status");
        renderPanel();
      }
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
      if (form.hasAttribute("data-simulation-preset")) {
        if (
          status?.state &&
          !window.confirm(
            "Restart your synthetic rehearsal with the selected scenario? Current mock records will no longer be available in this generation.",
          )
        )
          return;
        const result = await control<Pick<SimulationStatus, "state">>("reset", {
          expected: status?.state?.revision ?? null,
          preset: String(values.get("preset")),
          size: String(values.get("size")),
        });
        status = { ...status!, state: result.state };
        renderPanel();
        await continuePreparation();
        return;
      } else if (form.hasAttribute("data-simulation-role")) {
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
      if (status?.state?.value.preparing) {
        status = await control<SimulationStatus>("status");
        renderPanel();
      }
    } finally {
      button.disabled = false;
    }
  });
  return Boolean(generation && !status?.state?.value.preparing);
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
