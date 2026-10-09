import {
  activeLearningPanel,
  openAssistantSettings,
  selectReading,
  chooseNotebookTool,
} from "./learning-notebook.helpers.ts";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { conceptPages } from "../../shared/concept-pages.ts";
import type { LearningConversation } from "../../shared/learning-agent.ts";

let child: ChildProcess;
let directory: string;
const companionAddress = "http://127.0.0.1:18888";
test.beforeEach(async ({ baseURL }) => {
  directory = await mkdtemp(path.join(tmpdir(), "book-notebook-browser-"));
  child = spawn(
    process.execPath,
    [
      "scripts/learning-companion.ts",
      "--port",
      "18888",
      "--origin",
      new URL(baseURL!).origin,
      "--directory",
      directory,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  await new Promise<void>((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(
      () => reject(new Error("Synthetic companion did not start.")),
      8000,
    );
    child.once("exit", () => {
      clearTimeout(timeout);
      reject(new Error("Synthetic companion exited."));
    });
    child.stdout!.on("data", (data) => {
      output += String(data);
      const match = output.match(/Learning companion: http:\/\/127\.0\.0\.1:/);
      if (match) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
});
test.afterEach(async () => {
  if (child && child.exitCode === null) {
    const stopped = once(child, "exit");
    child.kill("SIGTERM");
    await stopped;
  }
  if (directory) await rm(directory, { recursive: true, force: true });
});

async function advertiseProvider(page: import("@playwright/test").Page) {
  await page.route(`${companionAddress}/status`, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      json: { ...(await response.json()), provider: "Synthetic" },
    });
  });
}

test("notebook-only connections explain setup before sending and retain the question", async ({
  page,
  baseURL,
}) => {
  const posts: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().includes("/agent/conversations/")
    )
      posts.push(request.url());
  });
  await page.goto("/chapters/benchmarking/");
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Notebook", exact: true })
    .click();
  const panel = activeLearningPanel(page);
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await chooseNotebookTool(panel, "Discuss");
  await panel
    .getByLabel("Message to the teaching assistant")
    .fill("Keep my question while I enable a provider.");
  await expect(
    panel.getByRole("button", { name: "Send message", exact: true }),
  ).toBeDisabled();
  await expect(
    panel.getByRole("region", { name: "Assistant provider" }),
  ).toContainText("Notebook-only connection");
  await panel.getByRole("button", { name: "Set up assistant replies" }).click();
  await expect(
    panel.getByRole("heading", { name: "Enable assistant replies" }),
  ).toBeVisible();
  await expect(
    panel.locator("code").filter({ hasText: "--codex" }),
  ).toContainText(
    `npm run companion -- --codex --origin '${new URL(baseURL!).origin}'`,
  );
  await expect(
    panel.getByRole("button", { name: "Copy Codex command", exact: true }),
  ).toBeVisible();
  await expect(
    panel.getByRole("link", { name: "Set up Codex", exact: true }),
  ).toHaveAttribute("href", "/notebook/setup/#connect-your-agent");
  await advertiseProvider(page);
  await panel
    .getByRole("button", { name: "Check connection", exact: true })
    .click();
  await chooseNotebookTool(panel, "Discuss");
  await expect(
    panel.getByLabel("Message to the teaching assistant"),
  ).toHaveValue("Keep my question while I enable a provider.");
  await expect(
    panel.getByRole("region", { name: "Assistant provider" }),
  ).toContainText("Synthetic enabled");
  await expect(
    panel.getByRole("button", { name: "Send message", exact: true }),
  ).toBeEnabled();
  expect(posts).toEqual([]);
});

test("editing or revisiting a saved note protects unfinished writing and clears old save status", async ({
  page,
}) => {
  await page.goto("/chapters/benchmarking/");
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Notebook", exact: true })
    .click();
  const panel = activeLearningPanel(page);
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await panel
    .getByLabel("Title", { exact: true })
    .fill("Synthetic protected note");
  await panel
    .getByLabel("Your thinking")
    .fill("My saved original explanation.");
  await panel.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(panel.getByRole("status")).toContainText(
    "Saved in your private notebook",
  );
  await chooseNotebookTool(panel, "Notes");
  const note = panel.locator("article").filter({
    has: page.getByRole("heading", {
      name: "Synthetic protected note",
      exact: true,
    }),
  });
  await note.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(panel.locator('[role="status"]')).toBeEmpty();
  await panel
    .getByLabel("Your thinking")
    .fill("Keep this unfinished revision.");
  for (const action of ["Edit", "Revisit"]) {
    await chooseNotebookTool(panel, "Notes");
    page.once("dialog", (dialog) => dialog.dismiss());
    await note.getByRole("button", { name: action, exact: true }).click();
    await chooseNotebookTool(panel, "Write");
    await expect(panel.getByLabel("Your thinking")).toHaveValue(
      "Keep this unfinished revision.",
    );
    await page.reload();
    await expect(panel.getByLabel("Your thinking")).toHaveValue(
      "Keep this unfinished revision.",
    );
  }
  await chooseNotebookTool(panel, "Notes");
  page.once("dialog", (dialog) => dialog.accept());
  await note.getByRole("button", { name: "Revisit", exact: true }).click();
  await expect(panel.getByLabel("Your thinking")).toHaveValue("");
  await panel.getByLabel("Your thinking").fill("Another unfinished revisit.");
  await chooseNotebookTool(panel, "Notes");
  page.once("dialog", (dialog) => dialog.accept());
  await note.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(panel.getByLabel("Your thinking")).toHaveValue(
    "My saved original explanation.",
  );
  await expect(panel.locator('[role="status"]')).toBeEmpty();
});

