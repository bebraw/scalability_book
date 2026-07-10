const root = document.documentElement;
const picker = document.querySelector<HTMLSelectElement>("[data-theme-picker]");
const toolsPanel = document.querySelector<HTMLElement>("[data-tools-panel]");
const toolsToggle = document.querySelector<HTMLButtonElement>(
  "[data-tools-toggle]",
);
const storedTheme = localStorage.getItem("theme");
const fallbackTheme = matchMedia("(prefers-color-scheme: dark)").matches
  ? "dark"
  : "light";
const activeTheme = storedTheme || fallbackTheme;

root.dataset.theme = activeTheme;
if (picker) {
  picker.value = activeTheme;
  picker.addEventListener("change", () => {
    root.dataset.theme = picker.value;
    localStorage.setItem("theme", picker.value);
  });
}

if (toolsPanel && toolsToggle) {
  const toolControls = Array.from(
    toolsPanel.querySelectorAll<HTMLElement>(
      "[data-editor-toggle], [data-comments-controls]",
    ),
  );

  const updateToolsAvailability = () => {
    const hasTools = toolControls.some((control) => !control.hidden);
    toolsToggle.hidden = !hasTools;
    root.dataset.toolsAvailable = hasTools ? "true" : "false";

    if (!hasTools) {
      root.dataset.toolsOpen = "false";
      toolsToggle.setAttribute("aria-expanded", "false");
    }
  };

  toolsToggle.addEventListener("click", () => {
    const isOpen = root.dataset.toolsOpen === "true";
    root.dataset.toolsOpen = isOpen ? "false" : "true";
    toolsToggle.setAttribute("aria-expanded", String(!isOpen));
  });

  const observer = new MutationObserver(updateToolsAvailability);
  for (const control of toolControls) {
    observer.observe(control, {
      attributes: true,
      attributeFilter: ["hidden"],
    });
  }

  updateToolsAvailability();
}
