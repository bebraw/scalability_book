import { expect, test } from "@playwright/test";

test.describe("final reflection package demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chapters/recap/#final-reflection-package-builder");
    await expect(page.locator("[data-reflection-package-demo]")).toBeVisible();
  });

  test("assembles an evidence-based reflection outline", async ({ page }) => {
    const demo = page.locator("[data-reflection-package-demo]");

    await expect(
      demo.locator("[data-reflection-package-verdict]"),
    ).toContainText("5 of 7 evidence pieces ready");
    await expect(
      demo.locator("[data-reflection-package-missing]"),
    ).toContainText("Human-agent workflow trace");
    await expect(demo.locator("[data-reflection-package-outline]")).toHaveValue(
      /Artifact to attach or cite:\nScaling planner trade-off table/,
    );
    await expect(demo.locator("[data-reflection-package-outline]")).toHaveValue(
      /Write this paragraph:/,
    );

    await demo
      .locator("[data-reflection-package-evidence][value='workflow']")
      .setChecked(true);
    await demo
      .locator("[data-reflection-package-evidence][value='risk']")
      .setChecked(true);

    await expect(
      demo.locator("[data-reflection-package-verdict]"),
    ).toContainText("7 of 7 evidence pieces ready");
    await expect(
      demo.locator("[data-reflection-package-missing]"),
    ).toContainText("All core evidence categories");
    await expect(demo.locator("[data-reflection-package-outline]")).toHaveValue(
      /Prompt, agent output, review note, or correction loop/,
    );
    await expect(demo.locator("[data-reflection-package-outline]")).toHaveValue(
      /No core evidence gaps/,
    );
  });
});