test("independent learning launchers support keyboard return, closing and chapter continuity", async ({
  page,
}) => {
  await page.goto("/chapters/introduction/");
  const tools = page.getByRole("group", {
    name: "Learning tools",
    exact: true,
  });
  const notebook = tools.getByRole("button", { name: "Notebook", exact: true });
  const assistant = tools.getByRole("button", {
    name: "Teaching assistant",
    exact: true,
  });
  const panel = activeLearningPanel(page);
  await expect(notebook).toHaveAttribute("aria-expanded", "false");
  await expect(assistant).toHaveAttribute("aria-expanded", "false");
  await notebook.focus();
  await page.keyboard.press("Enter");
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("aria-label", "My learning notebook");
  await expect(notebook).toHaveAttribute("aria-expanded", "true");
  await panel.getByRole("button", { name: "Close notebook" }).focus();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(notebook).toBeFocused();
  await expect(notebook).toHaveAttribute("aria-expanded", "false");
  await notebook.click();
  await assistant.click();
  await expect(panel).toHaveAttribute("aria-label", "Teaching assistant");
  await expect(notebook).toHaveAttribute("aria-expanded", "true");
  await expect(assistant).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#learning-notebook")).toBeVisible();
  await expect(page.locator("#learning-assistant")).toBeVisible();
  await expect(page.locator(".learning-experiences")).toHaveCount(0);
  await assistant.click();
  await expect(page.locator("#learning-assistant")).toBeHidden();
  await expect(page.locator("#learning-notebook")).toBeVisible();
  await expect(assistant).toHaveAttribute("aria-expanded", "false");
  await assistant.click();
  await page.locator('a[href="/chapters/architecture/"]').first().click();
  await expect(panel).toBeVisible();
  await expect(page.locator("#learning-notebook")).toBeVisible();
  await expect(assistant).toHaveAttribute("aria-expanded", "true");
  await panel.getByRole("button", { name: "Close teaching assistant" }).click();
  await expect(assistant).toBeFocused();
  await expect(assistant).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#learning-notebook")).toBeVisible();
});

test("concurrent panels retain independent context and drafts across reload, resizing and closing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/chapters/introduction/");
  const launchers = page.getByRole("group", { name: "Learning tools" });
  const notebookLauncher = launchers.getByRole("button", {
    name: "Notebook",
    exact: true,
  });
  const assistantLauncher = launchers.getByRole("button", {
    name: "Teaching assistant",
    exact: true,
  });
  const notebook = page.locator("#learning-notebook");
  const assistant = page.locator("#learning-assistant");
  await notebookLauncher.click();
  await notebook.getByLabel("Companion address").fill(companionAddress);
  await notebook
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await assistantLauncher.click();
  await assistant
    .getByLabel("Message to the teaching assistant")
    .fill("My unsent independent question.");
  await notebook
    .getByLabel("Title", { exact: true })
    .fill("Synthetic concurrent note");
  await notebook
    .getByLabel("Your thinking")
    .fill("My independently saved notebook thinking.");
  await notebook
    .getByRole("button", { name: "Save note", exact: true })
    .click();
  await expect(notebook.getByRole("status")).toHaveText(
    "Saved in your private notebook.",
  );
  await expect(
    assistant.getByLabel("Message to the teaching assistant"),
  ).toHaveValue("My unsent independent question.");
  await chooseNotebookTool(notebook, "Notes");
  await notebook.getByLabel("Select Synthetic concurrent note").check();
  await expect(
    assistant.getByText("0 notebook notes selected for context", {
      exact: true,
    }),
  ).toBeVisible();
  await chooseNotebookTool(notebook, "Write");
  await notebook
    .getByLabel("Your thinking")
    .fill("My unsaved notebook revision.");
  const notebookBounds = (await notebook.boundingBox())!;
  const assistantBounds = (await assistant.boundingBox())!;
  expect(notebookBounds.y + notebookBounds.height).toBeLessThan(
    assistantBounds.y,
  );
  expect(assistantBounds.x + assistantBounds.width).toBe(1904);
  expect(assistantBounds.y + assistantBounds.height).toBe(1064);
  expect(
    (await new AxeBuilder({ page }).include(".learning-workspace").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("concurrent-panels.png"),
  });
  await page.reload();
  await expect(notebook.getByLabel("Your thinking")).toHaveValue(
    "My unsaved notebook revision.",
  );
  await expect(
    assistant.getByLabel("Message to the teaching assistant"),
  ).toHaveValue("My unsent independent question.");
  await expect(notebookLauncher).toHaveAttribute("aria-expanded", "true");
  await expect(assistantLauncher).toHaveAttribute("aria-expanded", "true");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(notebook).toBeVisible();
  await expect(assistant).toBeHidden();
  await assistantLauncher.click();
  await expect(assistant).toBeVisible();
  await expect(notebook).toBeHidden();
  await expect(
    assistant.getByLabel("Message to the teaching assistant"),
  ).toHaveValue("My unsent independent question.");
  await assistant
    .getByRole("button", { name: "Close teaching assistant" })
    .click();
  await expect(assistant).toBeHidden();
  await expect(notebook).toBeVisible();
  await expect(notebook.getByLabel("Your thinking")).toHaveValue(
    "My unsaved notebook revision.",
  );
  await expect(assistantLauncher).toBeFocused();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await assistantLauncher.click();
  await expect(assistant).toBeVisible();
  await expect(
    assistant.getByLabel("Message to the teaching assistant"),
  ).toHaveValue("My unsent independent question.");
  await notebook.getByRole("button", { name: "Close notebook" }).click();
  await expect(notebook).toBeHidden();
  await expect(assistant).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(assistant).toBeVisible();
  await expect(notebook).toBeHidden();
});

