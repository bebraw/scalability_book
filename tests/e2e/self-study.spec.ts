import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import course from "../../study/pilot/course.json" with { type: "json" };

const root = "/learn/pilot/";
const scalability = root + "scalability/index.html";
const measurement = root + "measurement/index.html";

for (const module of course.modules
  .slice()
  .filter((m) => !["scalability", "measurement"].includes(m.id))) {
  test(`${module.id}: reading, feedback, links, and mobile demos`, async ({
    page,
    request,
    browser,
    baseURL,
  }) => {
    const url = root + module.id + "/index.html";
    const data = await (
      await request.get(root + module.id + "/module.json")
    ).json();
    expect(data.steps).toHaveLength(5);
    expect(JSON.stringify(data)).not.toMatch(
      /speaker-notes|defaultId|study-pilot-|\/Users\//,
    );
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    for (const step of data.steps) {
      await page.goto(url + "#slide-" + step.id);
      const section = page.locator("#slide-" + step.id);
      await expect(section).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      for (const link of await section.locator("a").all()) {
        const href = await link.getAttribute("href");
        expect((await request.get(new URL(href!, page.url()).href)).ok()).toBe(
          true,
        );
      }
      expect(await section.innerText()).not.toMatch(/\]\(\.\//);
      if (step.demo) {
        await expect(section.locator(".demo-host")).toHaveAttribute(
          "data-demo-status",
          "ready",
        );
        const frame = section.frameLocator("iframe");
        await expect(frame.locator("#controls")).toBeVisible();
        expect(
          await frame
            .locator("body")
            .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        ).toBe(true);
        await page.screenshot({
          path: test.info().outputPath(module.id + "-mobile.png"),
          fullPage: true,
        });
      }
      if (step.activity?.correctOption) {
        const { options, correctOption } = step.activity;
        const wrong = options.find(
          (option: { id: string }) => option.id !== correctOption,
        );
        const right = options.find(
          (option: { id: string }) => option.id === correctOption,
        );
        await section.getByLabel(wrong.label, { exact: true }).check();
        await section.getByRole("button", { name: "Check answer" }).click();
        await expect(section.locator(".answer-result")).toContainText(
          "Not quite",
        );
        await section.getByLabel(right.label, { exact: true }).check();
        await section.getByRole("button", { name: "Check answer" }).click();
        await expect(section.locator(".answer-result")).toContainText(
          "Correct",
        );
      }
    }
    await page
      .locator("#slide-apply")
      .getByText("Reveal discussion", { exact: true })
      .click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL,
      viewport: { width: 390, height: 844 },
    });
    const reading = await context.newPage();
    await reading.goto(url);
    await expect(reading.locator(".study-step:visible")).toHaveCount(5);
    for (const poster of await reading.locator(".demo-poster").all())
      await expect(poster).toBeVisible();
    for (const host of await reading.locator(".demo-host").all())
      await expect(host).toBeHidden();
    expect(
      await reading.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await context.close();
  });
}

test("new demos exercise acceptance, uncertain writes, friction, and capacity", async ({
  page,
}) => {
  await page.goto(root + "agent-development/index.html#slide-gates");
  let demo = page.frameLocator("#slide-gates iframe");
  for (const name of ["PLAN APPROVED", "PATCH READY", "TESTS PASS"])
    await demo.getByRole("button", { name, exact: true }).click();
  await expect(
    demo.getByRole("button", { name: "RELEASE", exact: true }),
  ).toHaveCount(0);
  for (const name of [
    "REVIEW START",
    "REQUEST CHANGES",
    "PATCH READY",
    "TESTS PASS",
    "REVIEW START",
    "APPROVE",
    "RELEASE",
  ])
    await demo.getByRole("button", { name, exact: true }).click();
  await expect(demo.locator("#verdict")).toHaveText("Change released.");
  await page.goto(root + "architecture/index.html#slide-request");
  demo = page.frameLocator("#slide-request iframe");
  for (const scenario of ["lost", "retry"]) {
    await demo.locator("#scenario").selectOption(scenario);
    for (let i = 0; i < 4; i++)
      await demo.getByRole("button", { name: "Next boundary" }).click();
    await expect(demo.locator("#outcome")).toContainText("One durable effect");
  }
  await page.goto(root + "friction/index.html#slide-timings");
  demo = page.frameLocator("#slide-timings iframe");
  await expect(demo.locator("#total")).toHaveText("60");
  await demo.getByRole("button", { name: "Halve editing time" }).click();
  await expect(demo.locator("#total")).toHaveText("55");
  await page.goto(root + "responses/index.html#slide-capacity");
  demo = page.frameLocator("#slide-capacity iframe");
  await demo.locator("#load").fill("150");
  await expect(demo.locator("#effect")).toHaveText("Backlog grows by 40/s");
  await demo.locator("#admission").check();
  await expect(demo.locator("#effect")).toHaveText("40/s explicitly rejected");
  await demo.getByRole("button", { name: "Add 40/s at limit" }).click();
  await expect(demo.locator("#limit")).toHaveText("Downstream · 130/s");
  await expect(demo.locator("#effect")).toHaveText("20/s explicitly rejected");
});

