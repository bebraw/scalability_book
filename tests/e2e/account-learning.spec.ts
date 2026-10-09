import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test.setTimeout(90_000);
const chapter = "/chapters/benchmarking/";
const exerciseId = "exercise-measurement-boundary";

test("signed-in learners retain the answer storage failure after editing, checking and reload", async ({
  page,
}) => {
  await page.route("**/api/account/status", (route) =>
    route.fulfill({
      json: {
        local: false,
        github: {
          available: true,
          user: { id: 17, login: "reader" },
          loginUrl: "/api/auth/github/start",
        },
        course: { available: false, emailAvailable: false, user: null },
        answers: { userId: "github:17", label: "@reader" },
      },
    }),
  );
  const failure =
    "Answer storage is not available yet. Your text has not been saved.";
  await page.route("**/api/learning/*", (route) =>
    route.fulfill({ status: 503, json: { message: failure } }),
  );
  await page.goto(`${chapter}#${exerciseId}`);
  const exercise = page.locator(`#${exerciseId}`);
  await expect(exercise.locator(".exercise-privacy")).toContainText("@reader");
  await expect(exercise.locator(".exercise-status")).toHaveText(failure);
  await exercise
    .getByLabel("Calculated work in progress (operations)")
    .fill("10");
  await exercise
    .getByLabel("What follows from the mismatch?")
    .selectOption("check");
  await expect(exercise.locator(".exercise-status")).toContainText(failure);
  await exercise
    .getByRole("button", { name: "Check answer", exact: true })
    .click();
  await expect(exercise.locator(".exercise-status")).toHaveText(
    `Checked in this browser. ${failure}`,
  );
  await expect(
    exercise.getByRole("button", { name: "Save result", exact: true }),
  ).toBeDisabled();
  await expect(
    exercise.getByRole("link", { name: "Sign in to save", exact: true }),
  ).toBeHidden();
  await page.reload();
  await expect(
    exercise.getByLabel("Calculated work in progress (operations)"),
  ).toHaveValue("10");
  await expect(exercise.locator(".exercise-status")).toHaveText(
    `Unfinished answers restored in this tab. ${failure}`,
  );
  await exercise
    .getByRole("button", { name: "Check answer", exact: true })
    .click();
  await expect(exercise.locator(".exercise-status")).toHaveText(
    `Checked in this browser. ${failure}`,
  );
});

