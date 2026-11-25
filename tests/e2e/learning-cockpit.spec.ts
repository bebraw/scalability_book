import { downloadedMarkdown } from "./learning-workspace.helpers.ts";
import { test as base, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { demoResources } from "../../shared/learning-resources.ts";
import {
  startSyntheticLocalModel,
  localAnswer,
} from "../fixtures/learning-local-server.ts";

const address = "http://127.0.0.1:18892";
const test = base.extend<{
  model: Awaited<ReturnType<typeof startSyntheticLocalModel>>;
}>({
  model: async ({ baseURL }, use) => {
    const directory = await mkdtemp(
      path.join(tmpdir(), "book-cockpit-browser-"),
    );
    const model = await startSyntheticLocalModel((body) => {
      const context = JSON.parse(
        body.messages.findLast((message: any) => message.role === "user")
          .content,
      );
      return localAnswer(
        `**${context.readingActivity.contract.title}**\n\nYour ${context.readingActivity.turn.phase} step is grounded in the selected source. ${context.readingActivity.turn.evidence || "Choose one assumption to check."}`,
      );
    });
    const child = spawn(
      process.execPath,
      [
        "scripts/learning-companion.ts",
        "--local",
        "--model",
        model.options.model,
        "--local-url",
        model.url,
        "--local-context",
        "32768",
        "--directory",
        directory,
        "--port",
        "18892",
        "--origin",
        new URL(baseURL!).origin,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Cockpit companion did not start")),
          8000,
        );
        child.once("exit", () => {
          clearTimeout(timer);
          reject(new Error("Cockpit companion exited"));
        });
        child.stdout!.on("data", (chunk) => {
          if (String(chunk).includes("Learning companion:")) {
            clearTimeout(timer);
            resolve();
          }
        });
      });
      await use(model);
    } finally {
      const stopped = once(child, "exit");
      child.kill("SIGTERM");
      await stopped.catch(() => {});
      await model.close();
      await rm(directory, { recursive: true, force: true });
    }
  },
});
const cockpit = (page: import("@playwright/test").Page) =>
  page.locator("#learning-cockpit");
async function connect(page: import("@playwright/test").Page) {
  await cockpit(page)
    .getByLabel("Investigation companion address")
    .fill(address);
  await cockpit(page)
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await expect(
    cockpit(page).getByRole("button", {
      name: "Explain directly",
      exact: true,
    }),
  ).toBeEnabled();
}
const lastContext = (
  model: Awaited<ReturnType<typeof startSyntheticLocalModel>>,
) =>
  JSON.parse(
    model.requests
      .at(-1)
      .messages.findLast((message: any) => message.role === "user").content,
  );

test("every demo enters the same cockpit and supplies its own actual snapshot on explicit send", async ({
  page,
  model,
}) => {
  test.setTimeout(150_000);
  await page.goto("/demos/");
  await expect(page.locator("[data-investigate-demo]")).toHaveCount(
    demoResources.length,
  );
  expect(model.requests).toHaveLength(0);
  for (const [index, demo] of demoResources.entries()) {
    await page.locator(`[data-investigate-demo="${demo.id}"]`).click();
    await expect(cockpit(page).getByRole("heading", { level: 2 })).toHaveText(
      demo.title,
    );
    if (!index) await connect(page);
    await expect(
      cockpit(page).getByRole("button", {
        name: "Explain directly",
        exact: true,
      }),
    ).toBeEnabled();
    await cockpit(page)
      .getByLabel("My prediction or uncertainty")
      .fill(`I want to check one assumption in ${demo.title}.`);
    await cockpit(page)
      .getByRole("button", { name: "Discuss my prediction", exact: true })
      .click();
    await expect(
      cockpit(page).locator(".reading-investigation-messages strong"),
    ).toBeVisible();
    await expect(
      cockpit(page).getByRole("button", {
        name: "Discuss this result",
        exact: true,
      }),
    ).toBeEnabled();
    const context = lastContext(model);
    expect(context.source.anchor).toBe(demo.id);
    expect(context.readingActivity.contract.demoId).toBe(demo.id);
    expect(context.readingActivity.turn.observation.kind).toBe(
      "browser-demo-snapshot",
    );
    expect(context.readingActivity.turn.observation.demoId).toBe(demo.id);
    expect(
      context.readingActivity.turn.observation.visibleText.length,
    ).toBeGreaterThan(0);
    expect(context.readingActivity.turn.observation.visibleText).not.toContain(
      "My prediction or uncertainty",
    );
    expect(context.selectedNotes).toEqual([]);
  }
  expect(model.requests).toHaveLength(demoResources.length);
});

