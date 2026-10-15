import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { explorations } from "../../shared/explorations.ts";

test("task starting URLs, source anchors, and graph discovery are usable", async ({
  request,
  baseURL,
}) => {
  const catalogResponse = await request.get("/explore/index.json");
  expect(catalogResponse.ok()).toBe(true);
  const catalog = await catalogResponse.json();
  expect(catalog.explorations).toHaveLength(explorations.length);
  const graph = await (await request.get("/concepts/graph.json")).json();
  expect(graph.explorations).toEqual(catalog.explorations);
  const graphText = await (await request.get("/concepts/graph.md")).text();
  const guide = await (await request.get("/concepts/agent-guide.md")).text();
  expect(guide).toContain("explorationIds");
  for (const activity of catalog.explorations) {
    expect(new URL(activity.agentUrl).origin).toBe(new URL(baseURL!).origin);
    const start = await request.get(activity.agentUrl);
    const discussion = await request.get(activity.discussionUrl);
    const page = await request.get(activity.url);
    expect(start.ok() && discussion.ok() && page.ok()).toBe(true);
    expect(start.headers()["content-type"]).toBe("text/plain; charset=utf-8");
    expect(discussion.headers()["content-type"]).toBe(
      "text/plain; charset=utf-8",
    );
    expect(await start.text()).toContain("Then wait for their answer");
    expect(await start.text()).not.toContain("# Worked reasoning:");
    expect(await discussion.text()).toContain(
      `# Worked reasoning: ${activity.title}`,
    );
    expect(graphText).toContain(activity.agentUrl);
    for (const href of [activity.task.href, activity.reading.href]) {
      const url = new URL(href);
      const linkedPage = await request.get(url.pathname);
      expect(linkedPage.ok(), href).toBe(true);
      expect(await linkedPage.text(), href).toContain(
        `id="${url.hash.slice(1)}"`,
      );
    }
    for (const id of activity.conceptIds) {
      expect(
        graph.concepts.find((concept: { id: string }) => concept.id === id)
          .explorationIds,
      ).toContain(activity.id);
    }
  }
  const confidence = catalog.explorations.find(
    (activity: { id: string }) => activity.id === "confidence-before-routing",
  );
  expect(await (await request.get(confidence.agentUrl)).text()).not.toMatch(
    /60%|12\/20/,
  );
  expect(await (await request.get(confidence.discussionUrl)).text()).toContain(
    "60%",
  );
});

test("an activity gives one starting URL and reveals the exercise on demand", async ({
  page,
  context,
  baseURL,
}) => {
  await page.goto("/explore/");
  expect(
    (await new AxeBuilder({ page }).include(".exploration-page").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("exploration-index.png"),
    fullPage: true,
  });
  await page
    .getByRole("link", {
      name: "Examine a confident classification",
      exact: true,
    })
    .click();
  const startUrl = new URL(
    "/explore/confidence-before-routing/agent.md",
    baseURL,
  ).href;
  await expect(
    page.getByLabel("Give your agent this starting point"),
  ).toHaveValue(startUrl);
  const exercise = page.locator("#exercise");
  const discussion = page.locator(".exploration-discussion");
  await expect(exercise).not.toHaveAttribute("open", "");
  await expect(discussion).not.toHaveAttribute("open", "");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy URL", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    startUrl,
  );
  await expect(page.locator("[data-concept-agent-status]")).toContainText(
    "copied",
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(
    (await new AxeBuilder({ page }).include(".exploration-page").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("exploration-desktop.png"),
    fullPage: true,
  });
  await exercise.locator("summary").click();
  await expect(exercise).toContainText("12 are interface and eight are data");
  await expect(discussion).not.toHaveAttribute("open", "");
  await discussion.locator("summary").click();
  await expect(discussion).toContainText("60%");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ["light", "dark", "sepia"]) {
    await page.locator("[data-theme-picker]").selectOption(theme);
    const layout = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      overflow: [...document.querySelectorAll("body *")]
        .map((el) => ({
          tag: el.tagName,
          class: el.className,
          right: el.getBoundingClientRect().right,
        }))
        .filter((el) => el.right > innerWidth)
        .slice(0, 12),
    }));
    expect(layout.scroll, JSON.stringify(layout)).toBeLessThanOrEqual(
      layout.width,
    );
    expect(
      (await new AxeBuilder({ page }).include(".exploration-page").analyze())
        .violations,
    ).toEqual([]);
  }
  await page.screenshot({
    path: test.info().outputPath("exploration-mobile.png"),
    fullPage: true,
  });
});

test("independent reading works without JavaScript and retains the code and table fixtures", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  try {
    await page.goto(
      new URL("/explore/challenge-an-explanation/", baseURL).href,
    );
    await expect(
      page.getByLabel("Give your agent this starting point"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy URL" })).toBeHidden();
    await page.getByText("Read the exercise", { exact: true }).click();
    await expect(page.locator("pre")).toContainText("function makeRecorder");
    await expect(page.locator(".exploration-body ol > li")).toHaveCount(4);
    await page.getByText("Show worked reasoning", { exact: true }).click();
    await expect(page.locator(".exploration-discussion")).toContainText(
      "one, one, then two",
    );
    await page.goto(new URL("/explore/verify-remediation/", baseURL).href);
    await page.getByText("Read the exercise", { exact: true }).click();
    await expect(page.locator("tbody tr")).toHaveCount(4);
    await expect(
      page.locator("tbody tr").nth(2).locator("td").nth(0),
    ).toHaveText("api-3");
    await expect(
      page.locator("tbody tr").nth(2).locator("td").nth(1),
    ).toHaveText("r17");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await context.close();
  }
});
