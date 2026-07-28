import { expect, test } from "@playwright/test";

test.describe("browser performance workbench", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demos/#demo-browser-performance-workbench");
    await expect(
      page.locator("[data-browser-performance-workbench]"),
    ).toBeVisible();
  });

  test("measures five local runs and exposes their distribution", async ({
    page,
  }) => {
    const demo = page.locator("[data-browser-performance-workbench]");

    await demo
      .locator('[data-browser-performance-input="events"]')
      .selectOption("250");
    await demo.locator("[data-browser-performance-run]").click();

    await expect(demo.locator(".browser-performance-run")).toHaveCount(5, {
      timeout: 15_000,
    });
    await expect(
      demo.locator('[data-browser-performance-metric="median"]'),
    ).toContainText("ms");
    await expect(
      demo.locator("[data-browser-performance-reading]"),
    ).toContainText("250 events produced");
    await expect(
      demo.locator("[data-browser-performance-status]"),
    ).toContainText("Five runs complete");
  });

  test("explains the responsiveness trade-off for chunked work", async ({
    page,
  }) => {
    const demo = page.locator("[data-browser-performance-workbench]");

    await demo
      .locator('input[name="browser-performance-strategy"][value="chunked"]')
      .check();
    await demo
      .locator('[data-browser-performance-input="events"]')
      .selectOption("250");
    await demo.locator("[data-browser-performance-run]").click();

    await expect(
      demo.locator("[data-browser-performance-reading]"),
    ).toContainText("Yielding can reduce uninterrupted work", {
      timeout: 15_000,
    });
  });

  test("resolves its accents from every book theme", async ({ page }) => {
    const demo = page.locator("[data-browser-performance-workbench]");
    const themes = ["light", "dark", "sepia", "contrast", "calm"];

    for (const theme of themes) {
      await page.locator("[data-theme-picker]").selectOption(theme);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

      const colorsMatchTokens = await demo.evaluate((element) => {
        const resolveColor = (token: string) => {
          const probe = document.createElement("span");
          probe.style.color = `var(${token})`;
          element.append(probe);
          const color = getComputedStyle(probe).color;
          probe.remove();
          return color;
        };
        const button = element.querySelector<HTMLElement>(
          "[data-browser-performance-run]",
        );
        const status = element.querySelector<HTMLElement>(
          "[data-browser-performance-status]",
        );

        return {
          button:
            getComputedStyle(button!).backgroundColor ===
            resolveColor("--accent"),
          status:
            getComputedStyle(status!).color ===
            resolveColor("--accent-strong"),
        };
      });

      expect(colorsMatchTokens).toEqual({ button: true, status: true });
    }
  });
});
