import { expect, test } from "@playwright/test";

test.describe("workflow loop demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chapters/friction/#workflow-loop-lab");
    await expect(page.locator("[data-workflow-demo]")).toBeVisible();
  });

  test("shows human-in-the-loop workflow pressure", async ({ page }) => {
    const demo = page.locator("[data-workflow-demo]");

    await expect(demo.locator("[data-workflow-demo-verdict]")).toContainText(
      "3 loops",
    );
    await expect(demo.locator("[data-workflow-demo-loop]")).toContainText(
      "Human",
    );
    await demo
      .locator("[data-workflow-demo-mode]")
      .selectOption("agent-harnessed");
    await expect(demo.locator("[data-workflow-demo-mode-title]")).toContainText(
      "Agent works with clear harness",
    );
    await expect(demo.locator("[data-workflow-demo-loop]")).toContainText(
      "Harness",
    );

    await demo.locator("[data-workflow-demo-next]").click();
    await expect(demo.locator("[data-workflow-demo-step='1']")).toBeVisible();
    await expect(demo.locator("[data-workflow-demo-evidence]")).toContainText(
      "Can run project locally",
    );
    await demo.locator("[data-workflow-demo-signal='setup']").fill("5");
    await demo.locator("[data-workflow-demo-signal='context']").fill("5");
    await demo.locator("[data-workflow-demo-signal='tests']").fill("5");
    await expect(demo.locator("[data-workflow-demo-evidence]")).toContainText(
      "Ready signal",
    );
    await expect(
      demo.locator("[data-workflow-demo-metric='leverage']"),
    ).toContainText("High");
    await expect(
      demo.locator("[data-workflow-demo-interpretation]"),
    ).toContainText("review intent");

    await demo.locator("[data-workflow-demo-next]").click();
    await expect(demo.locator("[data-workflow-demo-step='2']")).toBeVisible();
    await expect(demo.locator("[data-workflow-demo-artifact]")).toHaveValue(
      /Concrete feedback improvements/,
    );
    await expect(demo.locator("[data-workflow-demo-next]")).toBeDisabled();
  });
});
