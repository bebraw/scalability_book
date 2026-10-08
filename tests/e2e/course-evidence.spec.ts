import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createStoredZip } from "../../scripts/lib/zip.ts";

test("student indexes incomplete evidence, appends technical files and links earlier A/B records without replacing frozen source", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  page.setDefaultTimeout(10_000);
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/admin/courses/");
  const create = page.locator('form[data-form="create"]');
  await create
    .getByLabel("Course name", { exact: true })
    .fill(`Evidence ${Date.now()}`);
  await create
    .getByRole("button", { name: "Create course", exact: true })
    .click();
  const id = await page.locator("[data-course-select]").inputValue();
  const view = await (await page.request.get(`/api/courses/${id}`)).json();
  const course = view.config.value;
  course.students = [
    {
      id: "github:2",
      login: "student2",
      number: "TEST2",
      name: "Synthetic Alice",
    },
    {
      id: "github:3",
      login: "student3",
      number: "TEST3",
      name: "Synthetic Bob",
    },
  ];
  for (const phase of ["establish", "challenge", "compare"]) {
    course.phases[phase].groups = [
      {
        id: "red",
        members: ["github:2"],
        exception: "Small synthetic browser fixture",
      },
      {
        id: "blue",
        members: ["github:3"],
        exception: "Small synthetic browser fixture",
      },
    ];
    course.phases[phase].audits = [
      { from: "red", to: "blue" },
      { from: "blue", to: "red" },
    ];
  }
  const setup = await page.request.put(`/api/courses/${id}/setup`, {
    headers: { Origin: new URL(page.url()).origin },
    data: {
      ...course,
      expected: view.config.revision,
      reason: "Synthetic evidence fixture",
    },
  });
  expect(setup.ok()).toBe(true);
  const context = await browser.newContext({
      extraHTTPHeaders: { "x-course-test-user": "2" },
    }),
    student = await context.newPage();
  student.setDefaultTimeout(10_000);
  student.on("dialog", (dialog) => dialog.accept());
  await student.goto(`/course/?course=${id}`);
  const fixtureDir = "tests/fixtures/course-source";
  const archive = createStoredZip(
    await Promise.all(
      (await readdir(fixtureDir)).map(async (name) => ({
        name,
        data: await readFile(path.join(fixtureDir, name)),
      })),
    ),
  );
  let initialSource = "";
  for (const phase of ["establish", "challenge", "compare"]) {
    await student.locator(`[data-phase="${phase}"]`).click();
    await student
      .getByRole("button", { name: "Group submission", exact: true })
      .click();
    const form = student.locator('form[data-form="submission"]');
    await expect(
      form.getByLabel("Repository URL (optional HTTPS context)"),
    ).not.toHaveAttribute("required");
    await form
      .getByLabel("Full implementation commit hash", { exact: true })
      .fill("a".repeat(40));
    await form
      .getByLabel("Upload source archive", { exact: true })
      .setInputFiles({
        name: "minimal-source.zip",
        mimeType: "application/zip",
        buffer: archive,
      });
    await expect(student.locator("[data-course-notice]")).toContainText(
      "File uploaded",
    );
    await form
      .getByLabel("Supported setup, demo data and validation commands", {
        exact: true,
      })
      .fill(
        "Unpack; npm ci --offline --ignore-scripts; npm run fixtures; npm start; npm run validate.",
      );
    await form
      .getByLabel("Initial evidence, conditions and known limitations", {
        exact: true,
      })
      .fill(
        "Synthetic lifecycle tests located; baseline measurements are incomplete.",
      );
    if (phase === "establish") {
      await form.getByText(/Common requirements ·/).click();
      await form
        .getByLabel("Supported setup and project harness evidence status", {
          exact: true,
        })
        .selectOption("located");
      await form
        .getByLabel(
          "Supported setup and project harness evidence location or missing-work note",
          { exact: true },
        )
        .fill("README.md; app.test.mjs");
      await form
        .getByLabel("Shared workload and resource baseline evidence status", {
          exact: true,
        })
        .selectOption("missing");
      await form
        .getByLabel(
          "Shared workload and resource baseline evidence location or missing-work note",
          { exact: true },
        )
        .fill("Shared baseline measurements still missing.");
      await expect(
        form.getByRole("link", {
          name: "Run's published rubric ↗",
          exact: true,
        }),
      ).toHaveAttribute("href", "/project/requirements/2026-10-v2/grading/");
      await form.getByText(/Common requirements ·/).click();
    }
    if (phase === "compare") {
      await form.getByText(/Compare requirements ·/).click();
      await expect(form).toContainText("Separate application model");
      await expect(form).toContainText("Workflow model");
      await expect(form).toContainText("Bounded single-agent/fleet contrast");
      await form.getByText(/Compare requirements ·/).click();
    }
    await form
      .getByRole("button", { name: "Freeze implementation", exact: true })
      .click();
    await expect(
      student.getByRole("heading", {
        name: "Frozen implementation",
        exact: true,
      }),
    ).toBeVisible();
    const evidence = student.locator('form[data-form="evidence"]');
    await evidence
      .getByLabel("Completed technical evidence index and limitations", {
        exact: true,
      })
      .fill(
        phase === "establish"
          ? "Later technical results; baseline limits retained."
          : "Conditional comparison with explicitly missing measurements.",
      );
    await evidence
      .getByLabel("Author response: findings, corrections and evidence links", {
        exact: true,
      })
      .fill(
        "Audit pending; staff fallback requested and evidence limits declared.",
      );
    if (phase === "establish") {
      const frozen = await (
        await student.request.get(`/api/courses/${id}`)
      ).json();
      initialSource = frozen.submissions.find(
        (s: { value: { phase: string } }) => s.value.phase === phase,
      ).value.archive;
      await evidence
        .getByLabel("Attach final technical evidence", { exact: true })
        .setInputFiles({
          name: "results.csv",
          mimeType: "text/csv",
          buffer: Buffer.from("operation,result\ntransition,passed\n"),
        });
      await expect(student.locator("[data-course-notice]")).toContainText(
        "File uploaded",
      );
      await evidence
        .getByRole("button", { name: "Save evidence draft", exact: true })
        .click();
      await expect(student.locator("[data-course-notice]")).toContainText(
        "Saved.",
      );
      await expect(
        evidence.getByRole("textbox", {
          name: "Completed technical evidence index and limitations",
          exact: true,
        }),
      ).toHaveValue("Later technical results; baseline limits retained.");
      const draft = await (
        await student.request.get(`/api/courses/${id}`)
      ).json();
      const submission = draft.submissions.find(
        (s: { value: { phase: string } }) => s.value.phase === phase,
      ).value;
      expect(submission.submittedAt).toBeNull();
      expect(submission.archive).toBe(initialSource);
      expect(submission.finalEvidence.files).toHaveLength(1);
    }
    if (phase === "compare") {
      await evidence
        .getByLabel("Earlier A submission", { exact: true })
        .selectOption("red");
      await evidence
        .getByLabel("Earlier B submission", { exact: true })
        .selectOption("red");
    }
    await evidence
      .getByRole("button", {
        name: "Submit technical evidence and response",
        exact: true,
      })
      .click();
    await expect(student.locator("[data-course-notice]")).toContainText(
      "Saved.",
    );
  }
  expect(
    (await new AxeBuilder({ page: student }).include(".course-shell").analyze())
      .violations,
  ).toEqual([]);
  await student.setViewportSize({ width: 390, height: 844 });
  expect(
    await student.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await student.screenshot({
    path: "test-results/course-evidence-mobile.png",
    fullPage: true,
  });
  await student
    .getByRole("button", {
      name: "Open earlier A submission · red",
      exact: true,
    })
    .click();
  await expect(
    student.getByRole("heading", { name: "Earlier A submission", exact: true }),
  ).toBeVisible();
  await student
    .getByText("Completed technical evidence", { exact: true })
    .click();
  await expect(student.locator("[data-course-content]")).toContainText(
    "Later technical results; baseline limits retained.",
  );
  const archived = await page.request.get(
    "/project/requirements/2026-10-v2/compare/",
  );
  expect(archived.status()).toBe(200);
  expect(await archived.text()).toContain("Archived requirements 2026-10-v2");
  await context.close();
});
