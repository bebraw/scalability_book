import type { LearningExperience } from "../../shared/learning-workspace.ts";
import type { NotebookView } from "./learning-session.ts";

const sections = {
  notebook: [
    ["write", "Write"],
    ["notes", "Notes"],
    ["concepts", "Concepts"],
    ["prepare", "Prepare"],
  ],
  assistant: [
    ["agent", "Discuss"],
    ["guide", "Chapter guide"],
    ["peers", "Peer discussion"],
  ],
} as const;

/** Experience navigation owns presentation only, independently of providers/stores. */
export function mountLearningNavigation(
  panel: HTMLDialogElement,
  experience: LearningExperience,
  view: NotebookView,
  navigate: (view: NotebookView) => void,
  switchExperience: (experience: LearningExperience) => void,
) {
  const name =
    experience === "notebook" ? "My learning notebook" : "Teaching assistant";
  panel.setAttribute("aria-label", name);
  panel.querySelector<HTMLElement>(".learning-eyebrow")!.textContent = name;
  panel.querySelector<HTMLElement>(".learning-purpose")!.textContent =
    experience === "notebook"
      ? "Keep and organize your thinking."
      : "Explore a question and choose the support you need.";
  panel
    .querySelector("[data-learning-close]")!
    .setAttribute(
      "aria-label",
      experience === "notebook" ? "Close notebook" : "Close teaching assistant",
    );
  const switcher = panel.querySelector<HTMLElement>(".learning-experiences")!;
  switcher.replaceChildren();
  for (const [id, title] of [
    ["notebook", "Notebook"],
    ["assistant", "Teaching assistant"],
  ] as const) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = title;
    button.setAttribute("aria-pressed", String(experience === id));
    button.addEventListener("click", () => switchExperience(id));
    switcher.append(button);
  }
  const tabs = panel.querySelector<HTMLElement>(".learning-tabs")!;
  tabs.setAttribute("aria-label", `${name} sections`);
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
  tools.open = view === "connect" || view === "prepare";
  for (const [id, label] of [
    ...sections[experience],
    ["connect", "Connect"],
  ] as const) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.setAttribute("aria-current", String(view === id));
    button.addEventListener("click", () => navigate(id));
    (id === "prepare" || id === "connect" ? menu : primary).append(button);
  }
  tabs.append(primary, tools);
}
