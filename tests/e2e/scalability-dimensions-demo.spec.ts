import { expect, test } from "@playwright/test";

test.describe("scalability dimensions demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/chapters/what-is-scalability/#scalability-dimensions-lab",
    );
    await expect(page.locator("[data-dimensions-demo]")).toBeVisible();
  });

  test("turns project pressures into a live dimension radar", async ({
    page,
  }) => {
    const demo = page.locator("[data-dimensions-demo]");

    await expect(demo.locator("[data-dimensions-demo-verdict]")).toContainText(
      "2 pressures",
    );
    await expect(demo.locator(".dimensions-demo-scenario")).toContainText(
      "event-oriented app",
    );
    await expect(demo.locator("[data-dimensions-demo-radar]")).toContainText(
      "Score out of 6",
    );

    await demo
      .locator("[data-dimensions-demo-pressure][value='traffic']")
      .setChecked(false);
    await demo
      .locator("[data-dimensions-demo-pressure][value='history']")
      .setChecked(false);
    await demo
      .locator("[data-dimensions-demo-pressure][value='contributors']")
      .setChecked(true);
    await demo
      .locator("[data-dimensions-demo-pressure][value='requirements']")
      .setChecked(true);

    await expect(demo.locator("[data-dimensions-demo-radar]")).toContainText(
      "Change",
    );
    await expect(
      demo.locator("[data-dimensions-demo-metric='primary']"),
    ).toContainText("Change");
    await expect(
      demo.locator("[data-dimensions-demo-interpretation]"),
    ).toContainText("Fast iteration");
    await expect(demo.locator("[data-dimensions-demo-verdict]")).toContainText(
      "2 pressures point to Change",
    );
    await expect(
      demo.locator("[data-dimensions-demo-radar] svg"),
    ).toBeVisible();
    await expect(demo.locator("[data-dimensions-demo-tab]")).toHaveCount(0);
    await expect(demo.locator("[data-dimensions-demo-artifact]")).toHaveCount(
      0,
    );
  });
});
