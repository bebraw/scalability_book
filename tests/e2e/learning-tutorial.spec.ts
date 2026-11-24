import { downloadedMarkdown } from "./learning-notebook.helpers.ts";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
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
    .getByText("Preview a diary takeaway", { exact: true })
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
      name: "Download takeaway as Markdown",
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

test("a tutorial takeaway downloads without a companion", async ({ page }) => {
  await open(page);
  await tutorial(page)
    .getByRole("button", { name: "Try the tutorial" })
    .click();
  await reflect(page);
  const markdown = await downloadedMarkdown(
    tutorial(page).getByRole("button", {
      name: "Download takeaway as Markdown",
    }),
  );
  expect(markdown).toContain(
    "More waiting does not identify which resource is slow",
  );
  expect(markdown).toContain(
    "Next independent check: Find one waiting boundary",
  );
  await expect(page.locator("#learning-notebook")).toHaveCount(0);
});
