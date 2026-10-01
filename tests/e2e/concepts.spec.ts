import { test, expect, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { conceptPages } from "../../shared/concept-pages.ts";

test("group highlighting preserves context before an explicit group-only view", async ({
  page,
}) => {
  await page.goto("/concepts/");
  const map = page.locator("#concept-graph");
  const group = map.getByRole("combobox", { name: "Topic group", exact: true });
  const highlight = map.getByRole("radio", { name: "Highlight", exact: true });
  const only = map.getByRole("radio", { name: "Show only", exact: true });
  const nodes = map.locator("[data-concept-node]:visible");
  const graphic = map.locator(".concept-map-graphic");
  const viewport = () =>
    graphic.evaluate((element) => ({
      width: element.querySelector("svg")!.getBoundingClientRect().width,
      left: element.scrollLeft,
      top: element.scrollTop,
      positions: [...element.querySelectorAll("[data-concept-node] g")].map(
        (node) => node.getAttribute("transform"),
      ),
    }));
  await expect(highlight).toBeChecked();
  await expect(highlight).toBeDisabled();
  await expect(only).toBeDisabled();
  await map.getByRole("button", { name: "Zoom in", exact: true }).click();
  await graphic.evaluate((element) => {
    element.scrollLeft = 100;
    element.scrollTop = 140;
  });
  const before = await viewport();
  await group.selectOption("Models");
  await expect(nodes).toHaveCount(45);
  await expect(map.locator("[data-concept-edge]:not(.is-hidden)")).toHaveCount(
    101,
  );
  await expect(map.locator("[data-concept-node].is-group-member")).toHaveCount(
    5,
  );
  expect(
    await map
      .locator("[data-concept-node].is-group-member")
      .evaluateAll((items) =>
        items.map((item) => item.getAttribute("data-concept-node")).sort(),
      ),
  ).toEqual([
    "amdahl-law",
    "contention",
    "little-law",
    "lusser-law",
    "reliability",
  ]);
  expect(await viewport()).toEqual(before);
  await expect(map.locator("[data-concept-map-status]")).toContainText(
    "5 Models highlighted",
  );
  await expect(map.locator("[data-concept-group-help]")).toContainText(
    "dashed lines connect to other groups",
  );
  expect(
    await map
      .locator("[data-concept-edge].is-group-bridge:not(.is-hidden)")
      .count(),
  ).toBeGreaterThan(0);
  await expect(map.locator("[data-concept-group-tag]:visible")).toHaveCount(5);
  await expect(map.locator("[data-concept-result]:visible")).toHaveCount(45);
  await expect(page).toHaveURL(/group-view=highlight/);

  await map.getByRole("checkbox", { name: "Show connection labels" }).check();
  await expect(map.locator(".concept-edge-label:visible")).toHaveCount(101);
  const labeledViewport = await viewport();
  await only.check();
  await expect(nodes).toHaveCount(5);
  await expect(map.locator("[data-concept-result]:visible")).toHaveCount(5);
  await expect(
    map.locator("[data-concept-edge].is-group-bridge:not(.is-hidden)"),
  ).toHaveCount(0);
  await expect(map.locator('[data-concept-node="cache"]')).toHaveAttribute(
    "tabindex",
    "-1",
  );
  await expect(map.locator("[data-concept-group-help]")).toContainText(
    "Connections to other groups are hidden",
  );
  await expect(page).toHaveURL(/group-view=only/);
  await highlight.check();
  await expect(nodes).toHaveCount(45);
  expect(await viewport()).toEqual(labeledViewport);

  await only.check();
  await page.reload();
  await expect(group).toHaveValue("Models");
  await expect(only).toBeChecked();
  await expect(nodes).toHaveCount(5);
  await highlight.check();
  await map
    .getByRole("combobox", { name: "Reading", exact: true })
    .selectOption("/chapters/architecture/");
  await expect(nodes).toHaveCount(10);
  await expect(map.locator("[data-concept-node].is-group-member")).toHaveCount(
    0,
  );
  await expect(map.locator("[data-concept-group-help]")).toContainText(
    "No Models concepts in this view",
  );
  await only.check();
  await expect(nodes).toHaveCount(0);
  await expect(graphic).not.toBeVisible();
  await map.getByRole("button", { name: "Reset view", exact: true }).click();
  await expect(nodes).toHaveCount(45);
  await expect(group).toHaveValue("");
  await expect(highlight).toBeChecked();
  await expect(highlight).toBeDisabled();
  await expect(page).toHaveURL(/\/concepts\/$/);
  await group.selectOption("Development");
  await map.getByLabel("Focus on").selectOption("authority");
  await expect(group).toHaveValue("");
  await expect(highlight).toBeDisabled();
  await expect(map.locator("[data-concept-node].is-group-member")).toHaveCount(
    0,
  );
});

test("group highlighting and isolation are accessible on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/concepts/?theme=Architecture");
  await page.locator("[data-theme-picker]").selectOption("dark");
  const map = page.locator("#concept-graph");
  const highlight = map.getByRole("radio", { name: "Highlight", exact: true });
  const only = map.getByRole("radio", { name: "Show only", exact: true });
  await expect(highlight).toBeChecked();
  await expect(map.locator("[data-concept-node]:visible")).toHaveCount(45);
  await expect(map.locator("[data-concept-node].is-group-member")).toHaveCount(
    9,
  );
  expect(
    (await new AxeBuilder({ page }).include("#concept-graph").analyze())
      .violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await highlight.press("ArrowRight");
  await expect(only).toBeChecked();
  await expect(map.locator("[data-concept-node]:visible")).toHaveCount(9);
  await only.press("ArrowLeft");
  await expect(highlight).toBeChecked();
  await expect(map.locator("[data-concept-node]:visible")).toHaveCount(45);
  expect(
    (await new AxeBuilder({ page }).include("#concept-graph").analyze())
      .violations,
  ).toEqual([]);
  await map.getByRole("button", { name: "Fit", exact: true }).click();
  await map.screenshot({
    path: test.info().outputPath("group-highlight-mobile.png"),
  });
});

