import { demoResources } from "../../shared/learning-resources.ts";
import {
  learningAssert,
  learningObject,
  learningText,
} from "../../shared/learning-workspace.ts";

type Control =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement
  | HTMLButtonElement;
const identities = new WeakMap<Control, string>();
let sequence = 0;
const controls = (root: HTMLElement) =>
  [...root.querySelectorAll<Control>("input,select,textarea,button")].filter(
    (control) =>
      control.getClientRects().length > 0 &&
      !control.closest("[hidden]") &&
      !control.disabled &&
      control.getAttribute("aria-disabled") !== "true" &&
      !control.hasAttribute("data-learning-capture") &&
      (control instanceof HTMLSelectElement ||
        control instanceof HTMLTextAreaElement ||
        (control instanceof HTMLButtonElement && control.type === "button") ||
        (control instanceof HTMLInputElement &&
          ["range", "number", "text", "checkbox", "radio"].includes(
            control.type,
          ))),
  );
function identity(control: Control) {
  if (!identities.has(control))
    identities.set(control, `control-${++sequence}`);
  return identities.get(control)!;
}
function descriptor(control: Control) {
  const label =
    control.getAttribute("aria-label") ??
    (control instanceof HTMLButtonElement
      ? control.textContent
      : [...(control.labels ?? [])]
          .map((label) => label.textContent)
          .join(" ")) ??
    control.id;
  const result: Record<string, unknown> = {
    id: identity(control),
    label: label?.replace(/\s+/g, " ").trim().slice(0, 300),
    type:
      control instanceof HTMLSelectElement
        ? "select"
        : control instanceof HTMLTextAreaElement
          ? "text"
          : control.type,
  };
  if (
    control instanceof HTMLInputElement &&
    ["checkbox", "radio"].includes(control.type)
  )
    result.value = control.checked;
  else if (!(control instanceof HTMLButtonElement))
    result.value = control.value;
  if (control instanceof HTMLSelectElement)
    result.options = [...control.options]
      .filter((option) => !option.disabled)
      .map((option) => ({ value: option.value, label: option.textContent }));
  if (
    control instanceof HTMLInputElement &&
    ["range", "number"].includes(control.type)
  )
    Object.assign(result, {
      min:
        control.min !== ""
          ? Number(control.min)
          : control.type === "range"
            ? 0
            : -1_000_000,
      max:
        control.max !== ""
          ? Number(control.max)
          : control.type === "range"
            ? 100
            : 1_000_000,
      step: control.step === "any" ? null : Number(control.step || 1),
    });
  if (result.type === "text")
    result.maxLength = Math.min(
      (control as HTMLInputElement).maxLength > 0
        ? (control as HTMLInputElement).maxLength
        : 1024,
      1024,
    );
  return result;
}
function demoRoot(id: string) {
  const resource = demoResources.find((resource) => resource.id === id);
  learningAssert(resource, "Unknown authored demo.", 404);
  const root = document.getElementById(id);
  learningAssert(
    root && root.hasAttribute("data-demo-anchor"),
    `Open ${resource.url} to run this demo. Its authored assumptions are available without executing it.`,
    409,
  );
  learningAssert(
    !root.hasAttribute("data-error"),
    "This browser reports that the demo is unavailable. Use the written explanation or a supported browser.",
    409,
  );
  return { root, resource };
}
export function observeLearningDemo(id: string) {
  const { root, resource } = demoRoot(id);
  const clone = root.cloneNode(true) as HTMLElement;
  for (const element of clone.querySelectorAll(
    "script,style,input,select,textarea,button,[hidden]",
  ))
    element.remove();
  return {
    version: 1,
    demoId: id,
    observedAt: new Date().toISOString(),
    url: `${location.origin}${location.pathname}#${id}`,
    title: resource.title,
    assumptions: resource.assumptions,
    exercise: resource.experiment,
    controls: controls(root).map(descriptor),
    visibleText: (clone.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 24_000),
    limitation:
      "This observation reports live DOM controls and textual outputs; canvas pixels and real project measurements are not inferred.",
  };
}
export async function changeLearningDemo(id: string, input: unknown) {
  const args = learningObject(input);
  const controlId = learningText(args.controlId, "Declared control", 80, true);
  const { root } = demoRoot(id);
  const control = controls(root).find(
    (control) => identity(control) === controlId,
  );
  learningAssert(
    control,
    "This control is no longer available. Observe the demo again.",
    409,
  );
  const declared = descriptor(control);
  if (control instanceof HTMLButtonElement) {
    learningAssert(args.value === null, "Button actions use a null value.");
    control.click();
  } else {
    if (
      control instanceof HTMLInputElement &&
      ["radio", "checkbox"].includes(control.type)
    ) {
      learningAssert(
        typeof args.value === "boolean",
        "Choose a boolean value.",
      );
      control.checked = args.value;
    } else if (control instanceof HTMLSelectElement) {
      learningAssert(
        typeof args.value === "string" &&
          [...control.options].some(
            (option) => !option.disabled && option.value === args.value,
          ),
        "Choose a declared option.",
      );
      control.value = args.value;
    } else if (
      control instanceof HTMLInputElement &&
      ["range", "number"].includes(control.type)
    ) {
      const value =
        typeof args.value === "number" ? args.value : Number(args.value);
      const min = Number(declared.min),
        max = Number(declared.max),
        step = declared.step as number | null;
      learningAssert(
        args.value !== null &&
          args.value !== "" &&
          Number.isFinite(value) &&
          value >= min &&
          value <= max &&
          (step === null ||
            Math.abs((value - min) / step - Math.round((value - min) / step)) <
              1e-6),
        "Use the declared numeric bounds and step.",
      );
      control.value = String(value);
    } else {
      learningAssert(
        typeof args.value === "string" &&
          args.value.length <= Number(declared.maxLength),
        "Use bounded text.",
      );
      control.value = args.value;
    }
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
  }
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );
  return observeLearningDemo(id);
}
export const availableLearningDemos = () =>
  demoResources.filter((resource) =>
    document.getElementById(resource.id)?.hasAttribute("data-demo-anchor"),
  );
