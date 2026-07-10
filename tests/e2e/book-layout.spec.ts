import { expect, test } from "@playwright/test";

test.describe("book reading layout", () => {
  test("collapses sidebars and expands demos into focus mode", async ({
    page,
  }) => {
    await page.goto("/chapters/scaling/#scaling-pressure-lab");

    const shell = page.locator(".book-shell");
    const main = page.locator(".chapter-main");
    const demo = page.locator("[data-scaling-demo]");
    const contents = page.locator("#book-contents-sidebar");
    const outline = page.locator("#local-toc-sidebar");
    const controls = page.locator("[data-book-layout-controls]");
    const focusButton = controls.locator("[data-book-layout-toggle='focus']");
    const contentsButton = controls.locator(
      "[data-book-layout-toggle='contents']",
    );

    await expect(contents).toBeVisible();
    await expect(outline).toBeVisible();
    await expect(focusButton).toBeVisible();
    const defaultMainWidth = await elementWidth(main);
    const defaultDemoWidth = await elementWidth(demo);

    await focusButton.click();
    await expect(shell).toHaveAttribute("data-demo-focus", "true");
    await expect(focusButton).toHaveAttribute("aria-pressed", "true");
    await expect(focusButton).toContainText("Exit demo focus");
    await expect(contents).toBeHidden();
    await expect(outline).toBeHidden();
    await expect(contentsButton).toBeDisabled();
    await expect
      .poll(() => elementWidth(main))
      .toBeGreaterThan(defaultMainWidth + 300);
    await expect
      .poll(() => elementWidth(demo))
      .toBeGreaterThan(defaultDemoWidth + 300);

    await focusButton.click();
    await expect(contents).toBeVisible();
    await expect(outline).toBeVisible();

    await contentsButton.click();
    await expect(shell).toHaveAttribute("data-book-contents-collapsed", "true");
    await expect(contents).toBeHidden();
    await expect(outline).toBeVisible();

    await page.reload();
    await expect(contents).toBeHidden();
    await expect(outline).toBeVisible();

    await page.setViewportSize({ width: 1100, height: 844 });
    await expect(controls).toBeHidden();
    await expect(contents).toBeVisible();
    await expect(outline).toBeVisible();
  });
});

async function elementWidth(locator: import("@playwright/test").Locator) {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error("Expected a visible element with a bounding box");
  }
  return box.width;
}