test("connection labels can be toggled and followed across graph views", async ({
  page,
}) => {
  await page.goto("/concepts/");
  const map = page.locator("#concept-graph");
  const toggle = map.getByRole("checkbox", { name: "Show connection labels" });
  await expect(toggle).not.toBeChecked();
  await expect(map.locator(".concept-edge-label:visible")).toHaveCount(0);
  const graphic = map.locator(".concept-map-graphic");
  await map.getByRole("button", { name: "Zoom in", exact: true }).click();
  await graphic.evaluate((element) => {
    element.scrollLeft = 80;
    element.scrollTop = 80;
  });
  const center = () =>
    graphic.evaluate((element) => {
      const svg = element.querySelector("svg")!.getBoundingClientRect();
      return [
        (element.scrollLeft + element.clientWidth / 2) / svg.width,
        (element.scrollTop + element.clientHeight / 2) / svg.height,
      ];
    });
  const beforeCenter = await center();
  await toggle.check();
  await expect(map.locator(".concept-edge-label:visible")).toHaveCount(101);
  await page.evaluate(() => document.fonts.ready);
  const assertCaptionPadding = async (graph: Locator) => {
    const cramped = await graph
      .locator(".concept-edge-label:visible")
      .evaluateAll((captions) =>
        captions
          .filter((caption) => {
            const text = caption.querySelector("text")!.getBBox();
            const rect = caption.querySelector("rect")!.getBBox();
            return (
              text.x < rect.x + 4 ||
              text.x + text.width > rect.x + rect.width - 4 ||
              text.y < rect.y ||
              text.y + text.height > rect.y + rect.height
            );
          })
          .map((caption) => caption.getAttribute("data-label")),
      );
    expect(cramped).toEqual([]);
  };
  await assertCaptionPadding(map);
  const afterCenter = await center();
  expect(afterCenter[0]).toBeCloseTo(beforeCenter[0]!, 2);
  expect(afterCenter[1]).toBeCloseTo(beforeCenter[1]!, 2);
  await map.getByLabel("Focus on").selectOption("decision-log");
  await expect(map.locator(".concept-edge-label:visible")).toHaveCount(6);
  await expect(map.locator(".concept-edge-label:visible")).toContainText([
    "reversibility record",
    "decision rationale",
    "accepted context",
    "revisit condition",
    "visible obligation",
    "decision ownership",
  ]);
  const assertNoCaptionOverlap = async (graph: Locator) => {
    const overlaps = await graph.evaluate((element) => {
      const labels = [
        ...element.querySelectorAll(".concept-edge-label:not(.is-hidden) rect"),
      ].map((label) => label.getBoundingClientRect());
      const nodes = [
        ...element.querySelectorAll("[data-concept-node]:not(.is-hidden) rect"),
      ].map((node) => node.getBoundingClientRect());
      const intersects = (a: DOMRect, b: DOMRect) =>
        a.left < b.right &&
        a.right > b.left &&
        a.top < b.bottom &&
        a.bottom > b.top;
      return labels.filter(
        (label, index) =>
          nodes.some((node) => intersects(label, node)) ||
          labels.slice(index + 1).some((other) => intersects(label, other)),
      ).length;
    });
    expect(overlaps).toBe(0);
  };
  await assertNoCaptionOverlap(map);
  await page.setViewportSize({ width: 1280, height: 1100 });
  await map.getByRole("button", { name: "Fit", exact: true }).click();
  await map.screenshot({
    path: test.info().outputPath("connection-labels.png"),
  });
  await map
    .getByRole("link", { name: "Explore Decision log", exact: true })
    .click();
  const pane = page.getByRole("dialog", { name: "Decision log", exact: true });
  await expect(
    pane.getByRole("checkbox", { name: "Show connection labels" }),
  ).toBeChecked();
  await expect(pane.locator(".concept-edge-label:visible")).toHaveCount(6);
  await assertCaptionPadding(pane);
  await pane
    .getByRole("link", { name: "Explore Decision reversibility", exact: true })
    .click();
  await expect(
    page.locator(".concept-pane .concept-edge-label:visible"),
  ).toHaveCount(7);
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/chapters/friction/");
  await page.locator("[data-theme-picker]").selectOption("dark");
  const index = page.getByRole("navigation", {
    name: "Concepts in this reading",
  });
  await index.getByText("Explore concept connections", { exact: true }).click();
  const chapterMap = index.locator("[data-concept-map]");
  await expect(
    chapterMap.getByRole("checkbox", { name: "Show connection labels" }),
  ).toBeChecked();
  await assertNoCaptionOverlap(chapterMap);
  await assertCaptionPadding(chapterMap);
  await chapterMap.getByLabel("Focus on").selectOption("decision-log");
  await expect(chapterMap.locator(".concept-edge-label:visible")).toHaveCount(
    5,
  );
  await chapterMap
    .getByRole("checkbox", { name: "Show connection labels" })
    .uncheck();
  await expect(chapterMap.locator(".concept-edge-label:visible")).toHaveCount(
    0,
  );
  await page.reload();
  await index.getByText("Explore concept connections", { exact: true }).click();
  await expect(
    chapterMap.getByRole("checkbox", { name: "Show connection labels" }),
  ).not.toBeChecked();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});

