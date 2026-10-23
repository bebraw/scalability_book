import { expect, test } from "@playwright/test";

test.describe("cache control lab", () => {
  test("regression: a still-fresh browser entry does not take the shared path", async ({
    page,
  }) => {
    const demo = page.locator("[data-cache-control-lab]");
    await demo
      .locator('label:has([data-cache-profile][value="summary"])')
      .click();
    await demo.locator("[data-cache-age]").fill("0");
    await expect(demo.locator('[data-cache-fact="source"]')).toHaveText(
      "browser cache",
    );
    await expect(demo.locator("[data-cache-steps]")).not.toContainText(
      "forwards",
    );
    await demo.locator("[data-cache-age]").fill("12"); // 29 seconds
    await expect(demo.locator('[data-cache-fact="source"]')).toHaveText(
      "browser cache",
    );
    await demo.locator("[data-cache-age]").fill("13"); // 31 seconds
    await expect(demo.locator("[data-cache-outcome]")).toHaveText(
      "Fresh shared hit",
    );
    await demo.locator("[data-cache-age]").fill("50"); // exactly the shared 120-second lifetime
    await expect(demo.locator("[data-cache-outcome]")).toHaveText(
      "Serve stale, revalidate",
    );
  });
  test.beforeEach(async ({ page }) => {
    await page.goto("/chapters/architecture/#cache-decision-lab");
    await expect(page.locator("[data-cache-control-lab]")).toBeVisible();
  });

  test("distinguishes fresh private and shared cache reuse", async ({
    page,
  }) => {
    const demo = page.locator("[data-cache-control-lab]");
    await expect(demo).toHaveAttribute("data-cache-profile", "asset");
    await expect(demo.locator("[data-cache-outcome]")).toHaveText(
      "Fresh cache hit",
    );
    await expect(demo.locator('[data-cache-fact="source"]')).toHaveText(
      "browser cache",
    );
    await expect(demo.locator('[data-cache-fact="bytes"]')).toHaveText("0 KB");

    await demo.locator("[data-cache-age]").fill("100");
    await expect(demo.locator("[data-cache-outcome]")).toHaveText(
      "Origin fetch after expiry",
    );
    await expect(demo.locator("[data-cache-decision-code]")).toHaveText(
      "origin request → 200",
    );

    await demo.locator('label:has([value="summary"])').click();
    await expect(demo.locator("[data-cache-outcome]")).toHaveText(
      "Fresh shared hit",
    );
    await expect(demo.locator("[data-cache-shared-state]")).toHaveText(
      "fresh by s-maxage",
    );
    await expect(demo.locator("[data-cache-headers]")).toContainText(
      "stale-while-revalidate=60",
    );
  });

  test("serves bounded stale content while validating in the background", async ({
    page,
  }) => {
    const demo = page.locator("[data-cache-control-lab]");
    await demo.locator('label:has([value="summary"])').click();
    await demo.locator("[data-cache-age]").fill("63");

    await expect(demo.locator("[data-cache-outcome]")).toHaveText(
      "Serve stale, revalidate",
    );
    await expect(demo.locator('[data-cache-fact="wait"]')).toContainText(
      "background",
    );
    await expect(demo.locator("[data-cache-origin-state]")).toHaveText(
      "background 304",
    );

    await demo.locator("[data-cache-origin-change]").check();
    await expect(demo.locator("[data-cache-origin-state]")).toContainText(
      "background 200",
    );
    await expect(demo.locator('[data-cache-fact="bytes"]')).toHaveText("24 KB");
  });

  test("uses validators after freshness and explains no-cache", async ({
    page,
  }) => {
    const demo = page.locator("[data-cache-control-lab]");
    await demo.locator('label:has([value="summary"])').click();
    await demo.locator("[data-cache-age]").fill("90");
    await expect(demo.locator("[data-cache-outcome]")).toHaveText(
      "Revalidated with 304",
    );
    await expect(demo.locator('[data-cache-fact="bytes"]')).toHaveText("0 KB");

    await demo.locator('label:has([value="private"])').click();
    await expect(demo.locator("[data-cache-headers]")).toContainText(
      "private, no-cache",
    );
    await expect(demo.locator("[data-cache-rule-title]")).toHaveText(
      "no-cache does not mean no storage",
    );
    await expect(demo.locator("[data-cache-shared-state]")).toContainText(
      "bypassed",
    );
  });

  test("prevents normal reuse for no-store responses", async ({ page }) => {
    const demo = page.locator("[data-cache-control-lab]");
    await demo.locator('label:has([value="sensitive"])').click();
    await expect(demo.locator("[data-cache-outcome]")).toHaveText(
      "Origin fetch",
    );
    await expect(demo.locator("[data-cache-headers]")).toContainText(
      "Cache-Control: no-store",
    );
    await expect(demo.locator('[data-cache-fact="source"]')).toHaveText(
      "origin",
    );
    await expect(demo.locator('[data-cache-fact="bytes"]')).toHaveText("9 KB");
  });

  test("traces the cache decision path", async ({ page }) => {
    const demo = page.locator("[data-cache-control-lab]");
    await demo.locator('label:has([value="sensitive"])').click();
    await demo.locator("[data-cache-run]").click();
    await expect(demo.locator("[data-cache-step].is-complete")).toHaveCount(3, {
      timeout: 5_000,
    });
    await expect(demo).toHaveAttribute("data-cache-phase", "complete");
    await expect(demo.locator('[data-cache-node="origin"]')).toHaveClass(
      /is-complete/,
    );
  });

  test("inherits the active theme and stays within a narrow viewport", async ({
    page,
  }) => {
    const badge = page.locator("span[data-cache-outcome]");
    const lightColor = await badge.evaluate(
      (element) => getComputedStyle(element).color,
    );
    await page.locator("[data-theme-picker]").selectOption("dark");
    const darkColor = await badge.evaluate(
      (element) => getComputedStyle(element).color,
    );
    expect(darkColor).not.toBe(lightColor);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    const demo = page.locator("[data-cache-control-lab]");
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
  });
});
