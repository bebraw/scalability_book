import type { NotebookHandoff } from "../../shared/learning-workspace.ts";

const draftKey = "book-learning-tutorial-draft-v1";
const seenKey = "book-learning-tutorial-seen-v1";
interface TutorialDraft {
  step: number;
  prediction: string;
  slow: boolean;
  reply: boolean;
  takeaway: string;
  nextCheck: string;
}
const fresh = (): TutorialDraft => ({
  step: 0,
  prediction: "",
  slow: false,
  reply: false,
  takeaway: "",
  nextCheck: "",
});
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = "") => {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
};

/** An authored rehearsal. Only a deliberate reviewed handoff reaches Notebook. */
export function createLearningTutorial(options: {
  active: (value: boolean) => void;
  returnFocus: () => void;
  settings: () => void | Promise<void>;
  write: (draft: NotebookHandoff) => void | Promise<void>;
}) {
  let draft = fresh();
  let seen = false;
  let active = false;
  try {
    seen = Boolean(localStorage.getItem(seenKey));
  } catch {
    /* The invitation and replay work without persistent storage. */
  }
  try {
    const raw = sessionStorage.getItem(draftKey);
    if (raw && raw.length <= 40_000) {
      const saved = JSON.parse(raw);
      if (Number.isInteger(saved.step) && saved.step >= 0 && saved.step < 5)
        draft = {
          step: saved.step,
          prediction:
            typeof saved.prediction === "string"
              ? saved.prediction.slice(0, 2000)
              : "",
          slow: saved.slow === true,
          reply: saved.reply === true,
          takeaway:
            typeof saved.takeaway === "string"
              ? saved.takeaway.slice(0, 2000)
              : "",
          nextCheck:
            typeof saved.nextCheck === "string"
              ? saved.nextCheck.slice(0, 1000)
              : "",
        };
    }
  } catch {
    /* A malformed rehearsal never affects the actual learning drafts. */
  }
  const save = () => {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      /* Keep this mounted rehearsal in memory. */
    }
  };
  const markSeen = () => {
    seen = true;
    try {
      localStorage.setItem(seenKey, "seen");
    } catch {
      /* Only the invitation preference is persistent, never the writing. */
    }
  };
  const element = node("section");
  element.className = "learning-tutorial";
  element.setAttribute("aria-label", "Learning tools tutorial");
  const heading = node("h3");
  heading.tabIndex = -1;
  const button = (label: string, action: () => void) => {
    const control = node("button", label);
    control.type = "button";
    control.addEventListener("click", action);
    return control;
  };
  function close() {
    active = false;
    markSeen();
    render();
    options.returnFocus();
  }
  function open() {
    active = true;
    render();
    heading.focus();
  }
  function move(step: number) {
    draft.step = step;
    save();
    render();
    heading.focus();
  }
  const titles = [
    "Start with your thinking",
    "Try one small check",
    "Ask for help when it helps",
    "Make the learning your own",
    "Keep what matters. Then try again.",
  ];
  function field(label: string, key: "prediction" | "takeaway" | "nextCheck") {
    const wrapper = node("label");
    const input = node("textarea");
    input.rows = 3;
    input.maxLength = key === "nextCheck" ? 1000 : 2000;
    input.value = draft[key];
    input.addEventListener("input", () => {
      draft[key] = input.value;
      save();
    });
    wrapper.append(node("span", label), input);
    return wrapper;
  }
  function notebookDraft(): NotebookHandoff {
    return {
      source: {
        kind: "page",
        url: new URL("/notebook/setup/", location.origin).href,
        anchor: "try-the-learning-tutorial",
        title: "Learning tools tutorial",
        excerpt:
          "Authored teaching illustration: 4 requests per second, mean processing time of 2 or 4 seconds, and L = λW under a stable-flow assumption. These are tutorial inputs, not project measurements.",
        revision: null,
        conceptIds: ["little-law"],
      },
      kind: "reflection",
      title: "My first learning loop",
      body: [
        draft.takeaway,
        draft.prediction ? `My prediction: ${draft.prediction}` : "",
        `Tutorial illustration: 4 requests/s × ${draft.slow ? 4 : 2} s = ${draft.slow ? 16 : 8} unfinished requests on average. Assumes stable flow; not a project measurement.`,
        draft.nextCheck ? `Next independent check: ${draft.nextCheck}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      relatedIds: [],
      assistance:
        "Authored learning-tools tutorial; no model reply was requested. Student-written reflection, reviewed before saving.",
    };
  }
  function render() {
    options.active(active);
    element.hidden = !active && seen;
    element.replaceChildren();
    if (!active) {
      heading.textContent = "New to the learning tools?";
      element.append(
        heading,
        node(
          "p",
          "Try a three-minute learning loop: make a prediction, change an example, reflect and preview a Notebook takeaway. No setup needed.",
        ),
      );
      const actions = node("div");
      actions.className = "tutorial-actions";
      actions.append(
        button("Try the tutorial", open),
        button("Not now", close),
      );
      element.append(actions);
      return;
    }
    element.append(node("p", `TRY IT / ${draft.step + 1} OF 5`));
    element.firstElementChild!.className = "tutorial-kicker";
    const progress = node("ol");
    progress.className = "tutorial-progress";
    progress.setAttribute("aria-label", "Tutorial steps");
    for (const [index, title] of titles.entries()) {
      const item = node("li", String(index + 1));
      item.setAttribute("aria-label", title);
      if (index === draft.step) item.setAttribute("aria-current", "step");
      progress.append(item);
    }
    heading.textContent = titles[draft.step]!;
    element.append(progress, heading);
    if (draft.step === 0) {
      element.append(
        node(
          "p",
          "A learning loop can start with your question, project or something you are unsure about. The book is available whenever you want a reference.",
        ),
        node(
          "blockquote",
          "What happens to unfinished work when each request takes twice as long?",
        ),
        node(
          "p",
          "For this rehearsal, imagine 4 requests arriving each second and each taking 2 seconds. What do you expect if processing takes 4 seconds instead?",
        ),
        field("My tutorial prediction or uncertainty (optional)", "prediction"),
        node(
          "p",
          "A guess or “I’m unsure” is enough. In your own loop, Explain directly is always available.",
        ),
      );
    } else if (draft.step === 1) {
      element.append(
        node(
          "p",
          "Change one thing and inspect the result. In the real cockpit, you operate the demo; moving its controls does not ask the assistant anything.",
        ),
      );
      const illustration = node("div");
      illustration.className = "tutorial-illustration";
      illustration.append(node("p", "TEACHING ILLUSTRATION / STABLE FLOW"));
      const values = node("dl");
      for (const [term, value] of [
        ["Arrivals", "4 requests/s"],
        ["Mean time", `${draft.slow ? 4 : 2} seconds`],
        ["Unfinished work", `${draft.slow ? 16 : 8} requests`],
      ])
        values.append(node("dt", term), node("dd", value));
      const result = node(
        "p",
        draft.slow
          ? "4 × 4 = 16. Doubling time doubles average unfinished work at the same arrival rate."
          : "4 × 2 = 8 unfinished requests on average.",
      );
      result.setAttribute("role", "status");
      illustration.append(
        values,
        button(
          draft.slow ? "Restore processing time" : "Double processing time",
          () => {
            draft.slow = !draft.slow;
            save();
            render();
            element
              .querySelector<HTMLButtonElement>(
                ".tutorial-illustration button",
              )!
              .focus();
          },
        ),
        result,
      );
      element.append(
        illustration,
        node(
          "p",
          "This is a small mathematical illustration, not a measurement of your system. In other activities, describe whether your evidence came from reading, a thought experiment or an actual test.",
        ),
      );
    } else if (draft.step === 2) {
      element.append(
        node(
          "p",
          "Ask for a hint, a direct explanation or help checking your reasoning. You can also continue on your own.",
        ),
        node(
          "blockquote",
          "Does this result mean I should always add more servers?",
        ),
        button("Show an example reply", () => {
          draft.reply = true;
          save();
          render();
          element.querySelector<HTMLElement>(".tutorial-example")!.focus();
        }),
      );
      if (draft.reply) {
        const reply = node("div");
        reply.className = "tutorial-example";
        reply.tabIndex = -1;
        reply.append(
          node("h4", "Example reply · written for this tutorial"),
          node(
            "p",
            "The relationship tells us how much work is in progress under the stated assumptions. It does not identify what makes requests slow. A next check is to find where requests spend their time before choosing a response.",
          ),
        );
        element.append(reply);
      }
      element.append(
        node(
          "p",
          "No model was called here. For a real reply, connect your local companion with Codex or a local model. Review Shared context, then explicitly send. Only selected notes are included; demo control changes require a separate review in Assistant.",
        ),
      );
    } else if (draft.step === 3) {
      element.append(
        node(
          "p",
          "Compare the result with your initial thinking, then explain what you understand now. A remaining question makes a useful reflection too.",
        ),
      );
      if (draft.prediction)
        element.append(
          node("blockquote", `Your prediction: ${draft.prediction}`),
        );
      element.append(
        field("My tutorial takeaway (optional)", "takeaway"),
        field("My tutorial next independent check (optional)", "nextCheck"),
        node(
          "p",
          "A next check could be finding a waiting boundary in your own project. Try it before asking for another explanation. There is no required answer or completion grade.",
        ),
      );
    } else {
      element.append(
        node(
          "p",
          "Notebook keeps reflections you choose to save. Assistant helps you investigate. The cockpit connects thinking, checks and reflection; Recent learning loops lets you return to unfinished work in this tab.",
        ),
      );
      const preview = node("details");
      preview.append(
        node("summary", "Preview a Notebook takeaway"),
        node(
          "p",
          draft.takeaway
            ? notebookDraft().body
            : "Write a takeaway in the previous step to preview your own Notebook draft. Nothing has been saved.",
        ),
      );
      preview.className = "tutorial-preview";
      const notice = node("p");
      notice.setAttribute("role", "status");
      const handoff = button("Prepare this as a real Notebook draft", () => {
        handoff.disabled = true;
        void Promise.resolve()
          .then(() => options.write(notebookDraft()))
          .then(() => {
            // Notebook owns replacement consent and announces an accepted draft.
            notice.textContent = "";
          })
          .catch(() => {
            notice.textContent =
              "Connect your companion first, then try again. Your tutorial writing is retained.";
          })
          .finally(() => {
            handoff.disabled = false;
          });
      });
      handoff.disabled = !draft.takeaway.trim();
      element.append(
        preview,
        handoff,
        notice,
        node(
          "p",
          "Only Save note keeps a real Notebook entry. Tutorial writing stays in this tab; finishing this walkthrough does not save it.",
        ),
        button("Set up my companion", () => {
          void options.settings();
        }),
        node(
          "p",
          "You choose what to share with an assistant or peers. Website sign-in is separate from the local companion; it is used for saved exercise answers and course access. The public book and its references remain available.",
        ),
      );
    }
    const actions = node("div");
    actions.className = "tutorial-actions";
    if (draft.step > 0)
      actions.append(button("Back", () => move(draft.step - 1)));
    actions.append(
      button(
        draft.step === 4
          ? "Start my own learning loop"
          : [
              "Try the experiment",
              "Explore assistant help",
              "Reflect on the check",
              "Review how saving works",
            ][draft.step]!,
        () => {
          if (draft.step < 4) move(draft.step + 1);
          else {
            draft.step = 0;
            save();
            close();
          }
        },
      ),
      button("Exit tutorial", close),
    );
    element.append(actions);
  }
  render();
  return { element, open, sync: () => options.active(active) };
}