test("graph labels keep contrast during hover and keyboard focus in every theme", async ({
  page,
}) => {
  const measurements: {
    theme: string;
    context: string;
    node: string;
    state: string;
    foreground: string;
    background: string;
    ratio: number;
  }[] = [];
  for (const theme of ["light", "dark", "sepia", "contrast", "calm"]) {
    await page.goto("/concepts/?topic=authority");
    await page.locator("[data-theme-picker]").selectOption(theme);
    const measure = async (node: Locator, context: string, state: string) => {
      const colors = await node.evaluate((element) => {
        const foreground = getComputedStyle(
          element.querySelector("text")!,
        ).fill;
        const background = getComputedStyle(
          element.querySelector("rect")!,
        ).fill;
        const luminance = (color: string) => {
          const [red = 0, green = 0, blue = 0] = color
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number)
            .map((channel) => {
              const value = channel / 255;
              return value <= 0.04045
                ? value / 12.92
                : ((value + 0.055) / 1.055) ** 2.4;
            });
          return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
        };
        const a = luminance(foreground),
          b = luminance(background);
        return {
          foreground,
          background,
          ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
        };
      });
      measurements.push({
        theme,
        context,
        node:
          (await node.getAttribute("data-title")) ||
          (await node.getAttribute("data-label"))!,
        state,
        ...colors,
      });
      expect(
        colors.ratio,
        `${theme}, ${context}, ${await node.getAttribute("data-title")}, ${state}: ${colors.foreground} on ${colors.background}`,
      ).toBeGreaterThanOrEqual(4.5);
    };
    const checkMap = async (map: Locator, context: string) => {
      await map
        .getByRole("checkbox", { name: "Show connection labels" })
        .check();
      await measure(
        map.locator(".concept-edge-label:visible").first(),
        context,
        "connection caption",
      );
      const nodes = [
        map.locator('[data-concept-node="authority"]'),
        map.locator("[data-concept-node]:not(.is-current):visible").first(),
      ];
      for (const node of nodes) {
        await page.mouse.move(0, 0);
        await node.evaluate((element) => (element as SVGElement).blur());
        await measure(node, context, "normal");
        await node.hover();
        expect(
          await node.evaluate((element) => element.matches(":hover")),
        ).toBe(true);
        await measure(node, context, "hover");
        if (
          theme === "dark" &&
          context === "complete graph" &&
          (await node.getAttribute("data-concept-node")) === "authority"
        ) {
          await map.locator("svg").screenshot({
            path: test.info().outputPath("hover-contrast-dark.png"),
          });
        }
        await page.mouse.move(0, 0);
        await page.keyboard.press("Tab");
        await node.focus();
        await expect(node).toBeFocused();
        expect(
          await node.evaluate((element) => element.matches(":focus-visible")),
        ).toBe(true);
        await measure(node, context, "keyboard focus");
        if (
          context === "group highlight" &&
          (await node.getAttribute("class"))?.includes("is-group-member")
        ) {
          expect(
            await node.evaluate(
              (element) =>
                getComputedStyle(element.querySelector("rect")!)
                  .strokeDasharray,
            ),
          ).not.toBe("none");
        }
      }
    };
    const completeMap = page.locator("#concept-graph");
    await checkMap(completeMap, "complete graph");
    await completeMap
      .getByRole("combobox", { name: "Topic group", exact: true })
      .selectOption("Development");
    await checkMap(completeMap, "group highlight");
    await page.goto("/chapters/scalable-development/");
    const index = page.getByRole("navigation", {
      name: "Concepts in this reading",
    });
    await index
      .getByText("Explore concept connections", { exact: true })
      .click();
    const chapterMap = index.locator("[data-concept-map]");
    await chapterMap.getByLabel("Focus on").selectOption("authority");
    await checkMap(chapterMap, "chapter graph");
    await chapterMap
      .getByRole("link", { name: "Explore Action authority", exact: true })
      .click();
    const pane = page.getByRole("dialog", {
      name: "Action authority",
      exact: true,
    });
    await expect(pane).toBeVisible();
    await checkMap(pane.locator("[data-concept-map]"), "reading pane");
    await page.keyboard.press("Escape");
  }
  await test.info().attach("graph-label-contrast", {
    body: JSON.stringify(measurements, null, 2),
    contentType: "application/json",
  });
});

