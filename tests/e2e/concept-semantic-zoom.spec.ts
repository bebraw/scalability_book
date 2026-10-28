import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("the fitted overview expands into stable, color-coded concepts", async ({
  page,
}) => {
  await page.goto("/concepts/?view=all");
  const map = page.locator("#concept-graph");
  const graphic = map.locator(".concept-map-graphic");
  await expect(graphic).toHaveAttribute("data-detail", "overview");
  await expect(map.locator("[data-concept-cluster]:visible")).toHaveCount(4);
  await expect(
    map.locator("[data-concept-subgroup-target]:visible"),
  ).toHaveCount(13);
  const subgroupLabels = await map
    .locator(".concept-subgroup-title")
    .evaluateAll((labels) =>
      labels.map((label) => {
        const rect = label.getBoundingClientRect();
        const band = label
          .closest("[data-concept-subgroup-target]")!
          .querySelector("rect")!
          .getBoundingClientRect();
        return {
          height: rect.height,
          fits: rect.left >= band.left && rect.right <= band.right,
        };
      }),
    );
  for (const label of subgroupLabels) {
    expect(label.height).toBeGreaterThanOrEqual(12);
    expect(label.fits).toBe(true);
  }
  await expect(map.locator(".concept-cluster-connection:visible")).toHaveCount(
    6,
  );
  expect(
    await map
      .locator("[data-connection-count]")
      .evaluateAll((items) =>
        items.reduce(
          (sum, item) =>
            sum + Number((item as HTMLElement).dataset.connectionCount),
          0,
        ),
      ),
  ).toBe(45);
  expect(
    await graphic.evaluate((element) => {
      const svg = element.querySelector("svg")!;
      const box = svg.viewBox.baseVal;
      return (
        box.x <= 0 &&
        box.y <= 0 &&
        box.x + box.width >= Number(svg.dataset.width) &&
        box.y + box.height >= Number(svg.dataset.height)
      );
    }),
  ).toBe(true);
  const positions = () =>
    map
      .locator("[data-concept-node] > g")
      .evaluateAll((items) =>
        items.map((item) => item.getAttribute("transform")),
      );
  const initial = await positions();
  await map
    .getByRole("button", {
      name: "Zoom to Development, 15 concepts",
      exact: true,
    })
    .focus();
  await page.keyboard.press("Enter");
  await expect(graphic).not.toHaveAttribute("data-detail", "overview");
  await expect(
    map.locator('[data-concept-node="harness"] .concept-node-title'),
  ).toBeVisible();
  expect(await positions()).toEqual(initial);
  await map.getByRole("button", { name: "Use readable graph size" }).click();
  await expect(graphic).toHaveAttribute("data-detail", "relationships");
  await expect(map.locator('[data-concept-node="contention"]')).toHaveAttribute(
    "data-concept-role",
    "property",
  );
  await expect(
    map.locator('[data-concept-node="goodhart-law"]'),
  ).toHaveAttribute("data-concept-role", "model");
  await expect(
    map.locator('[data-concept-node="cache"] .concept-node-role'),
  ).toHaveText("Mechanism");
  const colors = await map
    .locator(
      '[data-concept-node="cache"], [data-concept-node="latency"], [data-concept-node="little-law"]',
    )
    .evaluateAll((items) => items.map((item) => getComputedStyle(item).color));
  expect(new Set(colors).size).toBe(3);
  await graphic.focus();
  await graphic.press("0");
  await expect(graphic).toHaveAttribute("data-detail", "overview");
  const queue = map.getByRole("link", { name: "Explore Queue", exact: true });
  await queue.focus();
  await expect(graphic).toHaveAttribute("data-detail", "relationships");
  // WebKit's IntersectionObserver reports zero-sized bounds for these SVG
  // links after a viewBox change even when their rendered boxes are correct.
  // Verify the actual card is inside both the clipped map and browser window.
  await expect
    .poll(() =>
      queue.evaluate((node) => {
        const card = node.getBoundingClientRect();
        const map = node
          .closest(".concept-map-graphic")!
          .getBoundingClientRect();
        return (
          card.width > 0 &&
          card.height > 0 &&
          card.left >= Math.max(map.left, 0) &&
          card.right <= Math.min(map.right, innerWidth) &&
          card.top >= Math.max(map.top, 0) &&
          card.bottom <= Math.min(map.bottom, innerHeight)
        );
      }),
    )
    .toBe(true);
  await queue.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Queue", exact: true }),
  ).toBeVisible();
});

test("detail override, filters and the list retain access to the complete graph", async ({
  page,
}) => {
  await page.goto("/concepts/?view=all");
  const map = page.locator("#concept-graph");
  const graphic = map.locator(".concept-map-graphic");
  const detail = map.getByLabel("Graph detail", { exact: true });
  await detail.selectOption("all");
  await map.getByRole("button", { name: "Fit", exact: true }).click();
  await expect(graphic).toHaveAttribute("data-detail", "relationships");
  await expect(map.locator(".concept-node-title:visible")).toHaveCount(45);
  await detail.selectOption("auto");
  await expect(graphic).toHaveAttribute("data-detail", "overview");
  const camera = await graphic.getAttribute("data-camera");
  await map.getByRole("tab", { name: "List", exact: true }).click();
  await expect(page.locator("[data-concept-result]:visible")).toHaveCount(45);
  await map.getByRole("tab", { name: "Graph", exact: true }).click();
  await expect(graphic).toHaveAttribute("data-camera", camera!);
  await map
    .getByRole("combobox", { name: "Focus on", exact: true })
    .selectOption("queue");
  await expect(graphic).toHaveAttribute("data-detail", "relationships");
  await expect(map.locator("[data-concept-cluster]:visible")).toHaveCount(0);
  await expect(map.locator(".concept-cluster-connection:visible")).toHaveCount(
    0,
  );
  await expect(map.locator(".concept-node-title:visible")).toHaveCount(7);
  await map.getByRole("button", { name: "Reset view", exact: true }).click();
  await expect(graphic).toHaveAttribute("data-detail", "overview");
  await expect(map.locator("[data-concept-cluster]:visible")).toHaveCount(4);
});

test("compact group navigation and role colors remain accessible in every theme", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/concepts/?view=all");
  const map = page.locator("#concept-graph");
  const graphic = map.locator(".concept-map-graphic");
  for (const theme of ["light", "dark", "sepia", "contrast", "calm"]) {
    await page.locator("[data-theme-picker]").selectOption(theme);
    expect(
      (await new AxeBuilder({ page }).include("#concept-graph").analyze())
        .violations,
      theme,
    ).toEqual([]);
  }
  await map
    .getByRole("button", {
      name: "Zoom to Architecture, 9 concepts",
      exact: true,
    })
    .click();
  await expect(graphic).toHaveAttribute("data-detail", "relationships");
  await expect(
    map.getByRole("combobox", { name: "Topic group", exact: true }),
  ).toHaveValue("Architecture");
  await expect(
    map.getByRole("radio", { name: "Show only", exact: true }),
  ).toBeChecked();
  await expect(map.locator(".concept-node-title:visible")).toHaveCount(9);
  await map.getByRole("button", { name: "Reset view", exact: true }).click();
  await expect(graphic).toHaveAttribute("data-detail", "overview");
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await map.getByRole("button", { name: "Fit", exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${width}px`,
    ).toBe(true);
  }
});
