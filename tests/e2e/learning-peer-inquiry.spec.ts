import {
  assistantPanel,
  downloadedMarkdown,
  chooseAssistantTool,
} from "./learning-workspace.helpers.ts";
import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import type { Course, Envelope } from "../../shared/course.ts";
import { randomUUID } from "node:crypto";
async function setupCourse(request: APIRequestContext, origin: string) {
  const headers = { Origin: origin };
  const created = await request.post("/api/courses", {
    headers,
    data: { name: `Synthetic peer inquiry ${Date.now()}` },
  });
  expect(created.ok()).toBe(true);
  const record = (await created.json()) as Envelope<Course>;
  const course = record.value;
  course.students = [2, 3, 4, 5, 6, 7].map((id) => ({
    id: `github:${id}`,
    login: `synthetic-${id}`,
    name: `Synthetic student ${id}`,
    number: `INQUIRY-${id}`,
  }));
  for (const phase of ["establish", "challenge", "compare"] as const) {
    course.phases[phase].groups = [
      { id: "group-a", members: ["github:2", "github:3", "github:4"] },
      { id: "group-b", members: ["github:5", "github:6", "github:7"] },
    ];
    course.phases[phase].audits = [
      { from: "group-a", to: "group-b" },
      { from: "group-b", to: "group-a" },
    ];
  }
  const configured = await request.put(`/api/courses/${course.id}/setup`, {
    headers,
    data: {
      ...course,
      expected: record.revision,
      reason: "Synthetic group inquiry verification",
    },
  });
  expect(configured.ok(), await configured.text()).toBe(true);
  return course;
}

test("an enrolled reader reveals the exact Obsidian reading without sending diary text or connecting a companion", async ({
  page,
  request,
  baseURL,
}) => {
  const course = await setupCourse(request, new URL(baseURL!).origin);
  let identity = "8";
  const attempts: Record<string, unknown>[] = [];
  const loadedThreads: string[] = [];
  const localConnections: string[] = [];
  const leakedUrls: string[] = [];
  const noteId = randomUUID(),
    noteRevision = randomUUID();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.port === "8788") localConnections.push(url.href);
    if (url.search.includes(noteId) || url.search.includes(noteRevision))
      leakedUrls.push(url.href);
    if (url.pathname.endsWith("/attempts") && request.method() === "POST")
      attempts.push(request.postDataJSON());
    if (url.pathname.endsWith("/inquiry") && request.method() === "GET")
      loadedThreads.push(url.href);
  });
  await page.route("**/api/courses**", (route) =>
    route.continue({
      headers: { ...route.request().headers(), "x-course-test-user": identity },
    }),
  );
  const path = "/chapters/benchmarking/";
  await page.goto(path);
  const paragraph = page
    .locator("[data-comment-target]")
    .filter({ hasText: "Define the protocol before selecting a runner:" });
  const anchor = await paragraph.getAttribute("id");
  expect(anchor).toBeTruthy();
  const clean = `${baseURL}${path}?inquiry=1#${anchor}`;
  await page.goto(`${clean}&diaryAttempt=${noteId}.${noteRevision}`);
  const panel = assistantPanel(page);
  await expect(page).toHaveURL(clean);
  const signIn = panel.getByRole("link", { name: "Course sign-in" });
  await expect(signIn).toBeVisible();
  await expect(signIn).not.toHaveAttribute("href", /diaryAttempt/);
  await expect(
    panel.getByRole("button", { name: "Reveal peer inquiry" }),
  ).toHaveCount(0);
  expect(attempts).toHaveLength(0);
  expect(loadedThreads).toHaveLength(0);
  identity = "2";
  await page.reload();
  await panel.getByLabel("Course for this inquiry").selectOption(course.id);
  await expect(panel.getByLabel("Inquiry activity")).toBeDisabled();
  await expect(
    panel.locator(`a[href="${baseURL}${path}#${anchor}"]`),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Write my initial thinking" }),
  ).toHaveCount(0);
  expect(attempts).toHaveLength(0);
  expect(loadedThreads).toHaveLength(0);
  await panel.getByRole("button", { name: "Reveal peer inquiry" }).click();
  await expect(
    panel.getByRole("heading", { name: "Shared investigations" }),
  ).toBeVisible();
  expect(attempts).toHaveLength(1);
  expect(Object.keys(attempts[0]!).sort()).toEqual([
    "noteId",
    "noteRevision",
    "question",
    "source",
  ]);
  expect(attempts[0]).toMatchObject({
    noteId,
    noteRevision,
    question: "reading",
    source: {
      url: `${baseURL}${path}`,
      anchor,
      excerpt: "Define the protocol before selecting a runner:",
    },
  });
  expect(loadedThreads).toHaveLength(1);
  await panel
    .getByLabel("Who will read this contribution?")
    .selectOption("cohort");
  await panel
    .getByLabel("Review the text I want to share")
    .fill("A separately reviewed observation about the measurement interval.");
  await panel
    .getByRole("button", {
      name: "Share reviewed text with the chosen audience",
    })
    .click();
  await expect(
    panel.getByText(
      "A separately reviewed observation about the measurement interval.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Download a diary reflection prompt" }),
  ).toBeVisible();
  await expect(
    panel.getByText("Try a related case privately", { exact: true }),
  ).toHaveCount(0);
  identity = "3";
  await page.reload();
  await expect(
    panel.getByText("Open your selected writing from your own diary", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Reveal peer inquiry" }),
  ).toHaveCount(0);
  expect(attempts).toHaveLength(1);
  expect(leakedUrls).toEqual([]);
  expect(localConnections).toEqual([]);
});

