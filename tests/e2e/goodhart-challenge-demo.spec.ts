import { expect, test } from "@playwright/test";

test.describe("Goodhart coverage case", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demos/#demo-goodhart-pressure-test");
  });

  test("requires a prediction before revealing the authored outcome", async ({
    page,
  }) => {
    const demo = page.locator("[data-goodhart-demo]");
    const reveal = demo.locator("[data-goodhart-apply]");
    await expect(reveal).toBeDisabled();
    await expect(demo.locator('[data-goodhart-measure-before="0"]')).toHaveText(
      "72%",
    );
    await expect(demo.locator('[data-goodhart-measure-after="0"]')).toHaveText(
      "?",
    );
    await demo
      .getByLabel("Proxy and intended outcome improve together")
      .check();
    await reveal.click();
    await expect(demo.locator("[data-goodhart-status]")).toContainText(
      "differs from the authored case",
    );
    await expect(demo.locator('[data-goodhart-measure-after="0"]')).toHaveText(
      "96%",
    );
    await expect(demo.locator('[data-goodhart-measure-after="1"]')).toHaveText(
      "87%",
    );
    await expect(demo.locator("[data-goodhart-gaming-path]")).toContainText(
      "shallow tests",
    );
    await expect(demo.locator("[data-goodhart-test]")).toBeDisabled();
  });

  test("keeps the assessment authored and invalidates it when the proposal changes", async ({
    page,
  }) => {
    const demo = page.locator("[data-goodhart-demo]");
    await demo.getByLabel("Proxy improves while the outcome degrades").check();
    await demo.locator("[data-goodhart-apply]").click();
    await demo
      .locator('input[name="goodhart-safeguard"][value="more-pressure"]')
      .check();
    await demo
      .getByRole("button", { name: "Reveal the case assessment" })
      .click();
    await expect(demo.locator("[data-goodhart-debrief]")).toContainText(
      "leaves the gaming path open",
    );
    await expect(demo.locator("[data-goodhart-artifact]")).toHaveValue(
      /Chosen proposal: Raise the target to 99%/,
    );

    await demo
      .locator('input[name="goodhart-safeguard"][value="paired"]')
      .check();
    await expect(demo.locator("[data-goodhart-debrief]")).toBeHidden();
    await expect(demo.locator("[data-goodhart-artifact]")).toHaveValue("");
    await demo
      .getByRole("button", { name: "Reveal the case assessment" })
      .click();
    await expect(demo.locator("[data-goodhart-gate-result]")).toHaveText(
      "CASE ASSESSMENT",
    );
    await expect(demo.locator("[data-goodhart-debrief]")).toContainText(
      "still needs executed checks",
    );
    await expect(demo.locator("[data-goodhart-artifact]")).toHaveValue(
      /No model, revised gate or acceptance check was executed/,
    );
    await expect(
      demo.getByRole("link", {
        name: "concern-directed mutation lab",
        exact: true,
      }),
    ).toHaveAttribute("href", "/downloads/labs/concern-directed-mutation.zip");
  });

  test("resets prediction, outcome and assessment on a narrow screen", async ({
    page,
  }) => {
    const demo = page.locator("[data-goodhart-demo]");
    await page.setViewportSize({ width: 390, height: 844 });
    await demo.getByLabel("Proxy improves while the outcome degrades").check();
    await demo.locator("[data-goodhart-apply]").click();
    await demo
      .locator('input[name="goodhart-safeguard"][value="selective"]')
      .check();
    await demo.locator("[data-goodhart-test]").click();
    await expect(demo.locator("[data-goodhart-debrief]")).toContainText(
      "hide shallow assertions",
    );
    const overflow = await demo.evaluate((root) => ({
      demo: root.scrollWidth - root.clientWidth,
      page: document.documentElement.scrollWidth - innerWidth,
    }));
    expect(overflow.demo).toBeLessThanOrEqual(1);
    expect(overflow.page).toBeLessThanOrEqual(1);
    await demo.getByRole("button", { name: "Reset the case" }).click();
    await expect(demo.locator("[data-goodhart-repair]")).toBeHidden();
    await expect(demo.locator("[data-goodhart-artifact]")).toHaveValue("");
    await expect(demo.locator('[data-goodhart-measure-after="0"]')).toHaveText(
      "?",
    );
    await expect(demo.locator("[data-goodhart-apply]")).toBeDisabled();
    await demo
      .getByLabel("Proxy and intended outcome improve together")
      .check();
    await expect(demo.locator("[data-goodhart-apply]")).toBeEnabled();
  });
});
