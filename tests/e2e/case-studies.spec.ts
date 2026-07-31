import { expect, test } from "@playwright/test";

test.describe("case studies", () => {
  test("publishes the Kirjolab case study and links it from the chapter", async ({
    page,
  }) => {
    await page.goto("/chapters/scalable-development/");

    await expect(
      page.getByRole("link", { name: "Kirjolab" }).first(),
    ).toHaveAttribute("href", "/case-studies/kirjolab/");

    await page.goto("/case-studies/");
    await expect(
      page.getByRole("heading", { name: "Case studies" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: /Kirjolab -- When code production scaled faster than architecture/,
      }),
    ).toHaveAttribute("href", "/case-studies/kirjolab/");

    await page.goto("/case-studies/kirjolab/");
    await expect(
      page.getByRole("heading", {
        name: "Kirjolab -- When code production scaled faster than architecture",
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
