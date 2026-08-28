import { expect, test } from "@playwright/test";

test.describe("book reading layout", () => {
  test("starts with the book introduction", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Start reading" }).click();

    await expect(page).toHaveURL(/\/chapters\/introduction\/$/);
    await expect(page.locator(".chapter-main h1")).toContainText(
      "Elements of Scalable Web Development",
    );
  });

  test("keeps body copy within a readable line length", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/chapters/scalable-development/");

    const paragraph = page.locator(".prose > p:not(.chapter-kicker)").first();
    await expect(paragraph).toBeVisible();

    const { paragraphWidth, eightyCharactersWidth } = await paragraph.evaluate(
      (element) => {
        const ruler = document.createElement("span");
        ruler.textContent = "0".repeat(80);
        ruler.style.font = getComputedStyle(element).font;
        ruler.style.position = "absolute";
        ruler.style.visibility = "hidden";
        ruler.style.whiteSpace = "nowrap";
        document.body.append(ruler);

        const widths = {
          paragraphWidth: element.getBoundingClientRect().width,
          eightyCharactersWidth: ruler.getBoundingClientRect().width,
        };
        ruler.remove();
        return widths;
      },
    );

    expect(paragraphWidth).toBeLessThan(eightyCharactersWidth);
  });

  test("keeps paragraph-to-list spacing in the prose rhythm", async ({
    page,
  }) => {
    await page.goto("/chapters/benchmarking/");

    const introduction = page
      .locator(".prose > p")
      .filter({ hasText: /^Consider a few examples:/ });
    const precedingParagraph = introduction.locator(
      "xpath=preceding-sibling::p[1]",
    );
    const followingList = introduction.locator(
      "xpath=following-sibling::ul[1]",
    );

    await expect(introduction).toBeVisible();
    await expect(precedingParagraph).toBeVisible();
    await expect(followingList).toBeVisible();

    const paragraphGap = await verticalGap(precedingParagraph, introduction);
    const listGap = await verticalGap(introduction, followingList);

    expect(Math.abs(listGap - paragraphGap)).toBeLessThan(1);
  });

  test("ships theme-aware syntax highlighting as generated HTML", async ({
    page,
    request,
  }) => {
    const response = await request.get("/chapters/benchmarking/");
    expect(response.ok()).toBe(true);
    expect(await response.text()).toContain(
      '<span class="hljs-keyword">import</span>',
    );

    await page.goto("/chapters/benchmarking/");

    const code = page.locator(".prose > pre > code.language-ts").first();
    const keyword = code.locator(".hljs-keyword").first();
    const string = code.locator(".hljs-string").first();
    await expect(code).toBeVisible();
    await expect(keyword).toBeVisible();
    await expect(string).toBeVisible();

    const themePalettes = new Set<string>();
    for (const theme of ["light", "dark", "sepia", "contrast", "calm"]) {
      await page.locator("[data-theme-picker]").selectOption(theme);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

      const palette = await code.evaluate((element) => {
        const pre = element.closest("pre");
        const keywordToken = element.querySelector(".hljs-keyword");
        const stringToken = element.querySelector(".hljs-string");
        if (!pre || !keywordToken || !stringToken) {
          throw new Error("Expected a highlighted code block");
        }

        return {
          background: getComputedStyle(pre).backgroundColor,
          foreground: getComputedStyle(element).color,
          keyword: getComputedStyle(keywordToken).color,
          string: getComputedStyle(stringToken).color,
        };
      });

      expect(palette.keyword).not.toBe(palette.foreground);
      expect(palette.keyword).not.toBe(palette.string);
      themePalettes.add(JSON.stringify(palette));
    }

    expect(themePalettes.size).toBe(5);
  });

  test("keeps chapter cards in each landing-page row the same height", async ({
    page,
  }) => {
    await page.goto("/");

    const firstPartCards = page
      .locator(".book-part:has(.chapter-grid > li:nth-child(3))")
      .first()
      .locator(".chapter-grid > li > a, .chapter-grid > li > .chapter-card");
    await expect(firstPartCards).toHaveCount(3);

    const heights = await firstPartCards.evaluateAll((cards) =>
      cards.map((card) => card.getBoundingClientRect().height),
    );
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(1);
  });

  test("renders scientific citations and the chapter bibliography", async ({
    page,
  }) => {
    await page.goto("/chapters/scalable-development/");

    const citation = page.locator(
      '.semantic-citation[data-citation="lipsanen2026shiftup"]',
    );
    await expect(citation).toContainText("Lipsanen et al.");
    await expect(page.locator(".semantic-bibliography")).toContainText(
      "Shift-Up",
    );
    await expect(citation).toHaveAttribute(
      "href",
      "#reference-lipsanen2026shiftup",
    );

    await citation.click();
    await expect(page).toHaveURL(/#reference-lipsanen2026shiftup$/);
    await expect(page.locator("#reference-lipsanen2026shiftup")).toBeVisible();
  });

  test("numbers tables and links references to the table itself", async ({
    page,
  }) => {
    await page.goto("/chapters/scaling/");

    const table = page.locator('[id="table:scalability-laws"]');
    const reference = page.locator(
      'a.semantic-reference[href="#table:scalability-laws"]',
    );

    await expect(table.locator("caption")).toContainText(
      "Table 8.2. Formal scalability models",
    );
    await reference.click();
    await expect(page).toHaveURL(/#table:scalability-laws$/);
    await expect(table).toHaveCSS("outline-style", "solid");
  });

  test("contains wide prose tables without widening the mobile page", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/appendices/evaluating-agentic-workflows/");

    const table = page.locator('[id="table:agent-evaluation-vocabulary"]');
    await expect(table).toBeVisible();

    const geometry = await table.evaluate((element) => ({
      clientWidth: element.clientWidth,
      overflowX: getComputedStyle(element).overflowX,
      pageClientWidth: document.documentElement.clientWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
      scrollWidth: element.scrollWidth,
    }));

    expect(geometry.overflowX).toBe("auto");
    expect(geometry.scrollWidth).toBeGreaterThan(geometry.clientWidth);
    expect(geometry.pageScrollWidth).toBeLessThanOrEqual(
      geometry.pageClientWidth + 1,
    );
  });

  test("switches navigation views and expands demos when folded", async ({
    page,
  }) => {
    await page.goto("/chapters/scaling/#scaling-pressure-lab");

    const shell = page.locator(".book-shell");
    const main = page.locator(".chapter-main");
    const demo = page.locator("[data-scaling-demo]");
    const bodyParagraph = page
      .locator(".prose > p:not(.chapter-kicker)")
      .first();
    const navigation = page.locator("#book-navigation");
    const navigationPanel = navigation.locator("details");
    const navigationToggle = navigation.locator("summary");
    const tabs = navigation.locator("[role='tablist']");
    const bookTab = navigation.locator("[data-book-navigation-tab='book']");
    const pageTab = navigation.locator("[data-book-navigation-tab='page']");
    const bookView = navigation.locator("[data-book-navigation-panel='book']");
    const pageView = navigation.locator("[data-book-navigation-panel='page']");

    await expect(navigation).toBeVisible();
    await expect(navigationPanel).toHaveAttribute("open", "");
    await expect(bookTab).toHaveAttribute("aria-selected", "true");
    await expect(bookView).toBeVisible();
    await expect(pageView).toBeHidden();
    const defaultMainWidth = await elementWidth(main);
    const defaultDemoWidth = await elementWidth(demo);
    expect(await rightEdgeExtension(demo, main)).toBeGreaterThan(180);

    await pageTab.click();
    await expect(pageTab).toHaveAttribute("aria-selected", "true");
    await expect(bookView).toBeHidden();
    await expect(pageView).toBeVisible();
    await expect(pageView.getByText("Scaling pressure lab")).toBeVisible();

    await page.reload();
    await expect(pageTab).toHaveAttribute("aria-selected", "true");
    await expect(pageView).toBeVisible();

    const bodyGeometryDuringFold = await navigationToggle.evaluate(
      async (toggle) => {
        const paragraph = document.querySelector<HTMLElement>(
          ".prose > p:not(.chapter-kicker)",
        );
        if (!paragraph) {
          throw new Error("Missing body paragraph");
        }

        const centers: number[] = [];
        const widths: number[] = [];
        const startedAt = performance.now();
        toggle.click();

        while (performance.now() - startedAt < 340) {
          await new Promise(requestAnimationFrame);
          const box = paragraph.getBoundingClientRect();
          centers.push(box.left + box.width / 2);
          widths.push(box.width);
        }

        return { centers, widths };
      },
    );
    await expect(navigationPanel).not.toHaveAttribute("open", "");
    expect(
      Math.max(...bodyGeometryDuringFold.centers) -
        Math.min(...bodyGeometryDuringFold.centers),
    ).toBeLessThan(2);
    expect(
      Math.max(...bodyGeometryDuringFold.widths) -
        Math.min(...bodyGeometryDuringFold.widths),
    ).toBeLessThan(2);
    await expect(navigationToggle).toHaveAttribute(
      "aria-label",
      "Show navigation",
    );
    await expect(navigation.locator(".book-panel-icon")).toBeVisible();
    await expect
      .poll(() =>
        centerDelta(navigationToggle, navigation.locator(".book-panel-icon")),
      )
      .toBeLessThan(2);
    await expect
      .poll(() => horizontalCenterDelta(main, bodyParagraph))
      .toBeLessThan(2);
    await expect
      .poll(() => elementWidth(main))
      .toBeGreaterThan(defaultMainWidth + 180);
    await expect
      .poll(() => elementWidth(demo))
      .toBeGreaterThan(defaultDemoWidth + 160);

    await page.reload();
    await expect(navigationPanel).not.toHaveAttribute("open", "");

    await page.setViewportSize({ width: 1100, height: 844 });
    await expect(navigationPanel).toHaveAttribute("open", "");
    await expect(tabs).toBeHidden();
    await expect(bookView).toBeVisible();
    await expect(pageView).toBeVisible();
  });
});

