import { expect, test } from "@playwright/test";

test.describe("request trace demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chapters/architecture/#request-boundary-lab");
    await expect(page.locator("[data-request-trace-demo]")).toBeVisible();
  });

  test("traces one work-item transition across architectural boundaries", async ({
    page,
  }) => {
    const demo = page.locator("[data-request-trace-demo]");

    await expect(
      demo.locator("[data-request-trace-demo-verdict]"),
    ).toContainText("5 steps");
    await expect(demo.locator(".request-trace-scene")).toContainText("You tap");
    await expect(demo.locator(".request-trace-wire")).toContainText(
      "POST /work-items/item-42/transitions",
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
    await expect(demo.locator("[data-request-trace-demo-path]")).toContainText(
      "state, matching activity event, and reusable command result together",
    );
    await expect(
      demo.locator("[data-request-trace-demo-metric='risk']"),
    ).toHaveCount(0);
    await expect(
      demo.locator("[data-request-trace-demo-interpretation]"),
    ).toContainText("database timeout");

    await expect(
      demo.locator("[data-request-trace-demo-artifact]"),
    ).toHaveValue(/Architecture boundary brief/);
    await expect(
      demo.locator("[data-request-trace-demo-artifact]"),
    ).toHaveValue(/POST \/work-items\/item-42\/transitions/);
    await expect(
      demo.locator("[data-request-trace-demo-artifact]"),
    ).toHaveValue(/Defer only derived summary work/);
    await expect(
      demo.locator("[data-request-trace-demo-artifact]"),
    ).toHaveValue(/Each boundary needs an owner/);
    await expect(
      demo.locator("[data-request-trace-demo-artifact]"),
    ).not.toHaveValue(/Highest risk/);
    await expect(
      demo.locator("[data-request-trace-demo-artifact]"),
    ).toHaveValue(/Evidence to collect/);
  });
});
