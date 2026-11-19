import { expect, test } from "@playwright/test";

test.use({ contextOptions: { reducedMotion: "reduce" } });

for (const [edition, introduction] of [
  ["current", "/project/introduction/"],
  ["archived", "/project/requirements/2026-10-v2/introduction/"],
]) {
  for (const width of [1440, 960, 390]) {
    test(`the ${edition} introduction reveals the setup walkthrough at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      // Routing disables the browser cache so the setup page loads its stylesheet again.
      await page.route("**/api/**", (route) => route.continue());
      await page.goto(introduction);
      await page
        .getByRole("link", { name: "learning-diary criteria", exact: true })
        .click();
      await expect(
        page.locator("#participation-and-learning-diary-3-points-per-lecture"),
      ).toBeInViewport();
      await page.goto(introduction);
      await page
        .getByRole("link", {
          name: "setup guide's submission walkthrough",
          exact: true,
        })
        .click();
      await expect(page).toHaveURL(
        /\/notebook\/setup\/#prepare-material-for-your-portfolio$/,
      );
      await page.waitForLoadState("load");
      await page.evaluate(() => document.fonts.ready);

      const heading = page.locator("h3:target");
      await expect(heading).toContainText(
        "Prepare material for your portfolio",
      );
      await expect
        .poll(() =>
          heading.evaluate((element) => {
            const box = element.getBoundingClientRect();
            const x = box.left + box.width / 2;
            return [box.top + 1, box.bottom - 1].map((y) => {
              const hit = document.elementFromPoint(x, y);
              return element.contains(hit)
                ? "heading"
                : (hit?.tagName.toLowerCase() ?? "outside viewport");
            });
          }),
        )
        .toEqual(["heading", "heading"]);
    });
  }
}
