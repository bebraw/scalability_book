import { expect, test } from "@playwright/test";

test.describe("client activation lens", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chapters/architecture/#client-activation-lens");
    await expect(page.locator("[data-activation-lens]")).toBeVisible();
  });

  test("separates hydration, islands, and resumability", async ({ page }) => {
    const demo = page.locator("[data-activation-lens]");

    await expect(demo).toHaveAttribute("data-activation-mode", "hydration");
    await expect(
      demo.locator('[data-activation-lens-metric="initial-js"]'),
    ).toHaveText("≈54 KB");
    await expect(demo.locator(".activation-region.is-active")).toHaveCount(5);
    await expect(demo.locator("[data-activation-step]")).toHaveCount(4);

    await demo.locator('label:has([value="islands"])').click();
    await expect(demo).toHaveAttribute("data-activation-mode", "islands");
    await expect(
      demo.locator("[data-activation-lens-boundary-badge]"),
    ).toHaveText("record-form region");
    await expect(
      demo.locator('[data-activation-lens-metric="initial-js"]'),
    ).toHaveText("≈5 KB runtime");
    await expect(
      demo.locator('[data-activation-lens-metric="action-js"]'),
    ).toHaveText("≈14 KB island");
    await expect(demo.locator(".activation-region.is-static")).toHaveCount(2);
    await expect(demo.locator(".activation-region.is-deferred")).toHaveCount(3);

    await demo.locator('label:has([value="resumability"])').click();
    await expect(demo).toHaveAttribute("data-activation-mode", "resumability");
    await expect(
      demo.locator("[data-activation-lens-boundary-badge]"),
    ).toHaveText("event handler");
    await expect(
      demo.locator('[data-activation-lens-metric="action-js"]'),
    ).toHaveText("≈2.4 KB handler");
    await expect(demo.locator(".activation-region.is-reference")).toHaveCount(
      3,
    );
    await expect(demo.locator("[data-activation-lens-title]")).toContainText(
      "Continue",
    );
  });

  test("traces region hydration for the first island interaction", async ({
    page,
  }) => {
    const demo = page.locator("[data-activation-lens]");
    await demo.locator('label:has([value="islands"])').click();
    await demo.locator("[data-activation-lens-run]").click();

    await expect(
      demo.locator("[data-activation-step].is-complete"),
    ).toHaveCount(4, { timeout: 5_000 });
    await expect(demo).toHaveAttribute("data-activation-phase", "complete");
    await expect(demo.locator("[data-activation-target]")).toHaveClass(
      /is-invoked/,
    );
    await expect(
      demo.locator("[data-activation-target] [data-activation-region-state]"),
    ).toHaveText("island active");
    await expect(demo.locator(".activation-lens-browser-status")).toContainText(
      "loaded, hydrated",
    );
  });

  test("resumes a handler without replaying the component tree", async ({
    page,
  }) => {
    const demo = page.locator("[data-activation-lens]");
    await demo.locator('label:has([value="resumability"])').click();
    await demo.locator("[data-activation-lens-run]").click();

    await expect(
      demo.locator("[data-activation-step].is-complete"),
    ).toHaveCount(3, { timeout: 5_000 });
    await expect(demo.locator(".activation-lens-browser-status")).toContainText(
      "without replay",
    );
    await expect(
      demo.locator("[data-activation-lens-trace]"),
    ).not.toContainText("component tree");
  });

  test("inherits its palette from every book theme", async ({ page }) => {
    const badge = page.locator("[data-activation-lens-mode-badge]");
    const picker = page.locator("[data-theme-picker]");
    const colors = new Set<string>();

    for (const theme of ["light", "dark", "sepia", "contrast", "calm"]) {
      await picker.selectOption(theme);
      colors.add(
        await badge.evaluate((element) => getComputedStyle(element).color),
      );
    }

    expect(colors.size).toBe(5);
  });

  test("links citations to the automatically generated references", async ({
    page,
  }) => {
    await expect(
      page.locator('[data-citation="vepsalainen2024resumability"]'),
    ).toHaveAttribute("href", "#reference-vepsalainen2024resumability");
    await expect(
      page.locator('[data-citation="vepsalainen2025islands"]'),
    ).toHaveAttribute("href", "#reference-vepsalainen2025islands");
    await expect(
      page.locator("#reference-vepsalainen2024resumability"),
    ).toBeVisible();
    await expect(
      page.locator("#reference-vepsalainen2025islands"),
    ).toBeVisible();
  });

  test("stays within a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const demo = page.locator("[data-activation-lens]");
    const bounds = await demo.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const contentRight = Math.max(
        ...[element, ...element.querySelectorAll<HTMLElement>("*")].map(
          (child) => child.getBoundingClientRect().right,
        ),
      );
      return { left: rect.left, right: rect.right, contentRight };
    });
    expect(bounds.left).toBeGreaterThanOrEqual(-1);
    expect(bounds.right).toBeLessThanOrEqual(391);
    expect(bounds.contentRight).toBeLessThanOrEqual(391);
    await expect(page.locator(".activation-lens-stage")).toHaveCSS(
      "grid-template-columns",
      /.+/,
    );
  });
});
