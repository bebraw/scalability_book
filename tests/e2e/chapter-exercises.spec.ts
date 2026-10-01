import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.setTimeout(60000);

const chapter = "/chapters/benchmarking/";
const selector = "#exercise-measurement-boundary";

test("chapter answers persist on the server across browser contexts", async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto(chapter + selector);
  const exercise = page.locator(selector);
  await expect(exercise.locator("input[type=number]")).toBeEnabled();
  const text = "10";
  await exercise
    .getByLabel("Calculated work in progress (operations)")
    .fill(text);
  await exercise
    .getByLabel("What follows from the mismatch?")
    .selectOption("check");
  await exercise
    .getByRole("button", { name: "Check answer", exact: true })
    .click();
  await expect(exercise.locator("[data-result]")).toContainText("Correct");
  await exercise.getByRole("button", { name: "Save result" }).click();
  await expect(exercise.locator(".exercise-status")).toContainText(
    "Saved to the local preview server",
  );
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
  });
  const other = await context.newPage();
  await other.goto(chapter + selector);
  await expect(other.locator(selector + " input[type=number]")).toHaveValue(
    text,
  );
  await expect(other.locator(selector + " [data-result]")).toContainText(
    "Exercise complete",
  );
  await other
    .locator(selector)
    .getByText("Show worked answer", { exact: true })
    .click();
  await expect(other.locator(selector + " .exercise-discussion")).toContainText(
    "λW is 10",
  );
  expect(
    await other.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page: other }).include(selector).analyze())
      .violations,
  ).toEqual([]);
  await other
    .locator(selector)
    .screenshot({ path: test.info().outputPath("measurement-mobile.png") });
  await context.close();
  await exercise.screenshot({
    path: test.info().outputPath("measurement-desktop.png"),
  });
});

test("a failed save retains the draft and never claims success", async ({
  page,
}) => {
  await page.goto(chapter + selector);
  const exercise = page.locator(selector);
  await expect(exercise.locator("input[type=number]")).toBeEnabled();
  await exercise.locator("input[type=number]").fill("25");
  await exercise
    .getByLabel("What follows from the mismatch?")
    .selectOption("database");
  await exercise
    .getByRole("button", { name: "Check answer", exact: true })
    .click();
  await expect(exercise.locator("[data-result]")).toContainText("Not yet");
  await page.route("**/api/learning/measurement-boundary", (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({
          status: 503,
          json: { message: "Storage unavailable. Try again." },
        })
      : route.continue(),
  );
  await exercise.getByRole("button", { name: "Save result" }).click();
  await expect(exercise.locator(".exercise-status")).toContainText(
    "Storage unavailable",
  );
  await expect(exercise.locator("input[type=number]")).toHaveValue("25");
  await expect(
    exercise.getByRole("button", { name: "Save result" }),
  ).toBeEnabled();
});

test("anonymous reading and no-JavaScript discussion remain available", async ({
  page,
  browser,
  baseURL,
}) => {
  await page.route("**/api/auth/status", (route) =>
    route.fulfill({
      json: {
        authenticated: false,
        available: true,
        loginUrl: "/api/auth/github/start",
      },
    }),
  );
  await page.goto(chapter + selector);
  const exercise = page.locator(selector);
  await expect(
    exercise.getByRole("link", { name: "Sign in to save" }),
  ).toHaveAttribute("href", /returnTo=.*exercise-measurement-boundary/);
  await exercise.locator("input[type=number]").fill("10");
  await exercise
    .getByLabel("What follows from the mismatch?")
    .selectOption("check");
  await exercise
    .getByRole("button", { name: "Check answer", exact: true })
    .click();
  await expect(exercise.locator("[data-result]")).toContainText("Correct");
  await expect(
    exercise.getByRole("button", { name: "Save result" }),
  ).toBeDisabled();
  await exercise.getByText("Show worked answer", { exact: true }).click();
  await expect(exercise.locator(".exercise-discussion")).toContainText(
    "λW is 10",
  );
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
  });
  const reading = await context.newPage();
  await reading.goto(chapter + selector);
  await expect(reading.locator(".book-exercise")).toHaveCount(4);
  await expect(reading.locator(selector + " .exercise-work")).toBeHidden();
  await reading
    .locator(selector)
    .getByText("Show worked answer", { exact: true })
    .click();
  await expect(
    reading.locator(selector + " .exercise-discussion p"),
  ).toBeVisible();
  await context.close();
});

