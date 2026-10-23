import { test, expect, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { conceptPages } from "../../shared/concept-pages.ts";
import type { LearningResource } from "../../shared/learning-resources.ts";

test("the entry page offers agent access and lookup before the complete graph", async ({
  page,
}) => {
  await page.goto("/concepts/");
  const explorer = page.locator("[data-concept-explorer]");
  await expect(
    page.getByRole("search", { name: "Concept lookup" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Explore with your own agent" }),
  ).toBeVisible();
  await expect(page.locator("[data-concept-question]")).toHaveCount(0);
  await expect(explorer).not.toHaveAttribute("open", "");
  await expect(page.locator("[data-concept-node]:visible")).toHaveCount(0);
  await expect(page.locator("[data-concept-result]:visible")).toHaveCount(0);
  expect(
    (await new AxeBuilder({ page }).include(".concept-reference").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("concept-agent-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("[data-theme-picker]").selectOption("dark");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).include(".concept-reference").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("concept-agent-mobile.png"),
    fullPage: true,
  });
  const lookup = page.getByRole("search", { name: "Concept lookup" });
  await lookup.getByLabel("Find a concept").fill("retry");
  await expect(
    page.locator("#concept-graph [data-concept-node]:visible"),
  ).toHaveCount(1);
  await expect(page.locator(".concept-directory")).not.toBeVisible();
  await expect(page.locator("[data-concept-map-tools]")).not.toHaveAttribute(
    "open",
    "",
  );
  await expect(page).toHaveURL(/q=retry/);
  await page.reload();
  await expect(lookup.getByLabel("Find a concept")).toHaveValue("retry");
  await expect(
    page.locator("#concept-graph [data-concept-node]:visible"),
  ).toHaveCount(1);
  await lookup.getByLabel("Find a concept").fill("nonexistent-topic");
  await expect(
    page.locator("#concept-graph [data-concept-map-status]"),
  ).toContainText("No topics match");
  await lookup.getByLabel("Find a concept").fill("");
  await expect(
    page.locator("#concept-graph [data-concept-node]:visible"),
  ).toHaveCount(45);
  await expect(page).toHaveURL(/view=all/);
  await explorer.locator(":scope > summary").click();
  await expect(page).toHaveURL(/\/concepts\/$/);
  await explorer.locator(":scope > summary").click();
  await expect(
    page.locator("#concept-graph [data-concept-node]:visible"),
  ).toHaveCount(45);
  await expect(page).toHaveURL(/view=all/);
  await page.reload();
  await expect(
    page.locator("#concept-graph [data-concept-node]:visible"),
  ).toHaveCount(45);
});

test("students can retrieve the graph and check its evidence with their own tools", async ({
  page,
  context,
  request,
  baseURL,
}) => {
  await page.goto("/concepts/");
  const guideUrl = new URL("/concepts/agent-guide.md", baseURL).href;
  await expect(page.getByLabel("Give your agent this guide")).toHaveValue(
    guideUrl,
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy URL", exact: true }).click();
  await expect(page.locator("[data-concept-agent-status]")).toContainText(
    "copied",
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    guideUrl,
  );

  const guideResponse = await request.get(guideUrl);
  expect(guideResponse.ok()).toBe(true);
  expect(guideResponse.headers()["content-type"]).toBe(
    "text/plain; charset=utf-8",
  );
  const guide = await guideResponse.text();
  expect(guide).toContain("Choose your own question");
  expect(guide).toContain("endpoint implements MCP");
  expect(guide).toContain(new URL("/concepts/graph.json", baseURL).href);
  const index = await request.get("/llms.txt");
  expect(index.ok()).toBe(true);
  expect(await index.text()).toContain(guideUrl);

  const dataResponse = await request.get("/concepts/graph.json");
  expect(dataResponse.ok()).toBe(true);
  expect(dataResponse.headers()["content-type"]).toContain("application/json");
  const graph = await dataResponse.json();
  expect(graph.schemaVersion).toBe(2);
  expect(graph.revision).toMatch(/^[a-f0-9]{64}$/);
  expect(graph.concepts).toHaveLength(46);
  expect(graph.relationships).toHaveLength(110);
  expect(graph.readings).toHaveLength(conceptPages.length);
  expect(graph.semantics.relationships).toContain("undirected");
  expect(
    graph.relationships.find(
      (edge: { source: string; target: string }) =>
        edge.source === "queue" && edge.target === "latency",
    ),
  ).toMatchObject({ direction: "directed", label: "can add waiting time to" });
  const markdown = await request.get(graph.resources.markdown);
  expect(markdown.ok()).toBe(true);
  expect(markdown.headers()["content-type"]).toBe("text/plain; charset=utf-8");
  expect(await markdown.text()).toContain(graph.revision);

  // A file/HTTP retrieval tool follows either endpoint and carries its evidence.
  const queueEdges = graph.relationships.filter(
    (edge: { source: string; target: string }) =>
      edge.source === "queue" || edge.target === "queue",
  );
  const reviewEdge = queueEdges.find(
    (edge: { source: string; target: string }) =>
      edge.source === "review-budget" || edge.target === "review-budget",
  );
  expect(reviewEdge.explanation.length).toBeGreaterThan(0);
  const review = graph.concepts.find(
    (concept: { id: string }) => concept.id === "review-budget",
  );
  await page.goto(review.url);
  await expect(page.locator("#review-budget")).toBeVisible();
  await expect(page.locator("#review-budget")).toContainText(review.definition);
  const passageUrl = new URL(review.contexts[0].href);
  const passage = await request.get(passageUrl.href);
  expect(passage.ok()).toBe(true);
  expect(await passage.text()).toContain(`id="${passageUrl.hash.slice(1)}"`);
});

test("agent resources return usable images, cite their source, and lead to a prediction experiment", async ({
  page,
  request,
  baseURL,
}) => {
  const graph = await (await request.get("/concepts/graph.json")).json();
  const pages = new Map<string, string>();
  for (const resource of graph.learningResources as LearningResource[]) {
    expect(new URL(resource.url).origin).toBe(new URL(baseURL!).origin);
    const image = await request.get(resource.images.png);
    expect(image.ok(), resource.id).toBe(true);
    expect(image.headers()["content-type"]).toContain("image/png");
    expect((await image.body()).subarray(0, 8).toString("hex")).toBe(
      "89504e470d0a1a0a",
    );
    if (resource.images.svg) {
      const vector = await request.get(resource.images.svg);
      expect(vector.ok(), resource.id).toBe(true);
      expect(vector.headers()["content-type"]).toContain("image/svg+xml");
      const svg = await vector.text();
      expect(svg).toContain('role="img"');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).not.toContain("var(--");
      expect(svg).not.toContain("<script");
    }
    const source = new URL(resource.url);
    if (!pages.has(source.pathname)) {
      const response = await request.get(source.pathname);
      expect(response.ok(), resource.id).toBe(true);
      pages.set(source.pathname, await response.text());
    }
    if (source.hash)
      expect(pages.get(source.pathname)).toContain(
        `id="${source.hash.slice(1)}"`,
      );
  }
  const law = graph.concepts.find(
    (concept: { id: string }) => concept.id === "little-law",
  );
  expect(law.resourceIds).toContain("graph-little-law");
  expect(law.resourceIds).not.toContain("demo-queue-balance-lab");
  const cache = graph.concepts.find(
    (concept: { id: string }) => concept.id === "cache",
  );
  expect(cache.resourceIds).toContain("demo-cache-decision-lab");
  const lab = graph.learningResources.find(
    (resource: LearningResource) => resource.id === "demo-cache-decision-lab",
  );
  await page.goto(cache.url);
  const resources = page.locator("#cache .concept-learning-resources");
  await resources.locator("summary").click();
  await expect(resources).toContainText(lab.experiment.predict);
  await resources
    .getByRole("link", { name: "Cache decision lab", exact: true })
    .click();
  await expect(page).toHaveURL(lab.url);
  const demo = page.locator("#demo-cache-decision-lab");
  await demo.locator("[data-cache-age]").fill("100");
  await expect(demo.locator("[data-cache-age-label]")).toHaveText("400 days");
});

test("copying the guide still works when clipboard access is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: () => Promise.reject(new Error("Clipboard unavailable")),
      },
      configurable: true,
    });
  });
  await page.goto("/concepts/");
  await page.getByRole("button", { name: "Copy URL", exact: true }).click();
  const input = page.getByLabel("Give your agent this guide");
  await expect(input).toBeFocused();
  await expect(page.locator("[data-concept-agent-status]")).toContainText(
    "selected",
  );
  expect(
    await input.evaluate(
      (element: HTMLInputElement) =>
        element.selectionEnd! - element.selectionStart!,
    ),
  ).toBe((await input.inputValue()).length);
});

