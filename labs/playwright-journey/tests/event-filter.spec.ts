import { expect, test } from "@playwright/test";

test("filters recorded events", async ({ page }) => {
  await page.goto(new URL("../fixture.html", import.meta.url).href);

  await page.getByRole("searchbox", { name: "Filter events" }).fill("retry");

  await expect(page.locator("li:visible")).toHaveText(["storage.retry"]);
});
