type NavigationView = "book" | "page";

const bookShell = document.querySelector<HTMLElement>(".book-shell");
const navigationDetails = document.querySelector<HTMLDetailsElement>(
  "[data-book-navigation]",
);

if (bookShell && navigationDetails) {
  const shell = bookShell;
  const panel = navigationDetails;
  const summary = requiredElement<HTMLElement>(panel, "summary");
  const tabs = Array.from(
    panel.querySelectorAll<HTMLButtonElement>("[data-book-navigation-tab]"),
  );
  const views = Array.from(
    panel.querySelectorAll<HTMLElement>("[data-book-navigation-panel]"),
  );
  const wideLayout = window.matchMedia("(min-width: 76.0625rem)");
  const compactNavigation = window.matchMedia("(max-width: 48rem)");
  let activeView = readViewPreference();
  let syncing = false;

  panel.addEventListener("toggle", syncFromPanel);
  wideLayout.addEventListener("change", applyLayoutPreferences);
  compactNavigation.addEventListener("change", applyLayoutPreferences);

  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      activeView = getView(tab);
      writePreference("book-navigation-view", activeView);
      renderLayout();
    });

    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      event.preventDefault();
      activeView = activeView === "book" ? "page" : "book";
      writePreference("book-navigation-view", activeView);
      renderLayout();
      tabs.find((candidate) => getView(candidate) === activeView)?.focus();
    });
  }

  applyLayoutPreferences();

  function applyLayoutPreferences(): void {
    syncing = true;
    panel.open = wideLayout.matches
      ? !readBooleanPreference("book-navigation-collapsed")
      : !compactNavigation.matches;
    syncing = false;
    renderLayout();
  }

  function syncFromPanel(): void {
    if (!syncing && wideLayout.matches) {
      writePreference("book-navigation-collapsed", String(!panel.open));
    }

    renderLayout();
  }

  function renderLayout(): void {
    shell.dataset.navigationCollapsed = String(!panel.open);

    const action = panel.open ? "Hide" : "Show";
    summary.setAttribute("aria-label", `${action} navigation`);
    summary.title = `${action} navigation`;

    for (const tab of tabs) {
      const selected = getView(tab) === activeView;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }

    for (const view of views) {
      view.hidden = wideLayout.matches && getView(view) !== activeView;
    }

    window.requestAnimationFrame(() => {
      shell.dataset.layoutReady = "true";
      window.dispatchEvent(new Event("resize"));
    });
  }
}

function requiredElement<T extends Element>(
  root: ParentNode,
  selector: string,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing book navigation element: ${selector}`);
  }
  return element;
}

function getView(element: HTMLElement): NavigationView {
  const value =
    element.dataset.bookNavigationTab || element.dataset.bookNavigationPanel;
  return value === "page" ? "page" : "book";
}

function readBooleanPreference(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function readViewPreference(): NavigationView {
  try {
    return window.localStorage.getItem("book-navigation-view") === "page"
      ? "page"
      : "book";
  } catch {
    return "book";
  }
}

function writePreference(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // The navigation still works when storage is blocked.
  }
}
