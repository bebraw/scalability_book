import { expect, test } from "@playwright/test";

test.describe("project specification", () => {
  test("publishes the common contract and phase briefs from the site navigation", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Project" })).toHaveAttribute(
      "href",
      "/project/",
    );
    await expect(
      page.getByRole("link", { name: /Open the specification/ }),
    ).toHaveAttribute("href", "/project/");

    await page.goto("/project/");

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
      page.getByRole("link", { name: "the book project" }),
    ).toHaveAttribute("href", "/project/");

    await page.goto("/parts/challenge/");
    await expect(
      page.getByRole("link", { name: "Challenge project brief" }),
    ).toHaveAttribute("href", "/project/challenge/");

    await page.goto("/parts/compare/");
    await expect(
      page.getByRole("link", { name: "Compare project brief" }),
    ).toHaveAttribute("href", "/project/compare/");
  });
});
