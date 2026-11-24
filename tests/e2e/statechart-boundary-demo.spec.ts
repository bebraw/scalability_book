import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("statechart boundary demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/chapters/scalable-development/#demo-deterministic-boundary-lab",
    );
    await expect(page.locator("[data-statechart-demo]")).toBeVisible();
  });

  test("rejects premature RELEASE without changing either verification region", async ({
    page,
  }) => {
    const demo = page.locator("[data-statechart-demo]");
    const state = demo.locator("[data-statechart-demo-agent-state]");
    const propose = demo.locator("[data-statechart-demo-propose-release]");
    const log = demo.locator(".statechart-history");
    await propose.click();
    await expect(state).toHaveText("Planning");
    await expect(
      demo.getByRole("status").filter({ hasText: "RELEASE rejected" }),
    ).toBeVisible();
    await expect(log.locator("ol")).toBeHidden();
    await log.getByText("Event history (1)").click();
    await expect(
      demo.locator("[data-statechart-demo-history] li").last(),
    ).toContainText("Rejected; state unchanged: active.planning");
    for (const event of ["PLAN_APPROVED", "PATCH_READY", "TESTS_PASS"])
      await demo.locator(`[data-statechart-demo-event='${event}']`).click();
    const before = await state.textContent();
    await propose.click();
    await expect(state).toHaveText(before!);
    await expect(
      demo.locator("[data-statechart-demo-history] li").last(),
    ).toContainText("Rejected; state unchanged");
    for (const event of ["REVIEW_START", "APPROVE"])
      await demo.locator(`[data-statechart-demo-event='${event}']`).click();
    await propose.click();
    await expect(state).toHaveText("Released");
    await expect(
      demo.locator("[data-statechart-demo-history] li").last(),
    ).toContainText("Accepted: released");
  });

  test("lets the reader deliver A's delayed passing result after B's review", async ({
    page,
  }) => {
    const demo = page.locator("[data-statechart-demo]");
    const checkpoint = demo.locator("[data-statechart-demo-checkpoint]");
    const prediction = demo.locator("[data-statechart-demo-prediction]");
    const deliver = demo.locator("[data-statechart-demo-deliver]");
    const history = demo.locator("[data-statechart-demo-history]");
    const feedback = demo.locator("[data-statechart-demo-feedback]");
    const state = demo.locator("[data-statechart-demo-agent-state]");
    const release = demo.locator("[data-statechart-demo-event='RELEASE']");

    await checkpoint.click();
    await expect(state).toHaveText("Checks running · Review approved");
    await expect(release).toHaveCount(0);
    await expect(history).toBeHidden();
    await demo.getByText("Event history (8)").click();
    await expect(history).toBeVisible();
    await expect(history).toContainText("REQUEST_CHANGES");
    await expect(history.locator("li").last()).toContainText(
      /APPROVE.*Patch B/,
    );
    await expect(deliver).toBeDisabled();

    // Expecting the safe outcome must not change the result of the model.
    await prediction.selectOption("waiting");
    await deliver.click();
    await expect(state).toHaveText("Ready");
    await expect(history.locator("li").last()).toContainText(
      /TESTS_PASS.*Patch A/,
    );
    await expect(feedback).toContainText(/predicted B would wait/i);
    await expect(feedback).toContainText(/without a patch identity/i);
    await release.click();
    await expect(state).toHaveText("Released");

    await checkpoint.click();
    await expect(state).toHaveText("Checks running · Review approved");
    await expect(release).toHaveCount(0);
    await expect(deliver).toBeDisabled();
    await prediction.selectOption("ready");
    await deliver.click();
    await expect(state).toHaveText("Ready");
    await expect(feedback).toContainText(/predicted B would be ready/i);
    await demo.locator("[data-statechart-demo-reset]").click();
    await expect(state).toHaveText("Planning");
    await expect(history).toContainText("No events sent yet");
  });

  test("syntax-highlights the executable TypeScript model", async ({
    page,
  }) => {
    const model = page.locator("[data-statechart-demo-model]");

    await page.locator(".statechart-demo-definition > summary").click();
    await expect(model).toBeVisible();
    await expect(model).toHaveClass(/language-typescript/);
    await expect(model.locator(".hljs-keyword").first()).toBeVisible();
    await expect(model.locator(".hljs-string").first()).toBeVisible();
  });

  test("coordinates parallel checks and review before release", async ({
    page,
  }) => {
    const demo = page.locator("[data-statechart-demo]");
    const enabled = demo.locator("[data-statechart-demo-events-enabled]");
    const send = (event: string) =>
      enabled.locator(`[data-statechart-demo-event='${event}']`).click();

    await send("PLAN_APPROVED");
    await send("PATCH_READY");

    await expect(
      demo.locator("[data-state-path='active.verifying']"),
    ).toHaveClass(/is-current/);
    await expect(
      demo.locator("[data-state-path='active.verifying.checks.running']"),
    ).toHaveClass(/is-current/);
    await expect(
      demo.locator("[data-state-path='active.verifying.review.waiting']"),
    ).toHaveClass(/is-current/);
    await expect(enabled).toContainText("TESTS_PASS");
    await expect(enabled).toContainText("REVIEW_START");
    await expect(enabled).not.toContainText("RELEASE");
    await expect(enabled.locator("button")).toHaveCount(4);
    await expect(
      demo.locator("[data-statechart-demo-agent-state]"),
    ).toContainText("Checks running · Review waiting");
    await expect(
      demo.locator("[data-transition-event='TESTS_FAIL']"),
    ).toBeVisible();
    await expect(
      demo.locator("[data-transition-event='REQUEST_CHANGES']"),
    ).toBeVisible();

    await send("REVIEW_START");
    await send("TESTS_PASS");
    await expect(
      demo.locator("[data-state-path='active.verifying.checks.passed']"),
    ).toHaveClass(/is-current/);
    await expect(
      demo.locator("[data-state-path='active.verifying.review.reviewing']"),
    ).toHaveClass(/is-current/);

    await send("APPROVE"); // parallel onDone -> ready
    await expect(demo.locator("[data-state-path='active.ready']")).toHaveClass(
      /is-current/,
    );
    await expect(enabled).toContainText("RELEASE");

    await send("RELEASE");
    await expect(demo.locator("[data-state-path='released']")).toHaveClass(
      /is-current/,
    );
    await expect(demo.locator("[data-statechart-demo-result]")).toContainText(
      "RELEASE accepted",
    );
    await expect(enabled).toContainText("Final state: no events enabled");
  });

  test("review can return the whole workflow to implementation", async ({
    page,
  }) => {
    const demo = page.locator("[data-statechart-demo]");
    const enabled = demo.locator("[data-statechart-demo-events-enabled]");
    const send = (event: string) =>
      enabled.locator(`[data-statechart-demo-event='${event}']`).click();

    await send("PLAN_APPROVED");
    await send("PATCH_READY");
    await send("REVIEW_START");
    await send("REQUEST_CHANGES");

    await expect(
      demo.locator("[data-state-path='active.implementing']"),
    ).toHaveClass(/is-current/);
    await expect(demo.locator("[data-statechart-demo-history]")).toContainText(
      "REQUEST_CHANGES",
    );

    await send("PATCH_READY");
    await expect(
      demo.locator("[data-state-path='active.verifying.checks.running']"),
    ).toHaveClass(/is-current/);
    await expect(
      demo.locator("[data-state-path='active.verifying.review.waiting']"),
    ).toHaveClass(/is-current/);
  });

  test("shows where each recovery event returns and when release is possible", async ({
    page,
  }) => {
    const chart = page.getByRole("region", {
      name: "Patch delivery statechart",
    });
    for (const [event, source, target] of [
      ["TESTS_FAIL", "active.verifying.checks.running", "active.implementing"],
      [
        "REQUEST_CHANGES",
        "active.verifying.review.reviewing",
        "active.implementing",
      ],
      ["CANCEL", "active", "cancelled"],
      ["both regions final", "active.verifying", "active.ready"],
      ["RELEASE", "active.ready", "released"],
    ] as const) {
      const route = chart.locator(`[data-transition-event="${event}"]`);
      await expect(route).toBeVisible();
      await expect(route).toHaveAttribute("data-transition-source", source);
      await expect(route).toHaveAttribute("data-transition-target", target);
    }
    await expect(
      chart.locator('[data-transition-event="TESTS_FAIL"]'),
    ).toContainText(/implementing/i);
    await expect(
      chart.locator('[data-transition-event="REQUEST_CHANGES"]'),
    ).toContainText(/implementing/i);
  });

  for (const width of [320, 390, 1280]) {
    test(`shows the entire delivery path without panning at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const demo = page.locator("[data-statechart-demo]");
      const chart = demo.getByRole("region", {
        name: "Patch delivery statechart",
      });
      await expect(demo.locator("button:visible").first()).toHaveText(
        "Propose RELEASE",
      );
      await expect(
        chart.locator('[data-state-path="active.planning"]'),
      ).toBeVisible();
      const frame = (await demo.boundingBox())!;
      const diagram = (await chart.boundingBox())!;
      if (width >= 390)
        expect(diagram.y + diagram.height - frame.y).toBeLessThan(900);
      expect(
        await chart.evaluate((el) => el.scrollWidth - el.clientWidth),
      ).toBeLessThanOrEqual(1);
      const expectedLeaves = [
        "active.planning",
        "active.implementing",
        "active.verifying.checks.running",
        "active.verifying.checks.passed",
        "active.verifying.review.waiting",
        "active.verifying.review.reviewing",
        "active.verifying.review.approved",
        "active.ready",
        "released",
        "cancelled",
      ];
      for (const path of expectedLeaves) {
        const node = chart.locator(`[data-state-path="${path}"]`);
        await expect(node).toBeVisible();
        const bounds = (await node.boundingBox())!;
        expect(bounds.x, path).toBeGreaterThanOrEqual(diagram.x - 1);
        expect(bounds.x + bounds.width, path).toBeLessThanOrEqual(
          diagram.x + diagram.width + 1,
        );
        expect(
          await node.evaluate((el) =>
            parseFloat(getComputedStyle(el).fontSize),
          ),
          path,
        ).toBeGreaterThanOrEqual(14);
      }
      // Every arrow keeps its event name legible, including on touch screens.
      for (const label of await chart.locator(".statechart-edge-label").all()) {
        const metrics = await label.evaluate((el) => {
          const style = getComputedStyle(el);
          const box = el.getBoundingClientRect();
          const text = document.createRange();
          text.selectNodeContents(el);
          const overflow = Math.max(
            0,
            ...Array.from(text.getClientRects(), (line) =>
              Math.max(box.left - line.left, line.right - box.right),
            ),
          );
          return {
            font: parseFloat(style.fontSize),
            width: box.width,
            height: box.height,
            overflow,
          };
        });
        expect(metrics.font).toBeGreaterThanOrEqual(12);
        expect(metrics.width).toBeGreaterThan(metrics.font);
        expect(metrics.height).toBeGreaterThanOrEqual(metrics.font);
        expect(
          metrics.overflow,
          (await label.textContent()) ?? "",
        ).toBeLessThanOrEqual(1);
      }
      await demo.locator("[data-statechart-demo-checkpoint]").click();
      await expect(
        chart.locator('[data-state-path="active.verifying.checks.running"]'),
      ).toHaveAttribute("aria-current", "step");
      await expect(
        chart.locator('[data-state-path="active.verifying.review.approved"]'),
      ).toHaveAttribute("aria-current", "step");
      expect(
        await chart.evaluate((el) => el.scrollWidth - el.clientWidth),
      ).toBeLessThanOrEqual(1);
    });
  }

  test("one parent transition cancels from any active child", async ({
    page,
  }) => {
    const demo = page.locator("[data-statechart-demo]");

    await demo
      .locator("[data-statechart-demo-events-enabled] button", {
        hasText: "CANCEL",
      })
      .click();

    await expect(demo.locator("[data-state-path='cancelled']")).toHaveClass(
      /is-current/,
    );
    await expect(demo.locator("[data-statechart-demo-result]")).toContainText(
      "parent",
    );
  });

  test("keeps event controls readable in every theme", async ({ page }) => {
    const themes = ["light", "dark", "sepia", "contrast", "calm"];
    const button = page.locator("[data-statechart-demo-event='PLAN_APPROVED']");

    for (const theme of themes) {
      await page.locator("[data-theme-picker]").selectOption(theme);
      const ratio = await button.evaluate((element) => {
        const styles = getComputedStyle(element);
        const parseRgb = (value: string) =>
          value
            .match(/[\d.]+/g)
            ?.slice(0, 3)
            .map(Number) ?? [];
        const luminance = (rgb: number[]) => {
          const [red = 0, green = 0, blue = 0] = rgb.map((channel) => {
            const value = channel / 255;
            return value <= 0.04045
              ? value / 12.92
              : ((value + 0.055) / 1.055) ** 2.4;
          });

          return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
        };
        const foreground = luminance(parseRgb(styles.color));
        const background = luminance(parseRgb(styles.backgroundColor));

        return (
          (Math.max(foreground, background) + 0.05) /
          (Math.min(foreground, background) + 0.05)
        );
      });

      expect(ratio, `${theme} theme contrast`).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("has no automated contrast violations in any theme", async ({
    page,
  }) => {
    const themes = ["light", "dark", "sepia", "contrast", "calm"];
    await page.locator(".statechart-demo-definition > summary").click();

    for (const theme of themes) {
      await page.locator("[data-theme-picker]").selectOption(theme);
      const results = await new AxeBuilder({ page })
        .include("[data-statechart-demo]")
        .withRules(["color-contrast"])
        .analyze();

      expect(
        results.violations,
        `${theme} theme axe contrast violations`,
      ).toEqual([]);
    }
  });
});
