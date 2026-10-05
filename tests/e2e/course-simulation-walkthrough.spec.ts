import { test, expect, type Locator } from "@playwright/test";
import { createHash } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import {
  phases,
  type Phase,
  type Envelope,
  type Submission,
} from "../../shared/course.ts";
import {
  rehearsalAudit,
  rehearsalEvidence,
} from "../../worker/course-simulation-fixtures.ts";

test("a teacher rehearses creation, consent, all three submission/audit/portfolio phases, assessment, release and final export", async ({
  page,
  request,
}) => {
  test.setTimeout(240_000);
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
  const generation = (await reset.json()).state.value.generation;
  const escaped: string[] = [];
  page.on("request", (req) => {
    const path = new URL(req.url()).pathname;
    if (
      /^\/api\/(courses|course-auth)(\/|$)/.test(path) ||
      path === "/api/auth/logout"
    )
      escaped.push(path);
  });
  await page.goto(
    `/admin/courses/?simulation=${discovery.environment}&generation=${generation}`,
  );
  const banner = page.getByRole("complementary", {
    name: "Simulation environment",
  });
  const notice = page.locator("[data-course-notice]");
  async function teacherControls() {
    if (
      !(await banner
        .locator("details")
        .first()
        .evaluate((element: HTMLDetailsElement) => element.open))
    )
      await banner.getByText("Teacher controls", { exact: true }).click();
  }
  async function download(link: Locator) {
    const pending = page.waitForEvent("download");
    await link.click();
    const file = await pending,
      stream = await file.createReadStream(),
      parts: Buffer[] = [];
    for await (const bytes of stream) parts.push(Buffer.from(bytes));
    return { name: file.suggestedFilename(), bytes: Buffer.concat(parts) };
  }
  await teacherControls();
  await banner.getByText("Choose a starting scenario", { exact: true }).click();
  const rosterFile = await download(
    banner.getByRole("link", {
      name: "Download mock roster (10 students)",
      exact: true,
    }),
  );
  const source = await download(
    banner.getByRole("link", {
      name: "Download tiny source fixture",
      exact: true,
    }),
  );
  expect(rosterFile.name).toBe("SIMULATION-roster.csv");
  expect(source.name).toBe("SIMULATION-source.zip");
  const sourceDigest = createHash("sha1").update(source.bytes).digest("hex");
  const create = page.locator('form[data-form="create"]');
  await create
    .getByLabel("Course name", { exact: true })
    .fill("Simulation · full teacher walkthrough");
  await create
    .getByRole("button", { name: "Create course", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Students", exact: true }),
  ).toBeVisible();
  const id = await page.locator("[data-course-select]").inputValue();
  const base = `/api/simulation/${discovery.environment}/${generation}/courses/${id}`;
  async function snapshot() {
    const response = await request.get(base);
    expect(response.ok()).toBe(true);
    return response.json();
  }
  async function saved(button: Locator, route: string) {
    const mutation = page.waitForResponse(
      (response) =>
        decodeURIComponent(new URL(response.url()).pathname) === base + route &&
        response.request().method() ===
          (route.startsWith("/publish/") ? "POST" : "PUT"),
    );
    const refreshed = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === control + "/status" &&
        response.request().method() === "GET",
    );
    await button.click();
    expect((await mutation).ok()).toBe(true);
    await (await refreshed).finished();
    await expect(notice).toContainText("Saved.");
  }
  const roster = page.locator('form[data-form="students"]');
  await roster
    .getByRole("textbox", { name: "Roster CSV", exact: true })
    .fill(
      rosterFile.bytes.toString("utf8").split("\r\n").slice(0, 7).join("\r\n"),
    );
  await roster
    .getByRole("button", { name: "Read CSV columns", exact: true })
    .click();
  await roster
    .getByRole("button", { name: "Preview roster changes", exact: true })
    .click();
  await expect(roster.locator("[data-roster-preview]")).toContainText(
    "6 additions",
  );
  await roster
    .getByLabel("Reason for change", { exact: true })
    .fill("Import six synthetic students for the complete walkthrough");
  let releaseSave!: () => void;
  const heldSave = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  const studentRoute = new URL(
    base + "/students",
    String(test.info().project.use.baseURL),
  ).href;
  await page.route(studentRoute, async (route) => {
    await heldSave;
    await route.continue();
  });
  const startedSave = page.waitForRequest(
    (req) =>
      new URL(req.url()).pathname === base + "/students" &&
      req.method() === "PUT",
  );
  const saving = saved(
    roster.getByRole("button", { name: "Save roster", exact: true }),
    "/students",
  );
  await startedSave;
  try {
    await expect(
      roster.getByRole("textbox", { name: "Roster CSV", exact: true }),
    ).toBeDisabled({ timeout: 2000 });
  } finally {
    releaseSave();
    await saving;
    await page.unroute(studentRoute);
  }
  const initial = await snapshot(),
    students = initial.config.value.students;
  expect(students).toHaveLength(6);
  expect(
    students.every((s: any) => s.email.endsWith(".invalid") && !s.login),
  ).toBe(true);
  async function role(name: string) {
    await teacherControls();
    await banner
      .getByRole("combobox", { name: "Rehearsal role", exact: true })
      .selectOption({ label: name });
    await banner
      .getByRole("button", { name: "Switch role", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name:
          name === "Instructor"
            ? "Establish review queue"
            : "My course progress",
        exact: true,
      }),
    ).toBeVisible();
    await expect(notice).toContainText("Simulation workspace");
    if (name !== "Instructor")
      await expect(
        page.getByRole("button", { name: "Administration", exact: true }),
      ).toHaveCount(0);
  }
  const phaseButton = (phase: Phase) => page.locator(`[data-phase="${phase}"]`);
  async function openFormation(phase: Phase) {
    await page.getByRole("button", { name: "Groups", exact: true }).click();
    await phaseButton(phase).click();
    const form = page.locator('form[data-form="formation"]');
    await form
      .getByLabel("Formation change reason", { exact: true })
      .fill("Open synthetic formation before implementation");
    // The current phase is a selection, not a destructive refresh of this form.
    await phaseButton(phase).click();
    await expect(
      form.getByLabel("Formation change reason", { exact: true }),
    ).toHaveValue("Open synthetic formation before implementation");
    await saved(
      form.getByRole("button", { name: "Open group formation", exact: true }),
      `/formation/${phase}`,
    );
  }
  await openFormation("establish");
  await role("Ada Example");
  await page.getByRole("button", { name: "Groups", exact: true }).click();
  const proposal = page.locator('form[data-form="group-proposal"]');
  await proposal
    .getByRole("textbox", { name: "Optional group display name", exact: true })
    .fill("Transition team");
  await proposal
    .locator('[name="members"]')
    .selectOption(students.slice(1, 3).map((s: any) => s.id));
  await saved(
    proposal.getByRole("button", { name: "Submit proposal", exact: true }),
    "/group-proposal/establish",
  );
  for (const name of ["Ben Example", "Cora Example"]) {
    await role(name);
    await page.getByRole("button", { name: "Groups", exact: true }).click();
    const invited = (await snapshot()).config.value.phases.establish.formation
      .proposals[0];
    await saved(
      page.getByRole("button", { name: "Confirm participation", exact: true }),
      `/group-confirmation/establish/${invited.id}`,
    );
  }
  await role("Instructor");
  await page
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  await page.getByRole("button", { name: "Groups", exact: true }).click();
  await expect(page.locator("[data-course-content]")).toContainText(
    "3/3 confirmed",
  );
  await page
    .getByRole("button", { name: "Add proposal to allocation", exact: true })
    .click();
  const groups = page.locator('form[data-form="groups"]');
  await groups
    .getByRole("button", { name: "Add a group", exact: true })
    .click();
  await groups
    .locator('[name="members-1"]')
    .selectOption(students.slice(3).map((s: any) => s.id));
  await groups
    .getByLabel("Reason for change", { exact: true })
    .fill("Approve the confirmed trio and allocate the remaining trio");
  await saved(
    groups.getByRole("button", { name: "Save groups", exact: true }),
    "/groups/establish",
  );
  async function publishFormation(phase: Phase) {
    const form = page.locator('form[data-form="formation"]');
    await form
      .getByLabel("Formation change reason", { exact: true })
      .fill("Publish the approved three-person groups");
    await saved(
      form.getByRole("button", {
        name: "Publish approved groups",
        exact: true,
      }),
      `/formation/${phase}`,
    );
    await page
      .getByRole("button", { name: "Phase administration", exact: true })
      .click();
    const schedule = page.locator('form[data-form="schedule"]');
    await schedule
      .getByRole("button", {
        name: "Fill circular audit assignments",
        exact: true,
      })
      .click();
    await schedule
      .getByLabel("Reason for change", { exact: true })
      .fill("Assign reciprocal synthetic audits");
    await saved(
      schedule.getByRole("button", {
        name: "Save phase administration",
        exact: true,
      }),
      `/schedule/${phase}`,
    );
  }
  await publishFormation("establish");
  // A delayed destination read must prevent editing the obsolete phase form.
  await page.getByRole("button", { name: "Groups", exact: true }).click();
  let releaseRead!: () => void;
  const heldRead = new Promise<void>((resolve) => {
    releaseRead = resolve;
  });
  const routePattern = new URL(base, String(test.info().project.use.baseURL))
    .href;
  await page.route(routePattern, async (route) => {
    if (route.request().method() === "GET") await heldRead;
    await route.continue();
  });
  const startedRead = page.waitForRequest(
    (req) => new URL(req.url()).pathname === base && req.method() === "GET",
  );
  await phaseButton("challenge").click();
  await startedRead;
  await expect(page.locator("[data-course-content]")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await expect(
    page
      .locator('form[data-form="formation"]')
      .getByLabel("Formation change reason", { exact: true }),
  ).toBeDisabled();
  releaseRead();
  await expect(
    page.getByRole("heading", { name: "Challenge groups", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator('form[data-form="formation"]')
      .getByLabel("Formation change reason", { exact: true }),
  ).toBeEnabled();
  await page.unroute(routePattern);
  for (const phase of ["challenge", "compare"] as const) {
    await openFormation(phase);
    await groups
      .getByRole("button", { name: "Reuse Establish groups", exact: true })
      .click();
    await groups
      .getByLabel("Reason for change", { exact: true })
      .fill("Retain stable groups for the later phase");
    await saved(
      groups.getByRole("button", { name: "Save groups", exact: true }),
      `/groups/${phase}`,
    );
    await publishFormation(phase);
  }
  const allocated = (await snapshot()).config.value;
  for (const phase of phases)
    expect(allocated.phases[phase].groups.map((g: any) => g.id)).toEqual([
      "group-01",
      "group-02",
    ]);
  // Use an actual mock magic link, then retain the same instructor controller.
  await page
    .getByRole("button", { name: "Email sign-in", exact: true })
    .click();
  await page
    .getByLabel("Institutional email", { exact: true })
    .fill(students[0].email);
  await page
    .getByRole("button", { name: "Email me a sign-in link", exact: true })
    .click();
  await expect(notice).toContainText("If that address is enrolled");
  await teacherControls();
  await banner
    .getByRole("button", {
      name: "Mock inbox · Simulation · full teacher walkthrough",
      exact: true,
    })
    .click();
  await banner
    .getByRole("link", { name: "Confirm mock sign-in", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Sign in to my course", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "My course progress", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Groups", exact: true }).click();
  const agreement = page.locator('form[data-form="working-agreement"]');
  await agreement
    .getByLabel("Our team working agreement", { exact: true })
    .fill(
      "Alternate reviewer/driver; meet remotely Tuesday; discuss blocked commitments and request staff help early.",
    );
  await saved(
    agreement.getByRole("button", {
      name: "Save working agreement",
      exact: true,
    }),
    "/working-agreement/establish/group-01",
  );
  await page
    .getByRole("button", { name: "Return to instructor", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Establish review queue", exact: true }),
  ).toBeVisible();
  async function advance(now: string) {
    await teacherControls();
    const value = await page.evaluate((iso) => {
      const date = new Date(iso);
      return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(0, 16);
    }, now);
    await banner
      .getByLabel("Advance simulation time", { exact: true })
      .fill(value);
    await banner
      .getByRole("button", { name: "Advance clock", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Establish review queue",
        exact: true,
      }),
    ).toBeVisible();
    await expect(notice).toContainText("Simulation workspace");
    expect((await snapshot()).now).toBe(now);
  }
  const frozen: Partial<Record<Phase, Envelope<Submission>[]>> = {};
  for (const phase of phases) {
    await test.step(`${phase}: source, reciprocal audits, private portfolios, assessment and release`, async () => {
      const schedule = allocated.phases[phase];
      if (phase !== "establish")
        await advance(
          new Date(Date.parse(schedule.freezeAt) - 86400000).toISOString(),
        );
      for (const name of ["Ada Example", "Dara Example"]) {
        await role(name);
        await phaseButton(phase).click();
        await page
          .getByRole("button", { name: "Group submission", exact: true })
          .click();
        const form = page.locator('form[data-form="submission"]');
        await form
          .getByLabel("Full implementation commit hash", { exact: true })
          .fill(sourceDigest);
        await form
          .getByLabel("Upload source archive", { exact: true })
          .setInputFiles({
            name: "walkthrough-source.zip",
            mimeType: "application/zip",
            buffer: source.bytes,
          });
        await expect(notice).toContainText("File uploaded.");
        await form
          .getByLabel("Supported setup, demo data and validation commands", {
            exact: true,
          })
          .fill(
            "Synthetic source digest, not a hosted Git commit. Node 24: unpack; npm ci --offline --ignore-scripts; npm test; npm run demo. The README states the fixture's limited scope.",
          );
        await form
          .getByLabel("Initial evidence, conditions and known limitations", {
            exact: true,
          })
          .fill(rehearsalEvidence);
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
          .fill("README.md; package-lock.json; app.test.mjs");
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
          .fill("No load measurements in this small synthetic source.");
        const group = name === "Ada Example" ? "group-01" : "group-02";
        await saved(
          form.getByRole("button", {
            name: "Freeze implementation",
            exact: true,
          }),
          `/submission/${phase}/${group}`,
        );
        await expect(
          page.getByRole("heading", {
            name: "Frozen implementation",
            exact: true,
          }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Class submissions", exact: true })
          .click();
        await expect(page.locator("[data-course-content]")).toContainText(
          "Class access opens after the audit window closes",
        );
      }
      await role("Instructor");
      frozen[phase] = (await snapshot()).submissions.filter(
        (r: Envelope<Submission>) => r.value.phase === phase,
      );
      expect(frozen[phase]).toHaveLength(2);
      await advance(
        new Date(Date.parse(schedule.freezeAt) + 3600000).toISOString(),
      );
      for (const name of ["Ada Example", "Dara Example"]) {
        await role(name);
        await phaseButton(phase).click();
        await page
          .getByRole("button", { name: "Assigned audit", exact: true })
          .click();
        const copy = await download(
          page.getByRole("link", {
            name: "walkthrough-source.zip",
            exact: true,
          }),
        );
        expect(copy.bytes).toEqual(source.bytes);
        const form = page.locator('form[data-form="audit"]');
        await form
          .getByLabel("Audit report:", { exact: false })
          .fill(rehearsalAudit);
        await saved(
          form.getByRole("button", {
            name: "Submit assigned audit",
            exact: true,
          }),
          `/audit/${phase}/${name === "Ada Example" ? "group-01" : "group-02"}`,
        );
      }
      for (const [index, student] of students.entries()) {
        await role(student.name);
        await phaseButton(phase).click();
        await page
          .getByRole("button", { name: "My portfolio", exact: true })
          .click();
        const form = page.locator('form[data-form="portfolio"]');
        const completed = index === 1 && phase === "challenge" ? 1 : 2;
        for (let i = 1; i <= completed; i++) {
          const lecture = form.getByRole("group", {
            name: `Lecture ${i}`,
            exact: true,
          });
          await lecture
            .getByLabel("Participation", { exact: true })
            .selectOption(i === 1 ? "live" : "remote");
          await lecture
            .getByLabel("Participation or equivalent activity evidence")
            .fill(
              i === 1
                ? "Reviewed the transition diagram in the synthetic discussion."
                : "Completed the remote equivalent and wrote an example of stale summary counts.",
            );
          await lecture
            .getByLabel("One concrete idea, failure, model or trade-off")
            .fill("A derived summary needs a stated consistency rule.");
          await lecture
            .getByLabel(
              "Connection to project evidence, an assumption or a decision",
            )
            .fill(
              "Compared advance() with summary() and proposed shared state definitions; no throughput claim follows.",
            );
        }
        await form
          .getByLabel("Self-assessment:", { exact: false })
          .fill(
            "Reproduced the transition/history tests and identified which project requirements this tiny fixture does not cover.",
          );
        await form
          .getByLabel("Private peer feedback:", { exact: false })
          .fill(
            `PRIVATE ${student.name} feedback: a teammate explained the guard; I asked them to distinguish observed checks from future pressure experiments.`,
          );
        await form
          .getByLabel("Response to feedback,")
          .fill(
            "Keep the snapshot intact, centralize state definitions in a later change, and validate with the same checks.",
          );
        await form
          .getByLabel("One consequential decision you challenged,")
          .fill(
            "Challenged the claim that small functional checks establish scalable operation; requested a separate comparable load experiment.",
          );
        await saved(
          form.getByRole("button", { name: "Submit portfolio", exact: true }),
          `/portfolio/${phase}/${student.id}`,
        );
      }
      await role("Instructor");
      await advance(
        new Date(Date.parse(schedule.auditAt) + 3600000).toISOString(),
      );
      for (const name of ["Ada Example", "Dara Example"]) {
        await role(name);
        await phaseButton(phase).click();
        await page
          .getByRole("button", { name: "Class submissions", exact: true })
          .click();
        expect(await page.locator(".course-gallery article").count()).toBe(2);
        await expect(page.locator("[data-course-content]")).not.toContainText(
          "PRIVATE",
        );
        await page
          .getByRole("button", { name: "Group submission", exact: true })
          .click();
        await expect(page.locator("[data-course-content]")).toContainText(
          "duplicated state definitions",
        );
        const form = page.locator('form[data-form="evidence"]');
        await form
          .getByLabel("Completed technical evidence index and limitations", {
            exact: true,
          })
          .fill(rehearsalEvidence);
        await form
          .getByLabel(
            "Author response: findings, corrections and evidence links",
            { exact: true },
          )
          .fill(rehearsalEvidence);
        await form
          .getByLabel("Attach final technical evidence", { exact: true })
          .setInputFiles({
            name: "rehearsal-audit.txt",
            mimeType: "text/plain",
            buffer: Buffer.from(rehearsalAudit),
          });
        await expect(notice).toContainText("File uploaded.");
        const group = name === "Ada Example" ? "group-01" : "group-02";
        if (phase === "compare")
          for (const label of ["Earlier A submission", "Earlier B submission"])
            await form.getByLabel(label, { exact: true }).selectOption(group);
        await saved(
          form.getByRole("button", {
            name: "Submit technical evidence and response",
            exact: true,
          }),
          `/submission/${phase}/${group}`,
        );
      }
      await role("Instructor");
      await phaseButton(phase).click();
      await page
        .getByRole("button", { name: "Gradebook", exact: true })
        .click();
      const release = page.locator('form[data-form="publish"]');
      await release
        .getByLabel("Reason for releasing or withdrawing results")
        .fill("Attempt release before assessment to check the shared gate");
      await release
        .getByRole("button", { name: "Release phase results", exact: true })
        .click();
      await expect(notice).toContainText("Assess every group and student");
      await page
        .getByRole("button", { name: "Group submission", exact: true })
        .click();
      for (const group of ["group-01", "group-02"]) {
        await page.locator("[data-group-select]").selectOption(group);
        const form = page.locator('form[data-form="project-grade"]');
        for (const [index, value] of [2, 4, 0, 2, 1, 2, 0, 1].entries())
          await form.locator(`[name="score-${index}"]`).fill(String(value));
        await form
          .getByLabel("Criterion reasons, feedback and missing evidence")
          .fill(
            "Synthetic assessment exercise, 12/30: reproducible small source, limited behavior, no scaling measurements. Criterion scores illustrate workflow rather than a complete assessed project.",
          );
        await form
          .getByLabel("Assessment record reason")
          .fill("Review current synthetic group evidence");
        await saved(
          form.getByRole("button", { name: "Record assessment", exact: true }),
          `/project-grade/${phase}/${group}`,
        );
      }
      await page
        .getByRole("button", { name: "Private portfolios", exact: true })
        .click();
      for (const [index, student] of students.entries()) {
        await page.locator("[data-student-select]").selectOption(student.id);
        await expect(page.locator(".course-portfolio-read")).toContainText(
          `PRIVATE ${student.name}`,
        );
        const form = page.locator('form[data-form="individual-grade"]');
        const scores = [1, 1, 1, 1, 1, 1, 0, 0, 0, 3, 3, 3, 3];
        if (index === 1 && phase === "challenge") scores.splice(3, 3, 0, 0, 0);
        for (const [i, value] of scores.entries())
          await form.locator(`[name="score-${i}"]`).fill(String(value));
        await form
          .getByLabel("Criterion reasons, feedback and missing evidence")
          .fill(
            index === 1 && phase === "challenge"
              ? "Only one completed lecture activity; full project work cannot replace mandatory participation."
              : "Two complete live/remote activities and specific self, peer, reflection and contribution evidence.",
          );
        await form
          .getByLabel("Assessment record reason")
          .fill("Review current private synthetic portfolio");
        await saved(
          form.getByRole("button", { name: "Record assessment", exact: true }),
          `/individual-grade/${phase}/${student.id}`,
        );
      }
      await page
        .getByRole("button", { name: "Gradebook", exact: true })
        .click();
      await release
        .getByLabel("Reason for releasing or withdrawing results")
        .fill("Release all current synthetic assessments for this phase");
      await saved(
        release.getByRole("button", {
          name: "Release phase results",
          exact: true,
        }),
        `/publish/${phase}`,
      );
      await expect(release).toContainText("results: released");
      const assessed = await snapshot();
      for (const record of frozen[phase]!) {
        const current = assessed.submissions.find(
          (s: Envelope<Submission>) => s.key === record.key,
        );
        expect(current.value.archive).toBe(record.value.archive);
        expect(current.value.members).toEqual(record.value.members);
        expect(current.value.frozenRevision).toBe(record.value.frozenRevision);
        expect(
          assessed.audits.find(
            (a: any) =>
              a.value.phase === phase && a.value.to === record.value.group,
          ).value.targetRevision,
        ).toBe(record.revision);
      }
    });
  }
  const grades = await download(
    page.getByRole("link", {
      name: "Export released grades (CSV)",
      exact: true,
    }),
  );
  expect(grades.name).toBe("SIMULATION-course-grades.csv");
  const csv = grades.bytes.toString("utf8");
  expect(csv).toContain('"environment"');
  expect(csv).toMatch(/"Simulation","SIM001","Ada Example".*"1","pass"/);
  expect(csv).toMatch(/"Simulation","SIM002","Ben Example".*"0","fail"/);
  const complete = await snapshot();
  expect(complete.portfolios).toHaveLength(18);
  expect(complete.audits).toHaveLength(6);
  expect(
    complete.results.filter((r: any) => r.result.status === "pass"),
  ).toHaveLength(5);
  await role("Ben Example");
  await expect(page.locator("[data-course-content]")).toContainText(
    "1/3 completed lecture activities; needs 2",
  );
  const privateView = await snapshot();
  expect(privateView.results).toHaveLength(1);
  expect(
    privateView.portfolios.every(
      (p: any) => p.value.student === students[1].id,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).include("[data-course-app]").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: "test-results/course-simulation-walkthrough-mobile.png",
    fullPage: true,
  });
  expect(escaped).toEqual([]);
});
