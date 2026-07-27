import { expect, test } from "@playwright/test";

test.describe("observability signal demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demos/#demo-observability-signal-picker");
    await expect(page.locator("[data-observability-demo]")).toBeVisible();
  });

  test("classifies selected evidence signals for a symptom", async ({
    page,
  }) => {
    const demo = page.locator("[data-observability-demo]");

    await expect(
      demo.locator("[data-observability-demo-verdict]"),
    ).toContainText("1 answer, 0 noisy");
    await expect(
      demo.locator("[data-observability-demo-results]"),
    ).toContainText("Metrics over time");
    await expect(
      demo.locator("[data-observability-demo-results]"),
    ).toContainText("Request traces");

    await demo
      .locator("[data-observability-demo-signal][value='errors']")
      .setChecked(true);

    await expect(
      demo.locator("[data-observability-demo-verdict]"),
    ).toContainText("1 answer, 1 noisy");
    await expect(
      demo.locator(".observability-demo-result.is-noisy"),
    ).toContainText("User-visible errors");
  });

  test("changes recommended signals with the symptom", async ({ page }) => {
    const demo = page.locator("[data-observability-demo]");

    await demo
      .locator("[data-observability-demo-symptom]")
      .selectOption("missing");

    await expect(
      demo.locator("[data-observability-demo-question]"),
    ).toContainText("never accepted");
    await expect(
      demo.locator("[data-observability-demo-results]"),
    ).toContainText("Metrics over time");
    await expect(
      demo.locator("[data-observability-demo-results]"),
    ).toContainText("Request traces");
  });
});
