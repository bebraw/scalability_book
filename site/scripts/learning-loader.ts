import { readingSelection } from "./learning-selection.ts";
import { readNotebookSession } from "./learning-session.ts";

declare const __LEARNING_WORKSPACE_URL__: string;
let loaded: Promise<void> | null = null;
async function openNotebook(resume = false) {
  // Capture before loading or focusing the notebook can alter the selection.
  const selection = resume ? null : readingSelection();
  if (!loaded)
    loaded = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = __LEARNING_WORKSPACE_URL__;
      script.onload = () => resolve();
      script.onerror = () => {
        loaded = null;
        reject(new Error("Reload the page to load the notebook."));
      };
      document.head.append(script);
    });
  try {
    await loaded;
    document.dispatchEvent(
      new CustomEvent("book-learning-open", { detail: { selection, resume } }),
    );
  } catch (error) {
    window.alert(
      error instanceof Error ? error.message : "Notebook could not load.",
    );
  }
}
const buttons = document.querySelectorAll<HTMLButtonElement>(
  "[data-learning-toggle]",
);
for (const button of buttons) {
  button.hidden = false;
  button.addEventListener("click", () => void openNotebook());
}
// An explicitly opened notebook follows book navigation; other readers keep
// the workspace unloaded and make no companion requests.
if (buttons.length && readNotebookSession().open) void openNotebook(true);
