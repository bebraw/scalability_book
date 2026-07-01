import { expect, test } from "@playwright/test";

test.describe("friction audit demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chapters/friction/#friction-audit-lab");
    await expect(page.locator("[data-friction-demo]")).toBeVisible();
  });

  test("turns friction scores into an improvement artifact", async ({
    page,
  }) => {
    const demo = page.locator("[data-friction-demo]");

    await expect(demo.locator("[data-friction-demo-verdict]")).toContainText(
      "37 min",
    );
    await expect(demo.locator(".friction-demo-grid")).toBeVisible();
    await expect(demo.locator("[data-friction-demo-process]")).toContainText(
      "Find where event fields are defined",
    );
    await expect(demo.locator("[data-friction-demo-process]")).toContainText(
      "Testing friction",
    );
    await expect(demo.locator("[data-friction-demo-files]")).toContainText(
      "API validation",
    );
    await demo
      .locator("[data-friction-demo-assistance]")
      .selectOption("weak-agent");
    await expect(demo.locator("[data-friction-demo-verdict]")).toContainText(
      "37 min",
    );
    await expect(
      demo.locator("[data-friction-demo-metric='agentRisk']"),
    ).toContainText("High");
    await demo.locator("[data-friction-demo-assistance]").selectOption("human");
    await expect(demo.locator("[data-friction-demo-verdict]")).toContainText(
      "37 min",
    );

    await expect(
      demo.locator("[data-friction-demo-metric='largest']"),
    ).toContainText("Change");
    await expect(
      demo.locator("[data-friction-demo-metric='after']").first(),
    ).toContainText("34 min");
    await expect(
      demo.locator("[data-friction-demo-metric='saved']").first(),
    ).toContainText("3 min");
    await demo.locator("[data-friction-demo-score='testing']").fill("5");
    await expect(
      demo.locator("[data-friction-demo-metric='before']").first(),
    ).toContainText("41 min");

    await demo
      .locator("[data-friction-demo-improvement]")
      .selectOption("focused-tests");
    await expect(
      demo.locator("[data-friction-demo-improvement-copy]"),
    ).toContainText("risky path");
    await expect(
      demo.locator("[data-friction-demo-metric='saved']").first(),
    ).toContainText("5 min");
    await expect(
      demo.locator("[data-friction-demo-interpretation]"),
    ).toContainText("likely to loop");

    await expect(demo.locator("[data-friction-demo-artifact]")).toHaveValue(
      /Chosen improvement: Focused tests/,
    );
    await expect(demo.locator("[data-friction-demo-artifact]")).toHaveValue(
      /Assistance mode: Human only/,
    );
  });
});
