import { keepLinkInView } from "./navigation-scroll.ts";

const panel = document.querySelector<HTMLDetailsElement>(
  "[data-book-navigation]",
);
if (panel) enableBookNavigation(panel);

function enableBookNavigation(panel: HTMLDetailsElement) {
  const summary = panel.querySelector("summary")!;
  const wide = matchMedia("(min-width: 76.0625rem)");
  let desktopOpen = true;
  try {
    desktopOpen = localStorage.getItem("book-navigation-collapsed") !== "true";
  } catch {
    // The disclosure also works without browser storage.
  }

  function applyLayout() {
    panel.open = wide.matches && desktopOpen;
    updateDisclosure();
  }

  function updateDisclosure() {
    const action = panel.open ? "Hide navigation" : "Show navigation";
    summary.setAttribute("aria-label", action);
    summary.title = action;
    if (panel.open) {
      const current = panel.querySelector<HTMLElement>(
        'a[aria-current="page"]',
      );
      const list = current?.closest<HTMLElement>(".book-navigation-links");
      if (current && list) keepLinkInView(current, list);
    }
    // Let the outline and chapter demos measure the new layout.
    window.dispatchEvent(new Event("resize"));
  }

  panel.addEventListener("toggle", () => {
    if (wide.matches && desktopOpen !== panel.open) {
      desktopOpen = panel.open;
      try {
        localStorage.setItem("book-navigation-collapsed", String(!desktopOpen));
      } catch {
        // Keep the choice for this page when storage is unavailable.
      }
    }
    updateDisclosure();
  });

  summary.addEventListener("click", () => {
    if (!wide.matches || window.scrollY === 0) return;
    // Resizing chapter figures can move the passage a reader is following.
    const passage = document
      .elementFromPoint(innerWidth / 2, innerHeight / 2)
      ?.closest(".prose > *");
    if (!passage) return;
    const top = passage.getBoundingClientRect().top;
    requestAnimationFrame(() => {
      window.scrollBy({
        top: passage.getBoundingClientRect().top - top,
        behavior: "instant",
      });
    });
  });

  panel.addEventListener("click", (event) => {
    if (
      wide.matches ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>('.local-toc a[href^="#"]')
        : null;
    if (!link) return;
    const heading = document.getElementById(
      decodeURIComponent(link.hash.slice(1)),
    );
    if (heading) {
      panel.open = false;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  });

  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !wide.matches && panel.open) {
      event.preventDefault();
      event.stopPropagation();
      panel.open = false;
      summary.focus();
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (
      !wide.matches &&
      panel.open &&
      event.target instanceof Node &&
      !panel.contains(event.target)
    )
      panel.open = false;
  });
  panel.addEventListener("focusout", (event) => {
    if (
      !wide.matches &&
      event.relatedTarget instanceof Node &&
      !panel.contains(event.relatedTarget)
    )
      panel.open = false;
  });

  wide.addEventListener("change", applyLayout);
  applyLayout();
}
