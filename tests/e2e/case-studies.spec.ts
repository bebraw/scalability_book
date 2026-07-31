import { expect, test } from "@playwright/test";

test.describe("case studies", () => {
  test("publishes the case studies and links them from the chapter", async ({
    page,
  }) => {
    await page.goto("/chapters/scalable-development/");

    await expect(
      page.getByRole("link", { name: "Slideotter" }).first(),
    ).toHaveAttribute("href", "/case-studies/slideotter/");
    await expect(
      page.getByRole("link", { name: "Thesis Journey Tracker" }).first(),
    ).toHaveAttribute("href", "/case-studies/thesis-journey-tracker/");
    await expect(
      page.getByRole("link", { name: "Kirjolab" }).first(),
    ).toHaveAttribute("href", "/case-studies/kirjolab/");

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
  });
});