test("authored reading and module links render as working anchors", async ({
  page,
  request,
}) => {
  const cases = [
    [
      measurement,
      "request-path",
      "Read the chapter: Measurement and observability",
      "/chapters/benchmarking/",
    ],
    [
      scalability,
      "pressure",
      "Read the chapter: What is scalability?",
      "/chapters/what-is-scalability/",
    ],
    [measurement, "experiment", "Revisit scaling pressure", scalability],
    [scalability, "transfer", "Continue with measurement", measurement],
    [measurement, "experiment", "return to the book", "/"],
    [scalability, "transfer", "return to the book", "/"],
  ];
  for (const [module, slide, label, destination] of cases) {
    await page.goto(module + "#slide-" + slide);
    const link = page
      .locator("#slide-" + slide)
      .getByRole("link", { name: label, exact: true });
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    expect(href).not.toBeNull();
    const resolved = new URL(href!, page.url());
    expect(resolved.pathname).toBe(destination);
    expect((await request.get(resolved.href)).ok()).toBe(true);
  }
});

test("pilot has independent demos, persistent progress, and authored feedback", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  await page.goto(root);
  await expect(page.locator(".module-list li")).toHaveCount(9);
  await page.locator(".module-start").first().click();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.locator("#slide-pressure .complete-step").click();
  await expect(page.locator("#study-progress")).toHaveText(
    "1 of 5 sections complete",
  );
  await page.goto(scalability + "#slide-amdahl");
  const demo = page.frameLocator("#slide-amdahl .web-demo-frame");
  await expect(demo.locator("#speedup")).toHaveText("2.50×");
  await expect(page.locator("#slide-amdahl .demo-host")).toHaveAttribute(
    "data-demo-status",
    "ready",
  );
  await expect(page.locator("#slide-amdahl .demo-poster")).toBeHidden();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#slide-amdahl .demo-poster")).toBeVisible();
  await expect(page.locator("#slide-amdahl .demo-host")).toBeHidden();
  await page.emulateMedia({ media: "screen" });
  await demo.locator("#workers").fill("16");
  await expect(demo.locator("#speedup")).toHaveText("4.00×");
  await page.reload();
  await expect(demo.locator("#speedup")).toHaveText("4.00×");
  await page.locator("#study-next").click();
  await page.getByLabel("4×: four workers make it four times faster").check();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.locator("#slide-check .answer-result")).toContainText(
    "Not quite",
  );
  await page.getByLabel("2.5×: sequential work still takes time").check();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.locator("#slide-check .answer-result")).toContainText(
    "Correct",
  );
  await page.locator("#study-previous").click();
  await expect(demo.locator("#speedup")).toHaveText("4.00×");
  await page.locator("#slide-amdahl .reset-demo").click();
  await expect(demo.locator("#speedup")).toHaveText("2.50×");
  await page.screenshot({
    path: test.info().outputPath("amdahl.png"),
    fullPage: true,
  });
  const other = await browser.newContext();
  const independent = await other.newPage();
  await independent.goto(
    new URL(scalability + "#slide-amdahl", page.url()).href,
  );
  await expect(independent.locator("#study-progress")).toHaveText(
    "0 of 5 sections complete",
  );
  await expect(
    independent
      .frameLocator("#slide-amdahl .web-demo-frame")
      .locator("#speedup"),
  ).toHaveText("2.50×");
  await other.close();
  await page.getByRole("link", { name: "All modules" }).click();
  await expect(page.locator(".module-progress").first()).toHaveText(
    "1 / 5 complete",
  );
  await page.screenshot({
    path: test.info().outputPath("pilot-index.png"),
    fullPage: true,
  });
  // A new public revision must not inherit the completed step.
  await page.route("**/scalability/module.json", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({
      response,
      json: { ...data, revision: "new-public-revision" },
    });
  });
  await page.goto(scalability);
  await expect(page.locator("#study-progress")).toHaveText(
    "0 of 5 sections complete",
  );
  expect(errors).toEqual([]);
});

