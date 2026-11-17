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

for (const path of ["/chapters/benchmarking/", "/demos/"]) {
  for (const width of [1440, 390]) {
    test(`reveals an accessible nearby case reading on ${path} at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${path}#demo-opentelemetry-trace-explorer`);
      const demo = page.locator("[data-otel-trace-demo]");
      const toggle = demo.locator("[data-otel-demo-reveal]");
      const reading = demo.getByRole("region", {
        name: "Authored case reading",
        exact: true,
      });
      await expect(toggle).toBeDisabled();
      await expect(reading).toBeHidden();

      await demo.getByRole("button", { name: /acquire connection/ }).click();
      await expect(toggle).toBeEnabled();
      await toggle.focus();
      await page.keyboard.press("Enter");

      // A changed verdict elsewhere in the demo does not expose the reading.
      await expect(reading).toBeVisible();
      await expect(reading).toBeFocused();
      await expect(reading).toBeInViewport({ ratio: 1 });
      await expect(reading).toContainText("Slow storage path found");
      await expect(reading).toContainText(
        "This request waited for a connection, which suggests pressure on the storage pool.",
      );
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(toggle).toHaveAccessibleName("Hide authored case reading");
      const readingId = await reading.getAttribute("id");
      expect(readingId).toBeTruthy();
      await expect(toggle).toHaveAttribute("aria-controls", readingId!);

      await page.keyboard.press("Shift+Tab");
      await expect(toggle).toBeFocused();
      await page.keyboard.press("Space");
      await expect(reading).toBeHidden();
      await expect(toggle).toBeFocused();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(toggle).toHaveAccessibleName("Reveal authored case reading");
      await expect(toggle).toBeEnabled();

      await page.keyboard.press("Enter");
      await expect(reading).toBeVisible();
      await expect(reading).toBeFocused();
      await demo.getByRole("button", { name: /store event/ }).click();
      await expect(reading).toContainText(
        "This child span accounts for most of the server request duration. The trace narrows the investigation; it does not prove the underlying cause.",
      );
      await expect(reading).not.toContainText("waited for a connection");

      await demo.locator("[data-otel-demo-scenario]").selectOption("retry");
      await expect(reading).toBeHidden();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(toggle).toHaveAccessibleName("Reveal authored case reading");
      await expect(toggle).toBeDisabled();
      await demo.getByRole("button", { name: /attempt 1/ }).click();
      await expect(toggle).toBeEnabled();
      await toggle.focus();
      await page.keyboard.press("Enter");
      await expect(reading).toBeVisible();
      await expect(reading).toBeFocused();
      await expect(reading).toBeInViewport({ ratio: 1 });
      await expect(reading).toContainText("Retry hides a transient failure");
      await expect(reading).toContainText(
        "The request eventually succeeds, but this span preserves the failed first attempt.",
      );
      await expect(reading).not.toContainText("Slow storage path found");
    });
  }
}
