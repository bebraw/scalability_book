import { expect, test } from "@playwright/test";

test.describe("OpenTelemetry trace demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demos/#demo-opentelemetry-trace-explorer");
    await expect(page.locator("[data-otel-trace-demo]")).toBeVisible();
  });

  test("connects a slow request to its longest child span", async ({
    page,
  }) => {
    const demo = page.locator("[data-otel-trace-demo]");

    await expect(demo.locator("[data-otel-demo-verdict]")).toHaveText(
      "Slow storage path found",
    );
    await expect(demo.locator("[data-otel-demo-span]")).toHaveCount(5);
    await expect(demo.locator("[data-otel-demo-span-name]")).toHaveText(
      "store event",
    );
    await expect(demo.locator("[data-otel-demo-span-duration]")).toHaveText(
      "184 ms",
    );
    await expect(demo.locator("[data-otel-demo-attributes]")).toContainText(
      "db.system.name",
    );
    await demo.getByRole("button", { name: /acquire connection/ }).click();
    await demo.getByText("Inspect conceptual span record").click();
    await expect(demo.locator("[data-otel-demo-span-record]")).toContainText(
      '"parentSpanId"',
    );
    await expect(demo.locator("[data-otel-demo-span-record]")).toContainText(
      '"db.pool.wait_ms": "67"',
    );
  });

  test("shows failed work even when the request eventually succeeds", async ({
    page,
  }) => {
    const demo = page.locator("[data-otel-trace-demo]");

    await demo.locator("[data-otel-demo-scenario]").selectOption("retry");
    await expect(demo.locator("[data-otel-demo-verdict]")).toHaveText(
      "Retry hides a transient failure",
    );
    await expect(demo.locator("[data-otel-demo-span-name]")).toContainText(
      "attempt 1",
    );
    await expect(demo.locator("[data-otel-demo-span-status]")).toHaveText(
      "Error",
    );

    await demo.getByRole("button", { name: /attempt 2/ }).click();
    await expect(demo.locator("[data-otel-demo-span-status]")).toHaveText("OK");
  });
});
