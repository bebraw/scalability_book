import { expect, test, type Locator } from "@playwright/test";

test.describe("benchmark simulation demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demos/#demo-tail-latency-simulator");
    await expect(
      page.locator("[data-benchmark-simulation-demo]"),
    ).toBeVisible();
  });

  test("tests a prediction before revealing the distribution", async ({
    page,
  }) => {
    const demo = page.locator("[data-benchmark-simulation-demo]");

    await expect(demo.locator("[data-benchmark-demo-verdict]")).toHaveText(
      "Choose a claim before measuring",
    );
    await expect(demo.locator(".benchmark-demo-run")).toBeDisabled();
    await expect(
      demo.locator('[data-benchmark-demo-metric="average"]'),
    ).toHaveText("—");
    await expect(demo.locator("[data-benchmark-demo-chart] i")).toHaveCount(0);

    await clickPrediction(demo, "Average passes; p95 fails");
    await expect(demo.locator(".benchmark-demo-run")).toBeEnabled();
    await demo.locator(".benchmark-demo-run").click();

    await expect(demo.locator("[data-benchmark-demo-verdict]")).toHaveText(
      "Prediction confirmed — average passes; p95 fails",
    );
    await expect(demo.locator("[data-benchmark-demo-chart] i")).toHaveCount(60);
    await expect(
      demo.locator("[data-benchmark-demo-chart] i.is-slow"),
    ).toHaveCount(6);
    await expect(
      demo.locator('[data-benchmark-demo-metric="average"]'),
    ).toHaveText("48 ms");
    await expect(demo.locator('[data-benchmark-demo-metric="p95"]')).toHaveText(
      "217 ms",
    );
    await expect(
      demo.locator("[data-benchmark-demo-comparison]"),
    ).toContainText("Baseline recorded");
    await expect(demo.locator(".benchmark-demo-run")).toBeDisabled();
  });

  test("compares a changed workload with the previous run", async ({
    page,
  }) => {
    const demo = page.locator("[data-benchmark-simulation-demo]");

    await clickPrediction(demo, "Average passes; p95 fails");
    await demo.locator(".benchmark-demo-run").click();

    await demo
      .locator('[data-benchmark-demo-input="slow-rate"]')
      .selectOption("0");
    await expect(demo.locator("[data-benchmark-demo-verdict]")).toHaveText(
      "Workload changed—predict the next result",
    );
    await expect(demo.locator("[data-benchmark-demo-chart]")).toHaveClass(
      /is-stale/,
    );

    await clickPrediction(demo, "Average and p95 pass");
    await demo.locator(".benchmark-demo-run").click();
    await expect(demo.locator("[data-benchmark-demo-verdict]")).toHaveText(
      "Prediction confirmed — average and p95 pass",
    );
    await expect(
      demo.locator("[data-benchmark-demo-chart] i.is-slow"),
    ).toHaveCount(0);
    await expect(
      demo.locator("[data-benchmark-demo-comparison]"),
    ).toContainText("p95 −183 ms");

    await demo
      .locator('[data-benchmark-demo-input="slow-rate"]')
      .selectOption("5");
    await clickPrediction(demo, "Average and p95 pass");
    await demo.locator(".benchmark-demo-run").click();
    await expect(demo.locator('[data-benchmark-demo-metric="p95"]')).toHaveText(
      "34 ms",
    );
    await expect(
      demo.locator("[data-benchmark-demo-interpretation]"),
    ).toContainText("3 of 60 requests miss");
    await expect(
      demo.locator("[data-benchmark-demo-interpretation]"),
    ).toContainText("A passing p95 can leave slow requests");
    await demo
      .getByText("Inspect all ordered records", { exact: true })
      .click();
    await expect(demo.locator("[data-benchmark-demo-records]")).toContainText(
      "57: 34 ms ← p95",
    );
    await expect(
      demo.locator("[data-benchmark-demo-chart] i.is-percentile"),
    ).toHaveCount(1);
  });
});

async function clickPrediction(demo: Locator, label: string) {
  await demo
    .locator(".benchmark-demo-prediction label")
    .filter({ hasText: label })
    .click();
}
