const root = document.documentElement;
const picker = document.querySelector<HTMLSelectElement>("[data-theme-picker]");
const toolsPanel = document.querySelector<HTMLElement>("[data-tools-panel]");
const toolsToggle = document.querySelector<HTMLButtonElement>(
  "[data-tools-toggle]",
);
const feedbackAdminLink = document.querySelector<HTMLAnchorElement>(
  "[data-feedback-admin-link]",
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
  const headerActions = toolsToggle.closest<HTMLElement>(".header-actions");
  const toolControls = Array.from(
    toolsPanel.querySelectorAll<HTMLElement>(
      "[data-editor-toggle], [data-comments-controls], [data-feedback-admin-link]",
    ),
  );

  const setToolsOpen = (open: boolean) => {
    root.dataset.toolsOpen = open ? "true" : "false";
    toolsToggle.setAttribute("aria-expanded", String(open));
  };

  const updateToolsAvailability = () => {
    const hasTools = toolControls.some((control) => !control.hidden);
    toolsToggle.hidden = !hasTools;
    root.dataset.toolsAvailable = hasTools ? "true" : "false";

    if (!hasTools) {
      setToolsOpen(false);
    }
  };

  toolsToggle.addEventListener("click", () => {
    setToolsOpen(root.dataset.toolsOpen !== "true");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.dataset.toolsOpen === "true") {
      setToolsOpen(false);
      toolsToggle.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (
      root.dataset.toolsOpen === "true" &&
      headerActions &&
      event.target instanceof Node &&
      !headerActions.contains(event.target)
    ) {
      setToolsOpen(false);
    }
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

if (feedbackAdminLink) {
  void revealFeedbackAdminLink(feedbackAdminLink);
}

async function revealFeedbackAdminLink(link: HTMLAnchorElement): Promise<void> {
  try {
    const response = await fetch("/api/auth/status", {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return;
    }

    const auth = (await response.json()) as { admin?: boolean };
    link.hidden = !auth.admin;
  } catch {
    // The public reading experience should not depend on admin discovery.
  }
}
