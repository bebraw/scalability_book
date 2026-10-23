import { expect, test } from "@playwright/test";

test.describe("scalability law labs", () => {
  test("shows Amdahl's sequential ceiling", async ({ page }) => {
    await page.goto("/demos/#demo-sequential-work-bound");
    const demo = page.locator("[data-amdahl-law-demo]");

    await expect(demo.locator('[data-amdahl-law-metric="speedup"]')).toHaveText(
      "2.50×",
    );
    await expect(demo.locator('[data-amdahl-law-metric="ceiling"]')).toHaveText(
      "5.00×",
    );
    const sequentialSegment = await demo
      .locator("[data-amdahl-sequential]")
      .boundingBox();
    const parallelSegment = await demo
      .locator("[data-amdahl-parallel]")
      .boundingBox();
    expect(sequentialSegment?.width).toBeGreaterThan(40);
    expect(parallelSegment?.width).toBeCloseTo(sequentialSegment!.width, 0);

    await demo.locator('[data-amdahl-law-input="agents"]').fill("16");
    await expect(demo.locator('[data-amdahl-law-metric="speedup"]')).toHaveText(
      "4.00×",
    );
    await expect(demo.locator("[data-amdahl-law-reading]")).toContainText(
      "sequential 20% remains",
    );
  });

  test("separates detected errors from recovered workflow completion", async ({
    page,
  }) => {
    await page.goto("/demos/#demo-reliability-chain-lab");
    const demo = page.locator("[data-lusser-law-demo]");

    await expect(demo.locator('[data-lusser-law-metric="step"]')).toHaveText(
      "99.500%",
    );
    await expect(demo.locator('[data-lusser-law-metric="correct"]')).toHaveText(
      "60.6%",
    );
    await expect(demo.locator('[data-lusser-law-metric="stopped"]')).toHaveText(
      "0.0%",
    );
    await expect(demo.locator("[data-lusser-chart]")).toHaveAttribute(
      "aria-label",
      /At 100 steps, correct completion is 60\.6%/,
    );

    await demo.locator('[data-lusser-preset="detected"]').click();
    await expect(
      demo.locator('[data-lusser-law-output="recovery"]'),
    ).toHaveText("0%");
    await expect(demo.locator('[data-lusser-law-metric="correct"]')).toHaveText(
      "35.8%",
    );
    await expect(demo.locator('[data-lusser-law-metric="stopped"]')).toHaveText(
      "57.7%",
    );
    await expect(demo.locator('[data-lusser-law-metric="wrong"]')).toHaveText(
      "6.4%",
    );
    await expect(demo.locator("[data-lusser-law-reading]")).toContainText(
      "stop safely",
    );
  });

  test("finds the declining side of a USL capacity curve", async ({ page }) => {
    await page.goto("/demos/#demo-contention-curve-lab");
    const demo = page.locator("[data-usl-demo]");

    await expect(demo.locator('[data-usl-metric="peak-n"]')).toHaveText("22");
    await demo.locator('[data-usl-input="concurrency"]').fill("28");
    await expect(demo.locator("[data-usl-verdict]")).toContainText(
      "reduces capacity",
    );
    await expect(demo.locator('[data-usl-metric="next"]')).toHaveText("hurts");
    await expect(demo.locator("[data-usl-chart]")).toHaveAttribute(
      "aria-label",
      /Peak is/,
    );
  });

  test("inherits the current book theme", async ({ page }) => {
    await page.goto("/demos/#demo-contention-curve-lab");
    const demo = page.locator("[data-usl-demo]");

    for (const theme of ["light", "dark", "sepia", "contrast", "calm"]) {
      await page.locator("[data-theme-picker]").selectOption(theme);
      const usesThemeAccent = await demo.evaluate((element) => {
        const probe = document.createElement("span");
        probe.style.color = "var(--accent-strong)";
        element.append(probe);
        const expected = getComputedStyle(probe).color;
        probe.remove();
        return (
          getComputedStyle(element.querySelector("[data-usl-chart]")!).color ===
          expected
        );
      });
      expect(usesThemeAccent).toBe(true);
    }
  });
});
