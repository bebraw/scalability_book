import { expect, test, type Locator } from "@playwright/test";

test.describe("scaling pressure demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chapters/scaling/#scaling-pressure-lab");
    await expect(page.locator("[data-scaling-demo]")).toBeVisible();
  });

  test("walks from pressure to exported trade-off table", async ({ page }) => {
    const demo = page.locator("[data-scaling-demo]");

    await expect(demo.locator("[data-scaling-demo-verdict]")).toContainText(
      "3 moves",
    );
    await expect(demo.locator("[data-scaling-demo-step='0']")).toBeVisible();
    await expect(demo.locator("[data-scaling-demo-context]")).toHaveValue(
      /20,000 check-in events/,
    );

    await demo.locator("[data-scaling-demo-next]").click();
    await expect(demo.locator("[data-scaling-demo-step='1']")).toBeVisible();
    await demo
      .locator("[data-scaling-demo-technique][value='cache']")
      .setChecked(true);
    await expect(
      demo.locator("[data-scaling-demo-recommendations]"),
    ).toContainText("Write pressure is high");

    await demo.locator("[data-scaling-demo-next]").click();
    await expect(demo.locator("[data-scaling-demo-step='2']")).toBeVisible();
    await expect(demo.locator("[data-scaling-demo-pipeline]")).toContainText(
      "short-lived cache",
    );
    await expect(
      demo.locator("[data-scaling-demo-metric='freshness']"),
    ).toContainText("Medium");
    await expect(
      demo.locator("[data-scaling-demo-interpretation]"),
    ).toContainText("freshness budget");

    await demo.locator("[data-scaling-demo-next]").click();
    await expect(demo.locator("[data-scaling-demo-step='3']")).toBeVisible();
    await expect(demo.locator("[data-scaling-demo-artifact]")).toHaveValue(
      /Scaling Trade-off Table/,
    );
    await expect(demo.locator("[data-scaling-demo-artifact]")).toHaveValue(
      /Queue ingestion/,
    );
    await expect(demo.locator("[data-scaling-demo-artifact]")).toHaveValue(
      /Cache dashboard reads/,
    );
    await expect(demo.locator("[data-scaling-demo-next]")).toBeDisabled();
    await expectElementsInsideDemo(demo, [".scaling-demo-artifact-step"]);
  });

  test("updates pressure and recommendations for a different scenario", async ({
    page,
  }) => {
    const demo = page.locator("[data-scaling-demo]");

    await demo.locator("[data-scaling-demo-scenario]").selectOption("tenants");
    await expect(demo.locator("[data-scaling-demo-context]")).toHaveValue(
      /One large project imports historical events/,
    );
    await expect(
      demo.locator("[data-scaling-demo-output='tenants']"),
    ).toContainText("5");

    await demo.locator("[data-scaling-demo-tab='1']").click();
    await expect(
      demo.locator("[data-scaling-demo-recommendations]"),
    ).toContainText("Tenant pressure is high");
    await demo
      .locator("[data-scaling-demo-technique][value='partition']")
      .setChecked(true);

    await demo.locator("[data-scaling-demo-tab='2']").click();
    await expect(demo.locator("[data-scaling-demo-pipeline]")).toContainText(
      "project partition",
    );
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
