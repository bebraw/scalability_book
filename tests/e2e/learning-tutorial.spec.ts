import { test as base, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const address = "http://127.0.0.1:18896";
const test = base.extend<{ companion: string }>({
  companion: async ({ baseURL }, use) => {
    const directory = await mkdtemp(path.join(tmpdir(), "book-tutorial-"));
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
        const timer = setTimeout(
          () => reject(new Error("Tutorial companion did not start")),
          8000,
        );
        child.once("exit", () => {
          clearTimeout(timer);
          reject(new Error("Tutorial companion exited"));
        });
        child.stdout!.on("data", (chunk) => {
          if (String(chunk).includes("Learning companion:")) {
            clearTimeout(timer);
            resolve();
          }
        });
      });
      await use(address);
    } finally {
      const stopped = once(child, "exit");
      child.kill("SIGTERM");
      await stopped.catch(() => {});
      await rm(directory, { recursive: true, force: true });
    }
  },
});
const tutorial = (page: Page) =>
  page.getByRole("region", { name: "Learning tools tutorial" });
const cockpit = (page: Page) => page.locator("#learning-cockpit");
async function open(page: Page) {
  await page.goto("/chapters/reality/");
  await page
    .getByRole("button", { name: "Learning cockpit", exact: true })
    .click();
}
async function reflect(page: Page) {
  await tutorial(page)
    .getByRole("button", { name: "Try the experiment" })
    .click();
  await tutorial(page)
    .getByRole("button", { name: "Double processing time" })
    .click();
  await tutorial(page)
    .getByRole("button", { name: "Explore assistant help" })
    .click();
  await tutorial(page)
    .getByRole("button", { name: "Reflect on the check" })
    .click();
  await tutorial(page)
    .getByLabel("My tutorial takeaway")
    .fill("More waiting does not identify which resource is slow.");
  await tutorial(page)
    .getByLabel("My tutorial next independent check")
    .fill("Find one waiting boundary in my project.");
  await tutorial(page)
    .getByRole("button", { name: "Review how saving works" })
    .click();
}

test("a first-use invitation is skippable, remembers dismissal and replays without companion calls", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("http://127.0.0.1:8788"))
      requests.push(request.url());
  });
  await open(page);
  await expect(
    tutorial(page).getByRole("heading", { name: "New to the learning tools?" }),
  ).toBeVisible();
  await cockpit(page)
    .getByLabel("My prediction or uncertainty", { exact: true })
    .fill("My real learning draft must stay independent.");
  await tutorial(page).getByRole("button", { name: "Not now" }).click();
  await expect(tutorial(page)).toBeHidden();
  await expect(
    cockpit(page).getByRole("button", { name: "Tutorial", exact: true }),
  ).toBeFocused();
  await page.reload();
  await expect(tutorial(page)).toBeHidden();
  await cockpit(page)
    .getByRole("button", { name: "Tutorial", exact: true })
    .click();
  await expect(
    tutorial(page).getByRole("heading", { name: "Start with your thinking" }),
  ).toBeFocused();
  await tutorial(page)
    .getByLabel("My tutorial prediction")
    .fill("My separate rehearsal prediction.");
  await tutorial(page)
    .getByRole("button", { name: "Try the experiment" })
    .click();
  await tutorial(page).getByRole("button", { name: "Exit tutorial" }).click();
  await expect(
    cockpit(page).getByLabel("My prediction or uncertainty", { exact: true }),
  ).toHaveValue("My real learning draft must stay independent.");
  await page.goto("/concepts/?topic=queue");
  await page
    .getByRole("button", { name: "Learning cockpit", exact: true })
    .click();
  await expect(tutorial(page)).toBeHidden();
  await cockpit(page)
    .getByRole("button", { name: "Tutorial", exact: true })
    .click();
  await expect(
    tutorial(page).getByRole("heading", { name: "Try one small check" }),
  ).toBeVisible();
  await tutorial(page)
    .getByRole("button", { name: "Back", exact: true })
    .click();
  await expect(tutorial(page).getByLabel("My tutorial prediction")).toHaveValue(
    "My separate rehearsal prediction.",
  );
  expect(requests).toEqual([]);
});

