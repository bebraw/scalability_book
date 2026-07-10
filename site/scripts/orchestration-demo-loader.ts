const roots = document.querySelectorAll<HTMLElement>(
  "[data-orchestration-lab]",
);

if (roots.length > 0) {
  if (typeof BigInt !== "function") {
    for (const root of roots) {
      root.setAttribute("data-error", "");
      const status = root.querySelector<HTMLElement>(
        "[data-orchestration-status]",
      );
      const detail = root.querySelector<HTMLElement>(
        "[data-orchestration-status-detail]",
      );
      if (status) {
        status.textContent = "This browser cannot run the teaching cluster";
      }
      if (detail) {
        detail.textContent =
          "The chapter remains available, but this demo requires BigInt support in a newer browser.";
      }
    }
  } else {
    const script = document.createElement("script");
    script.src = "/vendor/orchestration-demo.js";
    script.async = true;
    script.addEventListener("error", () => {
      for (const root of roots) {
        root.setAttribute("data-error", "");
        const status = root.querySelector<HTMLElement>(
          "[data-orchestration-status]",
        );
        const detail = root.querySelector<HTMLElement>(
          "[data-orchestration-status-detail]",
        );
        if (status) {
          status.textContent = "The teaching cluster could not be loaded";
        }
        if (detail) {
          detail.textContent =
            "Reload the page or continue with the written control-loop explanation.";
        }
      }
    });
    document.head.append(script);
  }
}
