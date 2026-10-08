import { expect, test } from "@playwright/test";

test.describe("project specification", () => {
  for (const width of [1280, 800, 390]) {
    test(`keeps rubric points separated from prose at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const route of [
        "/project/grading/",
        "/project/requirements/2026-10-v2/grading/",
      ]) {
        await page.goto(route);
        const columns = await page
          .locator(".project-prose > table")
          .evaluateAll((tables) =>
            tables.flatMap((table) => {
              const headers = Array.from(table.querySelectorAll("thead th"));
              const index = headers.findIndex(
                (header) => header.textContent?.trim() === "Points",
              );
              if (index < 0) return [];
              return Array.from(table.querySelectorAll("tr")).map((row) => {
                const cell = row.children[index];
                const box = cell.getBoundingClientRect();
                const range = document.createRange();
                range.selectNodeContents(cell);
                const text = range.getBoundingClientRect();
                return {
                  width: box.width,
                  leftGap: text.left - box.left,
                  rightGap: box.right - text.right,
                  lines: range.getClientRects().length,
                };
              });
            }),
          );
        expect(columns.length).toBeGreaterThan(20);
        for (const column of columns) {
          expect(column.width).toBeGreaterThanOrEqual(80);
          expect(column.leftGap).toBeGreaterThanOrEqual(12);
          expect(column.rightGap).toBeGreaterThanOrEqual(12);
          expect(column.lines).toBe(1);
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
      }
    });
  }

  test("publishes the model-size sequence and bounded mixed-fleet policy", async ({
    page,
    request,
  }) => {
    await page.goto("/project/introduction/");
    const prose = page.locator(".project-prose");
    await expect(prose).toContainText("approved large model");
    await expect(prose).toContainText("approved small model");

    await page.goto("/project/establish/");
    await expect(
      page.getByRole("heading", {
        name: "Implementation A: Large Model, Single Agent",
      }),
    ).toBeVisible();
    await page.goto("/project/challenge/");
    await expect(
      page.getByRole("heading", {
        name: "Implementation B: Small Model, Single Agent",
      }),
    ).toBeVisible();
    await page.goto("/project/compare/");
    await expect(prose).toContainText(
      "an approved fleet may use small models, large models, or a mixture",
    );
    await expect(prose).toContainText("same small-model version");
    await expect(prose).toContainText(
      "An optional model-assignment comparison",
    );

    const pinned = await request.get(
      "/project/requirements/2026-10-v2/compare/",
    );
    expect(pinned.status()).toBe(200);
    expect(await pinned.text()).toContain(
      "An optional model-assignment comparison",
    );
    expect(
      (await request.get("/project/requirements/2026-10-v1/compare/")).status(),
    ).toBe(404);
  });

  test("publishes the assessment rubric and preserves specification fragments", async ({
    page,
    request,
  }) => {
    await page.goto("/project/");
    const pairedTask = page.getByRole("link", {
      name: "bounded paired task",
      exact: true,
    });
    await expect(pairedTask).toHaveAttribute(
      "href",
      "/project/compare/#5-4-compare-one-agent-with-the-fleet",
    );
    await pairedTask.click();
    await expect(
      page.locator('[id="5-4-compare-one-agent-with-the-fleet"]'),
    ).toBeVisible();
    await page.locator('.project-index a[href="/project/grading/"]').click();
    await expect(page.locator("#passing-and-final-grade")).toBeVisible();
    await expect(page.locator(".project-prose")).toContainText(
      "receive at least 10 points from each of the three projects",
    );
    await expect(page.locator(".project-prose")).toContainText(
      "receive at least 50% of the available total points",
    );
    const source = await request.get("/project/source/grading.md");
    expect(source.status()).toBe(200);
    expect(await source.text()).toContain("## Passing and final grade");
  });

  test("introduces the course before the common contract and phase briefs", async ({
    page,
    request,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("link", { name: "Project", exact: true }),
    ).toHaveAttribute("href", "/project/introduction/");
    await expect(
      page.getByRole("link", { name: /Start the course project/ }),
    ).toHaveAttribute("href", "/project/introduction/");

    await page.getByRole("link", { name: "Project", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: "Course Project Introduction" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Guidelines for course work" }),
    ).toBeVisible();
    const projectNavigation = page.locator(".project-index ol a");
    await expect(projectNavigation.nth(0)).toHaveAttribute(
      "href",
      "/project/introduction/",
    );
    await expect(projectNavigation.nth(1)).toHaveAttribute("href", "/project/");

    const source = await request.get("/project/source/introduction.md");
    expect(source.status()).toBe(200);
    expect(await source.text()).toContain("## Guidelines for course work");

    await page.locator('.project-pagination a[href="/project/"]').click();

    await expect(
      page.getByRole("heading", { name: "Common Project Specification" }),
    ).toBeVisible();
    await expect(page.getByText("Canonical brief")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Establish/ }).first(),
    ).toHaveAttribute("href", "/project/establish/");
    await expect(
      page.getByRole("heading", { name: "Instructor Notes" }),
    ).toHaveCount(0);
  });

  test("keeps phase references on canonical web routes and exposes source downloads", async ({
    page,
    request,
  }) => {
    await page.goto("/project/challenge/");

    await expect(
      page.getByRole("heading", { name: "Challenge Project" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "common project specification" }),
    ).toHaveAttribute("href", "/project/");
    await expect(
      page.locator('.project-index a[aria-current="page"]'),
    ).toContainText("Challenge");

    const sourceLink = page.getByRole("link", { name: /Download Markdown/ });
    await expect(sourceLink).toHaveAttribute(
      "href",
      "/project/source/challenge.md",
    );

    const sourceResponse = await request.get("/project/source/challenge.md");
    expect(sourceResponse.status()).toBe(200);
    const source = await sourceResponse.text();
    expect(source).toContain("# Challenge Project");
    expect(source).toContain("](\/project\/)");
    expect(source).not.toContain("## Instructor Notes");
  });

  test("keeps the download action legible in the dark theme", async ({
    page,
  }) => {
    await page.goto("/project/");
    await page.locator("[data-theme-picker]").selectOption("dark");

    const sourceLink = page.getByRole("link", { name: /Download Markdown/ });
    await expect(sourceLink).toBeVisible();

    const layout = await sourceLink.evaluate((link) => {
      const label = link.querySelector("span");
      const title = link.querySelector("strong");

      if (!label || !title) {
        throw new Error("Download link is missing its label or title");
      }

      const labelBox = label.getBoundingClientRect();
      const titleBox = title.getBoundingClientRect();

      return {
        labelDisplay: getComputedStyle(label).display,
        noOverflow: link.scrollWidth <= link.clientWidth,
        titleDisplay: getComputedStyle(title).display,
        titleStartsBelowLabel: titleBox.top >= labelBox.bottom,
      };
    });

    expect(layout).toEqual({
      labelDisplay: "block",
      noOverflow: true,
      titleDisplay: "block",
      titleStartsBelowLabel: true,
    });
  });

  test("links the book project arc to the canonical briefs", async ({
    page,
  }) => {
    await page.goto("/chapters/scalable-development/");
    await expect(
      page.getByRole("link", { name: "common project specification" }),
    ).toHaveAttribute("href", "/project/#6-minimum-project-harness");

    await page.goto("/parts/challenge/");
    await expect(
      page.getByRole("link", { name: "Challenge specification" }),
    ).toHaveAttribute("href", "/project/challenge/");

    await page.goto("/parts/compare/");
    await expect(
      page.getByRole("link", { name: "Compare project specification" }),
    ).toHaveAttribute("href", "/project/compare/");
  });
});