test("numeric and experiment-selection exercises provide deterministic feedback", async ({
  page,
}) => {
  await page.goto(chapter + "#exercise-measurement-prediction");
  const prediction = page.locator("#exercise-measurement-prediction");
  await prediction
    .getByRole("button", { name: "Check answer", exact: true })
    .click();
  await expect(prediction.locator("[data-result]")).toContainText(
    "Complete every field",
  );
  await prediction.getByLabel("Mean latency (ms)", { exact: true }).fill("60");
  await prediction.getByLabel("p95 latency (ms)", { exact: true }).fill("240");
  await prediction
    .getByLabel("Which measurements meet the objective?")
    .selectOption("mean-only");
  await prediction
    .getByRole("button", { name: "Check answer", exact: true })
    .click();
  await expect(prediction.locator("[data-result]")).toContainText(
    "Exercise complete",
  );
  const experiment = page.locator("#exercise-measurement-experiment");
  await experiment
    .getByLabel("Which before-and-after comparison isolates batching?")
    .selectOption("hardware");
  await experiment
    .getByLabel("Does the reported run meet every declared criterion?")
    .selectOption("accept");
  await experiment
    .getByRole("button", { name: "Check answer", exact: true })
    .click();
  await expect(experiment.locator("[data-result]")).toContainText("Not yet");
  await experiment
    .getByLabel("Which before-and-after comparison isolates batching?")
    .selectOption("controlled");
  await experiment
    .getByLabel("Does the reported run meet every declared criterion?")
    .selectOption("reject");
  await experiment
    .getByRole("button", { name: "Check answer", exact: true })
    .click();
  await expect(experiment.locator("[data-result]")).toContainText(
    "Exercise complete",
  );
  await expect(
    page.locator(".book-exercise textarea, .book-exercise [data-completed]"),
  ).toHaveCount(0);
});

test("demo tabs preserve state, support keyboard and links, and print both panels", async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto(chapter);
  const group = page.locator('[data-exercise-tabs="measurement-boundary"]');
  const explore = group.getByRole("tab", { name: "Explore", exact: true });
  const practice = group.getByRole("tab", {
    name: /^Practice(?: · Complete)?$/,
  });
  await expect(practice).not.toContainText("1 exercise");
  await expect(page.locator(".exercise-tabs [role=tablist]")).toHaveCount(2);
  await expect(explore).toHaveAttribute("aria-selected", "true");
  await expect(group.locator(".book-exercise")).toBeHidden();
  const time = group.locator('[data-little-law-input="time"]');
  await time.fill("1");
  await practice.click();
  await expect(group.locator("#demo-queue-balance-lab")).toBeHidden();
  await group.getByLabel("Calculated work in progress (operations)").fill("10");
  await group
    .getByLabel("What follows from the mismatch?")
    .selectOption("check");
  await group
    .getByRole("button", { name: "Check answer", exact: true })
    .click();
  await expect(practice).toContainText("Complete");
  await explore.click();
  await expect(time).toHaveValue("1");
  await explore.focus();
  await page.keyboard.press("ArrowRight");
  await expect(practice).toBeFocused();
  await expect(practice).toHaveAttribute("aria-selected", "true");
  await expect(
    group.getByLabel("Calculated work in progress (operations)"),
  ).toHaveValue("10");
  expect(
    (
      await new AxeBuilder({ page })
        .include('[data-exercise-tabs="measurement-boundary"]')
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Home");
  await expect(explore).toBeFocused();
  await page.evaluate(() => {
    location.hash = "exercise-measurement-boundary";
  });
  await expect(practice).toHaveAttribute("aria-selected", "true");
  await page.emulateMedia({ media: "print" });
  await expect(group.locator("#demo-queue-balance-lab")).toBeVisible();
  await expect(group.locator(".book-exercise")).toBeVisible();
  await expect(group.getByRole("tablist")).toBeHidden();
  await page.emulateMedia({ media: "screen" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await group.evaluate(
      (element) =>
        element.scrollWidth <= innerWidth &&
        element.getBoundingClientRect().right <= innerWidth,
    ),
  ).toBe(true);
  await group.screenshot({
    path: test.info().outputPath("practice-tabs-mobile.png"),
  });
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
  });
  const reading = await context.newPage();
  await reading.goto(chapter);
  await expect(reading.locator(".exercise-tabs [role=tablist]")).toHaveCount(0);
  await expect(reading.locator("#demo-queue-balance-lab")).toBeVisible();
  await expect(reading.locator("#exercise-measurement-boundary")).toBeVisible();
  await context.close();
});

