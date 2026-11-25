import { legacyRecovery } from "./learning-diary.ts";
import { mountHighlightCapture } from "./learning-highlight.ts";
import { readingSelection } from "./learning-selection.ts";
import { readLearningSession } from "./learning-session.ts";
import type { LearningAction } from "./learning-actions.ts";

declare const __LEARNING_WORKSPACE_URL__: string;
let loaded: Promise<void> | null = null;
async function openAssistant(resume = false, currentReading = false) {
  // Capture before focusing the assistant can alter the selection.
  const selection = resume ? null : readingSelection();
  if (!(await loadLearning())) return;
  document.dispatchEvent(
    new CustomEvent("book-learning-open", {
      detail: { selection, resume, currentReading },
    }),
  );
}
async function loadLearning() {
  if (!loaded)
    loaded = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = __LEARNING_WORKSPACE_URL__;
      script.onload = () => resolve();
      script.onerror = () => {
        loaded = null;
        reject(new Error("Reload the page to load the learning tools."));
      };
      document.head.append(script);
    });
  try {
    await loaded;
    return true;
  } catch (error) {
    window.alert(
      error instanceof Error ? error.message : "Learning tools could not load.",
    );
    return false;
  }
}
document.addEventListener("book-learning-request", (event) => {
  const action = (event as CustomEvent<LearningAction>).detail;
  void loadLearning().then((ready) => {
    if (ready)
      document.dispatchEvent(
        new CustomEvent("book-learning-action", { detail: action }),
      );
  });
});
mountHighlightCapture();
const assistant = document.querySelector<HTMLButtonElement>(
  '[data-learning-toggle="assistant"]',
);
const assistantRequested =
  new URLSearchParams(location.search).get("assistant") === "1";
if (assistant) {
  assistant.hidden = false;
  assistant.closest<HTMLElement>(".learning-launchers")!.hidden = false;
  assistant.addEventListener("click", () => void openAssistant());
  if (!legacyRecovery) {
    if (assistantRequested) void openAssistant(false, true);
    else if (readLearningSession().assistantOpen) void openAssistant(true);
  }
}

const cockpit = document.querySelector<HTMLButtonElement>(
  "[data-learning-cockpit]",
);
if (cockpit) {
  cockpit.hidden = false;
  cockpit.addEventListener("click", () => {
    const selection = readingSelection();
    document.dispatchEvent(
      new CustomEvent("book-learning-request", {
        detail: { kind: "investigate", selection },
      }),
    );
  });
}
// Small launchers activate the same cockpit beside any authored demo. No model,
// notebook read or companion connection occurs until the reader chooses it.
for (const demo of document.querySelectorAll<HTMLElement>(
  "[data-demo-anchor]",
)) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "learning-loop-launch";
  button.dataset.investigateDemo = demo.id;
  button.textContent = "Explore this idea";
  button.addEventListener("click", () =>
    document.dispatchEvent(
      new CustomEvent("book-learning-request", {
        detail: { kind: "investigate", demoId: demo.id },
      }),
    ),
  );
  demo.after(button);
}
const tutorialLink = (url: URL) =>
  url.origin === location.origin &&
  url.pathname === "/notebook/setup/" &&
  url.hash === "#try-the-learning-tutorial";
const openTutorial = () =>
  document.dispatchEvent(
    new CustomEvent("book-learning-request", {
      detail: { kind: "investigate", tutorial: true },
    }),
  );
document.addEventListener("click", (event) => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const link =
    event.target instanceof Element ? event.target.closest("a") : null;
  if (
    link?.href &&
    (!link.target || link.target === "_self") &&
    tutorialLink(new URL(link.href)) &&
    location.pathname === "/notebook/setup/"
  ) {
    event.preventDefault();
    openTutorial();
  }
});
window.addEventListener("hashchange", () => {
  if (tutorialLink(new URL(location.href))) openTutorial();
});
if (tutorialLink(new URL(location.href))) openTutorial();
else if (!assistantRequested && !legacyRecovery)
  try {
    const saved = JSON.parse(
      sessionStorage.getItem("book-learning-cockpit-active") ?? "null",
    );
    if (saved?.open && new URL(saved.source.url).pathname === location.pathname)
      document.dispatchEvent(
        new CustomEvent("book-learning-request", {
          detail: { kind: "investigate", resume: true },
        }),
      );
  } catch {
    /* Learning works without tab storage. */
  }
