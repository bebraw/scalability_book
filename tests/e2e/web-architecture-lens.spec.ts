import { expect, test } from "@playwright/test";

test.describe("web architecture update flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demos/#demo-web-architecture-lens");
  });
  test("separates full-document replacement, targeted HTML and client rendering", async ({
    page,
  }) => {
    const demo = page.locator("[data-architecture-lens]");
    const draft = demo.locator("[data-architecture-lens-draft]");
    await expect(demo.locator("[data-architecture-lens-trace]")).toBeHidden();
    await demo
      .getByText("Follow the modeled exchange", { exact: true })
      .click();
    await expect(demo.locator("[data-architecture-lens-trace]")).toContainText(
      "Browser follows GET /activities",
    );
    await draft.fill("My unsaved note");
    await expect(
      demo.locator("[data-architecture-lens-response]"),
    ).toContainText("303 redirect");
    await demo.locator("[data-architecture-lens-run]").click();
    await expect(draft).toHaveValue("");
    await expect(demo.locator("[data-architecture-lens-verdict]")).toHaveText(
      "Draft reset",
    );
    await draft.fill("Explicitly preserved");
    await demo.locator("[data-architecture-lens-restore]").check();
    await demo.locator("[data-architecture-lens-run]").click();
    await expect(draft).toHaveValue("Explicitly preserved");
    for (const [flow, response] of [
      ["hda", "200 text/html"],
      ["spa", "201 application/json"],
    ]) {
      await demo
        .locator(`[data-architecture-lens-interaction][value='${flow}']`)
        .check();
      await expect(
        demo.locator("[data-architecture-lens-response]"),
      ).toContainText(response!);
      await demo.locator("[data-architecture-lens-run]").click();
      await expect(draft).toHaveValue("Explicitly preserved");
      await expect(demo.locator("[data-added-event]")).toHaveCount(1);
    }
  });
  test("fits a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const demo = page.locator("[data-architecture-lens]");
    expect(
      await demo.evaluate((root) => root.scrollWidth - root.clientWidth),
    ).toBeLessThanOrEqual(1);
  });
});
