import { expect, test, type Page } from "@playwright/test";

test.describe("cross-document view transitions", () => {
  test.beforeEach(async ({ page }) => {
    await observePageReveal(page);
  });

  test("animates same-origin book navigation and keeps the brand anchored", async ({
    page,
  }) => {
    await page.goto("/chapters/introduction/");

    await expect(page.locator(".brand")).toHaveCSS(
      "view-transition-name",
      "site-brand",
    );

    await page.locator(".chapter-pagination a").last().click();

    await expect(page.locator("html")).toHaveAttribute(
      "data-page-reveal-transition",
      "active",
    );
  });

  test("does not animate navigation when reduced motion is requested", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/chapters/introduction/");
    await page.locator(".chapter-pagination a").last().click();

    await expect(page.locator("html")).toHaveAttribute(
      "data-page-reveal-transition",
      "none",
    );
  });
});

async function observePageReveal(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.addEventListener("pagereveal", (event) => {
      const transition = (event as Event & { viewTransition?: ViewTransition })
        .viewTransition;
      document.documentElement.dataset.pageRevealTransition = transition
        ? "active"
        : "none";
    });
  });
}
