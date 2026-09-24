import { existsSync } from "node:fs";
import { devices, expect, test, webkit, type Locator } from "@playwright/test";

async function fillStages(demo: Locator, period: string, value: string) {
  for (const input of await demo
    .locator('[data-friction-period="' + period + '"]')
    .all()) {
    await input.fill(value);
  }
}

test.describe("friction audit demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chapters/friction/#friction-audit-lab");
    await expect(page.locator("[data-friction-demo]")).toBeVisible();
  });

  test("keeps missing and invalid measurements distinct from measured zero", async ({
    page,
  }) => {
    const demo = page.locator("[data-friction-demo]");
    const before = demo.locator('[data-friction-demo-metric="before"]');
    await expect(before).toHaveText("Incomplete");
    await expect(demo.locator("[data-friction-demo-artifact]")).toHaveValue(
      /setup: missing \/ missing/,
    );
    await fillStages(demo, "before", "0");
    await expect(before).toHaveText("0 person-min");
    const setup = demo.locator(
      '[data-friction-stage="setup"][data-friction-period="before"]',
    );
    await setup.fill("-1");
    await expect(before).toHaveText("Incomplete");
    await setup.fill("");
    await expect(before).toHaveText("Incomplete");
    await setup.fill("0.5");
    await expect(before).toHaveText("0.5 person-min");
    await expect(
      demo.locator('[data-friction-demo-metric="difference"]'),
    ).toHaveText("Incomplete");
  });

  test("retains adverse results, introduction costs, failed checks, and evidence in the export", async ({
    page,
  }) => {
    const demo = page.locator("[data-friction-demo]");
    await fillStages(demo, "before", "5");
    await fillStages(demo, "after", "4");
    await expect(
      demo.locator('[data-friction-demo-metric="difference"]'),
    ).toHaveText("-8 person-min");
    await expect(demo.locator('[data-friction-demo-metric="net"]')).toHaveText(
      "Incomplete",
    );
    await expect(demo.locator("[data-friction-demo-verdict]")).toHaveText(
      "Acceptance evidence missing",
    );
    await demo.locator("[data-friction-investment]").fill("12");
    await expect(demo.locator('[data-friction-demo-metric="net"]')).toHaveText(
      "+4 person-min",
    );
    await demo
      .locator('[data-friction-acceptance="before"]')
      .selectOption("pass");
    await demo
      .locator('[data-friction-acceptance="after"]')
      .selectOption("fail");
    await expect(demo.locator("[data-friction-demo-verdict]")).toHaveText(
      "Acceptance failed",
    );
    await expect(demo.locator("[data-friction-demo-artifact]")).toHaveValue(
      /not a comparison of accepted changes/,
    );
    await demo
      .locator('[data-friction-stage="setup"][data-friction-period="after"]')
      .fill("20");
    await expect(
      demo.locator('[data-friction-demo-metric="difference"]'),
    ).toHaveText("+8 person-min");
    await demo
      .locator('[data-friction-acceptance="after"]')
      .selectOption("pass");
    await expect(demo.locator("[data-friction-demo-verdict]")).toHaveText(
      "Observed difference: +8 person-min",
    );
    await demo
      .locator('[data-friction-note="task"]')
      .fill("Reject invalid transitions");
    await demo
      .locator('[data-friction-note="baseline"]')
      .fill("abc123, same laptop");
    await demo
      .locator('[data-friction-note="hypothesis"]')
      .fill("Setup check reduces repeated diagnosis");
    await demo
      .locator('[data-friction-note="evidence"]')
      .fill("timings.csv; same tests; second attempt had practice");
    await demo
      .locator('[data-friction-note="next"]')
      .fill("Repeat with an unfamiliar reviewer");
    const artifact = demo.locator("[data-friction-demo-artifact]");
    await expect(artifact).toHaveValue(/Candidate effort: 48 person-min/);
    await expect(artifact).toHaveValue(
      /Difference plus one-off cost: \+20 person-min/,
    );
    await expect(artifact).toHaveValue(/abc123, same laptop/);
    await expect(artifact).toHaveValue(
      /timings.csv; same tests; second attempt had practice/,
    );
    await expect(artifact).toHaveValue(/Repeat with an unfamiliar reviewer/);
    await expect(artifact).toHaveValue(/One pair does not establish causation/);
    await expect(artifact).not.toHaveValue(
      /Estimated change path|Likely rework loops|Agent rework risk/,
    );
  });

  test("fits a narrow viewport with accessible measurement labels", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const demo = page.locator("[data-friction-demo]");
    await demo
      .getByLabel("Setup: baseline person-minutes", { exact: true })
      .fill("2");
    const overflows = await demo.evaluate(
      (element) => element.scrollWidth > element.clientWidth + 1,
    );
    expect(overflows).toBe(false);
  });

  test("updates observed effort in mobile WebKit", async ({ baseURL }) => {
    test.skip(
      !existsSync(webkit.executablePath()),
      "Playwright WebKit is not installed",
    );
    const browser = await webkit.launch();
    const page = await browser.newPage({ ...devices["iPhone 13"] });
    try {
      await page.goto(baseURL + "/chapters/friction/#friction-audit-lab");
      const demo = page.locator("[data-friction-demo]");
      await fillStages(demo, "before", "0");
      await demo
        .getByLabel("Testing: baseline person-minutes", { exact: true })
        .fill("7.5");
      await expect(
        demo.locator('[data-friction-demo-metric="before"]'),
      ).toHaveText("7.5 person-min");
      expect(
        await demo.evaluate(
          (element) => element.scrollWidth > element.clientWidth + 1,
        ),
      ).toBe(false);
    } finally {
      await browser.close();
    }
  });
});
