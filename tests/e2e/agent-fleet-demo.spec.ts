import { expect, test, type Locator } from "@playwright/test";

test.describe("agent fleet demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chapters/agent-fleets/#delegation-lab");
    await expect(page.locator("[data-agent-fleet]")).toBeVisible();
  });

  test("builds a default delegation brief", async ({ page }) => {
    const demo = page.locator("[data-agent-fleet]");

    await expect(demo.locator("[data-agent-fleet-verdict]")).toContainText(
      "4 roles, medium risk",
    );
    await expect(demo.locator("[data-agent-fleet-step='0']")).toBeVisible();

    await demo.locator("[data-agent-fleet-next]").click();
    await expect(demo.locator("[data-agent-fleet-step='1']")).toBeVisible();

    await demo.locator("[data-agent-fleet-next]").click();
    await expect(demo.locator("[data-agent-fleet-step='2']")).toBeVisible();
    await demo
      .locator("[data-agent-fleet-model='implementer']")
      .selectOption("small");

    await demo.locator("[data-agent-fleet-next]").click();
    await expect(demo.locator("[data-agent-fleet-step='3']")).toBeVisible();
    await expect(demo.locator("[data-agent-fleet-coordination]")).toContainText(
      "6/10",
    );
    await expect(demo.locator("[data-agent-fleet-risk]")).toContainText("High");
    await expect(demo.locator("[data-agent-fleet-pattern]")).toContainText(
      "Single agent",
    );
    await expect(demo.locator("[data-agent-fleet-model-cost]")).toContainText(
      "1.10 EUR",
    );
    await expect(demo.locator("[data-agent-fleet-review-time]")).toContainText(
      "43 min",
    );
    await expect(demo.locator("[data-agent-fleet-rework]")).toContainText(
      "Medium",
    );
    await expect(demo.locator("[data-agent-fleet-model-impact]")).toContainText(
      "Implementer uses a small model",
    );

    await demo.locator("[data-agent-fleet-next]").click();
    await expect(demo.locator("[data-agent-fleet-step='4']")).toBeVisible();
    await expect(demo.locator("[data-agent-fleet-brief]")).toHaveValue(
      /Identify one likely bottleneck/,
    );
    await expect(demo.locator("[data-agent-fleet-brief]")).toHaveValue(
      /event-tracker API/,
    );
    await expect(demo.locator("[data-agent-fleet-brief]")).toHaveValue(
      /src\/routes\/events\.ts/,
    );
    await expect(demo.locator("[data-agent-fleet-brief]")).toHaveValue(
      /implementer \(Small model\)/,
    );
    await demo.locator("[data-agent-fleet-packet-tab='scout']").click();
    await expect(demo.locator("[data-agent-fleet-brief]")).toHaveValue(
      /Role:\nScout/,
    );
    await expect(demo.locator("[data-agent-fleet-brief]")).toHaveValue(
      /Read-only inspection/,
    );
    await expect(demo.locator("[data-agent-fleet-brief]")).toHaveValue(
      /GET \/events runs SELECT/,
    );
    await demo.locator("[data-agent-fleet-packet-tab='implementer']").click();
    await expect(demo.locator("[data-agent-fleet-brief]")).toHaveValue(
      /Recommended model:\nSmall/,
    );
    await expect(demo.locator("[data-agent-fleet-brief]")).toHaveValue(
      /Validation command:/,
    );
    await demo.locator("[data-agent-fleet-packet-tab='submission']").click();
    await expect(demo.locator("[data-agent-fleet-brief]")).toHaveValue(
      /Agent Fleet Submission Note/,
    );
    await expect(demo.locator("[data-agent-fleet-brief]")).toHaveValue(
      /What the fleet missed/,
    );
    await expect(demo.locator("[data-agent-fleet-next]")).toBeDisabled();
    await expectElementsInsideDemo(demo, [".agent-fleet-brief-step"]);
  });

  test("shows when the project should be hardened before delegation", async ({
    page,
  }) => {
    const demo = page.locator("[data-agent-fleet]");

    await demo.locator("[data-agent-fleet-readiness]").selectOption("low");
    await demo.locator("[data-agent-fleet-size]").fill("5");
    await demo.locator("[data-agent-fleet-tab='1']").click();
    await demo
      .locator("[data-agent-fleet-role][value='implementer']")
      .setChecked(false);
    await demo
      .locator("[data-agent-fleet-role][value='reviewer']")
      .setChecked(false);

    await demo.locator("[data-agent-fleet-tab='3']").click();
    await expect(demo.locator("[data-agent-fleet-risk]")).toContainText("High");
    await expect(demo.locator("[data-agent-fleet-pattern]")).toContainText(
      "Harden first",
    );

    await demo.locator("[data-agent-fleet-tab='4']").click();
    await expect(demo.locator("[data-agent-fleet-brief]")).toHaveValue(
      /Project readiness:\nlow/,
    );
    await expect(
      demo.locator("[data-agent-fleet-packet-tab='implementer']"),
    ).toBeDisabled();
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
