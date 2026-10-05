import { expect, test } from "@playwright/test";

test.describe("project specification", () => {
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