test("graph labels have breathing room in both themes and viewport sizes", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const theme of ["light", "dark"]) {
      await page.goto("/concepts/");
      await page.locator("[data-theme-picker]").selectOption(theme);
      await page.evaluate(() => document.fonts.ready);
      const assertPadding = async (selector: string) => {
        const cramped = await page.locator(selector).evaluateAll((nodes) =>
          nodes.flatMap((node) => {
            const text = node.querySelector("text")!.getBBox();
            const rect = node.querySelector("rect")!.getBBox();
            const horizontal = Math.min(
              text.x - rect.x,
              rect.x + rect.width - text.x - text.width,
            );
            const vertical = Math.min(
              text.y - rect.y,
              rect.y + rect.height - text.y - text.height,
            );
            return horizontal < 14 || vertical < 8
              ? [
                  {
                    title: node.getAttribute("data-title"),
                    horizontal,
                    vertical,
                  },
                ]
              : [];
          }),
        );
        expect(cramped, `${viewport.width}px, ${theme}`).toEqual([]);
      };
      await assertPadding("#concept-graph [data-concept-node]");
      const map = page.locator("#concept-graph");
      await map.getByLabel("Focus on").selectOption("measurement-boundary");
      await map
        .getByRole("link", {
          name: "Explore Measurement boundary",
          exact: true,
        })
        .click();
      const pane = page.getByRole("dialog", {
        name: "Measurement boundary",
        exact: true,
      });
      await expect(pane).toBeVisible();
      await assertPadding(".concept-pane [data-concept-node]");
      await expect(
        pane.locator('[data-concept-node="measurement-boundary"] tspan'),
      ).toHaveText(["Measurement", "boundary"]);
      if (viewport.width === 1280 && theme === "dark") {
        await pane.locator(".concept-map-graphic").screenshot({
          path: test.info().outputPath("label-spacing.png"),
        });
      }
      await page.keyboard.press("Escape");
    }
  }
});