test("notebook and assistant retain separate drafts and use reviewed source-linked handoffs", async ({
  page,
}) => {
  await advertiseProvider(page);
  const writes: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().startsWith(companionAddress)
    )
      writes.push(request.url());
  });
  await page.goto("/chapters/introduction/");
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Notebook", exact: true })
    .click();
  const panel = activeLearningPanel(page);
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await panel
    .getByLabel("Your thinking")
    .fill("My unfinished private notebook thought.");
  const baseline = writes.length;
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Teaching assistant", exact: true })
    .click();
  await expect(panel).toHaveAttribute("aria-label", "Teaching assistant");
  await expect(
    panel.getByRole("button", { name: "Write", exact: true }),
  ).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Notes", exact: true }),
  ).toHaveCount(0);
  await openAssistantSettings(panel);
  await panel.getByLabel("How I want help").selectOption("explanation");
  await panel.getByLabel("My learning goal").fill("Understand the trade-off");
  await panel
    .getByLabel("Message to the teaching assistant")
    .fill("My unfinished question about this introduction.");
  const originalSource = await panel
    .getByRole("region", { name: "Assistant context" })
    .getByRole("link")
    .first()
    .getAttribute("href");
  await page.locator('a[href="/chapters/architecture/"]').first().click();
  await expect(panel).toHaveAttribute("aria-label", "Teaching assistant");
  await expect(
    panel.getByLabel("Message to the teaching assistant"),
  ).toHaveValue("My unfinished question about this introduction.");
  await expect(panel.getByLabel("My learning goal")).toHaveValue(
    "Understand the trade-off",
  );
  await expect(panel.getByLabel("How I want help")).toHaveValue("explanation");
  await expect(
    panel
      .getByRole("region", { name: "Assistant context" })
      .getByRole("link")
      .first(),
  ).toHaveAttribute("href", originalSource!);
  await expect(
    panel.getByRole("button", { name: "Discuss the current reading" }),
  ).toBeVisible();
  await chooseNotebookTool(panel, "Write");
  await expect(panel).toHaveAttribute("aria-label", "My learning notebook");
  await expect(panel.getByLabel("Your thinking")).toHaveValue(
    "My unfinished private notebook thought.",
  );
  await expect(
    panel.getByRole("button", { name: "Chapter guide", exact: true }),
  ).toHaveCount(0);
  expect(writes.length).toBe(baseline);
  await panel
    .getByLabel("Title", { exact: true })
    .fill("Chosen notebook thought");
  const savedResponse = page.waitForResponse(
    (response) =>
      response.url() === `${companionAddress}/entries` &&
      response.request().method() === "POST",
  );
  await panel.getByRole("button", { name: "Save note", exact: true }).click();
  const chosen = await (await savedResponse).json();
  await expect(panel.getByRole("status")).toContainText(
    "Saved in your private notebook",
  );
  await panel.getByRole("button", { name: "New note", exact: true }).click();
  await panel
    .getByLabel("Title", { exact: true })
    .fill("Unselected notebook thought");
  await panel
    .getByLabel("Your thinking")
    .fill("PRIVATE UNSELECTED NOTE MATERIAL");
  await panel.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(panel.getByRole("status")).toContainText(
    "Saved in your private notebook",
  );
  await chooseNotebookTool(panel, "Notes");
  await panel.getByLabel("Notes to show").selectOption("all");
  page.once("dialog", (dialog) => dialog.accept());
  await panel
    .locator("article")
    .filter({
      has: page.getByRole("heading", {
        name: "Chosen notebook thought",
        exact: true,
      }),
    })
    .getByRole("button", { name: "Discuss this note" })
    .click();
  await expect(panel).toHaveAttribute("aria-label", "Teaching assistant");
  await panel
    .getByText("1 notebook notes selected for context", { exact: true })
    .click();
  await expect(panel.getByLabel("Selected notebook context")).toContainText(
    "Chosen notebook thought",
  );
  await expect(panel.getByLabel("Selected notebook context")).not.toContainText(
    "PRIVATE UNSELECTED NOTE MATERIAL",
  );
  await expect(
    panel.getByLabel("Message to the teaching assistant"),
  ).toHaveValue("");
  await page.screenshot({
    path: test.info().outputPath("assistant-context.png"),
  });
  let synthetic: LearningConversation | null = null;
  const supplied: { noteIds: string[]; text: string }[] = [];
  await page.route(
    `${companionAddress}/agent/conversations/*`,
    async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        supplied.push(request.postDataJSON());
        synthetic = {
          id: new URL(request.url()).pathname.split("/").pop()!,
          title: chosen.source.title,
          source: chosen.source,
          threadId: null,
          state: "idle",
          error: null,
          updatedAt: new Date().toISOString(),
          messages: [
            {
              id: "c0000000-0000-4000-8000-000000000001",
              role: "student",
              text: supplied[0]!.text,
              noteIds: supplied[0]!.noteIds,
              at: new Date().toISOString(),
            },
            {
              id: "c0000000-0000-4000-8000-000000000002",
              role: "agent",
              text: String.raw`Synthetic suggestion for a **reviewed** notebook draft.

[Source chapter](/chapters/benchmarking/) and [external source](https://example.org/).

| Quantity | Value |
| --- | --- |
| Work | 10 |

Inline \(L = \lambda W\) and $L$.

\[L = 20 \times 0.5 = 10\]

\(\unknowncommand{fallback}\)

<img src="https://example.org/tracker" onerror="alert(1)">
<iframe src="https://example.org/"></iframe>
[unsafe](javascript:alert%281%29)
![Image description](https://example.org/image.png)

~~~html
<script>alert(1)</script>
\(literal code\)
~~~`,
              at: new Date().toISOString(),
              teaching: {
                policy: {
                  id: "scalableweb-study-assistant",
                  version: "1",
                  name: "Teaching assistant",
                },
                provider: { name: "Synthetic", version: "test-version" },
              },
            },
          ],
        };
      }
      if (synthetic) await route.fulfill({ json: synthetic });
      else await route.continue();
    },
  );
  await panel
    .getByLabel("Message to the teaching assistant")
    .fill("Discuss only my chosen note.");
  await panel
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  await expect(panel.locator(".learning-messages")).toContainText(
    "Synthetic suggestion",
  );
  const reply = panel.locator(".learning-reply");
  await expect(reply.locator("strong")).toHaveText("reviewed");
  await expect(
    reply.getByRole("link", { name: "Source chapter" }),
  ).toHaveAttribute("href", /\/chapters\/benchmarking\/$/);
  await expect(
    reply.getByRole("link", { name: "external source" }),
  ).toHaveAttribute("rel", "noopener noreferrer");
  await expect(reply.getByRole("table")).toContainText("Work");
  await expect(reply.locator("math")).toHaveCount(3);
  await expect(reply.locator(".learning-math code")).toContainText(
    "unknowncommand",
  );
  await expect(reply.locator("pre code")).toContainText(
    String.raw`\(literal code\)`,
  );
  await expect(
    reply.locator("img, iframe, script, a[href^='javascript:']"),
  ).toHaveCount(0);
  await expect(reply).toContainText('onerror="alert(1)"');
  await expect(reply).toContainText("Image description");
  expect(supplied[0]!.noteIds).toEqual([chosen.id]);
  await panel.getByText("About this reply", { exact: true }).click();
  await expect(
    panel.getByText(/policy scalableweb-study-assistant v1/),
  ).toBeVisible();
  // An earlier reply must not acquire today's policy on a resumed conversation.
  delete synthetic!.messages[1]!.teaching;
  await page.reload();
  await expect(panel.locator(".learning-messages")).toContainText(
    "Synthetic suggestion",
  );
  await panel.getByText("About this reply", { exact: true }).click();
  await expect(
    panel.getByText(
      "Teaching policy and provider version were not recorded for this earlier reply.",
    ),
  ).toBeVisible();
  expect(await panel.locator(".learning-messages").innerText()).not.toContain(
    "scalableweb-study-assistant",
  );
  synthetic!.messages[1]!.teaching = {
    policy: {
      id: "scalableweb-study-assistant",
      version: "1",
      name: "Teaching assistant",
    },
    provider: { name: "Synthetic", version: "test-version" },
  };
  await expect(
    panel
      .getByRole("region", { name: "Assistant context" })
      .getByRole("link")
      .first(),
  ).toHaveAttribute("href", originalSource!);
  await chooseNotebookTool(panel, "Write");
  await panel.getByRole("button", { name: "New note", exact: true }).click();
  await panel
    .getByLabel("Your thinking")
    .fill("Keep this separate unfinished note.");
  await chooseNotebookTool(panel, "Discuss");
  await expect(panel.locator(".learning-messages")).toContainText(
    "Synthetic suggestion",
  );
  page.once("dialog", (dialog) => dialog.dismiss());
  await panel.getByRole("button", { name: "Use as a notebook draft" }).click();
  await expect(panel).toHaveAttribute("aria-label", "Teaching assistant");
  await chooseNotebookTool(panel, "Write");
  await expect(panel.getByLabel("Your thinking")).toHaveValue(
    "Keep this separate unfinished note.",
  );
  await chooseNotebookTool(panel, "Discuss");
  page.once("dialog", (dialog) => dialog.accept());
  await panel.getByRole("button", { name: "Write a takeaway" }).click();
  await expect(panel).toHaveAttribute("aria-label", "My learning notebook");
  await expect(panel.getByLabel("Your thinking")).toHaveValue("");
  await page.screenshot({
    path: test.info().outputPath("notebook-takeaway.png"),
  });
  await panel
    .getByLabel("Your thinking")
    .fill("My own reviewed explanation, rather than the transcript.");
  const takeawayResponse = page.waitForResponse(
    (response) =>
      response.url() === `${companionAddress}/entries` &&
      response.request().method() === "POST",
  );
  await panel.getByRole("button", { name: "Save note", exact: true }).click();
  const takeaway = await (await takeawayResponse).json();
  expect(takeaway.source).toEqual(chosen.source);
  expect(takeaway.relatedIds).toEqual([chosen.id]);
  expect(takeaway.history[0].assistance).toContain(
    "Student-written takeaway after discussion",
  );
  expect(takeaway.history[0].assistance).toContain(
    "policy scalableweb-study-assistant v1",
  );
  await chooseNotebookTool(panel, "Connect");
  const download = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Export notebook backup" }).click();
  const exported = await download;
  const archive = JSON.parse(
    await (
      await import("node:fs/promises")
    ).readFile((await exported.path())!, "utf8"),
  );
  expect(
    archive.entries.find((entry: { id: string }) => entry.id === takeaway.id),
  ).toMatchObject({
    source: chosen.source,
    relatedIds: [chosen.id],
    body: "My own reviewed explanation, rather than the transcript.",
  });
});

