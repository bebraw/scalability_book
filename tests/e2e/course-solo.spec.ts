import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  phases,
  title,
  type Course,
  type Envelope,
} from "../../shared/course.ts";
import { createStoredZip } from "../../shared/zip.ts";

test("solo allocation, independent reviews, reference audits and portfolios work in all three phases", async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(150_000);
  page.setDefaultTimeout(15_000);
  page.on("dialog", (dialog) => dialog.accept());
  const origin = String(test.info().project.use.baseURL);
  const created = await request.post("/api/courses", {
    headers: { Origin: origin },
    data: { name: `Synthetic solo route ${Date.now()}` },
  });
  expect(created.ok()).toBe(true);
  const config = (await created.json()) as Envelope<Course>;
  const course = structuredClone(config.value),
    id = course.id;
  course.students = [
    {
      id: "github:2",
      number: "SYNTHETIC-SOLO",
      name: "Solo Example",
      login: "solo",
    },
  ];
  const now = Date.now();
  for (const phase of phases)
    course.phases[phase] = {
      freezeAt: new Date(now - 3600000).toISOString(),
      auditAt: new Date(now + 3600000).toISOString(),
      evidenceAt: new Date(now + 86400000).toISOString(),
      groups: [
        {
          id: "solo",
          members: ["github:2"],
          exception: "Synthetic one-person browser fixture",
        },
      ],
      audits: [],
      published: false,
    };
  const setup = await request.put(`/api/courses/${id}/setup`, {
    headers: { Origin: origin },
    data: {
      ...course,
      expected: config.revision,
      reason: "Synthetic course setup",
    },
  });
  expect(setup.ok()).toBe(true);
  await page.goto(`/admin/courses/?course=${id}`);
  await page
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  await page.getByRole("button", { name: "Groups", exact: true }).click();
  for (const phase of phases) {
    await page.locator(`[data-phase="${phase}"]`).click();
    const groups = page.locator('form[data-form="groups"]');
    if (phase !== "establish")
      await groups
        .getByRole("button", { name: "Reuse Establish groups", exact: true })
        .click();
    await groups
      .getByLabel("Course route", { exact: true })
      .selectOption("solo");
    await groups
      .getByRole("textbox", {
        name: "Instructor group size exception (required unless three members)",
        exact: true,
      })
      .fill("Approved solo route, agreed workload, independent review");
    await groups
      .getByLabel("Reason for change", { exact: true })
      .fill(`Approve ${phase} solo route`);
    await groups
      .getByRole("button", { name: "Save groups", exact: true })
      .click();
    await expect(page.locator("[data-course-notice]")).toContainText("Saved.");
  }
  const bytes = Buffer.from(
    createStoredZip([
      {
        name: "README.md",
        data: new TextEncoder().encode(
          "Synthetic UI fixture; not student coursework.",
        ),
      },
    ]),
  );
  for (const phase of phases) {
    const uploaded = await request.post(
      `/api/courses/${id}/files/${phase}/solo?scope=technical&name=synthetic.zip&reason=Browser%20fixture`,
      {
        headers: { Origin: origin, "Content-Length": String(bytes.length) },
        data: bytes,
      },
    );
    expect(uploaded.ok()).toBe(true);
    const file = await uploaded.json();
    const frozen = await request.put(
      `/api/courses/${id}/submission/${phase}/solo`,
      {
        headers: { Origin: origin },
        data: {
          expected: null,
          reason: "Freeze synthetic UI fixture",
          stage: "freeze",
          value: {
            repository: "",
            commit: "a".repeat(40),
            archive: file.value.id,
            setup: "Synthetic setup and validation",
            evidence: "Synthetic evidence, not an academic assessment",
          },
        },
      },
    );
    expect(frozen.ok()).toBe(true);
  }
  const context = await browser.newContext({
    extraHTTPHeaders: { "x-course-test-user": "2" },
  });
  try {
    const student = await context.newPage();
    student.setDefaultTimeout(15_000);
    await student.goto(`/course/?course=${id}`);
    for (const phase of phases) {
      await page.locator(`[data-phase="${phase}"]`).click();
      await page
        .getByRole("button", { name: "Group submission", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Refresh records", exact: true })
        .click();
      await expect(
        page.getByText("Approved solo route", { exact: true }),
      ).toBeVisible();
      const review = page.locator('form[data-form="solo-review"]');
      await review
        .getByLabel("Independent human reviewer", { exact: true })
        .fill("Instructor Example");
      await review
        .getByLabel("Reference repository HTTPS URL", { exact: true })
        .fill("https://example.com/reference");
      await review
        .getByLabel("Full reference commit hash", { exact: true })
        .fill("b".repeat(40));
      await review
        .getByLabel("Reference setup and validation", { exact: true })
        .fill("Clean checkout, synthetic fixture and supported checks");
      await review
        .getByLabel("Released change probe and audit tool policy", {
          exact: true,
        })
        .fill(`${title(phase)} bounded change probe with recorded tools`);
      await review
        .getByLabel(
          "Instructor discussion: prediction, challenge, checks and acceptance",
          { exact: true },
        )
        .fill(
          "Prediction defended; independent challenge answered; checks and acceptance recorded",
        );
      await review
        .getByLabel(
          "Incoming independent audit: setup, timing, prior exposure, checks and findings",
          { exact: true },
        )
        .fill(
          "Independent human audit of frozen source: setup time, probe time and supported findings",
        );
      await review
        .getByLabel("Solo review arrangement or correction reason", {
          exact: true,
        })
        .fill("Record synthetic completed review");
      await review
        .getByRole("button", { name: "Save solo review", exact: true })
        .click();
      await expect(page.locator("[data-course-notice]")).toContainText(
        "Saved.",
      );
      await student.locator(`[data-phase="${phase}"]`).click();
      await student
        .getByRole("button", { name: "Refresh records", exact: true })
        .click();
      await student
        .getByRole("button", { name: "Assigned audit", exact: true })
        .click();
      await expect(
        student.getByRole("heading", {
          name: "Assigned reference audit",
          exact: true,
        }),
      ).toBeVisible();
      const audit = student.locator('form[data-form="audit"]');
      await audit
        .getByRole("textbox")
        .fill(
          "Prior exposure declared; setup and 30-minute probe timed separately; checks, useful findings and limitations recorded",
        );
      await audit
        .getByRole("button", { name: "Submit reference audit", exact: true })
        .click();
      await expect(student.locator("[data-course-notice]")).toContainText(
        "Saved.",
      );
      await student
        .getByRole("button", { name: "My portfolio", exact: true })
        .click();
      const portfolio = student.locator('form[data-form="portfolio"]');
      await expect(
        portfolio.getByLabel(
          "Private peer feedback: specific feedback for each teammate",
          { exact: true },
        ),
      ).toHaveCount(0);
      for (let i = 0; i < 3; i++) {
        await portfolio.locator(`[name="mode-${i}"]`).selectOption("remote");
        await portfolio
          .locator(`[name="participation-${i}"]`)
          .fill("Announced remote lecture activity completed");
        await portfolio
          .locator(`[name="idea-${i}"]`)
          .fill("Concrete phase idea");
        await portfolio
          .locator(`[name="connection-${i}"]`)
          .fill("Linked to project evidence");
      }
      await portfolio
        .getByLabel(
          "Self-assessment: contributions, commitments, learning and next improvement",
          { exact: true },
        )
        .fill("Specific decisions, commitments and next improvement");
      await portfolio
        .getByLabel(
          "Independent implementation review: evidence, useful feedback and limitations",
          { exact: true },
        )
        .fill(
          "Reference audit provided actionable findings supported by checks",
        );
      await portfolio
        .getByLabel(
          "Response to independent feedback, one adjustment and a solo working condition",
          { exact: true },
        )
        .fill(
          "Responded to reviewer, adjusted one decision and reflected on review capacity",
        );
      await portfolio
        .getByLabel(
          "One consequential decision you challenged, tested or reviewed: link evidence and explain the outcome",
          { exact: true },
        )
        .fill("Owned the acceptance decision and linked the check");
      await portfolio
        .getByRole("button", { name: "Submit portfolio", exact: true })
        .click();
      await expect(student.locator("[data-course-notice]")).toContainText(
        "Saved.",
      );
      await page
        .getByRole("button", { name: "Private portfolios", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Refresh records", exact: true })
        .click();
      await expect(
        page.getByLabel("Useful independent implementation review score", {
          exact: true,
        }),
      ).toBeVisible();
      const individual = page.locator('form[data-form="individual-grade"]');
      for (let i = 0; i < 13; i++)
        await individual.locator(`[name="score-${i}"]`).fill(i < 9 ? "1" : "3");
      await individual
        .getByLabel("Criterion reasons, feedback and missing evidence", {
          exact: true,
        })
        .fill("Solo equivalent evidence supports each criterion");
      await individual
        .getByLabel("Assessment record reason", { exact: true })
        .fill("Synthetic solo assessment");
      await individual
        .getByRole("button", { name: "Record assessment", exact: true })
        .click();
      await expect(page.locator("[data-course-notice]")).toContainText(
        "Saved.",
      );
      if (phase === "compare") {
        const accessibility = await new AxeBuilder({ page: student })
          .include("[data-course-app]")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(accessibility.violations).toEqual([]);
      }
      const snapshot = await (await request.get(`/api/courses/${id}`)).json();
      expect(snapshot.config.value.phases[phase].groups[0].route).toBe("solo");
      expect(
        snapshot.audits.find((r: any) => r.value.phase === phase).value
          .reference.commit,
      ).toBe("b".repeat(40));
      expect(
        snapshot.individuals.find((r: any) => r.value.phase === phase).value
          .scores,
      ).toHaveLength(13);
    }
  } finally {
    await context.close();
  }
});
