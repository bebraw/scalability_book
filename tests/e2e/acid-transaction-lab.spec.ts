import { expect, test } from "@playwright/test";

test.describe("ACID transaction lab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chapters/architecture/#demo-acid-transaction-lab");
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
