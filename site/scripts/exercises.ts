import {
  exercises,
  parseExerciseResponse,
  checkExercise,
  type SavedAnswer,
  type ExerciseResponse,
} from "../../shared/exercises.ts";

type Auth = {
  authenticated: boolean;
  available?: boolean;
  loginUrl?: string | null;
  local?: boolean;
};
const roots = [...document.querySelectorAll<HTMLElement>("[data-exercise]")];
initializeExerciseTabs();
if (roots.length) void initialize();

async function initialize() {
  let auth: Auth;
  try {
    const response = await fetch("/api/auth/status", { cache: "no-store" });
    if (!response.ok) throw Error();
    auth = await response.json();
  } catch {
    auth = { authenticated: false, available: false };
  }
  for (const root of roots) void mount(root, auth);
}

async function mount(root: HTMLElement, auth: Auth) {
  const id = root.dataset.exercise!;
  const version = Number(root.dataset.version);
  const work = root.querySelector<HTMLElement>(".exercise-work")!;
  const inputs = [
    ...root.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      "[data-field]",
    ),
  ];
  const save = root.querySelector<HTMLButtonElement>("[data-save]")!;
  const check = root.querySelector<HTMLButtonElement>("[data-check]")!;
  const signin = root.querySelector<HTMLAnchorElement>("[data-signin]")!;
  const status = root.querySelector<HTMLElement>(".exercise-status")!;
  const result = root.querySelector<HTMLElement>("[data-result]")!;
  const url = "/api/learning/" + id;
  let expected: string | null = null;
  let ready = false,
    dirty = false,
    checked = false,
    saving = false;
  const say = (text: string) => {
    status.textContent = text;
  };
  const read = () =>
    JSON.stringify(
      Object.fromEntries(
        inputs.map((input) => [input.dataset.field!, input.value]),
      ),
    );
  const restore = (answer: ExerciseResponse) => {
    for (const input of inputs)
      input.value = answer[input.dataset.field!] || "";
  };
  const lock = (value: boolean) => {
    for (const input of inputs) input.disabled = value;
    check.disabled = value;
  };
  function evaluate() {
    const response = parseExerciseResponse(id, read());
    if (!response) {
      result.textContent = "Complete every field before checking your answer.";
      return false;
    }
    const evaluation = checkExercise(id, response);
    result.textContent = evaluation.correct
      ? "Correct — all parts passed. Exercise complete."
      : "Not yet — review the feedback and try again.";
    for (const field of evaluation.fields) {
      const feedback = root.querySelector<HTMLElement>(
        `[data-feedback="${field.id}"]`,
      )!;
      feedback.hidden = false;
      feedback.textContent =
        (field.correct ? "Correct. " : "Not quite. ") + field.explanation;
    }
    root.dispatchEvent(
      new CustomEvent("exercise-checked", { detail: evaluation.correct }),
    );
    checked = true;
    save.disabled = !ready || !dirty || saving;
    return true;
  }
  function changed() {
    dirty = true;
    root.dispatchEvent(new CustomEvent("exercise-checked", { detail: false }));
    checked = false;
    save.disabled = true;
    result.textContent = "Answers changed. Check them again.";
    for (const feedback of root.querySelectorAll<HTMLElement>(
      "[data-feedback]",
    ))
      feedback.hidden = true;
    say(
      ready ? "Unsaved changes." : "Not saved. Sign in to keep your results.",
    );
  }
  function showSignin() {
    if (auth.loginUrl) {
      signin.href =
        auth.loginUrl +
        "?returnTo=" +
        encodeURIComponent(location.pathname + location.search + "#" + root.id);
      signin.hidden = false;
    }
  }
  work.hidden = false;
  lock(true);
  if (auth.authenticated) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) showSignin();
        throw Error(data.message || "Could not load saved answers.");
      }
      const answers = data.answers as SavedAnswer[];
      const current = answers.find((a) => a.version === version);
      if (current) {
        const parsed = parseExerciseResponse(id, current.answer);
        if (parsed) {
          restore(parsed);
          evaluate();
        }
        expected = current.revision;
      }
      const previous =
        root.querySelector<HTMLDetailsElement>("[data-previous]")!;
      for (const answer of answers.filter((a) => a.version !== version)) {
        const heading = document.createElement("p");
        heading.textContent = `Version ${answer.version}: ${answer.prompt}`;
        const text = document.createElement("p");
        text.className = "exercise-old-answer";
        text.textContent = answer.answer;
        previous.querySelector("div")!.append(heading, text);
        previous.hidden = false;
      }
      ready = true;
      say(
        current
          ? "Saved result restored."
          : auth.local
            ? "Local preview account. Check your answers, then save your result."
            : "Check your answers, then save your result privately.",
      );
    } catch (error) {
      say(
        error instanceof Error
          ? error.message
          : "Could not load saved answers. Reload to retry.",
      );
    }
  } else {
    showSignin();
    say(
      auth.available === false
        ? "Saving is unavailable. Automatic checking still works."
        : "Check answers without an account. Sign in to save results across visits and devices.",
    );
  }
  lock(false);
  for (const input of inputs) input.addEventListener("input", changed);
  check.addEventListener("click", () => {
    if (evaluate() && dirty)
      say(
        ready
          ? "Checked. Save your result to keep it."
          : "Checked in this browser. Sign in to save your result.",
      );
  });
  signin.addEventListener("click", () => {
    try {
      sessionStorage.setItem(
        "book-signin-draft",
        JSON.stringify({ id, version, answer: read() }),
      );
      dirty = false;
    } catch {
      /* Checking works even when browser storage is unavailable. */
    }
  });
  if (ready) {
    try {
      const draft = JSON.parse(
        sessionStorage.getItem("book-signin-draft") || "null",
      );
      if (
        draft?.id === id &&
        draft.version === version &&
        typeof draft.answer === "string"
      ) {
        const parsed = parseExerciseResponse(id, draft.answer);
        if (parsed) {
          restore(parsed);
          changed();
          say(
            "Answers restored after sign-in. Check and save them when ready.",
          );
          sessionStorage.removeItem("book-signin-draft");
        }
      }
    } catch {
      /* Temporary drafts are optional. */
    }
  }
  window.addEventListener("beforeunload", (event) => {
    if (dirty) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  save.addEventListener("click", async () => {
    if (!checked) return;
    saving = true;
    save.disabled = true;
    lock(true);
    say("Saving…");
    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version, answer: read(), expected }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          ready = false;
          showSignin();
        }
        if (response.status === 409) ready = false;
        throw Error(
          data.message ||
            "Could not save. Your answers remain here; try again.",
        );
      }
      expected = data.answer.revision;
      dirty = false;
      say(
        auth.local
          ? "Saved to the local preview server."
          : "Saved to your account.",
      );
    } catch (error) {
      say(
        error instanceof Error
          ? error.message
          : "Could not save. Your answers remain here; try again.",
      );
    } finally {
      saving = false;
      lock(false);
      save.disabled = !ready || !dirty;
    }
  });
}

