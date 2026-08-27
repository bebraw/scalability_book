import { expect, test } from "@playwright/test";

test.describe("durable effect retry lab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/appendices/durable-workflows/#durable-effect-retry-lab");
    await expect(page.locator("[data-durable-retry]")).toBeVisible();
  });

  test("shows a duplicate effect when the receiver does not enforce the key", async ({
    page,
  }) => {
    const lab = page.locator("[data-durable-retry]");
    const crash = lab.locator("[data-durable-retry-crash]");
    const recover = lab.locator("[data-durable-retry-recover]");

    await expect(crash).toBeDisabled();
    await lab.locator("[data-durable-retry-prediction][value='2']").check();
    await expect(crash).toBeEnabled();

    await crash.click();
    await expect(lab).toHaveAttribute("data-durable-retry-phase", "crashed");
    await expect(lab.locator("[data-durable-retry-app-status]")).toHaveText(
      "Pending · effect may exist",
    );
    await expect(lab.locator("[data-durable-retry-history]")).toContainText(
      "ActivityScheduled #1",
    );
    await expect(lab.locator("[data-durable-retry-history]")).not.toContainText(
      "ActivityCompleted",
    );
    await expectMetric(lab, "commands", "1");
    await expectMetric(lab, "attempts", "1");
    await expectMetric(lab, "calls", "1");
    await expectMetric(lab, "effects", "1");
    await expectMetric(lab, "completion", "0");

    await recover.click();
    await expect(lab).toHaveAttribute("data-durable-retry-phase", "recovered");
    await expectMetric(lab, "commands", "1");
    await expectMetric(lab, "attempts", "2");
    await expectMetric(lab, "calls", "2");
    await expectMetric(lab, "effects", "2");
    await expectMetric(lab, "completion", "1");
    await expect(
      lab.locator("[data-durable-retry-effect='applied']"),
    ).toHaveCount(2);
    await expect(lab.locator("[data-durable-retry-result-label]")).toHaveText(
      "Prediction confirmed",
    );
    await expect(lab.locator("[data-durable-retry-artifact]")).toHaveValue(
      /Receiver effects: 2/,
    );
    await expect(lab.locator("[data-durable-retry-artifact]")).toHaveValue(
      /Durable completions: 1/,
    );

    const keys = await lab
      .locator("[data-durable-retry-attempt] td:nth-child(2)")
      .allTextContents();
    expect(new Set(keys).size).toBe(1);
  });

  test("keeps one effect with a stable key and atomic receiver deduplication", async ({
    page,
  }) => {
    const lab = page.locator("[data-durable-retry]");

    await lab.locator("[data-durable-retry-dedupe]").selectOption("atomic");
    await lab.locator("[data-durable-retry-prediction][value='1']").check();
    await lab.locator("[data-durable-retry-crash]").click();
    await lab.locator("[data-durable-retry-recover]").click();

    await expectMetric(lab, "commands", "1");
    await expectMetric(lab, "attempts", "2");
    await expectMetric(lab, "calls", "2");
    await expectMetric(lab, "effects", "1");
    await expectMetric(lab, "completion", "1");
    await expect(
      lab.locator("[data-durable-retry-effect='applied']"),
    ).toHaveCount(1);
    await expect(
      lab.locator("[data-durable-retry-effect='replayed']"),
    ).toHaveCount(1);
    await expect(lab.locator("[data-durable-retry-attempt='2']")).toContainText(
      "200 replay",
    );
    await expect(lab.locator("[data-durable-retry-history]")).toContainText(
      "ActivityCompleted #2",
    );
    await expect(lab.locator("[data-durable-retry-history]")).toContainText(
      "WorkflowCompleted",
    );
    await expect(lab.locator("[data-durable-retry-app-status]")).toHaveText(
      "Delivered",
    );
    await expect(lab.locator("[data-durable-retry-result]")).toContainText(
      "atomically stored the first effect",
    );

    const keys = await lab
      .locator("[data-durable-retry-attempt] td:nth-child(2)")
      .allTextContents();
    expect(new Set(keys).size).toBe(1);
  });

  test("shows why a fresh retry key defeats receiver deduplication", async ({
    page,
  }) => {
    const lab = page.locator("[data-durable-retry]");

    await lab.locator("[data-durable-retry-key-mode]").selectOption("fresh");
    await lab.locator("[data-durable-retry-dedupe]").selectOption("atomic");
    await lab.locator("[data-durable-retry-prediction][value='2']").check();
    await lab.locator("[data-durable-retry-crash]").click();
    await lab.locator("[data-durable-retry-recover]").click();

    await expectMetric(lab, "effects", "2");
    await expect(
      lab.locator("[data-durable-retry-effect='applied']"),
    ).toHaveCount(2);
    await expect(lab.locator("[data-durable-retry-summary]")).toContainText(
      "Fresh keys",
    );

    const keys = await lab
      .locator("[data-durable-retry-attempt] td:nth-child(2)")
      .allTextContents();
    expect(new Set(keys).size).toBe(2);

    await lab.locator("[data-durable-retry-reset]").click();
    await expect(lab).toHaveAttribute("data-durable-retry-phase", "ready");
    await expect(lab.locator("[data-durable-retry-crash]")).toBeDisabled();
    await expect(lab.locator("[data-durable-retry-key-mode]")).toBeEnabled();
    await expectMetric(lab, "attempts", "0");
    await expectMetric(lab, "effects", "0");
  });
});

async function expectMetric(
  lab: import("@playwright/test").Locator,
  metric: string,
  value: string,
) {
  await expect(
    lab.locator(`[data-durable-retry-metric='${metric}']`),
  ).toHaveText(value);
}
