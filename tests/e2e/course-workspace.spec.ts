import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("instructor manages a run; student submits privately; rubric grading and release stay transparent", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  // This flow deliberately leaves a failed release form to assess missing work.
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/admin/courses/");
  await expect(page.locator("[data-course-notice]")).toContainText(
    "Local workspace",
  );
  if (await page.locator("[data-back]").count())
    await page
      .getByRole("button", { name: "All courses", exact: true })
      .click();
  const courseName = `Course workspace ${Date.now()}`;
  const create = page.locator('form[data-form="create"]');
  await create.getByLabel("Course name", { exact: true }).fill(courseName);
  await create
    .getByRole("button", { name: "Create course", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Students", exact: true }),
  ).toBeVisible();
  const roster = page.locator('form[data-form="students"]');
  await roster
    .getByLabel("Roster CSV:", { exact: false })
    .fill(
      "student_number,name,github_id,github_login\nS001,Alice Example,2,alice\nS002,Bob Example,3,bob",
    );
  await roster.getByRole("button", { name: "Preview roster changes" }).click();
  await expect(roster.locator("[data-roster-preview]")).toContainText(
    "2 additions",
  );
  await roster
    .getByLabel("Reason for change")
    .fill("Imported the initial roster");
  await roster
    .getByRole("button", { name: "Save roster", exact: true })
    .click();
  await expect(page.locator("[data-course-notice]")).toContainText("Saved.");
  await page.getByRole("button", { name: "Review queue", exact: true }).click();
  await expect(page.locator("[data-course-content]")).toContainText(
    "Students awaiting a group",
  );
  await page
    .getByRole("button", { name: "Allocate groups", exact: true })
    .click();
  for (const phase of ["Establish", "Challenge", "Compare"]) {
    if (phase !== "Establish")
      await page
        .getByRole("button", { name: new RegExp(`0[23] ${phase}`) })
        .click();
    await expect(
      page.getByRole("heading", { name: `${phase} groups`, exact: true }),
    ).toBeVisible();
    const groups = page.locator('form[data-form="groups"]');
    if (phase === "Establish") {
      await groups
        .getByRole("button", { name: "Add a group", exact: true })
        .click();
      await groups.locator('[name="members-0"]').selectOption(["github:2"]);
      await groups
        .getByRole("button", { name: "Add a group", exact: true })
        .click();
      await groups.locator('[name="members-1"]').selectOption(["github:3"]);
    } else
      await groups
        .getByRole("button", { name: "Reuse Establish groups", exact: true })
        .click();
    await groups
      .getByLabel("Reason for change")
      .fill("Initial allocation for this phase");
    await groups
      .getByRole("button", { name: "Save groups", exact: true })
      .click();
    await expect(page.locator("[data-course-notice]")).toContainText("Saved.");
    await expect(groups.getByRole("group").first()).toContainText("group-01");
    await page
      .getByRole("button", { name: "Phase administration", exact: true })
      .click();
    const schedule = page.locator('form[data-form="schedule"]');
    await schedule
      .getByRole("button", { name: "Fill circular audit assignments" })
      .click();
    await expect(
      schedule.getByLabel("Audit assignments:", { exact: false }),
    ).toHaveValue("group-01 > group-02\ngroup-02 > group-01");
    await schedule
      .getByLabel("Reason for change")
      .fill("Arrange reciprocal audits");
    await schedule
      .getByRole("button", { name: "Save phase administration", exact: true })
      .click();
    await expect(page.locator("[data-course-notice]")).toContainText("Saved.");
    if (phase !== "Compare")
      await page.getByRole("button", { name: "Groups", exact: true }).click();
  }
  await page.getByRole("button", { name: /01 Establish/ }).click();
  const courseId = await page.locator("[data-course-select]").inputValue();
  await page.getByRole("button", { name: "Review queue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Establish review queue" }),
  ).toBeVisible();
  await expect(page.getByRole("table").first()).toContainText("Missing");
  const studentContext = await browser.newContext({
    extraHTTPHeaders: { "x-course-test-user": "2" },
  });
  const student = await studentContext.newPage();
  await student.goto(`/course/?course=${courseId}`);
  await expect(
    student.getByRole("heading", { name: "My course progress" }),
  ).toBeVisible();
  await expect(
    student.getByRole("button", { name: "Gradebook", exact: true }),
  ).toHaveCount(0);
  await student
    .getByRole("button", { name: "Group submission", exact: true })
    .click();
  const submission = student.locator('form[data-form="submission"]');
  await submission
    .getByLabel("Repository URL (HTTPS)")
    .fill("https://github.com/example/project");
  await submission
    .getByLabel("Full implementation commit hash")
    .fill("a".repeat(40));
  await submission.locator('input[type="file"]').setInputFiles({
    name: "source.zip",
    mimeType: "application/zip",
    buffer: Buffer.from("test archive snapshot"),
  });
  await expect(student.locator("[data-course-notice]")).toContainText(
    "File uploaded.",
  );
  await expect(submission.getByLabel("Repository URL (HTTPS)")).toHaveValue(
    "https://github.com/example/project",
  );
  student.once("dialog", (dialog) => dialog.dismiss());
  await student.getByRole("button", { name: /02 Challenge/ }).click();
  await expect(submission.getByLabel("Repository URL (HTTPS)")).toHaveValue(
    "https://github.com/example/project",
  );
  await submission
    .getByLabel("Supported setup, demo data and validation commands")
    .fill("Install, seed data, run tests, start the application.");
  await submission
    .getByLabel("Initial evidence, conditions and known limitations")
    .fill("Baseline observations, conditions, limits and known defects.");
  await submission
    .getByRole("button", { name: "Freeze implementation", exact: true })
    .click();
  await expect(
    student.getByRole("heading", {
      name: "Frozen implementation",
      exact: true,
    }),
  ).toBeVisible();
  await student
    .getByRole("button", { name: "My portfolio", exact: true })
    .click();
  const portfolio = student.locator('form[data-form="portfolio"]');
  for (const i of [1, 2]) {
    const lecture = portfolio.getByRole("group", {
      name: `Lecture ${i}`,
      exact: true,
    });
    await lecture
      .getByLabel("Participation", { exact: true })
      .selectOption("live");
    await lecture
      .getByLabel("Participation or equivalent activity evidence")
      .fill("Participated in the lecture activity.");
    await lecture
      .getByLabel("One concrete idea, failure, model or trade-off")
      .fill("A concrete queueing limit.");
    await lecture
      .getByLabel("Connection to project evidence, an assumption or a decision")
      .fill("Connected the idea to our workload baseline.");
  }
  await portfolio
    .getByLabel("Self-assessment:", { exact: false })
    .fill("I reviewed the acceptance contract and investigated a defect.");
  await portfolio
    .getByLabel("Private peer feedback:", { exact: false })
    .fill("CONFIDENTIAL PORTFOLIO: specific feedback for Bob.");
  await portfolio
    .getByLabel("Response to feedback,")
    .fill("We agreed on a smaller integration step.");
  await portfolio
    .getByLabel("One consequential decision you challenged,")
    .fill(
      "I tested a proposed caching decision; evidence is in the submitted archive.",
    );
  await portfolio
    .getByRole("button", { name: "Submit portfolio", exact: true })
    .click();
  await expect(student.locator("[data-course-notice]")).toContainText("Saved.");
  await student
    .getByRole("button", { name: "Class submissions", exact: true })
    .click();
  await expect(student.locator("[data-course-content]")).toContainText(
    "Class access opens after the audit window closes",
  );
  const otherContext = await browser.newContext({
    extraHTTPHeaders: { "x-course-test-user": "3" },
  });
  const other = await otherContext.newPage();
  await other.goto(`/course/?course=${courseId}`);
  await other
    .getByRole("button", { name: "My portfolio", exact: true })
    .click();
  await expect(other.locator("[data-course-content]")).not.toContainText(
    "CONFIDENTIAL PORTFOLIO",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Group submission", exact: true })
    .click();
  const projectGrade = page.locator('form[data-form="project-grade"]');
  const projectMax = [6, 4, 5, 3, 2, 4, 4, 2];
  for (let i = 0; i < projectMax.length; i++)
    await projectGrade
      .locator(`[name="score-${i}"]`)
      .fill(String(projectMax[i]));
  await projectGrade
    .getByLabel("Criterion reasons, feedback and missing evidence")
    .fill(
      "Full credit supported by the frozen revision, setup and conditions.",
    );
  await projectGrade
    .getByLabel("Assessment record reason")
    .fill("Initial assessment");
  await projectGrade
    .getByRole("button", { name: "Record assessment", exact: true })
    .click();
  await expect(page.locator("[data-course-notice]")).toContainText("Saved.");
  await page
    .getByRole("button", { name: "Private portfolios", exact: true })
    .click();
  await expect(page.locator(".course-portfolio-read")).toContainText(
    "CONFIDENTIAL PORTFOLIO",
  );
  const individualGrade = page.locator('form[data-form="individual-grade"]');
  const individualScores = [1, 1, 1, 1, 1, 1, 0, 0, 0, 2, 1, 2, 1];
  for (let i = 0; i < individualScores.length; i++)
    await individualGrade
      .locator(`[name="score-${i}"]`)
      .fill(String(individualScores[i]));
  await individualGrade
    .getByLabel("Criterion reasons, feedback and missing evidence")
    .fill(
      "Two complete lecture activities; corroborated contribution and specific reflection.",
    );
  await individualGrade
    .getByLabel("Assessment record reason")
    .fill("Initial private assessment");
  await individualGrade
    .getByRole("button", { name: "Record assessment", exact: true })
    .click();
  await expect(page.locator("[data-course-notice]")).toContainText("Saved.");
  await page.getByRole("button", { name: "Gradebook", exact: true }).click();
  await expect(page.getByRole("table").first()).toContainText("42/153");
  const release = page.locator('form[data-form="publish"]');
  await release
    .getByLabel("Reason for releasing or withdrawing results")
    .fill("Checking incomplete assessments");
  await release
    .getByRole("button", { name: "Release phase results", exact: true })
    .click();
  await expect(page.locator("[data-course-notice]")).toContainText(
    "Assess every group and student",
  );
  await page
    .getByRole("button", { name: "Group submission", exact: true })
    .click();
  await page.locator("[data-group-select]").selectOption("group-02");
  const missingProject = page.locator('form[data-form="project-grade"]');
  for (let i = 0; i < 8; i++)
    await missingProject.locator(`[name="score-${i}"]`).fill("0");
  await missingProject.getByLabel("Explicitly record missing work").check();
  await missingProject
    .getByLabel("Criterion reasons, feedback and missing evidence")
    .fill("No implementation submitted.");
  await missingProject
    .getByLabel("Assessment record reason")
    .fill("Missing work assessed");
  await missingProject
    .getByRole("button", { name: "Record assessment", exact: true })
    .click();
  await expect(page.locator("[data-course-notice]")).toContainText("Saved.");
  await page
    .getByRole("button", { name: "Private portfolios", exact: true })
    .click();
  await page.locator("[data-student-select]").selectOption("github:3");
  const missingIndividual = page.locator('form[data-form="individual-grade"]');
  for (let i = 0; i < 13; i++)
    await missingIndividual.locator(`[name="score-${i}"]`).fill("0");
  await missingIndividual.getByLabel("Explicitly record missing work").check();
  await missingIndividual
    .getByLabel("Criterion reasons, feedback and missing evidence")
    .fill("No private portfolio submitted.");
  await missingIndividual
    .getByLabel("Assessment record reason")
    .fill("Missing work assessed");
  await missingIndividual
    .getByRole("button", { name: "Record assessment", exact: true })
    .click();
  await expect(page.locator("[data-course-notice]")).toContainText("Saved.");
  await page.getByRole("button", { name: "Gradebook", exact: true }).click();
  await page
    .locator('form[data-form="publish"]')
    .getByLabel("Reason for releasing or withdrawing results")
    .fill("Phase assessments completed");
  await page
    .getByRole("button", { name: "Release phase results", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Establish results: released" }),
  ).toBeVisible();
  await student.reload();
  await expect(
    student.getByRole("heading", { name: "My course progress" }),
  ).toBeVisible();
  await expect(student.getByRole("table")).toContainText("30");
  await expect(student.getByRole("table")).toContainText("12");
  await student
    .getByText("Establish private assessment", { exact: true })
    .click();
  await expect(
    student.getByRole("table", { name: "Individual criterion scores" }),
  ).toContainText("Reliable contribution and shared ownership");
  await student
    .getByText("Establish private assessment", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Course settings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Record history", exact: true })
    .click();
  const dialog = page.locator("[data-history-dialog]");
  await dialog.locator("summary").first().click();
  await dialog
    .getByRole("button", { name: "Load this revision" })
    .first()
    .click();
  await expect(dialog.locator("pre")).toContainText(courseName);
  await dialog.getByRole("button", { name: "Close history" }).click();
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
    path: "test-results/course-settings-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Gradebook", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "Export released grades (CSV)" })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("course-grades.csv");
  expect(
    (await new AxeBuilder({ page }).include(".course-shell").analyze())
      .violations,
  ).toEqual([]);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/course-admin-desktop.png",
    fullPage: true,
  });
  await student.setViewportSize({ width: 390, height: 844 });
  await student.screenshot({
    path: "test-results/course-student-mobile.png",
    fullPage: true,
  });
  expect(
    await student.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page: student }).include(".course-shell").analyze())
      .violations,
  ).toEqual([]);
  await page.locator("[data-theme-picker]").selectOption("dark");
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/course-admin-dark.png",
    fullPage: true,
  });
  await studentContext.close();
  await otherContext.close();
});
