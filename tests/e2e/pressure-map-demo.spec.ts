import { expect, test } from "@playwright/test";

test.describe("pressure map demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chapters/reality/#pressure-map-lab");
    await expect(page.locator("[data-pressure-map-demo]")).toBeVisible();
  });

  test("maps changed assumptions to failures and a response brief", async ({
    page,
  }) => {
    const demo = page.locator("[data-pressure-map-demo]");

    await expect(
      demo.locator("[data-pressure-map-demo-verdict]"),
    ).toContainText("2 assumptions");
    await expect(demo.locator(".pressure-map-grid")).toBeVisible();
    await expect(demo.locator("[data-pressure-map-demo-board]")).toContainText(
      "Event ingestion API",
    );

    await demo
      .locator("[data-pressure-map-demo-assumption][value='tenants']")
      .setChecked(true);
    await demo
      .locator("[data-pressure-map-demo-assumption][value='slow-summary']")
      .setChecked(true);

    await expect(demo.locator("[data-pressure-map-demo-board]")).toContainText(
      "Event ingestion API",
    );
    await expect(demo.locator("[data-pressure-map-demo-board]")).toContainText(
      "Storage and query model",
    );
    await expect(demo.locator("[data-pressure-map-demo-board]")).toContainText(
      "Summary lag grows",
    );
    await expect(
      demo.locator("[data-pressure-map-demo-metric='count']"),
    ).toContainText("4");
    await expect(
      demo.locator("[data-pressure-map-demo-interpretation]"),
    ).toContainText("Watch first for");

    await expect(demo.locator("[data-pressure-map-demo-artifact]")).toHaveValue(
      /Challenge pressure brief/,
    );
    await expect(demo.locator("[data-pressure-map-demo-artifact]")).toHaveValue(
      /Partition by tenant boundary/,
    );
    await expect(demo.locator("[data-pressure-map-demo-artifact]")).toHaveValue(
      /Do not add scaling techniques/,
    );
    await expect(demo.locator("[data-pressure-map-demo-step]")).toHaveCount(0);
  });
});