const fleetAnswers = {
  "four-time": "40",
  "eight-time": "30",
  candidates: "6",
  accepted: "3",
  backlog: "3",
  claim: "faster-only",
};

const chapterPractice = [
  {
    chapter: "what-is-scalability",
    id: "scalability-contract",
    answers: { failed: "latency", verdict: "no" },
  },
  {
    chapter: "scalable-development",
    id: "development-gates",
    answers: { gate: "review", destination: "implementing" },
  },
  {
    chapter: "architecture",
    id: "architecture-outcome",
    answers: { stored: "yes", timeout: "response" },
  },
  {
    chapter: "friction",
    id: "friction-cycle",
    answers: { total: "55", saved: "5" },
  },
  {
    chapter: "reality",
    id: "pressure-retries",
    answers: { effects: "2", idempotent: "no", mechanism: "atomic" },
  },
  {
    chapter: "agent-fleets",
    id: "fleets-amdahl",
    answers: fleetAnswers,
  },
  {
    chapter: "scaling",
    id: "scaling-bottleneck",
    answers: { before: "110", after: "130", excess: "20" },
  },
  {
    chapter: "recap",
    id: "judgment-evidence",
    answers: { measured: "observation", cause: "inference", next: "proposal" },
  },
];
for (const fixture of chapterPractice) {
  test(`${fixture.chapter} practice checks and persists an objective answer`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const url = `/chapters/${fixture.chapter}/#exercise-${fixture.id}`;
    await page.goto(url);
    const exercise = page.locator(`#exercise-${fixture.id}`);
    await expect(exercise).toBeVisible();
    for (const [field, value] of Object.entries(fixture.answers)) {
      const input = exercise.locator(`[data-field="${field}"]`);
      await expect(input).toBeEnabled();
      if (await input.evaluate((el) => el.tagName === "SELECT"))
        await input.selectOption(value!);
      else await input.fill(value!);
    }
    if (fixture.id === "fleets-amdahl") {
      await expect(
        exercise.locator(".exercise-discussion"),
      ).not.toHaveAttribute("open", "");
      await exercise.locator('[data-field="accepted"]').fill("6");
      await exercise.locator('[data-field="backlog"]').fill("0");
      await exercise
        .locator('[data-field="claim"]')
        .selectOption("both-double");
      await exercise.getByRole("button", { name: "Check answer" }).click();
      await expect(exercise.locator("[data-result]")).toContainText("Not yet");
      await expect(
        exercise.locator('[data-feedback="accepted"]'),
      ).toContainText("One reviewer takes 20 minutes");
      await expect(exercise.locator('[data-feedback="backlog"]')).toContainText(
        "three unfinished features/hour",
      );
      await expect(exercise.locator('[data-feedback="claim"]')).toContainText(
        "same reviewer",
      );
      await exercise.locator('[data-field="accepted"]').fill("3");
      await exercise.locator('[data-field="backlog"]').fill("3");
      await exercise
        .locator('[data-field="claim"]')
        .selectOption("faster-only");
    }
    if (fixture.id === "pressure-retries") {
      await expect(
        exercise.locator(".exercise-discussion"),
      ).not.toHaveAttribute("open", "");
      await exercise.locator('[data-field="idempotent"]').selectOption("yes");
      await exercise.getByRole("button", { name: "Check answer" }).click();
      await expect(exercise.locator("[data-result]")).toContainText("Not yet");
      await expect(
        exercise.locator('[data-feedback="idempotent"]'),
      ).toContainText("duplicate domain activity event");
      await exercise.locator('[data-field="idempotent"]').selectOption("no");
    }
    await exercise.getByRole("button", { name: "Check answer" }).click();
    await expect(exercise.locator("[data-result]")).toContainText(
      "Correct — all parts passed",
    );
    await exercise.getByRole("button", { name: "Save result" }).click();
    await expect(exercise.locator(".exercise-status")).toContainText(
      "Saved to the local preview server",
    );
    const saved = await page.request.get(`/api/learning/${fixture.id}`);
    const answer = (await saved.json()).answers[0];
    expect(answer.completed).toBe(true);
    if (["fleets-amdahl", "pressure-retries"].includes(fixture.id))
      expect(answer.version).toBe(2);
    if (fixture.chapter !== "recap") {
      const group = page.locator(`[data-exercise-tabs="${fixture.id}"]`);
      await expect(
        group.getByRole("tab", { name: "Practice · Complete" }),
      ).toHaveAttribute("aria-selected", "true");
      expect(
        await group.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
      const violations = await new AxeBuilder({ page })
        .include(`[data-exercise-tabs="${fixture.id}"]`)
        .analyze();
      expect(violations.violations).toEqual([]);
      await group.screenshot({
        path: test.info().outputPath(`${fixture.chapter}-practice-mobile.png`),
      });
      await group.getByRole("tab", { name: "Explore", exact: true }).click();
      await expect(exercise).toBeHidden();
      await expect(group.locator('[role="tabpanel"]:visible')).toHaveCount(1);
    }
    await page.reload();
    if (fixture.chapter !== "recap")
      await page
        .locator(`[data-exercise-tabs="${fixture.id}"]`)
        .getByRole("tab", { name: /Practice/ })
        .click();
    await expect(exercise.locator("[data-result]")).toContainText(
      "Correct — all parts passed",
    );
  });
}

