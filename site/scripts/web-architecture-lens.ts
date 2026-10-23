{
  type UpdateFlow = "mpa" | "hda" | "spa";
  const flows: Record<
    UpdateFlow,
    {
      title: string;
      steps: string[];
      response: string;
      scope: string;
      owner: string;
    }
  > = {
    mpa: {
      title: "Full-document navigation",
      steps: [
        "Browser submits POST /events",
        "Server commits the event and returns 303 Location: /activities",
        "Browser follows GET /activities",
        "Server returns text/html; browser replaces the document",
      ],
      response: "303 redirect → 200 text/html (complete document)",
      scope: "Whole document",
      owner:
        "The server renders the replacement view. Draft restoration requires an explicit policy.",
    },
    hda: {
      title: "Targeted HTML update",
      steps: [
        "Browser follows the form control: POST /events",
        "Server commits the event and returns text/html for #activity-list",
        "Browser replaces only #activity-list; the draft is outside that region",
      ],
      response: "200 text/html (activity-list fragment)",
      scope: "#activity-list only",
      owner:
        "The server renders the fragment; the browser applies it to the declared target.",
    },
    spa: {
      title: "JSON and client rendering",
      steps: [
        "Client code sends POST /events",
        "Server commits the event and returns application/json",
        "Client code updates its state and renders #activity-list; the draft is outside that region",
      ],
      response:
        '201 application/json · {"id":"E43","label":"Architecture study"}',
      scope: "Client state and activity-list view",
      owner:
        "The server defines the data contract; client code owns the resulting view and state update.",
    },
  };

  for (const root of document.querySelectorAll<HTMLElement>(
    "[data-architecture-lens]",
  )) {
    const choices = Array.from(
      root.querySelectorAll<HTMLInputElement>(
        "[data-architecture-lens-interaction]",
      ),
    );
    const draft = root.querySelector<HTMLInputElement>(
      "[data-architecture-lens-draft]",
    )!;
    const restore = root.querySelector<HTMLInputElement>(
      "[data-architecture-lens-restore]",
    )!;
    const events = root.querySelector<HTMLElement>(
      "[data-architecture-lens-events]",
    )!;
    const status = root.querySelector<HTMLElement>(
      ".architecture-lens-browser-status",
    )!;
    const readFlow = (): UpdateFlow =>
      (choices.find((choice) => choice.checked)?.value as UpdateFlow) ?? "mpa";
    const render = () => {
      const flow = readFlow();
      const selected = flows[flow];
      root.querySelector<HTMLElement>(
        "[data-architecture-lens-title]",
      )!.textContent = selected.title;
      root.querySelector<HTMLElement>(
        "[data-architecture-lens-summary]",
      )!.textContent = selected.owner;
      root
        .querySelector<HTMLElement>("[data-architecture-lens-trace]")!
        .replaceChildren(
          ...selected.steps.map((step) => {
            const li = document.createElement("li");
            li.textContent = step;
            return li;
          }),
        );
      root.querySelector<HTMLElement>(
        "[data-architecture-lens-response]",
      )!.textContent = selected.response;
      root.querySelector<HTMLElement>(
        "[data-architecture-lens-scope]",
      )!.textContent = selected.scope;
      restore.disabled = flow !== "mpa";
      events.replaceChildren();
      status.textContent =
        "Predict whether this update will preserve the draft, then reveal the modeled result.";
    };
    choices.forEach((choice) => choice.addEventListener("change", render));
    restore.addEventListener("change", render);
    root
      .querySelector("[data-architecture-lens-run]")!
      .addEventListener("click", () => {
        const flow = readFlow();
        events.replaceChildren();
        const event = document.createElement("li");
        event.dataset.addedEvent = "";
        event.textContent = "E43 · Architecture study";
        events.append(event);
        if (flow === "mpa" && !restore.checked) draft.value = "";
        status.textContent =
          flow === "mpa"
            ? restore.checked
              ? "Modeled document replacement with explicit draft restoration."
              : "Modeled document replacement: the unpreserved DOM draft reset."
            : "Modeled targeted update: the draft outside #activity-list stayed unchanged.";
      });
    render();
  }
}
