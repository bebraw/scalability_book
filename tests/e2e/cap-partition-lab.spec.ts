import { expect, test } from "@playwright/test";

test.describe("CAP partition lab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chapters/scaling/#demo-cap-partition-lab");
    await expect(page.locator("[data-cap-lab]")).toBeVisible();
  });

  test("preserves one history by rejecting the isolated quorum write", async ({
    page,
  }) => {
    const lab = page.locator("[data-cap-lab]");

    await expect(lab.locator("[data-cap-write]")).toBeDisabled();
    await lab.locator("[data-cap-partition]").click();
    await expect(lab).toHaveAttribute("data-cap-phase", "partitioned");
    await expect(lab.locator('[data-cap-node="helsinki"]')).toHaveAttribute(
      "data-node-state",
      "isolated",
    );

    await lab.locator("[data-cap-write]").click();
    await expect(lab).toHaveAttribute("data-cap-result", "quorum");
    await expect(lab.locator('[data-cap-node-reply="helsinki"]')).toHaveText(
      "503 no quorum",
    );
    await expectMetric(lab, "accepted", "1");
    await expectMetric(lab, "rejected", "1");
    await expectMetric(lab, "conflicts", "0");
    await expect(
      lab.locator('[data-cap-property="consistency"]'),
    ).toHaveAttribute("data-status", "pass");
    await expect(
      lab.locator('[data-cap-property="availability"]'),
    ).toHaveAttribute("data-status", "fail");

    await lab.locator("[data-cap-heal]").click();
    await expect(lab).toHaveAttribute("data-cap-phase", "healed");
    await expect(lab.locator('[data-cap-node-item="helsinki"]')).toHaveText(
      "active",
    );
    await expect(lab.locator('[data-cap-node-event="helsinki"]')).toContainText(
      "Bob",
    );
    await expectMetric(lab, "conflicts", "0");
  });

  test("keeps both regions available and exposes reconciliation cost", async ({
    page,
  }) => {
    const lab = page.locator("[data-cap-lab]");

    await lab.locator("[data-cap-policy]").selectOption("local");
    await lab.locator("[data-cap-partition]").click();
    await expect(lab.locator("[data-cap-policy]")).toBeDisabled();
    await lab.locator("[data-cap-write]").click();

    await expect(lab).toHaveAttribute("data-cap-result", "local");
    await expect(lab.locator('[data-cap-node-reply="helsinki"]')).toHaveText(
      "200 started",
    );
    await expect(lab.locator('[data-cap-node-reply="frankfurt"]')).toHaveText(
      "200 started",
    );
    await expectMetric(lab, "accepted", "2");
    await expectMetric(lab, "rejected", "0");
    await expectMetric(lab, "conflicts", "1");
    await expect(
      lab.locator('[data-cap-property="consistency"]'),
    ).toHaveAttribute("data-status", "fail");
    await expect(
      lab.locator('[data-cap-property="availability"]'),
    ).toHaveAttribute("data-status", "pass");

    await lab.locator("[data-cap-heal]").click();
    await expect(lab).toHaveAttribute("data-cap-result", "repaired");
    await expect(lab.locator("[data-cap-log]")).toContainText(
      "quarantines Alice",
    );
    await expect(lab.locator('[data-cap-node-event="dublin"]')).toContainText(
      "Alice quarantined",
    );
    await expectMetric(lab, "conflicts", "1");

    await lab.locator("[data-cap-reset]").click();
    await expect(lab).toHaveAttribute("data-cap-phase", "connected");
    await expect(lab.locator("[data-cap-policy]")).toHaveValue("quorum");
    await expectMetric(lab, "accepted", "0");
  });
});

async function expectMetric(
  lab: import("@playwright/test").Locator,
  metric: string,
  value: string,
) {
  await expect(lab.locator(`[data-cap-metric='${metric}']`)).toHaveText(value);
}