async function elementWidth(locator: import("@playwright/test").Locator) {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error("Expected a visible element with a bounding box");
  }
  return box.width;
}

async function verticalGap(
  first: import("@playwright/test").Locator,
  second: import("@playwright/test").Locator,
) {
  const [firstBox, secondBox] = await Promise.all([
    first.boundingBox(),
    second.boundingBox(),
  ]);
  if (!firstBox || !secondBox) {
    throw new Error("Expected visible elements with bounding boxes");
  }
  return secondBox.y - (firstBox.y + firstBox.height);
}

async function centerDelta(
  container: import("@playwright/test").Locator,
  child: import("@playwright/test").Locator,
) {
  const containerBox = await container.boundingBox();
  const childBox = await child.boundingBox();
  if (!containerBox || !childBox) {
    throw new Error("Expected visible elements with bounding boxes");
  }

  const horizontal = Math.abs(
    containerBox.x + containerBox.width / 2 - (childBox.x + childBox.width / 2),
  );
  const vertical = Math.abs(
    containerBox.y +
      containerBox.height / 2 -
      (childBox.y + childBox.height / 2),
  );

  return Math.max(horizontal, vertical);
}

async function horizontalCenterDelta(
  container: import("@playwright/test").Locator,
  child: import("@playwright/test").Locator,
) {
  const containerBox = await container.boundingBox();
  const childBox = await child.boundingBox();
  if (!containerBox || !childBox) {
    throw new Error("Expected visible elements with bounding boxes");
  }

  return Math.abs(
    containerBox.x + containerBox.width / 2 - (childBox.x + childBox.width / 2),
  );
}

async function rightEdgeExtension(
  element: import("@playwright/test").Locator,
  container: import("@playwright/test").Locator,
) {
  const elementBox = await element.boundingBox();
  const containerBox = await container.boundingBox();
  if (!elementBox || !containerBox) {
    throw new Error("Expected visible elements with bounding boxes");
  }

  return (
    elementBox.x + elementBox.width - (containerBox.x + containerBox.width)
  );
}