test("signing out of GitHub updates feedback and selects the separate course account", async ({
  page,
}) => {
  let signedIn = true;
  const github = { id: 17, login: "reader" };
  const student = {
    id: "student:stable",
    provider: "email",
    login: "Synthetic Student",
    courseId: "synthetic-run",
  };
  await page.route("**/api/account/status", (route) =>
    route.fulfill({
      json: {
        local: false,
        github: {
          available: true,
          user: signedIn ? github : null,
          loginUrl: "/api/auth/github/start",
        },
        course: { available: true, emailAvailable: true, user: student },
        answers: signedIn
          ? { userId: "github:17", label: "@reader" }
          : {
              userId: "course:synthetic-run:student:stable",
              label: "Synthetic Student · synthetic-run",
            },
      },
    }),
  );
  await page.route("**/api/auth/status", (route) =>
    route.fulfill({
      json: {
        available: true,
        authenticated: signedIn,
        admin: false,
        user: signedIn ? github : null,
        loginUrl: "/api/auth/github/start",
      },
    }),
  );
  await page.route("**/api/auth/logout", (route) => {
    signedIn = false;
    return route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/comments?*", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/courses", (route) =>
    route.fulfill({
      json: {
        user: student,
        courses: [{ id: "synthetic-run", name: "Synthetic run" }],
      },
    }),
  );
  await page.route("**/api/learning/*", (route) =>
    route.fulfill({
      json: {
        userId: signedIn ? "github:17" : "course:synthetic-run:student:stable",
        answers: [],
      },
    }),
  );
  await page.goto(chapter);
  await expect(page.locator("[data-comments-status]")).toHaveText(
    "Feedback: reader",
  );
  await page.getByRole("button", { name: "Account", exact: true }).click();
  const account = page.getByRole("dialog", {
    name: "Account & connections",
    exact: true,
  });
  await expect(account).toContainText("Exercise answers belong to @reader");
  await expect(account).toContainText(
    "Your existing GitHub answers stay selected",
  );
  await account
    .getByRole("button", { name: "Sign out of GitHub", exact: true })
    .click();
  await expect(account).toContainText(
    "Exercise answers belong to Synthetic Student",
  );
  await expect(account).toContainText("Signed in as Synthetic Student");
  await expect(page.locator("[data-comments-status]")).toHaveText("Feedback");
  await expect(page.locator("html")).toHaveAttribute(
    "data-comments-ready",
    "false",
  );
  await expect(
    account.getByRole("link", { name: "Sign in with GitHub", exact: true }),
  ).toBeVisible();
});

test("enrolled email sign-in returns to the exercise, saves private answers and works without GitHub", async ({
  browser,
  request,
  baseURL,
}) => {
  const origin = new URL(baseURL!).origin;
  const created = await request.post("/api/courses", {
    headers: { Origin: origin },
    data: { name: `Synthetic account integration ${Date.now()}` },
  });
  expect(created.ok()).toBe(true);
  const record = await created.json();
  const id = record.value.id;
  const view = await (await request.get(`/api/courses/${id}`)).json();
  const enrolled = await request.put(`/api/courses/${id}/students`, {
    headers: { Origin: origin },
    data: {
      expected: view.administration.students,
      format: "institutional",
      reason: "Synthetic account integration",
      students: [
        {
          number: "ACCOUNT-1",
          firstName: "Synthetic",
          lastName: "Learner",
          email: "synthetic-account@example.edu",
        },
      ],
    },
  });
  expect(enrolled.ok()).toBe(true);
  const context = await browser.newContext({
    extraHTTPHeaders: { "x-course-test-user": "anonymous" },
  });
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(10_000);
    const target = `${chapter}?course=${id}#${exerciseId}`;
    await page.goto(target);
    const exercise = page.locator(`#${exerciseId}`);
    await exercise.locator("input[type=number]").fill("25");
    await exercise
      .getByLabel("What follows from the mismatch?")
      .selectOption("database");
    await exercise
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    const otherDraft = page
      .locator("#exercise-measurement-prediction input")
      .first();
    await page
      .locator('[data-exercise-tabs="measurement-prediction"]')
      .getByRole("tab", { name: "Practice", exact: true })
      .click();
    await otherDraft.fill("73");
    await exercise
      .getByRole("link", { name: "Sign in to save", exact: true })
      .click();
    const account = page.getByRole("dialog", {
      name: "Account & connections",
      exact: true,
    });
    await expect(account).toBeVisible();
    await expect(
      account.getByLabel("Course run ID from your instructor"),
    ).toHaveValue(id);
    await account
      .getByLabel("Institutional email")
      .fill("synthetic-account@example.edu");
    await account
      .getByRole("button", { name: "Email me a sign-in link", exact: true })
      .click();
    await expect(account.locator("[data-account-status]")).toContainText(
      "If that address is enrolled",
    );
    const inbox = await (
      await request.get(`/api/course-auth/mock-inbox?course=${id}`)
    ).json();
    const message = inbox.messages[0];
    const link = new URL(message.url);
    expect(link.searchParams.get("returnTo")).toBe(target);
    // Email often opens another tab. Original work must remain in its original tab.
    const confirmation = await context.newPage();
    confirmation.setDefaultTimeout(10_000);
    await confirmation.goto(message.url);
    await expect(
      confirmation.getByRole("heading", {
        name: "Confirm course sign-in",
        exact: true,
      }),
    ).toBeVisible();
    await confirmation
      .getByRole("button", { name: "Sign in to my course", exact: true })
      .click();
    await expect(confirmation).toHaveURL(origin + target);
    await page.bringToFront();
    await account
      .getByRole("button", { name: "Check sign-in again", exact: true })
      .click();
    await expect(account).toContainText("Signed in as Synthetic Learner");
    await expect(account).toContainText(
      "Exercise answers belong to Synthetic Learner",
    );
    await account
      .getByRole("button", {
        name: "Close account and connections",
        exact: true,
      })
      .click();
    await expect(exercise.locator("input[type=number]")).toHaveValue("25");
    await expect(otherDraft).toHaveValue("73");
    await exercise
      .getByRole("button", {
        name: "Load this account’s saved answers",
        exact: true,
      })
      .click();
    await expect(exercise.locator(".exercise-status")).toContainText(
      "Account answers loaded",
    );
    await expect(exercise.locator("input[type=number]")).toHaveValue("25");
    await expect(otherDraft).toHaveValue("73");
    await exercise.locator("input[type=number]").fill("10");
    await exercise
      .getByLabel("What follows from the mismatch?")
      .selectOption("check");
    await exercise
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await exercise
      .getByRole("button", { name: "Save result", exact: true })
      .click();
    await expect(exercise.locator(".exercise-status")).toContainText(
      "Saved to the local preview server",
    );
    const emailAnswers = await (
      await context.request.get("/api/learning/measurement-boundary")
    ).json();
    expect(emailAnswers.answers).toHaveLength(1);
    const studentId = (
      await (await context.request.get("/api/account/status")).json()
    ).answers.userId;
    expect(studentId).toMatch(/^course:/);
    const status = await context.request.get("/api/account/status", {
      headers: { "x-course-test-user": "1" },
    });
    expect((await status.json()).answers.userId).toBe("local-editor");
    const copy = await browser.newContext({
      extraHTTPHeaders: { "x-course-test-user": "anonymous" },
    });
    try {
      await copy.addCookies(await context.cookies());
      const restored = await copy.newPage();
      await restored.goto(target);
      await expect(
        restored.locator(`#${exerciseId} input[type=number]`),
      ).toHaveValue("10");
    } finally {
      await copy.close();
    }
    await page.getByRole("button", { name: "Account", exact: true }).click();
    await account
      .getByRole("button", { name: "Sign out of course", exact: true })
      .click();
    await expect(account).toContainText("Check answers freely");
    expect(
      (
        await context.request.get("/api/learning/measurement-boundary")
      ).status(),
    ).toBe(401);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      (await new AxeBuilder({ page }).include("#site-account").analyze())
        .violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await account.screenshot({
      path: test.info().outputPath("account-mobile.png"),
    });
  } finally {
    await context.close();
  }
});