test("optional changed cases preserve drafts and separate linked attempts without an agent", async ({
  page,
}) => {
  await page.goto("/demos/#demo-queue-balance-lab");
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Notebook", exact: true })
    .click();
  const panel = activeLearningPanel(page);
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await chooseNotebookTool(panel, "Chapter guide");
  await panel
    .getByLabel("Demo on this page")
    .selectOption("demo-queue-balance-lab");
  const practice = panel.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Apply it in a different situation",
    }),
  });
  await expect(practice).toContainText("300 waiting events");
  const check = practice.locator("details").filter({
    has: page.getByText("Self-check after my attempt", { exact: true }),
  });
  await expect(check).not.toHaveAttribute("open");
  await practice
    .getByRole("button", { name: "Ask for help with this case" })
    .click();
  await expect(
    panel.getByLabel("Message to the teaching assistant"),
  ).toHaveValue(/300 waiting events/);
  await chooseNotebookTool(panel, "Chapter guide");
  await panel
    .getByLabel("My prediction or uncertainty")
    .fill("I am unsure whether the stable average still applies.");
  const saved: {
    id: string;
    kind: string;
    body: string;
    relatedIds: string[];
    source: { excerpt: string; revision: string };
  }[] = [];
  page.on("response", (response) => {
    if (
      response.url() === `${companionAddress}/entries` &&
      response.request().method() === "POST" &&
      response.ok()
    )
      void response.json().then((entry) => saved.push(entry));
  });
  await panel.getByRole("button", { name: "Save my starting point" }).click();
  await expect(
    panel.getByText("Starting point saved.", { exact: false }),
  ).toBeVisible();
  await panel
    .getByRole("button", { name: "Save demo result", exact: true })
    .click();
  await expect(
    panel.getByText("Demo result saved.", { exact: false }),
  ).toBeVisible();
  await chooseNotebookTool(panel, "Notes");
  await expect(
    panel.getByText("Demo source is present on this page.", { exact: false }),
  ).toHaveCount(2);
  await expect(
    panel.getByText("This source may have changed or moved.", {
      exact: false,
    }),
  ).toHaveCount(0);
  await page.locator("#demo-queue-balance-lab input").first().fill("25");
  await chooseNotebookTool(panel, "Write");
  await chooseNotebookTool(panel, "Notes");
  await expect(
    panel.getByText("Demo source is present on this page.", { exact: false }),
  ).toHaveCount(2);
  await expect(
    panel.getByText("This source may have changed or moved.", {
      exact: false,
    }),
  ).toHaveCount(0);
  await chooseNotebookTool(panel, "Chapter guide");
  await practice
    .getByLabel("My explanation of the changed case")
    .fill(
      "The backlog drains by 20 per second; I expect 15 seconds. At 120 arrivals it grows. I need more help with stable windows.",
    );
  await page.reload();
  await expect(
    practice.getByLabel("My explanation of the changed case"),
  ).toHaveValue(/20 per second/);
  await expect(check).not.toHaveAttribute("open");
  await practice
    .getByText("Self-check after my attempt", { exact: true })
    .click();
  await expect(check).toContainText("Compare arrivals with completions");
  await practice
    .getByRole("button", { name: "Save my independent attempt" })
    .click();
  await expect(practice.getByRole("status")).toContainText(
    "Independent attempt saved separately",
  );
  await panel
    .getByLabel("My reflection on this check")
    .fill(
      "Still unsure; the observation and changed case address different intervals.",
    );
  await panel
    .getByRole("button", { name: "Save my reflection", exact: true })
    .click();
  await expect(
    panel.getByText("Reflection saved.", { exact: false }),
  ).toBeVisible();
  await expect.poll(() => saved.length).toBe(4);
  expect(saved.map((entry) => entry.kind)).toEqual([
    "attempt",
    "scratch",
    "revisit",
    "reflection",
  ]);
  expect(saved[2]!.source.excerpt).toContain("queue-drain (version 1)");
  expect(saved[2]!.source.revision).toMatch(/^[a-f0-9]{64}$/);
  expect(saved[2]!.relatedIds).toEqual(
    expect.arrayContaining([saved[0]!.id, saved[1]!.id]),
  );
  expect(saved[3]!.relatedIds).toEqual(
    expect.arrayContaining([saved[0]!.id, saved[1]!.id, saved[2]!.id]),
  );
  // A missing anchor remains a real source-location warning.
  await page
    .locator("#demo-queue-balance-lab")
    .evaluate((demo) => demo.remove());
  await chooseNotebookTool(panel, "Notes");
  await expect(
    panel.getByText("This source may have changed or moved.", { exact: false }),
  ).toHaveCount(4);
  await chooseNotebookTool(panel, "Chapter guide");
  await page.goto("/chapters/introduction/");
  await expect(practice).toContainText("Choose one claim from this reading");
  await expect(
    panel.getByRole("button", { name: "Save demo result", exact: true }),
  ).toHaveCount(0);
  await practice
    .getByLabel("My explanation of the changed case")
    .fill("My project may use a different boundary.");
  await page.goto("/chapters/architecture/");
  await expect(panel.getByRole("heading", { level: 2 })).toHaveText(
    "4 · Architecture",
  );
  await expect(practice).toBeVisible();
  await page.goto("/chapters/introduction/");
  await expect(
    practice.getByLabel("My explanation of the changed case"),
  ).toHaveValue("My project may use a different boundary.");
  await practice
    .getByRole("button", { name: "Save my independent attempt" })
    .click();
  await expect(practice.getByRole("status")).toContainText(
    "Independent attempt saved separately",
  );
  await panel
    .getByRole("button", { name: "Write a reflection on this reading" })
    .click();
  await panel.getByLabel("Your thinking").fill("I still want help.");
  await panel.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(panel.getByRole("status")).toContainText(
    "Saved in your private notebook.",
  );
});

