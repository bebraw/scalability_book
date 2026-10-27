import { devices, expect, test, type Locator } from "@playwright/test";

const camera = (graphic: Locator) =>
  graphic.evaluate(
    (element) =>
      JSON.parse(element.dataset.camera!) as {
        x: number;
        y: number;
        scale: number;
        width: number;
        height: number;
      },
  );

// Native pointer coordinates are rounded to screen pixels by the browser.
const sameScreenPosition = (actual: number, expected: number, scale: number) =>
  expect(Math.abs(actual - expected) * scale).toBeLessThan(1);

test("the Coding agent card and agent guide retain distinct accessible names without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
  });
  try {
    const page = await context.newPage();
    await page.goto("/concepts/");
    await page.locator("#concept-explorer > summary").click();
    await page.locator('[data-concept-select="agent"]').click();
    const card = page.locator('[data-concept-card="agent"]');
    await expect(card).toBeVisible();
    await expect(card).toHaveAccessibleName("Coding agent");
    await expect(page.locator(".concept-agent")).toHaveAccessibleName(
      "Explore with your own agent",
    );
    const duplicateIds = await page.evaluate(() => {
      const ids = [...document.querySelectorAll("[id]")].map(
        (element) => element.id,
      );
      return [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    });
    expect(duplicateIds).toEqual([]);
  } finally {
    await context.close();
  }
});

test("expanded and fitted graphs pan in both directions, including from a concept", async ({
  page,
}) => {
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.goto("/concepts/?view=all");
  const map = page.locator("#concept-graph");
  const graphic = map.locator(".concept-map-graphic");
  await map.getByRole("button", { name: "Expand graph", exact: true }).click();
  await map.getByRole("button", { name: "Fit", exact: true }).click();
  await graphic.scrollIntoViewIfNeeded();
  const node = map.getByRole("link", { name: "Explore Queue", exact: true });
  // Keyboard entry reveals the readable card from the fitted group overview.
  await node.focus();
  await graphic.focus();
  const box = (await node.boundingBox())!;
  const before = await camera(graphic);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 140,
    box.y + box.height / 2 + 80,
    { steps: 8 },
  );
  await page.mouse.up();
  const after = await camera(graphic);
  expect(after.x).toBeCloseTo(before.x - 140 / before.scale, 1);
  expect(after.y).toBeCloseTo(before.y - 80 / before.scale, 1);
  await expect(page.locator(".concept-pane")).not.toBeVisible();
  await expect(graphic).toBeFocused();

  // A small movement is still a click; closing the reference keeps its labels.
  const moved = (await node.boundingBox())!;
  await page.mouse.move(moved.x + moved.width / 2, moved.y + moved.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    moved.x + moved.width / 2 + 2,
    moved.y + moved.height / 2 + 1,
  );
  await page.mouse.up();
  const pane = page.getByRole("dialog", { name: "Queue", exact: true });
  await expect(pane).toBeVisible();
  await pane.getByRole("button", { name: "Close concept reference" }).click();
  await graphic.focus();
  await page.mouse.move(0, 0);
  await expect(node).toHaveClass(/is-selected/);
  await expect(map.locator(".concept-edge-label:visible")).toHaveCount(6);
  await graphic.press("Escape");
  await expect(node).not.toHaveClass(/is-selected/);
  await expect(map.locator(".concept-edge-label:visible")).toHaveCount(0);
});

test("wheel, keyboard, resize, and expansion preserve a useful camera location", async ({
  page,
}) => {
  await page.goto("/concepts/?view=all");
  const map = page.locator("#concept-graph");
  const graphic = map.locator(".concept-map-graphic");
  await graphic.scrollIntoViewIfNeeded();
  const box = (await graphic.boundingBox())!;
  const anchor = { x: box.width * 0.3, y: box.height * 0.6 };
  await page.mouse.move(box.x + anchor.x, box.y + anchor.y);
  const before = await camera(graphic);
  await page.mouse.wheel(100, 80);
  await expect
    .poll(async () => (await camera(graphic)).x)
    .toBeCloseTo(before.x + 100 / before.scale, 1);
  expect((await camera(graphic)).y).toBeCloseTo(
    before.y + 80 / before.scale,
    1,
  );
  const panned = await camera(graphic);
  const world = {
    x: panned.x + (anchor.x - box.width / 2) / panned.scale,
    y: panned.y + (anchor.y - box.height / 2) / panned.scale,
  };
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -160);
  await page.keyboard.up("Control");
  await expect
    .poll(async () => (await camera(graphic)).scale)
    .toBeGreaterThan(panned.scale);
  const zoomed = await camera(graphic);
  sameScreenPosition(
    zoomed.x + (anchor.x - box.width / 2) / zoomed.scale,
    world.x,
    zoomed.scale,
  );
  sameScreenPosition(
    zoomed.y + (anchor.y - box.height / 2) / zoomed.scale,
    world.y,
    zoomed.scale,
  );
  await map.getByRole("button", { name: "Expand graph", exact: true }).click();
  expect(await camera(graphic)).toEqual(zoomed);
  await page.setViewportSize({ width: 1920, height: 1080 });
  expect(await camera(graphic)).toEqual(zoomed);
  await graphic.focus();
  await graphic.press("ArrowRight");
  expect((await camera(graphic)).x).toBeCloseTo(
    zoomed.x + 60 / zoomed.scale,
    1,
  );
  await graphic.press("0");
  const fit = await camera(graphic);
  expect(fit.x).toBe(fit.width / 2);
  expect(fit.y).toBe(fit.height / 2);
  await map.getByRole("button", { name: "Use readable graph size" }).click();
  expect((await camera(graphic)).scale).toBe(1);
  await expect(map.locator("[data-concept-zoom-level]")).toHaveText("100%");

  const beforePrint = await graphic.locator("svg").getAttribute("viewBox");
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  await expect(graphic.locator("svg")).toHaveAttribute(
    "viewBox",
    `0 0 ${fit.width} ${fit.height}`,
  );
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(graphic.locator("svg")).toHaveAttribute("viewBox", beforePrint!);
});

