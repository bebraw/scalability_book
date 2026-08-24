import { expect, test, type Locator } from "@playwright/test";

test.describe("incident pressure map demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chapters/reality/#pressure-map-lab");
    await expect(page.locator("[data-pressure-map-demo]")).toBeVisible();
  });

  test("turns three constrained decisions into a pressure-map debrief", async ({
    page,
  }) => {
    const demo = page.locator("[data-pressure-map-demo]");

    await expect(
      demo.locator("[data-pressure-map-demo-verdict]"),
    ).toContainText("Round 1 of 3");
    await expect(demo.locator("[data-pressure-map-demo-step]")).toHaveCount(4);
    await expect(
      demo.locator("[data-pressure-map-demo-step].is-active"),
    ).toContainText("Detect");
    await expect(
      demo.locator("[data-pressure-map-demo-metric='latency']"),
    ).toHaveText("310 ms");
    await expect(
      demo.locator("[data-pressure-map-demo-commit]"),
    ).toBeDisabled();

    await chooseAndCommit(demo, "pool-wait", "backpressure");

    await expect(
      demo.locator("[data-pressure-map-demo-verdict]"),
    ).toContainText("Round 2 of 3");
    await expect(
      demo.locator("[data-pressure-map-demo-metric='latency']"),
    ).toHaveText("230 ms");
    await expect(
      demo.locator("[data-pressure-map-demo-metric='duplicates']"),
    ).toHaveText("4");
    await expect(demo.locator("[data-pressure-map-demo-log]")).toContainText(
      "Tail latency falls",
    );

    await chooseAndCommit(demo, "repeated-ids", "retry-contract");

    await expect(
      demo.locator("[data-pressure-map-demo-verdict]"),
    ).toContainText("Round 3 of 3");
    await expect(
      demo.locator("[data-pressure-map-demo-metric='backlog']"),
    ).toHaveText("69 s");
    await expect(
      demo.locator("[data-pressure-map-demo-metric='duplicates']"),
    ).toHaveText("0");

    await chooseAndCommit(demo, "tenant-age", "isolate-importer");

    const debrief = demo.locator("[data-pressure-map-demo-debrief]");
    await expect(debrief).toBeVisible();
    await expect(demo.locator("[data-pressure-map-demo-verdict]")).toHaveText(
      "Useful with declared trade-offs",
    );
    await expect(demo.locator("[data-pressure-map-demo-result]")).toHaveText(
      "5/5 constraints met",
    );
    await expect(
      demo.locator("[data-pressure-map-demo-step].is-active"),
    ).toContainText("Debrief");
    await expect(
      demo.locator("[data-pressure-map-demo-metric='budget']"),
    ).toHaveText("1");
    await expect(
      demo.locator("[data-pressure-map-demo-metric='usefulness']"),
    ).toHaveText("89%");
    await expect(demo.locator("[data-pressure-map-demo-board]")).toContainText(
      "Retry amplification",
    );
    await expect(demo.locator("[data-pressure-map-demo-board]")).toContainText(
      "Noisy-neighbor isolation",
    );
    await expect(demo.locator("[data-pressure-map-demo-artifact]")).toHaveValue(
      /Binding signals identified: 3\/3/,
    );
    await expect(demo.locator("[data-pressure-map-demo-artifact]")).toHaveValue(
      /Enable ingress backpressure/,
    );
    await expect(demo.locator("[data-pressure-map-demo-artifact]")).toHaveValue(
      /Complexity moved to: fairness policy/,
    );
    await expect(demo.locator(".pressure-incident-decision")).toBeHidden();

    await demo.locator("[data-pressure-map-demo-reset]").click();
    await expect(
      demo.locator("[data-pressure-map-demo-verdict]"),
    ).toContainText("Round 1 of 3");
    await expect(debrief).toBeHidden();
    await expect(
      demo.locator("[data-pressure-map-demo-metric='budget']"),
    ).toHaveText("6");
  });

  test("carries a locally helpful pool expansion into later contention", async ({
    page,
  }) => {
    const demo = page.locator("[data-pressure-map-demo]");

    await chooseAndCommit(demo, "pool-wait", "expand-pool");

    await expect(
      demo.locator("[data-pressure-map-demo-metric='latency']"),
    ).toHaveText("360 ms");
    await expect(
      demo.locator("[data-pressure-map-demo-metric='backlog']"),
    ).toHaveText("62 s");
    await expect(demo.locator("[data-pressure-map-demo-log]")).toContainText(
      "extra in-flight work increases storage contention",
    );
  });
});

async function chooseAndCommit(demo: Locator, probe: string, action: string) {
  await demo
    .locator(`[data-pressure-map-demo-probe][value='${probe}']`)
    .check();
  await demo
    .locator(`[data-pressure-map-demo-action][value='${action}']`)
    .check();
  await expect(demo.locator("[data-pressure-map-demo-commit]")).toBeEnabled();
  await demo.locator("[data-pressure-map-demo-commit]").click();
}