test("showcase includes all exercises and shares saved progress with chapters", async ({
  page,
}) => {
  await page.goto("/demos/");
  await expect(page.locator("[data-exercise]")).toHaveCount(13);
  await expect(page.locator(".exercise-tabs")).toHaveCount(9);
  await expect(
    page.locator('.exercise-tabs [role="tab"][aria-selected="true"]'),
  ).toHaveText(Array(9).fill("Explore"));
  const group = page.locator('[data-exercise-tabs="fleets-amdahl"]');
  await group.getByRole("tab", { name: /^Practice/ }).click();
  const exercise = group.locator('[data-exercise="fleets-amdahl"]');
  for (const [field, value] of Object.entries(fleetAnswers)) {
    const input = exercise.locator(`[data-field="${field}"]`);
    if (field === "claim") await input.selectOption(value);
    else await input.fill(value);
  }
  await exercise.getByRole("button", { name: "Check answer" }).click();
  await exercise.getByRole("button", { name: "Save result" }).click();
  await expect(exercise.locator(".exercise-status")).toContainText(
    "Saved to the local preview server",
  );
  const card = group.locator("..");
  await card.getByRole("link", { name: "Practice in the chapter" }).click();
  await expect(page).toHaveURL(
    /chapters\/agent-fleets\/#exercise-fleets-amdahl/,
  );
  await expect(
    page.locator("#exercise-fleets-amdahl [data-result]"),
  ).toContainText("Correct — all parts passed");
  await page.goto("/demos/#exercise-fleets-amdahl");
  await expect(
    group.getByRole("tab", { name: "Practice · Complete" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(exercise.locator('[data-field="four-time"]')).toHaveValue("40");
  await expect(exercise.locator('[data-field="claim"]')).toHaveValue(
    "faster-only",
  );
  await group.screenshot({
    path: test.info().outputPath("showcase-practice.png"),
  });
});