test("whole-book entry points keep the notebook lazy and exclude administrative/course records", async ({
  page,
}) => {
  const routes = new Set(
    conceptPages
      .map((item) => item.url)
      .filter((url) =>
        /^\/(chapters|appendices|parts|case-studies|project)\//.test(url),
      ),
  );
  routes.add("/concepts/");
  routes.add("/explore/");
  routes.add("/demos/");
  routes.add("/notebook/setup/");
  for (const route of routes) {
    await page.goto(route);
    await expect(
      page
        .locator(".site-header")
        .getByRole("button", { name: "Notebook", exact: true }),
    ).toBeVisible();
    await expect(
      page
        .locator(".site-header")
        .getByRole("button", { name: "Teaching assistant", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".learning-workspace")).toHaveCount(0);
    await expect(page.locator(".paragraph-notebook-button")).toHaveCount(0);
    expect(
      await page
        .locator('meta[name="book-content-revision"]')
        .getAttribute("content"),
    ).toMatch(/^[a-f0-9]{64}$/);
  }
  await page.goto("/admin/courses/");
  await expect(page.locator('[data-learning-toggle="notebook"]')).toBeHidden();
  await expect(page.locator('[data-learning-toggle="assistant"]')).toBeHidden();
});

test("a student captures a passage, revises thinking, revisits it and prepares selected private material", async ({
  page,
}) => {
  await page.goto("/chapters/benchmarking/");
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Notebook", exact: true })
    .click();
  const panel = activeLearningPanel(page);
  await expect(panel).toBeVisible();
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await selectReading(page);
  await panel.getByRole("button", { name: "Use selected text" }).click();
  await panel
    .getByLabel("Title", { exact: true })
    .fill("Synthetic queue observation");
  await panel
    .getByLabel("Your thinking")
    .fill("Which averages describe the same observation window?");
  await panel.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(panel.getByRole("status")).toHaveText(
    "Saved in your private notebook.",
  );
  await panel.getByLabel("Kind of note").selectOption("reflection");
  await panel
    .getByLabel("Your thinking")
    .fill(
      "I now check whether the averages describe a common stable interval before applying the relationship. My next step is to test a different observation window.",
    );
  await expect(
    panel.getByText("This is a suggestion, not a minimum.", { exact: false }),
  ).toBeVisible();
  await panel.getByText("Examples of reflection", { exact: true }).click();
  await expect(
    panel.getByRole("heading", { name: "Honest uncertainty" }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Save note", exact: true }).click();
  await chooseNotebookTool(panel, "Notes");
  await panel.getByText("2 saved revisions", { exact: true }).click();
  await expect(panel.getByText(/Which averages describe/)).toBeVisible();
  await panel.getByLabel("Select Synthetic queue observation").check();
  await panel.getByRole("button", { name: "Prepare selected notes" }).click();
  await panel.getByRole("button", { name: "Build submission draft" }).click();
  await expect(
    panel.getByLabel("Review and revise your submission material"),
  ).toHaveValue(/common stable interval/);
  await chooseNotebookTool(panel, "Concepts");
  await panel.getByLabel("Concept", { exact: true }).selectOption("queue");
  await panel.getByLabel("Studied", { exact: true }).check();
  await panel
    .getByLabel("My current understanding")
    .selectOption("can-explain");
  await panel
    .getByLabel("What will I investigate next?")
    .fill("Test a growing queue.");
  await panel
    .getByLabel("Synthetic queue observation", { exact: true })
    .check();
  await panel.getByRole("button", { name: "Save self-assessment" }).click();
  await expect(panel.getByRole("status")).toHaveText(
    "Saved your dated self-assessment.",
  );
  await chooseNotebookTool(panel, "Notes");
  await panel.getByRole("button", { name: "Revisit", exact: true }).click();
  await expect(
    panel.getByText("Before rereading, explain the idea from memory", {
      exact: false,
    }),
  ).toBeVisible();
  await panel
    .getByLabel("Your thinking")
    .fill(
      "The relation uses consistent averages. In a changed case I would first check stability.",
    );
  await panel.getByRole("button", { name: "Save note", exact: true }).click();
  await panel.getByRole("button", { name: "Close notebook" }).click();
  await page.reload();
  await expect(page.locator(".paragraph-notebook-button")).toHaveCount(0);
  await expect(page.locator(".learning-workspace")).toHaveCount(0);
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Notebook", exact: true })
    .click();
  await expect(panel).toBeVisible();
  await chooseNotebookTool(panel, "Notes");
  await expect(
    panel.getByRole("heading", {
      name: "Revisit: Synthetic queue observation",
    }),
  ).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include(".learning-workspace").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("notebook-desktop.png"),
    fullPage: false,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("[data-theme-picker]").selectOption("dark");
  const bounds = await panel.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(
    await panel.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("notebook-mobile-dark.png"),
    fullPage: false,
  });
  await chooseNotebookTool(panel, "Connect");
  await panel.getByRole("button", { name: "Disconnect", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Add this paragraph to my notebook" }),
  ).toHaveCount(0);
});

test("opening either experience preserves book, reading and demo widths with expanded or folded navigation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/chapters/scaling/");
  await page.evaluate(() => document.fonts.ready);
  const panel = activeLearningPanel(page);
  const shell = page.locator(".book-shell");
  const navigation = page.locator("#book-navigation details");
  const toggle = navigation.locator("summary");
  const targets = [
    shell,
    page.locator(".chapter-main"),
    page.locator(".prose"),
    page.locator(".prose > p:not(.chapter-kicker)").first(),
    page.locator("[data-scaling-demo]"),
  ];
  for (const width of [2560, 1920, 1600, 1280, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const collapsed of width > 1216 ? [false, true] : [false]) {
      const isCollapsed = (await navigation.getAttribute("open")) === null;
      if (isCollapsed !== collapsed) await toggle.click();
      await expect(shell).toHaveAttribute(
        "data-navigation-collapsed",
        String(collapsed),
      );
      // Let the navigation's own layout settle before measuring the baseline.
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      for (const experience of ["Notebook", "Teaching assistant"]) {
        const before = await Promise.all(
          targets.map((target) => target.boundingBox()),
        );
        await page
          .locator(".site-header")
          .getByRole("button", { name: experience, exact: true })
          .click();
        await expect(panel).toBeVisible();
        for (const [index, target] of targets.entries()) {
          await expect
            .poll(
              async () => {
                const after = await target.boundingBox();
                const original = before[index]!;
                return Math.max(
                  Math.abs(after!.x - original.x),
                  Math.abs(after!.width - original.width),
                  index === 3 ? Math.abs(after!.height - original.height) : 0,
                );
              },
              {
                message: `Book geometry at ${width}px, navigation ${collapsed ? "folded" : "expanded"}, target ${index}`,
              },
            )
            .toBeLessThan(1);
        }
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth + 1,
          ),
        ).toBe(true);
        if (width === 2560 && !collapsed) {
          const reading = await targets[1]!.boundingBox();
          const notebook = await panel.boundingBox();
          expect(
            Math.abs(reading!.x + reading!.width / 2 - width / 2),
          ).toBeLessThan(1);
          expect(
            (await targets[4]!.boundingBox())!.x + before[4]!.width,
          ).toBeLessThanOrEqual(notebook!.x);
          await page.screenshot({
            path: test
              .info()
              .outputPath(
                `${experience.replaceAll(" ", "-").toLowerCase()}-wide-unchanged.png`,
              ),
          });
        }
        await panel.locator("[data-learning-close]").click();
        await expect(panel).toBeHidden();
        for (const [index, target] of targets.entries()) {
          const after = await target.boundingBox();
          expect(Math.abs(after!.width - before[index]!.width)).toBeLessThan(1);
        }
      }
    }
  }
});

