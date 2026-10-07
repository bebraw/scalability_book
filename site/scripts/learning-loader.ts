import { readingSelection } from "./learning-selection.ts";
import { readNotebookSession } from "./learning-session.ts";
import type { LearningExperience } from "../../shared/learning-workspace.ts";

declare const __LEARNING_WORKSPACE_URL__: string;
let loaded: Promise<void> | null = null;
async function openLearning(experience: LearningExperience, resume = false) {
  // Capture before loading or focusing the notebook can alter the selection.
  const selection = resume ? null : readingSelection();
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
    document.dispatchEvent(
      new CustomEvent("book-learning-open", {
        detail: { selection, resume, experience },
      }),
    );
  } catch (error) {
    window.alert(
      error instanceof Error ? error.message : "Learning tools could not load.",
    );
  }
}
const buttons = document.querySelectorAll<HTMLButtonElement>(
  "[data-learning-toggle]",
);
for (const button of buttons) {
  button.hidden = false;
  button.closest<HTMLElement>(".learning-launchers")!.hidden = false;
  button.closest<HTMLElement>(".site-header")!.dataset.learningReady = "true";
  button.addEventListener(
    "click",
    () =>
      void openLearning(
        button.dataset.learningToggle === "assistant"
          ? "assistant"
          : "notebook",
      ),
  );
}
// An explicitly opened notebook follows book navigation; other readers keep
// the workspace unloaded and make no companion requests.
const session = readNotebookSession();
if (buttons.length && session.open) void openLearning(session.experience, true);
