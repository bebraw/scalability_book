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
for (const paragraph of document.querySelectorAll<HTMLElement>(
  "[data-comment-target]",
)) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "paragraph-notebook-button";
  button.dataset.learningCapture = paragraph.id;
  button.textContent = "Note";
  button.setAttribute("aria-label", "Add this paragraph to my notebook");
  button.addEventListener("click", () => void openNotebook(paragraph.id));
  paragraph.append(button);
}
