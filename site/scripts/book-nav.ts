const bookShell = document.querySelector<HTMLElement>(".book-shell");
const contentsPanel = document.querySelector<HTMLDetailsElement>(
  '[data-book-layout-panel="contents"]',
);
const outlinePanel = document.querySelector<HTMLDetailsElement>(
  '[data-book-layout-panel="outline"]',
);

if (bookShell && contentsPanel && outlinePanel) {
  const shell = bookShell;
  const contents = contentsPanel;
  const outline = outlinePanel;
  const contentsSummary = requiredSummary(contents);
  const outlineSummary = requiredSummary(outline);
  const wideLayout = window.matchMedia("(min-width: 76.0625rem)");
  const compactBookNav = window.matchMedia("(max-width: 48rem)");
  let syncing = false;

  contents.addEventListener("toggle", syncFromPanels);
  outline.addEventListener("toggle", syncFromPanels);
  wideLayout.addEventListener("change", applyLayoutPreferences);
  compactBookNav.addEventListener("change", applyLayoutPreferences);
  applyLayoutPreferences();

  function applyLayoutPreferences(): void {
    syncing = true;

    if (wideLayout.matches) {
      contents.open = !readPreference("book-layout-contents-collapsed");
      outline.open = !readPreference("book-layout-outline-collapsed");
    } else {
      contents.open = !compactBookNav.matches;
      outline.open = true;
    }

    syncing = false;
    renderLayout();
  }

  function syncFromPanels(): void {
    if (!syncing && wideLayout.matches) {
      writePreference("book-layout-contents-collapsed", !contents.open);
      writePreference("book-layout-outline-collapsed", !outline.open);
    }

    renderLayout();
  }

  function renderLayout(): void {
    shell.dataset.bookContentsCollapsed = String(!contents.open);
    shell.dataset.localTocCollapsed = String(!outline.open);
    updateSummary(contentsSummary, contents.open, "book contents");
    updateSummary(outlineSummary, outline.open, "page outline");

    window.requestAnimationFrame(() => {
      shell.dataset.layoutReady = "true";
      window.dispatchEvent(new Event("resize"));
    });
  }

  function requiredSummary(panel: HTMLDetailsElement): HTMLElement {
    const summary = panel.querySelector<HTMLElement>("summary");
    if (!summary) {
      throw new Error("Book layout panel is missing its summary");
    }
    return summary;
  }

  function updateSummary(
    summary: HTMLElement,
    open: boolean,
    label: string,
  ): void {
    const action = open ? "Hide" : "Show";
    summary.setAttribute("aria-label", `${action} ${label}`);
    summary.title = `${action} ${label}`;
  }
}

function readPreference(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function writePreference(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // The layout still works when storage is blocked.
  }
}
