import { expect, test } from "@playwright/test";

test.describe("request trace demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chapters/architecture/#request-boundary-lab");
    await expect(page.locator("[data-request-trace-demo]")).toBeVisible();
  });

  test("traces one event request across architectural boundaries", async ({
    page,
  }) => {
    const demo = page.locator("[data-request-trace-demo]");

    await expect(
      demo.locator("[data-request-trace-demo-verdict]"),
    ).toContainText("5 steps");
    await expect(demo.locator(".request-trace-scene")).toContainText(
      "Student taps",
    );
    await expect(demo.locator(".request-trace-wire")).toContainText(
      "POST /events",
    );

    await demo
      .locator("[data-request-trace-demo-condition][value='duplicate']")
      .setChecked(true);
    await demo
      .locator("[data-request-trace-demo-condition][value='db-timeout']")
      .setChecked(true);
    await demo
      .locator("[data-request-trace-demo-condition][value='queue']")
      .setChecked(true);

    await expect(demo.locator("[data-request-trace-demo-path]")).toContainText(
      "Browser",
    );
    await expect(demo.locator("[data-request-trace-demo-flow]")).toContainText(
      "Queue",
    );
    await demo.locator("[data-request-trace-demo-boundary-button='3']").click();
    await expect(demo.locator("[data-request-trace-demo-path]")).toContainText(
      "Storage must distinguish",
    );
    await expect(
      demo.locator("[data-request-trace-demo-metric='risk']"),
    ).toContainText("high");
    await expect(
      demo.locator("[data-request-trace-demo-interpretation]"),
    ).toContainText("database timeout");

    await expect(
      demo.locator("[data-request-trace-demo-artifact]"),
    ).toHaveValue(/Architecture boundary brief/);
    await expect(
      demo.locator("[data-request-trace-demo-artifact]"),
    ).toHaveValue(/POST \/events/);
    await expect(
      demo.locator("[data-request-trace-demo-artifact]"),
    ).toHaveValue(/Each boundary needs an owner/);
  });
});
