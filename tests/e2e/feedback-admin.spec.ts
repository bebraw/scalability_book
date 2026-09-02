import { expect, test } from "@playwright/test";

test("links an authenticated admin to the feedback overview", async ({
  page,
}) => {
  await page.goto("/");

  const toolsButton = page.getByRole("button", { name: "Tools" });
  await expect(toolsButton).toBeVisible();
  await toolsButton.click();

  const overviewLink = page.getByRole("link", { name: /feedback overview/i });
  await expect(overviewLink).toHaveAttribute("href", "/admin/feedback/");
  await overviewLink.click();

  await expect(page).toHaveURL(/\/admin\/feedback\/$/);
  await expect(page.locator("[data-feedback-admin-dashboard]")).toBeVisible();
});

test("collects feedback from across the book into one review view", async ({
  page,
}) => {
  const introductionParagraph = await paragraphIdFor(
    page,
    "/chapters/introduction/",
    5,
  );
  const scalingParagraph = await paragraphIdFor(page, "/chapters/scaling/");

  await page.request.post("/api/comments", {
    data: {
      chapter: "introduction",
      paragraphId: introductionParagraph,
      category: "unclear-concept",
      body: "Dashboard seed: clarify the opening definition.",
    },
  });
  await page.request.post("/api/comments", {
    data: {
      chapter: "scaling",
      paragraphId: scalingParagraph,
      category: "missing-example",
      body: "Dashboard seed: add a scaling example.",
    },
  });

  await page.goto("/admin/feedback/");

  await expect(page.locator("[data-feedback-admin-dashboard]")).toBeVisible();
  await expect(page.locator("[data-feedback-admin-identity]")).toContainText(
    "local-editor",
  );
  await expect(page.locator("[data-feedback-list]")).toContainText(
    "Dashboard seed: clarify the opening definition.",
  );
  await expect(page.locator("[data-feedback-list]")).toContainText(
    "Dashboard seed: add a scaling example.",
  );
  await expect(page.locator('[data-feedback-metric="chapters"]')).toHaveText(
    "2",
  );
  await expect(page.locator('[data-feedback-metric="open"]')).toHaveText("2");
  await expect(page.locator('[data-feedback-metric="resolved"]')).toHaveText(
    "0",
  );

  const introductionCard = page.locator(".feedback-admin-card", {
    hasText: "Dashboard seed: clarify the opening definition.",
  });
  await expect(
    introductionCard.getByRole("link", { name: /open feedback context/i }),
  ).toHaveAttribute("href", `/chapters/introduction/#${introductionParagraph}`);

  await introductionCard.getByRole("button", { name: "Resolve" }).click();
  await introductionCard
    .getByRole("combobox", { name: "Resolution outcome" })
    .selectOption("fixed");
  await introductionCard
    .getByRole("button", { name: "Resolve and archive" })
    .click();

  await expect(introductionCard).toHaveCount(0);
  await expect(page.locator('[data-feedback-metric="open"]')).toHaveText("1");
  await expect(page.locator('[data-feedback-metric="resolved"]')).toHaveText(
    "1",
  );
  await expect(page.locator("[data-feedback-action-status]")).toContainText(
    "moved to the archive",
  );

  const statusFilter = page.locator('select[name="status"]');
  await statusFilter.selectOption("resolved");
  const archivedCard = page.locator(".feedback-admin-card", {
    hasText: "Dashboard seed: clarify the opening definition.",
  });
  await expect(archivedCard).toBeVisible();
  await expect(archivedCard).toContainText("Fixed");
  await expect(
    archivedCard.getByRole("button", { name: "Resolve" }),
  ).toHaveCount(0);

  await page.reload();
  await expect(page.locator("[data-feedback-admin-dashboard]")).toBeVisible();
  await expect(page.locator('select[name="status"]')).toHaveValue("open");
  await expect(page.locator(".feedback-admin-card")).toHaveCount(1);
  await page.locator('select[name="status"]').selectOption("resolved");
  await expect(
    page.locator(".feedback-admin-card", {
      hasText: "Dashboard seed: clarify the opening definition.",
    }),
  ).toBeVisible();

  await statusFilter.selectOption("open");

  await page
    .getByPlaceholder("Comment, author, or chapter")
    .fill("scaling example");
  await expect(page.locator(".feedback-admin-card")).toHaveCount(1);
  await expect(page.locator("[data-feedback-result-summary]")).toContainText(
    "1 open issue",
  );

  await page.locator("[data-feedback-filters]").getByRole("button").click();
  await expect(page.locator(".feedback-admin-card")).toHaveCount(1);

  await page.setViewportSize({ width: 390, height: 844 });
  const pageWidth = await page.locator("html").evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
  }));
  expect(pageWidth.scroll).toBeLessThanOrEqual(pageWidth.client);
});

test("keeps private feedback hidden from non-admin readers", async ({
  page,
}) => {
  await page.route("/api/auth/status", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        available: true,
        authenticated: true,
        admin: false,
        user: { login: "student-reader" },
        loginUrl: "/api/auth/github/start",
      }),
    });
  });

  await page.goto("/admin/feedback/");

  await expect(page.locator("[data-feedback-admin-link]")).toBeHidden();
  await expect(page.getByRole("button", { name: "Tools" })).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Administrator access required" }),
  ).toBeVisible();
  await expect(page.locator("[data-feedback-admin-dashboard]")).toBeHidden();
});

async function paragraphIdFor(
  page: import("@playwright/test").Page,
  chapterPath: string,
  index = 0,
): Promise<string> {
  await page.goto(chapterPath);
  const paragraphId = await page
    .locator("[data-comment-button]")
    .nth(index)
    .getAttribute("data-comment-button");

  if (!paragraphId) {
    throw new Error(`Expected paragraph feedback target at ${chapterPath}`);
  }

  return paragraphId;
}
