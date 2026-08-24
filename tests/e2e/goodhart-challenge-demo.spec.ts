import { expect, test, type Locator } from "@playwright/test";

test.describe("Goodhart pressure test", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demos/#demo-goodhart-pressure-test");
    await expect(page.locator("[data-goodhart-demo]")).toBeVisible();
  });

  test("reveals proxy success and outcome damage only after a prediction", async ({
    page,
  }) => {
    const demo = page.locator("[data-goodhart-demo]");
    const apply = demo.locator("[data-goodhart-apply]");

    await expect(apply).toBeDisabled();
    await demo
      .locator('input[name="goodhart-target"][value="coverage"]')
      .check();
    await expect(demo.locator("[data-goodhart-contract-note]")).toContainText(
      "important behavior is checked",
    );
    await expect(demo.locator('[data-goodhart-measure-before="0"]')).toHaveText(
      "72%",
    );
    await expect(demo.locator('[data-goodhart-measure-after="0"]')).toHaveText(
      "?",
    );
    await expect(apply).toBeDisabled();

    await demo
      .locator('input[name="goodhart-prediction"][value="diverges"]')
      .check();
    await apply.click();

    await expect(demo.locator("[data-goodhart-status]")).toContainText(
      "Prediction confirmed",
    );
    await expect(demo.locator('[data-goodhart-measure-after="0"]')).toHaveText(
      "96%",
    );
    await expect(demo.locator('[data-goodhart-measure-after="1"]')).toHaveText(
      "87%",
    );
    await expect(demo.locator("[data-goodhart-repair]")).toBeVisible();
    await expect(demo.locator("[data-goodhart-gaming-path]")).toContainText(
      "shallow tests",
    );
    await expect(demo.locator('[data-goodhart-step="pressure"]')).toHaveClass(
      /is-active/,
    );
  });

  test("lets a leaking gate be revised into an independent outcome gate", async ({
    page,
  }) => {
    const demo = page.locator("[data-goodhart-demo]");
    await pressureTarget(demo, "latency");

    await demo
      .locator('input[name="goodhart-safeguard"][value="more-pressure"]')
      .check();
    await demo.locator("[data-goodhart-test]").click();
    await expect(demo.locator("[data-goodhart-gate-result]")).toHaveText(
      "GATE LEAKS",
    );
    await expect(demo.locator("[data-goodhart-artifact]")).toHaveValue(
      /Gate assessment: LEAKS/,
    );

    await demo
      .locator('input[name="goodhart-safeguard"][value="paired"]')
      .check();
    await demo.locator("[data-goodhart-test]").click();
    await expect(demo.locator("[data-goodhart-status]")).toContainText(
      "Gate repaired",
    );
    await expect(demo.locator("[data-goodhart-gate-result]")).toHaveText(
      "GATE HOLDS",
    );
    await expect(demo.locator("[data-goodhart-artifact]")).toHaveValue(
      /valid-request acceptance ≥ 98%/,
    );
    await expect(demo.locator("[data-goodhart-artifact]")).toHaveValue(
      /deterministic illustrative values/,
    );
  });

  test("supports every proxy, reset, and a narrow mobile viewport", async ({
    page,
  }) => {
    const demo = page.locator("[data-goodhart-demo]");

    await pressureTarget(demo, "agent-pass");
    await expect(demo.locator('[data-goodhart-measure-after="0"]')).toHaveText(
      "94%",
    );
    await expect(demo.locator("[data-goodhart-gaming-path]")).toContainText(
      "visible judge",
    );

    await demo
      .locator('input[name="goodhart-safeguard"][value="paired"]')
      .check();
    await demo.locator("[data-goodhart-test]").click();
    await demo.locator("[data-goodhart-reset]").click();
    await expect(demo.locator("[data-goodhart-repair]")).toBeHidden();
    await expect(demo.locator('[data-goodhart-measure-before="0"]')).toHaveText(
      "—",
    );
    await expect(demo.locator("[data-goodhart-apply]")).toBeDisabled();

    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(demo);
  });
});

async function pressureTarget(demo: Locator, target: string) {
  await demo
    .locator(`input[name="goodhart-target"][value="${target}"]`)
    .check();
  await demo
    .locator('input[name="goodhart-prediction"][value="diverges"]')
    .check();
  await demo.locator("[data-goodhart-apply]").click();
  await expect(demo.locator("[data-goodhart-repair]")).toBeVisible();
}

async function expectNoHorizontalOverflow(demo: Locator) {
  const overflow = await demo.evaluate((root: HTMLElement) => {
    const rootRect = root.getBoundingClientRect();
    return {
      root: root.scrollWidth - root.clientWidth,
      page: document.documentElement.scrollWidth - window.innerWidth,
      right: rootRect.right - window.innerWidth,
    };
  });

  expect(overflow.root).toBeLessThanOrEqual(1);
  expect(overflow.page).toBeLessThanOrEqual(1);
  expect(overflow.right).toBeLessThanOrEqual(1);
}
