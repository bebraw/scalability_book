import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("graph and list share one search, filters, and a persistent camera", async ({
  page,
}) => {
  await page.goto("/concepts/?view=all");
  const map = page.locator("#concept-graph");
  const graphic = map.locator(".concept-map-graphic");
  const directory = page.locator(".concept-directory");
  const graph = page.getByRole("tab", { name: "Graph", exact: true });
  const list = page.getByRole("tab", { name: "List", exact: true });
  const search = page.getByLabel("Find a concept");
  const reading = map.getByRole("combobox", { name: "Reading", exact: true });
  const group = map.getByRole("combobox", { name: "Topic group", exact: true });
  await expect(page.getByRole("searchbox")).toHaveCount(1);
  await expect(page.getByRole("link", { name: /Browse concepts/ })).toHaveCount(
    0,
  );
  await expect(graph).toHaveAttribute("aria-selected", "true");
  await expect(directory).not.toBeVisible();
  await graphic.focus();
  await graphic.press("ArrowRight");
  await graphic.press("ArrowDown");
  await map.getByRole("button", { name: "Expand graph", exact: true }).click();
  const camera = await graphic.getAttribute("data-camera");
  await graph.focus();
  await graph.press("ArrowRight");
  await expect(list).toBeFocused();
  await expect(list).toHaveAttribute("aria-selected", "true");
  await expect(graphic).not.toBeVisible();
  await expect(map.locator("[data-concept-labels]")).not.toBeVisible();
  await expect(directory.locator("[data-concept-result]:visible")).toHaveCount(
    45,
  );
  await expect(
    map.getByRole("button", { name: "Restore graph size" }),
  ).not.toBeVisible();
  await list.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: test.info().outputPath("concept-list-desktop.png"),
  });
  await graph.click();
  await expect(graphic).toBeVisible();
  await expect(map.locator("[data-concept-labels]")).toBeVisible();
  await expect(graphic).toHaveAttribute("data-camera", camera!);
  await list.click();
  await reading.selectOption("/chapters/architecture/");
  await search.fill("cache");
  await expect(reading).toHaveValue("/chapters/architecture/");
  await expect(directory.locator("[data-concept-result]:visible")).toHaveCount(
    1,
  );
  await group.selectOption("Architecture");
  await expect(search).toHaveValue("cache");
  await expect(
    directory.locator("[data-concept-group-tag]:visible"),
  ).toHaveCount(1);
  await expect(map.locator("[data-concept-group-help]")).toContainText(
    "Marked cards",
  );
  await graph.click();
  await expect(reading).toHaveValue("/chapters/architecture/");
  await expect(group).toHaveValue("Architecture");
  await expect(search).toHaveValue("cache");
  await expect(map.locator("[data-concept-node]:visible")).toHaveCount(1);
  await graphic.scrollIntoViewIfNeeded();
  await expect(
    map.getByRole("link", { name: "Explore Cache", exact: true }),
  ).toBeInViewport();
  await expect(directory).not.toBeVisible();
  await list.click();
  await search.fill("nonexistent-topic");
  await expect(directory.locator("[data-concept-empty]")).toBeVisible();
  await expect(reading).toHaveValue("/chapters/architecture/");
  await search.fill("");
  await expect(reading).toHaveValue("/chapters/architecture/");
  await expect(directory.locator("[data-concept-result]:visible")).toHaveCount(
    10,
  );
  await map.getByRole("button", { name: "Reset view", exact: true }).click();
  await expect(list).toHaveAttribute("aria-selected", "true");
  await expect(directory.locator("[data-concept-result]:visible")).toHaveCount(
    45,
  );
  await expect(page).toHaveURL(/view=list/);
  await page.reload();
  await expect(list).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("searchbox")).toHaveCount(1);
  await list.press("Home");
  await expect(graph).toBeFocused();
  await expect(graph).toHaveAttribute("aria-selected", "true");
  await graph.press("End");
  await expect(list).toBeFocused();
  expect(
    (await new AxeBuilder({ page }).include(".concept-reference").analyze())
      .violations,
  ).toEqual([]);
});

test("concept fragments reveal the list and retain a usable reference", async ({
  page,
}) => {
  await page.goto("/concepts/?q=retry#queue");
  const list = page.getByRole("tab", { name: "List", exact: true });
  const graph = page.getByRole("tab", { name: "Graph", exact: true });
  await expect(list).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#queue")).toBeVisible();
  await expect(page.getByLabel("Find a concept")).toHaveValue("");
  await graph.click();
  await page.reload();
  await expect(graph).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".concept-directory")).not.toBeVisible();
  await page.evaluate(() => {
    location.hash = "latency";
  });
  await expect(list).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#latency")).toBeVisible();
  await expect(page).toHaveURL(/\/concepts\/#latency$/);
});

test("shared search and view switching remain usable on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/concepts/?view=list&q=retry");
  await page.locator("[data-theme-picker]").selectOption("dark");
  const list = page.getByRole("tab", { name: "List", exact: true });
  const graph = page.getByRole("tab", { name: "Graph", exact: true });
  await expect(page.getByLabel("Find a concept")).toHaveValue("retry");
  await expect(page.locator("[data-concept-result]:visible")).toHaveCount(1);
  await page.locator("[data-concept-select=retry]").click();
  const pane = page.getByRole("dialog", { name: "Retry policy", exact: true });
  await expect(pane).toBeVisible();
  await pane.getByRole("button", { name: "Close concept reference" }).click();
  await list.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: test.info().outputPath("concept-list-mobile.png"),
  });
  expect(
    (await new AxeBuilder({ page }).include(".concept-reference").analyze())
      .violations,
  ).toEqual([]);
  await graph.click();
  await expect(page.locator("[data-concept-result]:visible")).toHaveCount(0);
  await expect(
    page.locator("#concept-graph [data-concept-node]:visible"),
  ).toHaveCount(1);
  await expect(page.getByLabel("Find a concept")).toHaveValue("retry");
  await page.screenshot({
    path: test.info().outputPath("concept-graph-mobile.png"),
  });
  expect(
    (await new AxeBuilder({ page }).include(".concept-reference").analyze())
      .violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
