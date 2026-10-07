import type { LearningResource } from "../../shared/learning-resources.ts";
import type {
  LearningSource,
  NotebookEntry,
  NoteKind,
} from "../../shared/learning-workspace.ts";
import {
  availableLearningDemos,
  observeLearningDemo,
} from "./learning-demos.ts";
import { currentReading, pageSource } from "./learning-context.ts";

const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = "") => {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
};
interface GuideOptions {
  entries: NotebookEntry[];
  save: (
    kind: NoteKind,
    title: string,
    body: string,
    source: LearningSource,
  ) => Promise<void>;
  notes: () => void;
  leave: () => void;
  reflect: () => void;
  help: (source: LearningSource, text: string) => void;
  close: () => void;
  status: (text: string) => void;
}
interface GuideDraft {
  demo: string;
  prediction: string;
  reflection: string;
}

export function mountLearningGuide(
  container: HTMLElement,
  options: GuideOptions,
) {
  options.status("");
  const reading = currentReading();
  const intro = node("section");
  intro.className = "learning-context";
  intro.append(
    node("h3", `Explore ${reading.title}`),
    node("p", reading.prompt),
  );
  const help = node("button", "Ask my agent about this reading");
  help.type = "button";
  help.addEventListener("click", () =>
    options.help(
      pageSource(),
      `I want help getting started with this question: ${reading.prompt}`,
    ),
  );
  intro.append(help);
  const reflect = node("button", "Write a reflection on this reading");
  reflect.type = "button";
  reflect.addEventListener("click", options.reflect);
  intro.append(
    reflect,
    node(
      "p",
      "Use this prompt or follow your own question. This guide is optional.",
    ),
  );
  container.append(intro);
  const demos = availableLearningDemos();
  if (!demos.length) {
    container.append(
      node(
        "p",
        "There is no interactive demo on this page. You can reflect on the reading or ask your agent about a question.",
      ),
    );
    return;
  }
  const key = `book-learning-guide:${location.pathname}`;
  const initial = { demo: "", prediction: "", reflection: "" };
  let draft: GuideDraft = initial;
  try {
    const saved = JSON.parse(
      sessionStorage.getItem(key) ?? "null",
    ) as GuideDraft | null;
    if (
      saved &&
      typeof saved.demo === "string" &&
      typeof saved.prediction === "string" &&
      typeof saved.reflection === "string"
    )
      draft = {
        demo: saved.demo,
        prediction: saved.prediction.slice(0, 16_000),
        reflection: saved.reflection.slice(0, 16_000),
      };
  } catch {
    /* Optional tab continuity. */
  }
  const persist = () => {
    try {
      sessionStorage.setItem(key, JSON.stringify(draft));
    } catch {
      /* Keep using the guide without tab storage. */
    }
  };
  const select = node("select");
  for (const demo of demos) {
    const option = node("option", demo.title);
    option.value = demo.id;
    select.append(option);
  }
  select.value =
    demos.find((demo) => demo.id === location.hash.slice(1))?.id ??
    demos.find((demo) => demo.id === draft.demo)?.id ??
    demos[0]!.id;
  if (draft.demo !== select.value) draft = { ...initial, demo: select.value };
  const label = node("label");
  label.append(
    node(
      "span",
      reading.isChapter ? "Demo in this chapter" : "Demo on this page",
    ),
    select,
  );
  const activity = node("div");
  container.append(label, activity);
  function renderActivity(demo: LearningResource) {
    activity.replaceChildren();
    const source: LearningSource = {
      ...pageSource(),
      kind: "demo",
      title: demo.title,
      anchor: demo.id,
      excerpt: demo.caption,
      conceptIds: demo.conceptIds,
    };
    const matches = (entry: NotebookEntry) =>
      entry.source.url === source.url && entry.source.anchor === source.anchor;
    let hasInitial = options.entries.some(
      (entry) =>
        matches(entry) && entry.kind === "attempt" && entry.body.trim(),
    );
    const assumptions = node("details");
    assumptions.append(
      node("summary", "What this demo assumes"),
      node("p", demo.assumptions),
    );
    activity.append(node("h3", demo.title), assumptions);

    function step(title: string, prompt: string) {
      const section = node("section");
      section.className = "learning-guide-step";
      section.append(node("h3", title), node("p", prompt));
      const feedback = node("p");
      feedback.className = "learning-guide-feedback";
      feedback.setAttribute("role", "status");
      feedback.setAttribute("aria-live", "polite");
      activity.append(section);
      return { section, feedback };
    }
    function button(
      text: string,
      feedback: HTMLElement,
      action: () => void | Promise<void>,
    ) {
      const button = node("button", text);
      button.type = "button";
      button.addEventListener(
        "click",
        () =>
          void (async () => {
            button.disabled = true;
            try {
              await action();
            } catch (error) {
              feedback.textContent =
                error instanceof Error
                  ? error.message
                  : "This step could not be saved. Your writing is retained.";
            } finally {
              button.disabled = false;
              if (feedback.textContent)
                feedback.scrollIntoView({ block: "nearest" });
            }
          })(),
      );
      return button;
    }
    function input(
      label: string,
      value: string,
      change: (value: string) => void,
    ) {
      const textarea = node("textarea");
      textarea.rows = 4;
      textarea.maxLength = 16_000;
      textarea.value = value;
      textarea.addEventListener("input", () => {
        change(textarea.value);
        persist();
      });
      const field = node("label");
      field.append(node("span", label), textarea);
      return { field, textarea };
    }
    const first = step("1. Before trying the demo", demo.experiment!.predict);
    const prediction = input(
      "My prediction or uncertainty",
      draft.prediction,
      (value) => {
        draft.prediction = value;
      },
    );
    const second = step(
      "2. Try it in the page",
      `${demo.experiment!.try} ${demo.experiment!.observe}`,
    );
    const jump = node("a", `Go to ${demo.title}`);
    jump.href = `#${demo.id}`;
    jump.addEventListener("click", () => {
      document.getElementById(demo.id)?.scrollIntoView({ block: "center" });
      if (matchMedia("(max-width: 640px)").matches) options.close();
    });
    const instruction = node(
      "p",
      "Change the controls in the demo on this page, then choose Save demo result to keep its current inputs and displayed text as a notebook note.",
    );
    const availability = node("p");
    availability.className = "learning-hint";
    const observed = node("pre");
    observed.className = "learning-observation";
    const result = button("Save demo result", second.feedback, async () => {
      const observation = observeLearningDemo(demo.id);
      const inputs = observation.controls
        .filter((control) => "value" in control)
        .map((control) => `${control.label}: ${String(control.value)}`)
        .join("\n");
      const body = `Observed ${observation.observedAt}\n${demo.title}\n\nAssumptions: ${demo.assumptions}\n\nInputs:\n${inputs.slice(0, 4000)}\n\nDisplayed result:\n${observation.visibleText.slice(0, 9000)}\n\nThis captures browser controls and text, not canvas pixels or measured project evidence. Long output may be shortened.`;
      await options.save(
        "scratch",
        `${demo.title}: demo result`,
        body.slice(0, 16_000),
        source,
      );
      observed.textContent = `Inputs saved:\n${inputs.slice(0, 1500)}\n\nDisplayed result:\n${observation.visibleText.slice(0, 2000)}`;
      second.feedback.textContent =
        "Demo result saved. Your inputs and displayed result are shown below and kept in Notes.";
    });
    const updateAvailability = () => {
      const unavailable = document
        .getElementById(demo.id)
        ?.hasAttribute("data-error");
      result.disabled = !hasInitial || Boolean(unavailable);
      availability.textContent = unavailable
        ? "This demo is unavailable in this browser. Use the written explanation and record your own observation instead."
        : hasInitial
          ? "Your starting point is saved. Try the demo, then save its result."
          : "Save a prediction or uncertainty to enable Save demo result.";
    };
    updateAvailability();
    first.section.append(
      prediction.field,
      button("Help me get started", first.feedback, () =>
        options.help(
          source,
          prediction.textarea.value.trim() ||
            `I am unsure how to begin this investigation: ${demo.experiment!.predict}`,
        ),
      ),
      button("Save my starting point", first.feedback, async () => {
        if (!prediction.textarea.value.trim())
          throw new Error(
            "Write a prediction or one uncertainty. There is no required answer or minimum length.",
          );
        await options.save(
          "attempt",
          `${demo.title}: initial thinking`,
          prediction.textarea.value,
          source,
        );
        hasInitial = true;
        draft.prediction = "";
        prediction.textarea.value = "";
        persist();
        updateAvailability();
        first.feedback.textContent =
          "Starting point saved. You can now try the demo and save its result.";
      }),
      first.feedback,
    );
    second.section.append(
      jump,
      instruction,
      availability,
      result,
      second.feedback,
      observed,
    );
    const third = step("3. What do you think now?", demo.experiment!.reflect);
    const reflection = input(
      "My reflection on this check",
      draft.reflection,
      (value) => {
        draft.reflection = value;
      },
    );
    third.section.append(
      reflection.field,
      button("Save my reflection", third.feedback, async () => {
        if (!hasInitial)
          throw new Error(
            "Save a starting point before developing this reflection.",
          );
        if (!reflection.textarea.value.trim())
          throw new Error(
            "Record what you observed, what you think now, or what remains uncertain.",
          );
        await options.save(
          "reflection",
          `${demo.title}: reflection`,
          reflection.textarea.value,
          source,
        );
        draft.reflection = "";
        reflection.textarea.value = "";
        persist();
        third.feedback.textContent =
          "Reflection saved. You can reopen or revisit it in Notes.";
      }),
      third.feedback,
    );
    const footer = node("p");
    footer.append(
      button("Review my saved notes", third.feedback, options.notes),
      button("Return to my own question", third.feedback, options.leave),
    );
    activity.append(footer);
  }
  select.addEventListener("change", () => {
    if (
      (draft.prediction.trim() || draft.reflection.trim()) &&
      !window.confirm(
        "Change demo and clear its unfinished writing? Choose Cancel to keep this prediction or reflection.",
      )
    ) {
      select.value = draft.demo;
      return;
    }
    draft = { ...initial, demo: select.value };
    persist();
    renderActivity(demos.find((demo) => demo.id === select.value)!);
  });
  persist();
  renderActivity(demos.find((demo) => demo.id === select.value)!);
}
