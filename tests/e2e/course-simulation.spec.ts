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
      preset: "empty",
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

test("teachers can load both presets, review withdrawal, refresh a stale assessment and release visible individual outcomes", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  page.setDefaultTimeout(15_000);
  page.on("dialog", (dialog) => dialog.accept());
  const discovery = await (await request.get("/api/simulation/status")).json();
  const control = `/api/simulation/${discovery.environment}/control`;
  const previous = await (await request.get(`${control}/status`)).json();
  const reset = await request.post(`${control}/reset`, {
    headers: { Origin: String(test.info().project.use.baseURL) },
    data: { expected: previous.state?.revision ?? null, preset: "empty" },
  });
  expect(reset.ok()).toBe(true);
  await page.goto(`/admin/courses/?simulation=${discovery.environment}`);
  const banner = page.getByRole("complementary", {
    name: "Simulation environment",
  });
  const escaped: string[] = [];
  page.on("request", (req) => {
    if (/^\/api\/(courses|course-auth)(\/|$)/.test(new URL(req.url()).pathname))
      escaped.push(req.url());
  });
  await banner.getByText("Teacher controls", { exact: true }).click();
  await banner.getByText("Choose a starting scenario", { exact: true }).click();
  await banner
    .getByRole("combobox", { name: "Starting scenario", exact: true })
    .selectOption("preparation");
  await banner
    .getByRole("button", { name: "Restart selected scenario", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Establish review queue", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  await page.getByRole("button", { name: "Groups", exact: true }).click();
  await expect(page.locator("[data-course-content]")).toContainText(
    "Invitation awaiting consent",
  );
  await expect(page.locator("[data-course-content]")).toContainText(
    "Four-person request",
  );
  await banner.getByText("Teacher controls", { exact: true }).click();
  await banner.getByText("Choose a starting scenario", { exact: true }).click();
  await banner
    .getByRole("combobox", { name: "Starting scenario", exact: true })
    .selectOption("grading-review");
  await banner
    .getByRole("button", { name: "Restart selected scenario", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Establish review queue", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Review withdrawal for Finn Example",
      exact: true,
    })
    .click();
  const enrollment = page.locator('form[data-form="enrollment"]');
  await enrollment
    .getByLabel(
      "Group and audit arrangements after withdrawal (private to staff)",
    )
    .fill(
      "PRIVATE rehearsal review: remaining members completed work; retain frozen memberships and existing audit fallbacks",
    );
  await enrollment
    .getByLabel("Enrollment arrangement reason (private to staff)")
    .fill("Complete the authored withdrawal review");
  await enrollment
    .getByRole("button", {
      name: "Record withdrawal arrangements",
      exact: true,
    })
    .click();
  await expect(page.locator("[data-course-notice]")).toContainText("Saved.");
  await page.getByRole("button", { name: "Review queue", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Review withdrawal for Finn Example",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /03 Compare/ }).click();
  await page.getByRole("button", { name: "Gradebook", exact: true }).click();
  const rows = page.locator("table").first();
  await expect(
    rows.getByRole("row").filter({ hasText: "Ben Example" }),
  ).toContainText("Fail");
  await expect(
    rows.getByRole("row").filter({ hasText: "Eli Example" }),
  ).toContainText("Pending");
  await expect(
    rows.getByRole("row").filter({ hasText: "Finn Example" }),
  ).toContainText("Withdrawn");
  await expect(
    rows.getByRole("row").filter({ hasText: "Finn Example" }),
  ).toContainText("No final grade");
  const release = page.locator('form[data-form="publish"]');
  await release
    .getByLabel("Reason for releasing or withdrawing results")
    .fill("Check stale synthetic assessment");
  await release
    .getByRole("button", { name: "Release phase results", exact: true })
    .click();
  await expect(page.locator("[data-course-notice]")).toContainText(
    "Assess every group and student",
  );
  await page
    .getByRole("button", { name: "Private portfolios", exact: true })
    .click();
  await page
    .locator("[data-student-select]")
    .selectOption({ label: "Eli Example · SIM005" });
  await expect(page.locator(".course-portfolio-read")).toContainText(
    "Correction:",
  );
  const grade = page.locator('form[data-form="individual-grade"]');
  await grade
    .getByLabel("Criterion reasons, feedback and missing evidence")
    .fill(
      "Checked the corrected synthetic reflection against current evidence.",
    );
  await grade
    .getByLabel("Reason for this assessment correction")
    .fill("Refresh stale simulation assessment");
  await grade
    .getByRole("button", { name: "Save corrected assessment", exact: true })
    .click();
  await expect(page.locator("[data-course-notice]")).toContainText("Saved.");
  await page.getByRole("button", { name: "Gradebook", exact: true }).click();
  await release
    .getByLabel("Reason for releasing or withdrawing results")
    .fill("Release current synthetic assessments");
  await release
    .getByRole("button", { name: "Release phase results", exact: true })
    .click();
  await expect(release).toContainText("Compare results: released");
  await expect(
    rows.getByRole("row").filter({ hasText: "Ben Example" }),
  ).toContainText("1/3 completed lecture");
  await expect(
    rows.getByRole("row").filter({ hasText: "Cora Example" }),
  ).toContainText("self/peer assessment");
  const status = await (await request.get(`${control}/status`)).json();
  const exportUrl = `/api/simulation/${discovery.environment}/${status.state.value.generation}/courses/${status.courses[0].id}/export`;
  const exported = await (await request.get(exportUrl)).text();
  expect(
    exported
      .split("\r\n")
      .find((line) => line.includes('"SIM006"'))!
      .split(",")
      .slice(4),
  ).toEqual(['""', '""', '""', '""', '"withdrawn"', '""', '""']);
  await banner.getByText("Teacher controls", { exact: true }).click();
  await banner
    .getByRole("combobox", { name: "Rehearsal role", exact: true })
    .selectOption({ label: "Finn Example" });
  const switched = page.waitForEvent(
    "framenavigated",
    (frame) => frame === page.mainFrame(),
  );
  await banner
    .getByRole("button", { name: "Switch role", exact: true })
    .click();
  await switched;
  await expect(
    page.getByText("Withdrawn from this course", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-course-content]")).not.toContainText(
    "PRIVATE",
  );
  await page.getByRole("button", { name: "My portfolio", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resubmit portfolio", exact: true }),
  ).toBeDisabled();
  await expect(
    page.locator('form[data-form="portfolio"] textarea').first(),
  ).toBeDisabled();
  const returned = page.waitForEvent(
    "framenavigated",
    (frame) => frame === page.mainFrame(),
  );
  await page
    .getByRole("button", { name: "Return to instructor", exact: true })
    .click();
  await returned;
  await expect(
    page.getByRole("heading", { name: "Establish review queue", exact: true }),
  ).toBeVisible();
  await banner.getByText("Teacher controls", { exact: true }).click();
  await banner
    .getByRole("combobox", { name: "Rehearsal role", exact: true })
    .selectOption({ label: "Ben Example" });
  await banner
    .getByRole("button", { name: "Switch role", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "My course progress", exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-course-content]")).toContainText(
    "1/3 completed lecture",
  );
  await expect(
    page.getByRole("button", { name: "Gradebook", exact: true }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await banner.getByText("Teacher controls", { exact: true }).click();
  await banner.getByText("Choose a starting scenario", { exact: true }).click();
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
    path: "test-results/course-simulation-preset-mobile.png",
    fullPage: true,
  });
  expect(escaped).toEqual([]);
});
