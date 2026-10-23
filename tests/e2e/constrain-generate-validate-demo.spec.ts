import { expect, test } from "@playwright/test";

test.describe("constrain, generate, validate demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/chapters/scalable-development/#demo-constraint-feedback-loop",
    );
    await expect(page.locator("[data-cgv-demo]")).toBeVisible();
  });

  test("turns failed validation into an explicit revision for the next round", async ({
    page,
  }) => {
    const demo = page.locator("[data-cgv-demo]");
    const action = demo.locator("[data-cgv-action]");

    await action.click();
    await expect(demo.locator("[data-cgv-candidate-title]")).toContainText(
      "ready for simulated checks",
    );
    await expect(demo.locator("[data-cgv-stage='generate']")).toHaveClass(
      /is-current/,
    );
    await expect(demo.locator("[data-cgv-candidate]")).toContainText(
      "shared/csv.ts",
    );
    await expect(demo.locator("[data-cgv-candidate]")).toContainText(
      "Build, measure, learn,Main hall",
    );

    await action.click();
    await expect(demo.locator(".cgv-checks .is-pass")).toHaveCount(1);
    await expect(demo.locator(".cgv-checks .is-fail")).toHaveCount(2);
    await expect(demo.locator("[data-cgv-status]")).toContainText(
      "2 simulated checks failed",
    );
    await expect(demo.locator('[data-cgv-check="acceptance"]')).toContainText(
      "split into three fields",
    );

    await action.click();
    await expect(demo.locator("[data-cgv-stage='revise']")).toHaveClass(
      /is-current/,
    );
    await expect(demo.locator("[data-cgv-status]")).toContainText(
      "revise project memory",
    );
    await expect(demo.locator("[data-cgv-candidate]")).toContainText(
      "Project memory · proposed revision",
    );
    await expect(demo.locator("[data-cgv-candidate]")).toContainText(
      "preserve fields containing commas or quotes",
    );

    await action.click();
    await expect(
      demo.locator('[data-cgv-constraint=""][value="scope"]'),
    ).toBeChecked();
    await expect(
      demo.locator('[data-cgv-constraint=""][value="acceptance"]'),
    ).toBeChecked();
    await expect(demo.locator("[data-cgv-round]")).toHaveText("Round 2");
    await expect(demo).toHaveClass(/is-cgv-looping/);

    await action.click();
    await expect(demo.locator("[data-cgv-candidate]")).toContainText(
      "events/export.ts",
    );
    await expect(demo.locator("[data-cgv-candidate] pre")).toContainText(
      '"Build, measure, learn",Main hall',
    );
    await action.click();
    await expect(demo.locator(".cgv-checks .is-pass")).toHaveCount(3);
    await expect(demo.locator(".cgv-checks .is-fail")).toHaveCount(0);
    await expect(demo.locator("[data-cgv-status]")).toContainText(
      "all simulated checks pass",
    );

    await action.click();
    await expect(action).toBeDisabled();
    await expect(demo.locator("[data-cgv-status]")).toContainText(
      "loop complete",
    );
    await expect(demo.locator("[data-cgv-reading]")).toContainText(
      "authored example CSV",
    );
    await expect(demo).not.toHaveClass(/is-cgv-looping/);
    const downloadButton = demo.locator("[data-cgv-download]");
    await expect(downloadButton).toBeEnabled();
    const downloadPromise = page.waitForEvent("download");
    await downloadButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("events.csv");
  });

  test("can succeed in one round when the boundary is explicit", async ({
    page,
  }) => {
    const demo = page.locator("[data-cgv-demo]");
    const action = demo.locator("[data-cgv-action]");

    for (const constraint of await demo
      .locator("[data-cgv-constraint]")
      .all()) {
      await constraint.check();
    }
    await action.click();
    await action.click();

    await expect(demo.locator(".cgv-checks .is-pass")).toHaveCount(3);
    await expect(demo.locator("[data-cgv-round]")).toHaveText("Round 1");
    await expect(demo.locator("[data-cgv-candidate]")).toContainText(
      "Blob + URL.createObjectURL",
    );
  });

  test("labels scripted checks without claiming an unperformed download", async ({
    page,
  }) => {
    const demo = page.locator("[data-cgv-demo]");
    await demo.locator("[data-cgv-action]").click();
    await demo.locator("[data-cgv-action]").click();
    await expect(demo.locator("[data-cgv-download]")).toBeDisabled();
    await expect(demo.locator('[data-cgv-check="platform"]')).not.toContainText(
      "the click emitted",
    );
    await expect(demo.locator('[data-cgv-check="platform"]')).toContainText(
      "Simulated",
    );
    await expect(
      demo.getByRole("link", { name: "CSV starter lab" }),
    ).toHaveAttribute("href", "/downloads/labs/csv-export.zip");
  });

  test("uses the active theme accent", async ({ page }) => {
    const demo = page.locator("[data-cgv-demo]");

    for (const theme of ["light", "dark", "sepia", "contrast", "calm"]) {
      await page.locator("[data-theme-picker]").selectOption(theme);
      const matches = await demo.evaluate((element) => {
        const probe = document.createElement("span");
        probe.style.color = "var(--accent)";
        element.append(probe);
        const accent = getComputedStyle(probe).color;
        probe.remove();
        return (
          getComputedStyle(element.querySelector("[data-cgv-action]")!)
            .backgroundColor === accent
        );
      });
      expect(matches).toBe(true);
    }
  });
});
