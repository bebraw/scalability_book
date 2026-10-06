import { LearningClient } from "./learning-client.ts";

declare const __LEARNING_WORKSPACE_URL__: string;
let loaded: Promise<void> | null = null;
async function openNotebook(target?: string) {
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
      new CustomEvent("book-learning-open", { detail: { target } }),
    );
  } catch (error) {
    window.alert(
      error instanceof Error ? error.message : "Notebook could not load.",
    );
  }
}
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-learning-toggle]",
)) {
  button.hidden = false;
  button.addEventListener("click", () => void openNotebook());
}
function showCaptureButtons(connected: boolean) {
  for (const paragraph of document.querySelectorAll<HTMLElement>(
    "[data-comment-target]",
  )) {
    let button = paragraph.querySelector<HTMLButtonElement>(
      ":scope > [data-learning-capture]",
    );
    if (!button && connected) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "paragraph-notebook-button";
      button.dataset.learningCapture = paragraph.id;
      button.textContent = "Note";
      button.setAttribute("aria-label", "Add this paragraph to my notebook");
      button.addEventListener("click", () => void openNotebook(paragraph.id));
      paragraph.append(button);
    }
    if (button) button.hidden = !connected;
  }
}

let connectionRevision = 0;
document.addEventListener("book-learning-connection", (event) => {
  const { connected } = (event as CustomEvent<{ connected: boolean }>).detail;
  connectionRevision++;
  showCaptureButtons(connected);
});
// Restoring a connection must not load the workspace or contact the companion
// for casual readers, nor override a newer pairing/disconnection in this page.
const restored = new LearningClient();
if (restored.token)
  void restored.status().then(
    () => {
      if (connectionRevision === 0) showCaptureButtons(true);
    },
    () => {
      /* Keep capture hidden until the student reconnects through Notebook. */
    },
  );