test("the complete map supports discovery, filtering, zoom, and shared views", async ({
  page,
}) => {
  await page.goto("/concepts/");
  const map = page.locator("#concept-graph");
  const status = map.locator("[data-concept-map-status]");
  await expect(status).toHaveText("45 concepts · 101 connections");
  const graphic = map.locator(".concept-map-graphic");
  const svg = graphic.locator("svg");
  const before = await svg.evaluate(
    (element) => element.getBoundingClientRect().width,
  );
  await map.getByRole("button", { name: "Zoom in", exact: true }).click();
  expect(
    await svg.evaluate((element) => element.getBoundingClientRect().width),
  ).toBeGreaterThan(before);
  await graphic.evaluate((element) => {
    element.scrollLeft = 150;
    element.scrollTop = 150;
  });
  const box = (await graphic.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + 70, { steps: 5 });
  await page.mouse.up();
  expect(await graphic.evaluate((element) => element.scrollLeft)).toBeLessThan(
    150,
  );
  await map.getByLabel("Search topics").fill("ADR");
  await expect(map.locator("[data-concept-node]:visible")).toHaveCount(1);
  await map
    .getByRole("link", { name: "Explore Decision log", exact: true })
    .click();
  const decisionPane = page.getByRole("dialog", {
    name: "Decision log",
    exact: true,
  });
  await expect(decisionPane).toBeVisible();
  await decisionPane
    .getByRole("link", { name: "Explore Decision reversibility", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Decision reversibility", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await map.getByLabel("Search topics").fill("Lusser");
  await expect(map.locator("[data-concept-node]:visible")).toHaveCount(1);
  await expect(
    map.getByRole("link", { name: "Explore Lusser's Law", exact: true }),
  ).toBeVisible();
  await map.getByLabel("Search topics").fill("nonexistent-topic");
  await expect(status).toContainText("No topics match");
  await expect(graphic).not.toBeVisible();
  await map.getByRole("button", { name: "Reset view" }).click();
  await map
    .getByRole("combobox", { name: "Reading", exact: true })
    .selectOption("/chapters/architecture/");
  await expect(
    map.getByRole("link", { name: "Explore Cache", exact: true }),
  ).toBeVisible();
  await expect(
    map.getByRole("link", { name: "Explore Coding agent", exact: true }),
  ).not.toBeVisible();
  await expect(status).toContainText("4 · Architecture");
  await page.reload();
  await expect(
    map.getByRole("combobox", { name: "Reading", exact: true }),
  ).toHaveValue("/chapters/architecture/");
  await map.getByLabel("Focus on").selectOption("idempotency");
  await expect(
    map.getByRole("link", { name: "Explore Retry policy", exact: true }),
  ).toBeVisible();
  await expect(
    map.getByRole("combobox", { name: "Reading", exact: true }),
  ).toHaveValue("");
  await expect(page).toHaveURL(/topic=idempotency/);
  await map.getByText("Read the relationships", { exact: true }).click();
  const visibleRelations = map.locator("[data-concept-relation]:visible");
  await expect(visibleRelations).toHaveCount(4);
  expect(
    await visibleRelations.evaluateAll((rows) =>
      rows.map((row) => row.getAttribute("data-concept-relation")),
    ),
  ).toEqual([
    "contract idempotency",
    "transaction idempotency",
    "idempotency retry",
    "idempotency durable-workflow",
  ]);
  for (const relation of await visibleRelations.all())
    await expect(relation.locator("p")).not.toBeEmpty();
  await page.screenshot({
    path: test.info().outputPath("complete-graph-focused.png"),
  });
  await map.getByRole("button", { name: "Reset view" }).click();
  await map
    .getByRole("combobox", { name: "Topic group", exact: true })
    .selectOption("Models");
  await map.getByRole("radio", { name: "Show only", exact: true }).check();
  await expect(
    map.getByRole("link", { name: "Explore Amdahl's Law", exact: true }),
  ).toBeVisible();
  await expect(
    map.getByRole("link", { name: "Explore Cache", exact: true }),
  ).not.toBeVisible();
  await map.getByRole("button", { name: "Reset view" }).click();
  await map.getByText("Read the relationships", { exact: true }).click();
  await map.getByRole("button", { name: "Fit", exact: true }).click();
  await map
    .getByRole("heading", { name: "The complete concept graph" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: test.info().outputPath("complete-graph-desktop.png"),
  });
  await map.screenshot({
    path: test.info().outputPath("complete-graph-overview.png"),
  });
});

test("every published reading has scoped discovery and a usable pane", async ({
  page,
}) => {
  for (const reading of conceptPages) {
    await page.goto(reading.url);
    const index = page.getByRole("navigation", {
      name: "Concepts in this reading",
    });
    await expect(index, reading.url).toBeVisible();
    await expect(index.locator("ul").first().locator("a")).toHaveCount(
      reading.concepts.length,
    );
    const link = index.locator("ul").first().locator("a").first();
    const title = (await link.innerText()).trim();
    await link.click();
    const pane = page.getByRole("dialog", { name: title, exact: true });
    await expect(pane, reading.url).toBeVisible();
    await expect(pane).toContainText("Worked example");
    await page.keyboard.press("Escape");
    await expect(link).toBeFocused();
  }
});

test("a failed lazy library request falls back to the static reference", async ({
  page,
}) => {
  await page.route("**/concepts/library.html", (route) => route.abort());
  await page.goto("/chapters/architecture/");
  await page
    .getByRole("navigation", { name: "Concepts in this reading" })
    .getByRole("link", { name: "Cache", exact: true })
    .click();
  await expect(page).toHaveURL(/concepts\/#cache$/);
  await expect(page.locator("#cache")).toContainText("controlled copy");
});

test("a topic leads through the graph and returns to the reading position", async ({
  page,
}) => {
  await page.goto("/chapters/benchmarking/");
  const index = page.getByRole("navigation", {
    name: "Concepts in this reading",
  });
  await index.getByText("Explore concept connections", { exact: true }).click();
  const map = index.locator("[data-concept-map]");
  await map.getByLabel("Focus on").selectOption("little-law");
  await expect(map.locator("[data-concept-map-status]")).toHaveText(
    "Little's Law · 3 connections",
  );
  await map.getByText("Read the relationships", { exact: true }).click();
  await expect(map.locator("[data-concept-relation]:visible")).toHaveCount(3);
  const node = map
    .getByRole("link", { name: "Explore Little's Law", exact: true })
    .filter({ visible: true });
  await node.focus();
  const scroll = await page.evaluate(() => window.scrollY);
  await node.press("Enter");
  const pane = page.getByRole("dialog", { name: "Little's Law", exact: true });
  await expect(pane).toBeVisible();
  await expect(page).toHaveURL(/chapters\/benchmarking\/$/);
  await expect(pane.locator(".concept-passages").first()).toContainText(
    "L = λW",
  );
  await pane
    .locator("[data-concept-map]")
    .getByRole("link", { name: "Explore Amdahl's Law", exact: true })
    .filter({ visible: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Amdahl's Law", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".concept-pane [data-concept-map-status]"),
  ).toHaveText("Amdahl's Law · 5 connections");
  await page.screenshot({
    path: test.info().outputPath("concept-pane-desktop.png"),
  });
  await page.keyboard.press("Escape");
  await expect(page.locator(".concept-pane")).not.toBeVisible();
  await expect(node).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(scroll, 0);
});

test("mobile graph, relationships, focus, and reference work in dark mode", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/concepts/");
  await page.locator("[data-theme-picker]").selectOption("dark");
  const map = page.locator("#concept-graph");
  await map.getByLabel("Focus on").selectOption("queue");
  await map
    .getByRole("link", { name: "Explore Queue", exact: true })
    .filter({ visible: true })
    .click();
  const pane = page.getByRole("dialog", { name: "Queue", exact: true });
  await expect(pane).toBeVisible();
  await expect(pane.locator("[data-concept-map-status]")).toHaveText(
    "Queue · 6 connections",
  );
  expect(
    await pane.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).include(".concept-pane").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("concept-pane-mobile.png"),
  });
  await pane.getByRole("button", { name: "Close concept reference" }).click();
  expect(
    (await new AxeBuilder({ page }).include("#concept-graph").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("concept-graph-mobile.png"),
  });
  await map
    .getByRole("link", { name: "Explore Queue", exact: true })
    .filter({ visible: true })
    .click();
  await pane.getByRole("link", { name: "Open reference page" }).click();
  await expect(pane).not.toBeVisible();
  await expect(page).toHaveURL(/concepts\/#queue$/);
});

test("static graph and curated chapter links remain usable without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: { width: 320, height: 800 },
  });
  const page = await context.newPage();
  await page.goto("/chapters/scaling/");
  const index = page.getByRole("navigation", {
    name: "Concepts in this reading",
  });
  await index.getByText("Explore concept connections", { exact: true }).click();
  await index
    .getByRole("link", { name: "Explore Queue", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/concepts\/#queue$/);
  await expect(page.locator("[data-concept-card]")).toHaveCount(45);
  await expect(page.locator("#queue")).toContainText(
    "Adding a queue creates processing capacity",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  // The reference promises exact teaching locations; verify every curated anchor.
  const links = await page
    .locator(".concept-contexts a")
    .evaluateAll((anchors) =>
      anchors.map(
        (anchor) => (anchor as HTMLAnchorElement).getAttribute("href")!,
      ),
    );
  for (const href of links) {
    const [pathname, fragment] = href.split("#");
    const response = await page.request.get(pathname!);
    expect(response.ok(), href).toBe(true);
    if (fragment)
      expect((await response.text()).includes(`id="${fragment}"`), href).toBe(
        true,
      );
  }
  await context.close();
});

test("cumulative questions reject unstable flow and a swapped model", async ({
  page,
}) => {
  await page.goto("/chapters/benchmarking/#exercise-measurement-transfer");
  const transfer = page.locator("#exercise-measurement-transfer");
  await transfer.locator('[data-field="events"]').fill("10");
  await transfer.locator('[data-field="changes"]').fill("12");
  await transfer.locator('[data-field="balance"]').selectOption("yes");
  await transfer
    .getByRole("button", { name: "Check answer", exact: true })
    .click();
  await expect(transfer.locator("[data-result]")).toContainText("Not yet");
  await transfer.locator('[data-field="balance"]').selectOption("no");
  await transfer
    .getByRole("button", { name: "Check answer", exact: true })
    .click();
  await expect(transfer.locator("[data-result]")).toContainText(
    "Exercise complete",
  );
  await page.goto("/chapters/scaling/#exercise-scaling-model-choice");
  const choice = page.locator("#exercise-scaling-model-choice");
  await choice.locator('[data-field="flow"]').selectOption("amdahl");
  await choice.locator('[data-field="wip"]').fill("10");
  await choice.locator('[data-field="parallel"]').selectOption("little");
  await choice.locator('[data-field="speedup"]').fill("2.5");
  await choice
    .getByRole("button", { name: "Check answer", exact: true })
    .click();
  await expect(choice.locator("[data-result]")).toContainText("Not yet");
  await choice.locator('[data-field="flow"]').selectOption("little");
  await choice.locator('[data-field="parallel"]').selectOption("amdahl");
  await choice
    .getByRole("button", { name: "Check answer", exact: true })
    .click();
  await expect(choice.locator("[data-result]")).toContainText(
    "Exercise complete",
  );
});
