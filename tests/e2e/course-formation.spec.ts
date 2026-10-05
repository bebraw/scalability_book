import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("students confirm a pair; teacher completes a trio, approves a fourth member and publishes without sharing private notes", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/admin/courses/");
  if (await page.locator("[data-back]").count())
    await page.locator("[data-back]").click();
  const create = page.locator('form[data-form="create"]');
  await create
    .getByRole("textbox", { name: "Course name", exact: true })
    .fill(`Formation ${Date.now()}`);
  await create
    .getByRole("button", { name: "Create course", exact: true })
    .click();
  const roster = page.locator('form[data-form="students"]');
  await roster
    .getByRole("textbox", { name: "Roster CSV", exact: true })
    .fill(
      "student_number,name,github_id,github_login\n" +
        ["Alice", "Bob", "Claire", "Daniel", "Elena", "Frank", "Grace"]
          .map((name, i) => `TEST${i},${name} Example,${i + 2},student${i + 2}`)
          .join("\n"),
    );
  await roster
    .getByRole("textbox", { name: "Reason for change", exact: true })
    .fill("Synthetic formation roster");
  await roster
    .getByRole("button", { name: "Save roster", exact: true })
    .click();
  await expect(page.locator("[data-course-notice]")).toContainText("Saved.");
  const id = await page.locator("[data-course-select]").inputValue();
  await page.getByRole("button", { name: "Groups", exact: true }).click();
  const formation = page.locator('form[data-form="formation"]');
  await formation
    .getByRole("textbox", { name: "Formation change reason", exact: true })
    .fill("Open the proposal period");
  await formation
    .getByRole("button", { name: "Open group formation", exact: true })
    .click();
  await expect(page.locator("[data-course-notice]")).toContainText("Saved.");
  const contexts = await Promise.all(
    [2, 3, 4].map((id) =>
      browser.newContext({
        extraHTTPHeaders: { "x-course-test-user": String(id) },
      }),
    ),
  );
  const [alice, bob, claire] = await Promise.all(
    contexts.map((context) => context.newPage()),
  );
  for (const student of [alice!, bob!, claire!]) {
    await student.goto(`/course/?course=${id}`);
    await student.getByRole("button", { name: "Groups", exact: true }).click();
  }
  const preference = claire!.locator('form[data-form="group-preference"]');
  await preference
    .getByRole("combobox", { name: "Instructor allocation", exact: true })
    .selectOption("assign");
  await preference
    .getByRole("checkbox", {
      name: "Show my name as available to join a group",
      exact: true,
    })
    .check();
  await preference
    .getByRole("textbox", {
      name: "Meeting availability (private to you and staff)",
      exact: true,
    })
    .fill("PRIVATE evening availability");
  await preference
    .getByRole("textbox", {
      name: "Relevant support or matching constraints (private to you and staff)",
      exact: true,
    })
    .fill("PRIVATE matching constraint");
  await preference
    .getByRole("button", { name: "Save allocation preference", exact: true })
    .click();
  await expect(claire!.locator("[data-course-notice]")).toContainText("Saved.");
  const proposal = alice!.locator('form[data-form="group-proposal"]');
  await proposal
    .getByRole("textbox", { name: "Optional group display name", exact: true })
    .fill("Cedar");
  await proposal.locator('[name="members"]').selectOption(["github:3"]);
  await proposal
    .getByRole("button", { name: "Submit proposal", exact: true })
    .click();
  await expect(alice!.locator("[data-course-notice]")).toContainText("Saved.");
  await bob!
    .getByRole("button", { name: "Refresh records", exact: true })
    .click();
  await bob!
    .getByRole("button", { name: "Confirm participation", exact: true })
    .click();
  await expect(bob!.locator("[data-course-notice]")).toContainText("Saved.");
  await page
    .getByRole("button", { name: "Refresh records", exact: true })
    .click();
  await expect(page.locator("[data-course-content]")).toContainText(
    "2/2 confirmed",
  );
  await page
    .getByRole("button", { name: "Add proposal to allocation", exact: true })
    .click();
  const groups = page.locator('form[data-form="groups"]');
  await groups
    .locator('[name="members-0"]')
    .selectOption(["github:2", "github:3", "github:4"]);
  await groups
    .getByRole("button", { name: "Add a group", exact: true })
    .click();
  await groups
    .locator('[name="members-1"]')
    .selectOption(["github:5", "github:6", "github:7", "github:8"]);
  await groups
    .getByRole("textbox", { name: "Reason for change", exact: true })
    .fill("Allocate the trio and cohort remainder");
  await groups
    .getByRole("button", { name: "Save groups", exact: true })
    .click();
  await expect(page.locator("[data-course-notice]")).toContainText(
    "Explain instructor approval",
  );
  await groups
    .locator('[name="exception-1"]')
    .fill("Approved fourth member to allocate the cohort remainder");
  await groups
    .getByRole("button", { name: "Save groups", exact: true })
    .click();
  await expect(page.locator("[data-course-notice]")).toContainText("Saved.");
  await formation
    .getByRole("textbox", { name: "Formation change reason", exact: true })
    .fill("Publish both approved groups");
  await formation
    .getByRole("button", { name: "Publish approved groups", exact: true })
    .click();
  await expect(page.locator("[data-course-notice]")).toContainText("Saved.");
  await alice!
    .getByRole("button", { name: "Refresh records", exact: true })
    .click();
  await expect(alice!.locator("[data-course-content]")).toContainText(
    "Group 01 · Cedar",
  );
  await expect(alice!.locator("[data-course-content]")).toContainText(
    "Claire Example",
  );
  await expect(alice!.locator("[data-course-content]")).not.toContainText(
    "PRIVATE",
  );
  const agreement = alice!.locator('form[data-form="working-agreement"]');
  await agreement
    .getByRole("textbox", { name: "Our team working agreement", exact: true })
    .fill("Meet weekly; use course chat; discuss missed commitments early.");
  await agreement
    .getByRole("button", { name: "Save working agreement", exact: true })
    .click();
  await expect(alice!.locator("[data-course-notice]")).toContainText("Saved.");
  await claire!
    .getByRole("button", { name: "Refresh records", exact: true })
    .click();
  await expect(
    claire!.getByRole("textbox", {
      name: "Our team working agreement",
      exact: true,
    }),
  ).toHaveValue(
    "Meet weekly; use course chat; discuss missed commitments early.",
  );
  expect(
    (await new AxeBuilder({ page: alice! }).include(".course-shell").analyze())
      .violations,
  ).toEqual([]);
  await alice!.setViewportSize({ width: 390, height: 844 });
  expect(
    await alice!.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await alice!.screenshot({
    path: "test-results/course-formation-mobile.png",
    fullPage: true,
  });
  for (const context of contexts) await context.close();
});