test("exercise discussion prepares only the checked attempt and retains notebook writing through account and connection views", async ({
  page,
  baseURL,
}) => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "book-account-companion-"),
  );
  const child = spawn(
    process.execPath,
    [
      "scripts/learning-companion.ts",
      "--directory",
      directory,
      "--port",
      "18896",
      "--origin",
      new URL(baseURL!).origin,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Companion did not start.")),
        8000,
      );
      child.once("exit", () => {
        clearTimeout(timeout);
        reject(new Error("Companion exited."));
      });
      child.stdout!.on("data", (data) => {
        if (String(data).includes("Learning companion:")) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
    let modelRequests = 0;
    page.on("request", (request) => {
      if (
        /\/agent\/conversations\/[^/]+$/.test(request.url()) &&
        request.method() === "POST"
      )
        modelRequests++;
    });
    await page.goto(chapter + `#${exerciseId}`);
    await page.getByRole("button", { name: "Account", exact: true }).click();
    const account = page.getByRole("dialog", {
      name: "Account & connections",
      exact: true,
    });
    await account
      .getByRole("button", { name: "Open connection settings", exact: true })
      .click();
    const notebook = page.locator("#learning-notebook");
    await notebook
      .getByLabel("Companion address")
      .fill("http://127.0.0.1:18896");
    await notebook
      .getByRole("button", { name: "Connect companion", exact: true })
      .click();
    await notebook
      .getByLabel("Your thinking")
      .fill("Private unfinished notebook writing.");
    await notebook
      .getByRole("button", { name: "Close notebook", exact: true })
      .click();
    const exercise = page.locator(`#${exerciseId}`);
    await exercise.locator("input[type=number]").fill("25");
    await exercise
      .getByLabel("What follows from the mismatch?")
      .selectOption("database");
    await exercise
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await exercise
      .getByText("Preview the exercise context for the assistant", {
        exact: true,
      })
      .click();
    await expect(exercise.locator("[data-assistant-preview]")).toContainText(
      "Automatic checker feedback",
    );
    await exercise
      .getByRole("button", { name: "Discuss my answer", exact: true })
      .click();
    const assistant = page.locator("#learning-assistant");
    await expect(
      assistant.getByLabel("Message to the teaching assistant"),
    ).toHaveValue(/version 2/);
    await expect(
      assistant.getByLabel("Message to the teaching assistant"),
    ).toHaveValue(/25/);
    await expect(assistant).toContainText(
      "0 notebook notes selected for context",
    );
    expect(modelRequests).toBe(0);
    await page.getByRole("button", { name: "Account", exact: true }).click();
    await expect(account).toContainText("Notebook connected");
    await expect(account).toContainText("Assistant provider is not enabled");
    await account
      .getByRole("button", {
        name: "Close account and connections",
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: "Notebook", exact: true }).click();
    await expect(notebook.getByLabel("Your thinking")).toHaveValue(
      "Private unfinished notebook writing.",
    );
    const exported = await page.evaluate(async () => {
      const connection = JSON.parse(
        sessionStorage.getItem("book-learning-connection")!,
      );
      return (
        await fetch(connection.base + "/export", {
          headers: { Authorization: `Bearer ${connection.token}` },
        })
      ).json();
    });
    expect(exported.entries).toHaveLength(0);
    await assistant.screenshot({
      path: test.info().outputPath("exercise-assistant.png"),
    });
  } finally {
    if (child.exitCode === null) {
      const stopped = once(child, "exit");
      child.kill("SIGTERM");
      await stopped;
    }
    await rm(directory, { recursive: true, force: true });
  }
});
