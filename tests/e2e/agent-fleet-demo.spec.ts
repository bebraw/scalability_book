import { expect, test, type Locator } from "@playwright/test";

test.describe("agent fleet demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chapters/agent-fleets/#delegation-lab");
    await expect(page.locator("[data-agent-fleet]")).toBeVisible();
  });

  test("builds a delegation brief for a bounded code change", async ({
    page,
  }) => {
    const demo = page.locator("[data-agent-fleet]");

    await demo.locator("[data-agent-fleet-task]").selectOption("tests");
    await demo.locator("[data-agent-fleet-role][value='implementer']").check();
    await expect(demo.locator("[data-agent-fleet-verdict]")).toContainText(
      "4 roles, medium modeled risk",
    );
    await expect(demo.locator(".agent-fleet-grid")).toBeVisible();
    await expect(demo.locator("[data-agent-fleet-steps]")).toContainText(
      "Scout returns compressed findings",
    );
    await demo
      .locator("[data-agent-fleet-model='implementer']")
      .selectOption("small");

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
      "Implementer uses profile P",
    );

    await demo.locator(".agent-fleet-brief-step summary").click();
    const overviewTab = demo.getByRole("tab", { name: "Overview" });
    const scoutTab = demo.getByRole("tab", { name: "Scout" });
    await expect(overviewTab).toHaveAttribute("aria-selected", "true");
    await expect(overviewTab).toHaveAttribute("tabindex", "0");
    await overviewTab.focus();
    await page.keyboard.press("ArrowRight");
    await expect(scoutTab).toBeFocused();
    await expect(scoutTab).toHaveAttribute("aria-selected", "true");
    await expect(overviewTab).toHaveAttribute("tabindex", "-1");
    await expect(demo.locator("[data-agent-fleet-brief]")).toHaveValue(
      /Role:\nScout/,
    );
    await overviewTab.click();
    await expect(demo.locator("[data-agent-fleet-brief]")).toHaveValue(
      /Add regression coverage for a rejected work-item transition/,
    );
    await expect(demo.locator("[data-agent-fleet-brief]")).toHaveValue(
      /work-item transition workflow/,
    );
    await expect(demo.locator("[data-agent-fleet-brief]")).toHaveValue(
      /src\/routes\/work-items\.ts/,
    );
    await expect(demo.locator("[data-agent-fleet-brief]")).toHaveValue(
      /implementer \(Profile P\)/,
    );
    await demo.locator("[data-agent-fleet-packet-tab='scout']").click();
    await expect(demo.locator("[data-agent-fleet-brief]")).toHaveValue(
      /Role:\nScout/,
    );
    await expect(demo.locator("[data-agent-fleet-brief]")).toHaveValue(
      /Read-only inspection/,
    );
    await expect(demo.locator("[data-agent-fleet-brief]")).toHaveValue(
      /POST \/work-items\/item-42\/transitions/,
    );
    await demo.locator("[data-agent-fleet-packet-tab='implementer']").click();
    await expect(demo.locator("[data-agent-fleet-brief]")).toHaveValue(
      /Hypothetical model profile:\nProfile P/,
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
    await expectElementsInsideDemo(demo, [".agent-fleet-brief-step"]);
    await expect(demo.locator("[data-agent-fleet-step]")).toHaveCount(0);
  });

  test("keeps investigations read-only when switching from an editing task", async ({
    page,
  }) => {
    const demo = page.locator("[data-agent-fleet]");
    const target = demo.locator("[data-agent-fleet-task]");
    const implementer = demo.locator(
      "[data-agent-fleet-role][value='implementer']",
    );
    const implementerTab = demo.getByRole("tab", {
      name: "Implementer",
      exact: true,
    });
    const packet = demo.getByRole("textbox", { name: "Selected run packet" });

    await expect(demo.locator("[data-agent-fleet-verdict]")).toContainText(
      "3 roles, low modeled risk",
    );
    await expect(implementer).toBeDisabled();
    await expect(implementer).not.toBeChecked();
    await expect(
      demo.locator("[data-agent-fleet-model='implementer']"),
    ).toBeDisabled();
    await demo.locator(".agent-fleet-brief-step summary").click();
    await expect(implementerTab).toBeDisabled();
    await demo.getByRole("tab", { name: "Planner", exact: true }).click();
    await expect(packet).toHaveValue(
      /Propose one measurement.*Do not edit files\./,
    );
    await demo.getByRole("tab", { name: "Reviewer", exact: true }).click();
    await expect(packet).toHaveValue(/No code change or diff is expected/);
    await expect(packet).not.toHaveValue(/Inspect the final diff/);

    await target.selectOption("tests");
    await expect(implementer).toBeEnabled();
    await expect(implementer).not.toBeChecked();
    await implementer.check();
    await expect(implementerTab).toBeEnabled();
    await implementerTab.click();
    await expect(packet).toHaveValue(
      /Make one bounded change inside the allowed files/,
    );
    await expect(packet).toHaveValue(
      /rejected action must change neither state nor successful-event history/,
    );

    await target.selectOption("refactor");
    await expect(implementer).toBeChecked();
    await expect(packet).toHaveValue(/Improve one module boundary/);
    await expect(packet).toHaveValue(/preserve the transaction boundary/);

    await target.selectOption("bottleneck");
    await expect(implementer).toBeDisabled();
    await expect(implementer).not.toBeChecked();
    await expect(implementerTab).toBeDisabled();
    await expect(
      demo.getByRole("tab", { name: "Overview", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(packet).toHaveValue(/Files to inspect \(read-only\)/);
    await expect(packet).not.toHaveValue(/Make one bounded change/);
    await demo.getByRole("tab", { name: "Submission", exact: true }).click();
    await expect(packet).toHaveValue(
      /Reviewer challenges the bottleneck claim/,
    );
    await expect(packet).not.toHaveValue(
      /Implementer makes one bounded change|Reviewer inspected the diff/,
    );
  });

  test("shows when the project should be hardened before delegation", async ({
    page,
  }) => {
    const demo = page.locator("[data-agent-fleet]");

    await demo.locator("[data-agent-fleet-task]").selectOption("refactor");
    await demo.locator("[data-agent-fleet-readiness]").selectOption("low");
    await demo
      .locator("[data-agent-fleet-role][value='implementer']")
      .setChecked(false);
    await demo
      .locator("[data-agent-fleet-role][value='reviewer']")
      .setChecked(false);

    await expect(demo.locator("[data-agent-fleet-risk]")).toContainText("High");
    await expect(demo.locator("[data-agent-fleet-pattern]")).toContainText(
      "Harden first",
    );

    await demo.locator(".agent-fleet-brief-step summary").click();
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
