import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("instructor imports institutional students; student signs in through mock mail without GitHub", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  page.setDefaultTimeout(10_000);
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/admin/courses/");
  if (await page.locator("[data-back]").count())
    await page
      .getByRole("button", { name: "All courses", exact: true })
      .click();
  const create = page.locator('form[data-form="create"]');
  await create
    .getByLabel("Course name", { exact: true })
    .fill(`Institutional course ${Date.now()}`);
  await create
    .getByRole("button", { name: "Create course", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Students", exact: true }),
  ).toBeVisible();
  const id = await page.locator("[data-course-select]").inputValue();
  const roster = page.locator('form[data-form="students"]');
  await roster
    .getByRole("textbox", { name: "Roster CSV", exact: true })
    .fill(
      "Student code,Given,Family,University email,Extra\nS1,Alice,Example,alice@example.edu,ignored\nS2,Bob,Example,bob@example.edu,ignored",
    );
  await roster
    .getByRole("button", { name: "Read CSV columns", exact: true })
    .click();
  await roster
    .getByRole("combobox", { name: "Student ID column", exact: true })
    .selectOption("Student code");
  await roster
    .getByRole("combobox", { name: "First name column", exact: true })
    .selectOption("Given");
  await roster
    .getByRole("combobox", { name: "Last name column", exact: true })
    .selectOption("Family");
  await roster
    .getByRole("combobox", { name: "Email column", exact: true })
    .selectOption("University email");
  await roster
    .getByRole("button", { name: "Preview roster changes", exact: true })
    .click();
  await expect(roster.locator("[data-roster-preview]")).toContainText(
    "2 additions",
  );
  await roster
    .getByLabel("Reason for change", { exact: true })
    .fill("Imported institutional enrollment");
  await roster
    .getByRole("button", { name: "Save roster", exact: true })
    .click();
  await expect(page.locator("[data-course-notice]")).toContainText("Saved.");
  await expect(page.getByRole("table")).toContainText(
    "Imported · awaiting first sign-in",
  );
  await page.getByText("Add or correct one student", { exact: true }).click();
  const manual = page.locator('form[data-form="student"]');
  await manual
    .getByLabel("Institutional student ID", { exact: true })
    .fill("S3");
  await manual.getByLabel("First name", { exact: true }).fill("Claire");
  await manual.getByLabel("Last name", { exact: true }).fill("Example");
  await manual
    .getByLabel("Institutional email", { exact: true })
    .fill("claire@example.edu");
  await manual
    .getByLabel("Reason for change", { exact: true })
    .fill("Late enrollment");
  await manual
    .getByRole("button", { name: "Save student", exact: true })
    .click();
  await expect(page.getByRole("table")).toContainText("Claire Example");
  const context = await browser.newContext({
    extraHTTPHeaders: { "x-course-test-user": "anonymous" },
  });
  const student = await context.newPage();
  await student.goto(`/course/?course=${id}`);
  await expect(
    student.getByRole("heading", { name: "Student sign-in", exact: true }),
  ).toBeVisible();
  await student
    .getByLabel("Institutional email", { exact: true })
    .fill("alice@example.edu");
  await student
    .getByRole("button", { name: "Email me a sign-in link", exact: true })
    .click();
  await expect(student.locator("[data-course-notice]")).toContainText(
    "If that address is enrolled",
  );
  await page
    .getByRole("button", { name: "Open local mock inbox", exact: true })
    .click();
  const href = await page
    .getByRole("link", { name: "Follow mock sign-in link", exact: true })
    .getAttribute("href");
  expect(href).toContain("#login=");
  await student.goto(href!);
  await expect(
    student.getByRole("heading", {
      name: "Confirm course sign-in",
      exact: true,
    }),
  ).toBeVisible();
  expect(new URL(student.url()).hash).toBe("");
  await student
    .getByRole("button", { name: "Sign in to my course", exact: true })
    .click();
  await expect(
    student.getByRole("heading", { name: "My course progress", exact: true }),
  ).toBeVisible();
  await expect(
    student.getByRole("button", { name: "Administration", exact: true }),
  ).toHaveCount(0);
  const response = await student.request.get(`/api/courses/${id}`);
  const data = await response.json();
  const bob = data.config.value.students.find(
    (s: { name: string }) => s.name === "Bob Example",
  );
  expect(bob.email).toBe("");
  expect(bob.number).toBe("");
  expect(data.access).toBeUndefined();
  await page
    .getByRole("button", { name: "Refresh records", exact: true })
    .click();
  const alice = page.getByRole("row").filter({ hasText: "Alice Example" });
  await expect(alice).toContainText("Last sign-in");
  const otherContext = await browser.newContext({
    extraHTTPHeaders: { "x-course-test-user": "anonymous" },
  });
  const other = await otherContext.newPage();
  await other.goto(href!);
  await other
    .getByRole("button", { name: "Sign in to my course", exact: true })
    .click();
  await expect(other.locator("[data-course-notice]")).toContainText(
    "already used",
  );
  await alice
    .getByRole("button", { name: "Correct student", exact: true })
    .click();
  await manual
    .getByLabel("Institutional email", { exact: true })
    .fill("alice-corrected@example.edu");
  await manual
    .getByLabel("Reason for change", { exact: true })
    .fill("Institutional email corrected");
  await manual
    .getByRole("button", { name: "Save student", exact: true })
    .click();
  await expect(page.locator("[data-course-notice]")).toContainText("Saved.");
  expect((await student.request.get(`/api/courses/${id}`)).status()).toBe(401);
  await page.getByRole("button", { name: "Groups", exact: true }).click();
  await expect(page.locator("[data-course-content]")).toContainText(
    "3 students awaiting allocation",
  );
  expect(
    (await new AxeBuilder({ page: student }).include(".course-shell").analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Students", exact: true }).click();
  expect(
    (await new AxeBuilder({ page }).include(".course-shell").analyze())
      .violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/course-roster-mobile.png",
    fullPage: true,
  });
  await context.close();
  await otherContext.close();
});
