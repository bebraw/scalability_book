import { expect, test } from "@playwright/test";

test.describe("case studies", () => {
  test("keeps home-page case studies inside the mobile viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(page.locator(".home-case-studies")).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("publishes the case studies and links them from the chapter", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Case studies" }),
    ).toBeVisible();
    await expect(page.locator(".home-case-study-list > li")).toHaveCount(6);
    await expect(
      page.getByRole("link", {
        name: /Slideotter – Learning faster than the product converged/,
      }),
    ).toHaveAttribute("href", "/case-studies/slideotter/");
    await expect(
      page.getByRole("link", { name: "Browse the collection" }),
    ).toHaveAttribute("href", "/case-studies/");

    await page.goto("/chapters/scalable-development/");

    await expect(
      page.getByRole("navigation", { name: "Primary" }).getByRole("link", {
        name: "Cases",
        exact: true,
      }),
    ).toHaveAttribute("href", "/case-studies/");
    await expect(
      page.getByRole("link", { name: "Slideotter" }).first(),
    ).toHaveAttribute("href", "/case-studies/slideotter/");
    await expect(
      page.getByRole("link", { name: "Webernetes" }).first(),
    ).toHaveAttribute("href", "/case-studies/webernetes/");
    await expect(
      page.getByRole("link", { name: "Modern Web Guidance" }).first(),
    ).toHaveAttribute("href", "/case-studies/modern-web-guidance/");

    await expect(
      page.getByRole("link", { name: "Temper case study" }),
    ).toHaveAttribute("href", "/case-studies/temper/");

    await page.goto("/case-studies/");
    await expect(
      page.getByRole("heading", { name: "Case studies" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: /Slideotter – Learning faster than the product converged/,
      }),
    ).toHaveAttribute("href", "/case-studies/slideotter/");
    await expect(
      page.getByRole("link", {
        name: /Thesis Journey Tracker – Small scope made production success possible/,
      }),
    ).toHaveAttribute("href", "/case-studies/thesis-journey-tracker/");
    await expect(
      page.getByRole("link", {
        name: /Kirjolab – When code production scaled faster than architecture/,
      }),
    ).toHaveAttribute("href", "/case-studies/kirjolab/");
    await expect(
      page.getByRole("link", {
        name: /Webernetes – Comparing generated behavior with a real cluster/,
      }),
    ).toHaveAttribute("href", "/case-studies/webernetes/");
    await expect(
      page.getByRole("link", {
        name: /Modern Web Guidance – Treating current knowledge as a tested dependency/,
      }),
    ).toHaveAttribute("href", "/case-studies/modern-web-guidance/");
    await expect(
      page.getByRole("link", {
        name: /Temper – Contracts, verification, and bounded autonomy/,
      }),
    ).toHaveAttribute("href", "/case-studies/temper/");
    const cardHeights = await page
      .locator(".case-study-grid a")
      .evaluateAll((cards) =>
        cards.map((card) => card.getBoundingClientRect().height),
      );
    expect(new Set(cardHeights).size).toBe(1);

    await page.goto("/case-studies/slideotter/");
    await expect(
      page.getByRole("heading", {
        name: "Slideotter – Learning faster than the product converged",
      }),
    ).toBeVisible();
    await expect(page.getByText("1,606 commits")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "View source project" }),
    ).toHaveAttribute("href", "https://github.com/bebraw/slideotter");

    await page.goto("/case-studies/thesis-journey-tracker/");
    await expect(
      page.getByRole("heading", {
        name: "Thesis Journey Tracker – Small scope made production success possible",
      }),
    ).toBeVisible();
    await expect(page.getByText("282 commits")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "View source project" }),
    ).toHaveAttribute(
      "href",
      "https://github.com/bebraw/thesis-journey-tracker",
    );

    await page.goto("/case-studies/kirjolab/");
    await expect(
      page.getByRole("heading", {
        name: "Kirjolab – When code production scaled faster than architecture",
      }),
    ).toBeVisible();
    await expect(page.getByText("1,433 commits")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "All case studies" }),
    ).toHaveAttribute("href", "/case-studies/");
    await expect(
      page.getByRole("link", { name: "View source project" }),
    ).toHaveAttribute("href", "https://github.com/bebraw/kirjolab");

    await page.goto("/case-studies/webernetes/");
    await expect(
      page.getByRole("heading", {
        name: "Webernetes – Comparing generated behavior with a real cluster",
      }),
    ).toBeVisible();
    await expect(page.getByText("204 integration tests")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "View source project" }),
    ).toHaveAttribute("href", "https://github.com/ngrok/webernetes");

    await page.goto("/case-studies/modern-web-guidance/");
    await expect(
      page.getByRole("heading", {
        name: "Modern Web Guidance – Treating current knowledge as a tested dependency",
      }),
    ).toBeVisible();
    await expect(page.getByText("Semantic search")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "View source project" }),
    ).toHaveAttribute(
      "href",
      "https://github.com/GoogleChrome/modern-web-guidance-src",
    );

    await page.goto("/case-studies/temper/");
    await expect(
      page.getByRole("heading", {
        name: "Temper – Contracts, verification, and bounded autonomy",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "View source project" }),
    ).toHaveAttribute("href", "https://github.com/nerdsane/temper");
  });
});
