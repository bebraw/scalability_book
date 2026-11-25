import {
  expect,
  test,
  type Locator,
  type Page,
  type Route,
} from "@playwright/test";

const chapterPath = "/chapters/introduction/";

async function expectDiscussionLink(container: Locator, paragraphId: string) {
  const link = container.getByRole("link", {
    name: "Discuss with classmates",
    exact: true,
  });
  await expect(link).toBeVisible();
  await expect(link).toHaveJSProperty(
    "href",
    new URL(`${chapterPath}?inquiry=1#${paragraphId}`, container.page().url())
      .href,
  );
  await expect(link).toHaveAttribute("target", "_external");
  await expect(link).toHaveAttribute("rel", /\bnoopener\b/);
  await expect(link).toHaveAttribute("rel", /\bnoreferrer\b/);
  return link;
}

test.describe("paragraph feedback", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(chapterPath);
    await waitForFeedback(page);
  });

  test("shows authenticated admin controls without the old page feedback panel", async ({
    page,
  }) => {
    const toolsButton = page.getByRole("button", { name: "Tools" });
    const toolsPanel = page.locator("[data-tools-panel]");

    await expect(toolsButton).toBeVisible();
    await expect(toolsPanel).toBeHidden();
    await toolsButton.click();
    await expect(toolsButton).toHaveAttribute("aria-expanded", "true");
    await expect(toolsPanel).toBeVisible();
    await expect(page.locator("[data-comments-status]")).toContainText(
      "Feedback: local-editor",
    );
    await expect(page.locator("[data-comments-view]")).toHaveValue("admin");
    await expect(page.locator("[data-feedback-admin-link]")).toBeVisible();
    await expect(page.locator("[data-feedback-admin-link]")).toHaveAttribute(
      "href",
      "/admin/feedback/",
    );
    await expect(page.locator("[data-reflection-prompts]")).toBeVisible();
    await expect(page.locator(".comment-thread")).toHaveCount(0);
    await expect(page.locator("[data-stuck-button]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /stuck/i })).toHaveCount(0);
  });

  test("opens the side comment form and posts feedback for a paragraph", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const target = page.locator("[data-comment-target]").first();
    const button = target.locator("[data-comment-button]");

    await expect(button).toHaveCSS("opacity", "0");
    await target.hover();
    await expect(button).toHaveCSS("opacity", "1");

    await button.click();
    await expect(target).toHaveClass(/is-feedback-source/);

    const form = page.locator("[data-comment-form]");
    await expect(form).toBeVisible();
    const audience = form.locator("#paragraph-feedback-audience");
    await expect(audience).toBeFocused();
    await expect(audience).toBeInViewport({ ratio: 1 });
    await page.keyboard.press("Tab");
    await expect(
      form.getByRole("link", { name: "learning diary", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    const discussion = await expectDiscussionLink(
      form,
      (await target.getAttribute("id"))!,
    );
    await expect(discussion).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      form.getByRole("combobox", { name: "Category" }),
    ).toBeFocused();
    await expect(page.locator("[data-tools-panel]")).toBeHidden();
    await expect(page.locator("[data-paragraph-feedback-panel]")).toHaveCount(
      0,
    );

    await form.locator("textarea").fill("This paragraph needs a clearer hook.");
    await form.getByRole("button", { name: "Post comment" }).click();

    const panel = page.locator("[data-paragraph-feedback-panel]");
    await expect(form).toHaveCount(0);
    await expect(panel).toBeVisible();
    const confirmation = panel.getByRole("status");
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toContainText(/sent.*feedback team/i);
    await expect(confirmation).toContainText(/replies here/i);
    await expect(page.locator("[data-tools-panel]")).toBeHidden();
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
    await expectDiscussionLink(panel, paragraphId);
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

  for (const width of [1440, 390, 320]) {
    for (const fixture of [
      {
        name: "an ordinary unbroken token",
        body: "PRIVATE_BROWSER_chromium-desktop: Synthetic paragraph feedback.",
        author: "synthetic-reader",
        replies: [],
      },
      {
        name: "a long URL, author and reply",
        body: `https://example.invalid/feedback/${"a".repeat(96)}?trace=${"b".repeat(64)}`,
        author: "syntheticstudentwithaverylongloginname",
        replies: [
          {
            author: { login: "syntheticreviewerwithaverylongloginname" },
            body: `SYNTHETIC_REPLY_${"trace".repeat(18)}`,
            createdAt: "2026-11-17T08:00:00.000Z",
          },
        ],
      },
    ]) {
      test(`contains ${fixture.name} in related feedback at ${width}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        const paragraphId = await page
          .locator("[data-comment-button]")
          .first()
          .getAttribute("data-comment-button");
        expect(paragraphId).toBeTruthy();
        await page.route("**/api/comments?chapter=introduction", (route) =>
          route.fulfill({
            json: [
              {
                id: "synthetic-overflow-comment",
                chapter: "introduction",
                paragraphId,
                category: "missing-example",
                body: fixture.body,
                author: { login: fixture.author },
                createdAt: "2026-11-17T07:00:00.000Z",
                replies: fixture.replies,
              },
            ],
          }),
        );
        await page.reload();
        await waitForFeedback(page);
        await page.evaluate(() => document.fonts.ready);
        await page.locator(`[data-comment-button="${paragraphId}"]`).click();
        const panel = page.locator("[data-paragraph-feedback-panel]");
        const card = panel.locator(".paragraph-feedback-card");
        await expect(card.locator(":scope > p")).toHaveText(fixture.body);
        await expect(card.locator(":scope > p")).toBeVisible();
        await expect(card.locator(":scope > .comment-meta strong")).toHaveText(
          fixture.author,
        );
        if (fixture.replies.length) {
          await expect(card.locator(".comment-reply p")).toHaveText(
            fixture.replies[0].body,
          );
          await expect(card.locator(".comment-reply p")).toBeVisible();
          await expect(
            card.locator(".comment-reply .comment-meta strong"),
          ).toHaveText(fixture.replies[0].author.login);
        }
        const geometry = await panel.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const lines = Array.from(
            element.querySelectorAll(".comment-card p, .comment-meta strong"),
          ).flatMap((text) => {
            const range = document.createRange();
            range.selectNodeContents(text);
            return Array.from(range.getClientRects(), (rect) => ({
              left: rect.left,
              right: rect.right,
            }));
          });
          return {
            left: bounds.left,
            right: bounds.right,
            client: element.clientWidth,
            scroll: element.scrollWidth,
            pageClient: document.documentElement.clientWidth,
            pageScroll: document.documentElement.scrollWidth,
            lines,
          };
        });
        expect(geometry.scroll).toBe(geometry.client);
        expect(geometry.pageScroll).toBe(geometry.pageClient);
        expect(geometry.left).toBeGreaterThanOrEqual(0);
        expect(geometry.right).toBeLessThanOrEqual(width);
        expect(geometry.lines.length).toBeGreaterThan(0);
        for (const line of geometry.lines) {
          expect(line.left).toBeGreaterThanOrEqual(geometry.left);
          expect(line.right).toBeLessThanOrEqual(geometry.right);
        }

        const reply = card.getByRole("button", { name: "Reply", exact: true });
        await reply.focus();
        await expect(reply).toBeFocused();
        await expect(reply).toBeInViewport({ ratio: 1 });
        await page.keyboard.press("Tab");
        const more = card.locator("summary");
        await expect(more).toBeFocused();
        await expect(more).toBeInViewport({ ratio: 1 });
        await page.keyboard.press("Enter");
        await page.keyboard.press("Tab");
        const feature = card.getByRole("button", {
          name: "Feature",
          exact: true,
        });
        await expect(feature).toBeFocused();
        await expect(feature).toBeInViewport();
        const readControl = () =>
          feature.evaluate((button) => {
            const bounds = button.getBoundingClientRect();
            const panel = button.closest("[data-paragraph-feedback-panel]")!;
            const parent = panel.getBoundingClientRect();
            const style = getComputedStyle(panel);
            return {
              left: bounds.left,
              right: bounds.right,
              top: bounds.top,
              bottom: bounds.bottom,
              visibleLeft: Math.max(
                0,
                parent.left + parseFloat(style.borderLeftWidth),
              ),
              visibleRight: Math.min(
                innerWidth,
                parent.right - parseFloat(style.borderRightWidth),
              ),
              visibleTop: Math.max(
                0,
                parent.top + parseFloat(style.borderTopWidth),
              ),
              visibleBottom: Math.min(
                innerHeight,
                parent.bottom - parseFloat(style.borderBottomWidth),
              ),
            };
          });
        const control = await readControl();
        expect(control.left).toBeGreaterThanOrEqual(control.visibleLeft);
        expect(control.right).toBeLessThanOrEqual(control.visibleRight);
        // Native focus scrolling rounds scrollTop to whole pixels. Allow only
        // that vertical rounding after scrolling settles; horizontal containment
        // remains exact.
        await expect
          .poll(async () => {
            const settled = await readControl();
            return Math.max(
              0,
              settled.visibleTop - settled.top,
              settled.bottom - settled.visibleBottom,
            );
          })
          .toBeLessThanOrEqual(1);
        expect(await panel.evaluate((element) => element.scrollLeft)).toBe(0);
        await panel
          .getByRole("button", { name: "Close related feedback" })
          .click();
        await expect(panel).toHaveCount(0);
        await page.locator(`[data-comment-button="${paragraphId}"]`).click();
        await page
          .locator("[data-paragraph-feedback-panel]")
          .getByRole("button", { name: "Add comment" })
          .click();
        await expect(page.locator("[data-comment-form]")).toBeVisible();
      });
    }
  }
});

test("offers class discussion when feedback sign-in is unavailable", async ({
  page,
}) => {
  await page.route("/api/auth/status", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        available: false,
        authenticated: false,
        admin: false,
        user: null,
        loginUrl: null,
      }),
    });
  });

  await page.goto(chapterPath);

  await expect(page.locator("html")).toHaveAttribute(
    "data-comments-ready",
    "false",
  );
  await expect(page.locator("[data-reflection-prompts]")).toBeHidden();
  await expect(page.locator("[data-feedback-admin-link]")).toBeHidden();
  const paragraph = page.locator("[data-comment-target]").nth(3);
  await paragraph.click({ position: { x: 12, y: 12 } });
  await paragraph.locator("[data-comment-button]").click();
  const panel = page.locator("[data-paragraph-feedback-panel]");
  await expect(panel).toContainText("Feedback sign-in is unavailable");
  await expectDiscussionLink(panel, (await paragraph.getAttribute("id"))!);
});

for (const width of [1440, 390]) {
  test(`logged-out readers open public Reader notes before signing in at ${width}px`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const loginUrl = "/api/auth/github/start";
    // Model the Web viewer and regular browser with independent sign-in state.
    let browserSignedIn = false;
    const userFor = (route: Route) =>
      browserSignedIn && route.request().frame().page() !== page
        ? { id: 7, login: "synthetic-reader" }
        : null;
    await context.route("**/api/auth/status", (route) =>
      route.fulfill({
        json: {
          available: true,
          authenticated: Boolean(userFor(route)),
          admin: false,
          user: userFor(route),
          loginUrl,
        },
      }),
    );
    await context.route("**/api/account/status", (route) =>
      route.fulfill({
        json: {
          local: false,
          github: { available: true, user: userFor(route), loginUrl },
          course: { available: false, emailAvailable: false, user: null },
          answers: null,
        },
      }),
    );
    const writes: string[] = [];
    let notes: object[] = [];
    await context.route("**/api/comments**", (route) => {
      if (route.request().method() === "GET")
        return route.fulfill({ json: notes });
      writes.push(route.request().method());
      return route.fulfill({
        status: 401,
        json: { message: "Sign in before commenting." },
      });
    });
    await page.goto(chapterPath + "?reader=local#previous-section");
    await expect(page.locator("html")).toHaveAttribute(
      "data-comments-ready",
      "false",
    );
    const paragraphId = await page
      .locator("[data-comment-button]")
      .first()
      .getAttribute("data-comment-button");
    expect(paragraphId).toBeTruthy();
    const body =
      "Curated public explanation: separate latency from throughput.";
    // Match the Worker's public projection, not its private stored record.
    notes = [
      {
        id: "featured-synthetic-public-source",
        sourceId: "synthetic-public-source",
        chapter: "introduction",
        paragraphId,
        body,
        author: { login: "Reader note", avatarUrl: null, url: null },
        createdAt: "2026-11-17T08:00:00.000Z",
        featuredAt: "2026-11-17T08:00:00.000Z",
        publicNote: true,
        replies: [],
      },
    ];
    await page.reload();
    const badge = page.locator(`[data-comment-button="${paragraphId}"]`);
    await expect(badge).toHaveAttribute("data-comment-count", "1");
    await expect(badge).toBeVisible();
    await badge.focus();
    await page.keyboard.press("Enter");
    const panel = page.locator("[data-paragraph-feedback-panel]");
    await expect(panel).toBeVisible();
    await expect(panel.locator(".paragraph-feedback-card > p")).toHaveText(
      body,
    );
    await expect(panel.locator(".comment-meta strong")).toHaveText(
      "Reader note",
    );
    await expect(panel.locator(".comment-replies")).toHaveCount(0);
    await expect(panel.locator(".comment-card-actions")).toHaveCount(0);
    await expectDiscussionLink(panel, paragraphId!);
    await expect(page.locator("[data-comment-form]")).toHaveCount(0);
    const account = (reader: Page) =>
      reader.getByRole("dialog", {
        name: "Account & connections",
        exact: true,
      });
    await expect(account(page)).not.toBeVisible();
    await panel.getByRole("button", { name: "Close related feedback" }).click();
    await expect(panel).toHaveCount(0);
    await badge.click();
    const signIn = panel.getByRole("link", {
      name: "Sign in to comment",
      exact: true,
    });
    const target = chapterPath + "?feedback=comment#" + paragraphId;
    await expect(signIn).toBeVisible();
    expect(await signIn.evaluate((el: HTMLAnchorElement) => el.href)).toBe(
      new URL(target, page.url()).href,
    );
    // Obsidian's Web viewer opens this named target in the operating system browser.
    await expect(signIn).toHaveAttribute("target", "_external");
    const opened = context.waitForEvent("page");
    await signIn.click();
    const browser = await opened;
    const github = account(browser).getByRole("link", {
      name: "Sign in with GitHub",
      exact: true,
    });
    await expect(github).toHaveAttribute(
      "href",
      `${loginUrl}?returnTo=${encodeURIComponent(target)}`,
    );
    expect(await browser.evaluate(() => window.opener === null)).toBe(true);
    await expect(browser.locator("[data-comment-form]")).toHaveCount(0);
    await expect(panel).toContainText(body);
    await expect(account(page)).not.toBeVisible();
    await expect(page.locator("[data-comment-form]")).toHaveCount(0);
    // The Worker tests own the OAuth exchange; follow its return destination here.
    await context.route("**/api/auth/github/start?*", (route) => {
      browserSignedIn = true;
      return route.fulfill({
        contentType: "text/html",
        body: '<script>location.replace(new URL(location.href).searchParams.get("returnTo"))</script>',
      });
    });
    await github.click();
    await expect(browser.locator("[data-comment-form]")).toHaveAttribute(
      "data-comment-form",
      paragraphId!,
    );
    await expect(account(browser)).not.toBeVisible();
    await browser.close();

    await panel.getByRole("button", { name: "Close related feedback" }).click();
    const other = page.locator("[data-comment-target]").nth(1);
    const otherId = await other.getAttribute("id");
    await other.click({ position: { x: 12, y: 12 } });
    const otherBadge = other.locator("[data-comment-button]");
    await expect(otherBadge).toHaveAttribute("data-comment-count", "");
    await otherBadge.click();
    const next = context.waitForEvent("page");
    await signIn.click();
    const returningBrowser = await next;
    await expect(
      returningBrowser.locator("[data-comment-form]"),
    ).toHaveAttribute("data-comment-form", otherId!);
    await expect(account(returningBrowser)).not.toBeVisible();
    await expect(account(page)).not.toBeVisible();
    const reading = await context.newPage();
    for (const url of [
      chapterPath + "#" + otherId,
      chapterPath + "?feedback=comment#no-such-paragraph",
    ]) {
      await reading.goto(url);
      await waitForFeedback(reading);
      await expect(reading.locator("[data-comment-form]")).toHaveCount(0);
      await expect(account(reading)).not.toBeVisible();
    }
    expect(writes).toEqual([]);
  });
}

async function waitForFeedback(page: Page) {
  await expect(page.locator("html")).toHaveAttribute(
    "data-comments-ready",
    "true",
  );
}