test("reading loops retain independent thinking, reflection and a next check across sources and download a diary takeaway", async ({
  page,
  model,
}) => {
  await page.goto("/chapters/reality/");
  await page
    .getByRole("button", { name: "Learning cockpit", exact: true })
    .click();
  await connect(page);
  await cockpit(page)
    .getByLabel("My prediction or uncertainty")
    .fill("A successful release might leave older deployments running.");
  // A retained cockpit draft may still refer to a note chosen in the retired editor.
  await page.evaluate(() => {
    const key = Object.keys(sessionStorage).find((key) =>
      key.startsWith("book-learning-loop:"),
    );
    if (!key) throw new Error("The cockpit did not save its draft.");
    const draft = JSON.parse(sessionStorage.getItem(key)!);
    draft.noteIds = ["c0000000-0000-4000-8000-000000000001"];
    sessionStorage.setItem(key, JSON.stringify(draft));
  });
  await page.reload();
  await expect(
    cockpit(page).getByLabel("My prediction or uncertainty"),
  ).toHaveValue("A successful release might leave older deployments running.");
  const send = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      request.url().startsWith(address + "/agent/conversations/"),
  );
  await cockpit(page)
    .getByRole("button", { name: "Discuss my prediction", exact: true })
    .click();
  expect((await send).postDataJSON().noteIds).toEqual([]);
  await expect(
    cockpit(page).getByRole("button", {
      name: "Discuss this result",
      exact: true,
    }),
  ).toBeEnabled();
  await cockpit(page)
    .getByLabel("My check and evidence")
    .fill(
      "I reread the remediation example. I have not measured my own deployment.",
    );
  await cockpit(page)
    .getByRole("button", { name: "Discuss this result", exact: true })
    .click();
  await expect(
    cockpit(page).locator(".reading-investigation-messages"),
  ).toContainText("I reread the remediation example");
  expect(lastContext(model).readingActivity.turn.observation).toBeUndefined();
  expect(lastContext(model).readingActivity.contract.id).toBe("learning-loop");
  await cockpit(page).getByRole("button", { name: "03 / Reflect" }).click();
  await cockpit(page)
    .getByLabel("My takeaway", { exact: true })
    .fill("Release success does not establish remediation coverage.");
  await cockpit(page)
    .getByLabel("My next independent check")
    .fill("Inspect one runtime inventory without asking the assistant.");
  const sent = model.requests.length;
  await page.goto("/concepts/?topic=queue");
  await page
    .getByRole("button", { name: "Learning cockpit", exact: true })
    .click();
  await cockpit(page)
    .getByLabel("My prediction or uncertainty")
    .fill("A second independent question.");
  await cockpit(page)
    .getByText("Recent learning loops in this tab", { exact: true })
    .click();
  await cockpit(page)
    .locator(".cockpit-trail a")
    .filter({ hasText: "reflect" })
    .click();
  await expect(
    cockpit(page).getByLabel("My takeaway", { exact: true }),
  ).toHaveValue("Release success does not establish remediation coverage.");
  await expect(
    cockpit(page).getByLabel("My next independent check"),
  ).toHaveValue("Inspect one runtime inventory without asking the assistant.");
  expect(model.requests).toHaveLength(sent);
  expect(
    (await new AxeBuilder({ page }).include("#learning-cockpit").analyze())
      .violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("[data-theme-picker]").selectOption("dark");
  const overflow = await cockpit(page).evaluate((element) => {
    const edge = element.getBoundingClientRect().right;
    return {
      excess: element.scrollWidth - element.clientWidth,
      descendants: [...element.querySelectorAll("*")]
        .filter((child) => child.getBoundingClientRect().right > edge + 1)
        .map((child) => ({
          tag: child.tagName,
          className: child.className,
          width: child.getBoundingClientRect().width,
          text: child.textContent?.slice(0, 120),
        })),
    };
  });
  expect(overflow).toEqual({ excess: 0, descendants: [] });
  expect(
    (await new AxeBuilder({ page }).include("#learning-cockpit").analyze())
      .violations,
  ).toEqual([]);
  const markdown = await downloadedMarkdown(
    cockpit(page).getByRole("button", {
      name: "Download takeaway as Markdown",
    }),
  );
  expect(markdown).toContain(
    "Next independent check: Inspect one runtime inventory",
  );
  expect(markdown).toContain(
    "[Book source](https://scalableweb.dev/chapters/reality/",
  );
  expect(model.requests).toHaveLength(sent);
  await cockpit(page).getByRole("button", { name: "03 / Reflect" }).click();
  await cockpit(page)
    .getByRole("button", { name: "Start my next check" })
    .click();
  await expect(cockpit(page).getByRole("heading", { level: 2 })).toHaveText(
    "Inspect one runtime inventory without asking the assistant.",
  );
  await expect(
    cockpit(page).getByLabel("My prediction or uncertainty"),
  ).toHaveValue("");
  expect(model.requests).toHaveLength(sent);
});