for (const device of ["iPhone 13", "iPad (gen 7)"])
  test(`touch dragging and pinching work on ${device}`, async ({
    browser,
    browserName,
    baseURL,
  }) => {
    test.skip(browserName !== "chromium", "Native multi-touch input uses CDP.");
    const context = await browser.newContext({
      ...devices[device],
      baseURL,
    });
    const page = await context.newPage();
    await page.goto("/concepts/?view=all");
    const map = page.locator("#concept-graph");
    const graphic = map.locator(".concept-map-graphic");
    await map.getByRole("button", { name: "Fit", exact: true }).tap();
    await graphic.scrollIntoViewIfNeeded();
    const box = (await graphic.boundingBox())!;
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    const client = await context.newCDPSession(page);
    const before = await camera(graphic);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { id: 1, x: x - 40, y },
        { id: 2, x: x + 40, y },
      ],
    });
    // Several moves exercise the transfer of implicit SVG capture to the graph.
    for (let step = 1; step <= 4; step++)
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { id: 1, x: x - 40 - 5 * step, y: y + 7.5 * step },
          { id: 2, x: x + 40 + 15 * step, y: y + 7.5 * step },
        ],
      });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(async () => (await camera(graphic)).scale)
      .toBeCloseTo(before.scale * 2, 1);
    const zoomed = await camera(graphic);
    sameScreenPosition(zoomed.x, before.x - 20 / zoomed.scale, zoomed.scale);
    sameScreenPosition(zoomed.y, before.y - 30 / zoomed.scale, zoomed.scale);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ id: 1, x, y }],
    });
    for (let step = 1; step <= 5; step++)
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ id: 1, x: x - 10 * step, y: y - 8 * step }],
      });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    expect((await camera(graphic)).x).toBeCloseTo(
      zoomed.x + 50 / zoomed.scale,
      1,
    );
    expect((await camera(graphic)).y).toBeCloseTo(
      zoomed.y + 40 / zoomed.scale,
      1,
    );
    await expect(page.locator(".concept-pane")).not.toBeVisible();
    await map.getByLabel("Focus on").selectOption("queue");
    const queue = map.getByRole("link", { name: "Explore Queue", exact: true });
    const nodeBox = (await queue.boundingBox())!;
    const nodeX = nodeBox.x + nodeBox.width / 2,
      nodeY = nodeBox.y + nodeBox.height / 2;
    const focused = await camera(graphic);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ id: 1, x: nodeX, y: nodeY }],
    });
    for (let step = 1; step <= 5; step++)
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ id: 1, x: nodeX + 10 * step, y: nodeY + 8 * step }],
      });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    expect((await camera(graphic)).x).toBeCloseTo(
      focused.x - 50 / focused.scale,
      1,
    );
    expect((await camera(graphic)).y).toBeCloseTo(
      focused.y - 40 / focused.scale,
      1,
    );
    await expect(page.locator(".concept-pane")).not.toBeVisible();
    await expect(graphic).not.toHaveClass(/is-dragging/);
    await queue.focus();
    await queue.press("Enter");
    const pane = page.getByRole("dialog", { name: "Queue", exact: true });
    await expect(pane).toBeVisible();
    await pane.getByRole("button", { name: "Close concept reference" }).click();
    await map.getByRole("link", { name: "Explore Queue", exact: true }).tap();
    await expect(
      page.getByRole("dialog", { name: "Queue", exact: true }),
    ).toBeVisible();
    await context.close();
  });

for (const device of ["iPhone 13", "iPad (gen 7)"])
  test(`a single touch tap opens a concept reference on ${device}`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ ...devices[device], baseURL });
    const page = await context.newPage();
    await page.goto("/concepts/?view=all");
    const map = page.locator("#concept-graph");
    const graphic = map.locator(".concept-map-graphic");
    await map.getByLabel("Focus on").selectOption("queue");
    const queue = map.getByRole("link", { name: "Explore Queue", exact: true });
    await queue.scrollIntoViewIfNeeded();
    const before = await camera(graphic);
    // Tap without a preceding keyboard focus or mouse click.
    await queue.tap();
    const pane = page.getByRole("dialog", { name: "Queue", exact: true });
    await expect(pane).toBeVisible();
    await pane.getByRole("button", { name: "Close concept reference" }).tap();
    await expect(pane).not.toBeVisible();
    expect(await camera(graphic)).toEqual(before);
    await queue.tap();
    await expect(pane).toBeVisible();
    await context.close();
  });
