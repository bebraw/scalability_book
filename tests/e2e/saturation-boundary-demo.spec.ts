import { expect, test, type Locator } from "@playwright/test";

test.describe("saturation boundary demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chapters/scaling/#saturation-boundary-lab");
    await expect(page.locator("[data-saturation-boundary-demo]")).toBeVisible();
  });

  test("expansion moves the limit and preserves the before/after comparison", async ({
    page,
  }) => {
    const demo = page.locator("[data-saturation-boundary-demo]");
    await expect(
      demo.locator('[data-saturation-boundary-metric="admitted"]'),
    ).toHaveText("140 ev/s");
    await expect(
      demo.locator('[data-saturation-boundary-metric="completed"]'),
    ).toHaveText("110 ev/s");
    await expect(
      demo.locator('[data-saturation-boundary-metric="backlog"]'),
    ).toHaveText("30 ev/s");
    await demo.locator("[data-saturation-boundary-expand]").click();
    await expect(
      demo.locator("[data-saturation-boundary-verdict]"),
    ).toContainText("Downstream quota saturated");
    await expect(
      demo.locator('[data-saturation-boundary-metric="completed"]'),
    ).toHaveText("130 ev/s");
    await expect(
      demo.locator('[data-saturation-boundary-metric="backlog"]'),
    ).toHaveText("10 ev/s");
    await expect(
      demo.locator("[data-saturation-boundary-comparison]"),
    ).toContainText(
      "Before expansion: Database pool, 110 completed/s. After: Downstream quota, 130 completed/s.",
    );
    await demo.locator("[data-saturation-boundary-load]").fill("20");
    await expect(
      demo.locator('[data-saturation-boundary-metric="completed"]'),
    ).toHaveText("20 ev/s");
    await expect(
      demo.locator("[data-saturation-boundary-comparison]"),
    ).toHaveText(
      "Predict which stage will limit completion after one capacity increase, then compare.",
    );
  });

  test("admission limiting changes admitted load but not useful completion", async ({
    page,
  }) => {
    const demo = page.locator("[data-saturation-boundary-demo]");
    await demo.locator("[data-saturation-boundary-backpressure]").check();
    await expect(
      demo.locator('[data-saturation-boundary-metric="admitted"]'),
    ).toHaveText("110 ev/s");
    await expect(
      demo.locator('[data-saturation-boundary-metric="completed"]'),
    ).toHaveText("110 ev/s");
    await expect(
      demo.locator('[data-saturation-boundary-metric="backlog"]'),
    ).toHaveText("0 ev/s");
    await expect(
      demo.locator('[data-saturation-boundary-metric="rejected"]'),
    ).toHaveText("30 ev/s");
    await expect(
      demo.locator("[data-saturation-boundary-pipeline]"),
    ).toContainText("110 admitted/s");
    await expect(
      demo.locator("[data-saturation-boundary-diagnosis]"),
    ).toContainText("rejecting 30");
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await expectElementsInsideDemo(demo, [
        ".saturation-boundary-instrument",
        ".saturation-boundary-readout",
        ".saturation-boundary-actions",
      ]);
      expect(
        await demo.evaluate(
          (element) => element.scrollWidth - element.clientWidth,
        ),
      ).toBeLessThanOrEqual(1);
    }
  });
});

async function expectElementsInsideDemo(demo: Locator, selectors: string[]) {
  const overflow = await demo.evaluate(
    (root: HTMLElement, checkedSelectors: string[]) => {
      const rootRect = root.getBoundingClientRect();

      return checkedSelectors.flatMap((selector) =>
        Array.from(root.querySelectorAll(selector)).flatMap((element) => {
          if (!(element instanceof HTMLElement) || element.hidden) {
            return [];
          }

          const rect = element.getBoundingClientRect();
          const spills =
            rect.left < rootRect.left - 1 || rect.right > rootRect.right + 1;

          return spills
            ? [
                {
                  selector,
                  left: rect.left,
                  right: rect.right,
                  rootLeft: rootRect.left,
                  rootRight: rootRect.right,
                },
              ]
            : [];
        }),
      );
    },
    selectors,
  );

  expect(overflow).toEqual([]);
}
