import { expect, test, type Locator } from "@playwright/test";

test.describe("saturation boundary demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chapters/scaling/#saturation-boundary-lab");
    await expect(page.locator("[data-saturation-boundary-demo]")).toBeVisible();
  });

  test("reveals a binding limit and moves it when capacity expands", async ({
    page,
  }) => {
    const demo = page.locator("[data-saturation-boundary-demo]");

    await expect(
      demo.locator("[data-saturation-boundary-verdict]"),
    ).toContainText("Database pool saturated");
    await expect(
      demo.locator("[data-saturation-boundary-metric='boundary']"),
    ).toHaveText("DB pool");
    await expect(
      demo.locator("[data-saturation-boundary-diagnosis]"),
    ).toContainText("hidden work");
    await expect(
      demo.locator(
        "[data-saturation-boundary-pipeline] [data-boundary='true']",
      ),
    ).toContainText("Database pool");
    const initialHeights = await getDemoRegionHeights(demo);

    await demo.locator("[data-saturation-boundary-expand]").click();

    await expect(
      demo.locator("[data-saturation-boundary-verdict]"),
    ).toContainText("Downstream quota saturated");
    await expect(
      demo.locator("[data-saturation-boundary-metric='boundary']"),
    ).toHaveText("Quota");
    await expect(
      demo.locator("[data-saturation-boundary-artifact]"),
    ).toHaveValue(/First boundary: Downstream quota/);
    const expandedHeights = await getDemoRegionHeights(demo);
    expect(expandedHeights).toEqual(initialHeights);

    await demo
      .locator("[data-saturation-boundary-scenario]")
      .selectOption("baseline");
    await expect(
      demo.locator("[data-saturation-boundary-verdict]"),
    ).toContainText("is closest");
    const healthyHeights = await getDemoRegionHeights(demo);
    expect(healthyHeights).toEqual(initialHeights);
  });

  test("makes overload explicit when backpressure is enabled", async ({
    page,
  }) => {
    const demo = page.locator("[data-saturation-boundary-demo]");

    await demo.locator("[data-saturation-boundary-backpressure]").check();

    await expect(
      demo.locator("[data-saturation-boundary-metric='backlog']"),
    ).toHaveText("0 ev/s");
    await expect(
      demo.locator("[data-saturation-boundary-metric='rejected']"),
    ).not.toHaveText("0 ev/s");
    await expect(
      demo.locator("[data-saturation-boundary-diagnosis]"),
    ).toContainText("rejecting");
    await expect(
      demo.locator("[data-saturation-boundary-artifact]"),
    ).toHaveValue(/Ingress backpressure: enabled/);

    await expectElementsInsideDemo(demo, [
      ".saturation-boundary-instrument",
      ".saturation-boundary-readout",
      ".saturation-boundary-actions",
    ]);

    await page.setViewportSize({ width: 390, height: 844 });
    await expectElementsInsideDemo(demo, [
      ".saturation-boundary-instrument",
      ".saturation-boundary-readout",
      ".saturation-boundary-actions",
    ]);
    const demoOverflow = await demo.evaluate(
      (element) => element.scrollWidth - element.clientWidth,
    );
    expect(demoOverflow).toBeLessThanOrEqual(1);
  });
});

async function getDemoRegionHeights(demo: Locator) {
  return demo.evaluate((root) => {
    const selectors = {
      root: "[data-saturation-boundary-demo]",
      header: ".scaling-demo-header",
      controls: ".saturation-boundary-controls",
      instrument: ".saturation-boundary-instrument",
      readout: ".saturation-boundary-readout",
      actions: ".saturation-boundary-actions",
      workbench: ".saturation-boundary-workbench",
    };

    return Object.fromEntries(
      Object.entries(selectors).map(([key, selector]) => {
        const element =
          selector === "[data-saturation-boundary-demo]"
            ? root
            : root.querySelector(selector);
        return [
          key,
          element ? Math.round(element.getBoundingClientRect().height) : 0,
        ];
      }),
    );
  });
}

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
