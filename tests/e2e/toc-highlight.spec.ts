import { expect, test, type Locator, type Page } from "@playwright/test";

const chapter = "/chapters/what-is-scalability/";
const nextChapter = "/chapters/benchmarking/";

test.use({ contextOptions: { reducedMotion: "reduce" } });

test("tracks the current section while reading and keeps both lists in reach beside Notebook", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(chapter);
  await openNotebook(page);
  const navigation = page.locator("#book-navigation");
  const activeLink = navigation.locator(
    '.local-toc a[aria-current="location"]',
  );
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await expect(activeLink).toHaveAttribute("href", "#summary");
  const currentSection = page.locator(".prose #project-artifact");
  await currentSection.evaluate((element) =>
    element.scrollIntoView({ block: "start" }),
  );
  await expect(activeLink).toHaveAttribute("href", "#project-artifact");
  await expect(activeLink).toBeInViewport({ ratio: 1 });

  const next = navigation.locator(`a[href="${nextChapter}"]`);
  await next.focus();
  await expect(next).toBeFocused();
  await expect(next).toBeInViewport({ ratio: 1 });
  await expect(currentSection).toBeInViewport();
  await expect(activeLink).toBeInViewport({ ratio: 1 });
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(nextChapter);
  await expect(
    page.locator('.book-sidebar a[aria-current="page"]'),
  ).toHaveAttribute("href", nextChapter);
});

for (const width of [1024, 390]) {
  test(`a reader can reach sections and chapters from lower in the page at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(chapter);
    await page
      .locator(".prose #summary")
      .evaluate((element) => element.scrollIntoView({ block: "center" }));

    const navigation = page.locator("#book-navigation");
    const toggle = navigation.locator("summary");
    await expect(navigation.locator("details")).not.toHaveAttribute("open", "");
    await expect(toggle).toBeInViewport({ ratio: 1 });
    await toggle.click();
    const sectionLink = navigation.getByRole("link", {
      name: "Reason from pressure to evidence",
    });
    await sectionLink.focus();
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
    await expect(sectionLink).toBeHidden();

    await page.keyboard.press("Enter");
    await sectionLink.click();
    await expect(page).toHaveURL(chapter + "#reason-from-pressure-to-evidence");
    await expect(sectionLink).toBeHidden();
    await expectUncoveredHeading(page.locator("h2:target"));

    await expect(toggle).toBeInViewport({ ratio: 1 });
    await toggle.click();
    await navigation.locator(`a[href="${nextChapter}"]`).click();
    await expect(page).toHaveURL(nextChapter);
    await expect(navigation.locator("details")).not.toHaveAttribute("open", "");
  });
}

for (const [width, height] of [
  [320, 568],
  [844, 390],
]) {
  test(`Notebook leaves navigation links clickable at ${width}×${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto(chapter);
    const notebook = await openNotebook(page);
    await page
      .locator(".prose #summary")
      .evaluate((element) => element.scrollIntoView({ block: "center" }));

    const navigation = page.locator("#book-navigation details");
    const toggle = navigation.locator("summary");
    await expect(navigation).toHaveJSProperty("open", false);
    await expect(toggle).toBeInViewport({ ratio: 1 });
    await toggle.click();
    await navigation.getByRole("link", { name: "Project artifact" }).click();
    await expect(page).toHaveURL(chapter + "#project-artifact");
    await expect(page.locator("h2:target")).toBeFocused();
    await expect(navigation).toHaveJSProperty("open", false);
    await expect(notebook).toBeVisible();
  });
}

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test.describe(`without JavaScript, motion preference ${reducedMotion}`, () => {
    test.use({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
      contextOptions: { reducedMotion },
    });

    test("the native disclosure offers working chapter and section links", async ({
      page,
    }) => {
      await page.goto(chapter + "#summary");
      expect(
        await page.evaluate(
          () => matchMedia("(prefers-reduced-motion: reduce)").matches,
        ),
      ).toBe(reducedMotion === "reduce");
      const navigation = page.locator("#book-navigation");
      const sectionLink = navigation.getByRole("link", {
        name: "Four pressures organize the course",
      });
      const toggle = navigation.locator("summary");
      await expect(sectionLink).toBeHidden();
      await expect(toggle).toBeInViewport({ ratio: 1 });
      await expectUncoveredHeading(page.locator("h2:target"));
      await toggle.press("Enter");
      await sectionLink.press("Enter");
      await expect(page).toHaveURL(
        chapter + "#four-pressures-organize-the-course",
      );
      // Sample the first position after the native jump, before any polling.
      expect(await headingIsUncovered(page.locator("h2:target"))).toBe(true);
      const next = navigation.locator(`a[href="${nextChapter}"]`);
      if (!(await next.isVisible())) await toggle.press("Enter");
      await next.press("Enter");
      await expect(page).toHaveURL(nextChapter);
    });
  });
}

async function openNotebook(page: Page) {
  await page
    .getByRole("group", { name: "Learning tools" })
    .getByRole("button", { name: "Notebook", exact: true })
    .click();
  const notebook = page.locator("#learning-notebook");
  await expect(notebook).toBeVisible();
  return notebook;
}

async function expectUncoveredHeading(heading: Locator) {
  await expect(heading).toBeInViewport({ ratio: 1 });
  await expect.poll(() => headingIsUncovered(heading)).toBe(true);
}

function headingIsUncovered(heading: Locator) {
  return heading.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const x = box.left + box.width / 2;
    return [box.top + 1, box.bottom - 1].every((y) =>
      element.contains(document.elementFromPoint(x, y)),
    );
  });
}
