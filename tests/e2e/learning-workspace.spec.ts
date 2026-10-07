import {
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

let child: ChildProcess;
let directory: string;
let code: string;
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
  code = await new Promise<string>((resolve, reject) => {
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
      const match = output.match(/Pairing code .*: ([A-Za-z0-9_-]+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]!);
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

test("optional changed cases preserve drafts and separate linked attempts without an agent", async ({
  page,
}) => {
  await page.goto("/demos/#demo-queue-balance-lab");
  await page.getByRole("button", { name: "Notebook", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "My learning notebook" });
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel.getByLabel("Pairing code").fill(code);
  await panel.getByRole("button", { name: "Pair companion" }).click();
  await panel
    .getByRole("button", { name: "Chapter guide", exact: true })
    .click();
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
  await expect(panel.getByLabel("Message to my agent")).toHaveValue(
    /300 waiting events/,
  );
  await panel
    .getByRole("button", { name: "Chapter guide", exact: true })
    .click();
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
      page.getByRole("button", { name: "Notebook", exact: true }),
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
  await expect(page.locator("[data-learning-toggle]")).toBeHidden();
});

test("a student captures a passage, revises thinking, revisits it and prepares selected private material", async ({
  page,
}) => {
  await page.goto("/chapters/benchmarking/");
  await page.getByRole("button", { name: "Notebook", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "My learning notebook" });
  await expect(panel).toBeVisible();
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel.getByLabel("Pairing code").fill(code);
  await panel.getByRole("button", { name: "Pair companion" }).click();
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
  await panel.getByRole("button", { name: "Notes", exact: true }).click();
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
  await panel.getByRole("button", { name: "Notes", exact: true }).click();
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
  await page.getByRole("button", { name: "Notebook", exact: true }).click();
  await panel.getByRole("button", { name: "Notes", exact: true }).click();
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

test("an open notebook keeps wide reading centered and fits smaller desktops", async ({
  page,
}) => {
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.goto("/chapters/scaling/");
  const reading = page.locator(".chapter-main");
  const paragraph = page.locator(".prose > p:not(.chapter-kicker)").first();
  const panel = page.getByRole("dialog", { name: "My learning notebook" });
  const shell = page.locator(".book-shell");
  const navigation = page.locator("#book-navigation details");
  const toggle = navigation.locator("summary");
  const demo = page.locator("[data-scaling-demo]");
  await expect(paragraph).toBeVisible();
  const closedParagraph = await paragraph.boundingBox();

  await page.getByRole("button", { name: "Notebook", exact: true }).click();
  await expect(panel).toBeVisible();
  await expect
    .poll(async () => {
      const box = await paragraph.boundingBox();
      return Math.abs(box!.x - closedParagraph!.x);
    })
    .toBeLessThan(2);

  for (const width of [2560, 1920, 1600, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const collapsed of [false, true]) {
      const isCollapsed = (await navigation.getAttribute("open")) === null;
      if (isCollapsed !== collapsed) await toggle.click();
      await expect(shell).toHaveAttribute(
        "data-navigation-collapsed",
        String(collapsed),
      );
      await expect
        .poll(async () => {
          const box = await reading.boundingBox();
          const notebook = await panel.boundingBox();
          return notebook!.x - (box!.x + box!.width);
        })
        .toBeGreaterThanOrEqual(0);
      if (width >= 1920) {
        await expect
          .poll(async () => {
            const box = await reading.boundingBox();
            return Math.abs(box!.x + box!.width / 2 - width / 2);
          })
          .toBeLessThan(2);
      }
      const readingBox = await reading.boundingBox();
      expect(readingBox!.width).toBeGreaterThan(300);
      const demoBox = await demo.boundingBox();
      const notebookBox = await panel.boundingBox();
      expect(demoBox!.x + demoBox!.width).toBeLessThanOrEqual(notebookBox!.x);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth + 1,
        ),
      ).toBe(true);
      if (width === 2560 && !collapsed)
        await page.screenshot({
          path: test.info().outputPath("notebook-wide-centered.png"),
        });
    }
  }

  await page.setViewportSize({ width: 2560, height: 1440 });
  if ((await navigation.getAttribute("open")) === null) await toggle.click();
  await panel.getByRole("button", { name: "Close notebook" }).click();
  await expect(panel).toBeHidden();
  await expect
    .poll(async () => {
      const box = await paragraph.boundingBox();
      return Math.abs(box!.x - closedParagraph!.x);
    })
    .toBeLessThan(2);
});

test("students choose task support and direct explanations without a saved initial note", async ({
  page,
}) => {
  await page.goto("/chapters/benchmarking/");
  await page.getByRole("button", { name: "Notebook", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "My learning notebook" });
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel.getByLabel("Pairing code").fill(code);
  await panel.getByRole("button", { name: "Pair companion" }).click();
  await expect(panel.getByRole("status")).toContainText("Connected");
  await panel.getByRole("button", { name: "Agent", exact: true }).click();
  await panel.getByLabel("How I want help").selectOption("explanation");
  await panel.getByLabel("Where I want support").selectOption("prerequisite");
  await panel
    .getByLabel("My learning goal")
    .fill("Understand the measurement window");
  await panel
    .getByLabel("Message to my agent")
    .fill(
      "I do not know what a common observation window means. Please explain directly.",
    );
  const request = page.waitForRequest(
    (request) =>
      request.url().startsWith(companionAddress + "/agent/conversations/") &&
      request.method() === "POST",
  );
  await panel.getByRole("button", { name: "Send to my agent" }).click();
  const sent = (await request).postDataJSON();
  expect(sent).toMatchObject({
    mode: "explanation",
    supportNeed: "prerequisite",
    noteIds: [],
  });
  expect(sent.text).toContain("Support requested: A prerequisite concept.");
  await expect(panel.getByRole("status")).toContainText("--codex");
  await panel.getByLabel("Where I want support").selectOption("next-step");
  await expect(panel.getByLabel("How I want help")).toHaveValue("explanation");
  await panel.getByRole("button", { name: "Notes", exact: true }).click();
  await expect(
    panel.getByText("No notes in this view yet.", { exact: false }),
  ).toBeVisible();
  await panel
    .getByRole("button", { name: "Chapter guide", exact: true })
    .click();
  await panel
    .getByLabel("My prediction or uncertainty")
    .fill("I am unsure which inputs describe the same window.");
  await panel
    .getByRole("button", { name: "Help me get started", exact: true })
    .click();
  await expect(panel.getByLabel("Message to my agent")).toHaveValue(
    "I am unsure which inputs describe the same window.",
  );
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
    page.getByRole("button", { name: "Notebook", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".learning-workspace")).toHaveCount(0);
  await expect(page.locator(".paragraph-notebook-button")).toHaveCount(0);
  expect(requests).toEqual([]);
  const passage = await selectReading(page);
  await page.getByRole("button", { name: "Notebook", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "My learning notebook" });
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel.getByLabel("Pairing code").fill(code);
  await panel.getByRole("button", { name: "Pair companion" }).click();
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

  await page.goto("/chapters/architecture/");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { level: 2 })).toHaveText(
    "4 · Architecture",
  );
  const readingBounds = await page.locator(".chapter-main").boundingBox();
  const notebookBounds = await panel.boundingBox();
  expect(readingBounds!.x + readingBounds!.width).toBeLessThanOrEqual(
    notebookBounds!.x,
  );
  await expect(
    panel.getByRole("region", { name: "Note context" }),
  ).toContainText("Writing about");
  await expect(panel.locator("blockquote")).toHaveCount(0);
  await expect(panel.locator("summary", { hasText: "Reading:" })).toHaveCount(
    0,
  );
  await panel.getByRole("button", { name: "Notes", exact: true }).click();
  await expect(
    panel.getByRole("heading", { name: "Synthetic selected passage" }),
  ).toHaveCount(0);
  await panel.getByLabel("Notes to show").selectOption("all");
  await expect(
    panel.getByRole("heading", { name: "Synthetic selected passage" }),
  ).toBeVisible();
  await panel
    .getByRole("button", { name: "Chapter guide", exact: true })
    .click();
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
  await panel.getByRole("button", { name: "Write", exact: true }).click();
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
  await panel.getByRole("button", { name: "Agent", exact: true }).click();
  await expect(
    panel.getByLabel("Investigation source").locator("option").first(),
  ).toContainText(
    "Current reading · How should web applications respond to scaling pressure?",
  );
  await panel.getByRole("button", { name: "Write", exact: true }).click();
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
    page.getByRole("button", { name: "Notebook", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".learning-workspace")).toHaveCount(0);
});

test("a restored open notebook explains unavailable or expired connections and retains writing", async ({
  page,
}) => {
  await page.goto("/chapters/benchmarking/");
  await page.getByRole("button", { name: "Notebook", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "My learning notebook" });
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel.getByLabel("Pairing code").fill(code);
  await panel.getByRole("button", { name: "Pair companion" }).click();
  await panel
    .getByLabel("Your thinking")
    .fill("Synthetic unfinished draft survives recovery.");
  await page.route(`${companionAddress}/status`, (route) => route.abort());
  await page.reload();
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("status")).toContainText("cannot tell us which");
  await expect(panel.getByLabel("Pairing code")).toBeVisible();
  await page.unroute(`${companionAddress}/status`);
  await page.reload();
  await expect(panel.getByLabel("Your thinking")).toHaveValue(
    "Synthetic unfinished draft survives recovery.",
  );
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