// Move existing nodes rather than remounting demos or answer controls.
function initializeExerciseTabs() {
  for (const root of roots) {
    const exerciseId = root.dataset.exercise!;
    const pair = exercises[exerciseId]?.demo;
    if (!pair) continue;
    const { id: demoId, label } = pair;
    const exercise = document.getElementById("exercise-" + exerciseId);
    const demo = document.getElementById(demoId!);
    if (!exercise || !demo || exercise.parentElement !== demo.parentElement)
      continue;
    const group = document.createElement("div");
    group.className = "exercise-tabs";
    group.dataset.exerciseTabs = exerciseId;
    const first =
      exercise.compareDocumentPosition(demo) & Node.DOCUMENT_POSITION_FOLLOWING
        ? exercise
        : demo;
    first.before(group);
    const list = document.createElement("div");
    list.className = "exercise-tab-list";
    list.setAttribute("role", "tablist");
    list.setAttribute("aria-label", label + " exploration and practice");
    group.append(list);
    const buttons: HTMLButtonElement[] = [];
    const panels: HTMLElement[] = [];
    for (const [index, content] of [demo, exercise].entries()) {
      const button = document.createElement("button");
      button.type = "button";
      button.id = `${exerciseId}-tab-${index}`;
      button.setAttribute("role", "tab");
      button.textContent = index === 0 ? "Explore" : "Practice";
      const panel = document.createElement("div");
      panel.id = `${exerciseId}-panel-${index}`;
      panel.className = "exercise-tab-panel";
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", button.id);
      panel.tabIndex = 0;
      button.setAttribute("aria-controls", panel.id);
      panel.append(content);
      buttons.push(button);
      panels.push(panel);
      list.append(button);
      group.append(panel);
    }
    function select(index: number, focus = false) {
      buttons.forEach((button, i) => {
        button.setAttribute("aria-selected", String(i === index));
        button.tabIndex = i === index ? 0 : -1;
        panels[i]!.hidden = i !== index;
      });
      if (focus) buttons[index]!.focus();
    }
    function followHash(scroll: boolean) {
      let id: string;
      try {
        id = decodeURIComponent(location.hash.slice(1));
      } catch {
        return;
      }
      const target = document.getElementById(id);
      const index = panels.findIndex(
        (panel) => target && panel.contains(target),
      );
      if (index < 0) return;
      select(index);
      if (scroll)
        requestAnimationFrame(() => target!.scrollIntoView({ block: "start" }));
    }
    buttons.forEach((button, index) => {
      button.addEventListener("click", () => {
        select(index);
        history.pushState(
          null,
          "",
          "#" + (index === 0 ? demo.id : exercise.id),
        );
      });
      button.addEventListener("keydown", (event) => {
        let next: number;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft")
          next = 1 - index;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = 1;
        else return;
        event.preventDefault();
        select(next, true);
        history.replaceState(
          null,
          "",
          "#" + (next === 0 ? demo.id : exercise.id),
        );
      });
    });
    exercise.addEventListener("exercise-checked", (event) => {
      buttons[1]!.textContent = (event as CustomEvent<boolean>).detail
        ? "Practice · Complete"
        : "Practice";
    });
    select(0);
    followHash(true);
    window.addEventListener("hashchange", () => followHash(true));
    window.addEventListener("popstate", () => followHash(true));
  }
}
