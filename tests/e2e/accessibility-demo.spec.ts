import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectedDemoCount } from "./demo-fixtures.ts";

const themes = ["light", "dark", "sepia", "contrast", "calm"];

test.describe("demo accessibility", () => {
  test("each demo passes automated WCAG AA checks in every theme", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto("/demos/");

    const demos = page.locator("[data-demo-anchor]");
    await expect(demos).toHaveCount(expectedDemoCount);

    const demoIds = await demos.evaluateAll((elements) =>
      elements.map((element) => element.id),
    );
    const violations: string[] = [];

    await page.evaluate(() => {
      document
        .querySelectorAll<HTMLDetailsElement>("[data-demo-anchor] details")
        .forEach((details) => {
          details.open = true;
        });
      document
        .querySelectorAll<HTMLElement>("[data-demo-anchor] [hidden]")
        .forEach((element) => {
          element.hidden = false;
        });
      document
        .querySelectorAll<HTMLElement>(
          '[data-demo-anchor] [aria-hidden="true"]',
        )
        .forEach((element) => {
          element.removeAttribute("aria-hidden");
        });
    });

    for (const theme of themes) {
      await page.locator("[data-theme-picker]").selectOption(theme);

      for (const demoId of demoIds) {
        const results = await new AxeBuilder({ page })
          .include(`#${demoId}`)
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();

        for (const violation of results.violations) {
          violations.push(
            `${demoId} (${theme}): ${violation.id} on ${violation.nodes
              .map((node) => node.target.join(" "))
              .join(", ")}`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  test("every demo control has a visible keyboard focus indicator", async ({
    page,
  }) => {
    await page.goto("/demos/");
    const auditedDemos = new Set<string>();
    const visitedControls = new Set<number>();
    const controlsWithoutFocusIndicators: string[] = [];
    let firstControl = -1;

    for (let step = 0; step < 500; step += 1) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const focusable = Array.from(
          document.querySelectorAll<HTMLElement>(
            "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex='0']",
          ),
        );
        const element = document.activeElement as HTMLElement | null;
        const demo = element?.closest<HTMLElement>("[data-demo-anchor]");
        const styles = element ? getComputedStyle(element) : null;

        return {
          demoId: demo?.id || null,
          index: element ? focusable.indexOf(element) : -1,
          name:
            element?.getAttribute("aria-label") ||
            element?.textContent?.trim() ||
            element?.getAttribute("name") ||
            element?.tagName.toLowerCase() ||
            "unknown control",
          hasFocusIndicator: Boolean(
            styles &&
            ((styles.outlineStyle !== "none" &&
              Number.parseFloat(styles.outlineWidth) > 0) ||
              styles.boxShadow !== "none"),
          ),
        };
      });

      if (firstControl === -1) {
        firstControl = focused.index;
      } else if (focused.index === firstControl) {
        break;
      }

      if (!focused.demoId) {
        continue;
      }

      auditedDemos.add(focused.demoId);
      visitedControls.add(focused.index);

      if (!focused.hasFocusIndicator) {
        controlsWithoutFocusIndicators.push(
          `${focused.demoId}: ${focused.name}`,
        );
      }
    }

    expect(auditedDemos.size).toBe(expectedDemoCount);
    expect(visitedControls.size).toBeGreaterThan(100);
    expect(controlsWithoutFocusIndicators).toEqual([]);
  });
});
