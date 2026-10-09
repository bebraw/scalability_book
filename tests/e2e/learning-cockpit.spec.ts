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
      demo.id === "demo-queue-balance-lab"
        ? "browser-queue-snapshot"
        : "browser-demo-snapshot",
    );
    if (demo.id !== "demo-queue-balance-lab") {
      expect(context.readingActivity.turn.observation.demoId).toBe(demo.id);
      expect(
        context.readingActivity.turn.observation.visibleText.length,
      ).toBeGreaterThan(0);
      expect(
        context.readingActivity.turn.observation.visibleText,
      ).not.toContain("My prediction or uncertainty");
    }
    expect(context.selectedNotes).toEqual([]);
  }
  expect(model.requests).toHaveLength(demoResources.length);
});

test("reading loops retain independent thinking, reflection and a next check across sources and reviewed notebook handoffs", async ({
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
  await cockpit(page)
    .getByRole("button", { name: "Discuss my prediction", exact: true })
    .click();
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
  await cockpit(page)
    .getByRole("button", { name: "Prepare notebook takeaway" })
    .click();
  const notebook = page.locator("#learning-notebook");
  await expect(notebook.getByLabel("Your thinking")).toHaveValue(
    /Next independent check: Inspect one runtime inventory/,
  );
  await notebook
    .getByRole("button", { name: "Save note", exact: true })
    .click();
  await expect(notebook.getByRole("status")).toContainText(
    "Saved in your private notebook",
  );
  await notebook.getByRole("button", { name: "Notes", exact: true }).click();
  await notebook
    .getByRole("button", { name: "Explore and reflect", exact: true })
    .click();
  await expect(cockpit(page).getByLabel("What I noticed")).toHaveValue(
    /Help me revisit this selected note/,
  );
  expect(model.requests).toHaveLength(sent);
  await cockpit(page)
    .getByRole("button", { name: "Explain directly", exact: true })
    .click();
  await expect(
    cockpit(page).locator(".reading-investigation-messages strong"),
  ).toBeVisible();
  await expect.poll(() => model.requests.length).toBe(sent + 1);
  expect(lastContext(model).selectedNotes).toHaveLength(1);
  expect(lastContext(model).selectedNotes[0].body).toContain(
    "Release success does not establish",
  );
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
  expect(model.requests).toHaveLength(sent + 1);
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
  await assistant
    .getByLabel("My explanation of the changed case")
    .fill("I need to compare one changed boundary before generalizing.");
  await assistant
    .getByRole("button", {
      name: "Explore this case in the learning cockpit",
      exact: true,
    })
    .click();
  await expect(cockpit(page).getByLabel("What I noticed")).toHaveValue(
    /compare one changed boundary/,
  );
  await expect(assistant).toBeHidden();
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
