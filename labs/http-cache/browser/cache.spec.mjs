import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

test.beforeEach(async ({ request, page }) => {
  await request.post("/control/reset");
  await page.goto("/");
});
async function fetchSummary(page, count) {
  await page
    .getByRole("button", { name: "Fetch summary", exact: true })
    .click();
  await expect(page.locator("#fetches")).toHaveText(String(count), {
    timeout: 3000,
  });
}
async function record(request, name) {
  const result = await (await request.get("/control/log")).json();
  await mkdir("test-results/runs", { recursive: true });
  await writeFile(
    `test-results/runs/${name}.json`,
    JSON.stringify(result, null, 2) + "\n",
  );
  return result;
}
test("baseline: supplied UI and synthetic origin controls work", async ({
  page,
}) => {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Which request reached the origin?",
  );
  await expect(page.locator("#origin-count")).toHaveText("0");
  await page
    .getByRole("button", { name: "Change origin body", exact: true })
    .click();
  await expect(page.locator("#version")).toHaveText("2");
  await expect(page.locator("#origin-count")).toHaveText("0");
});
test("a fresh browser entry is reused even after the origin body changes", async ({
  page,
  request,
}) => {
  await fetchSummary(page, 1);
  await expect(page.locator("#body")).toContainText('"version": 1');
  await fetchSummary(page, 2);
  await expect(page.locator("#origin-count")).toHaveText("1");
  await page
    .getByRole("button", { name: "Change origin body", exact: true })
    .click();
  await fetchSummary(page, 3);
  await expect(page.locator("#body")).toContainText('"version": 1');
  const result = await record(request, "fresh-browser");
  expect(result.version).toBe(2);
  expect(result.requests).toEqual([
    { policy: "fresh", version: 1, ifNoneMatch: null, status: 200 },
  ]);
});
test("browser validation sends its ETag, reuses the stored body on 304 and sees a changed version", async ({
  page,
  request,
}) => {
  await page
    .getByLabel("Response policy", { exact: true })
    .selectOption("validate");
  await fetchSummary(page, 1);
  await fetchSummary(page, 2);
  await expect(page.locator("#body")).toContainText('"version": 1');
  // The browser combines network 304 with its stored body; JS sees a 200 response.
  await expect(page.getByRole("status")).toContainText("status 200");
  const unchanged = await record(request, "validated-browser");
  expect(unchanged.requests).toEqual([
    { policy: "validate", version: 1, ifNoneMatch: null, status: 200 },
    {
      policy: "validate",
      version: 1,
      ifNoneMatch: '"summary-v1"',
      status: 304,
    },
  ]);
  await page
    .getByRole("button", { name: "Change origin body", exact: true })
    .click();
  await fetchSummary(page, 3);
  await expect(page.locator("#body")).toContainText('"version": 2');
  const changed = await record(request, "changed-browser");
  expect(changed.requests[2]).toEqual({
    policy: "validate",
    version: 2,
    ifNoneMatch: '"summary-v1"',
    status: 200,
  });
});
