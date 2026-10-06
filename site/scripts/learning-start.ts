import { demoResources } from "../../shared/learning-resources.ts";
import type {
  LearningSource,
  NotebookEntry,
  NoteKind,
} from "../../shared/learning-workspace.ts";
import { observeLearningDemo } from "./learning-demos.ts";

const demo = demoResources.find(
  (demo) => demo.id === "demo-queue-balance-lab",
)!;
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = "") => {
  const result = document.createElement(tag);
  result.textContent = text;
  return result;
};
export function mountLearningStart(
  container: HTMLElement,
  options: {
    entries: NotebookEntry[];
    save: (
      kind: NoteKind,
      title: string,
      body: string,
      source: LearningSource,
    ) => Promise<void>;
    notes: () => void;
    leave: () => void;
    status: (text: string) => void;
  },
) {
  const source: LearningSource = {
    url: new URL("/demos/", location.origin).href,
    title: demo.title,
    kind: "demo",
    anchor: demo.id,
    excerpt: demo.caption,
    revision:
      document.querySelector<HTMLMetaElement>(
        'meta[name="book-content-revision"]',
      )?.content ?? null,
    conceptIds: demo.conceptIds,
  };
  let hasInitial = options.entries.some(
    (entry) =>
      entry.kind === "attempt" &&
      entry.source.url === source.url &&
      entry.source.anchor === source.anchor &&
      entry.body.trim().length > 0,
  );
  const intro = node("div");
  intro.className = "learning-context";
  intro.append(
    node("p", "A first investigation"),
    node("h3", "Predict, observe, keep your thinking"),
    node(
      "p",
      "Try the queue balance lab, or return to your own question whenever you want. Uncertainty is enough to begin; this is optional and adds no course requirement.",
    ),
  );
  container.append(intro);
  const link = node("a", "Open the queue lab, then choose Notebook → Start");
  link.href = "/demos/#demo-queue-balance-lab";
  container.append(link);
  const assumptions = node("details");
  assumptions.append(
    node("summary", "What this illustration assumes"),
    node("p", demo.assumptions),
  );
  container.append(assumptions);
  const prediction = node("textarea");
  prediction.rows = 4;
  const predictionLabel = node("label");
  predictionLabel.append(
    node("span", "My initial prediction or uncertainty"),
    prediction,
  );
  container.append(
    node("h3", "1. Save a starting point"),
    node(
      "p",
      "With 20 arrivals per second and mean time 0.5 seconds, what average work in progress do you expect? What would happen if the mean time doubled?",
    ),
    predictionLabel,
  );
  const summary = node(
    "p",
    hasInitial
      ? "A saved initial attempt is available. It remains in your notebook."
      : "Save your own thinking before recording the demo result.",
  );
  container.append(summary);
  function button(text: string, action: () => void | Promise<void>) {
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
            options.status(
              error instanceof Error
                ? error.message
                : "The investigation could not be saved.",
            );
          } finally {
            button.disabled = false;
          }
        })(),
    );
    return button;
  }
  container.append(
    button("Save my starting point", async () => {
      if (!prediction.value.trim())
        throw new Error(
          "Write a prediction or one concrete uncertainty. There is no required answer or minimum length.",
        );
      await options.save(
        "attempt",
        "First investigation: initial thinking",
        prediction.value,
        source,
      );
      hasInitial = true;
      prediction.value = "";
      summary.textContent =
        "Initial thinking saved. You can now record the actual result.";
    }),
  );
  container.append(
    node("h3", "2. Inspect the actual demo"),
    node(
      "p",
      "Change the lab's mean time and compare its displayed work in progress. This illustrates stable averages at a common boundary; it is not a measurement of your project.",
    ),
  );
  const observed = node("pre");
  observed.className = "learning-observation";
  container.append(
    button("Record the browser observation", async () => {
      if (!hasInitial)
        throw new Error(
          "Save initial thinking first. An honest uncertainty is enough.",
        );
      const result = observeLearningDemo(demo.id);
      await options.save(
        "scratch",
        "First investigation: browser observation",
        JSON.stringify(result, null, 2),
        source,
      );
      observed.textContent = result.visibleText;
      options.status(
        "Recorded the actual inputs, textual output and assumptions in your private notebook.",
      );
    }),
    observed,
  );
  container.append(
    node("h3", "3. Reflect in your own words"),
    node(
      "p",
      "What did the result change or support in your explanation? Which assumption matters, and what would you check in a growing queue? A failed check or an unchanged view can be worth recording.",
    ),
  );
  const reflection = node("textarea");
  reflection.rows = 5;
  const reflectionLabel = node("label");
  reflectionLabel.append(
    node("span", "My reflection on this check"),
    reflection,
  );
  container.append(reflectionLabel);
  container.append(
    button("Save my first reflection", async () => {
      if (!hasInitial)
        throw new Error(
          "Keep an initial prediction or uncertainty before developing your reflection.",
        );
      if (!reflection.value.trim())
        throw new Error(
          "Record what you observed, what you think now, or what remains uncertain.",
        );
      await options.save(
        "reflection",
        "First investigation: reflection",
        reflection.value,
        source,
      );
      reflection.value = "";
      options.status(
        "Reflection saved. Reopen it in Notes after restarting the companion, or revisit the question later.",
      );
    }),
  );
  container.append(
    node(
      "p",
      "You can ask your agent for help at any point. In Notes, choose which entries you want it to see, then select this lab in Agent. Agent suggestions and changes still need your review.",
    ),
    button("Review my saved notes", options.notes),
    button("Return to my own question", options.leave),
  );
}
