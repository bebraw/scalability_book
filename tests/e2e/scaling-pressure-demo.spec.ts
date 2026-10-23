import { expect, test, type Locator } from "@playwright/test";

test.describe("scaling pressure demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chapters/scaling/#scaling-pressure-lab");
    await expect(page.locator("[data-scaling-demo]")).toBeVisible();
  });

  test("walks from pressure to exported trade-off table", async ({ page }) => {
    const demo = page.locator("[data-scaling-demo]");

    await expect(demo.locator("[data-scaling-demo-verdict]")).toContainText(
      "3 candidate moves",
    );
    await expect(demo.locator(".scaling-pressure-grid")).toBeVisible();
    await expect(demo.locator("[data-scaling-demo-context]")).toHaveValue(
      /20,000 valid work-item creations and lifecycle transitions/,
    );

    await demo
      .locator("[data-scaling-demo-technique][value='cache']")
      .setChecked(true);
    await expect(
      demo.locator("[data-scaling-demo-recommendations]"),
    ).toContainText("Burst writes");

    await expect(demo.locator("[data-scaling-demo-pipeline]")).toContainText(
      "short-lived cache",
    );
    await expect(demo.locator("[data-scaling-demo-metric]")).toHaveCount(0);
    await expect(
      demo.locator("[data-scaling-demo-interpretation]"),
    ).toContainText("Each move is a hypothesis");
    await expect(
      demo.locator("[data-scaling-demo-waterbed-summary]"),
    ).toContainText("4 moves add new operating obligations");
    await expect(demo.locator("[data-scaling-demo-waterbed]")).toContainText(
      "Invalidation, freshness budgets",
    );
    await expect(demo.locator("[data-scaling-demo-waterbed]")).toContainText(
      "Backlog, retries, idempotency",
    );

    await demo.locator(".scaling-demo-artifact-step summary").click();
    await expect(demo.locator("[data-scaling-demo-artifact]")).toHaveValue(
      /Scaling Trade-off Table/,
    );
    await expect(demo.locator("[data-scaling-demo-artifact]")).toHaveValue(
      /Queue derived summary work/,
    );
    await expect(demo.locator("[data-scaling-demo-artifact]")).toHaveValue(
      /Cache dashboard reads/,
    );
    await expect(demo.locator("[data-scaling-demo-artifact]")).toHaveValue(
      /Complexity moved to/,
    );
    await expect(demo.locator("[data-scaling-demo-artifact]")).toHaveValue(
      /where did the displaced complexity reappear/,
    );
    await expect(demo.locator("[data-scaling-demo-artifact]")).not.toHaveValue(
      /Write relief|Read relief|Pressure scores|Freshness risk/,
    );
    await expectElementsInsideDemo(demo, [".scaling-demo-artifact-step"]);
    await expect(demo.locator("[data-scaling-demo-step]")).toHaveCount(0);
  });

  test("updates pressure and recommendations for a different scenario", async ({
    page,
  }) => {
    const demo = page.locator("[data-scaling-demo]");

    await demo.locator("[data-scaling-demo-scenario]").selectOption("tenants");
    await expect(demo.locator("[data-scaling-demo-context]")).toHaveValue(
      /One busy workspace creates and advances many work items/,
    );
    await expect(
      demo.locator("[data-scaling-demo-pressure='tenants']"),
    ).toBeChecked();

    await expect(
      demo.locator("[data-scaling-demo-recommendations]"),
    ).toContainText("Tenant isolation");
    await demo
      .locator("[data-scaling-demo-technique][value='partition']")
      .setChecked(true);

    await expect(demo.locator("[data-scaling-demo-pipeline]")).toContainText(
      "partition that keeps its work-item and activity-event commit together",
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