test("reading links open their concepts and reflection without a new choice", async ({
  page,
}) => {
  await page.goto("/chapters/benchmarking/");
  await page.locator(".concept-reference-link").click();
  await expect(page).toHaveURL(/reading=/);
  const context = page.locator("[data-concept-context]");
  await expect(
    context.getByRole("heading", { name: "3 · Measurement", exact: true }),
  ).toBeVisible();
  await expect(context.locator("[data-concept-context-prompt]")).toContainText(
    "Which quantities transfer through Little's Law",
  );
  await expect(page.locator("[data-concept-result]:not([hidden])")).toHaveCount(
    10,
  );
  await expect(page.locator("[data-concept-map-tools]")).not.toHaveAttribute(
    "open",
    "",
  );
});

test("the graph expands into the display without changing the exploration", async ({
  page,
}) => {
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.goto("/concepts/?theme=Development");
  await page.locator("[data-theme-picker]").selectOption("dark");
  const map = page.locator("#concept-graph [data-concept-map]");
  const graphic = map.locator(".concept-map-graphic");
  const labels = map.getByRole("checkbox", { name: "Show connection labels" });
  await labels.check();
  const regular = (await map.boundingBox())!;
  const regularCanvas = (await graphic.boundingBox())!;
  const camera = await graphic.getAttribute("data-camera");
  const contextUrl = page.url();
  const expand = map.getByRole("button", { name: "Expand graph", exact: true });
  await expand.focus();
  await expand.press("Enter");
  const restore = map.getByRole("button", {
    name: "Restore graph size",
    exact: true,
  });
  await expect(restore).toHaveAttribute("aria-pressed", "true");
  await expect(restore).toBeFocused();
  const wide = (await map.boundingBox())!;
  const wideCanvas = (await graphic.boundingBox())!;
  expect(wide.width).toBeGreaterThan(2560 * 0.9);
  expect(wide.width).toBeGreaterThan(regular.width * 1.8);
  expect(wideCanvas.height).toBeGreaterThan(regularCanvas.height * 1.7);
  await expect(graphic).toHaveAttribute("data-camera", camera!);
  await expect(map.getByRole("combobox", { name: "Topic group" })).toHaveValue(
    "Development",
  );
  await expect(labels).toBeChecked();
  await expect(map.locator("[data-concept-node]:visible")).toHaveCount(45);
  await expect(page).toHaveURL(contextUrl);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await map.screenshot({
    path: test.info().outputPath("concept-graph-wide.png"),
  });
  await map.getByRole("button", { name: "Fit", exact: true }).click();
  expect(
    await graphic.evaluate((element) => {
      const svg = element.querySelector("svg")!;
      const view = svg.viewBox.baseVal;
      return (
        view.x <= 0 &&
        view.y <= 0 &&
        view.x + view.width >= Number(svg.dataset.width) * 1.7 &&
        view.y + view.height >= Number(svg.dataset.height) * 1.7
      );
    }),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).include("#concept-graph").analyze())
      .violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await map.getByRole("button", { name: "Fit", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await restore.click();
  await expect(expand).toHaveAttribute("aria-pressed", "false");
  await page.setViewportSize({ width: 2560, height: 1440 });
  expect((await map.boundingBox())!.width).toBeCloseTo(regular.width, 0);
  await expect(labels).toBeChecked();
  await expect(page).toHaveURL(contextUrl);
});

test("group highlighting preserves context before an explicit group-only view", async ({
  page,
}) => {
  await page.goto("/concepts/?view=all");
  const map = page.locator("#concept-graph");
  const group = map.getByRole("combobox", { name: "Topic group", exact: true });
  const highlight = map.getByRole("radio", { name: "Highlight", exact: true });
  const only = map.getByRole("radio", { name: "Show only", exact: true });
  const nodes = map.locator("[data-concept-node]:visible");
  const graphic = map.locator(".concept-map-graphic");
  const viewport = () =>
    graphic.evaluate((element) => ({
      camera: element.getAttribute("data-camera"),
      positions: [...element.querySelectorAll("[data-concept-node] g")].map(
        (node) => node.getAttribute("transform"),
      ),
    }));
  await expect(highlight).toBeChecked();
  await expect(highlight).toBeDisabled();
  await expect(only).toBeDisabled();
  await map.getByRole("button", { name: "Zoom in", exact: true }).click();
  await graphic.focus();
  await graphic.press("ArrowRight");
  await graphic.press("ArrowDown");
  const before = await viewport();
  await group.selectOption("Models");
  await expect(nodes).toHaveCount(45);
  await expect(map.locator("[data-concept-edge]:not(.is-hidden)")).toHaveCount(
    102,
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
  await expect(
    page.locator("[data-concept-group-tag]:not([hidden])"),
  ).toHaveCount(5);
  await expect(page.locator("[data-concept-result]:not([hidden])")).toHaveCount(
    45,
  );
  await expect(page).toHaveURL(/group-view=highlight/);

  await map.getByRole("checkbox", { name: "Show connection labels" }).check();
  await expect(map.locator(".concept-edge-label:visible")).toHaveCount(102);
  const labeledViewport = await viewport();
  await only.check();
  await expect(nodes).toHaveCount(5);
  await expect(page.locator("[data-concept-result]:not([hidden])")).toHaveCount(
    5,
  );
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
  await expect(page).toHaveURL(/\/concepts\/\?view=all$/);
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

test("arrows express qualified relationships and focus reveals labels without changing the map", async ({
  page,
}) => {
  await page.goto("/concepts/?view=all");
  const map = page.locator("#concept-graph");
  const toggle = map.getByRole("checkbox", { name: "Show connection labels" });
  await expect(map.locator('[data-direction="directed"]')).toHaveCount(74);
  await expect(map.locator('[data-direction="undirected"]')).toHaveCount(28);
  await expect(
    map.locator('[data-direction="undirected"] [data-concept-arrow]'),
  ).toHaveCount(0);
  const arrow = map.locator(
    '[data-concept-edge="queue latency"] [data-concept-arrow]',
  );
  await expect(arrow).toBeVisible();
  const positions = await map
    .locator(".concept-map-graphic")
    .evaluate((element) => ({
      width: element.querySelector("svg")!.style.width,
      nodes: [...element.querySelectorAll("[data-concept-node] g")].map(
        (node) => node.getAttribute("transform"),
      ),
    }));
  const queue = map.getByRole("link", { name: "Explore Queue", exact: true });
  await queue.focus();
  await expect(map.locator(".concept-edge-label:visible")).toHaveCount(6);
  await expect(
    map.locator('[data-concept-edge-label="queue latency"]'),
  ).toContainText("can add waiting time to");
  await expect(toggle).not.toBeChecked();
  expect(
    await map.locator(".concept-map-graphic").evaluate((element) => ({
      width: element.querySelector("svg")!.style.width,
      nodes: [...element.querySelectorAll("[data-concept-node] g")].map(
        (node) => node.getAttribute("transform"),
      ),
    })),
  ).toEqual(positions);
  await toggle.focus();
  await expect(map.locator(".concept-edge-label:visible")).toHaveCount(0);
  await queue.hover();
  await expect(map.locator(".concept-edge-label:visible")).toHaveCount(6);
  await page.mouse.move(0, 0);
  await expect(map.locator(".concept-edge-label:visible")).toHaveCount(0);
  await map.getByLabel("Focus on").selectOption("latency");
  await map.getByRole("link", { name: "Explore Latency", exact: true }).click();
  const pane = page.getByRole("dialog", { name: "Latency", exact: true });
  await expect(
    pane.getByRole("checkbox", { name: "Show connection labels" }),
  ).toBeChecked();
  const edge = pane.locator('[data-concept-edge="queue latency"]');
  expect(
    await edge.evaluate((element) => {
      const line = element.querySelector("line")!;
      const destination = element
        .closest("svg")!
        .querySelector(
          '[data-concept-node="latency"] g',
        )! as SVGGraphicsElement;
      const matrix = destination.transform.baseVal.consolidate()!.matrix;
      const dx = Number(line.getAttribute("x2")) - matrix.e;
      const dy = Number(line.getAttribute("y2")) - matrix.f;
      return Math.abs(dx) > 95 || Math.abs(dy) > 30;
    }),
  ).toBe(true);
  await pane.getByText("Try explaining a connection", { exact: true }).click();
  await pane
    .getByRole("button", { name: "Hide labels to try", exact: true })
    .click();
  await expect(pane.locator(".concept-edge-label:visible")).toHaveCount(0);
  await expect(toggle).not.toBeChecked();
  await pane
    .getByRole("button", { name: "Compare with the labels", exact: true })
    .click();
  await expect(pane.locator(".concept-edge-label:visible")).toHaveCount(6);
  await pane
    .locator(".concept-connection-practice")
    .evaluate((element: HTMLDetailsElement) => {
      element.open = false;
    });
  await pane.locator(".concept-map-graphic").evaluate((element) => {
    element.scrollIntoView({ block: "center", behavior: "instant" });
  });
  await pane.locator(".concept-map-graphic").screenshot({
    path: test.info().outputPath("directional-connections-desktop.png"),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("[data-theme-picker]").selectOption("dark");
  await pane.locator(".concept-map-graphic").evaluate((element) => {
    element.scrollIntoView({ block: "center", behavior: "instant" });
  });
  await pane.locator(".concept-map-graphic").screenshot({
    path: test.info().outputPath("directional-connections-mobile.png"),
  });
  expect(
    (await new AxeBuilder({ page }).include(".concept-pane").analyze())
      .violations,
  ).toEqual([]);
});

test("connection labels stay local while following concepts across graph views", async ({
  page,
}) => {
  // A preference saved by the old global control must not affect new graphs.
  await page.addInitScript(() =>
    localStorage.setItem("concept-connection-labels", "true"),
  );
  await page.goto("/concepts/?view=all");
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
  await expect(map.locator(".concept-edge-label:visible")).toHaveCount(102);
  await expect(
    page.locator("#decision-log [data-concept-labels]"),
  ).toBeChecked();
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
    "records conditions for",
    "records rationale for",
    "accepted context",
    "revisit conditions",
    "can document",
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
  const backgroundView = () =>
    graphic.evaluate((element) => ({
      left: element.scrollLeft,
      top: element.scrollTop,
      width: element.querySelector("svg")!.style.width,
      viewBox: element.querySelector("svg")!.getAttribute("viewBox"),
      positions: [...element.querySelectorAll("[data-concept-node] g")].map(
        (node) => node.getAttribute("transform"),
      ),
    }));
  const beforePane = await backgroundView();
  await map
    .getByRole("link", { name: "Explore Decision log", exact: true })
    .click();
  const pane = page.getByRole("dialog", { name: "Decision log", exact: true });
  const paneToggle = pane.getByRole("checkbox", {
    name: "Show connection labels",
  });
  await expect(paneToggle).toBeChecked();
  await expect(pane.locator(".concept-edge-label:visible")).toHaveCount(6);
  await paneToggle.check();
  await expect(pane.locator(".concept-edge-label:visible")).toHaveCount(6);
  await assertCaptionPadding(pane);
  await paneToggle.uncheck();
  await expect(pane.locator(".concept-edge-label:visible")).toHaveCount(0);
  await expect(toggle).toBeChecked();
  expect(await backgroundView()).toEqual(beforePane);
  await pane
    .getByRole("link", { name: "Explore Decision reversibility", exact: true })
    .click();
  const nextPane = page.getByRole("dialog", {
    name: "Decision reversibility",
    exact: true,
  });
  const nextToggle = nextPane.getByRole("checkbox", {
    name: "Show connection labels",
  });
  await expect(nextToggle).toBeChecked();
  await expect(nextPane.locator(".concept-edge-label:visible")).toHaveCount(7);
  await nextToggle.check();
  await expect(
    page.locator(".concept-pane .concept-edge-label:visible"),
  ).toHaveCount(7);
  await expect(toggle).toBeChecked();
  expect(await backgroundView()).toEqual(beforePane);
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/chapters/friction/");
  await page.locator("[data-theme-picker]").selectOption("dark");
  const index = page.getByRole("navigation", {
    name: "Concepts in this reading",
  });
  await index.getByText("Explore concept connections", { exact: true }).click();
  const chapterMap = index.locator("[data-concept-map]");
  const chapterToggle = chapterMap.getByRole("checkbox", {
    name: "Show connection labels",
  });
  await expect(chapterToggle).toBeChecked();
  await chapterToggle.check();
  await assertNoCaptionOverlap(chapterMap);
  await assertCaptionPadding(chapterMap);
  await chapterMap.getByLabel("Focus on").selectOption("decision-log");
  await expect(chapterMap.locator(".concept-edge-label:visible")).toHaveCount(
    5,
  );
  await chapterToggle.uncheck();
  await expect(chapterMap.locator(".concept-edge-label:visible")).toHaveCount(
    0,
  );
  await chapterToggle.check();
  await page.reload();
  await index.getByText("Explore concept connections", { exact: true }).click();
  await expect(chapterToggle).toBeChecked();
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
      const fit = map.getByRole("button", { name: "Fit", exact: true });
      if (await fit.count()) await fit.click();
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
      .getByRole("link", { name: "Explore Action authorization", exact: true })
      .click();
    const pane = page.getByRole("dialog", {
      name: "Action authorization",
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
      await page.goto("/concepts/?view=all");
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

test("the compact directory opens concepts without losing the browsing position", async ({
  page,
}) => {
  await page.goto("/concepts/?view=list");
  const directory = page.locator(".concept-directory");
  await expect(directory.locator("[data-concept-result]:visible")).toHaveCount(
    45,
  );
  await expect(directory.locator("[data-concept-card]:visible")).toHaveCount(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThan(8000);
  await expect(directory.locator("[data-concept-directory-count]")).toHaveText(
    "45 of 45 topics in this view",
  );
  const summary = directory.locator('[data-concept-select="queue"]');
  await summary.scrollIntoViewIfNeeded();
  await summary.focus();
  const scroll = await page.evaluate(() => window.scrollY);
  await summary.press("Enter");
  const pane = page.getByRole("dialog", { name: "Queue", exact: true });
  await expect(pane).toBeVisible();
  await expect(pane).toContainText("Worked example");
  await expect(directory.locator(".concept-directory-item[open]")).toHaveCount(
    0,
  );
  await expect(page).toHaveURL(/concepts\/\?view=list$/);
  await page.keyboard.press("Escape");
  await expect(summary).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(scroll, 0);
  await directory
    .getByRole("heading", { name: "Concept list" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: test.info().outputPath("concept-directory-desktop.png"),
  });
  expect(
    (await new AxeBuilder({ page }).include(".concept-directory").analyze())
      .violations,
  ).toEqual([]);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("[data-theme-picker]").selectOption("dark");
  await summary.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: test.info().outputPath("concept-directory-mobile.png"),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).include(".concept-directory").analyze())
      .violations,
  ).toEqual([]);
  await summary.press("Space");
  await expect(pane).toBeVisible();
  await pane.getByRole("link", { name: "Open reference page" }).click();
  await expect(pane).not.toBeVisible();
  await expect(page.locator("#queue")).toBeVisible();
  await expect(directory.locator(".concept-directory-item[open]")).toHaveCount(
    1,
  );
});

test("the complete map supports discovery, filtering, zoom, and shared views", async ({
  page,
}) => {
  await page.goto("/concepts/?view=all");
  const map = page.locator("#concept-graph");
  const status = map.locator("[data-concept-map-status]");
  await expect(status).toHaveText("45 concepts · 102 connections");
  const graphic = map.locator(".concept-map-graphic");
  const directory = page.locator(".concept-directory");
  const assertDirectoryMatches = async () => {
    const ids = await map
      .locator("[data-concept-node]:visible")
      .evaluateAll((items) =>
        items.map((item) => item.getAttribute("data-concept-node")).sort(),
      );
    expect(
      await directory
        .locator("[data-concept-result]:not([hidden])")
        .evaluateAll((items) =>
          items.map((item) => item.getAttribute("data-concept-result")).sort(),
        ),
    ).toEqual(ids);
    await expect(
      directory.locator("[data-concept-directory-count]"),
    ).toHaveText(`${ids.length} of 45 topics in this view`);
  };
  const camera = () =>
    graphic.evaluate((element) => JSON.parse(element.dataset.camera!));
  const before = await camera();
  await map.getByRole("button", { name: "Zoom in", exact: true }).click();
  expect((await camera()).scale).toBeGreaterThan(before.scale);
  await graphic.scrollIntoViewIfNeeded();
  const box = (await graphic.boundingBox())!;
  const beforeDrag = await camera();
  await page.mouse.move(box.x + 30, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + 70, { steps: 5 });
  await page.mouse.up();
  expect((await camera()).x).toBeCloseTo(
    beforeDrag.x - 60 / beforeDrag.scale,
    1,
  );
  expect((await camera()).y).toBeCloseTo(
    beforeDrag.y - 40 / beforeDrag.scale,
    1,
  );
  await page.getByLabel("Find a concept").fill("change probe");
  await expect(map.locator("[data-concept-node]:visible")).toHaveCount(1);
  await assertDirectoryMatches();
  await map
    .getByRole("link", {
      name: "Explore Maintainability assessment",
      exact: true,
    })
    .click();
  const assessmentPane = page.getByRole("dialog", {
    name: "Maintainability assessment",
    exact: true,
  });
  await expect(assessmentPane.locator("[data-concept-usage]")).toContainText(
    "this course's task-based maintainability assessment protocol",
  );
  expect(
    await assessmentPane.evaluate((element) => {
      const usage = element.querySelector("[data-concept-usage]")!;
      const graph = element.querySelector("[data-concept-map]")!;
      return Boolean(
        usage.compareDocumentPosition(graph) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await page.getByLabel("Find a concept").fill("ADR");
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
  await page.getByLabel("Find a concept").fill("Lusser");
  await expect(map.locator("[data-concept-node]:visible")).toHaveCount(1);
  await expect(
    map.getByRole("link", { name: "Explore Lusser's Law", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Find a concept").fill("nonexistent-topic");
  await expect(status).toContainText("No topics match");
  await expect(graphic).not.toBeVisible();
  await assertDirectoryMatches();
  await expect(directory.locator("[data-concept-empty]")).not.toHaveAttribute(
    "hidden",
    "",
  );
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
  await assertDirectoryMatches();
  await page.reload();
  await map.getByText("Adjust the graph and filters", { exact: true }).click();
  await expect(
    map.getByRole("combobox", { name: "Reading", exact: true }),
  ).toHaveValue("/chapters/architecture/");
  await assertDirectoryMatches();
  await map.getByLabel("Focus on").selectOption("idempotency");
  await expect(
    map.getByRole("link", { name: "Explore Retry policy", exact: true }),
  ).toBeVisible();
  await expect(
    map.getByRole("combobox", { name: "Reading", exact: true }),
  ).toHaveValue("");
  await expect(page).toHaveURL(/topic=idempotency/);
  await assertDirectoryMatches();
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
  await assertDirectoryMatches();
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
    .getByRole("heading", { name: "Concepts and connections" })
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
  await expect(page.locator("#cache")).toBeVisible();
});

test("a topic leads through the graph and returns to the reading position", async ({
  page,
}) => {
  // Measure restoration after native focus scrolling, without an animation race.
  await page.emulateMedia({ reducedMotion: "reduce" });
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
  await page.goto("/concepts/?view=all");
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
    // Native fragment scrolling must settle before testing another entry.
    reducedMotion: "reduce",
    viewport: { width: 320, height: 800 },
  });
  const page = await context.newPage();
  await page.goto("/concepts/");
  await expect(page.locator("[data-concept-node]:visible")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Read the guide", exact: true }),
  ).toHaveAttribute("href", "/concepts/agent-guide.md");
  await page.getByText("Connect it, then check it", { exact: true }).click();
  await expect(page.locator(".concept-agent-setup")).toContainText(
    "download the guide",
  );
  await expect(
    page.getByRole("button", { name: "Copy URL", exact: true }),
  ).not.toBeVisible();
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
  await expect(page.locator("[data-concept-card]:visible")).toHaveCount(1);
  await expect(page.locator("#queue")).toBeVisible();
  await expect(page.locator("#queue")).toContainText(
    "Adding a queue creates processing capacity",
  );
  await page.locator('[data-concept-select="agent"]').click();
  await expect(page.locator("#agent")).toBeVisible();
  await expect(page.locator("#agent [data-concept-usage]")).toContainText(
    "LLM practitioners vary",
  );
  await expect(
    page.locator("#agent [data-concept-usage]").getByRole("link"),
  ).toHaveAttribute(
    "href",
    "https://www.anthropic.com/engineering/building-effective-agents",
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
