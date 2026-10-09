import {
  exercises,
  parseExerciseResponse,
  checkExercise,
  type SavedAnswer,
  type ExerciseResponse,
} from "../../shared/exercises.ts";
import { exerciseDiscussion } from "../../shared/exercise-discussion.ts";
import type { SiteAccount } from "../../shared/site-account.ts";
import {
  readAccount,
  signInDestination,
  openAccount,
} from "./account-client.ts";
import { requestLearning } from "./learning-actions.ts";
import { pageSource } from "./learning-context.ts";

type Auth = {
  authenticated: boolean;
  available?: boolean;
  loginUrl?: string | null;
  local?: boolean;
  owner?: string;
  label?: string;
};
function exerciseAuth(account: SiteAccount): Auth {
  return {
    authenticated: Boolean(account.answers),
    available: account.github.available || account.course.emailAvailable,
    loginUrl: signInDestination(),
    local: account.local,
    ...(account.answers
      ? { owner: account.answers.userId, label: account.answers.label }
      : {}),
  };
}
const roots = [...document.querySelectorAll<HTMLElement>("[data-exercise]")];
initializeExerciseTabs();
if (roots.length) void initialize();

async function initialize() {
  let auth: Auth;
  try {
    auth = exerciseAuth(await readAccount());
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
  const discuss = root.querySelector<HTMLButtonElement>("[data-discuss]")!;
  const preview = root.querySelector<HTMLDetailsElement>(
    "[data-assistant-preview]",
  )!;
  const url = "/api/learning/" + id;
  const draftKey = `book-exercise-draft:${id}:${version}`;
  let loadRevision = 0;
  let followingAccountLink = false;
  let expected: string | null = null;
  let savingProblem: string | null = null;
  let ready = false,
    dirty = false,
    checked = false,
    saving = false;
  const say = (text: string) => {
    status.textContent = text;
  };
  const unavailableReason = () =>
    savingProblem ??
    (auth.authenticated
      ? "Load this account’s saved answers before saving."
      : auth.available === false
        ? "Saving is unavailable. Automatic checking still works."
        : "Sign in to save your result.");
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
    discuss.disabled = false;
    preview.hidden = false;
    preview.querySelector("pre")!.textContent = exerciseDiscussion(
      id,
      response,
    );
    save.disabled = !ready || !dirty || saving;
    return true;
  }
  function changed() {
    dirty = true;
    try {
      sessionStorage.setItem(draftKey, read());
    } catch {
      /* The page still retains writing when tab storage is unavailable. */
    }
    root.dispatchEvent(new CustomEvent("exercise-checked", { detail: false }));
    checked = false;
    discuss.disabled = true;
    preview.hidden = true;
    save.disabled = true;
    result.textContent = "Answers changed. Check them again.";
    for (const feedback of root.querySelectorAll<HTMLElement>(
      "[data-feedback]",
    ))
      feedback.hidden = true;
    say(ready ? "Unsaved changes." : `Not saved. ${unavailableReason()}`);
  }
  function showSignin() {
    if (auth.loginUrl) {
      signin.href = signInDestination(
        location.pathname + location.search + "#" + root.id,
      );
      signin.hidden = false;
    }
  }
  async function loadAnswers(preserveDraft = false) {
    const own = ++loadRevision;
    const owner = auth.owner;
    const keepDraft = preserveDraft && dirty;
    ready = false;
    savingProblem = null;
    expected = null;
    lock(true);
    try {
      const response = await fetch(url, { cache: "no-store" });
      const data = await response.json();
      if (own !== loadRevision || owner !== auth.owner) return;
      if (!response.ok) {
        if (response.status === 401) showSignin();
        throw Error(data.message || "Could not load saved answers.");
      }
      const answers = data.answers as SavedAnswer[];
      const current = answers.find((a) => a.version === version);
      if (data.userId !== owner)
        throw Error(
          "Sign-in changed again. Check your account before loading answers.",
        );
      if (!keepDraft) {
        restore({});
        checked = false;
        discuss.disabled = true;
        preview.hidden = true;
        result.textContent = "";
      }
      if (current && !keepDraft) {
        const parsed = parseExerciseResponse(id, current.answer);
        if (parsed) {
          restore(parsed);
          evaluate();
        }
      }
      expected = current?.revision ?? null;
      const previous =
        root.querySelector<HTMLDetailsElement>("[data-previous]")!;
      previous.querySelector("div")!.replaceChildren();
      previous.hidden = true;
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
      save.disabled = !checked || !dirty || saving;
      root.querySelector("[data-account-reload]")?.remove();
      say(
        keepDraft
          ? "Account answers loaded. Your unfinished attempt remains here; check it and save when ready."
          : current
            ? "Saved result restored."
            : auth.local
              ? "Local preview account. Check your answers, then save your result."
              : "Check your answers, then save your result privately.",
      );
    } catch (error) {
      if (own !== loadRevision || owner !== auth.owner) return;
      savingProblem =
        error instanceof Error
          ? error.message
          : "Could not load saved answers. Reload to retry.";
      say(savingProblem);
    } finally {
      if (own === loadRevision) lock(false);
    }
  }
  work.hidden = false;
  if (auth.authenticated) {
    await loadAnswers();
  } else {
    if (!auth.authenticated) showSignin();
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
          : `Checked in this browser. ${unavailableReason()}`,
      );
  });
  signin.addEventListener("click", (event) => {
    event.preventDefault();
    openAccount(undefined, location.pathname + location.search + "#" + root.id);
  });
  discuss.addEventListener("click", () => {
    const answer = parseExerciseResponse(id, read());
    if (!checked || !answer) return;
    requestLearning({
      kind: "discuss",
      draft: {
        source: {
          ...pageSource(),
          anchor: root.id,
          excerpt: exercises[id]!.prompt,
        },
        question: exerciseDiscussion(id, answer),
        noteIds: [],
      },
    });
  });
  const loop = document.createElement("button");
  loop.type = "button";
  loop.textContent = "Explore and reflect on this attempt";
  loop.disabled = true;
  root.querySelector(".exercise-actions")!.append(loop);
  // Reuse the same reviewed attempt/checker handoff as discussion. Nothing sends
  // automatically and worked answers are never copied into the learning loop.
  loop.addEventListener("click", () => {
    const answer = parseExerciseResponse(id, read());
    if (!checked || !answer) return;
    requestLearning({
      kind: "investigate",
      activityId: "learning-loop",
      draft: {
        source: {
          ...pageSource(),
          anchor: root.id,
          excerpt: exercises[id]!.prompt,
        },
        question: exerciseDiscussion(id, answer).slice(0, 4000),
        noteIds: [],
      },
    });
  });
  check.addEventListener("click", () => {
    loop.disabled = !checked;
  });
  for (const input of inputs)
    input.addEventListener("input", () => {
      loop.disabled = true;
    });
  document.addEventListener("book-account-changed", (event) => {
    const next = exerciseAuth((event as CustomEvent<SiteAccount>).detail);
    if (next.owner === auth.owner) return;
    loadRevision++;
    auth = next;
    savingProblem = null;
    ready = false;
    lock(false);
    save.disabled = true;
    signin.hidden = auth.authenticated;
    root.querySelector<HTMLElement>(".exercise-privacy")!.textContent =
      auth.label
        ? `Saved answers are private to ${auth.label}.`
        : "Saved answers are private to your account.";
    if (!auth.authenticated) showSignin();
    const reload = document.createElement("button");
    reload.type = "button";
    reload.textContent = "Load this account’s saved answers";
    root.querySelector("[data-account-reload]")?.remove();
    reload.dataset.accountReload = "true";
    reload.addEventListener("click", () => void loadAnswers(true));
    root.querySelector(".exercise-actions")!.append(reload);
    reload.hidden = !auth.authenticated;
    say(
      "Sign-in changed. Your current answers remain here. Load this account’s saved answers before saving.",
    );
  });
  root.querySelector<HTMLElement>(".exercise-privacy")!.textContent = auth.label
    ? `Saved answers are private to ${auth.label}.`
    : "Saved answers are private to your account.";
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey) || "null");
    if (
      draft &&
      typeof draft === "object" &&
      !Array.isArray(draft) &&
      inputs.every((input) => typeof draft[input.dataset.field!] === "string")
    ) {
      restore(draft);
      changed();
      say(
        ready
          ? "Unfinished answers restored in this tab. Check and save them when ready."
          : `Unfinished answers restored in this tab. ${unavailableReason()}`,
      );
    }
  } catch {
    /* Temporary drafts are optional. */
  }
  window.addEventListener("beforeunload", (event) => {
    if (dirty && !followingAccountLink) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  document.addEventListener("click", (event) => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(
      "a[data-account-navigation]",
    );
    if (!link || new URL(link.href, location.href).origin !== location.origin)
      return;
    try {
      if (dirty) sessionStorage.setItem(draftKey, read());
      followingAccountLink = true;
    } catch {
      /* Keep the navigation warning when writing could not be retained. */
    }
  });
  window.addEventListener("pageshow", () => {
    followingAccountLink = false;
  });
  save.addEventListener("click", async () => {
    if (!ready || !dirty || !checked) return;
    const owner = auth.owner;
    saving = true;
    save.disabled = true;
    lock(true);
    say("Saving…");
    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version, answer: read(), expected, owner }),
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
      if (owner !== auth.owner) {
        say(
          "Sign-in changed while saving. Your attempt remains here; load the current account before saving again.",
        );
        return;
      }
      expected = data.answer.revision;
      dirty = false;
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        /* Tab drafts are optional. */
      }
      say(
        auth.local
          ? "Saved to the local preview server."
          : "Saved to your account.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not save. Your answers remain here; try again.";
      if (!ready) savingProblem = message;
      say(message);
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
