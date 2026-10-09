import { safeReturnTo } from "../../shared/exercises.ts";
import type { SiteAccount } from "../../shared/site-account.ts";
import { LearningClient } from "./learning-client.ts";
import {
  currentCourse,
  readAccount,
  rememberCourse,
} from "./account-client.ts";
import { requestLearning } from "./learning-actions.ts";

const toggle = document.querySelector<HTMLButtonElement>(
  "[data-account-toggle]",
);
if (toggle) initialize(toggle);

function initialize(toggle: HTMLButtonElement) {
  const dialog = document.createElement("dialog");
  dialog.className = "account-panel";
  dialog.id = "site-account";
  dialog.setAttribute("aria-labelledby", "site-account-title");
  dialog.innerHTML = `<div class="account-heading"><div><p class="account-eyebrow">Your study tools</p><h2 id="site-account-title">Account & connections</h2></div><button type="button" data-account-close aria-label="Close account and connections">×</button></div><p role="status" aria-live="polite" data-account-status></p><div data-account-body></div>`;
  document.body.append(dialog);
  const body = dialog.querySelector<HTMLDivElement>("[data-account-body]")!;
  const status = dialog.querySelector<HTMLElement>("[data-account-status]")!;
  let course = currentCourse();
  let emailDraft = "";
  let returnTo = location.pathname + location.search + location.hash;
  let revision = 0;
  const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = "") => {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
  };
  const button = (text: string, action: () => void | Promise<void>) => {
    const element = node("button", text);
    element.type = "button";
    element.addEventListener(
      "click",
      () =>
        void Promise.resolve()
          .then(action)
          .catch((error: unknown) => {
            status.textContent =
              error instanceof Error ? error.message : "Try this action again.";
          }),
    );
    return element;
  };
  const field = (caption: string, input: HTMLElement) => {
    const label = node("label");
    label.append(node("span", caption), input);
    return label;
  };
  const section = (title: string) => {
    const element = node("section");
    element.append(node("h3", title));
    body.append(element);
    return element;
  };
  const close = () => dialog.close();
  dialog
    .querySelector("[data-account-close]")!
    .addEventListener("click", close);
  dialog.addEventListener("close", () => {
    revision++;
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus({ preventScroll: true });
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      )
        close();
    }
  });
  async function refresh() {
    const own = ++revision;
    status.textContent = "Checking your account…";
    const account = await readAccount();
    if (own !== revision) return;
    document.dispatchEvent(
      new CustomEvent("book-account-changed", { detail: account }),
    );
    body.replaceChildren();
    status.textContent = "";
    renderAccount(account);
    await renderConnections(own);
  }
  function renderAccount(account: SiteAccount) {
    const github = section("GitHub");
    github.append(
      node(
        "p",
        account.github.user
          ? `${account.local ? "Local preview: " : "Signed in as "}${account.github.user.login}`
          : "Use GitHub for reader feedback and saved exercise answers.",
      ),
    );
    if (account.github.user && !account.local)
      github.append(
        button("Sign out of GitHub", async () => {
          await post("/api/auth/logout", {});
          await refresh();
        }),
      );
    else if (account.github.loginUrl) {
      const link = node("a", "Sign in with GitHub");
      link.href = `${account.github.loginUrl}?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`;
      link.dataset.accountNavigation = "true";
      github.append(link);
    } else if (!account.github.available)
      github.append(node("p", "GitHub sign-in is unavailable here."));

    const enrollment = section("Course account");
    if (account.course.user?.provider === "email") {
      course = account.course.user.courseId ?? course;
      rememberCourse(course);
      enrollment.append(
        node("p", `Signed in as ${account.course.user.login} · ${course}`),
        button("Sign out of course", async () => {
          await post("/api/course-auth/logout", {});
          await refresh();
        }),
      );
    }
    if (account.course.available) {
      enrollment.append(
        node(
          "p",
          "Enrolled students can sign in with the email their instructor imported.",
        ),
      );
      const form = node("form");
      const courseInput = node("input");
      courseInput.name = "course";
      courseInput.value = course;
      courseInput.required = true;
      courseInput.maxLength = 48;
      courseInput.addEventListener("input", () => {
        course = courseInput.value;
      });
      const email = node("input");
      email.type = "email";
      email.name = "email";
      email.autocomplete = "email";
      email.required = true;
      email.value = emailDraft;
      email.addEventListener("input", () => {
        emailDraft = email.value;
      });
      const submit = node("button", "Email me a sign-in link");
      submit.type = "submit";
      submit.disabled = !account.course.emailAvailable;
      form.append(
        field("Course run ID from your instructor", courseInput),
        field("Institutional email", email),
        submit,
      );
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        submit.disabled = true;
        void post<{ message: string }>("/api/course-auth/request", {
          course: courseInput.value.trim(),
          email: email.value,
          returnTo: safeReturnTo(returnTo),
        })
          .then((result) => {
            course = courseInput.value.trim();
            rememberCourse(course);
            status.textContent =
              result.message +
              " Your writing stays in this tab. After confirming the email, return here to continue it.";
          })
          .catch((error: unknown) => {
            status.textContent =
              error instanceof Error
                ? error.message
                : "Could not request a link. Try again.";
          })
          .finally(() => {
            submit.disabled = !account.course.emailAvailable;
          });
      });
      enrollment.append(form);
      if (!account.course.emailAvailable)
        enrollment.append(
          node("p", "Student login email is not enabled here yet."),
        );
      if (account.local)
        enrollment.append(
          node(
            "p",
            "Local preview uses the instructor’s mock inbox; no email is sent.",
          ),
        );
      if (account.course.user) {
        const courses = node("div");
        enrollment.append(courses);
        void fetch("/api/courses", {
          credentials: "same-origin",
          cache: "no-store",
        })
          .then(async (response) => {
            if (!response.ok) return;
            const data = (await response.json()) as {
              courses: { id: string; name: string }[];
            };
            const picker = node("select");
            const empty = node("option", "Choose a course");
            empty.value = "";
            picker.append(empty);
            for (const entry of data.courses) {
              const option = node("option", entry.name);
              option.value = entry.id;
              picker.append(option);
            }
            if (!data.courses.length) return;
            if (!course && data.courses.length === 1)
              course = data.courses[0]!.id;
            picker.value = course;
            if (picker.value) {
              courseInput.value = course;
              rememberCourse(course);
            }
            picker.addEventListener("change", () => {
              course = picker.value;
              courseInput.value = course;
              rememberCourse(course);
              link.href = `/course/?course=${encodeURIComponent(course)}`;
            });
            const link = node("a", "Open course workspace");
            link.href = `/course/?course=${encodeURIComponent(course)}`;
            link.dataset.accountNavigation = "true";
            courses.append(field("My courses", picker), link);
          })
          .catch(() => {
            courses.textContent =
              "Course list could not load. Use your course link to continue.";
          });
      }
    } else
      enrollment.append(node("p", "Course access is not configured here yet."));
    const answers = section("Saved exercises");
    answers.append(
      node(
        "p",
        account.answers
          ? `Exercise answers belong to ${account.answers.label}.`
          : "Check answers freely. Sign in with GitHub or an enrolled course email to save them.",
      ),
    );
    if (account.github.user && account.course.user?.provider === "email")
      answers.append(
        node(
          "p",
          "Your existing GitHub answers stay selected while GitHub is signed in. Sign out of GitHub to use this course enrollment’s separate answers.",
        ),
      );
    body.append(button("Check sign-in again", refresh));
  }
  async function renderConnections(own: number) {
    const connections = section("Private notebook & assistant");
    const description = node(
      "p",
      "The companion connects your private notebook and chosen assistant provider on this computer. Website sign-in is optional for these tools.",
    );
    connections.append(description);
    const client = new LearningClient();
    if (client.token) {
      description.textContent = "Checking the companion connection…";
      try {
        const result = await client.status();
        if (own !== revision) return;
        description.textContent = `Notebook connected${result.storage ? ` · ${result.storage}` : ""}.`;
        connections.append(
          node(
            "p",
            result.provider
              ? `Assistant provider: ${result.teaching?.provider.name ?? result.provider}${result.teaching?.provider.model ? ` · ${result.teaching.provider.model}` : ""}. Connection checked; a reply confirms provider availability.`
              : "Assistant provider is not enabled. Notebook writing is available.",
          ),
        );
      } catch (error) {
        if (own !== revision) return;
        description.textContent =
          error instanceof Error ? error.message : "Reconnect the companion.";
      }
    } else
      connections.append(
        node(
          "p",
          "Notebook is not connected in this tab. Connect the companion to begin.",
        ),
      );
    if (own !== revision) return;
    if (
      document.querySelector('[data-learning-toggle="notebook"]:not([hidden])')
    )
      connections.append(
        button("Open connection settings", () => {
          close();
          requestLearning({
            kind: "navigate",
            experience: "notebook",
            view: "connect",
          });
        }),
      );
    const setup = node("a", "Companion setup and provider configuration");
    setup.href = "/notebook/setup/";
    connections.append(setup);
  }
  async function open() {
    if (!dialog.open) dialog.showModal();
    toggle.setAttribute("aria-expanded", "true");
    try {
      await refresh();
    } catch (error) {
      status.textContent =
        error instanceof Error
          ? error.message
          : "Could not load account status.";
    }
  }
  toggle.hidden = false;
  toggle.addEventListener("click", () => {
    course = currentCourse();
    returnTo = location.pathname + location.search + location.hash;
    void open();
  });
  document.addEventListener("book-account-open", (event) => {
    const detail = (event as CustomEvent<{ course: string; returnTo: string }>)
      .detail;
    course = detail.course;
    returnTo = safeReturnTo(detail.returnTo);
    void open();
  });
  window.addEventListener("focus", () => {
    if (dialog.open)
      void refresh().catch(() => {
        status.textContent = "Check sign-in again to refresh your account.";
      });
    else
      void readAccount()
        .then((account) =>
          document.dispatchEvent(
            new CustomEvent("book-account-changed", { detail: account }),
          ),
        )
        .catch(() => {});
  });
}

async function post<T = unknown>(url: string, value: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  const result = (await response.json()) as T & { message?: string };
  if (!response.ok)
    throw new Error(result.message ?? "The account request failed. Try again.");
  return result;
}