test("students choose task support and direct explanations without a saved initial note", async ({
  page,
}) => {
  // A configured provider may still fail when contacted; retain the request.
  await advertiseProvider(page);
  await page.goto("/chapters/benchmarking/");
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Notebook", exact: true })
    .click();
  const panel = activeLearningPanel(page);
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText("Connected");
  await chooseNotebookTool(panel, "Discuss");
  await panel.getByLabel("How I want help").selectOption("explanation");
  await panel.getByLabel("Where I want support").selectOption("prerequisite");
  await panel
    .getByLabel("My learning goal")
    .fill("Understand the measurement window");
  await panel
    .getByLabel("Message to the teaching assistant")
    .fill(
      "I do not know what a common observation window means. Please explain directly.",
    );
  const request = page.waitForRequest(
    (request) =>
      request.url().startsWith(companionAddress + "/agent/conversations/") &&
      request.method() === "POST",
  );
  await panel.getByRole("button", { name: "Send message" }).click();
  const sent = (await request).postDataJSON();
  expect(sent).toMatchObject({
    mode: "explanation",
    supportNeed: "prerequisite",
    noteIds: [],
  });
  expect(sent.text).toContain("Support requested: A prerequisite concept.");
  await expect(panel.getByRole("status")).toContainText(
    "Enable Codex or a local model",
  );
  await panel.getByLabel("Where I want support").selectOption("next-step");
  await expect(panel.getByLabel("How I want help")).toHaveValue("explanation");
  await chooseNotebookTool(panel, "Notes");
  await expect(
    panel.getByText("No notes in this view yet.", { exact: false }),
  ).toBeVisible();
  await chooseNotebookTool(panel, "Chapter guide");
  await panel
    .getByLabel("My prediction or uncertainty")
    .fill("I am unsure which inputs describe the same window.");
  page.once("dialog", (dialog) => dialog.accept());
  await panel
    .getByRole("button", { name: "Help me get started", exact: true })
    .click();
  await expect(
    panel.getByLabel("Message to the teaching assistant"),
  ).toHaveValue("I am unsure which inputs describe the same window.");
  await expect(
    panel.getByLabel("Investigation source").locator("option").first(),
  ).toContainText("Investigation ·");
  await expect(panel.getByLabel("Where I want support")).toHaveValue(
    "getting-started",
  );
  await expect(panel.getByLabel("How I want help")).toHaveValue("hint");
});

