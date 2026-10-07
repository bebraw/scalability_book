import {
  followUpForSource,
  followUpSource,
} from "../../shared/learning-activities.ts";
import {
  reflectionExamples,
  reflectionPrompts,
  type LearningSource,
  type NotebookEntry,
  type NoteKind,
} from "../../shared/learning-workspace.ts";

const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = "") => {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
};
export type GuideSave = (
  kind: NoteKind,
  title: string,
  body: string,
  source: LearningSource,
  relatedIds?: string[],
) => Promise<NotebookEntry>;

export function reflectionSupport() {
  const details = node("details");
  details.append(node("summary", "Reflection starters and examples"));
  details.append(
    node(
      "p",
      "Use any of these or write freely. Short notes, uncertainty and failed checks are valid. There is no correct personal conclusion.",
    ),
  );
  for (const prompt of reflectionPrompts) details.append(node("p", prompt));
  for (const example of reflectionExamples)
    details.append(node("h4", example.title), node("p", example.text));
  return details;
}

export function mountLearningPractice(
  container: HTMLElement,
  options: {
    source: LearningSource;
    related: () => string[];
    save: GuideSave;
    help: (source: LearningSource, text: string) => void;
    notes: () => void;
    draftScope?: string;
  },
) {
  const activity = followUpForSource(options.source);
  const section = node("section");
  section.className = "learning-guide-step";
  section.append(
    node("h3", "Apply it in a different situation"),
    node("p", activity.question),
  );
  section.append(
    node("p", activity.assumptions),
    node(
      "p",
      "Try your own explanation before opening the self-check. You can skip this, return later, choose your own case or ask for help at any time.",
    ),
  );
  const key = `book-learning-practice:${options.source.url}:${options.source.anchor}:${activity.id}:${activity.version}:${options.draftScope ?? "guide"}`;
  let draft = { question: "", answer: "" };
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (
      typeof saved?.question === "string" &&
      typeof saved?.answer === "string"
    )
      draft = {
        question: saved.question.slice(0, 2000),
        answer: saved.answer.slice(0, 16000),
      };
  } catch {
    /* Optional tab continuity. */
  }
  const persist = () => {
    try {
      sessionStorage.setItem(key, JSON.stringify(draft));
    } catch {
      /* Retain in memory when storage is unavailable. */
    }
  };
  function field(
    label: string,
    value: string,
    max: number,
    change: (value: string) => void,
  ) {
    const textarea = node("textarea");
    textarea.rows = 3;
    textarea.maxLength = max;
    textarea.value = value;
    textarea.addEventListener("input", () => {
      change(textarea.value);
      persist();
    });
    const wrapper = node("label");
    wrapper.append(node("span", label), textarea);
    return { wrapper, textarea };
  }
  const own = node("details");
  own.append(node("summary", "Use my own related case"));
  const question = field(
    "My alternative question (optional)",
    draft.question,
    2000,
    (text) => {
      draft.question = text;
    },
  );
  own.append(
    question.wrapper,
    node(
      "p",
      "Describe the changed assumption and keep the distinction between hypothetical and observed evidence.",
    ),
  );
  own.open = Boolean(draft.question);
  const answer = field(
    "My explanation of the changed case",
    draft.answer,
    16000,
    (text) => {
      draft.answer = text;
    },
  );
  const check = node("details");
  check.append(
    node("summary", "Self-check after my attempt"),
    node("p", activity.selfCheck),
  );
  if (activity.exerciseUrl) {
    const link = node("a", "Open the related book exercise");
    link.href = activity.exerciseUrl;
    check.append(link);
  }
  const feedback = node("p");
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");
  const save = node("button", "Save my independent attempt");
  save.type = "button";
  save.addEventListener(
    "click",
    () =>
      void (async () => {
        if (!answer.textarea.value.trim()) {
          feedback.textContent =
            "Write an explanation or an uncertainty. No minimum length or correct answer is required.";
          return;
        }
        save.disabled = true;
        try {
          await options.save(
            "revisit",
            `${activity.title}: independent attempt`,
            answer.textarea.value,
            followUpSource(options.source, activity, question.textarea.value),
            options.related(),
          );
          draft.answer = "";
          answer.textarea.value = "";
          persist();
          feedback.textContent =
            "Independent attempt saved separately in Notes. Keep your own conclusion; this does not mark a concept understood.";
        } catch (error) {
          feedback.textContent =
            error instanceof Error
              ? error.message
              : "Could not save. Your writing is retained.";
        } finally {
          save.disabled = false;
        }
      })(),
  );
  const help = node("button", "Ask for help with this case");
  help.type = "button";
  help.addEventListener("click", () =>
    options.help(
      followUpSource(options.source, activity, question.textarea.value),
      `I want help with this related case: ${question.textarea.value.trim() || activity.question}\n\nMy thinking so far: ${answer.textarea.value.trim() || "I am unsure how to begin."}`,
    ),
  );
  const revisit = node("button", "Revisit later in Notes");
  revisit.type = "button";
  revisit.addEventListener("click", options.notes);
  section.append(
    own,
    answer.wrapper,
    save,
    help,
    feedback,
    check,
    node(
      "p",
      "For a later revisit, use Revisit on a saved note and recall the idea before rereading. You choose when.",
    ),
    revisit,
  );
  container.append(section);
}
