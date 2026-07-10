import { expect, test } from "@playwright/test";

test.describe("demo showcase", () => {
  test("presents every demo as one themed systems-lab catalogue", async ({
    page,
  }) => {
    await page.goto("/demos/");

    const gallery = page.locator(".demo-gallery-page");
    const items = gallery.locator(".demo-gallery-item");
    await expect(gallery.locator("h1")).toContainText("Demo showcase");
    await expect(items).toHaveCount(13);
    await expect(gallery.locator(".demo-gallery-stats")).toContainText("13");
    await expect(items.first().locator(".demo-gallery-index")).toHaveText("01");
    await expect(items.last().locator(".demo-gallery-index")).toHaveText("13");
    await expect(gallery.locator(".demo-gallery-status")).toHaveCount(13);
    await expect(
      gallery.locator("[data-orchestration-lab]:not([data-busy])"),
    ).toBeVisible({ timeout: 20_000 });

    const lightSurface = await gallery.evaluate(
      (element) => getComputedStyle(element).backgroundImage,
    );
    await page.locator("[data-theme-picker]").selectOption("dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const darkSurface = await gallery.evaluate(
      (element) => getComputedStyle(element).backgroundImage,
    );
    expect(darkSurface).not.toBe(lightSurface);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(items.first().locator(".demo-gallery-item-header")).toHaveCSS(
      "position",
      "static",
    );
    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(pageOverflow).toBeLessThanOrEqual(1);
  });

  test("uses the systems-lab treatment for demos embedded in chapters", async ({
    page,
  }) => {
    await page.goto("/chapters/scaling/#scaling-pressure-lab");
    const demo = page.locator("[data-scaling-demo]");
    await expect(demo).toBeVisible();

    await expect(demo).toHaveCSS("border-radius", "0px");
    await expect(demo.locator(".scaling-demo-panel").first()).toHaveCSS(
      "border-radius",
      "0px",
    );
    await expect(demo.locator("select").first()).toHaveCSS(
      "border-radius",
      "0px",
    );
    const lightBackground = await demo.evaluate(
      (element) => getComputedStyle(element).backgroundImage,
    );
    expect(lightBackground).toContain("linear-gradient");

    await page.locator("[data-theme-picker]").selectOption("dark");
    const darkBackground = await demo.evaluate(
      (element) => getComputedStyle(element).backgroundImage,
    );
    expect(darkBackground).not.toBe(lightBackground);
  });
});
