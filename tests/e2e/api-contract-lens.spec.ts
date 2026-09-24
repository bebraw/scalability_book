import { expect, test } from "@playwright/test";

test.describe("API contract lens", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/appendices/advanced-web-boundaries/#demo-api-contract-lens",
    );
    await expect(page.locator("[data-api-contract-lens]")).toBeVisible();
  });

  test("moves client knowledge across four interaction styles", async ({
    page,
  }) => {
    const demo = page.locator("[data-api-contract-lens]");

    await expect(demo).toHaveAttribute("data-api-contract-style", "resource");
    await expect(demo.locator("[data-api-contract-code]")).toContainText(
      "PATCH /work-items/42",
    );
    await expect(
      demo.locator('[data-api-contract-fact="discovery"]'),
    ).toHaveText("documentation");
    await expect(demo.locator("[data-api-contract-run-label]")).toHaveText(
      "Run PATCH request",
    );
    await expect(demo.locator("[data-api-contract-trace-step]")).toHaveCount(4);
    await expect(
      demo.locator('[data-api-contract-trace-step="0"]'),
    ).toContainText("Construct PATCH /work-items/42");

    await demo.locator('label:has([value="hypermedia"])').click();
    await expect(demo).toHaveAttribute("data-api-contract-style", "hypermedia");
    await expect(demo.locator("[data-api-contract-code]")).toContainText(
      "{{links.start.href}}",
    );
    await expect(
      demo.locator('[data-api-contract-fact="discovery"]'),
    ).toHaveText("response controls");

    await demo.locator('label:has([value="graphql"])').click();
    await expect(demo.locator("[data-api-contract-code]")).toContainText(
      "mutation StartWork",
    );
    await expect(demo.locator("[data-api-contract-boundary]")).toHaveText(
      "typed schema + selection",
    );
    await expect(demo.locator("[data-api-contract-run-label]")).toHaveText(
      "Run StartWork mutation",
    );

    await demo.locator('label:has([value="rpc"])').click();
    await expect(demo.locator("[data-api-contract-code]")).toContainText(
      "WorkItemService.StartWork",
    );
    await expect(demo.locator("[data-api-contract-title]")).toHaveText(
      "Coordinate around capabilities",
    );
    await expect(demo.locator("[data-api-contract-run-label]")).toHaveText(
      "Call StartWork RPC",
    );
  });

  test("shows where an additional related field creates pressure", async ({
    page,
  }) => {
    const demo = page.locator("[data-api-contract-lens]");
    await demo.locator('label:has([value="graphql"])').click();
    await demo.locator("[data-api-contract-change]").check();

    await expect(demo).toHaveAttribute("data-api-contract-variant", "related");
    await expect(demo.locator("[data-api-contract-code]")).toContainText(
      "assignee { name }",
    );
    await expect(demo.locator("[data-api-contract-delta]")).toContainText(
      "resolver cost",
    );
    await expect(demo.locator("[data-api-contract-server] li")).toHaveCount(3);
  });

  test("traces one intent through the selected contract", async ({ page }) => {
    const demo = page.locator("[data-api-contract-lens]");
    await demo.locator('label:has([value="hypermedia"])').click();
    await demo.locator("[data-api-contract-run]").click();

    await expect(
      demo.locator("[data-api-contract-node].is-complete"),
    ).toHaveCount(4, { timeout: 5_000 });
    await expect(demo).toHaveAttribute("data-api-contract-phase", "complete");
    await expect(
      demo.locator("[data-api-contract-trace-step].is-complete"),
    ).toHaveCount(4);
    await expect(demo.locator("[data-api-contract-result]")).toHaveText(
      "200 OK · new controls: pause, complete",
    );
    await expect(demo.locator("[data-api-contract-receipt]")).toHaveClass(
      /is-complete/,
    );
    await expect(demo.locator("[data-api-contract-status]")).toContainText(
      "Compare the four steps",
    );
  });

  test("inherits the active book theme", async ({ page }) => {
    const badge = page.locator("span[data-api-contract-style]");
    const lightColor = await badge.evaluate(
      (element) => getComputedStyle(element).color,
    );
    await page.locator("[data-theme-picker]").selectOption("dark");
    const darkColor = await badge.evaluate(
      (element) => getComputedStyle(element).color,
    );
    expect(darkColor).not.toBe(lightColor);
  });

  test("stays within a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    const demo = page.locator("[data-api-contract-lens]");
    const bounds = await demo.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const contentRight = Math.max(
        ...[element, ...element.querySelectorAll<HTMLElement>("*")].map(
          (child) => child.getBoundingClientRect().right,
        ),
      );
      return { left: rect.left, right: rect.right, contentRight };
    });
    expect(bounds.left).toBeGreaterThanOrEqual(-1);
    expect(bounds.right).toBeLessThanOrEqual(391);
    expect(bounds.contentRight).toBeLessThanOrEqual(391);
  });
});
