import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("teacher controls keep the shared workspace, mock login, student permissions and reset inside simulation", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  page.setDefaultTimeout(10_000);
  page.on("dialog", (dialog) => dialog.accept());
  const post = (url: string, data: unknown) =>
    request.post(url, {
      headers: { Origin: String(test.info().project.use.baseURL) },
      data,
    });
  const live = await (
    await post("/api/courses", {
      name: `Synthetic live sentinel ${Date.now()}`,
    })
  ).json();
  const discovery = await (await request.get("/api/simulation/status")).json();
  const control = `/api/simulation/${discovery.environment}/control`;
  const previous = await (await request.get(`${control}/status`)).json();
  const initialized = await (
    await post(`${control}/reset`, {
      expected: previous.state?.revision ?? null,
    })
  ).json();
  const generation = initialized.state.value.generation;
  const escaped: string[] = [];
  page.on("request", (req) => {
    const pathname = new URL(req.url()).pathname;
    if (
      pathname === "/api/courses" ||
      pathname.startsWith("/api/courses/") ||
      pathname.startsWith("/api/course-auth/") ||
      pathname === "/api/auth/logout"
    )
      escaped.push(pathname);
  });
  await page.goto(
    `/admin/courses/?simulation=${discovery.environment}&generation=${generation}`,
  );
  const banner = page.getByRole("complementary", {
    name: "Simulation environment",
  });
  await expect(banner).toContainText("Synthetic teacher rehearsal");
  const create = page.locator('form[data-form="create"]');
  await create
    .getByLabel("Course name", { exact: true })
    .fill("Synthetic browser rehearsal");
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
      "student_id,first_name,last_name,email\nSIM001,Alice,Example,alice@example.edu\nSIM002,Bob,Example,bob@example.edu\nSIM003,Claire,Example,claire@example.edu",
    );
  await roster
    .getByRole("button", { name: "Read CSV columns", exact: true })
    .click();
  await roster
    .getByRole("button", { name: "Preview roster changes", exact: true })
    .click();
  await expect(roster.locator("[data-roster-preview]")).toContainText(
    "3 additions",
  );
  await roster
    .getByLabel("Reason for change", { exact: true })
    .fill("Synthetic rehearsal roster");
  await roster
    .getByRole("button", { name: "Save roster", exact: true })
    .click();
  await expect(page.locator("[data-course-notice]")).toContainText("Saved.");
  await banner.getByText("Teacher controls", { exact: true }).click();
  const roles = banner.getByRole("combobox", { name: "Rehearsal role" });
  await expect(
    roles.getByRole("option", { name: "Alice Example", exact: true }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Email sign-in", exact: true })
    .click();
  await page
    .getByLabel("Institutional email", { exact: true })
    .fill("alice@example.edu");
  await page
    .getByRole("button", { name: "Email me a sign-in link", exact: true })
    .click();
  await expect(page.locator("[data-course-notice]")).toContainText(
    "If that address is enrolled",
  );
  await banner
    .getByRole("button", {
      name: "Mock inbox · Synthetic browser rehearsal",
      exact: true,
    })
    .click();
  await banner
    .getByRole("link", { name: "Confirm mock sign-in", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Confirm course sign-in", exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
  await page
    .getByRole("button", { name: "Sign in to my course", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "My course progress", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Administration", exact: true }),
  ).toHaveCount(0);
  await banner.getByText("Teacher controls", { exact: true }).click();
  await expect(roles.locator("option:checked")).toHaveText("Alice Example");
  await roles.selectOption("staff");
  await banner
    .getByRole("button", { name: "Switch role", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Establish review queue", exact: true }),
  ).toBeVisible();
  await banner.getByText("Teacher controls", { exact: true }).click();
  await roles.selectOption({ label: "Bob Example" });
  await banner
    .getByRole("button", { name: "Switch role", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "My course progress", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Return to instructor", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Establish review queue", exact: true }),
  ).toBeVisible();
  await banner.getByText("Teacher controls", { exact: true }).click();
  const clock = banner.getByLabel("Advance simulation time", { exact: true });
  // Local timezone is used by the existing course date inputs.
  const later = new Date("2026-10-06T08:00:00.000Z");
  const localDate = await page.evaluate((value) => {
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);
  }, later.toISOString());
  await clock.fill(localDate);
  await banner
    .getByRole("button", { name: "Advance clock", exact: true })
    .click();
  const current = await (await request.get(`${control}/status`)).json();
  expect(current.state.value.now).toBe(later.toISOString());
  await page.getByRole("button", { name: "Gradebook", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "Export released grades (CSV)", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe(
    "SIMULATION-course-grades.csv",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  expect(
    (await new AxeBuilder({ page }).include("[data-course-app]").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: "test-results/course-simulation-mobile.png",
    fullPage: true,
  });
  await banner.getByText("Teacher controls", { exact: true }).click();
  await banner
    .getByRole("button", { name: "Reset to empty rehearsal", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Create a course run", exact: true }),
  ).toBeVisible();
  const scoped = `/api/simulation/${discovery.environment}/${generation}/courses/${id}`;
  expect((await request.get(scoped)).status()).toBe(409);
  const sentinel = await (
    await request.get(`/api/courses/${live.value.id}`)
  ).json();
  expect(sentinel.config).toEqual(live);
  expect(escaped).toEqual([]);
  // Malformed context must never produce a live course/auth request.
  await page.goto(
    "/admin/courses/?simulation=wrong-environment&generation=wrong-generation",
  );
  await expect(banner).toContainText("Simulation");
  await expect(page.locator("[data-course-notice]")).toContainText(
    "does not match",
  );
  expect(escaped).toEqual([]);
});
