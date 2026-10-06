import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  phases,
  type Course,
  type Envelope,
  type Submission,
} from "../../shared/course.ts";

test("teacher withdraws, reviews and reinstates a student without changing frozen work or grading the departure", async ({
  page,
  browser,
}) => {
  page.on("dialog", (dialog) => dialog.accept());
  const origin = "http://127.0.0.1:" + (process.env.E2E_PORT || "3100");
  async function good(
    route: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    const response = body
      ? await page.request.put(`/api/courses${route}`, {
          data: body,
          headers: { Origin: origin, ...headers },
        })
      : await page.request.get(`/api/courses${route}`, { headers });
    expect(response.ok(), await response.text()).toBeTruthy();
    return response.json();
  }
  const created = await page.request.post("/api/courses", {
    data: { name: `Withdrawal ${Date.now()}` },
    headers: { Origin: origin },
  });
  expect(created.ok()).toBeTruthy();
  let config = (await created.json()) as Envelope<Course>;
  const id = config.value.id;
  const course = structuredClone(config.value);
  course.students = ["Alice", "Bob", "Carol"].map((name, i) => ({
    id: `github:${i + 2}`,
    login: `student${i + 2}`,
    name: `${name} Synthetic`,
    number: `W${i + 1}`,
  }));
  for (const [i, phase] of phases.entries())
    course.phases[phase] = {
      freezeAt: new Date(Date.now() + (i * 4 + 1) * 3600_000).toISOString(),
      auditAt: new Date(Date.now() + (i * 4 + 2) * 3600_000).toISOString(),
      evidenceAt: new Date(Date.now() + (i * 4 + 3) * 3600_000).toISOString(),
      groups: [{ id: "group-01", members: course.students.map((s) => s.id) }],
      audits: [],
      published: false,
    };
  config = await good(`/${id}/setup`, {
    ...course,
    expected: config.revision,
    reason: "Synthetic withdrawal scenario",
  });
  const upload = await page.request.post(
    `/api/courses/${id}/files/establish/group-01?scope=technical&name=source.zip`,
    {
      data: Buffer.from("synthetic immutable archive"),
      headers: { Origin: origin, "x-course-test-user": "2" },
    },
  );
  expect(upload.ok(), await upload.text()).toBeTruthy();
  const file = await upload.json();
  const frozen = (await good(
    `/${id}/submission/establish/group-01`,
    {
      expected: null,
      stage: "freeze",
      value: {
        commit: "a".repeat(40),
        archive: file.value.id,
        setup: "Controlled synthetic setup",
        evidence: "Retain this source and its membership",
      },
    },
    { "x-course-test-user": "2" },
  )) as Envelope<Submission>;
  const grade = await good(`/${id}/project-grade/establish/group-01`, {
    expected: null,
    scores: [6, 4, 5, 3, 2, 4, 4, 2],
    missing: false,
    feedback: "Historical project assessment",
    reason: "Assess frozen group evidence",
  });
  for (const student of course.students.slice(1))
    await good(`/${id}/individual-grade/establish/${student.id}`, {
      expected: null,
      scores: Array(13).fill(0),
      missing: true,
      feedback: "Synthetic missing portfolio",
      reason: "Explicit assessment for active student",
    });
  await page.goto(`/admin/courses/?course=${id}`);
  await page
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  await page.getByRole("button", { name: "Students", exact: true }).click();
  await page
    .getByText("Enrollment, catch-up and withdrawals", { exact: true })
    .click();
  const enrollment = page.locator('form[data-form="enrollment"]');
  await enrollment
    .getByLabel("Enrollment arrangement reason (private to staff)")
    .fill("PRIVATE departure reason");
  await enrollment
    .getByRole("button", { name: "Mark student withdrawn", exact: true })
    .click();
  await expect(page.locator("[data-course-notice]")).toContainText("Saved.");
  await expect(page.getByRole("table").first()).toContainText(
    "Withdrawn · arrangements need review",
  );
  await page.getByRole("button", { name: "Review queue", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Review withdrawal for Alice Synthetic",
      exact: true,
    })
    .click();
  await expect(
    enrollment.getByRole("button", { name: "Reinstate student", exact: true }),
  ).toBeVisible();
  await enrollment
    .getByLabel(
      "Group and audit arrangements after withdrawal (private to staff)",
    )
    .fill(
      "PRIVATE review: preserve frozen trio; approve a continuing pair in the next phase; no audit fallback needed",
    );
  await enrollment
    .getByLabel("Enrollment arrangement reason (private to staff)")
    .fill("Reviewed remaining team and future allocation");
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
      name: "Review withdrawal for Alice Synthetic",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Gradebook", exact: true }).click();
  const withdrawnRow = page
    .getByRole("row")
    .filter({ hasText: "Alice Synthetic" });
  await expect(withdrawnRow).toContainText("Withdrawn");
  await expect(withdrawnRow).toContainText("No final grade");
  await expect(withdrawnRow).not.toContainText("/153");
  const release = page.locator('form[data-form="publish"]');
  await release
    .getByLabel("Reason for releasing or withdrawing results")
    .fill("Release active students without assessing the departed student");
  await release
    .getByRole("button", { name: "Release phase results", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Establish results: released",
      exact: true,
    }),
  ).toBeVisible();
  const csv = await page.request.get(`/api/courses/${id}/export`);
  const row = (await csv.text())
    .split("\r\n")
    .find((line) => line.includes('"W1"'))!;
  expect(row.split(",").slice(3)).toEqual([
    '""',
    '""',
    '""',
    '""',
    '"withdrawn"',
    '""',
    '""',
  ]);

  // Reusing a frozen allocation for future work omits withdrawn members and
  // requires an explicit smaller-group exception instead of inventing one.
  await page.getByRole("button", { name: /02 Challenge/ }).click();
  await page
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  await page.getByRole("button", { name: "Groups", exact: true }).click();
  await page
    .getByRole("button", { name: "Reuse Establish groups", exact: true })
    .click();
  const groups = page.locator('form[data-form="groups"]');
  await expect(groups.locator('[name="members-0"] option:checked')).toHaveCount(
    2,
  );
  await groups
    .getByLabel(
      "Instructor group size exception (required unless three members)",
    )
    .fill("Approve a continuing pair after withdrawal");
  await groups
    .getByLabel("Reason for change")
    .fill("Keep the group identifier for remaining active members");
  await groups
    .getByRole("button", { name: "Save groups", exact: true })
    .click();
  await expect(page.locator("[data-course-notice]")).toContainText("Saved.");
  const retained = await good(`/${id}`);
  expect(retained.config.value.phases.establish.groups).toEqual(
    course.phases.establish.groups,
  );
  expect(retained.config.value.phases.challenge.groups[0].members).toEqual([
    "github:3",
    "github:4",
  ]);
  expect(retained.submissions[0]).toEqual(frozen);
  expect(retained.projects[0]).toEqual(grade);

  const studentContext = await browser.newContext({
    extraHTTPHeaders: { "x-course-test-user": "2" },
  });
  const student = await studentContext.newPage();
  await student.goto(`/course/?course=${id}`);
  await expect(
    student.getByText("Withdrawn from this course", { exact: true }),
  ).toBeVisible();
  await expect(student.locator("[data-course-content]")).not.toContainText(
    "PRIVATE",
  );
  await student
    .getByRole("button", { name: "My portfolio", exact: true })
    .click();
  await expect(
    student.getByRole("button", { name: "Submit portfolio", exact: true }),
  ).toBeDisabled();
  await expect(
    student.locator('form[data-form="portfolio"] textarea').first(),
  ).toBeDisabled();
  await student
    .getByRole("button", { name: "Group submission", exact: true })
    .click();
  await expect(
    student.getByRole("heading", {
      name: "Frozen implementation",
      exact: true,
    }),
  ).toBeVisible();
  const archive = await student.request.get(
    `/api/courses/${id}/files/establish/${frozen.value.archive}`,
  );
  expect(await archive.text()).toBe("synthetic immutable archive");

  await page.getByRole("button", { name: "Students", exact: true }).click();
  await page
    .getByText("Enrollment, catch-up and withdrawals", { exact: true })
    .click();
  await enrollment
    .getByLabel("Enrollment arrangement reason (private to staff)")
    .fill("Correct a mistaken withdrawal");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    (await new AxeBuilder({ page }).include(".course-shell").analyze())
      .violations,
  ).toEqual([]);
  await enrollment
    .getByRole("button", { name: "Reinstate student", exact: true })
    .click();
  await expect(page.locator("[data-course-notice]")).toContainText("Saved.");
  await student.reload();
  await expect(
    student.getByText("Withdrawn from this course", { exact: true }),
  ).toHaveCount(0);
  await student
    .getByRole("button", { name: "My portfolio", exact: true })
    .click();
  await expect(
    student.getByRole("button", { name: "Submit portfolio", exact: true }),
  ).toBeEnabled();
  await studentContext.close();
});