test("the complete rehearsal explains real evidence, example replies and reviewed saving in compact dark mode", async ({
  page,
}, testInfo) => {
  const companionRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("http://127.0.0.1:8788"))
      companionRequests.push(request.url());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await page.locator("[data-theme-picker]").selectOption("dark");
  await tutorial(page)
    .getByRole("button", { name: "Try the tutorial" })
    .click();
  await tutorial(page)
    .getByLabel("My tutorial prediction")
    .fill("I expect more unfinished requests.");
  await tutorial(page)
    .getByRole("button", { name: "Try the experiment" })
    .click();
  await expect(tutorial(page).getByRole("status")).toHaveText(
    "4 × 2 = 8 unfinished requests on average.",
  );
  await tutorial(page)
    .getByRole("button", { name: "Double processing time" })
    .click();
  await expect(tutorial(page).getByRole("status")).toContainText("4 × 4 = 16");
  await expect(tutorial(page)).toContainText(
    "not a measurement of your system",
  );
  await page.screenshot({
    path: testInfo.outputPath("tutorial-experiment-mobile.png"),
  });
  await tutorial(page)
    .getByRole("button", { name: "Explore assistant help" })
    .click();
  await tutorial(page)
    .getByRole("button", { name: "Show an example reply" })
    .click();
  await expect(
    tutorial(page).getByRole("heading", {
      name: "Example reply · written for this tutorial",
    }),
  ).toBeVisible();
  await expect(tutorial(page)).toContainText("No model was called here");
  expect(
    (await new AxeBuilder({ page }).include("#learning-cockpit").analyze())
      .violations,
  ).toEqual([]);
  await tutorial(page)
    .getByRole("button", { name: "Reflect on the check" })
    .click();
  await expect(tutorial(page)).toContainText(
    "Your prediction: I expect more unfinished requests.",
  );
  await tutorial(page)
    .getByLabel("My tutorial takeaway")
    .fill("The illustration preserves one arrival-rate assumption.");
  await tutorial(page)
    .getByLabel("My tutorial next independent check")
    .fill("Identify a real waiting boundary.");
  await tutorial(page)
    .getByRole("button", { name: "Review how saving works" })
    .click();
  await tutorial(page)
    .getByText("Preview a Notebook takeaway", { exact: true })
    .click();
  await expect(tutorial(page).locator("details")).toContainText(
    "The illustration preserves one arrival-rate assumption.",
  );
  await expect(tutorial(page).locator("details")).toContainText(
    "Identify a real waiting boundary.",
  );
  await page.screenshot({
    path: testInfo.outputPath("tutorial-notebook-preview-mobile.png"),
  });
  expect(
    await cockpit(page).evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).include("#learning-cockpit").analyze())
      .violations,
  ).toEqual([]);
  await tutorial(page)
    .getByRole("button", { name: "Start my own learning loop" })
    .click();
  await expect(
    cockpit(page).getByLabel("My prediction or uncertainty", { exact: true }),
  ).toHaveValue("");
  expect(companionRequests).toEqual([]);
  await page.reload();
  await expect(tutorial(page)).toBeHidden();
});

test("the linked tutorial works when browser storage is unavailable and never requires an answer", async ({
  page,
}) => {
  await page.addInitScript(() => {
    for (const name of ["sessionStorage", "localStorage"])
      Object.defineProperty(window, name, {
        get() {
          throw new Error("Storage unavailable");
        },
      });
  });
  await page.goto("/notebook/setup/");
  await page
    .getByRole("link", { name: "open the tutorial", exact: true })
    .click();
  await expect(
    tutorial(page).getByRole("heading", { name: "Start with your thinking" }),
  ).toBeFocused();
  await tutorial(page)
    .getByRole("button", { name: "Try the experiment" })
    .click();
  await tutorial(page)
    .getByRole("button", { name: "Explore assistant help" })
    .click();
  await tutorial(page)
    .getByRole("button", { name: "Reflect on the check" })
    .click();
  await tutorial(page)
    .getByRole("button", { name: "Review how saving works" })
    .click();
  await expect(
    tutorial(page).getByRole("button", {
      name: "Prepare this as a real Notebook draft",
    }),
  ).toBeDisabled();
  await tutorial(page)
    .getByRole("button", { name: "Start my own learning loop" })
    .click();
  await expect(
    cockpit(page).getByLabel("My prediction or uncertainty", { exact: true }),
  ).toBeVisible();
  await page.goto("/notebook/setup/#try-the-learning-tutorial");
  await expect(
    tutorial(page).getByRole("heading", { name: "Start with your thinking" }),
  ).toBeFocused();
});

test("an explicit tutorial handoff protects unfinished notes and only Save note persists the reflection", async ({
  page,
  companion,
}) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith(companion) && request.method() === "POST")
      writes.push(new URL(request.url()).pathname);
  });
  await open(page);
  await cockpit(page)
    .getByLabel("Investigation companion address")
    .fill(companion);
  await cockpit(page)
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await expect(cockpit(page)).toContainText("Notebook-only connection");
  await page.locator('.site-header [data-learning-toggle="notebook"]').click();
  const notebook = page.locator("#learning-notebook");
  await notebook
    .getByLabel("Your thinking")
    .fill("An unfinished real note that must survive cancellation.");
  await page
    .getByRole("button", { name: "Learning cockpit", exact: true })
    .click();
  await tutorial(page)
    .getByRole("button", { name: "Try the tutorial" })
    .click();
  await reflect(page);
  page.once("dialog", (dialog) => dialog.dismiss());
  await tutorial(page)
    .getByRole("button", { name: "Prepare this as a real Notebook draft" })
    .click();
  await expect(
    tutorial(page).getByRole("button", {
      name: "Prepare this as a real Notebook draft",
    }),
  ).toBeEnabled();
  await page.locator('.site-header [data-learning-toggle="notebook"]').click();
  await expect(notebook.getByLabel("Your thinking")).toHaveValue(
    "An unfinished real note that must survive cancellation.",
  );
  await page
    .getByRole("button", { name: "Learning cockpit", exact: true })
    .click();
  page.once("dialog", (dialog) => dialog.accept());
  await tutorial(page)
    .getByRole("button", { name: "Prepare this as a real Notebook draft" })
    .click();
  await expect(notebook.getByLabel("Your thinking")).toHaveValue(
    /More waiting does not identify which resource is slow/,
  );
  await expect(notebook.getByLabel("Your thinking")).toHaveValue(
    /Next independent check: Find one waiting boundary/,
  );
  expect(writes.filter((route) => route.startsWith("/entries"))).toEqual([]);
  expect(writes.filter((route) => route.startsWith("/agent"))).toEqual([]);
  await notebook
    .getByRole("button", { name: "Save note", exact: true })
    .click();
  await expect(notebook.getByRole("status")).toContainText(
    "Saved in your private notebook",
  );
  expect(writes.filter((route) => route.startsWith("/entries"))).toHaveLength(
    1,
  );
});
