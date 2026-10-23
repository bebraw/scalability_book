import { expect, test } from "@playwright/test";
import { expectedDemoCount } from "./demo-fixtures.ts";
import { exercises } from "../../shared/exercises.ts";
import AxeBuilder from "@axe-core/playwright";

test.describe("demo showcase", () => {
  test("standalone practice is readable and usable on desktop and mobile", async ({
    page,
  }) => {
    await page.route("**/api/auth/status", (route) =>
      route.fulfill({
        json: { authenticated: false, available: false },
      }),
    );
    await page.route("**/api/account/status", (route) =>
      route.fulfill({
        json: {
          local: false,
          github: {
            available: true,
            user: null,
            loginUrl: "/api/auth/github/start",
          },
          course: { available: false, emailAvailable: false, user: null },
          answers: null,
        },
      }),
    );
    page.on("dialog", (dialog) => dialog.accept());
    await page.goto("/demos/");
    const standalone = Object.entries(exercises).filter(
      ([, exercise]) => !exercise.demo,
    );
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [id] of standalone) {
        const exercise = page.locator(`[data-exercise="${id}"]`);
        const geometry = await exercise.evaluate((element) => ({
          width: element.getBoundingClientRect().width,
          available: element.parentElement!.getBoundingClientRect().width,
          overflow: element.scrollWidth - element.clientWidth,
        }));
        expect(geometry.width / geometry.available).toBeGreaterThan(0.85);
        expect(geometry.overflow).toBeLessThanOrEqual(1);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      await page
        .locator('[data-exercise="measurement-transfer"]')
        .locator("..")
        .screenshot({
          path: test.info().outputPath(`more-practice-${width}.png`),
        });
    }
    await page
      .getByRole("link", { name: "More practice", exact: true })
      .click();
    await expect(page).toHaveURL(/#more-practice$/);
    const practice = page.getByRole("region", {
      name: "More practice",
      exact: true,
    });
    await expect(
      practice
        .getByRole("navigation", { name: "More practice exercises" })
        .getByRole("link"),
    ).toHaveCount(standalone.length);
    await practice
      .getByRole("link", {
        name: "Follow work from events to review",
        exact: true,
      })
      .click();
    const exercise = practice.locator('[data-exercise="measurement-transfer"]');
    await expect(exercise.locator('[data-field="events"]')).toBeEnabled();
    await exercise.locator('[data-field="events"]').fill("10");
    await exercise.locator('[data-field="changes"]').fill("12");
    await exercise.locator('[data-field="balance"]').selectOption("no");
    await exercise
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await expect(exercise.locator("[data-result]")).toContainText(
      "Correct — all parts passed",
    );
    await expect(
      exercise.getByRole("button", { name: "Save result", exact: true }),
    ).toBeDisabled();
    await exercise.getByText("Show worked answer", { exact: true }).click();
    await expect(exercise.locator(".exercise-discussion")).toHaveAttribute(
      "open",
      "",
    );
    const accessibility = await new AxeBuilder({ page })
      .include("#more-practice")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
  });
  test("all demos share a readable header and control style", async ({
    page,
  }) => {
    await page.goto("/demos/");
    const demos = page.locator("[data-demo-anchor]");
    await expect(demos.locator(":scope > .demo-header")).toHaveCount(
      expectedDemoCount,
    );
    await expect(demos.locator(".demo-kicker")).toHaveCount(expectedDemoCount);
    await expect(demos.locator(".demo-summary")).toHaveCount(expectedDemoCount);
    for (const demo of await demos.all()) {
      await expect(demo).toHaveCSS("border-top-width", "0px");
      await expect(demo).toHaveCSS("box-shadow", "none");
      await expect(demo).toHaveCSS("background-image", "none");
    }

    for (const theme of ["light", "dark", "sepia", "contrast", "calm"]) {
      await page.locator("[data-theme-picker]").selectOption(theme);
      const styles = await demos.evaluateAll((elements) =>
        elements.map((element) => {
          const title = getComputedStyle(element.querySelector("h3")!);
          const summary = getComputedStyle(
            element.querySelector(".demo-summary")!,
          );
          return {
            titleFont: title.fontFamily,
            titleSize: title.fontSize,
            titleColor: title.color,
            summaryFont: summary.fontFamily,
            summarySize: summary.fontSize,
            summaryColor: summary.color,
            summaryBackground: summary.backgroundColor,
          };
        }),
      );
      for (const style of styles) expect(style).toEqual(styles[0]);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    const defects = await demos.evaluateAll((elements) =>
      elements.flatMap((element) => {
        const header = element.querySelector(".demo-header")!;
        const defects: string[] = [];
        if (
          getComputedStyle(header).gridTemplateColumns.split(" ").length !== 1
        )
          defects.push(element.id + ": header columns");
        if (element.scrollWidth > element.clientWidth + 1)
          defects.push(element.id + ": overflow");
        for (const control of element.querySelectorAll<HTMLElement>(
          "button, select, input[type='text'], input[type='number']",
        )) {
          if (!control.checkVisibility()) continue;
          if (
            control.getBoundingClientRect().height <
            (control.classList.contains("project-fit-help") ? 24 : 39)
          )
            defects.push(element.id + ": small control");
          if (Number.parseFloat(getComputedStyle(control).fontSize) < 12)
            defects.push(element.id + ": small control text");
        }
        return defects;
      }),
    );
    expect(defects).toEqual([]);
  });

  test("presents every demo as one themed systems-lab catalogue", async ({
    page,
  }) => {
    await page.goto("/demos/");

    const gallery = page.locator(".demo-gallery-page");
    const items = gallery.locator(".demo-gallery-item").filter({
      has: page.locator("[data-demo-anchor]"),
    });
    await expect(gallery.locator("h1")).toContainText("Demos and exercises");
    await expect(gallery.locator(".demo-gallery-lede")).toContainText(
      "Work through one module at a time",
    );
    await expect(items).toHaveCount(expectedDemoCount);
    await expect(gallery.locator(".demo-gallery-group")).toHaveCount(3);
    await expect(
      page.locator("#advanced-demos #demo-acid-transaction-lab"),
    ).toBeVisible();
    await expect(
      page.locator("#worksheet-demos #demo-friction-audit"),
    ).toBeVisible();
    await expect(
      page.locator("#reading-demos #demo-tail-latency-simulator"),
    ).toBeVisible();
    await expect(
      page.locator(
        "#demo-workflow-loop, #demo-observability-signal-picker, #demo-final-reflection-package",
      ),
    ).toHaveCount(0);

    await expect(gallery.locator(".demo-gallery-stats")).toContainText(
      String(expectedDemoCount),
    );
    await expect(gallery.locator(".demo-gallery-stats")).toContainText(
      "Self-guided",
    );
    await expect(items.first().locator(".demo-gallery-index")).toHaveText("01");
    await expect(items.last().locator(".demo-gallery-index")).toHaveText(
      String(expectedDemoCount).padStart(2, "0"),
    );
    await expect(gallery.locator(".demo-gallery-status")).toHaveCount(
      expectedDemoCount,
    );
    await expect(gallery.locator("[data-demo-anchor]")).toHaveCount(
      expectedDemoCount,
    );
    await expect(gallery.locator("[data-demo-permalink]")).toHaveCount(
      expectedDemoCount,
    );
    await expect(
      gallery.locator("[data-orchestration-lab]:not([data-busy])"),
    ).toBeVisible({ timeout: 20_000 });

    const alignedLabShells = [
      {
        root: "[data-fleet-trace]",
        header: ".fleet-trace-header",
        summary: ".fleet-trace-summary",
      },
      {
        root: "[data-durable-retry]",
        header: ".durable-retry-header",
        summary: ".durable-retry-summary",
      },
    ];

    for (const lab of alignedLabShells) {
      const root = gallery.locator(lab.root);
      await expect(root).toHaveCSS("border-top-width", "0px");
      await expect(root).toHaveCSS("box-shadow", "none");
      await expect(root).toHaveCSS("margin-top", "0px");
      await expect(root).toHaveCSS("background-image", "none");
      await expect(root.locator(lab.header)).toHaveCSS(
        "background-image",
        "none",
      );
      await expect(root.locator(lab.summary)).toHaveCSS(
        "background-image",
        "none",
      );
      await expect(root.locator(`${lab.summary} span`)).toHaveCSS(
        "text-transform",
        "none",
      );
    }

    const expectSharedShellPalette = async () => {
      const reference = await readShellPalette(
        gallery.locator(".agent-fleet-header"),
        gallery.locator(".agent-fleet-summary"),
      );

      for (const lab of alignedLabShells) {
        expect(
          await readShellPalette(
            gallery.locator(lab.root).locator(lab.header),
            gallery.locator(lab.root).locator(lab.summary),
          ),
        ).toEqual(reference);
      }
    };

    await expectSharedShellPalette();

    const framing = await gallery
      .locator(".demo-gallery-lede, .demo-gallery-group > header")
      .allTextContents();
    expect(framing.join("\n")).not.toMatch(
      /\b(students?|classroom|lecturer|instructor)\b/i,
    );

    const lightSurface = await gallery.evaluate(
      (element) => getComputedStyle(element).backgroundImage,
    );
    await page.locator("[data-theme-picker]").selectOption("dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const darkSurface = await gallery.evaluate(
      (element) => getComputedStyle(element).backgroundImage,
    );
    expect(darkSurface).not.toBe(lightSurface);
    await expectSharedShellPalette();

    await page.setViewportSize({ width: 390, height: 844 });
    for (const lab of alignedLabShells) {
      await expect(gallery.locator(lab.root).locator(lab.header)).toHaveCSS(
        "grid-template-columns",
        /.+/,
      );
      const headerColumns = await gallery
        .locator(lab.root)
        .locator(lab.header)
        .evaluate((element) =>
          getComputedStyle(element).gridTemplateColumns.split(" "),
        );
      expect(headerColumns).toHaveLength(1);
    }
    await expect(items.first().locator(".demo-gallery-item-header")).toHaveCSS(
      "position",
      "static",
    );
    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(pageOverflow).toBeLessThanOrEqual(1);
  });

  test("links directly to a demo from the gallery and a chapter", async ({
    page,
  }) => {
    const demoId = "demo-deterministic-boundary-lab";

    await page.goto(`/demos/#${demoId}`);
    const galleryDemo = page.locator(`#${demoId}`);
    await expect(galleryDemo).toBeVisible();
    await expect(galleryDemo).toHaveCSS("outline-style", "solid");
    await expect(galleryDemo.locator("[data-demo-permalink]")).toHaveAttribute(
      "href",
      `#${demoId}`,
    );

    await page.goto(`/chapters/scalable-development/#${demoId}`);
    const chapterDemo = page.locator(`#${demoId}`);
    await expect(chapterDemo).toBeVisible();
    await expect(chapterDemo.locator("[data-demo-permalink]")).toHaveAttribute(
      "href",
      `#${demoId}`,
    );
    await expect(page).toHaveURL(new RegExp(`#${demoId}$`));
  });

  test("uses the systems-lab treatment for demos embedded in chapters", async ({
    page,
  }) => {
    await page.goto("/chapters/scaling/#scaling-pressure-lab");
    const demo = page.locator("[data-scaling-demo]");
    await expect(demo).toBeVisible();

    await expect(demo).toHaveCSS("border-radius", "0px");
    await expect(demo.locator(".scaling-demo-panel").first()).toHaveCSS(
      "border-radius",
      "0px",
    );
    await expect(demo.locator("select").first()).toHaveCSS(
      "border-radius",
      "0px",
    );
    const lightBackground = await demo.evaluate(
      (element) => getComputedStyle(element).backgroundImage,
    );
    expect(lightBackground).toContain("linear-gradient");

    await page.locator("[data-theme-picker]").selectOption("dark");
    const darkBackground = await demo.evaluate(
      (element) => getComputedStyle(element).backgroundImage,
    );
    expect(darkBackground).not.toBe(lightBackground);
  });
});

async function readShellPalette(
  header: import("@playwright/test").Locator,
  summary: import("@playwright/test").Locator,
) {
  const [headerPalette, summaryPalette] = await Promise.all([
    header.evaluate((element) => {
      const style = getComputedStyle(element);

      return {
        backgroundColor: style.backgroundColor,
        color: style.color,
      };
    }),
    summary.evaluate((element) => {
      const style = getComputedStyle(element);

      return {
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        color: style.color,
      };
    }),
  ]);

  return { header: headerPalette, summary: summaryPalette };
}
