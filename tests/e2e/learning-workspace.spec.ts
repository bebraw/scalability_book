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
