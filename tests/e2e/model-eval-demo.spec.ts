import { expect, test, type Locator } from "@playwright/test";

test.describe("model eval demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demos/#demo-model-evaluation-lab");
    await expect(page.locator("[data-model-eval]")).toBeVisible();
  });

  test("loads the default task and scores both attempts", async ({ page }) => {
    const demo = page.locator("[data-model-eval]");

    await expect(demo.locator("[data-model-eval-step='0']")).toBeVisible();
    await expect(demo.locator("[data-model-eval-verdict]")).toContainText(
      "Paste outputs to score",
    );

    await demo.locator("[data-model-eval-next]").click();
    await expect(demo.locator("[data-model-eval-prompt]")).toHaveValue(
      /Find one likely scaling bottleneck/,
    );

    await demo.locator("[data-model-eval-next]").click();
    await demo.locator("[data-model-eval-sample='y']").click();
    await expect(demo.locator("[data-model-eval-conclusion]")).toHaveText(
      /Paste both model outputs/,
    );
    await demo.locator("[data-model-eval-sample='x']").click();
    await expect(demo.locator("[data-model-output='x']")).toHaveValue(
      /created_at/,
    );
    await expect(demo.locator(".model-eval-help")).toHaveCount(6);
    await demo.locator(".model-eval-help").first().focus();
    await expect(demo.getByRole("tooltip").first()).toContainText(
      "clearly uses the supplied context",
    );
    await expect(demo.locator("[data-model-card='x']")).toBeInViewport();
    await expect(demo.locator("[data-model-card='y']")).toBeInViewport();

    await demo.locator("[data-model-eval-next]").click();
    await expect(demo.locator("[data-model-eval-verdict]")).toContainText(
      "Attempt X: 6/6",
    );
    await expect(demo.locator("[data-model-eval-results]")).toContainText(
      "Attempt Y",
    );
    await expectElementsInsideDemo(demo, [
      "[data-model-eval-results]",
      ".model-eval-note",
    ]);
    await expect(demo.locator("[data-model-eval-next]")).toBeDisabled();
    await expect(demo).toContainText("Illustrative cost");
  });

  test("updates task, score, checks, and local conclusion", async ({
    page,
  }) => {
    const demo = page.locator("[data-model-eval]");

    await demo.locator("[data-model-eval-task]").selectOption("benchmark");
    await expect(demo.locator("[data-model-eval-prompt]")).toHaveValue(
      /Propose one benchmark plan/,
    );

    await demo.locator("[data-model-eval-tab='2']").click();
    await demo.locator("[data-model-eval-sample='x']").click();
    await demo.locator("[data-model-eval-sample='y']").click();
    await demo.locator("[data-model='y'][data-rubric='specificity']").fill("2");

    await demo.locator("[data-model-eval-tab='3']").click();
    await demo.locator("[data-model-eval-check='file']").setChecked(false);

    await expect(demo.locator("[data-model-eval-verdict]")).toContainText(
      "Attempt X: 6/6",
    );
    await expect(demo.locator("[data-model-eval-results]")).toContainText(
      "4/6",
    );
    await expect(demo.locator("[data-model-eval-conclusion]")).toContainText(
      "scores higher",
    );
    await expect(demo.locator("[data-model-eval-conclusion]")).toContainText(
      "Complete the comparison protocol",
    );

    // A lower score for X can reverse the result; the attempt label is not a rank.
    await demo.locator("[data-model-eval-tab='2']").click();
    await demo.locator("[data-model='x'][data-rubric='grounding']").fill("0");
    await demo.locator("[data-model='x'][data-rubric='specificity']").fill("0");
    await demo.locator("[data-model-eval-tab='3']").click();
    await expect(demo.locator("[data-model-eval-verdict]")).toContainText(
      "Attempt Y: 4/6",
    );
  });
});

async function expectElementsInsideDemo(demo: Locator, selectors: string[]) {
  const overflow = await demo.evaluate(
    (root: HTMLElement, checkedSelectors: string[]) => {
      const rootRect = root.getBoundingClientRect();

      return checkedSelectors.flatMap((selector) =>
        Array.from(root.querySelectorAll(selector)).flatMap((element) => {
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
