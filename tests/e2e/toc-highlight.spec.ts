import { expect, test } from "@playwright/test";

test.describe("local table of contents highlight", () => {
  test("tracks the current section while scrolling", async ({ page }) => {
    await page.goto("/chapters/what-is-scalability/");

    const toc = page.locator(".local-toc");
    await page.locator("[data-book-navigation-tab='page']").click();
    await expect(toc).toBeVisible();

    await page
      .locator('[id="summary"]')
      .evaluate((heading) => heading.scrollIntoView({ block: "start" }));

    const activeLink = toc.locator('a[aria-current="location"]');

    await expect(activeLink).toContainText("Summary");
    await expect(activeLink).toHaveAttribute("href", "#summary");
  });
});
