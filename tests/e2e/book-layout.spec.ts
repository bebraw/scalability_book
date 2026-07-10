import { expect, test } from "@playwright/test";

test.describe("book reading layout", () => {
  test("collapses sidebars and expands demos into the available space", async ({
    page,
  }) => {
    await page.goto("/chapters/scaling/#scaling-pressure-lab");

    const shell = page.locator(".book-shell");
    const main = page.locator(".chapter-main");
    const demo = page.locator("[data-scaling-demo]");
    const contents = page.locator("#book-contents-sidebar");
    const outline = page.locator("#local-toc-sidebar");
    const contentsPanel = contents.locator("details");
    const outlinePanel = outline.locator("details");
    const contentsToggle = contents.locator("summary");
    const outlineToggle = outline.locator("summary");

    await expect(contents).toBeVisible();
    await expect(outline).toBeVisible();
    await expect(page.locator("[data-book-layout-controls]")).toHaveCount(0);
    const defaultMainWidth = await elementWidth(main);
    const defaultDemoWidth = await elementWidth(demo);

    await contentsToggle.click();
    await outlineToggle.click();
    await expect(contentsPanel).not.toHaveAttribute("open", "");
    await expect(outlinePanel).not.toHaveAttribute("open", "");
    await expect(contentsToggle).toBeVisible();
    await expect(outlineToggle).toBeVisible();
    await expect
      .poll(() => elementWidth(main))
      .toBeGreaterThan(defaultMainWidth + 300);
    await expect
      .poll(() => elementWidth(demo))
      .toBeGreaterThan(defaultDemoWidth + 300);

    await outlineToggle.click();
    await expect(contentsPanel).not.toHaveAttribute("open", "");
    await expect(outlinePanel).toHaveAttribute("open", "");

    await contentsToggle.click();
    await expect(shell).toHaveAttribute(
      "data-book-contents-collapsed",
      "false",
    );
    await expect(contentsPanel).toHaveAttribute("open", "");
    await expect(outlinePanel).toHaveAttribute("open", "");

    await contentsToggle.click();
    await expect(shell).toHaveAttribute("data-book-contents-collapsed", "true");
    await page.reload();
    await expect(contentsPanel).not.toHaveAttribute("open", "");
    await expect(outlinePanel).toHaveAttribute("open", "");

    await page.setViewportSize({ width: 1100, height: 844 });
    await expect(contentsPanel).toHaveAttribute("open", "");
    await expect(outlinePanel).toHaveAttribute("open", "");
  });
});

async function elementWidth(locator: import("@playwright/test").Locator) {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error("Expected a visible element with a bounding box");
  }
  return box.width;
}
