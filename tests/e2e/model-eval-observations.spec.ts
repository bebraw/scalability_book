import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/demos/#demo-model-evaluation-lab");
  await page.locator('[data-model-eval-tab="2"]').click();
});

test("sample output does not preselect quality or pretend to have run observations", async ({
  page,
}) => {
  const demo = page.locator("[data-model-eval]");
  await demo.locator("[data-model-eval-sample-all]").click();
  await expect(demo.locator('[data-model="x"][data-rubric="0"]')).toHaveValue(
    "0",
  );
  await expect(
    demo.getByLabel("Elapsed seconds for Attempt X", { exact: true }),
  ).toBeDisabled();
  await demo.locator('[data-model-eval-worked="x"]').click();
  await expect(demo.locator('[data-model="x"][data-rubric="0"]')).toHaveValue(
    "2",
  );
  await demo.locator('[data-model-eval-tab="3"]').click();
  await expect(demo.locator("[data-model-eval-results]")).toContainText(
    "Not recorded",
  );
  await expect(demo.locator("[data-model-eval-results]")).toContainText(
    "No model run",
  );
});

test("sourced zero cost stays distinct from missing data and does not break a quality tie", async ({
  page,
}) => {
  const demo = page.locator("[data-model-eval]");
  await demo
    .locator('[data-model-output="x"]')
    .fill("First independent attempt");
  await demo
    .locator('[data-model-output="y"]')
    .fill("Second independent attempt");
  await demo
    .getByLabel("Elapsed seconds for Attempt X", { exact: true })
    .fill("12.5");
  await demo.getByLabel("Cost in EUR for Attempt X", { exact: true }).fill("0");
  await demo
    .getByLabel("Source record for Attempt X", { exact: true })
    .fill("run-7/local-ledger");
  await demo.locator('[data-model-eval-tab="3"]').click();
  const rows = demo.locator("[data-model-eval-results] tr");
  await expect(rows.nth(0)).toContainText("12.5 s");
  await expect(rows.nth(0)).toContainText("0 EUR");
  await expect(rows.nth(1)).toContainText("Not recorded");
  await expect(demo.locator("[data-model-eval-verdict]")).toHaveText(
    "Attempt X / Attempt Y: 0/6",
  );
  await expect(demo.locator("[data-model-eval-conclusion]")).toContainText(
    "No cost or latency tie-break",
  );
});

test("unsourced observations cannot become evidence and replacing output clears stale claims", async ({
  page,
}) => {
  const demo = page.locator("[data-model-eval]");
  await demo.locator('[data-model-output="x"]').fill("An output");
  await demo.locator('[data-model-output="y"]').fill("Another output");
  await demo
    .getByLabel("Elapsed seconds for Attempt X", { exact: true })
    .fill("3");
  await demo.locator('[data-model="x"][data-rubric="0"]').fill("2");
  await demo
    .getByLabel("Evidence for Grounding in Attempt X", { exact: true })
    .fill("Line 2 names the query");
  await demo.locator('[data-model-eval-tab="3"]').click();
  await expect(demo.locator("[data-model-eval-results]")).toContainText(
    "Source required",
  );
  for (const check of await demo.getByRole("checkbox").all())
    await check.check();
  await demo.locator('[data-model-eval-tab="2"]').click();
  await demo.locator('[data-model-output="x"]').fill("A replacement output");
  await expect(
    demo.getByLabel("Elapsed seconds for Attempt X", { exact: true }),
  ).toHaveValue("");
  await expect(demo.locator('[data-model="x"][data-rubric="0"]')).toHaveValue(
    "0",
  );
  await expect(
    demo.getByLabel("Evidence for Grounding in Attempt X", { exact: true }),
  ).toHaveValue("");
  await demo.locator('[data-model-eval-tab="3"]').click();
  for (const check of await demo.getByRole("checkbox").all())
    await expect(check).not.toBeChecked();
});
