import { expect, test } from "@playwright/test";

test.describe("ACID transaction lab", () => {
  test("keeps the expanded concurrency program readable within a phone-width demo", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/demos/#demo-acid-transaction-lab");
    const lab = page.locator("[data-acid-lab]");
    await lab.locator("[data-acid-scenario]").selectOption("concurrent");
    await expect(lab.locator("[data-acid-program]")).toBeVisible();
    const layout = await lab.evaluate((root) => {
      const bounds = root.getBoundingClientRect();
      const program = root
        .querySelector("[data-acid-program]")!
        .getBoundingClientRect();
      return {
        overflow: root.scrollWidth - root.clientWidth,
        programRight: program.right,
        demoRight: bounds.right,
      };
    });
    expect(layout.overflow).toBeLessThanOrEqual(1);
    expect(layout.programRight).toBeLessThanOrEqual(layout.demoRight);
  });
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/appendices/advanced-web-boundaries/#demo-acid-transaction-lab",
    );
    await expect(page.locator("[data-acid-lab]")).toBeVisible();
  });

  test("rolls back a split operation when both writes share a transaction", async ({
    page,
  }) => {
    const lab = page.locator("[data-acid-lab]");

    await lab.locator("[data-acid-run]").click();
    await expect(lab).toHaveAttribute("data-acid-result", "broken");
    await expect(lab.locator("[data-acid-item-state]")).toHaveText("Finished");
    await expect(lab.locator("[data-acid-event]")).toHaveCount(0);
    await expect(
      lab.locator('[data-acid-property="atomicity"]'),
    ).toHaveAttribute("data-status", "fail");

    await lab.locator("[data-acid-mode]").selectOption("transaction");
    await lab.locator("[data-acid-run]").click();
    await expect(lab).toHaveAttribute("data-acid-result", "protected");
    await expect(lab.locator("[data-acid-item-state]")).toHaveText("Active");
    await expect(lab.locator("[data-acid-event]")).toHaveCount(0);
    await expect(lab.locator("[data-acid-invariant]")).toContainText(
      "no partial transition",
    );
    await expect(lab.locator("[data-acid-trace]")).toContainText("ROLLBACK");
  });

  test("distinguishes atomic transactions from serializable execution", async ({
    page,
  }) => {
    const lab = page.locator("[data-acid-lab]");

    await lab.locator("[data-acid-scenario]").selectOption("concurrent");
    await expect(lab.locator("[data-acid-program]")).toBeVisible();
    await expect(lab.locator("[data-acid-program] code").first()).toContainText(
      "SET state = 'active' WHERE id = :id",
    );
    await expect(lab.locator("[data-acid-program] code").last()).toContainText(
      "AND state = 'initial' RETURNING id",
    );
    await lab.locator("[data-acid-mode]").selectOption("transaction");
    await expect(lab.locator("[data-acid-isolation]")).toBeEnabled();
    await lab.locator("[data-acid-run]").click();
    await expect(lab.locator("[data-acid-event]")).toHaveCount(2);
    await expect(
      lab.locator('[data-acid-property="atomicity"]'),
    ).toHaveAttribute("data-status", "pass");
    await expect(
      lab.locator('[data-acid-property="isolation"]'),
    ).toHaveAttribute("data-status", "fail");

    await lab.locator("[data-acid-isolation]").selectOption("serializable");
    await lab.locator("[data-acid-run]").click();
    await expect(lab).toHaveAttribute("data-acid-result", "protected");
    await expect(lab.locator("[data-acid-event]")).toHaveCount(1);
    await expect(lab.locator("[data-acid-acknowledgement]")).toContainText(
      "Bob 409 retry",
    );
    await expect(
      lab.locator('[data-acid-property="isolation"]'),
    ).toHaveAttribute("data-status", "pass");
  });

  test("keeps acknowledged state only when the reply follows durable commit", async ({
    page,
  }) => {
    const lab = page.locator("[data-acid-lab]");

    await lab.locator("[data-acid-scenario]").selectOption("restart");
    await expect(lab.locator("[data-acid-program]")).toBeHidden();
    await lab.locator("[data-acid-run]").click();
    await expect(lab.locator("[data-acid-item-state]")).toHaveText("Initial");
    await expect(
      lab.locator('[data-acid-property="durability"]'),
    ).toHaveAttribute("data-status", "fail");

    await lab.locator("[data-acid-mode]").selectOption("transaction");
    await lab.locator("[data-acid-run]").click();
    await expect(lab.locator("[data-acid-item-state]")).toHaveText("Active");
    await expect(lab.locator("[data-acid-event='work_started']")).toHaveCount(
      1,
    );
    await expect(
      lab.locator('[data-acid-property="durability"]'),
    ).toHaveAttribute("data-status", "pass");
  });
});
