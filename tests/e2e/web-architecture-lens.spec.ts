import { expect, test } from "@playwright/test";

test.describe("web architecture lens", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chapters/architecture/#web-architecture-lens");
    await expect(page.locator("[data-architecture-lens]")).toBeVisible();
  });

  test("separates delivery from interaction and composes all nine cases", async ({
    page,
  }) => {
    const demo = page.locator("[data-architecture-lens]");

    await expect(demo.locator("[data-architecture-lens-title]")).toHaveText(
      "SSR + MPA",
    );
    await expect(
      demo.locator('[data-architecture-lens-fact="transition"]'),
    ).toContainText("complete HTML");

    await demo
      .locator('[data-architecture-lens-delivery][value="isr"]')
      .check();
    await demo
      .locator('[data-architecture-lens-interaction][value="hda"]')
      .check();

    await expect(demo.locator("[data-architecture-lens-title]")).toHaveText(
      "ISR + HDA",
    );
    await expect(
      demo.locator("[data-architecture-lens-summary]"),
    ).toContainText("initial document");
    await expect(demo.locator("[data-architecture-lens-trace]")).toContainText(
      "Edge cache",
    );
    await expect(demo.locator("[data-architecture-lens-trace]")).toContainText(
      "HTML fragment",
    );
    await expect(
      demo.locator(".architecture-sequence-participant"),
    ).toHaveCount(4);
    await expect(demo.locator("[data-architecture-lens-step]")).toHaveCount(10);
    await expect(
      demo.locator(".architecture-sequence-phase--load"),
    ).toContainText("Initial document");
    await expect(
      demo.locator(".architecture-sequence-phase--action"),
    ).toContainText("Record event");
  });

  test("animates an event request and explains the resulting update", async ({
    page,
  }) => {
    const demo = page.locator("[data-architecture-lens]");
    const draft = demo.locator("[data-architecture-lens-draft]");

    await demo
      .locator('[data-architecture-lens-interaction][value="hda"]')
      .check();
    await draft.fill("Keep my unsaved note");
    const stepCount = await demo
      .locator("[data-architecture-lens-step]")
      .count();
    await demo.locator("[data-architecture-lens-run]").click();

    await expect(demo.locator("[data-added-event]")).toContainText(
      "Architecture study",
      { timeout: 5_000 },
    );
    await expect(
      demo.locator(".architecture-lens-browser-status"),
    ).toContainText("local draft stayed");
    await expect(draft).toHaveValue("Keep my unsaved note");
    await expect(
      demo.locator("[data-architecture-lens-step].is-complete"),
    ).toHaveCount(stepCount);
    await expect(demo.locator("[data-added-event]")).toHaveCount(1);
    await expect(
      demo.locator("[data-architecture-lens-transfer-label]"),
    ).toHaveText("≈1.2 KB");

    await demo.locator("[data-architecture-lens-run]").click();
    await expect(demo.locator("[data-architecture-lens-run]")).toBeDisabled();
    await expect(demo.locator("[data-architecture-lens-run]")).toBeEnabled({
      timeout: 5_000,
    });
    await expect(demo.locator("[data-added-event]")).toHaveCount(1);
  });

  test("replaces the document and resets unsaved state for MPA", async ({
    page,
  }) => {
    const demo = page.locator("[data-architecture-lens]");
    const draft = demo.locator("[data-architecture-lens-draft]");

    await draft.fill("This exists only in the DOM");
    await demo.locator("[data-architecture-lens-run]").click();

    await expect(demo.locator("[data-added-event]")).toHaveCount(1, {
      timeout: 5_000,
    });
    await expect(draft).toHaveValue("");
    await expect(
      demo.locator(".architecture-lens-browser-status"),
    ).toContainText("DOM state reset");
  });

  test("compares interaction cost across every combination", async ({
    page,
  }) => {
    const demo = page.locator("[data-architecture-lens]");
    const combinations = [
      ["ssr", "mpa", "2", "Complete HTML", "Whole document", "Reset", "≈18 KB"],
      ["isr", "mpa", "2", "Complete HTML", "Whole document", "Reset", "≈18 KB"],
      [
        "csr",
        "mpa",
        "3",
        "Shell + JS + JSON",
        "Whole document",
        "Reset",
        "≈5 KB warm / ≈50 KB cold",
      ],
      [
        "ssr",
        "hda",
        "1",
        "HTML fragment",
        "#activity-list only",
        "Preserved",
        "≈1.2 KB",
      ],
      [
        "isr",
        "hda",
        "1",
        "HTML fragment",
        "#activity-list only",
        "Preserved",
        "≈1.2 KB",
      ],
      [
        "csr",
        "hda",
        "1",
        "HTML fragment",
        "#activity-list only",
        "Preserved",
        "≈1.2 KB",
      ],
      [
        "ssr",
        "spa",
        "1",
        "JSON delta",
        "Client state + affected UI",
        "Preserved",
        "≈0.8 KB",
      ],
      [
        "isr",
        "spa",
        "1",
        "JSON delta",
        "Client state + affected UI",
        "Preserved",
        "≈0.8 KB",
      ],
      [
        "csr",
        "spa",
        "1",
        "JSON delta",
        "Client state + affected UI",
        "Preserved",
        "≈0.8 KB",
      ],
    ] as const;

    for (const [
      delivery,
      interaction,
      requests,
      artifact,
      scope,
      state,
      transfer,
    ] of combinations) {
      await demo
        .locator(`[data-architecture-lens-delivery][value="${delivery}"]`)
        .check();
      await demo
        .locator(`[data-architecture-lens-interaction][value="${interaction}"]`)
        .check();
      await expect(
        demo.locator('[data-architecture-lens-receipt="requests"]'),
      ).toHaveText(requests);
      await expect(
        demo.locator('[data-architecture-lens-receipt="artifact"]'),
      ).toHaveText(artifact);
      await expect(
        demo.locator('[data-architecture-lens-receipt="scope"]'),
      ).toHaveText(scope);
      await expect(
        demo.locator('[data-architecture-lens-receipt="state"]'),
      ).toHaveText(state);
      await expect(
        demo.locator("[data-architecture-lens-transfer-label]"),
      ).toHaveText(transfer);
    }
  });

  test("projects repeated warm actions after initialization", async ({
    page,
  }) => {
    const demo = page.locator("[data-architecture-lens]");
    const summary = demo.locator("[data-architecture-lens-session-summary]");
    const actions = demo.locator("[data-architecture-lens-session-actions]");

    await expect(summary).toHaveText(
      "6 requests · ≈54 KB responses · 3 document replacements",
    );

    await demo
      .locator('[data-architecture-lens-interaction][value="hda"]')
      .check();
    await expect(summary).toHaveText(
      "3 requests · ≈3.6 KB responses · 3 fragment swaps",
    );

    await demo
      .locator('[data-architecture-lens-interaction][value="spa"]')
      .check();
    await expect(summary).toHaveText(
      "3 requests · ≈2.4 KB responses · 3 client renders",
    );

    await actions.fill("5");
    await expect(summary).toHaveText(
      "5 requests · ≈4 KB responses · 5 client renders",
    );
  });

  test("shows an initialized SPA updating client state from JSON", async ({
    page,
  }) => {
    const demo = page.locator("[data-architecture-lens]");

    await demo
      .locator('[data-architecture-lens-interaction][value="spa"]')
      .check();
    await expect(demo.locator("[data-architecture-lens-trace]")).toContainText(
      "Initialize SPA",
    );
    await expect(demo.locator("[data-architecture-lens-trace]")).toContainText(
      "JSON event",
    );
    await expect(demo.locator("[data-architecture-lens-trace]")).toContainText(
      "Update client state",
    );

    await demo.locator("[data-architecture-lens-run]").click();
    await expect(demo.locator("[data-added-event]")).toHaveCount(1, {
      timeout: 5_000,
    });
    await expect(demo.locator("[data-architecture-lens-draft]")).toHaveValue(
      "Compare cache behavior",
    );
    await expect(
      demo.locator(".architecture-lens-browser-status"),
    ).toContainText("client state");
  });

  test("shows CSR booting JavaScript and rendering API data", async ({
    page,
  }) => {
    const demo = page.locator("[data-architecture-lens]");

    await demo
      .locator('[data-architecture-lens-delivery][value="csr"]')
      .check();

    await expect(demo.locator("[data-architecture-lens-title]")).toHaveText(
      "CSR + MPA",
    );
    await expect(demo.locator("[data-architecture-lens-trace]")).toContainText(
      "HTML shell + JS",
    );
    await expect(demo.locator("[data-architecture-lens-trace]")).toContainText(
      "JSON activities",
    );
    await expect(demo.locator("[data-architecture-lens-trace]")).toContainText(
      "Render view",
    );
    await expect(
      demo.locator("[data-architecture-lens-caution]"),
    ).toContainText("SPAs");
    await expect(
      demo.locator('[data-architecture-lens-receipt="requests"]'),
    ).toHaveText("3");
    await expect(
      demo.locator("[data-architecture-lens-transfer]"),
    ).toHaveAttribute(
      "style",
      /--transfer-warm: 10%; --transfer-cold-extra: 90%/,
    );
    await expect(
      demo.locator(".architecture-sequence-participant.is-idle"),
    ).toHaveCount(0);
  });

  test("follows the active book theme", async ({ page }) => {
    const button = page.locator(
      "[data-architecture-lens] [data-architecture-lens-run]",
    );
    const lightColor = await button.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );

    await page.locator("[data-theme-picker]").selectOption("dark");
    const darkColor = await button.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );

    expect(darkColor).not.toBe(lightColor);
  });

  test("keeps a stable frame while changing combinations", async ({ page }) => {
    const demo = page.locator("[data-architecture-lens]");
    const heights: number[] = [];

    for (const delivery of ["ssr", "isr", "csr"]) {
      for (const interaction of ["mpa", "hda", "spa"]) {
        await demo
          .locator(`[data-architecture-lens-delivery][value="${delivery}"]`)
          .check();
        await demo
          .locator(
            `[data-architecture-lens-interaction][value="${interaction}"]`,
          )
          .check();
        heights.push((await demo.boundingBox())?.height ?? 0);
      }
    }

    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
  });

  test("fits a narrow viewport without horizontal page overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