test("course email in a second tab returns to the reading while the original tab keeps the diary declaration", async ({
  request,
  page,
  context,
  baseURL,
}) => {
  const origin = new URL(baseURL!).origin;
  const courseResponse = await request.post("/api/courses", {
    headers: { Origin: origin },
    data: { name: `Synthetic diary email ${Date.now()}` },
  });
  expect(courseResponse.ok()).toBe(true);
  const { value: course } = (await courseResponse.json()) as Envelope<Course>;
  const setup = await (await request.get(`/api/courses/${course.id}`)).json();
  const enrolled = await request.put(`/api/courses/${course.id}/students`, {
    headers: { Origin: origin },
    data: {
      format: "institutional",
      expected: setup.administration.students,
      reason: "Synthetic diary email test",
      students: [
        {
          number: "DIARY-1",
          firstName: "Synthetic",
          lastName: "Reader",
          email: "diary@example.edu",
        },
      ],
    },
  });
  expect(enrolled.ok(), await enrolled.text()).toBe(true);
  await context.setExtraHTTPHeaders({ "x-course-test-user": "anonymous" });
  const pagePath = "/chapters/what-is-scalability/";
  const noteId = randomUUID(),
    revision = randomUUID();
  await page.goto(
    pagePath + "?inquiry=1#&diaryAttempt=" + noteId + "." + revision,
  );
  const panel = assistantPanel(page);
  await panel.getByRole("link", { name: "Course sign-in" }).click();
  const account = page.getByRole("dialog", { name: "Account & connections" });
  await account
    .getByLabel("Course run ID from your instructor")
    .fill(course.id);
  await account.getByLabel("Institutional email").fill("diary@example.edu");
  await account
    .getByRole("button", { name: "Email me a sign-in link" })
    .click();
  await expect(account.locator("[data-account-status]")).toContainText(
    "If that address is enrolled",
  );
  const inbox = await (
    await request.get(`/api/course-auth/mock-inbox?course=${course.id}`)
  ).json();
  const message = inbox.messages[0].url;
  expect(message).not.toContain(noteId);
  expect(message).not.toContain(revision);
  const confirmation = await context.newPage();
  await confirmation.goto(message);
  await confirmation
    .getByRole("button", { name: "Sign in to my course" })
    .click();
  await expect(confirmation).toHaveURL(
    origin + pagePath + "?inquiry=1&inquiryActivity=reading&diaryReturn=1",
  );
  await expect(
    assistantPanel(confirmation).getByText(
      "Return to the tab you opened from Obsidian",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(
    assistantPanel(confirmation).getByRole("button", {
      name: "Reveal peer inquiry",
    }),
  ).toHaveCount(0);
  await page.bringToFront();
  await account.getByRole("button", { name: "Check sign-in again" }).click();
  await expect(account).toContainText("Signed in as Synthetic Reader");
  await account
    .getByRole("button", { name: "Close account and connections" })
    .click();
  await panel.getByRole("button", { name: "Reveal peer inquiry" }).click();
  await expect(
    panel.getByRole("heading", { name: "Shared investigations" }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Close teaching assistant" }).click();
  await expect(panel).toBeHidden();
  await expect(page.locator("main h1")).toBeVisible();
});

test("a diary return to an already open reading accepts only real source anchors and reading activity", async ({
  page,
  baseURL,
}) => {
  const path = "/chapters/benchmarking/?inquiry=1";
  await page.goto(path);
  const panel = assistantPanel(page);
  const heading = await page.locator("main h2[id]").first().getAttribute("id");
  expect(heading).toBeTruthy();
  await expect(panel.getByLabel("Companion address")).toBeVisible();
  const handoff = "&diaryAttempt=" + randomUUID() + "." + randomUUID();
  // These navigations reuse the current document and dialog.
  await page.evaluate((hash) => {
    location.hash = hash;
  }, heading + handoff);
  await expect(page).toHaveURL(`${baseURL}${path}#${heading}`);
  await expect(panel.getByLabel("Course for this inquiry")).toBeVisible();
  await page.evaluate((hash) => {
    location.hash = hash;
  }, handoff);
  await expect(page).toHaveURL(`${baseURL}${path}`);
  await expect(panel.getByLabel("Course for this inquiry")).toBeVisible();
  await page.evaluate((hash) => {
    location.hash = hash;
  }, "missing-paragraph" + handoff);
  await expect(page).toHaveURL(`${baseURL}${path}#missing-paragraph`);
  await expect(
    panel.getByText("This diary handoff could not be matched", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(panel.getByLabel("Companion address")).toBeVisible();
  await page.goto(path + "&inquiryActivity=evidence#" + heading + handoff);
  await expect(page).toHaveURL(
    `${baseURL}${path}&inquiryActivity=evidence#${heading}`,
  );
  await expect(panel.getByLabel("Companion address")).toBeVisible();
});

test("students save private initial work before group replies, reflect individually and deliberately offer public text for editorial review", async ({
  browser,
  request,
  baseURL,
}) => {
  test.setTimeout(90_000);
  const course = await setupCourse(request, new URL(baseURL!).origin);
  const cleanups: (() => Promise<void>)[] = [];
  const feedbackDraft = "This draft is only for the book editors.";
  const passage = "Define the protocol before selecting a runner:";
  const feedbackWrites: string[] = [];
  const privateCoursePayloads: string[] = [];
  async function reader(id: number, port: number) {
    const context = await browser.newContext();
    cleanups.push(() => context.close());
    context.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (path === "/api/comments" && request.method() === "POST")
        feedbackWrites.push(request.url());
      if (path.startsWith("/api/courses/")) {
        const payload = `${request.url()} ${request.postData() ?? ""}`;
        if (
          payload.includes(feedbackDraft) ||
          /Private (Alice|Bob) initial thinking/.test(payload)
        )
          privateCoursePayloads.push(payload);
      }
    });
    await context.route("**/api/courses**", (route) =>
      route.continue({
        headers: {
          ...route.request().headers(),
          "x-course-test-user": String(id),
        },
      }),
    );
    const directory = await mkdtemp(path.join(tmpdir(), "book-peer-notebook-"));
    const child = spawn(
      process.execPath,
      [
        "scripts/learning-companion.ts",
        "--directory",
        directory,
        "--port",
        String(port),
        "--origin",
        new URL(baseURL!).origin,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    cleanups.push(async () => {
      if (child.exitCode === null) {
        const exited = once(child, "exit");
        child.kill("SIGTERM");
        await exited;
      }
      await rm(directory, { recursive: true, force: true });
    });
    await new Promise<void>((resolve, reject) => {
      let output = "";
      const timeout = setTimeout(
        () => reject(new Error("Synthetic companion did not start")),
        8000,
      );
      child.once("exit", () => {
        clearTimeout(timeout);
        reject(new Error("Synthetic companion exited"));
      });
      child.stdout!.on("data", (data) => {
        output += String(data);
        const match = output.match(
          /Learning companion: http:\/\/127\.0\.0\.1:/,
        );
        if (match) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
    const reading = await context.newPage();
    await reading.goto(`${baseURL}/chapters/benchmarking/`);
    const paragraph = reading.locator("[data-comment-target]").filter({
      hasText: passage,
    });
    const paragraphId = await paragraph.getAttribute("id");
    expect(paragraphId).toBeTruthy();
    await paragraph.locator("[data-comment-button]").click();
    const form = reading.locator("[data-comment-form]");
    await form.getByLabel("Comment text").fill(feedbackDraft);
    const opened = context.waitForEvent("page");
    await form.getByRole("link", { name: "Discuss with classmates" }).click();
    const page = await opened;
    await expect(page).toHaveURL(`${reading.url()}?inquiry=1#${paragraphId}`);
    await expect(form.getByLabel("Comment text")).toHaveValue(feedbackDraft);
    const panel = assistantPanel(page);
    await panel
      .getByLabel("Companion address")
      .fill(`http://127.0.0.1:${port}`);
    await panel
      .getByRole("button", { name: "Connect companion", exact: true })
      .click();
    await expect(panel.getByLabel("Course for this inquiry")).toBeVisible();
    await expect(
      panel.locator(`a[href="${reading.url()}#${paragraphId}"]`),
    ).toBeVisible();
    return { page, panel };
  }
  async function peers(page: Page) {
    const panel = assistantPanel(page);
    await chooseAssistantTool(panel, "Peer discussion");
    await panel.getByLabel("Course for this inquiry").selectOption(course.id);
    return panel;
  }
  try {
    const alice = await reader(2, 18971),
      bob = await reader(3, 18972);
    await alice.panel
      .getByLabel("Course for this inquiry")
      .selectOption(course.id);
    await expect(
      alice.panel.getByText("Save initial thinking for this source first.", {
        exact: false,
      }),
    ).toBeVisible();
    await alice.panel.getByLabel("Inquiry activity").selectOption("prediction");
    await alice.page
      .getByRole("button", { name: "Account", exact: true })
      .click();
    const account = alice.page.getByRole("dialog", {
      name: "Account & connections",
      exact: true,
    });
    await expect(account).toContainText("Exercise answers belong to");
    await account
      .getByRole("button", {
        name: "Close account and connections",
        exact: true,
      })
      .click();
    await expect(alice.panel.getByLabel("Inquiry activity")).toHaveValue(
      "prediction",
    );
    await alice.panel
      .getByRole("button", { name: "Write my initial thinking" })
      .click();
    await expect(alice.panel.getByLabel("My initial thinking")).toHaveValue("");
    await alice.panel
      .getByLabel("My initial thinking")
      .fill(
        "Private Alice initial thinking: I expect a common stable interval.",
      );
    await alice.panel
      .getByRole("button", { name: "Save private attempt", exact: true })
      .click();
    await expect(alice.panel.getByRole("status")).toContainText(
      "Initial thinking saved in your local companion.",
    );
    await peers(alice.page);
    await expect(alice.panel.getByLabel("Inquiry activity")).toHaveValue(
      "prediction",
    );
    await alice.panel.getByLabel("Inquiry activity").selectOption("reading");
    await alice.panel
      .getByRole("button", { name: "Reveal peer inquiry" })
      .click();
    const prompts = alice.panel.locator("details").filter({
      has: alice.page.getByText("Optional reasoning and session prompts", {
        exact: true,
      }),
    });
    await prompts.locator(":scope > summary").click();
    await expect(prompts).toContainText("someone other than the operator");
    await expect(prompts).toContainText("An absent member has not endorsed");
    await prompts.getByRole("button", { name: "Use inquiry outline" }).click();
    await expect(
      alice.panel.getByLabel("Review the text I want to share"),
    ).toHaveValue(/Competing explanations:[\s\S]*Remaining uncertainty:/);
    await alice.panel
      .getByLabel("Review the text I want to share")
      .fill("Which interval and population are common to both averages?");
    await alice.panel.getByRole("button", { name: "Reload inquiry" }).click();
    await expect(
      alice.panel.getByLabel("Review the text I want to share"),
    ).toHaveValue("Which interval and population are common to both averages?");
    await expect(alice.panel).toContainText(
      "Sharing as local-student-2 with Group",
    );
    await expect(
      alice.panel.getByText(
        "Which interval and population are common to both averages?",
        { exact: true },
      ),
    ).toHaveCount(0);
    await alice.panel
      .getByRole("button", {
        name: "Share reviewed text with the chosen audience",
      })
      .click();
    await expect(
      alice.panel.getByText(
        "Which interval and population are common to both averages?",
        { exact: true },
      ),
    ).toBeVisible();
    const outsider = await reader(8, 18974);
    await expect(outsider.panel).toContainText(
      "No courses are available to this account.",
    );
    await expect(outsider.panel).toContainText(
      "the email address you enrolled with",
    );
    await expect(
      outsider.panel.getByLabel("Course for this inquiry"),
    ).toBeDisabled();
    await expect(
      outsider.panel.getByRole("option", { name: course.name }),
    ).toHaveCount(0);
    await expect(
      outsider.panel.getByRole("button", { name: "Reveal peer inquiry" }),
    ).toHaveCount(0);
    const signIn = outsider.panel.getByRole("link", {
      name: "Course sign-in",
      exact: true,
    });
    const inquiryURL = new URL(outsider.page.url());
    const returnTo = `${inquiryURL.pathname}?inquiry=1&inquiryActivity=reading${inquiryURL.hash}`;
    const signInURL = new URL("/course/", baseURL);
    signInURL.searchParams.set("returnTo", returnTo);
    await expect(signIn).toHaveJSProperty("href", signInURL.href);
    await signIn.click();
    await expect(
      outsider.page.getByRole("dialog", { name: "Account & connections" }),
    ).toBeVisible();
    await bob.panel
      .getByLabel("Course for this inquiry")
      .selectOption(course.id);
    await expect(
      bob.panel.getByText(
        "Which interval and population are common to both averages?",
        { exact: true },
      ),
    ).toHaveCount(0);
    await bob.panel
      .getByRole("button", { name: "Write my initial thinking" })
      .click();
    await bob.panel
      .getByLabel("My initial thinking")
      .fill(
        "Private Bob initial thinking: I am unsure how to establish stability.",
      );
    await bob.panel
      .getByRole("button", { name: "Save private attempt", exact: true })
      .click();
    await expect(bob.panel.getByRole("status")).toContainText(
      "Initial thinking saved in your local companion.",
    );
    await peers(bob.page);
    await bob.panel
      .getByRole("button", { name: "Reveal peer inquiry" })
      .click();
    await expect(
      bob.panel.getByText(
        "Which interval and population are common to both averages?",
        { exact: true },
      ),
    ).toBeVisible();
    await bob.panel.getByText("Captured source", { exact: true }).click();
    await expect(bob.panel.locator("blockquote")).toHaveText(passage);
    await expect(
      bob.panel.getByText(/Private Alice initial thinking/),
    ).toHaveCount(0);
    await bob.panel
      .getByLabel("My reply", { exact: true })
      .fill(
        "I still question whether the interval is stable; I would check queue growth first.",
      );
    await bob.panel.getByLabel("Reply kind").selectOption("disagreement");
    await bob.panel.getByRole("button", { name: "Reload inquiry" }).click();
    await expect(bob.panel.getByLabel("My reply", { exact: true })).toHaveValue(
      "I still question whether the interval is stable; I would check queue growth first.",
    );
    await expect(bob.panel.getByLabel("Reply kind")).toHaveValue(
      "disagreement",
    );
    await bob.panel
      .getByRole("button", { name: "Share reply with this audience" })
      .click();
    await alice.panel.getByRole("button", { name: "Reload inquiry" }).click();
    await expect(
      alice.panel.getByText(/I still question whether the interval is stable/),
    ).toBeVisible();
    // Student 4 is absent: a checked result and disagreement can still be discussed.
    const observation = await alice.page.evaluate(async () => {
      const bridge = (
        window as unknown as {
          BookLearningWorkspace: typeof import("../../site/scripts/learning-demos.ts");
        }
      ).BookLearningWorkspace;
      const before = bridge.observeLearningDemo("demo-tail-latency-simulator");
      const control = before.controls.find(
        (control) => control.type === "range" || control.type === "number",
      )!;
      const value =
        Number(control.value) + Number(control.step ?? 1) <= Number(control.max)
          ? Number(control.value) + Number(control.step ?? 1)
          : Number(control.min);
      return bridge.changeLearningDemo("demo-tail-latency-simulator", {
        controlId: control.id,
        value,
      });
    });
    expect(observation.visibleText).toContain("p95");
    await alice.panel
      .getByLabel("My reply", { exact: true })
      .fill(
        `I changed a browser model input and inspected the displayed distribution. This does not prove our project is stable.\n${observation.visibleText.slice(0, 1500)}`,
      );
    await alice.panel.getByLabel("Reply kind").selectOption("check");
    await alice.panel
      .getByLabel("Reply tool or observation provenance")
      .fill("Student-operated browser model; no production measurement.");
    await alice.panel
      .getByRole("button", { name: "Share reply with this audience" })
      .click();
    await expect(
      alice.panel.getByRole("heading", {
        name: "Synthetic student 2 · check",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      alice.panel.getByRole("button", {
        name: "Prepare summary from selected contributions",
      }),
    ).toBeDisabled();
    await alice.panel
      .getByLabel("Select Synthetic student 3 · disagreement for my draft", {
        exact: true,
      })
      .check();
    await alice.panel
      .getByLabel("Select Synthetic student 2 · check for my draft", {
        exact: true,
      })
      .check();
    await alice.panel
      .getByRole("button", {
        name: "Prepare summary from selected contributions",
      })
      .click();
    const summary = alice.panel.getByLabel("My reply", { exact: true });
    await expect(summary).toHaveValue(
      /Synthetic student 3 \[github:3\][\s\S]*still question whether[\s\S]*Student-operated browser model/,
    );
    await expect(
      alice.panel.getByRole("heading", {
        name: "Synthetic student 2 · summary",
        exact: true,
      }),
    ).toHaveCount(0);
    await summary.fill(
      `${await summary.inputValue()}\nDecision by student 2: the model relation is consistent. Student 3 still questions stability. Student 4 did not contribute or endorse this. We still need evidence for a stable project interval.`,
    );
    await alice.panel
      .getByRole("button", { name: "Share reply with this audience" })
      .click();
    await expect(
      alice.panel.getByRole("heading", {
        name: "Synthetic student 2 · summary",
        exact: true,
      }),
    ).toBeVisible();
    const alicePrompt = await downloadedMarkdown(
      alice.panel.getByRole("button", {
        name: "Download a diary reflection prompt",
      }),
    );
    expect(alicePrompt).toContain("Discussion reference:");
    expect(alicePrompt).not.toMatch(
      /I still question whether|I changed a browser model input/,
    );
    const relatedCase = alice.panel.locator("details").filter({
      has: alice.page.getByText("Try a related case privately", {
        exact: true,
      }),
    });
    await relatedCase.locator(":scope > summary").click();
    await relatedCase
      .getByRole("button", { name: "Ask for help with this case" })
      .click();
    await expect(
      alice.panel.getByLabel("Message to the teaching assistant"),
    ).toHaveValue(/six changes\/hour/);
    await expect(
      alice.panel.getByLabel("Message to the teaching assistant"),
    ).not.toHaveValue(
      /I still question whether|I changed a browser model input/,
    );
    await peers(alice.page);
    await alice.panel
      .getByRole("button", { name: "Reveal peer inquiry" })
      .click();
    await relatedCase.locator(":scope > summary").click();
    await relatedCase
      .getByLabel("My explanation of the changed case")
      .fill(
        "At six submissions and four acceptances per hour, unfinished changes accumulate. The earlier stable calculation cannot hold indefinitely.",
      );
    await relatedCase
      .getByRole("button", { name: "Save my independent attempt" })
      .click();
    await expect(relatedCase.getByRole("status")).toContainText(
      "Your independent attempt was saved in the local companion.",
    );
    await bob.panel.getByRole("button", { name: "Reload inquiry" }).click();
    await bob.panel
      .getByLabel("Select Synthetic student 2 · check for my draft", {
        exact: true,
      })
      .check();
    const bobPrompt = await downloadedMarkdown(
      bob.panel.getByRole("button", {
        name: "Download a diary reflection prompt",
      }),
    );
    expect(bobPrompt).toContain("Student-operated browser model");
    expect(bobPrompt).not.toMatch(
      /Private Alice initial thinking|Private Bob initial thinking/,
    );
    await bob.panel
      .getByRole("button", { name: "Reflect in the learning cockpit" })
      .click();
    const cockpit = bob.page.locator("#learning-cockpit");
    await expect(
      cockpit.getByLabel("My takeaway", { exact: true }),
    ).toBeVisible();
    await expect(cockpit.getByLabel("What I noticed")).toHaveValue(
      /Student-operated browser model/,
    );
    await expect(cockpit.getByLabel("What I noticed")).not.toHaveValue(
      /Private Alice initial thinking|Alice private takeaway/,
    );
    await expect(
      cockpit.getByRole("button", { name: "Explain directly", exact: true }),
    ).toBeDisabled();
    alice.page.on(
      "dialog",
      (dialog) =>
        void (dialog.type() === "prompt"
          ? dialog.accept(
              "A public explanation should name the common interval and population.",
            )
          : dialog.accept()),
    );
    await alice.panel
      .getByRole("button", { name: "Offer my text for public review" })
      .first()
      .click();
    await expect(
      alice.panel
        .getByRole("status")
        .filter({ hasText: "offered for editorial review" }),
    ).toBeVisible();
    const teacher = await reader(1, 18973);
    await peers(teacher.page);
    await teacher.panel
      .getByRole("button", { name: "Open inquiry as course staff" })
      .click();
    await expect(
      teacher.panel.getByText(/offered: A public explanation/),
    ).toBeVisible();
    await teacher.panel
      .getByLabel("Curated text for editorial review")
      .fill(
        "Use averages from a common observation boundary and check stability.",
      );
    await teacher.panel
      .getByRole("button", { name: "Mark reviewed for the book editor" })
      .click();
    const download = teacher.page.waitForEvent("download");
    await teacher.panel
      .getByRole("button", { name: "Download for book-editor review" })
      .click();
    expect((await download).suggestedFilename()).toBe(
      "reader-note-proposal.md",
    );
    expect(
      (
        await new AxeBuilder({ page: teacher.page })
          .include(".learning-workspace")
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(feedbackWrites).toEqual([]);
    expect(privateCoursePayloads).toEqual([]);
  } finally {
    for (const cleanup of cleanups.reverse()) await cleanup();
  }
});
