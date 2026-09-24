import { expect, test } from "@playwright/test";

test.describe("final reflection package demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chapters/recap/#final-reflection-package-builder");
    await expect(page.locator("[data-reflection-package-demo]")).toBeVisible();
  });

  test("assembles the four Compare bundles without treating selection as verification", async ({
    page,
  }) => {
    const demo = page.locator("[data-reflection-package-demo]");

    await expect(
      demo.locator("[data-reflection-package-verdict]"),
    ).toContainText("2 of 4 bundles selected");
    await expect(
      demo.locator("[data-reflection-package-missing]"),
    ).toContainText("Fleet evidence");
    await expect(demo.locator("[data-reflection-package-outline]")).toHaveValue(
      /Application model, before-and-after scaling response, and deployed workload evidence/,
    );
    await expect(demo.locator("[data-reflection-package-outline]")).toHaveValue(
      /new failure or recovery check/,
    );

    await demo
      .locator("[data-reflection-package-evidence][value='fleet']")
      .setChecked(true);
    await demo
      .locator("[data-reflection-package-evidence][value='decision']")
      .setChecked(true);

    await expect(
      demo.locator("[data-reflection-package-verdict]"),
    ).toContainText("4 of 4 bundles selected");
    await expect(
      demo.locator("[data-reflection-package-missing]"),
    ).toContainText("selection does not establish completeness");
    await expect(demo.locator("[data-reflection-package-outline]")).toHaveValue(
      /workflow-level formal-model analysis/,
    );
    await expect(demo.locator("[data-reflection-package-outline]")).toHaveValue(
      /check the linked evidence against the specification/,
    );

    await demo
      .locator("[data-reflection-package-evidence][value='experiment']")
      .setChecked(false);
    await expect(
      demo.locator("[data-reflection-package-missing]"),
    ).toContainText("realistic deployed-workload evidence");
    await expect(
      demo.locator("[data-reflection-package-outline]"),
    ).not.toHaveValue(/## 3\. Scaling and deployment experiment/);
  });
});
