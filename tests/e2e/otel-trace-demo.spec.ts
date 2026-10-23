import { expect, test } from "@playwright/test";

test.describe("OpenTelemetry trace orientation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demos/#demo-opentelemetry-trace-explorer");
  });
  test("requires child evidence before revealing the authored reading and resets it for a new case", async ({
    page,
  }) => {
    const demo = page.locator("[data-otel-trace-demo]");
    const reveal = demo.locator("[data-otel-demo-reveal]");
    const verdict = demo.locator("[data-otel-demo-verdict]");
    await expect(reveal).toBeDisabled();
    await expect(verdict).not.toContainText("Slow storage path found");
    await expect(demo.locator("[data-otel-demo-span-name]")).toHaveText(
      "POST /events",
    );
    await demo.getByRole("button", { name: /acquire connection/ }).click();
    await expect(reveal).toBeEnabled();
    await expect(verdict).not.toContainText("Slow storage path found");
    await demo.getByText("Inspect conceptual span record").click();
    await expect(demo.locator("[data-otel-demo-span-record]")).toContainText(
      '"db.pool.wait_ms": "67"',
    );
    await reveal.click();
    await expect(verdict).toHaveText("Slow storage path found");
    await demo.locator("[data-otel-demo-scenario]").selectOption("retry");
    await expect(reveal).toBeDisabled();
    await expect(verdict).not.toContainText("Retry hides");
    await demo.getByRole("button", { name: /attempt 1/ }).click();
    await expect(demo.locator("[data-otel-demo-span-status]")).toHaveText(
      "Error",
    );
    await reveal.click();
    await expect(verdict).toHaveText("Retry hides a transient failure");
    await demo.getByRole("button", { name: /attempt 2/ }).click();
    await expect(demo.locator("[data-otel-demo-span-status]")).toHaveText("OK");
  });
});
