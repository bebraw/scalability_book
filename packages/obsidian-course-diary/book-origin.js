// Each review build trusts its own assigned branch alias alongside the public
// book. Production builds have no preview alias.
function isBookOrigin(url) {
  if (url.username || url.password) return false;
  if (url.protocol === "http:")
    return ["127.0.0.1", "localhost"].includes(url.hostname);
  return (
    url.protocol === "https:" &&
    (url.origin === "https://scalableweb.dev" ||
      (typeof __COURSE_DIARY_PREVIEW_ORIGIN__ !== "undefined" &&
        url.origin === __COURSE_DIARY_PREVIEW_ORIGIN__))
  );
}

function matchingBookSource(app, source) {
  if (!source || source.origin !== "https://scalableweb.dev") return source;
  const origins = new Set();
  for (const leaf of app.workspace.getLeavesOfType("webviewer")) {
    try {
      const guest = leaf.view.containerEl?.querySelector?.("webview");
      const current = new URL(
        guest ? guest.getURL() : leaf.getViewState().state?.url,
      );
      if (isBookOrigin(current) && current.pathname === source.pathname)
        origins.add(current.origin);
    } catch {
      // A Web viewer may be detached or have no reading loaded yet.
    }
  }
  if (origins.size !== 1) return source;
  const destination = new URL([...origins][0]);
  destination.pathname = source.pathname;
  destination.search = source.search;
  destination.hash = source.hash;
  return destination;
}

export { isBookOrigin, matchingBookSource };
