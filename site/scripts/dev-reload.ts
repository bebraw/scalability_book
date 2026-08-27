const devDocumentRoot = document.documentElement;
const events = new EventSource("/api/dev/events");

events.addEventListener("open", () => {
  devDocumentRoot.dataset.devLive = "connected";
});

events.addEventListener("ready", (event) => {
  devDocumentRoot.dataset.devRevision = String(getRevision(event));
});

events.addEventListener("css", (event) => {
  const revision = getRevision(event);
  const stylesheets = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  );

  if (stylesheets.length === 0) {
    window.location.reload();
    return;
  }

  let pendingStylesheets = stylesheets.length;
  let reloadRequested = false;

  for (const stylesheet of stylesheets) {
    const replacement = stylesheet.cloneNode() as HTMLLinkElement;
    const url = new URL(stylesheet.href);
    url.searchParams.set("dev-hmr", String(revision));
    replacement.href = url.href;
    replacement.addEventListener(
      "load",
      () => {
        stylesheet.remove();
        pendingStylesheets -= 1;

        if (pendingStylesheets === 0) {
          devDocumentRoot.dataset.devRevision = String(revision);
        }
      },
      { once: true },
    );
    replacement.addEventListener(
      "error",
      () => {
        if (!reloadRequested) {
          reloadRequested = true;
          window.location.reload();
        }
      },
      { once: true },
    );
    stylesheet.after(replacement);
  }
});

events.addEventListener("reload", () => {
  window.location.reload();
});

function getRevision(event: Event): number {
  try {
    return Number(JSON.parse((event as MessageEvent<string>).data).revision);
  } catch {
    return Date.now();
  }
}
