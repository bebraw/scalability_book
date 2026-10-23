import { expect, test, type Locator } from "@playwright/test";

test.describe("latency budget demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chapters/scaling/#latency-budget-lab");
    await expect(page.locator("[data-latency-demo]")).toBeVisible();
  });

  test("compares sequential and batched paths with explicit timings", async ({
    page,
  }) => {
    const demo = page.locator("[data-latency-demo]");
    await expect(demo.locator('[data-latency-demo-metric="total"]')).toHaveText(
      "75 ms",
    );
    await expect(
      demo.locator('[data-latency-demo-metric="userFloor"]'),
    ).toHaveText("5.0 ms");
    await expect(demo.locator(".latency-demo-source")).toContainText(
      "BlankMap-World.svg",
    );
    await expectNoOverlap(demo, ".latency-demo-map-label", [
      ".latency-demo-node-user",
      ".latency-demo-node-app",
      ".latency-demo-node-db",
    ]);
    await demo
      .locator('[data-latency-demo-distance="appDb"]')
      .selectOption("500");
    await expect(demo.locator('[data-latency-demo-metric="total"]')).toHaveText(
      "117 ms",
    );
    await expect(
      demo.locator('[data-latency-demo-metric="batchedTotal"]'),
    ).toHaveText("89 ms");
    await expect(
      demo.locator('[data-latency-demo-metric="sequentialDb"]'),
    ).toHaveText("90 ms");
    await demo.locator("[data-latency-demo-db-exec]").fill("30");
    await demo.locator("[data-latency-demo-app-work]").fill("55");
    await expect(
      demo.locator('[data-latency-demo-metric="serverExecution"]'),
    ).toHaveText("235 ms");
    await demo.locator("[data-latency-demo-db-roundtrips]").fill("10");
    await expect(
      demo.locator('[data-latency-demo-metric="roundtripPenalty"]'),
    ).toHaveText("56 ms");
    await expect(
      demo.locator("[data-latency-demo-interpretation]"),
    ).toContainText("56 ms of repeated database network wait");
    await expect(
      demo.locator("[data-latency-demo-interpretation]"),
    ).toContainText("identical results");
    await demo.locator("[data-latency-demo-db-roundtrips]").fill("1");
    await expect(
      demo.locator('[data-latency-demo-metric="roundtripPenalty"]'),
    ).toHaveText("0.0 ms");
    await expectElementsInsideDemo(demo, [".scaling-demo-tradeoff-step"]);
  });

  test("makes intercontinental user distance visible", async ({ page }) => {
    const demo = page.locator("[data-latency-demo]");

    await demo
      .locator("[data-latency-demo-distance='userApp']")
      .selectOption("7000");
    await expect(
      demo.locator("[data-latency-demo-metric='userFloor']"),
    ).toContainText("70 ms");
    await expect(
      demo.locator("[data-latency-demo-map='userDistance']"),
    ).toContainText("7,000 km");
    await expect(
      demo.locator("[data-latency-demo-node='user']"),
    ).toHaveAttribute("transform", "translate(132 102)");

    await expect(
      demo.locator("[data-latency-demo-metric='physical']"),
    ).toContainText("70 ms");
    await expect(
      demo.locator("[data-latency-demo-interpretation]"),
    ).toContainText("user-to-application network wait is 98 ms");
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

async function expectNoOverlap(
  demo: Locator,
  labelSelector: string,
  targetSelectors: string[],
) {
  const overlaps = await demo.evaluate(
    (
      root: HTMLElement,
      {
        labelSelector,
        targetSelectors,
      }: { labelSelector: string; targetSelectors: string[] },
    ) => {
      const labels = Array.from(root.querySelectorAll(labelSelector));
      const targets = targetSelectors.flatMap((selector) =>
        Array.from(root.querySelectorAll(selector)).map((element) => ({
          selector,
          element,
        })),
      );

      return labels.flatMap((label, labelIndex) => {
        const labelRect = label.getBoundingClientRect();

        return targets.flatMap(({ selector, element }) => {
          const targetRect = element.getBoundingClientRect();
          const intersects =
            labelRect.left < targetRect.right &&
            labelRect.right > targetRect.left &&
            labelRect.top < targetRect.bottom &&
            labelRect.bottom > targetRect.top;

          return intersects
            ? [
                {
                  labelIndex,
                  selector,
                  labelRect,
                  targetRect,
                },
              ]
            : [];
        });
      });
    },
    { labelSelector, targetSelectors },
  );

  expect(overlaps).toEqual([]);
}
