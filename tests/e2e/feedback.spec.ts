import { expect, test, type Page } from "@playwright/test";

const chapterPath = "/chapters/introduction/";

test.describe("paragraph feedback", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(chapterPath);
    await waitForFeedback(page);
  });

  test("shows authenticated admin controls without the old page feedback panel", async ({
    page,
  }) => {
    await expect(page.locator("[data-comments-status]")).toContainText(
      "Feedback: local-editor",
    );
    await expect(page.locator("[data-comments-view]")).toHaveValue("admin");
    await expect(page.locator(".comment-thread")).toHaveCount(0);
    await expect(page.locator("[data-stuck-button]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /stuck/i })).toHaveCount(0);
  });

  test("opens the side comment form and posts feedback for a paragraph", async ({
    page,
  }) => {
    const target = page.locator("[data-comment-target]").first();
    const button = target.locator("[data-comment-button]");

    await expect(button).toHaveCSS("opacity", "0");
    await target.hover();
    await expect(button).toHaveCSS("opacity", "1");

    await button.click();
    await expect(target).toHaveClass(/is-feedback-source/);

    const form = page.locator("[data-comment-form]");
    await expect(form).toBeVisible();
    await expect(page.locator("[data-paragraph-feedback-panel]")).toHaveCount(
      0,
    );

    await form.locator("textarea").fill("This paragraph needs a clearer hook.");
    await form.getByRole("button", { name: "Post comment" }).click();

    const panel = page.locator("[data-paragraph-feedback-panel]");
    await expect(page.locator("[data-comments-status]")).toContainText(
      "Comment posted.",
    );
    await expect(form).toHaveCount(0);
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("Related feedback");
    await expect(panel).toContainText("This paragraph needs a clearer hook.");
    await expect(target.locator("[data-comment-button]")).toHaveAttribute(
      "data-comment-count",
      "1",
    );
  });

  test("opens existing paragraph feedback before showing a new form", async ({
    page,
  }) => {
    const target = page.locator("[data-comment-target]").nth(1);
    const paragraphId = await target
      .locator("[data-comment-button]")
      .getAttribute("data-comment-button");

    if (!paragraphId) {
      throw new Error("Expected paragraph comment target");
    }

    await page.request.post("/api/comments", {
      data: {
        chapter: "introduction",
        paragraphId,
        category: "missing-example",
        body: "Seeded feedback for this paragraph.",
      },
    });
    await page.reload();
    await waitForFeedback(page);

    const reloadedTarget = page
      .locator(`[data-comment-target="${paragraphId}"]`)
      .first();
    const button = reloadedTarget.locator("[data-comment-button]");
    await expect(button).toHaveAttribute("data-comment-count", "1");

    await button.click();

    const panel = page.locator("[data-paragraph-feedback-panel]");
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("Seeded feedback for this paragraph.");
    await expect(page.locator("[data-comment-form]")).toHaveCount(0);
    await expect(reloadedTarget).toHaveClass(/is-feedback-source/);

    await panel.getByRole("button", { name: "Add comment" }).click();
    await expect(page.locator("[data-comment-form]")).toBeVisible();
    await expect(page.locator("[data-paragraph-feedback-panel]")).toHaveCount(
      0,
    );
  });

  test("allows paragraph selection to be cleared", async ({ page }) => {
    const target = page.locator("[data-comment-target]").nth(2);

    await target.click({ position: { x: 12, y: 12 } });
    await expect(target).toHaveClass(/is-feedback-selected/);

    await target.click({ position: { x: 12, y: 12 } });
    await expect(target).not.toHaveClass(/is-feedback-selected/);
  });
});

async function waitForFeedback(page: Page) {
  await expect(page.locator("html")).toHaveAttribute(
    "data-comments-ready",
    "true",
  );
}
