import type { AssistantView } from "./learning-session.ts";

export function syncLearningLaunchers(panel: HTMLDialogElement) {
  const button = document.querySelector<HTMLButtonElement>(
    '[data-learning-toggle="assistant"]',
  );
  button?.setAttribute("aria-expanded", String(!panel.hidden));
  button?.setAttribute("aria-controls", panel.id);
}

/** Experience navigation owns presentation only, independently of providers/stores. */
export function mountLearningNavigation(
  panel: HTMLDialogElement,
  view: AssistantView,
  navigate: (view: AssistantView | "guide") => void,
) {
  const tabs = panel.querySelector<HTMLElement>(".learning-tabs")!;
  tabs.replaceChildren();
  const primary = document.createElement("div");
  primary.className = "learning-tab-primary";
  const tools = document.createElement("details");
  tools.className = "learning-tools";
  const summary = document.createElement("summary");
  summary.textContent = "More learning tools";
  const menu = document.createElement("div");
  menu.className = "learning-tools-menu";
  tools.append(summary, menu);
  tools.open = view === "connect";
  for (const [id, label] of [
    ["agent", "Discuss"],
    ["guide", "Chapter guide"],
    ["peers", "Peer discussion"],
    ["connect", "Connect"],
  ] as const) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.setAttribute("aria-current", String(view === id));
    button.addEventListener("click", () => navigate(id));
    (id === "connect" ? menu : primary).append(button);
  }
  tabs.append(primary, tools);
}
