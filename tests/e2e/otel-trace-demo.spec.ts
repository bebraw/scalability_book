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

for (const path of ["/chapters/benchmarking/", "/demos/"]) {
  for (const width of [1440, 390, 320]) {
    test(`contains the complete scrollable span record on ${path} at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${path}#demo-opentelemetry-trace-explorer`);
      const demo = page.locator("[data-otel-trace-demo]");
      const inspector = demo.locator(".otel-demo-inspector");
      const summary = demo.getByText("Inspect conceptual span record");
      const record = demo.getByRole("region", {
        name: "Conceptual span record",
        exact: true,
      });
      await demo.getByRole("button", { name: /store event/ }).click();
      await summary.focus();
      await page.keyboard.press("Enter");
      await expect(record).toBeVisible();
      const literal = await record.textContent();
      expect(JSON.parse(literal!)).toEqual({
        resource: { "service.name": "event-api" },
        scope: "course.event-tracker",
        traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
        spanId: expect.stringMatching(/^[a-f0-9]{16}$/),
        parentSpanId: expect.stringMatching(/^[a-f0-9]{16}$/),
        name: "store event",
        startOffsetMs: 84,
        durationMs: 184,
        status: "Unset",
        attributes: {
          "db.system.name": "postgresql",
          "db.operation.name": "INSERT",
          "db.collection.name": "events",
          "app.storage.slow_path": "true",
        },
      });

      // The inspector must contain its record; clipping an oversized child
      // or widening the whole page would leave some literal evidence hidden.
      await expect
        .poll(() =>
          inspector.evaluate(
            (element) => element.scrollWidth - element.clientWidth,
          ),
        )
        .toBe(0);
      const bounds = await inspector.evaluate((element) => {
        const outer = element.getBoundingClientRect();
        const details = element
          .querySelector("details")!
          .getBoundingClientRect();
        const pre = element.querySelector("pre")!.getBoundingClientRect();
        return {
          outerLeft: outer.left,
          outerRight: outer.right,
          detailsLeft: details.left,
          detailsRight: details.right,
          preLeft: pre.left,
          preRight: pre.right,
        };
      });
      expect(bounds.detailsLeft).toBeGreaterThan(bounds.outerLeft);
      expect(bounds.detailsRight).toBeLessThan(bounds.outerRight);
      expect(bounds.preLeft).toBeGreaterThanOrEqual(bounds.detailsLeft);
      expect(bounds.preRight).toBeLessThanOrEqual(bounds.detailsRight);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      ).toBe(0);

      await page.keyboard.press("Tab");
      await expect(record).toBeFocused();
      // Native focus scrolling rounds the page offset to whole CSS pixels.
      // Allow that subpixel vertical remainder, but no horizontal overflow.
      await expect
        .poll(() =>
          record.evaluate((element) => {
            const bounds = element.getBoundingClientRect();
            return (
              bounds.top >= -1 &&
              bounds.bottom <= innerHeight + 1 &&
              bounds.left >= 0 &&
              bounds.right <= innerWidth
            );
          }),
        )
        .toBe(true);
      const focus = await record.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          keyboard: element.matches(":focus-visible"),
          visible:
            (style.outlineStyle !== "none" &&
              Number.parseFloat(style.outlineWidth) > 0) ||
            style.boxShadow !== "none",
        };
      });
      expect(focus).toEqual({ keyboard: true, visible: true });
      const scroll = await record.evaluate((element) => ({
        width: element.scrollWidth,
        clientWidth: element.clientWidth,
        height: element.scrollHeight,
        clientHeight: element.clientHeight,
      }));
      expect(scroll.width).toBeGreaterThan(scroll.clientWidth);
      await page.keyboard.press("ArrowRight");
      await expect
        .poll(() => record.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(0);
      if (scroll.height > scroll.clientHeight) {
        await page.keyboard.press("ArrowDown");
        await expect
          .poll(() => record.evaluate((element) => element.scrollTop))
          .toBeGreaterThan(0);
      }
      expect(await record.textContent()).toBe(literal);
      expect(await inspector.evaluate((element) => element.scrollLeft)).toBe(0);
      expect(
        await page.evaluate(() => document.scrollingElement!.scrollLeft),
      ).toBe(0);
      await page.keyboard.press("Tab");
      await expect(record).not.toBeFocused();

      await demo.locator("[data-otel-demo-scenario]").selectOption("retry");
      await demo.getByRole("button", { name: /attempt 1/ }).click();
      const replacement = await record.textContent();
      expect(replacement).not.toBe(literal);
      expect(JSON.parse(replacement!)).toEqual({
        resource: { "service.name": "event-api" },
        scope: "course.event-tracker",
        traceId: "1fd09b0b23af498c8d9db8e487a6307d",
        spanId: expect.stringMatching(/^[a-f0-9]{16}$/),
        parentSpanId: expect.stringMatching(/^[a-f0-9]{16}$/),
        name: "store event · attempt 1",
        startOffsetMs: 13,
        durationMs: 82,
        status: "Error",
        attributes: {
          "db.system.name": "postgresql",
          "db.operation.name": "INSERT",
          "error.type": "connection_timeout",
          "retry.attempt": "1",
        },
      });
      await expect(record).toBeVisible();
      expect(
        await inspector.evaluate(
          (element) => element.scrollWidth - element.clientWidth,
        ),
      ).toBe(0);
    });
  }
}
