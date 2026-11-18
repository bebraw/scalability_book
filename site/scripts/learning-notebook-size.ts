import type { NotebookSize } from "./learning-session.ts";

/** Browser-only presentation preferences; resizing never reads or saves notes. */
export function mountNotebookSize(
  panel: HTMLDialogElement,
  initial: NotebookSize | null,
  save: (size: NotebookSize | null) => void,
) {
  let preferred = initial;
  const controls = document.createElement("details");
  controls.className = "learning-notebook-size";
  controls.innerHTML = `<summary aria-label="Notebook size">Size</summary>
    <div class="learning-notebook-size-options">
      <label><span>Width <output data-size-output="width"></output></span><input type="range" aria-label="Notebook width" data-size="width" step="1"></label>
      <label><span>Height <output data-size-output="height"></output></span><input type="range" aria-label="Notebook height" data-size="height" step="1"></label>
      <p data-size-hint>Limited to the available space.</p><button type="button">Reset size</button>
    </div>`;
  const close = panel.querySelector<HTMLButtonElement>(
    "[data-learning-close]",
  )!;
  const actions = document.createElement("div");
  actions.className = "learning-heading-actions";
  close.replaceWith(actions);
  actions.append(controls, close);
  const summary = controls.querySelector("summary")!;
  const dimensions = ["width", "height"] as const;
  const inputs = Object.fromEntries(
    dimensions.map((dimension) => [
      dimension,
      controls.querySelector<HTMLInputElement>(`[data-size="${dimension}"]`)!,
    ]),
  ) as Record<(typeof dimensions)[number], HTMLInputElement>;

  function apply() {
    for (const dimension of dimensions) {
      const value = preferred?.[dimension];
      const property = `--learning-notebook-${dimension}`;
      if (value == null) panel.style.removeProperty(property);
      else panel.style.setProperty(property, `${value}px`);
    }
  }

  function update() {
    if (panel.hidden) return;
    const restoreFocus =
      innerWidth <= 640 && controls.contains(document.activeElement);
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const rectangle = panel.getBoundingClientRect();
    const maximum = {
      width: Math.floor(Math.min(48 * rem, innerWidth - 2 * rem)),
      height: Math.floor(parseFloat(getComputedStyle(panel).maxHeight)),
    };
    for (const dimension of dimensions) {
      const input = inputs[dimension];
      input.min = String(Math.min(20 * rem, maximum[dimension]));
      input.max = String(maximum[dimension]);
      input.value = String(Math.round(rectangle[dimension]));
      input.disabled = innerWidth <= 640 || input.min === input.max;
      input.setAttribute("aria-valuetext", `${input.value} pixels`);
      controls.querySelector<HTMLOutputElement>(
        `[data-size-output="${dimension}"]`,
      )!.value = `${input.value} px`;
    }
    controls.querySelector("[data-size-hint]")!.textContent =
      document.body.dataset.learningAssistantOpen === "true"
        ? "Close Teaching assistant for more height."
        : "Limited to the available space.";
    if (innerWidth <= 640) {
      controls.open = false;
      if (restoreFocus) close.focus({ preventScroll: true });
    }
  }

  for (const dimension of dimensions)
    inputs[dimension].addEventListener("input", () => {
      preferred = {
        width: preferred?.width ?? null,
        height: preferred?.height ?? null,
        [dimension]: inputs[dimension].valueAsNumber,
      };
      apply();
      update();
      save(preferred);
    });
  controls.querySelector("button")!.addEventListener("click", () => {
    preferred = null;
    apply();
    update();
    save(null);
  });
  controls.addEventListener("toggle", update);
  controls.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !controls.open) return;
    event.preventDefault();
    event.stopPropagation();
    controls.open = false;
    summary.focus();
  });
  document.addEventListener("pointerdown", (event) => {
    if (event.target instanceof Node && !controls.contains(event.target))
      controls.open = false;
  });
  window.addEventListener("resize", update);
  new ResizeObserver(update).observe(panel);
  apply();
  return update;
}
