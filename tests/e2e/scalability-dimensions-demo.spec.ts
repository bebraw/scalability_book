import { expect, test } from "@playwright/test";

test.describe("scalability dimensions demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/chapters/what-is-scalability/#scalability-dimensions-lab",
    );
    await expect(page.locator("[data-dimensions-demo]")).toBeVisible();
  });

  test("turns project pressures into a live dimension radar", async ({
    page,
  }) => {
    const demo = page.locator("[data-dimensions-demo]");

    await expect(demo.locator("[data-dimensions-demo-verdict]")).toContainText(
      "2 pressures: Demand + Data",
    );
    await expect(
      demo.locator("[data-dimensions-demo-metric='primary']"),
    ).toContainText("Demand and Data");
    await expect(
      demo.locator("[data-dimensions-demo-interpretation]"),
    ).toContainText("share the highest relative pressure");
    await expect(demo.locator(".demo-card").first()).toContainText(
      "event-oriented app",
    );
    await expect(
      demo.locator("[data-dimensions-demo-radar] svg"),
    ).toBeVisible();

    await demo
      .locator("[data-dimensions-demo-pressure][value='traffic']")
      .setChecked(false);
    await demo
      .locator("[data-dimensions-demo-pressure][value='history']")
      .setChecked(false);
    await demo
      .locator("[data-dimensions-demo-pressure][value='contributors']")
      .setChecked(true);
    await demo
      .locator("[data-dimensions-demo-pressure][value='requirements']")
      .setChecked(true);

    await expect(demo.locator("[data-dimensions-demo-radar]")).toContainText(
      "Contributors",
    );
    await expect(demo.locator("[data-dimensions-demo-radar]")).toContainText(
      "Change",
    );
    await expect(
      demo.locator("[data-dimensions-demo-metric='primary']"),
    ).toContainText("Contributors and Change");
    await expect(
      demo.locator("[data-dimensions-demo-interpretation]"),
    ).toContainText("share the highest relative pressure");
    await expect(demo.locator("[data-dimensions-demo-verdict]")).toContainText(
      "2 pressures: Contributors + Change",
    );
    await expect(
      demo.locator("[data-dimensions-demo-radar] svg"),
    ).toBeVisible();
    await expect(demo.locator("[data-dimensions-demo-tab]")).toHaveCount(0);
    await expect(demo.locator("[data-dimensions-demo-artifact]")).toHaveCount(
      0,
    );
  });

  test("normalizes every dimension to its own maximum", async ({ page }) => {
    const demo = page.locator("[data-dimensions-demo]");

    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const input of await demo
      .locator("[data-dimensions-demo-pressure]")
      .all()) {
      await input.setChecked(true);
    }

    const exposures = await demo
      .locator("[data-dimensions-demo-radar-vertex] title")
      .allTextContents();
    const verticesReachOuterRing = await demo.evaluate((node) => {
      const outer = Array.from(
        node.querySelectorAll<SVGCircleElement>(".dimensions-demo-radar-point"),
      );
      const selected = Array.from(
        node.querySelectorAll<SVGCircleElement>(
          "[data-dimensions-demo-radar-vertex]",
        ),
      );

      return selected.every(
        (vertex, index) =>
          vertex.getAttribute("cx") === outer[index]?.getAttribute("cx") &&
          vertex.getAttribute("cy") === outer[index]?.getAttribute("cy"),
      );
    });

    expect(exposures).toEqual([
      "Demand: 100% of modeled pressure",
      "Data: 100% of modeled pressure",
      "Contributors: 100% of modeled pressure",
      "Change: 100% of modeled pressure",
    ]);
    expect(verticesReachOuterRing).toBe(true);
    await expect(
      demo.locator("[data-dimensions-demo-metric='primary']"),
    ).toContainText("Demand, Data, Contributors, and Change");
  });

  test("keeps the layout stable across pressure combinations", async ({
    page,
  }) => {
    const demo = page.locator("[data-dimensions-demo]");
    const pressureInputs = demo.locator("[data-dimensions-demo-pressure]");
    const verdict = demo.locator("[data-dimensions-demo-verdict]");
    const getFormOffset = () =>
      demo.evaluate((node) => {
        const form = node.querySelector("[data-dimensions-demo-form]");

        if (!form) {
          return null;
        }

        return (
          form.getBoundingClientRect().top - node.getBoundingClientRect().top
        );
      });

    const before = await getFormOffset();
    const pressureCount = await pressureInputs.count();

    for (let mask = 0; mask < 2 ** pressureCount; mask += 1) {
      for (let index = 0; index < pressureCount; index += 1) {
        await pressureInputs
          .nth(index)
          .setChecked(Boolean(mask & (1 << index)));
      }

      const after = await getFormOffset();
      const verdictFits = await verdict.evaluate(
        (node) => node.scrollHeight <= node.clientHeight,
      );

      expect(after, `pressure mask ${mask} moved the form`).toBe(before);
      expect(verdictFits, `pressure mask ${mask} overflowed the verdict`).toBe(
        true,
      );
    }
  });
});