test("a long cockpit takeaway exports the complete writing and browser snapshot", async ({
  page,
  model,
}) => {
  const demoId = "demo-cache-decision-lab";
  await page.goto("/chapters/architecture/");
  const observed =
    "Visible response age from the synthetic cache trial. ".repeat(128) +
    "End of the recorded cache trial.";
  await page.locator(`#${demoId}`).evaluate((demo, text) => {
    const output = document.createElement("p");
    output.textContent = text;
    demo.prepend(output);
  }, observed);
  await page.locator(`[data-investigate-demo="${demoId}"]`).click();
  await connect(page);
  const panel = cockpit(page);
  const prediction = "My prediction about the stored age. ".repeat(50);
  await panel.getByLabel("My prediction or uncertainty").fill(prediction);
  await panel.getByRole("button", { name: "Discuss my prediction" }).click();
  await expect(
    panel.getByRole("button", { name: "Discuss this result" }),
  ).toBeEnabled();
  expect(
    lastContext(model).readingActivity.turn.observation.visibleText,
  ).toContain(observed);
  await panel.getByRole("button", { name: "03 / Reflect" }).click();
  const takeaway = "The response lifetime changes the outcome. ".repeat(90);
  const evidence = "I compared the saved age to the response lifetime. ".repeat(
    75,
  );
  const next =
    "I will repeat the same check with two responses. ".repeat(35) +
    "Final independent check.";
  await panel.getByLabel("My takeaway", { exact: true }).fill(takeaway);
  await panel.getByLabel("My check and evidence").fill(evidence);
  await panel.getByLabel("My next independent check").fill(next);
  const markdown = await downloadedMarkdown(
    panel.getByRole("button", { name: "Download takeaway as Markdown" }),
  );
  expect(markdown).toContain(next);
  expect(markdown.indexOf("End of the recorded cache trial.")).toBeGreaterThan(
    16_000,
  );
});

test("a checked exercise enters a reviewed loop without worked answers or automatic messages", async ({
  page,
  model,
}) => {
  await page.goto("/chapters/benchmarking/#exercise-measurement-boundary");
  const exercise = page.locator("#exercise-measurement-boundary");
  const enter = exercise.getByRole("button", {
    name: "Explore and reflect on this attempt",
  });
  await expect(enter).toBeDisabled();
  await exercise
    .getByLabel("Calculated work in progress (operations)")
    .fill("10");
  await exercise
    .getByLabel("What follows from the mismatch?")
    .selectOption("check");
  await exercise
    .getByRole("button", { name: "Check answer", exact: true })
    .click();
  await enter.click();
  await expect(cockpit(page).getByLabel("What I noticed")).toHaveValue(
    /Help me understand my attempt/,
  );
  expect(model.requests).toHaveLength(0);
  await connect(page);
  await cockpit(page)
    .getByRole("button", { name: "Explain directly", exact: true })
    .click();
  await expect(
    cockpit(page).locator(".reading-investigation-messages strong"),
  ).toBeVisible();
  const context = lastContext(model);
  expect(context.source.anchor).toBe("exercise-measurement-boundary");
  expect(context.question).not.toContain("Worked reasoning:");
  expect(context.selectedNotes).toEqual([]);
  await page.locator('.site-header [data-learning-toggle="assistant"]').click();
  const assistant = page.locator("#learning-assistant");
  await assistant
    .getByRole("button", { name: "Chapter guide", exact: true })
    .click();
  await expect(
    cockpit(page).getByLabel("My prediction or uncertainty"),
  ).toBeVisible();
  expect(model.requests).toHaveLength(1);
});

test("every learner surface opens a source-scoped loop without reading private course records", async ({
  page,
  model,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith(address)) requests.push(request.url());
  });
  for (const url of [
    "/",
    "/chapters/introduction/",
    "/appendices/scalability-models/",
    "/parts/establish/",
    "/case-studies/kirjolab/",
    "/project/establish/",
    "/concepts/?topic=queue",
    "/explore/prototype-to-shared-use/",
    "/notebook/setup/",
    "/course/",
  ]) {
    await page.goto(url);
    await expect(page.locator("#learning-cockpit")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Learning cockpit", exact: true })
      .click();
    await expect(
      cockpit(page).getByLabel("My prediction or uncertainty"),
    ).toBeVisible();
    if (url.startsWith("/concepts/"))
      await expect(cockpit(page).getByRole("heading", { level: 2 })).toHaveText(
        "Queue",
      );
    if (url.startsWith("/explore/"))
      await expect(cockpit(page).getByRole("heading", { level: 2 })).toHaveText(
        "Move a prototype into shared use",
      );
  }
  expect(requests).toEqual([]);
  expect(model.requests).toEqual([]);
  await page.goto("/admin/courses/");
  await expect(
    page.getByRole("button", { name: "Learning cockpit", exact: true }),
  ).toBeHidden();
});
