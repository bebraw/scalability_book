import { expect, test } from "@playwright/test";

test.describe("book reading layout", () => {
  test("switches navigation views and expands demos when folded", async ({
    page,
  }) => {
    await page.goto("/chapters/scaling/#scaling-pressure-lab");

    const shell = page.locator(".book-shell");
    const main = page.locator(".chapter-main");
    const demo = page.locator("[data-scaling-demo]");
    const bodyParagraph = page
      .locator(".prose > p:not(.chapter-kicker)")
      .first();
    const navigation = page.locator("#book-navigation");
    const navigationPanel = navigation.locator("details");
    const navigationToggle = navigation.locator("summary");
    const tabs = navigation.locator("[role='tablist']");
    const bookTab = navigation.locator("[data-book-navigation-tab='book']");
    const pageTab = navigation.locator("[data-book-navigation-tab='page']");
    const bookView = navigation.locator("[data-book-navigation-panel='book']");
    const pageView = navigation.locator("[data-book-navigation-panel='page']");

    await expect(navigation).toBeVisible();
    await expect(navigationPanel).toHaveAttribute("open", "");
    await expect(bookTab).toHaveAttribute("aria-selected", "true");
    await expect(bookView).toBeVisible();
    await expect(pageView).toBeHidden();
    const defaultMainWidth = await elementWidth(main);
    const defaultDemoWidth = await elementWidth(demo);

    await pageTab.click();
    await expect(pageTab).toHaveAttribute("aria-selected", "true");
    await expect(bookView).toBeHidden();
    await expect(pageView).toBeVisible();
    await expect(pageView.getByText("Scaling pressure lab")).toBeVisible();

    await page.reload();
    await expect(pageTab).toHaveAttribute("aria-selected", "true");
    await expect(pageView).toBeVisible();

    await navigationToggle.click();
    await expect(navigationPanel).not.toHaveAttribute("open", "");
    await expect(navigationToggle).toHaveAttribute(
      "aria-label",
      "Show navigation",
    );
    await expect(navigation.locator(".book-panel-icon")).toBeVisible();
    await expect
      .poll(() =>
        centerDelta(navigationToggle, navigation.locator(".book-panel-icon")),
      )
      .toBeLessThan(2);
    await expect
      .poll(() => horizontalCenterDelta(main, bodyParagraph))
      .toBeLessThan(2);
    await expect
      .poll(() => elementWidth(main))
      .toBeGreaterThan(defaultMainWidth + 180);
    await expect
      .poll(() => elementWidth(demo))
      .toBeGreaterThan(defaultDemoWidth + 180);

    await page.reload();
    await expect(navigationPanel).not.toHaveAttribute("open", "");

    await page.setViewportSize({ width: 1100, height: 844 });
    await expect(navigationPanel).toHaveAttribute("open", "");
    await expect(tabs).toBeHidden();
    await expect(bookView).toBeVisible();
    await expect(pageView).toBeVisible();
  });
});

async function elementWidth(locator: import("@playwright/test").Locator) {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error("Expected a visible element with a bounding box");
  }
  return box.width;
}

async function centerDelta(
  container: import("@playwright/test").Locator,
  child: import("@playwright/test").Locator,
) {
  const containerBox = await container.boundingBox();
  const childBox = await child.boundingBox();
  if (!containerBox || !childBox) {
    throw new Error("Expected visible elements with bounding boxes");
  }

  const horizontal = Math.abs(
    containerBox.x + containerBox.width / 2 - (childBox.x + childBox.width / 2),
  );
  const vertical = Math.abs(
    containerBox.y +
      containerBox.height / 2 -
      (childBox.y + childBox.height / 2),
  );

  return Math.max(horizontal, vertical);
}

async function horizontalCenterDelta(
  container: import("@playwright/test").Locator,
  child: import("@playwright/test").Locator,
) {
  const containerBox = await container.boundingBox();
  const childBox = await child.boundingBox();
  if (!containerBox || !childBox) {
    throw new Error("Expected visible elements with bounding boxes");
  }

  return Math.abs(
    containerBox.x + containerBox.width / 2 - (childBox.x + childBox.width / 2),
  );
}