test("measurement, figures, reading links, and public export boundaries work", async ({
  page,
  request,
}) => {
  await page.goto(measurement);
  await expect(page.locator(".study-diagram svg")).toBeVisible();
  await page.goto(measurement + "#slide-little-law");
  const demo = page.frameLocator("#slide-little-law .web-demo-frame");
  await expect(demo.locator("#expected")).toHaveText("10.0");
  await demo.locator("#time").fill("1");
  await expect(demo.locator("#expected")).toHaveText("20.0");
  await page.locator("#slide-little-law .reset-demo").click();
  await expect(demo.locator("#expected")).toHaveText("10.0");
  await page.goto(measurement + "#slide-experiment");
  await expect(page.getByRole("button", { name: "Check answer" })).toHaveCount(
    0,
  );
  await page
    .locator("#slide-experiment")
    .getByText("Reveal discussion", { exact: true })
    .click();
  await expect(page.locator("#slide-experiment .activity")).toContainText(
    "Other designs can be valid",
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  for (const module of ["scalability", "measurement"]) {
    const response = await request.get(root + module + "/module.json");
    const data = await response.json();
    expect(data.steps).toHaveLength(5);
    expect(JSON.stringify(data)).not.toMatch(
      /PRIVATE_|speaker-notes|defaultId|study-pilot-|\/Users\//,
    );
    const html = await (
      await request.get(root + module + "/index.html")
    ).text();
    expect(html).not.toMatch(/PRIVATE_|speaker-notes/);
    for (const step of data.steps) {
      if (step.demo) {
        const demoResponse = await request.get(
          root + module + "/" + step.demo.url,
        );
        expect(demoResponse.headers()["content-security-policy"]).toContain(
          "sandbox allow-scripts",
        );
        expect(step.posterHtml).toContain("data:image/svg+xml;base64,");
      }
    }
  }
  for (const path of [
    "/chapters/what-is-scalability/",
    "/chapters/benchmarking/",
    root + "assets/study.mjs",
  ]) {
    const response = await request.get(path);
    expect(response.ok()).toBe(true);
    if (path.endsWith(".mjs")) {
      expect(response.headers()["content-type"]).toContain("javascript");
      expect(response.headers()["cache-control"]).toContain("must-revalidate");
    }
  }
  await page.goto(scalability + "#slide-evidence");
  const figure = page.locator("#slide-evidence img");
  await expect(figure).toBeVisible();
  expect(
    await figure.evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(0);
  await page.screenshot({
    path: test.info().outputPath("book-figure.png"),
    fullPage: true,
  });
});

test("mobile, blocked storage, keyboard use, and no-JavaScript reading remain usable", async ({
  browser,
  baseURL,
}) => {
  const noJs = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const reading = await noJs.newPage();
  await reading.goto(scalability);
  await expect(reading.locator(".study-step:visible")).toHaveCount(5);
  await expect(reading.locator("#slide-amdahl .demo-poster")).toBeVisible();
  await expect(reading.locator("#slide-amdahl .demo-host")).toBeHidden();
  await reading.setViewportSize({ width: 390, height: 844 });
  await expect(reading.locator("#slide-amdahl .demo-host")).toBeHidden();
  await reading.screenshot({
    path: test.info().outputPath("reading-copy.png"),
    fullPage: true,
  });
  await noJs.close();
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    baseURL,
  });
  await mobile.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw Error("Storage blocked");
      },
    }),
  );
  const page = await mobile.newPage();
  await page.goto(measurement + "#slide-little-law");
  await expect(page.locator("#storage-status")).toContainText("save progress");
  const demo = page.frameLocator("#slide-little-law .web-demo-frame");
  await expect(demo.locator("#expected")).toHaveText("10.0");
  await demo.locator("#rate").focus();
  await page.keyboard.press("ArrowRight");
  await expect(demo.locator("#expected")).toHaveText("10.5");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await demo
      .locator("body")
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("mobile.png"),
    fullPage: true,
  });
  await mobile.close();
});

test("a failed demo retains its poster and reading content", async ({
  page,
}) => {
  await page.route("**/demos/amdahl.html*", (route) =>
    route.fulfill({ status: 404, body: "Not found", contentType: "text/html" }),
  );
  await page.goto(scalability + "#slide-amdahl");
  await expect(page.locator("#slide-amdahl .demo-poster")).toBeVisible();
  await expect(page.locator("#slide-amdahl .demo-host")).toHaveAttribute(
    "data-demo-status",
    "error",
    { timeout: 15000 },
  );
  await expect(page.locator("#slide-amdahl .demo-host")).toBeHidden();
  await expect(page.locator("#slide-amdahl .demo-poster")).toBeVisible();
  await expect(page.locator("#slide-amdahl .demo-status")).toContainText(
    "reading content remains available",
  );
});
