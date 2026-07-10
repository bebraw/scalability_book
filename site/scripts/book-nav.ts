const bookContents = document.querySelector<HTMLDetailsElement>(
  "[data-book-contents]",
);

if (bookContents) {
  const details = bookContents;
  const compactNav = window.matchMedia("(max-width: 48rem)");
  let userToggledCompactNav = false;

  function syncBookContents(): void {
    if (compactNav.matches) {
      if (!userToggledCompactNav) {
        details.open = false;
      }
      return;
    }

    userToggledCompactNav = false;
    details.open = true;
  }

  details.addEventListener("toggle", () => {
    if (compactNav.matches) {
      userToggledCompactNav = true;
    }
  });

  compactNav.addEventListener("change", syncBookContents);
  syncBookContents();
}

const bookShell = document.querySelector<HTMLElement>(".book-shell");
const layoutControls = document.querySelector<HTMLElement>(
  "[data-book-layout-controls]",
);

if (bookShell && layoutControls) {
  const shell = bookShell;
  const controls = layoutControls;
  const contentsButton = requiredButton("contents");
  const outlineButton = requiredButton("outline");
  const focusButton = requiredButton("focus");
  const focusLabel = layoutControls.querySelector<HTMLElement>(
    "[data-book-layout-focus-label]",
  );
  const hasDemo = Boolean(
    shell.querySelector(
      ":is(.project-fit, .model-eval-demo, .observability-demo, .reflection-package-demo, .agent-fleet-demo, .scaling-demo, .orchestration-lab)",
    ),
  );
  let contentsCollapsed = readPreference("book-layout-contents-collapsed");
  let outlineCollapsed = readPreference("book-layout-outline-collapsed");
  let demoFocus = false;

  focusButton.hidden = !hasDemo;

  contentsButton.addEventListener("click", () => {
    contentsCollapsed = !contentsCollapsed;
    writePreference("book-layout-contents-collapsed", contentsCollapsed);
    renderLayout();
  });

  outlineButton.addEventListener("click", () => {
    outlineCollapsed = !outlineCollapsed;
    writePreference("book-layout-outline-collapsed", outlineCollapsed);
    renderLayout();
  });

  focusButton.addEventListener("click", () => {
    demoFocus = !demoFocus;
    renderLayout();
  });

  renderLayout();

  function requiredButton(name: string): HTMLButtonElement {
    const button = controls.querySelector<HTMLButtonElement>(
      `[data-book-layout-toggle="${name}"]`,
    );
    if (!button) {
      throw new Error(`Missing book layout control: ${name}`);
    }
    return button;
  }

  function renderLayout(): void {
    shell.dataset.bookContentsCollapsed = String(contentsCollapsed);
    shell.dataset.localTocCollapsed = String(outlineCollapsed);
    shell.dataset.demoFocus = String(demoFocus);

    const contentsHidden = demoFocus || contentsCollapsed;
    const outlineHidden = demoFocus || outlineCollapsed;
    contentsButton.setAttribute("aria-pressed", String(contentsHidden));
    contentsButton.setAttribute(
      "aria-label",
      contentsHidden ? "Show book contents" : "Hide book contents",
    );
    outlineButton.setAttribute("aria-pressed", String(outlineHidden));
    outlineButton.setAttribute(
      "aria-label",
      outlineHidden ? "Show page outline" : "Hide page outline",
    );
    contentsButton.disabled = demoFocus;
    outlineButton.disabled = demoFocus;
    focusButton.setAttribute("aria-pressed", String(demoFocus));
    focusButton.setAttribute(
      "aria-label",
      demoFocus ? "Exit demo focus" : "Enter demo focus",
    );
    if (focusLabel) {
      focusLabel.textContent = demoFocus ? "Exit demo focus" : "Focus demos";
    }

    window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
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
