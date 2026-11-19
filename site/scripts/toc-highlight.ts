import { keepLinkInView } from "./navigation-scroll.ts";

const tocLinks = Array.from(
  document.querySelectorAll<HTMLAnchorElement>('.local-toc a[href^="#"]'),
);
const headingById = new Map(
  Array.from(
    document.querySelectorAll<HTMLElement>(".prose h2[id], .prose h3[id]"),
  ).map((heading) => [heading.id, heading]),
);
const tocLinkById = new Map(
  tocLinks
    .map((link) => [decodeURIComponent(link.hash.slice(1)), link] as const)
    .filter(([id]) => headingById.has(id)),
);

let pendingFrame = 0;
let activeLink: HTMLAnchorElement | undefined;

if (tocLinkById.size > 0) {
  window.addEventListener("scroll", scheduleTocHighlight, { passive: true });
  window.addEventListener("resize", scheduleTocHighlight);
  window.addEventListener("hashchange", scheduleTocHighlight);
  document
    .querySelector("[data-book-navigation]")
    ?.addEventListener("toggle", () => {
      if (activeLink) revealActiveLink(activeLink);
    });
  scheduleTocHighlight();
}

function scheduleTocHighlight() {
  cancelAnimationFrame(pendingFrame);
  pendingFrame = requestAnimationFrame(updateTocHighlight);
}

function updateTocHighlight() {
  const next = tocLinkById.get(getActiveHeadingId());
  if (!next || next === activeLink) return;
  activeLink?.classList.remove("is-current");
  activeLink?.removeAttribute("aria-current");
  activeLink = next;
  next.classList.add("is-current");
  next.setAttribute("aria-current", "location");
  revealActiveLink(next);
}

function getActiveHeadingId() {
  const hashId = decodeURIComponent(window.location.hash.slice(1));

  if (hashId && tocLinkById.has(hashId)) {
    const heading = headingById.get(hashId);

    if (
      heading &&
      Math.abs(
        heading.getBoundingClientRect().top -
          (parseFloat(getComputedStyle(heading).scrollMarginBlockStart) || 0),
      ) < 2
    ) {
      return hashId;
    }
  }

  if (
    scrollY > 0 &&
    scrollY + innerHeight >= document.documentElement.scrollHeight - 1
  ) {
    return [...tocLinkById.keys()].at(-1)!;
  }
  const activationLine = Math.min(180, window.innerHeight * 0.28);
  let activeId = tocLinkById.keys().next().value!;

  tocLinkById.forEach((_link, id) => {
    const heading = headingById.get(id);

    if (heading && heading.getBoundingClientRect().top <= activationLine) {
      activeId = id;
    }
  });

  return activeId;
}

function revealActiveLink(link: HTMLAnchorElement) {
  const list = link.closest<HTMLElement>(".book-navigation-links, .local-toc");
  if (list && !list.contains(document.activeElement))
    keepLinkInView(link, list);
}