test("selected context is explicit and the notebook follows chapters without losing a draft", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith(companionAddress))
      requests.push(request.url());
  });
  await page.goto("/chapters/benchmarking/");
  await expect(
    page
      .locator(".site-header")
      .getByRole("button", { name: "Notebook", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".learning-workspace")).toHaveCount(0);
  await expect(page.locator(".paragraph-notebook-button")).toHaveCount(0);
  expect(requests).toEqual([]);
  const passage = await selectReading(page);
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Notebook", exact: true })
    .click();
  const panel = activeLearningPanel(page);
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await expect(panel.locator("blockquote")).toHaveText(
    passage.slice(0, 500) + (passage.length > 500 ? "…" : ""),
  );
  await panel
    .getByLabel("Title", { exact: true })
    .fill("Synthetic selected passage");
  await panel
    .getByLabel("Your thinking")
    .fill("Synthetic observation about this selected passage.");
  await panel.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(panel.getByRole("status")).toHaveText(
    "Saved in your private notebook.",
  );

  await chooseNotebookTool(panel, "Notes");
  await expect(
    panel.getByText("Captured text is present on this page.", { exact: true }),
  ).toBeVisible();
  await page
    .locator("[data-comment-target]")
    .first()
    .evaluate((paragraph) => {
      paragraph.textContent =
        "Synthetic revised passage with different source text.";
    });
  await chooseNotebookTool(panel, "Write");
  await chooseNotebookTool(panel, "Notes");
  await expect(
    panel.getByText("This source may have changed or moved.", { exact: false }),
  ).toBeVisible();
  await chooseNotebookTool(panel, "Write");
  await page.goto("/chapters/architecture/");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { level: 2 })).toHaveText(
    "4 · Architecture",
  );
  const notebookBounds = await panel.boundingBox();
  expect(notebookBounds!.x).toBeGreaterThanOrEqual(0);
  expect(notebookBounds!.x + notebookBounds!.width).toBeLessThanOrEqual(1280);
  await expect(
    panel.getByRole("region", { name: "Note context" }),
  ).toContainText("Writing about");
  await expect(panel.locator("blockquote")).toHaveCount(0);
  await expect(panel.locator("summary", { hasText: "Reading:" })).toHaveCount(
    0,
  );
  await chooseNotebookTool(panel, "Notes");
  await expect(
    panel.getByRole("heading", { name: "Synthetic selected passage" }),
  ).toHaveCount(0);
  await panel.getByLabel("Notes to show").selectOption("all");
  await expect(
    panel.getByRole("heading", { name: "Synthetic selected passage" }),
  ).toBeVisible();
  await chooseNotebookTool(panel, "Chapter guide");
  await expect(panel.getByText(/cached feed/)).toBeVisible();
  await expect(
    panel
      .getByLabel("Demo in this chapter")
      .locator("option", { hasText: "Boundary trace" }),
  ).toHaveCount(1);
  await expect(
    panel
      .getByLabel("Demo in this chapter")
      .locator("option", { hasText: "Queue balance lab" }),
  ).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Save demo result", exact: true }),
  ).toBeDisabled();
  await expect(
    panel.getByText(
      "Save a prediction or uncertainty to enable Save demo result.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("architecture-guide.png"),
    fullPage: false,
  });

  await page.goto("/chapters/introduction/");
  await expect(panel).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Chapter guide", exact: true }),
  ).toHaveAttribute("aria-current", "true");
  await expect(
    panel.getByText(/There is no interactive demo on this page/),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Save demo result", exact: true }),
  ).toHaveCount(0);
  await chooseNotebookTool(panel, "Write");
  await panel
    .getByLabel("Title", { exact: true })
    .fill("Synthetic unfinished introduction note");
  await panel
    .getByLabel("Your thinking")
    .fill(
      "Keep this thought attached to the introduction.\nThe next paragraph is unfinished. ",
    );
  await page.locator('a[href="/chapters/scaling/"]').first().click();
  await expect(panel).toBeVisible();
  await expect(panel.getByLabel("Your thinking")).toHaveValue(
    "Keep this thought attached to the introduction.\nThe next paragraph is unfinished. ",
  );
  await expect(
    panel.getByRole("region", { name: "Note context" }),
  ).toContainText("still belongs to its original reading");
  await expect(
    panel.getByRole("region", { name: "Note context" }).getByRole("link"),
  ).toHaveAttribute("href", /\/chapters\/introduction\//);
  await chooseNotebookTool(panel, "Concepts");
  await expect(panel.getByLabel("Concept", { exact: true })).toHaveValue(
    conceptPages.find((page) => page.url === "/chapters/scaling/")!
      .concepts[0]!,
  );
  await chooseNotebookTool(panel, "Discuss");
  await expect(
    panel.getByRole("region", { name: "Assistant context" }),
  ).toContainText("This conversation keeps its original source");
  await panel
    .getByRole("button", { name: "Discuss the current reading" })
    .click();
  await expect(
    panel.getByLabel("Investigation source").locator("option").first(),
  ).toContainText(
    "Current reading · How should web applications respond to scaling pressure?",
  );
  await chooseNotebookTool(panel, "Write");
  await expect(
    panel.getByRole("region", { name: "Note context" }).getByRole("link"),
  ).toHaveAttribute("href", /\/chapters\/introduction\//);
  await panel.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(panel.getByRole("status")).toHaveText(
    "Saved in your private notebook.",
  );
  await panel.getByRole("button", { name: "New note", exact: true }).click();
  await expect(
    panel.getByRole("region", { name: "Note context" }),
  ).toBeInViewport();
  await expect(
    panel.getByRole("region", { name: "Note context" }).getByRole("link"),
  ).toHaveAttribute("href", /\/chapters\/scaling\//);
  await page.screenshot({
    path: test.info().outputPath("chapter-writing.png"),
    fullPage: false,
  });
  await panel.getByRole("button", { name: "Close notebook" }).click();
  await page.goto("/chapters/benchmarking/");
  await expect(
    page
      .locator(".site-header")
      .getByRole("button", { name: "Notebook", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#learning-assistant")).toBeVisible();
  await expect(page.locator("#learning-notebook")).toBeHidden();
  await page
    .locator("#learning-assistant")
    .getByRole("button", { name: "Close teaching assistant" })
    .click();
  await page.goto("/chapters/introduction/");
  await expect(page.locator(".learning-workspace")).toHaveCount(0);
});

test("a restored open notebook explains unavailable or expired connections and retains writing", async ({
  page,
}) => {
  await page.goto("/chapters/benchmarking/");
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Notebook", exact: true })
    .click();
  const panel = page.locator("#learning-notebook");
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await panel
    .getByLabel("Your thinking")
    .fill("Synthetic unfinished draft survives recovery.");
  await page.locator('.site-header [data-learning-toggle="assistant"]').click();
  const assistant = page.locator("#learning-assistant");
  await assistant
    .getByLabel("Message to the teaching assistant")
    .fill("My assistant question survives a shared connection failure.");
  let restoreChecks = 0;
  await page.route(`${companionAddress}/status`, (route) => {
    restoreChecks++;
    return route.abort();
  });
  await page.reload();
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("status")).toContainText("cannot tell us which");
  await expect(
    panel.getByRole("button", { name: "Connect companion", exact: true }),
  ).toBeVisible();
  await expect(
    assistant.getByRole("button", { name: "Connect companion", exact: true }),
  ).toBeVisible();
  expect(restoreChecks).toBe(1);
  await page.unroute(`${companionAddress}/status`);
  await page.reload();
  await expect(panel.getByLabel("Your thinking")).toHaveValue(
    "Synthetic unfinished draft survives recovery.",
  );
  await expect(
    assistant.getByLabel("Message to the teaching assistant"),
  ).toHaveValue("My assistant question survives a shared connection failure.");
  await page.route(`${companionAddress}/status`, (route) =>
    route.fulfill({ json: { connected: true, version: 2, provider: "Codex" } }),
  );
  await page.reload();
  await chooseNotebookTool(panel, "Connect");
  await expect(
    panel.getByText(
      "This installed companion does not report a teaching policy. It keeps its existing instructions.",
    ),
  ).toBeVisible();
  await expect(
    panel.getByRole("link", {
      name: "Companion setup and release availability",
    }),
  ).toHaveAttribute("href", "/notebook/setup/");
  await chooseNotebookTool(panel, "Write");
  await expect(panel.getByLabel("Your thinking")).toHaveValue(
    "Synthetic unfinished draft survives recovery.",
  );
  await page.unroute(`${companionAddress}/status`);
  await page.route(`${companionAddress}/status`, (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "Synthetic companion session expired." }),
    }),
  );
  await page.reload();
  await expect(panel.getByRole("status")).toContainText("session expired");
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("book-learning-connection"),
    ),
  ).toBeNull();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(sessionStorage.getItem("book-learning-workspace")!).editor
          .body,
    ),
  ).toBe("Synthetic unfinished draft survives recovery.");
});
