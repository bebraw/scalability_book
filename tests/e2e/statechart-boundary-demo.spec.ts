import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("statechart boundary demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/chapters/scalable-development/#the-job-is-to-convert-non-determinism-into-determinism",
    );
    await expect(page.locator("[data-statechart-demo]")).toBeVisible();
  });

  test("rejects premature RELEASE without changing either verification region", async ({
    page,
  }) => {
    const demo = page.locator("[data-statechart-demo]");
    const state = demo.locator("[data-statechart-demo-agent-state]");
    const propose = demo.locator("[data-statechart-demo-propose-release]");
    await propose.click();
    await expect(state).toHaveText("active.planning");
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
    await expect(state).toHaveText("released");
    await expect(
      demo.locator("[data-statechart-demo-history] li").last(),
    ).toContainText("Accepted: released");
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
    ).toContainText("active.verifying.checks.running + review.waiting");
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
    await expect(demo.locator("[data-statechart-demo-verdict]")).toHaveText(
      "Goal reached: change released",
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

  test("renders failure and revision events as backward ELK routes", async ({
    page,
  }) => {
    const demo = page.locator("[data-statechart-demo]");
    await expect(demo.locator("[data-statechart-elk]")).toBeVisible();

    for (const event of ["TESTS_FAIL", "REQUEST_CHANGES"]) {
      const path = demo.locator(`[data-transition-event='${event}'] path`);
      const coordinates = (await path.getAttribute("d"))
        ?.match(/-?[\d.]+/g)
        ?.map(Number);

      expect(coordinates, `${event} route coordinates`).toBeTruthy();
      expect(
        coordinates!.at(-2),
        `${event} points back to the left`,
      ).toBeLessThan(coordinates![0]!);
    }
  });

  test("keeps state and transition labels at readable rendered sizes", async ({
    page,
  }) => {
    const diagram = page.locator("[data-statechart-elk]");
    const sizes = await diagram.evaluate((svg) => {
      const effectiveFontSize = (selector: string) => {
        const element = svg.querySelector<SVGGraphicsElement>(selector);
        const declared = element
          ? Number.parseFloat(getComputedStyle(element).fontSize)
          : 0;
        const scale = element?.getScreenCTM()?.a ?? 0;

        return declared * scale;
      };

      return {
        event: effectiveFontSize(".statechart-elk-edge-label text"),
        eventPadding: Math.min(
          ...Array.from(
            svg.querySelectorAll<SVGGraphicsElement>(
              ".statechart-elk-edge-label",
            ),
          ).map((group) => {
            const rect = group.querySelector("rect")?.getBoundingClientRect();
            const text = group.querySelector("text")?.getBoundingClientRect();

            return rect && text
              ? Math.min(
                  text.left - rect.left,
                  rect.right - text.right,
                  text.top - rect.top,
                  rect.bottom - text.bottom,
                )
              : 0;
          }),
        ),
        finalGap: Math.min(
          ...Array.from(
            svg.querySelectorAll<SVGGraphicsElement>(
              ".statechart-elk-node.is-final",
            ),
          ).map((node) => {
            const dot = node.querySelector("circle")?.getBoundingClientRect();
            const label = node
              .querySelector(".statechart-elk-label")
              ?.getBoundingClientRect();

            return dot && label ? label.left - dot.right : 0;
          }),
        ),
        state: effectiveFontSize(
          ".statechart-elk-node:not(.is-compound):not(.is-parallel) > .statechart-elk-label",
        ),
        statePadding: Math.min(
          ...Array.from(
            svg.querySelectorAll<SVGGraphicsElement>(
              ".statechart-elk-node:not(.is-compound):not(.is-parallel)",
            ),
          ).map((node) => {
            const rect = node
              .querySelector(":scope > rect")
              ?.getBoundingClientRect();
            const label = node
              .querySelector(":scope > .statechart-elk-label")
              ?.getBoundingClientRect();

            return rect && label
              ? Math.min(label.left - rect.left, rect.right - label.right)
              : 0;
          }),
        ),
        supporting: effectiveFontSize(".statechart-elk-kind"),
      };
    });

    expect(sizes.state).toBeGreaterThanOrEqual(14);
    expect(sizes.event).toBeGreaterThanOrEqual(12);
    expect(sizes.eventPadding).toBeGreaterThanOrEqual(4);
    expect(sizes.supporting).toBeGreaterThanOrEqual(10);
    expect(sizes.finalGap).toBeGreaterThanOrEqual(10);
    expect(sizes.statePadding).toBeGreaterThanOrEqual(12);
  });

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
    await expect(
      demo.locator("[data-statechart-demo-explanation]"),
    ).toContainText("parent");
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
