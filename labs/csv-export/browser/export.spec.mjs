import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("baseline: the supplied page displays and filters records", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await page
    .getByRole("searchbox", { name: "Filter by title or location" })
    .fill("API");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText('API "office hours"');
});

async function exportedText(page) {
  const pending = page.waitForEvent("download", { timeout: 3000 });
  await page
    .getByRole("button", { name: "Export visible rows", exact: true })
    .click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("events.csv");
  return readFile(await download.path(), "utf8");
}
test("download: all visible records retain exact text and row boundaries", async ({
  page,
}) => {
  await page.goto("/");
  expect(await exportedText(page)).toBe(
    'title,location\r\nArchitecture clinic,Room 204\r\n"Build, measure, learn",Main hall\r\n"API ""office hours""",Online\r\n"Design\nreview","Lab\r\nEast"\r\nÅland / 東京,\r\n',
  );
});
test("download: filter state controls the actual exported records", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("API");
  expect(await exportedText(page)).toBe(
    'title,location\r\n"API ""office hours""",Online\r\n',
  );
  await page.getByRole("searchbox").fill("no matching event");
  expect(await exportedText(page)).toBe("title,location\r\n");
});
