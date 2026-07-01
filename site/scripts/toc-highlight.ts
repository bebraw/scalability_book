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

if (tocLinkById.size > 0) {
  window.addEventListener("scroll", scheduleTocHighlight, { passive: true });
  window.addEventListener("resize", scheduleTocHighlight);
  window.addEventListener("hashchange", scheduleTocHighlight);
  scheduleTocHighlight();
}

function scheduleTocHighlight() {
  cancelAnimationFrame(pendingFrame);
  pendingFrame = requestAnimationFrame(updateTocHighlight);
}

function updateTocHighlight() {
  const activeId = getActiveHeadingId();

  tocLinkById.forEach((link, id) => {
    const active = id === activeId;

    link.classList.toggle("is-current", active);

    if (active) {
      link.setAttribute("aria-current", "location");
      keepTocLinkVisible(link);
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function getActiveHeadingId() {
  const hashId = decodeURIComponent(window.location.hash.slice(1));

  if (hashId && tocLinkById.has(hashId)) {
    const heading = headingById.get(hashId);

    if (heading && Math.abs(heading.getBoundingClientRect().top) < 24) {
      return hashId;
    }
  }

  const activationLine = Math.min(180, window.innerHeight * 0.28);
  let activeId = tocLinkById.keys().next().value as string | undefined;

  tocLinkById.forEach((_link, id) => {
    const heading = headingById.get(id);

    if (heading && heading.getBoundingClientRect().top <= activationLine) {
      activeId = id;
    }
  });

  return activeId;
}

function keepTocLinkVisible(link: HTMLAnchorElement) {
  const toc = link.closest<HTMLElement>(".local-toc");

  if (!toc || toc.scrollHeight <= toc.clientHeight) {
    return;
  }

  link.scrollIntoView({ block: "nearest" });
}
