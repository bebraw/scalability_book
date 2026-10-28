import { expect, test } from "@playwright/test";

test("compact parent entry opens the entire topic after highlighting a subcategory", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/concepts/?subtopic=flow-control&group-view=highlight");
  const map = page.locator("#concept-graph");
  await expect(
    map.getByRole("combobox", { name: "Subcategory", exact: true }),
  ).toHaveValue("flow-control");
  await map
    .getByRole("button", {
      name: "Zoom to Operations, 10 concepts",
      exact: true,
    })
    .click();
  await expect(
    map.getByRole("combobox", { name: "Subcategory", exact: true }),
  ).toHaveValue("");
  await expect(map.locator(".concept-node-title:visible")).toHaveCount(10);
  await expect(page).not.toHaveURL(/subtopic=/);
});

test("subcategories share their exact concept subset between Graph, List and a saved URL", async ({
  page,
}) => {
  // A previous concept fragment must not take precedence over a new subgroup
  // after switching to List and reopening its saved URL.
  await page.goto("/concepts/?view=all#queue");
  const map = page.locator("#concept-graph");
  const group = map.locator("[data-concept-group]");
  const subgroup = map.locator("[data-concept-subgroup]");
  const control = map.locator("[data-concept-subgroup-control]");
  const reading = map.locator("[data-concept-reading]");
  const search = page.getByLabel("Find a concept");
  const graphIds = () =>
    map
      .locator("[data-concept-node]:not(.is-hidden)")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-concept-node")).sort(),
      );
  const expected = [
    "latency",
    "little-law",
    "measurement-boundary",
    "observability",
    "throughput",
  ];

  await expect(control).not.toBeVisible();
  await group.selectOption("Evidence");
  await expect(control).toBeVisible();
  expect(
    await subgroup
      .locator('option[value="flow-control"]')
      .evaluate((option) => {
        const item = option as HTMLOptionElement;
        return { hidden: item.hidden, disabled: item.disabled };
      }),
  ).toEqual({ hidden: true, disabled: true });
  await search.fill("cache");
  await reading.selectOption("/chapters/architecture/");
  await subgroup.selectOption("measurement-flow");
  await expect(search).toHaveValue("");
  await expect(reading).toHaveValue("");
  await expect(
    map.locator('[data-concept-group-mode][value="only"]'),
  ).toBeChecked();
  await expect.poll(graphIds).toEqual(expected);
  await expect(page).toHaveURL(/subtopic=measurement-flow/);
  expect(new URL(page.url()).hash).toBe("");
  await expect(map.locator("[data-concept-map-status]")).toContainText(
    "Measurement & flow only",
  );

  await page.getByRole("tab", { name: "List", exact: true }).click();
  const listedIds = () =>
    page
      .locator(".concept-directory [data-concept-result]:visible")
      .evaluateAll((rows) =>
        rows.map((row) => row.getAttribute("data-concept-result")).sort(),
      );
  await expect.poll(listedIds).toEqual(expected);
  await page.reload();
  await expect(group).toHaveValue("Evidence");
  await expect(subgroup).toHaveValue("measurement-flow");
  await expect.poll(listedIds).toEqual(expected);

  await group.selectOption("Development");
  await expect(subgroup).toHaveValue("");
  await expect(page).not.toHaveURL(/subtopic=/);
  await expect(
    page.locator(".concept-directory [data-concept-result]:visible"),
  ).toHaveCount(15);
  await map.getByRole("button", { name: "Reset view", exact: true }).click();
  await expect(group).toHaveValue("");
  await expect(control).not.toBeVisible();
  await expect(
    page.locator(".concept-directory [data-concept-result]:visible"),
  ).toHaveCount(45);
  await expect(page).not.toHaveURL(/theme=|subtopic=|group-view=/);
});

test("overview subcategory entry and standalone subtopic links select the correct parent", async ({
  page,
}) => {
  await page.goto("/concepts/?view=all");
  const map = page.locator("#concept-graph");
  await map
    .locator('[data-concept-subgroup-target="behavior-correctness"]')
    .click();
  await expect(map.locator("[data-concept-group]")).toHaveValue("Architecture");
  await expect(map.locator("[data-concept-subgroup]")).toHaveValue(
    "behavior-correctness",
  );
  await expect(map.locator("[data-concept-node]:not(.is-hidden)")).toHaveCount(
    3,
  );
  for (const id of ["contract", "invariant", "idempotency"])
    await expect(map.locator(`[data-concept-node="${id}"]`)).not.toHaveClass(
      /is-hidden/,
    );

  await page.goto("/concepts/?subtopic=parallel-work-review");
  await expect(map.locator("[data-concept-group]")).toHaveValue("Development");
  await expect(map.locator("[data-concept-subgroup]")).toHaveValue(
    "parallel-work-review",
  );
  await expect(map.locator("[data-concept-node]:not(.is-hidden)")).toHaveCount(
    4,
  );
  for (const id of ["agent-fleet", "task-graph", "review-budget", "amdahl-law"])
    await expect(map.locator(`[data-concept-node="${id}"]`)).not.toHaveClass(
      /is-hidden/,
    );
  await map.locator("[data-concept-focus]").selectOption("queue");
  await expect(map.locator("[data-concept-group]")).toHaveValue("");
  await expect(map.locator("[data-concept-subgroup]")).toHaveValue("");
  await expect(page).not.toHaveURL(/subtopic=/);
});
