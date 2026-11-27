import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { concepts } from "../../shared/concepts.ts";

test("overview counts sit on distinct visible paths between their named topics", async ({
  page,
}) => {
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/concepts/?view=all");
    const badges = page.locator(".concept-cluster-connection:visible");
    await expect(badges).toHaveCount(6);
    const boxes = await badges.evaluateAll((groups) =>
      groups.map((group) => {
        const { x, y, width, height } = group
          .querySelector("rect")!
          .getBoundingClientRect();
        const path = group.querySelector("path")!;
        const center = new DOMPoint(x + width / 2, y + height / 2);
        const matrix = path.getScreenCTM()!;
        const length = path.getTotalLength();
        const topicAt = (position: number) => {
          const point = path.getPointAtLength(position).matrixTransform(matrix);
          return [
            ...group
              .closest("svg")!
              .querySelectorAll<SVGGElement>("[data-concept-cluster]"),
          ].find((region) => {
            const r = region.querySelector("rect")!.getBoundingClientRect();
            return (
              point.x >= r.left - 1 &&
              point.x <= r.right + 1 &&
              point.y >= r.top - 1 &&
              point.y <= r.bottom + 1
            );
          })?.dataset.conceptCluster;
        };
        const endpoints = [topicAt(0), topicAt(length)].sort();
        const topicPair = group.querySelector<SVGGElement>(
          "[data-topic-connection]",
        )!.dataset.topicConnection!;
        // Each end needs a visible stretch of shaft before it reaches the badge.
        const clearOfCount = (position: number) => {
          const point = path.getPointAtLength(position).matrixTransform(matrix);
          return (
            point.x < x ||
            point.x > x + width ||
            point.y < y ||
            point.y > y + height
          );
        };
        const inset = 5 / matrix.a;
        const otherRoutes = groups
          .filter((other) => other !== group)
          .map((other) => other.querySelector("path")!);
        let crosses = false;
        for (let d = 0; d < length; d += 1 / matrix.a) {
          const point = path.getPointAtLength(d);
          if (otherRoutes.some((other) => other.isPointInStroke(point))) {
            crosses = true;
            break;
          }
        }
        return {
          x,
          y,
          width,
          height,
          topicPair,
          endpoints,
          crosses,
          visibleShafts:
            length > inset * 2 &&
            clearOfCount(inset) &&
            clearOfCount(length - inset),
          onRoute: path.isPointInStroke(
            center.matrixTransform(path.getScreenCTM()!.inverse()),
          ),
        };
      }),
    );
    for (const [index, a] of boxes.entries()) {
      expect(a.endpoints).toEqual(a.topicPair.split(" "));
      expect(a.crosses, `${width}px: ${a.topicPair}`).toBe(false);
      expect(a.visibleShafts, `${width}px: ${a.topicPair}`).toBe(true);
      expect(a.onRoute, `${width}px: ${a.topicPair}`).toBe(true);
      for (const b of boxes.slice(index + 1)) {
        const gap = Math.max(
          b.x - (a.x + a.width),
          a.x - (b.x + b.width),
          b.y - (a.y + a.height),
          a.y - (b.y + b.height),
        );
        expect(
          gap,
          `${width}px: ${a.topicPair} / ${b.topicPair}`,
        ).toBeGreaterThan(1);
      }
    }
    const outerPair = page.getByRole("button", {
      name: "Read 7 connections between Development and Operations",
    });
    const traced = page.locator("[data-concept-cluster].is-traced-topic");
    await outerPair.focus();
    await expect(traced).toHaveCount(2);
    await expect(
      page.locator(".concept-cluster-connection.is-traced"),
    ).toContainText("Development and Operations");
    expect(
      await traced.evaluateAll((items) =>
        items.map((item) => item.getAttribute("data-concept-cluster")).sort(),
      ),
    ).toEqual(["Development", "Operations"]);
    await page.getByRole("button", { name: "Fit", exact: true }).focus();
    await expect(traced).toHaveCount(0);
    await page
      .getByRole("button", {
        name: "Read 3 connections between Architecture and Evidence",
      })
      .hover();
    expect(
      await traced.evaluateAll((items) =>
        items.map((item) => item.getAttribute("data-concept-cluster")).sort(),
      ),
    ).toEqual(["Architecture", "Evidence"]);
    await page.mouse.move(0, 0);
    await expect(traced).toHaveCount(0);
  }
});

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
      name: `Zoom to Development, ${concepts.filter(({ group }) => group === "Development").length} concepts`,
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
  const detail = map.getByRole("combobox", {
    name: "Graph detail",
    exact: true,
  });
  await map.getByText("Filters", { exact: true }).click();
  await detail.selectOption("all");
  await map.getByRole("button", { name: "Fit", exact: true }).click();
  await expect(graphic).toHaveAttribute("data-detail", "relationships");
  await expect(map.locator(".concept-node-title:visible")).toHaveCount(
    concepts.length,
  );
  await detail.selectOption("auto");
  await expect(graphic).toHaveAttribute("data-detail", "overview");
  const camera = await graphic.getAttribute("data-camera");
  await map.getByRole("tab", { name: "List", exact: true }).click();
  await expect(page.locator("[data-concept-result]:visible")).toHaveCount(
    concepts.length,
  );
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
  await map.getByText("Filters", { exact: true }).click();
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
