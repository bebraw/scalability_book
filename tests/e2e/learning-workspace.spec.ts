import {
  activeLearningPanel,
  openAssistantSettings,
  selectReading,
  chooseNotebookTool,
} from "./learning-notebook.helpers.ts";
import { test, expect, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { conceptPages } from "../../shared/concept-pages.ts";
import type {
  AgentMessage,
  LearningConversation,
} from "../../shared/learning-agent.ts";
import type { NotebookEntry } from "../../shared/learning-workspace.ts";

let child: ChildProcess;
let directory: string;
const companionAddress = "http://127.0.0.1:18888";
test.beforeEach(async ({ baseURL }) => {
  directory = await mkdtemp(path.join(tmpdir(), "book-notebook-browser-"));
  child = spawn(
    process.execPath,
    [
      "scripts/learning-companion.ts",
      "--port",
      "18888",
      "--origin",
      new URL(baseURL!).origin,
      "--directory",
      directory,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  await new Promise<void>((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(
      () => reject(new Error("Synthetic companion did not start.")),
      8000,
    );
    child.once("exit", () => {
      clearTimeout(timeout);
      reject(new Error("Synthetic companion exited."));
    });
    child.stdout!.on("data", (data) => {
      output += String(data);
      const match = output.match(/Learning companion: http:\/\/127\.0\.0\.1:/);
      if (match) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
});
test.afterEach(async () => {
  if (child && child.exitCode === null) {
    const stopped = once(child, "exit");
    child.kill("SIGTERM");
    await stopped;
  }
  if (directory) await rm(directory, { recursive: true, force: true });
});

async function advertiseProvider(page: import("@playwright/test").Page) {
  await page.route(`${companionAddress}/status`, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      json: { ...(await response.json()), provider: "Synthetic" },
    });
  });
}

async function openNotebookSize(panel: Locator) {
  const width = panel.getByRole("slider", {
    name: "Notebook width",
    exact: true,
  });
  if (!(await width.isVisible()))
    await panel.getByLabel("Notebook size", { exact: true }).click();
  await expect(width).toBeVisible();
  return {
    width,
    height: panel.getByRole("slider", {
      name: "Notebook height",
      exact: true,
    }),
    reset: panel.getByRole("button", { name: "Reset size", exact: true }),
  };
}

async function expectNotebookSize(
  panel: Locator,
  width: number,
  height: number,
) {
  await expect
    .poll(async () => {
      const bounds = (await panel.boundingBox())!;
      return Math.max(
        Math.abs(bounds.width - width),
        Math.abs(bounds.height - height),
      );
    })
    .toBeLessThan(1);
}

for (const width of [1440, 390]) {
  test(`expanded assistant observations and code stay inside the panel at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await advertiseProvider(page);
    const token = "synthetic-request-" + "abcdef0123456789".repeat(24);
    const observation = JSON.stringify(
      {
        tool: "observe_demo",
        result: {
          [token]: {
            url: `https://example.org/observations/${token}`,
            result: ["complete synthetic output", "no model request was made"],
          },
        },
      },
      null,
      2,
    );
    let conversation: LearningConversation;
    await page.route(
      `${companionAddress}/agent/conversations`,
      async (route) => {
        const response = await route.fetch();
        if (route.request().method() === "POST")
          conversation = await response.json();
        await route.fulfill({ response });
      },
    );
    await page.route(
      `${companionAddress}/agent/conversations/*`,
      async (route) => {
        if (route.request().method() === "POST") {
          conversation = {
            ...conversation,
            state: "idle",
            messages: [
              {
                id: "c0000000-0000-4000-8000-000000000001",
                role: "observation",
                text: observation,
                at: new Date().toISOString(),
              },
              {
                id: "c0000000-0000-4000-8000-000000000002",
                role: "agent",
                text: `Recorded output follows.\n\n~~~json\n${observation}\n~~~`,
                at: new Date().toISOString(),
              },
            ],
          };
        }
        if (conversation) await route.fulfill({ json: conversation });
        else await route.continue();
      },
    );
    await page.goto("/chapters/benchmarking/");
    await page
      .locator(".site-header")
      .getByRole("button", { name: "Teaching assistant", exact: true })
      .click();
    const panel = activeLearningPanel(page);
    await panel.getByLabel("Companion address").fill(companionAddress);
    await panel
      .getByRole("button", { name: "Connect companion", exact: true })
      .click();
    await panel
      .getByLabel("Message to the teaching assistant")
      .fill("Inspect the synthetic output.");
    await panel
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    const disclosure = panel.locator("details.learning-evidence");
    await disclosure.locator("summary").click();
    await expect(disclosure).toHaveAttribute("open", "");
    await expect(disclosure.locator(".learning-evidence-output")).toHaveText(
      observation,
    );
    const pre = panel.locator(".learning-reply pre");
    await expect(pre.locator("code")).toHaveText(observation);
    await pre.scrollIntoViewIfNeeded();
    const geometry = await panel.evaluate((element) => {
      const content = element.querySelector(".learning-content")!;
      const body = element.querySelector(".learning-body")!;
      const pre = element.querySelector(".learning-reply pre")!;
      const observation = element.querySelector(".learning-evidence-output")!;
      const rect = body.getBoundingClientRect();
      return {
        panelExcess: element.scrollWidth - element.clientWidth,
        contentExcess: content.scrollWidth - content.clientWidth,
        bodyExcess: body.scrollWidth - body.clientWidth,
        preRight: pre.getBoundingClientRect().right - rect.right,
        observationRight:
          observation.getBoundingClientRect().right - rect.right,
        codeExcess: pre.scrollWidth - pre.clientWidth,
        preOverflow: getComputedStyle(pre).overflowX,
      };
    });
    const evidence = testInfo.outputPath("expanded-output-geometry.json");
    await writeFile(evidence, JSON.stringify(geometry, null, 2));
    await testInfo.attach("expanded-output-geometry", {
      path: evidence,
      contentType: "application/json",
    });
    await page.screenshot({ path: testInfo.outputPath("expanded-output.png") });
    expect(geometry.panelExcess).toBe(0);
    expect(geometry.contentExcess).toBe(0);
    expect(geometry.bodyExcess).toBe(0);
    expect(geometry.preRight).toBeLessThanOrEqual(0);
    expect(geometry.observationRight).toBeLessThanOrEqual(0);
    expect(geometry.codeExcess).toBeGreaterThan(0);
    expect(geometry.preOverflow).toMatch(/^(auto|scroll)$/);
    await disclosure.locator("summary").focus();
    await page.keyboard.press("Tab");
    await expect(pre).toBeFocused();
    await expect(pre).toHaveAccessibleName("Code block");
    expect(
      await pre.evaluate((element) => {
        const style = getComputedStyle(element);
        return (
          style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0
        );
      }),
    ).toBe(true);
    // Let native scrolling start before keyup; WebKit ignores a zero-duration press.
    await page.keyboard.press("ArrowRight", { delay: 100 });
    await expect
      .poll(() => pre.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);
    await page.screenshot({
      path: testInfo.outputPath("keyboard-code-focus.png"),
    });
    await page.keyboard.press("Tab");
    await expect(
      panel.getByText("About this reply", { exact: true }),
    ).toBeFocused();
  });
}

function recordedMessage(
  role: AgentMessage["role"],
  text: string,
): AgentMessage {
  return { id: crypto.randomUUID(), role, text, at: new Date().toISOString() };
}

async function routeSyntheticDiscussion(
  page: import("@playwright/test").Page,
  reply: (
    conversation: LearningConversation,
    text: string,
  ) => LearningConversation,
) {
  await advertiseProvider(page);
  let conversation: LearningConversation;
  let reads = 0;
  await page.route(`${companionAddress}/agent/conversations`, async (route) => {
    const response = await route.fetch();
    if (route.request().method() === "POST")
      conversation = await response.json();
    await route.fulfill({ response });
  });
  await page.route(
    `${companionAddress}/agent/conversations/*`,
    async (route) => {
      if (route.request().method() === "POST")
        conversation = reply(conversation, route.request().postDataJSON().text);
      else reads += 1;
      if (conversation) await route.fulfill({ json: conversation });
      else await route.continue();
    },
  );
  return {
    reads: () => reads,
    update: (update: (value: LearningConversation) => LearningConversation) => {
      conversation = update(conversation);
    },
  };
}

async function connectSyntheticDiscussion(
  page: import("@playwright/test").Page,
) {
  await page.goto("/chapters/benchmarking/");
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Teaching assistant", exact: true })
    .click();
  const panel = activeLearningPanel(page);
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  return panel;
}

for (const width of [1440, 390]) {
  test(`browser evidence belongs to its reply and retains literal observations at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const observations = [
      '{"demoId":"synthetic-demo","visibleText":"Actual displayed value: 12"}',
      'Legacy result: {unclosed JSON\n<img src="https://example.org/evidence.png">\nComplete final line.',
    ];
    let requests = 0;
    await routeSyntheticDiscussion(page, (conversation, text) => ({
      ...conversation,
      state: "idle",
      messages: [
        ...conversation.messages,
        recordedMessage("student", text),
        ...(requests++ === 0
          ? observations.map((text) => recordedMessage("observation", text))
          : []),
        recordedMessage(
          "agent",
          requests === 1
            ? "This is an interpretation of the recorded results."
            : "This later explanation did not add a browser observation.",
        ),
      ],
    }));
    const panel = await connectSyntheticDiscussion(page);
    await panel
      .getByLabel("Message to the teaching assistant")
      .fill("Explain the recorded results.");
    await panel
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    const firstReply = panel
      .locator("article.learning-note")
      .filter({
        has: page.getByRole("heading", {
          name: "Teaching assistant suggestion",
          exact: true,
        }),
      })
      .first();
    const evidence = firstReply.locator("details.learning-evidence");
    const summary = evidence.locator("summary");
    await expect(summary).toHaveText("View browser evidence (2 observations)");
    await expect(evidence).not.toHaveAttribute("open", "");
    await expect(firstReply.locator(".learning-reply")).toBeVisible();
    expect(
      await evidence.evaluate((element) =>
        Boolean(
          element.compareDocumentPosition(
            element.parentElement!.querySelector(".learning-reply")!,
          ) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      ),
    ).toBe(true);
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(evidence).toHaveAttribute("open", "");
    await expect(evidence.locator(".learning-evidence-output")).toHaveText(
      observations,
    );
    await expect(evidence).toContainText(/recorded|captured/i);
    await expect(evidence).toContainText(/interpretation|explanation/i);
    await expect(evidence.locator("img")).toHaveCount(0);
    expect(
      await summary.evaluate((element) => {
        const style = getComputedStyle(element);
        return (
          style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0
        );
      }),
    ).toBe(true);
    expect(
      (await new AxeBuilder({ page }).include(".learning-evidence").analyze())
        .violations,
    ).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath("reply-browser-evidence.png"),
    });
    await page.keyboard.press("Space");
    await expect(evidence).not.toHaveAttribute("open", "");
    await summary.click();
    await expect(evidence).toHaveAttribute("open", "");

    await panel
      .getByLabel("Message to the teaching assistant")
      .fill("Explain that without inspecting the browser again.");
    await panel
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    const replies = panel.locator("article.learning-note").filter({
      has: page.getByRole("heading", {
        name: "Teaching assistant suggestion",
        exact: true,
      }),
    });
    await expect(replies).toHaveCount(2);
    await expect(
      replies.nth(1).locator("details.learning-evidence"),
    ).toHaveCount(0);
    await expect(
      replies.first().locator(".learning-evidence-output"),
    ).toHaveText(observations);
    await expect(panel.locator("details.learning-evidence")).toHaveCount(1);
  });
}

test("browser evidence stays open and focused through polling and remains available without a reply", async ({
  page,
}, testInfo) => {
  const first = recordedMessage("observation", "First completed observation.");
  const second = recordedMessage(
    "observation",
    "Second completed observation.",
  );
  let turns = 0;
  const fixture = await routeSyntheticDiscussion(page, (conversation, text) => {
    turns += 1;
    return {
      ...conversation,
      state: turns === 1 ? "working" : turns === 2 ? "failed" : "idle",
      error:
        turns === 2 ? "The reply stopped after a completed observation." : null,
      messages: [
        ...conversation.messages,
        recordedMessage("student", text),
        turns === 1
          ? first
          : turns === 2
            ? recordedMessage(
                "observation",
                "Completed before the interrupted reply.",
              )
            : recordedMessage(
                "agent",
                "A new reply without a new observation.",
              ),
      ],
    };
  });
  const panel = await connectSyntheticDiscussion(page);
  await panel
    .getByLabel("Message to the teaching assistant")
    .fill("Inspect the demo.");
  await panel
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  const evidence = panel.locator("details.learning-evidence").first();
  const summary = evidence.locator("summary");
  await expect(summary).toHaveText("View browser evidence (1 observation)");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(evidence).toHaveAttribute("open", "");
  const before = fixture.reads();
  await expect.poll(fixture.reads).toBeGreaterThan(before);
  await expect(summary).toBeFocused();
  await expect(evidence).toHaveAttribute("open", "");

  fixture.update((value) => ({
    ...value,
    messages: [...value.messages, second],
  }));
  await expect(summary).toHaveText("View browser evidence (2 observations)");
  await expect(summary).toBeFocused();
  await expect(evidence).toHaveAttribute("open", "");
  await expect(evidence.locator(".learning-evidence-output")).toHaveText([
    first.text,
    second.text,
  ]);
  fixture.update((value) => ({
    ...value,
    state: "idle",
    messages: [
      ...value.messages,
      recordedMessage("agent", "Interpretation after both observations."),
    ],
  }));
  const reply = panel.locator("article.learning-note").filter({
    has: page.getByRole("heading", {
      name: "Teaching assistant suggestion",
      exact: true,
    }),
  });
  await expect(reply).toHaveCount(1);
  await expect(reply.locator("details.learning-evidence")).toHaveAttribute(
    "open",
    "",
  );
  await expect(
    reply.locator("details.learning-evidence > summary"),
  ).toBeFocused();

  await panel
    .getByLabel("Message to the teaching assistant")
    .fill("Inspect once more.");
  await panel
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  await expect(
    panel.getByText("The reply stopped after a completed observation.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(panel.locator("details.learning-evidence")).toHaveCount(2);
  const incompleteEvidence = panel.locator("details.learning-evidence").last();
  expect(
    await incompleteEvidence.evaluate((element) =>
      Boolean(element.closest("article")),
    ),
  ).toBe(false);
  await incompleteEvidence.locator("summary").click();
  await expect(
    incompleteEvidence.locator(".learning-evidence-output"),
  ).toHaveText("Completed before the interrupted reply.");
  await expect(reply.locator(".learning-evidence-output")).toHaveText([
    first.text,
    second.text,
  ]);
  await page.screenshot({
    path: testInfo.outputPath("interrupted-reply-evidence.png"),
  });

  await panel
    .getByLabel("Message to the teaching assistant")
    .fill("Start a new explanation without inspecting the demo.");
  await panel
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  await expect(reply).toHaveCount(2);
  await expect(reply.last().locator("details.learning-evidence")).toHaveCount(
    0,
  );
  await expect(panel.locator("details.learning-evidence")).toHaveCount(2);
  expect(
    await incompleteEvidence.evaluate((element) =>
      Boolean(element.closest("article")),
    ),
  ).toBe(false);
  await expect(
    incompleteEvidence.locator(".learning-evidence-output"),
  ).toHaveText("Completed before the interrupted reply.");
});

test("the conversation picker immediately follows new discussions and retains a reopened selection", async ({
  page,
}) => {
  await page.goto("/chapters/benchmarking/");
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Teaching assistant", exact: true })
    .click();
  const panel = activeLearningPanel(page);
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel.getByRole("button", { name: "Connect companion" }).click();
  await openAssistantSettings(panel);
  const picker = panel.getByLabel("Saved conversations", { exact: true });
  await expect(picker.getByRole("option")).toHaveCount(1);
  const start = async () => {
    const response = page.waitForResponse(
      (response) =>
        response.url() === `${companionAddress}/agent/conversations` &&
        response.request().method() === "POST",
    );
    await panel.getByRole("button", { name: "New conversation" }).click();
    return (await (await response).json()) as LearningConversation;
  };
  const first = await start();
  await expect(picker).toHaveValue(first.id);
  await expect(picker.getByRole("option", { selected: true })).toHaveText(
    /^\d.+ · How can we measure web applications and development workflows\?$/,
  );
  const second = await start();
  await expect(picker).toHaveValue(second.id);
  await expect(picker.getByRole("option")).toHaveCount(3);
  await picker.selectOption(first.id);
  await expect(picker).toHaveValue(first.id);
  await page.reload();
  await openAssistantSettings(panel);
  await expect(picker).toHaveValue(first.id);
  await expect(picker.getByRole("option")).toHaveCount(3);
  await panel
    .getByLabel("Investigation source")
    .selectOption({ label: "Tail latency simulator" });
  await expect(picker).toHaveValue("");
  const investigation = await start();
  await expect(picker).toHaveValue(investigation.id);
  await expect(picker.getByRole("option", { selected: true })).toContainText(
    " · Tail latency simulator",
  );
});

test("first connection offers guided provider setup without sending a model request", async ({
  page,
  baseURL,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    const target = new URL(request.url());
    if (
      target.hostname === "127.0.0.1" &&
      target.origin !== new URL(baseURL!).origin
    )
      requests.push(request.url());
  });
  await page.goto("/chapters/benchmarking/");
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Notebook", exact: true })
    .click();
  const panel = activeLearningPanel(page);
  await expect(
    panel.getByRole("heading", { name: "1. Choose your setup" }),
  ).toBeVisible();
  await expect(
    panel.getByText("Notebook only — private writing without a model account."),
  ).toBeVisible();
  await expect(
    panel.getByRole("link", { name: "Codex", exact: true }),
  ).toHaveAttribute("href", "/notebook/setup/#connect-your-agent");
  await expect(
    panel.getByRole("link", { name: "API key", exact: true }),
  ).toHaveAttribute("href", "/notebook/setup/#use-an-api-key");
  await expect(
    panel.locator(".learning-setup-choices li").filter({
      has: page.getByRole("link", { name: "API key", exact: true }),
    }),
  ).toContainText("OpenAI, Claude, Gemini, OpenRouter");
  await expect(
    panel.getByRole("link", { name: "Local model", exact: true }),
  ).toHaveAttribute("href", "/notebook/setup/#use-a-local-model");
  await expect(
    panel.getByText(
      "Enter API keys only in the terminal. API usage is billed by your provider.",
    ),
  ).toBeVisible();
  const setup = `npx --yes @scalableweb/companion@0.4.0 setup --origin '${new URL(baseURL!).origin}'`;
  await expect(
    panel.locator("code").filter({ hasText: " setup --origin " }),
  ).toHaveText(setup);
  await expect(
    panel.locator("code").filter({ hasText: " start --origin " }),
  ).toHaveText(
    `npx --yes @scalableweb/companion@0.4.0 start --origin '${new URL(baseURL!).origin}'`,
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Clipboard unavailable");
        },
      },
    });
  });
  await panel
    .getByRole("button", { name: "Copy setup command", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText(
    "The command is selected",
  );
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(
    setup,
  );
  await expect(panel.locator('input[type="password"]')).toHaveCount(0);
  expect(requests).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  const bounds = await panel.boundingBox();
  expect(bounds!.width).toBeLessThanOrEqual(390);
  expect(
    await panel
      .locator(".learning-content")
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).include(".learning-workspace").analyze())
      .violations,
  ).toEqual([]);
});

test("notebook-only connections explain setup before sending and retain the question", async ({
  page,
  baseURL,
}) => {
  await page.route(`${companionAddress}/status`, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      json: {
        ...(await response.json()),
        storage: "/private/tmp/synthetic learner's notebook",
      },
    });
  });
  const posts: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().includes("/agent/conversations/")
    )
      posts.push(request.url());
  });
  await page.goto("/chapters/benchmarking/");
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Notebook", exact: true })
    .click();
  const panel = activeLearningPanel(page);
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await chooseNotebookTool(panel, "Discuss");
  await panel
    .getByLabel("Message to the teaching assistant")
    .fill("Keep my question while I enable a provider.");
  await expect(
    panel.getByRole("button", { name: "Send message", exact: true }),
  ).toBeDisabled();
  await expect(
    panel.getByRole("region", { name: "Assistant provider" }),
  ).toContainText("Notebook-only connection");
  await panel.getByRole("button", { name: "Set up assistant replies" }).click();
  await expect(
    panel.getByRole("heading", { name: "Enable assistant replies" }),
  ).toBeVisible();
  for (const action of ["setup", "start"]) {
    await expect(
      panel.locator("code").filter({ hasText: ` ${action} --origin ` }),
    ).toHaveText(
      `npx --yes @scalableweb/companion@0.4.0 ${action} --origin '${new URL(baseURL!).origin}' --port 18888 --directory '/private/tmp/synthetic learner'\\''s notebook'`,
    );
  }
  await expect(
    panel.getByRole("button", { name: "Copy setup command", exact: true }),
  ).toBeVisible();
  await expect(
    panel.getByRole("link", { name: "API key", exact: true }),
  ).toHaveAttribute("href", "/notebook/setup/#use-an-api-key");
  await advertiseProvider(page);
  await panel
    .getByRole("button", { name: "Check connection", exact: true })
    .click();
  await chooseNotebookTool(panel, "Discuss");
  await expect(
    panel.getByLabel("Message to the teaching assistant"),
  ).toHaveValue("Keep my question while I enable a provider.");
  await expect(
    panel.getByRole("region", { name: "Assistant provider" }),
  ).toContainText("Synthetic enabled");
  await expect(
    panel.getByRole("button", { name: "Send message", exact: true }),
  ).toBeEnabled();
  expect(posts).toEqual([]);
});

test("editing or revisiting a saved note protects unfinished writing and clears old save status", async ({
  page,
}) => {
  await page.goto("/chapters/benchmarking/");
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Notebook", exact: true })
    .click();
  const panel = activeLearningPanel(page);
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await panel
    .getByLabel("Title", { exact: true })
    .fill("Synthetic protected note");
  await panel
    .getByLabel("Your thinking")
    .fill("My saved original explanation.");
  await panel.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(panel.getByRole("status")).toContainText(
    "Saved in your private notebook",
  );
  await chooseNotebookTool(panel, "Notes");
  const note = panel.locator("article").filter({
    has: page.getByRole("heading", {
      name: "Synthetic protected note",
      exact: true,
    }),
  });
  await note.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(panel.locator('[role="status"]')).toBeEmpty();
  await panel
    .getByLabel("Your thinking")
    .fill("Keep this unfinished revision.");
  for (const action of ["Edit", "Revisit"]) {
    await chooseNotebookTool(panel, "Notes");
    page.once("dialog", (dialog) => dialog.dismiss());
    await note.getByRole("button", { name: action, exact: true }).click();
    await chooseNotebookTool(panel, "Write");
    await expect(panel.getByLabel("Your thinking")).toHaveValue(
      "Keep this unfinished revision.",
    );
    await page.reload();
    await expect(panel.getByLabel("Your thinking")).toHaveValue(
      "Keep this unfinished revision.",
    );
  }
  await chooseNotebookTool(panel, "Notes");
  page.once("dialog", (dialog) => dialog.accept());
  await note.getByRole("button", { name: "Revisit", exact: true }).click();
  await expect(panel.getByLabel("Your thinking")).toHaveValue("");
  await panel.getByLabel("Your thinking").fill("Another unfinished revisit.");
  await chooseNotebookTool(panel, "Notes");
  page.once("dialog", (dialog) => dialog.accept());
  await note.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(panel.getByLabel("Your thinking")).toHaveValue(
    "My saved original explanation.",
  );
  await expect(panel.locator('[role="status"]')).toBeEmpty();
});

test("independent learning launchers support keyboard return, closing and chapter continuity", async ({
  page,
}) => {
  await page.goto("/chapters/introduction/");
  const tools = page.getByRole("group", {
    name: "Learning tools",
    exact: true,
  });
  const notebook = tools.getByRole("button", { name: "Notebook", exact: true });
  const assistant = tools.getByRole("button", {
    name: "Teaching assistant",
    exact: true,
  });
  const panel = activeLearningPanel(page);
  await expect(notebook).toHaveAttribute("aria-expanded", "false");
  await expect(assistant).toHaveAttribute("aria-expanded", "false");
  await notebook.focus();
  await page.keyboard.press("Enter");
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("aria-label", "My learning notebook");
  await expect(notebook).toHaveAttribute("aria-expanded", "true");
  await panel.getByRole("button", { name: "Close notebook" }).focus();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(notebook).toBeFocused();
  await expect(notebook).toHaveAttribute("aria-expanded", "false");
  await notebook.click();
  await assistant.click();
  await expect(panel).toHaveAttribute("aria-label", "Teaching assistant");
  await expect(notebook).toHaveAttribute("aria-expanded", "true");
  await expect(assistant).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#learning-notebook")).toBeVisible();
  await expect(page.locator("#learning-assistant")).toBeVisible();
  await expect(page.locator(".learning-experiences")).toHaveCount(0);
  await assistant.click();
  await expect(page.locator("#learning-assistant")).toBeHidden();
  await expect(page.locator("#learning-notebook")).toBeVisible();
  await expect(assistant).toHaveAttribute("aria-expanded", "false");
  await assistant.click();
  await page.locator('a[href="/chapters/architecture/"]').first().click();
  await expect(panel).toBeVisible();
  await expect(page.locator("#learning-notebook")).toBeVisible();
  await expect(assistant).toHaveAttribute("aria-expanded", "true");
  await panel.getByRole("button", { name: "Close teaching assistant" }).click();
  await expect(assistant).toBeFocused();
  await expect(assistant).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#learning-notebook")).toBeVisible();
});

test("concurrent panels retain independent context and drafts across reload, resizing and closing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/chapters/introduction/");
  const launchers = page.getByRole("group", { name: "Learning tools" });
  const notebookLauncher = launchers.getByRole("button", {
    name: "Notebook",
    exact: true,
  });
  const assistantLauncher = launchers.getByRole("button", {
    name: "Teaching assistant",
    exact: true,
  });
  const notebook = page.locator("#learning-notebook");
  const assistant = page.locator("#learning-assistant");
  await notebookLauncher.click();
  await notebook.getByLabel("Companion address").fill(companionAddress);
  await notebook
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await assistantLauncher.click();
  await assistant
    .getByLabel("Message to the teaching assistant")
    .fill("My unsent independent question.");
  await notebook
    .getByLabel("Title", { exact: true })
    .fill("Synthetic concurrent note");
  await notebook
    .getByLabel("Your thinking")
    .fill("My independently saved notebook thinking.");
  await notebook
    .getByRole("button", { name: "Save note", exact: true })
    .click();
  await expect(notebook.getByRole("status")).toHaveText(
    "Saved in your private notebook.",
  );
  await expect(
    assistant.getByLabel("Message to the teaching assistant"),
  ).toHaveValue("My unsent independent question.");
  await chooseNotebookTool(notebook, "Notes");
  await notebook.getByLabel("Select Synthetic concurrent note").check();
  await expect(
    assistant.getByText("0 notebook notes selected for context", {
      exact: true,
    }),
  ).toBeVisible();
  await chooseNotebookTool(notebook, "Write");
  await notebook
    .getByLabel("Your thinking")
    .fill("My unsaved notebook revision.");
  const notebookBounds = (await notebook.boundingBox())!;
  const assistantBounds = (await assistant.boundingBox())!;
  expect(notebookBounds.y + notebookBounds.height).toBeLessThan(
    assistantBounds.y,
  );
  expect(assistantBounds.x + assistantBounds.width).toBe(1904);
  expect(assistantBounds.y + assistantBounds.height).toBe(1064);
  expect(
    (await new AxeBuilder({ page }).include(".learning-workspace").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("concurrent-panels.png"),
  });
  await page.reload();
  await expect(notebook.getByLabel("Your thinking")).toHaveValue(
    "My unsaved notebook revision.",
  );
  await expect(
    assistant.getByLabel("Message to the teaching assistant"),
  ).toHaveValue("My unsent independent question.");
  await expect(notebookLauncher).toHaveAttribute("aria-expanded", "true");
  await expect(assistantLauncher).toHaveAttribute("aria-expanded", "true");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(notebook).toBeVisible();
  await expect(assistant).toBeHidden();
  await assistantLauncher.click();
  await expect(assistant).toBeVisible();
  await expect(notebook).toBeHidden();
  await expect(
    assistant.getByLabel("Message to the teaching assistant"),
  ).toHaveValue("My unsent independent question.");
  await assistant
    .getByRole("button", { name: "Close teaching assistant" })
    .click();
  await expect(assistant).toBeHidden();
  await expect(notebook).toBeVisible();
  await expect(notebook.getByLabel("Your thinking")).toHaveValue(
    "My unsaved notebook revision.",
  );
  await expect(assistantLauncher).toBeFocused();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await assistantLauncher.click();
  await expect(assistant).toBeVisible();
  await expect(
    assistant.getByLabel("Message to the teaching assistant"),
  ).toHaveValue("My unsent independent question.");
  await notebook.getByRole("button", { name: "Close notebook" }).click();
  await expect(notebook).toBeHidden();
  await expect(assistant).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(assistant).toBeVisible();
  await expect(notebook).toBeHidden();
});

test("Notebook size responds to keyboard and pointer controls without moving the book or assistant", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await advertiseProvider(page);
  await page.goto("/chapters/benchmarking/");
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.site-header [data-learning-toggle="notebook"]').click();
  const notebook = page.locator("#learning-notebook");
  await notebook.getByLabel("Companion address").fill(companionAddress);
  await notebook
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await expect(notebook.getByRole("status")).toContainText("Connected");
  const automatic = (await notebook.boundingBox())!;
  const bookGeometry = () =>
    page.evaluate(() =>
      [
        ".book-shell",
        ".chapter-main",
        ".prose",
        ".prose > p:not(.chapter-kicker)",
        "[data-otel-trace-demo]",
      ].map((selector) => {
        const rect = document.querySelector(selector)!.getBoundingClientRect();
        return [rect.x + scrollX, rect.y + scrollY, rect.width, rect.height];
      }),
    );
  const originalBook = await bookGeometry();
  const expectUnchangedBook = async () => {
    await expect
      .poll(async () => {
        const current = await bookGeometry();
        return Math.max(
          ...current.flatMap((bounds, index) =>
            bounds.map((value, coordinate) =>
              Math.abs(value - originalBook[index]![coordinate]!),
            ),
          ),
        );
      })
      .toBeLessThan(1);
  };
  const size = await openNotebookSize(notebook);
  await size.width.focus();
  await page.keyboard.press("Home");
  await expect(size.width).toHaveValue((await size.width.getAttribute("min"))!);
  const narrowWidth = Number(await size.width.inputValue());
  expect(narrowWidth).toBeLessThan(automatic.width);
  await expectNotebookSize(notebook, narrowWidth, automatic.height);
  await page.keyboard.press("ArrowRight");
  await expect(size.width).toHaveValue(
    String(narrowWidth + Number(await size.width.getAttribute("step"))),
  );
  const keyboardWidth = Number(await size.width.inputValue());
  expect(keyboardWidth).toBeGreaterThan(narrowWidth);
  await expectNotebookSize(notebook, keyboardWidth, automatic.height);

  const sliderBounds = (await size.width.boundingBox())!;
  await size.width.click({
    position: { x: sliderBounds.width * 0.7, y: sliderBounds.height / 2 },
  });
  await expect
    .poll(async () => Number(await size.width.inputValue()))
    .toBeGreaterThan(keyboardWidth);
  const pointerWidth = Number(await size.width.inputValue());
  expect(pointerWidth).toBeGreaterThan(keyboardWidth);
  await expectNotebookSize(notebook, pointerWidth, automatic.height);
  await size.height.focus();
  await page.keyboard.press("Home");
  await expect(size.height).toHaveValue(
    (await size.height.getAttribute("min"))!,
  );
  const shortHeight = Number(await size.height.inputValue());
  expect(shortHeight).toBeLessThan(automatic.height);
  await expectNotebookSize(notebook, pointerWidth, shortHeight);
  await page.keyboard.press("End");
  await expect(size.height).toHaveValue(
    (await size.height.getAttribute("max"))!,
  );
  await expectNotebookSize(
    notebook,
    pointerWidth,
    Number(await size.height.inputValue()),
  );
  await expectUnchangedBook();
  await size.reset.click();
  await expectNotebookSize(notebook, automatic.width, automatic.height);

  await page.locator('.site-header [data-learning-toggle="assistant"]').click();
  const assistant = page.locator("#learning-assistant");
  await expect(assistant).toBeVisible();
  const assistantBefore = (await assistant.boundingBox())!;
  const stackedAutomatic = (await notebook.boundingBox())!;
  const stackedSize = await openNotebookSize(notebook);
  await stackedSize.width.focus();
  await page.keyboard.press("Home");
  await expect(stackedSize.width).toHaveValue(
    (await stackedSize.width.getAttribute("min"))!,
  );
  await stackedSize.height.focus();
  await page.keyboard.press("Home");
  await expect(stackedSize.height).toHaveValue(
    (await stackedSize.height.getAttribute("min"))!,
  );
  await expectNotebookSize(
    notebook,
    Number(await stackedSize.width.inputValue()),
    Number(await stackedSize.height.inputValue()),
  );
  const resized = (await notebook.boundingBox())!;
  expect(resized.x).toBeGreaterThanOrEqual(0);
  expect(resized.y).toBeGreaterThanOrEqual(0);
  expect(resized.x + resized.width).toBeLessThanOrEqual(1440);
  expect(resized.y + resized.height).toBeLessThan(assistantBefore.y);
  const assistantAfter = (await assistant.boundingBox())!;
  for (const coordinate of ["x", "y", "width", "height"] as const)
    expect(
      Math.abs(assistantAfter[coordinate] - assistantBefore[coordinate]),
    ).toBeLessThan(1);
  await expectUnchangedBook();
  expect(
    (await new AxeBuilder({ page }).include("#learning-notebook").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("notebook-size-controls.png"),
  });
  await stackedSize.reset.focus();
  await page.keyboard.press("Enter");
  await expectNotebookSize(
    notebook,
    stackedAutomatic.width,
    stackedAutomatic.height,
  );
  await assistant
    .getByRole("button", { name: "Close teaching assistant" })
    .click();
  await expectNotebookSize(notebook, automatic.width, automatic.height);
  await expectUnchangedBook();
  const restoredSize = await openNotebookSize(notebook);
  await restoredSize.width.focus();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    notebook.getByLabel("Notebook size", { exact: true }),
  ).toBeHidden();
  await expect(
    notebook.getByRole("button", { name: "Close notebook" }),
  ).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expectNotebookSize(notebook, automatic.width, automatic.height);
});

test("Notebook size preferences survive clamping, navigation and reload with independent unsent drafts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await advertiseProvider(page);
  await page.goto("/chapters/benchmarking/");
  const notebookLauncher = page.locator(
    '.site-header [data-learning-toggle="notebook"]',
  );
  const assistantLauncher = page.locator(
    '.site-header [data-learning-toggle="assistant"]',
  );
  await notebookLauncher.click();
  const notebook = page.locator("#learning-notebook");
  const assistant = page.locator("#learning-assistant");
  await notebook.getByLabel("Companion address").fill(companionAddress);
  await notebook
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await expect(notebook.getByRole("status")).toContainText("Connected");
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (
      request.url().startsWith(companionAddress) &&
      !["GET", "OPTIONS"].includes(request.method())
    )
      mutations.push(`${request.method()} ${request.url()}`);
  });
  const thinking =
    "My unsaved explanation keeps accepted events separate from response timing.";
  const question =
    "My unsent question asks which observation establishes durability.";
  await notebook
    .getByLabel("Title", { exact: true })
    .fill("Synthetic size continuity");
  await notebook.getByLabel("Your thinking", { exact: true }).fill(thinking);
  const originalSource = await notebook
    .getByRole("region", { name: "Note context", exact: true })
    .getByRole("link")
    .getAttribute("href");
  const size = await openNotebookSize(notebook);
  for (const range of [size.width, size.height]) {
    await range.focus();
    await page.keyboard.press("End");
    const maximum = Number(await range.getAttribute("max"));
    await expect(range).toHaveValue(String(maximum));
    await page.keyboard.press("ArrowLeft");
    await expect(range).toHaveValue(
      String(maximum - Number(await range.getAttribute("step"))),
    );
  }
  const preferredWidth = Number(await size.width.inputValue());
  const preferredHeight = Number(await size.height.inputValue());
  await expectNotebookSize(notebook, preferredWidth, preferredHeight);
  await assistantLauncher.click();
  await assistant
    .getByLabel("Message to the teaching assistant")
    .fill(question);
  const assistantSource = await assistant
    .getByRole("region", { name: "Assistant context", exact: true })
    .getByRole("link")
    .getAttribute("href");
  const firstClamped = (await notebook.boundingBox())!;
  expect(firstClamped.height).toBeLessThan(preferredHeight);
  expect(firstClamped.width).toBe(preferredWidth);
  await assistant
    .getByRole("button", { name: "Close teaching assistant" })
    .click();
  await expectNotebookSize(notebook, preferredWidth, preferredHeight);
  await chooseNotebookTool(notebook, "Notes");
  await chooseNotebookTool(notebook, "Write");
  await expect(
    notebook.getByLabel("Your thinking", { exact: true }),
  ).toHaveValue(thinking);
  await expectNotebookSize(notebook, preferredWidth, preferredHeight);
  await page.locator('a[href="/chapters/architecture/"]').first().click();
  await expect(
    notebook.getByLabel("Your thinking", { exact: true }),
  ).toHaveValue(thinking);
  await expectNotebookSize(notebook, preferredWidth, preferredHeight);
  await page.reload();
  await expect(
    notebook.getByLabel("Your thinking", { exact: true }),
  ).toHaveValue(thinking);
  await expectNotebookSize(notebook, preferredWidth, preferredHeight);
  await expect(
    notebook
      .getByRole("region", { name: "Note context", exact: true })
      .getByRole("link"),
  ).toHaveAttribute("href", originalSource!);
  await assistantLauncher.click();
  await expect(
    assistant.getByLabel("Message to the teaching assistant"),
  ).toHaveValue(question);
  await expect(
    assistant
      .getByRole("region", { name: "Assistant context", exact: true })
      .getByRole("link"),
  ).toHaveAttribute("href", assistantSource!);
  await expectNotebookSize(notebook, preferredWidth, firstClamped.height);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(assistant).toBeVisible();
  await expect(notebook).toBeHidden();
  await notebookLauncher.click();
  await expect(notebook).toBeVisible();
  await expect(assistant).toBeHidden();
  await expectNotebookSize(notebook, 390, 844 * 0.8);
  await expect(
    notebook.getByLabel("Notebook size", { exact: true }),
  ).toBeHidden();
  await expect(
    notebook.getByLabel("Your thinking", { exact: true }),
  ).toHaveValue(thinking);
  await page.screenshot({
    path: test.info().outputPath("notebook-size-mobile-fallback.png"),
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(assistant).toBeVisible();
  await expectNotebookSize(notebook, preferredWidth, firstClamped.height);
  const stacked = (await notebook.boundingBox())!;
  const assistantBounds = (await assistant.boundingBox())!;
  expect(stacked.y + stacked.height).toBeLessThan(assistantBounds.y);
  await assistant
    .getByRole("button", { name: "Close teaching assistant" })
    .click();
  await expectNotebookSize(notebook, preferredWidth, preferredHeight);
  await expect(
    notebook.getByLabel("Your thinking", { exact: true }),
  ).toHaveValue(thinking);
  await notebook.getByRole("button", { name: "Close notebook" }).click();
  await notebookLauncher.click();
  await expectNotebookSize(notebook, preferredWidth, preferredHeight);
  await expect(
    notebook.getByLabel("Your thinking", { exact: true }),
  ).toHaveValue(thinking);
  expect(mutations).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("notebook-size-restored.png"),
  });
});

test("notebook and assistant retain separate drafts and use reviewed source-linked handoffs", async ({
  page,
}) => {
  await advertiseProvider(page);
  const writes: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().startsWith(companionAddress)
    )
      writes.push(request.url());
  });
  await page.goto("/chapters/introduction/");
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Notebook", exact: true })
    .click();
  const panel = activeLearningPanel(page);
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await panel
    .getByLabel("Your thinking")
    .fill("My unfinished private notebook thought.");
  const baseline = writes.length;
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Teaching assistant", exact: true })
    .click();
  await expect(panel).toHaveAttribute("aria-label", "Teaching assistant");
  await expect(
    panel.getByRole("button", { name: "Write", exact: true }),
  ).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Notes", exact: true }),
  ).toHaveCount(0);
  await openAssistantSettings(panel);
  await panel.getByLabel("How I want help").selectOption("explanation");
  await panel.getByLabel("My learning goal").fill("Understand the trade-off");
  await panel
    .getByLabel("Message to the teaching assistant")
    .fill("My unfinished question about this introduction.");
  const originalSource = await panel
    .getByRole("region", { name: "Assistant context" })
    .getByRole("link")
    .first()
    .getAttribute("href");
  await page.locator('a[href="/chapters/architecture/"]').first().click();
  await expect(panel).toHaveAttribute("aria-label", "Teaching assistant");
  await expect(
    panel.getByLabel("Message to the teaching assistant"),
  ).toHaveValue("My unfinished question about this introduction.");
  await expect(panel.getByLabel("My learning goal")).toHaveValue(
    "Understand the trade-off",
  );
  await expect(panel.getByLabel("How I want help")).toHaveValue("explanation");
  await expect(
    panel
      .getByRole("region", { name: "Assistant context" })
      .getByRole("link")
      .first(),
  ).toHaveAttribute("href", originalSource!);
  await expect(
    panel.getByRole("button", { name: "Discuss the current reading" }),
  ).toBeVisible();
  await chooseNotebookTool(panel, "Write");
  await expect(panel).toHaveAttribute("aria-label", "My learning notebook");
  await expect(panel.getByLabel("Your thinking")).toHaveValue(
    "My unfinished private notebook thought.",
  );
  await expect(
    panel.getByRole("button", { name: "Chapter guide", exact: true }),
  ).toHaveCount(0);
  expect(writes.length).toBe(baseline);
  await panel
    .getByLabel("Title", { exact: true })
    .fill("Chosen notebook thought");
  const savedResponse = page.waitForResponse(
    (response) =>
      response.url() === `${companionAddress}/entries` &&
      response.request().method() === "POST",
  );
  await panel.getByRole("button", { name: "Save note", exact: true }).click();
  const chosen = await (await savedResponse).json();
  await expect(panel.getByRole("status")).toContainText(
    "Saved in your private notebook",
  );
  await panel.getByRole("button", { name: "New note", exact: true }).click();
  await panel
    .getByLabel("Title", { exact: true })
    .fill("Unselected notebook thought");
  await panel
    .getByLabel("Your thinking")
    .fill("PRIVATE UNSELECTED NOTE MATERIAL");
  await panel.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(panel.getByRole("status")).toContainText(
    "Saved in your private notebook",
  );
  await chooseNotebookTool(panel, "Notes");
  await panel.getByLabel("Notes to show").selectOption("all");
  page.once("dialog", (dialog) => dialog.accept());
  await panel
    .locator("article")
    .filter({
      has: page.getByRole("heading", {
        name: "Chosen notebook thought",
        exact: true,
      }),
    })
    .getByRole("button", { name: "Discuss this note" })
    .click();
  await expect(panel).toHaveAttribute("aria-label", "Teaching assistant");
  await panel
    .getByText("1 notebook notes selected for context", { exact: true })
    .click();
  await expect(panel.getByLabel("Selected notebook context")).toContainText(
    "Chosen notebook thought",
  );
  await expect(panel.getByLabel("Selected notebook context")).not.toContainText(
    "PRIVATE UNSELECTED NOTE MATERIAL",
  );
  await expect(
    panel.getByLabel("Message to the teaching assistant"),
  ).toHaveValue("");
  await page.screenshot({
    path: test.info().outputPath("assistant-context.png"),
  });
  let synthetic: LearningConversation | null = null;
  const supplied: { noteIds: string[]; text: string }[] = [];
  await page.route(
    `${companionAddress}/agent/conversations/*`,
    async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        supplied.push(request.postDataJSON());
        synthetic = {
          id: new URL(request.url()).pathname.split("/").pop()!,
          title: chosen.source.title,
          source: chosen.source,
          threadId: null,
          state: "idle",
          error: null,
          updatedAt: new Date().toISOString(),
          messages: [
            {
              id: "c0000000-0000-4000-8000-000000000001",
              role: "student",
              text: supplied[0]!.text,
              noteIds: supplied[0]!.noteIds,
              at: new Date().toISOString(),
            },
            {
              id: "c0000000-0000-4000-8000-000000000002",
              role: "agent",
              text: String.raw`Synthetic suggestion for a **reviewed** notebook draft.

[Source chapter](/chapters/benchmarking/) and [external source](https://example.org/).

| Quantity | Value |
| --- | --- |
| Work | 10 |

Inline \(L = \lambda W\) and $L$.

\[L = 20 \times 0.5 = 10\]

\(\unknowncommand{fallback}\)

<img src="https://example.org/tracker" onerror="alert(1)">
<iframe src="https://example.org/"></iframe>
[unsafe](javascript:alert%281%29)
![Image description](https://example.org/image.png)

~~~html
<script>alert(1)</script>
\(literal code\)
~~~`,
              at: new Date().toISOString(),
              teaching: {
                policy: {
                  id: "scalableweb-study-assistant",
                  version: "1",
                  name: "Teaching assistant",
                },
                provider: { name: "Synthetic", version: "test-version" },
              },
            },
          ],
        };
      }
      if (synthetic) await route.fulfill({ json: synthetic });
      else await route.continue();
    },
  );
  await panel
    .getByLabel("Message to the teaching assistant")
    .fill("Discuss only my chosen note.");
  await panel
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  await expect(panel.locator(".learning-messages")).toContainText(
    "Synthetic suggestion",
  );
  await expect(panel.getByLabel("Saved conversations")).toHaveValue(
    synthetic!.id,
  );
  const reply = panel.locator(".learning-reply");
  await expect(reply.locator("strong")).toHaveText("reviewed");
  await expect(
    reply.getByRole("link", { name: "Source chapter" }),
  ).toHaveAttribute("href", /\/chapters\/benchmarking\/$/);
  await expect(
    reply.getByRole("link", { name: "external source" }),
  ).toHaveAttribute("rel", "noopener noreferrer");
  await expect(reply.getByRole("table")).toContainText("Work");
  await expect(reply.locator("math")).toHaveCount(3);
  await expect(reply.locator(".learning-math code")).toContainText(
    "unknowncommand",
  );
  await expect(reply.locator("pre code")).toContainText(
    String.raw`\(literal code\)`,
  );
  await expect(
    reply.locator("img, iframe, script, a[href^='javascript:']"),
  ).toHaveCount(0);
  await expect(reply).toContainText('onerror="alert(1)"');
  await expect(reply).toContainText("Image description");
  expect(supplied[0]!.noteIds).toEqual([chosen.id]);
  await panel.getByText("About this reply", { exact: true }).click();
  await expect(
    panel.getByText(/policy scalableweb-study-assistant v1/),
  ).toBeVisible();
  // An earlier reply must not acquire today's policy on a resumed conversation.
  delete synthetic!.messages[1]!.teaching;
  await page.reload();
  await expect(panel.locator(".learning-messages")).toContainText(
    "Synthetic suggestion",
  );
  await panel.getByText("About this reply", { exact: true }).click();
  await expect(
    panel.getByText(
      "Teaching policy and provider version were not recorded for this earlier reply.",
    ),
  ).toBeVisible();
  expect(await panel.locator(".learning-messages").innerText()).not.toContain(
    "scalableweb-study-assistant",
  );
  synthetic!.messages[1]!.teaching = {
    policy: {
      id: "scalableweb-study-assistant",
      version: "1",
      name: "Teaching assistant",
    },
    provider: { name: "Synthetic", version: "test-version" },
  };
  await expect(
    panel
      .getByRole("region", { name: "Assistant context" })
      .getByRole("link")
      .first(),
  ).toHaveAttribute("href", originalSource!);
  await chooseNotebookTool(panel, "Write");
  await panel.getByRole("button", { name: "New note", exact: true }).click();
  await panel
    .getByLabel("Your thinking")
    .fill("Keep this separate unfinished note.");
  await chooseNotebookTool(panel, "Discuss");
  await expect(panel.locator(".learning-messages")).toContainText(
    "Synthetic suggestion",
  );
  await panel.getByRole("button", { name: "Use as a notebook draft" }).click();
  const preview = panel.getByRole("region", { name: "Notebook draft preview" });
  await expect(preview).toBeVisible();
  await expect(
    preview.getByLabel("Your question or response", { exact: true }),
  ).toHaveValue(supplied[0]!.text);
  page.once("dialog", (dialog) => dialog.dismiss());
  await preview
    .getByRole("button", { name: "Prepare notebook draft", exact: true })
    .click();
  await expect(preview).toBeVisible();
  await expect(panel).toHaveAttribute("aria-label", "Teaching assistant");
  await preview
    .getByRole("button", { name: "Close draft preview", exact: true })
    .click();
  await chooseNotebookTool(panel, "Write");
  await expect(panel.getByLabel("Your thinking")).toHaveValue(
    "Keep this separate unfinished note.",
  );
  await chooseNotebookTool(panel, "Discuss");
  page.once("dialog", (dialog) => dialog.accept());
  await panel.getByRole("button", { name: "Write a takeaway" }).click();
  await expect(panel).toHaveAttribute("aria-label", "My learning notebook");
  await expect(panel.getByLabel("Your thinking")).toHaveValue("");
  await page.screenshot({
    path: test.info().outputPath("notebook-takeaway.png"),
  });
  await panel
    .getByLabel("Your thinking")
    .fill("My own reviewed explanation, rather than the transcript.");
  const takeawayResponse = page.waitForResponse(
    (response) =>
      response.url() === `${companionAddress}/entries` &&
      response.request().method() === "POST",
  );
  await panel.getByRole("button", { name: "Save note", exact: true }).click();
  const takeaway = await (await takeawayResponse).json();
  expect(takeaway.source).toEqual(chosen.source);
  expect(takeaway.relatedIds).toEqual([chosen.id]);
  expect(takeaway.history[0].assistance).toContain(
    "Student-written takeaway after discussion",
  );
  expect(takeaway.history[0].assistance).toContain(
    "policy scalableweb-study-assistant v1",
  );
  await chooseNotebookTool(panel, "Connect");
  const download = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Export notebook backup" }).click();
  const exported = await download;
  const archive = JSON.parse(
    await (
      await import("node:fs/promises")
    ).readFile((await exported.path())!, "utf8"),
  );
  expect(
    archive.entries.find((entry: { id: string }) => entry.id === takeaway.id),
  ).toMatchObject({
    source: chosen.source,
    relatedIds: [chosen.id],
    body: "My own reviewed explanation, rather than the transcript.",
  });
});

for (const width of [1440, 390]) {
  test(`notebook draft preview keeps the selected exchange and reviewed writing at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const contextNotes: NotebookEntry[] = [];
    const thinking = recordedMessage(
      "student",
      "My first question: does a timeout prove that nothing was written?\nI predict that the outcome may be unknown.",
    );
    const suggestion = recordedMessage(
      "agent",
      String.raw`First suggestion: retain the **uncertainty**.\n\n<script>literal source, not executable</script>\n\n~~~text\ncheck the original event ID\n~~~`,
    );
    suggestion.teaching = {
      policy: {
        id: "synthetic-recorded-policy",
        version: "7",
        name: "Recorded teaching policy",
      },
      provider: { name: "Synthetic", version: "recorded-version" },
    };
    const secondThinking = recordedMessage(
      "student",
      "My later response concerns a different retry.",
    );
    const secondSuggestion = recordedMessage(
      "agent",
      "Second suggestion belongs only to the later retry.",
    );
    const observation = recordedMessage(
      "observation",
      "OBSERVATION MUST NOT BECOME NOTE TEXT",
    );
    const fixture = await routeSyntheticDiscussion(page, (conversation) => ({
      ...conversation,
      source: contextNotes[0]!.source,
      state: "working",
      messages: [
        { ...thinking, noteIds: [contextNotes[0]!.id] },
        observation,
        suggestion,
        { ...secondThinking, noteIds: [contextNotes[1]!.id] },
        secondSuggestion,
      ],
    }));
    const writes: string[] = [];
    page.on("request", (request) => {
      if (
        request.url().startsWith(companionAddress) &&
        !["GET", "OPTIONS"].includes(request.method())
      )
        writes.push(request.url());
    });
    const panel = await connectSyntheticDiscussion(page);
    await expect(panel.getByRole("status")).toContainText("Connected");
    await chooseNotebookTool(panel, "Write");
    await selectReading(page);
    await panel
      .getByRole("button", { name: "Use selected text", exact: true })
      .click();
    for (const [title, body] of [
      [
        "First turn context",
        "My initial prediction for the selected exchange.",
      ],
      ["Other turn context", "PRIVATE OTHER TURN NOTE"],
    ]) {
      if (contextNotes.length)
        await panel
          .getByRole("button", { name: "New note", exact: true })
          .click();
      await panel.getByLabel("Title", { exact: true }).fill(title!);
      await panel.getByLabel("Your thinking", { exact: true }).fill(body!);
      const saved = page.waitForResponse(
        (response) =>
          response.url() === `${companionAddress}/entries` &&
          response.request().method() === "POST",
      );
      await panel
        .getByRole("button", { name: "Save note", exact: true })
        .click();
      contextNotes.push(await (await saved).json());
    }
    expect(contextNotes[0]!.source.excerpt).not.toBe("");
    await panel.getByRole("button", { name: "New note", exact: true }).click();
    await panel
      .getByLabel("Your thinking", { exact: true })
      .fill("Keep my separate unfinished writing.");
    await chooseNotebookTool(panel, "Discuss");
    await panel
      .getByLabel("Message to the teaching assistant")
      .fill("Open the synthetic two-exchange discussion.");
    await panel
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    const replies = panel.locator("article.learning-note").filter({
      has: page.getByRole("heading", {
        name: "Teaching assistant suggestion",
        exact: true,
      }),
    });
    await expect(replies).toHaveCount(2);
    const before = writes.length;
    await replies
      .first()
      .getByRole("button", { name: "Use as a notebook draft", exact: true })
      .click();
    const preview = panel.getByRole("region", {
      name: "Notebook draft preview",
      exact: true,
    });
    const ownText = preview.getByLabel("Your question or response", {
      exact: true,
    });
    const assistantText = preview.getByLabel("Assistant suggestion to review", {
      exact: true,
    });
    await expect(preview).toBeVisible();
    await expect(ownText).toHaveValue(thinking.text);
    await expect(assistantText).toHaveValue(suggestion.text);
    await expect(
      preview.getByRole("checkbox", {
        name: "Include your thinking",
        exact: true,
      }),
    ).toBeChecked();
    await expect(
      preview.getByRole("checkbox", {
        name: "Include assistant suggestion",
        exact: true,
      }),
    ).toBeChecked();
    const sourceUrl = new URL(contextNotes[0]!.source.url);
    sourceUrl.hash = contextNotes[0]!.source.anchor;
    await expect(
      preview.getByRole("link", {
        name: contextNotes[0]!.source.title,
        exact: true,
      }),
    ).toHaveAttribute("href", sourceUrl.href);
    await expect(preview.locator("img, iframe, script")).toHaveCount(0);
    const revisedThinking =
      "My reviewed question still distinguishes failure from an unknown outcome.\nThis is my selected wording.";
    await ownText.fill(revisedThinking);
    await preview
      .getByRole("checkbox", {
        name: "Include assistant suggestion",
        exact: true,
      })
      .uncheck();
    await ownText.focus();
    const reads = fixture.reads();
    fixture.update((value) => ({
      ...value,
      state: "idle",
      messages: [
        ...value.messages,
        recordedMessage("student", "LATER POLLED QUESTION"),
        recordedMessage("agent", "LATER POLLED ANSWER"),
      ],
    }));
    await expect.poll(fixture.reads).toBeGreaterThan(reads);
    await expect(replies).toHaveCount(3);
    await expect(ownText).toBeFocused();
    await expect(ownText).toHaveValue(revisedThinking);
    await expect(assistantText).toHaveValue(suggestion.text);
    await expect(
      preview.getByRole("checkbox", {
        name: "Include assistant suggestion",
        exact: true,
      }),
    ).not.toBeChecked();
    await page.reload();
    await expect(preview).toBeVisible();
    await expect(ownText).toHaveValue(revisedThinking);
    await expect(assistantText).toHaveValue(suggestion.text);
    await expect(
      preview.getByRole("checkbox", {
        name: "Include assistant suggestion",
        exact: true,
      }),
    ).not.toBeChecked();
    await expect(
      preview.getByRole("link", {
        name: contextNotes[0]!.source.title,
        exact: true,
      }),
    ).toHaveAttribute("href", sourceUrl.href);
    const reviewedSuggestion = `${suggestion.text}\n\nOnly this selected suggestion is retained.`;
    await preview
      .getByRole("checkbox", {
        name: "Include assistant suggestion",
        exact: true,
      })
      .check();
    await assistantText.fill(reviewedSuggestion);
    page.once("dialog", (dialog) => dialog.dismiss());
    await preview
      .getByRole("button", { name: "Prepare notebook draft", exact: true })
      .click();
    await expect(preview).toBeVisible();
    await expect(ownText).toHaveValue(revisedThinking);
    await expect(
      page
        .locator("#learning-notebook")
        .getByLabel("Your thinking", { exact: true }),
    ).toHaveValue("Keep my separate unfinished writing.");
    expect(writes.length).toBe(before);
    page.once("dialog", (dialog) => dialog.accept());
    await preview
      .getByRole("button", { name: "Prepare notebook draft", exact: true })
      .click();
    const expectedBody = `Your question or response:\n\n${revisedThinking}\n\nTeaching assistant suggestion:\n\n${reviewedSuggestion}`;
    await expect(
      panel.getByLabel("Your thinking", { exact: true }),
    ).toHaveValue(expectedBody);
    expect(writes.length).toBe(before);
    const savedResponse = page.waitForResponse(
      (response) =>
        response.url() === `${companionAddress}/entries` &&
        response.request().method() === "POST",
    );
    await panel.getByRole("button", { name: "Save note", exact: true }).click();
    const saved: NotebookEntry = await (await savedResponse).json();
    expect(saved.body).toBe(expectedBody);
    expect(saved.source).toEqual(contextNotes[0]!.source);
    expect(saved.relatedIds).toEqual([contextNotes[0]!.id]);
    expect(saved.history[0]!.assistance).toContain(thinking.id);
    expect(saved.history[0]!.assistance).toContain(suggestion.id);
    expect(saved.history[0]!.assistance).toContain(
      "synthetic-recorded-policy v7",
    );
    expect(saved.body).not.toContain(observation.text);
    expect(saved.body).not.toContain(secondThinking.text);
    expect(saved.body).not.toContain("LATER POLLED");
    await chooseNotebookTool(panel, "Connect");
    const download = page.waitForEvent("download");
    await panel
      .getByRole("button", { name: "Export notebook backup", exact: true })
      .click();
    const archive = JSON.parse(
      await (
        await import("node:fs/promises")
      ).readFile((await (await download).path())!, "utf8"),
    );
    expect(
      archive.entries.find((entry: NotebookEntry) => entry.id === saved.id),
    ).toMatchObject({
      body: expectedBody,
      source: contextNotes[0]!.source,
      relatedIds: [contextNotes[0]!.id],
      history: saved.history,
    });

    await chooseNotebookTool(panel, "Discuss");
    let replacedPreview = false;
    page.once("dialog", (dialog) => {
      replacedPreview = true;
      return dialog.accept();
    });
    await replies
      .nth(1)
      .getByRole("button", { name: "Use as a notebook draft", exact: true })
      .click();
    expect(replacedPreview).toBe(true);
    await expect(ownText).toHaveValue(secondThinking.text);
    await preview
      .getByRole("checkbox", { name: "Include your thinking", exact: true })
      .uncheck();
    const beforePrepare = writes.length;
    await preview
      .getByRole("button", { name: "Prepare notebook draft", exact: true })
      .click();
    await expect(
      panel.getByLabel("Your thinking", { exact: true }),
    ).toHaveValue(`Teaching assistant suggestion:\n\n${secondSuggestion.text}`);
    expect(writes.length).toBe(beforePrepare);
  });
}

test("notebook draft preview retains an oversized legacy reply until the learner shortens it", async ({
  page,
}) => {
  const original = `Original beginning\n${"long synthetic reply ".repeat(900)}\nCOMPLETE ORIGINAL END`;
  await routeSyntheticDiscussion(page, (conversation) => ({
    ...conversation,
    state: "idle",
    messages: [recordedMessage("agent", original)],
  }));
  const writes: string[] = [];
  page.on("request", (request) => {
    if (
      request.url().startsWith(companionAddress) &&
      !["GET", "OPTIONS"].includes(request.method())
    )
      writes.push(request.url());
  });
  const panel = await connectSyntheticDiscussion(page);
  await panel
    .getByLabel("Message to the teaching assistant")
    .fill("Reopen the synthetic legacy reply.");
  await panel
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  await expect(panel.locator(".learning-reply")).toContainText(
    "COMPLETE ORIGINAL END",
  );
  const before = writes.length;
  await panel
    .getByRole("button", { name: "Use as a notebook draft", exact: true })
    .click();
  const preview = panel.getByRole("region", {
    name: "Notebook draft preview",
    exact: true,
  });
  await expect(preview).toBeVisible();
  await expect(
    preview.getByLabel("Your question or response", { exact: true }),
  ).toHaveCount(0);
  await expect(
    preview.getByRole("checkbox", {
      name: "Include your thinking",
      exact: true,
    }),
  ).toHaveCount(0);
  const suggestion = preview.getByLabel("Assistant suggestion to review", {
    exact: true,
  });
  await expect(suggestion).toHaveValue(original);
  const prepare = preview.getByRole("button", {
    name: "Prepare notebook draft",
    exact: true,
  });
  await expect(prepare).toBeDisabled();
  await expect(preview).toContainText(/16[ ,]?000/);
  const atLimit = "x".repeat(
    16_000 - "Teaching assistant suggestion:\n\n".length,
  );
  await suggestion.fill(atLimit);
  await expect(prepare).toBeEnabled();
  await expect(preview).toContainText("16,000 of 16,000 characters");
  await suggestion.fill(`${atLimit}x`);
  await expect(prepare).toBeDisabled();
  await expect(suggestion).toHaveValue(`${atLimit}x`);
  const shortened =
    "Selected literal excerpt: <script>not executed</script>\nThe complete selected ending.";
  await suggestion.fill(shortened);
  await expect(prepare).toBeEnabled();
  await preview
    .getByRole("checkbox", {
      name: "Include assistant suggestion",
      exact: true,
    })
    .uncheck();
  await expect(prepare).toBeDisabled();
  await preview
    .getByRole("checkbox", {
      name: "Include assistant suggestion",
      exact: true,
    })
    .check();
  await preview
    .getByRole("button", { name: "Close draft preview", exact: true })
    .click();
  await expect(preview).toBeHidden();
  expect(writes.length).toBe(before);
  await panel
    .getByRole("button", { name: "Use as a notebook draft", exact: true })
    .click();
  await expect(suggestion).toHaveValue(shortened);
  await prepare.click();
  await expect(panel.getByLabel("Your thinking", { exact: true })).toHaveValue(
    `Teaching assistant suggestion:\n\n${shortened}`,
  );
  expect(writes.length).toBe(before);
});

test("optional changed cases preserve drafts and separate linked attempts without an agent", async ({
  page,
}) => {
  await page.goto("/demos/#demo-cache-decision-lab");
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Notebook", exact: true })
    .click();
  const panel = activeLearningPanel(page);
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await chooseNotebookTool(panel, "Chapter guide");
  await panel
    .getByLabel("Demo on this page")
    .selectOption("demo-cache-decision-lab");
  const practice = panel.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Apply it in a different situation",
    }),
  });
  await expect(practice).toContainText("Choose one claim from this reading");
  const check = practice.locator("details").filter({
    has: page.getByText("Self-check after my attempt", { exact: true }),
  });
  await expect(check).not.toHaveAttribute("open");
  await practice
    .getByRole("button", { name: "Ask for help with this case" })
    .click();
  await expect(
    panel.getByLabel("Message to the teaching assistant"),
  ).toHaveValue(/Choose one claim from this reading/);
  await chooseNotebookTool(panel, "Chapter guide");
  await panel
    .getByLabel("My prediction or uncertainty")
    .fill("I am unsure whether the cache assumption still applies.");
  const saved: {
    id: string;
    kind: string;
    body: string;
    relatedIds: string[];
    source: { excerpt: string; revision: string };
  }[] = [];
  page.on("response", (response) => {
    if (
      response.url() === `${companionAddress}/entries` &&
      response.request().method() === "POST" &&
      response.ok()
    )
      void response.json().then((entry) => saved.push(entry));
  });
  await panel.getByRole("button", { name: "Save my starting point" }).click();
  await expect(
    panel.getByText("Starting point saved.", { exact: false }),
  ).toBeVisible();
  await panel
    .getByRole("button", { name: "Save demo result", exact: true })
    .click();
  await expect(
    panel.getByText("Demo result saved.", { exact: false }),
  ).toBeVisible();
  await chooseNotebookTool(panel, "Notes");
  await expect(
    panel.getByText("Demo source is present on this page.", { exact: false }),
  ).toHaveCount(2);
  await expect(
    panel.getByText("This source may have changed or moved.", {
      exact: false,
    }),
  ).toHaveCount(0);
  await page.locator("#demo-cache-decision-lab [data-cache-age]").fill("100");
  await chooseNotebookTool(panel, "Write");
  await chooseNotebookTool(panel, "Notes");
  await expect(
    panel.getByText("Demo source is present on this page.", { exact: false }),
  ).toHaveCount(2);
  await expect(
    panel.getByText("This source may have changed or moved.", {
      exact: false,
    }),
  ).toHaveCount(0);
  await chooseNotebookTool(panel, "Chapter guide");
  await practice
    .getByLabel("My explanation of the changed case")
    .fill(
      "A private response needs a different cache policy. I need to check which cache can store it before changing the freshness interval.",
    );
  await page.reload();
  await expect(
    practice.getByLabel("My explanation of the changed case"),
  ).toHaveValue(/private response/);
  await expect(check).not.toHaveAttribute("open");
  await practice
    .getByText("Self-check after my attempt", { exact: true })
    .click();
  await expect(check).toContainText("Name the changed condition");
  await practice
    .getByRole("button", { name: "Save my independent attempt" })
    .click();
  await expect(practice.getByRole("status")).toContainText(
    "Independent attempt saved separately",
  );
  await panel
    .getByLabel("My reflection on this check")
    .fill(
      "Still unsure; the observation and changed case address different intervals.",
    );
  await panel
    .getByRole("button", { name: "Save my reflection", exact: true })
    .click();
  await expect(
    panel.getByText("Reflection saved.", { exact: false }),
  ).toBeVisible();
  await expect.poll(() => saved.length).toBe(4);
  expect(saved.map((entry) => entry.kind)).toEqual([
    "attempt",
    "scratch",
    "revisit",
    "reflection",
  ]);
  expect(saved[2]!.source.excerpt).toContain("reading-application (version 1)");
  expect(saved[2]!.source.revision).toMatch(/^[a-f0-9]{64}$/);
  expect(saved[2]!.relatedIds).toEqual(
    expect.arrayContaining([saved[0]!.id, saved[1]!.id]),
  );
  expect(saved[3]!.relatedIds).toEqual(
    expect.arrayContaining([saved[0]!.id, saved[1]!.id, saved[2]!.id]),
  );
  // A missing anchor remains a real source-location warning.
  await page
    .locator("#demo-cache-decision-lab")
    .evaluate((demo) => demo.remove());
  await chooseNotebookTool(panel, "Notes");
  await expect(
    panel.getByText("This source may have changed or moved.", { exact: false }),
  ).toHaveCount(4);
  await chooseNotebookTool(panel, "Chapter guide");
  await page.goto("/chapters/introduction/");
  await expect(practice).toContainText("Choose one claim from this reading");
  await expect(
    panel.getByRole("button", { name: "Save demo result", exact: true }),
  ).toHaveCount(0);
  await practice
    .getByLabel("My explanation of the changed case")
    .fill("My project may use a different boundary.");
  await page.goto("/chapters/architecture/");
  await expect(panel.getByRole("heading", { level: 2 })).toHaveText(
    "4 · Architecture",
  );
  await expect(practice).toBeVisible();
  await page.goto("/chapters/introduction/");
  await expect(
    practice.getByLabel("My explanation of the changed case"),
  ).toHaveValue("My project may use a different boundary.");
  await practice
    .getByRole("button", { name: "Save my independent attempt" })
    .click();
  await expect(practice.getByRole("status")).toContainText(
    "Independent attempt saved separately",
  );
  await panel
    .getByRole("button", { name: "Write a reflection on this reading" })
    .click();
  await panel.getByLabel("Your thinking").fill("I still want help.");
  await panel.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(panel.getByRole("status")).toContainText(
    "Saved in your private notebook.",
  );
});

test("whole-book entry points keep learning tools lazy and exclude administrative records", async ({
  page,
}) => {
  const routes = new Set(
    conceptPages
      .map((item) => item.url)
      .filter((url) =>
        /^\/(chapters|appendices|parts|case-studies|project)\//.test(url),
      ),
  );
  routes.add("/concepts/");
  routes.add("/explore/");
  routes.add("/demos/");
  routes.add("/notebook/setup/");
  routes.add("/course/");
  for (const route of routes) {
    await page.goto(route);
    await expect(
      page
        .locator(".site-header")
        .getByRole("button", { name: "Notebook", exact: true }),
    ).toBeVisible();
    await expect(
      page
        .locator(".site-header")
        .getByRole("button", { name: "Teaching assistant", exact: true }),
    ).toBeVisible();
    await expect(page.locator("[data-learning-cockpit]")).toBeVisible();
    await expect(page.locator(".learning-workspace")).toHaveCount(0);
    await expect(page.locator(".paragraph-notebook-button")).toHaveCount(0);
    expect(
      await page
        .locator('meta[name="book-content-revision"]')
        .getAttribute("content"),
    ).toMatch(/^[a-f0-9]{64}$/);
  }
  await page.goto("/admin/courses/");
  await expect(page.locator('[data-learning-toggle="notebook"]')).toBeHidden();
  await expect(page.locator('[data-learning-toggle="assistant"]')).toBeHidden();
});

test("a student captures a passage, revises thinking, revisits it and prepares selected private material", async ({
  page,
}) => {
  await page.goto("/chapters/benchmarking/");
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Notebook", exact: true })
    .click();
  const panel = activeLearningPanel(page);
  await expect(panel).toBeVisible();
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await selectReading(page);
  await panel.getByRole("button", { name: "Use selected text" }).click();
  await panel
    .getByLabel("Title", { exact: true })
    .fill("Synthetic queue observation");
  await panel
    .getByLabel("Your thinking")
    .fill("Which averages describe the same observation window?");
  await panel.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(panel.getByRole("status")).toHaveText(
    "Saved in your private notebook.",
  );
  await panel.getByLabel("Kind of note").selectOption("reflection");
  await panel
    .getByLabel("Your thinking")
    .fill(
      "I now check whether the averages describe a common stable interval before applying the relationship. My next step is to test a different observation window.",
    );
  await expect(
    panel.getByText("This is a suggestion, not a minimum.", { exact: false }),
  ).toBeVisible();
  await panel.getByText("Examples of reflection", { exact: true }).click();
  await expect(
    panel.getByRole("heading", { name: "Honest uncertainty" }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Save note", exact: true }).click();
  await chooseNotebookTool(panel, "Notes");
  await panel.getByText("2 saved revisions", { exact: true }).click();
  await expect(panel.getByText(/Which averages describe/)).toBeVisible();
  await panel.getByLabel("Select Synthetic queue observation").check();
  await panel.getByRole("button", { name: "Prepare selected notes" }).click();
  await panel.getByRole("button", { name: "Build submission draft" }).click();
  await expect(
    panel.getByLabel("Review and revise your submission material"),
  ).toHaveValue(/common stable interval/);
  await chooseNotebookTool(panel, "Concepts");
  await panel.getByLabel("Concept", { exact: true }).selectOption("queue");
  await panel.getByLabel("Studied", { exact: true }).check();
  await panel
    .getByLabel("My current understanding")
    .selectOption("can-explain");
  await panel
    .getByLabel("What will I investigate next?")
    .fill("Test a growing queue.");
  await panel
    .getByLabel("Synthetic queue observation", { exact: true })
    .check();
  await panel.getByRole("button", { name: "Save self-assessment" }).click();
  await expect(panel.getByRole("status")).toHaveText(
    "Saved your dated self-assessment.",
  );
  await chooseNotebookTool(panel, "Notes");
  await panel.getByRole("button", { name: "Revisit", exact: true }).click();
  await expect(
    panel.getByText("Before rereading, explain the idea from memory", {
      exact: false,
    }),
  ).toBeVisible();
  await panel
    .getByLabel("Your thinking")
    .fill(
      "The relation uses consistent averages. In a changed case I would first check stability.",
    );
  await panel.getByRole("button", { name: "Save note", exact: true }).click();
  await panel.getByRole("button", { name: "Close notebook" }).click();
  await page.reload();
  await expect(page.locator(".paragraph-notebook-button")).toHaveCount(0);
  await expect(page.locator(".learning-workspace")).toHaveCount(0);
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Notebook", exact: true })
    .click();
  await expect(panel).toBeVisible();
  await chooseNotebookTool(panel, "Notes");
  await expect(
    panel.getByRole("heading", {
      name: "Revisit: Synthetic queue observation",
    }),
  ).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include(".learning-workspace").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("notebook-desktop.png"),
    fullPage: false,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("[data-theme-picker]").selectOption("dark");
  const bounds = await panel.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(
    await panel.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("notebook-mobile-dark.png"),
    fullPage: false,
  });
  await chooseNotebookTool(panel, "Connect");
  await panel.getByRole("button", { name: "Disconnect", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Add this paragraph to my notebook" }),
  ).toHaveCount(0);
});

test("opening either experience preserves book, reading and demo widths with expanded or folded navigation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/chapters/scaling/");
  await page.evaluate(() => document.fonts.ready);
  const panel = activeLearningPanel(page);
  const shell = page.locator(".book-shell");
  const navigation = page.locator("#book-navigation details");
  const toggle = navigation.locator("summary");
  const targets = [
    shell,
    page.locator(".chapter-main"),
    page.locator(".prose"),
    page.locator(".prose > p:not(.chapter-kicker)").first(),
    page.locator("[data-saturation-boundary-demo]"),
  ];
  for (const width of [2560, 1920, 1600, 1280, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const collapsed of width > 1216 ? [false, true] : [false]) {
      const isCollapsed = (await navigation.getAttribute("open")) === null;
      if (isCollapsed !== collapsed) await toggle.click();
      await expect(shell).toHaveAttribute(
        "data-navigation-collapsed",
        String(collapsed),
      );
      // Let the navigation's own layout settle before measuring the baseline.
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      for (const experience of ["Notebook", "Teaching assistant"]) {
        const before = await Promise.all(
          targets.map((target) => target.boundingBox()),
        );
        await page
          .locator(".site-header")
          .getByRole("button", { name: experience, exact: true })
          .click();
        await expect(panel).toBeVisible();
        for (const [index, target] of targets.entries()) {
          await expect
            .poll(
              async () => {
                const after = await target.boundingBox();
                const original = before[index]!;
                return Math.max(
                  Math.abs(after!.x - original.x),
                  Math.abs(after!.width - original.width),
                  index === 3 ? Math.abs(after!.height - original.height) : 0,
                );
              },
              {
                message: `Book geometry at ${width}px, navigation ${collapsed ? "folded" : "expanded"}, target ${index}`,
              },
            )
            .toBeLessThan(1);
        }
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth + 1,
          ),
        ).toBe(true);
        if (width === 2560 && !collapsed) {
          const reading = await targets[1]!.boundingBox();
          const notebook = await panel.boundingBox();
          expect(
            Math.abs(reading!.x + reading!.width / 2 - width / 2),
          ).toBeLessThan(1);
          expect(
            (await targets[4]!.boundingBox())!.x + before[4]!.width,
          ).toBeLessThanOrEqual(notebook!.x);
          await page.screenshot({
            path: test
              .info()
              .outputPath(
                `${experience.replaceAll(" ", "-").toLowerCase()}-wide-unchanged.png`,
              ),
          });
        }
        await panel.locator("[data-learning-close]").click();
        await expect(panel).toBeHidden();
        for (const [index, target] of targets.entries()) {
          const after = await target.boundingBox();
          expect(Math.abs(after!.width - before[index]!.width)).toBeLessThan(1);
        }
      }
    }
  }
});

test("students choose task support and direct explanations without a saved initial note", async ({
  page,
}) => {
  // A configured provider may still fail when contacted; retain the request.
  await advertiseProvider(page);
  await page.goto("/chapters/benchmarking/");
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Notebook", exact: true })
    .click();
  const panel = activeLearningPanel(page);
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText("Connected");
  await chooseNotebookTool(panel, "Discuss");
  await panel.getByLabel("How I want help").selectOption("explanation");
  await panel.getByLabel("Where I want support").selectOption("prerequisite");
  await panel
    .getByLabel("My learning goal")
    .fill("Understand the measurement window");
  await panel
    .getByLabel("Message to the teaching assistant")
    .fill(
      "I do not know what a common observation window means. Please explain directly.",
    );
  const request = page.waitForRequest(
    (request) =>
      request.url().startsWith(companionAddress + "/agent/conversations/") &&
      request.method() === "POST",
  );
  await panel.getByRole("button", { name: "Send message" }).click();
  const sent = (await request).postDataJSON();
  expect(sent).toMatchObject({
    mode: "explanation",
    supportNeed: "prerequisite",
    noteIds: [],
  });
  expect(sent.text).toContain("Support requested: A prerequisite concept.");
  await expect(panel.getByRole("status")).toContainText(
    "Enable Codex or a local model",
  );
  await panel.getByLabel("Where I want support").selectOption("next-step");
  await expect(panel.getByLabel("How I want help")).toHaveValue("explanation");
  await chooseNotebookTool(panel, "Notes");
  await expect(
    panel.getByText("No notes in this view yet.", { exact: false }),
  ).toBeVisible();
  await chooseNotebookTool(panel, "Chapter guide");
  await panel
    .getByLabel("My prediction or uncertainty")
    .fill("I am unsure which inputs describe the same window.");
  page.once("dialog", (dialog) => dialog.accept());
  await panel
    .getByRole("button", { name: "Help me get started", exact: true })
    .click();
  await expect(
    panel.getByLabel("Message to the teaching assistant"),
  ).toHaveValue("I am unsure which inputs describe the same window.");
  await expect(
    panel.getByLabel("Investigation source").locator("option").first(),
  ).toContainText("Investigation ·");
  await expect(panel.getByLabel("Where I want support")).toHaveValue(
    "getting-started",
  );
  await expect(panel.getByLabel("How I want help")).toHaveValue("hint");
});

test("selected context is explicit and the notebook follows chapters without losing a draft", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith(companionAddress))
      requests.push(request.url());
  });
  await page.goto("/chapters/benchmarking/");
  await expect(
    page
      .locator(".site-header")
      .getByRole("button", { name: "Notebook", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".learning-workspace")).toHaveCount(0);
  await expect(page.locator(".paragraph-notebook-button")).toHaveCount(0);
  expect(requests).toEqual([]);
  const passage = await selectReading(page);
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Notebook", exact: true })
    .click();
  const panel = activeLearningPanel(page);
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await expect(panel.locator("blockquote")).toHaveText(
    passage.slice(0, 500) + (passage.length > 500 ? "…" : ""),
  );
  await panel
    .getByLabel("Title", { exact: true })
    .fill("Synthetic selected passage");
  await panel
    .getByLabel("Your thinking")
    .fill("Synthetic observation about this selected passage.");
  await panel.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(panel.getByRole("status")).toHaveText(
    "Saved in your private notebook.",
  );

  await chooseNotebookTool(panel, "Notes");
  await expect(
    panel.getByText("Captured text is present on this page.", { exact: true }),
  ).toBeVisible();
  await page
    .locator("[data-comment-target]")
    .first()
    .evaluate((paragraph) => {
      paragraph.textContent =
        "Synthetic revised passage with different source text.";
    });
  await chooseNotebookTool(panel, "Write");
  await chooseNotebookTool(panel, "Notes");
  await expect(
    panel.getByText("This source may have changed or moved.", { exact: false }),
  ).toBeVisible();
  await chooseNotebookTool(panel, "Write");
  await page.goto("/chapters/architecture/");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { level: 2 })).toHaveText(
    "4 · Architecture",
  );
  const notebookBounds = await panel.boundingBox();
  expect(notebookBounds!.x).toBeGreaterThanOrEqual(0);
  expect(notebookBounds!.x + notebookBounds!.width).toBeLessThanOrEqual(1280);
  await expect(
    panel.getByRole("region", { name: "Note context" }),
  ).toContainText("Writing about");
  await expect(panel.locator("blockquote")).toHaveCount(0);
  await expect(panel.locator("summary", { hasText: "Reading:" })).toHaveCount(
    0,
  );
  await chooseNotebookTool(panel, "Notes");
  await expect(
    panel.getByRole("heading", { name: "Synthetic selected passage" }),
  ).toHaveCount(0);
  await panel.getByLabel("Notes to show").selectOption("all");
  await expect(
    panel.getByRole("heading", { name: "Synthetic selected passage" }),
  ).toBeVisible();
  await chooseNotebookTool(panel, "Chapter guide");
  await expect(panel.getByText(/cached feed/)).toBeVisible();
  await expect(
    panel
      .getByLabel("Demo in this chapter")
      .locator("option", { hasText: "Cache decision lab" }),
  ).toHaveCount(1);
  await expect(
    panel
      .getByLabel("Demo in this chapter")
      .locator("option", { hasText: "Tail latency simulator" }),
  ).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Save demo result", exact: true }),
  ).toBeDisabled();
  await expect(
    panel.getByText(
      "Save a prediction or uncertainty to enable Save demo result.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("architecture-guide.png"),
    fullPage: false,
  });

  await page.goto("/chapters/introduction/");
  await expect(panel).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Chapter guide", exact: true }),
  ).toHaveAttribute("aria-current", "true");
  await expect(
    panel.getByText(/There is no interactive demo on this page/),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Save demo result", exact: true }),
  ).toHaveCount(0);
  await chooseNotebookTool(panel, "Write");
  await panel
    .getByLabel("Title", { exact: true })
    .fill("Synthetic unfinished introduction note");
  await panel
    .getByLabel("Your thinking")
    .fill(
      "Keep this thought attached to the introduction.\nThe next paragraph is unfinished. ",
    );
  await page.locator('a[href="/chapters/scaling/"]').first().click();
  await expect(panel).toBeVisible();
  await expect(panel.getByLabel("Your thinking")).toHaveValue(
    "Keep this thought attached to the introduction.\nThe next paragraph is unfinished. ",
  );
  await expect(
    panel.getByRole("region", { name: "Note context" }),
  ).toContainText("still belongs to its original reading");
  await expect(
    panel.getByRole("region", { name: "Note context" }).getByRole("link"),
  ).toHaveAttribute("href", /\/chapters\/introduction\//);
  await chooseNotebookTool(panel, "Concepts");
  await expect(panel.getByLabel("Concept", { exact: true })).toHaveValue(
    conceptPages.find((page) => page.url === "/chapters/scaling/")!
      .concepts[0]!,
  );
  await chooseNotebookTool(panel, "Discuss");
  await expect(
    panel.getByRole("region", { name: "Assistant context" }),
  ).toContainText("This conversation keeps its original source");
  await panel
    .getByRole("button", { name: "Discuss the current reading" })
    .click();
  await expect(
    panel.getByLabel("Investigation source").locator("option").first(),
  ).toContainText(
    "Current reading · How should web applications respond to scaling pressure?",
  );
  await chooseNotebookTool(panel, "Write");
  await expect(
    panel.getByRole("region", { name: "Note context" }).getByRole("link"),
  ).toHaveAttribute("href", /\/chapters\/introduction\//);
  await panel.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(panel.getByRole("status")).toHaveText(
    "Saved in your private notebook.",
  );
  await panel.getByRole("button", { name: "New note", exact: true }).click();
  const newSource = panel
    .getByRole("region", { name: "Note context" })
    .getByRole("link");
  await expect(newSource).toHaveAttribute("href", /\/chapters\/scaling\//);
  await expect(newSource).toBeInViewport({ ratio: 1 });
  await expect(newSource).toBeFocused();
  await page.screenshot({
    path: test.info().outputPath("chapter-writing.png"),
    fullPage: false,
  });
  await panel.getByRole("button", { name: "Close notebook" }).click();
  await page.goto("/chapters/benchmarking/");
  await expect(
    page
      .locator(".site-header")
      .getByRole("button", { name: "Notebook", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#learning-assistant")).toBeVisible();
  await expect(page.locator("#learning-notebook")).toBeHidden();
  await page
    .locator("#learning-assistant")
    .getByRole("button", { name: "Close teaching assistant" })
    .click();
  await page.goto("/chapters/introduction/");
  await expect(page.locator(".learning-workspace")).toHaveCount(0);
});

test("a compact Notebook keeps keyboard focus when cancelling or starting a note for the current reading", async ({
  page,
}) => {
  await page.goto("/chapters/introduction/");
  const launchers = page.getByRole("group", { name: "Learning tools" });
  const notebookLauncher = launchers.getByRole("button", {
    name: "Notebook",
    exact: true,
  });
  const notebook = page.locator("#learning-notebook");
  const assistant = page.locator("#learning-assistant");
  const body = notebook.getByLabel("Your thinking");
  const source = notebook
    .getByRole("region", { name: "Note context" })
    .getByRole("link");
  const question = assistant.getByLabel("Message to the teaching assistant");
  await notebookLauncher.click();
  await notebook.getByLabel("Companion address").fill(companionAddress);
  await notebook
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await body.fill("Keep my introduction draft.");
  await launchers
    .getByRole("button", { name: "Teaching assistant", exact: true })
    .click();
  await question.fill("Keep my unsent question.");
  await page.locator('a[href="/chapters/architecture/"]').first().click();
  await expect(question).toHaveValue("Keep my unsent question.");
  await page.setViewportSize({ width: 390, height: 844 });
  await notebookLauncher.click();
  await expect(assistant).toBeHidden();

  const newNote = notebook.getByRole("button", {
    name: "New note for this reading",
  });
  await newNote.focus();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.keyboard.press("Enter");
  await expect(newNote).toBeFocused();
  await expect(body).toHaveValue("Keep my introduction draft.");
  await expect(source).toHaveAttribute("href", /\/chapters\/introduction\//);

  page.once("dialog", (dialog) => dialog.accept());
  await page.keyboard.press("Enter");
  await expect(body).toHaveValue("");
  await expect(source).toHaveAttribute("href", /\/chapters\/architecture\//);
  await expect(source).toBeInViewport({ ratio: 1 });
  await expect(source).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(notebookLauncher).toBeFocused();
  await expect(assistant).toBeVisible();
  await expect(question).toHaveValue("Keep my unsent question.");
});

test("a restored open notebook explains unavailable or expired connections and retains writing", async ({
  page,
}) => {
  await page.goto("/chapters/benchmarking/");
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Notebook", exact: true })
    .click();
  const panel = page.locator("#learning-notebook");
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await panel
    .getByLabel("Your thinking")
    .fill("Synthetic unfinished draft survives recovery.");
  await page.locator('.site-header [data-learning-toggle="assistant"]').click();
  const assistant = page.locator("#learning-assistant");
  await assistant
    .getByLabel("Message to the teaching assistant")
    .fill("My assistant question survives a shared connection failure.");
  let restoreChecks = 0;
  await page.route(`${companionAddress}/status`, (route) => {
    restoreChecks++;
    return route.abort();
  });
  await page.reload();
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("status")).toContainText("cannot tell us which");
  await expect(
    panel.getByRole("button", { name: "Connect companion", exact: true }),
  ).toBeVisible();
  await expect(
    assistant.getByRole("button", { name: "Connect companion", exact: true }),
  ).toBeVisible();
  expect(restoreChecks).toBe(1);
  await page.unroute(`${companionAddress}/status`);
  await page.reload();
  await expect(panel.getByLabel("Your thinking")).toHaveValue(
    "Synthetic unfinished draft survives recovery.",
  );
  await expect(
    assistant.getByLabel("Message to the teaching assistant"),
  ).toHaveValue("My assistant question survives a shared connection failure.");
  await page.route(`${companionAddress}/status`, (route) =>
    route.fulfill({ json: { connected: true, version: 2, provider: "Codex" } }),
  );
  await page.reload();
  await chooseNotebookTool(panel, "Connect");
  await expect(
    panel.getByText(
      "This installed companion does not report a teaching policy. It keeps its existing instructions.",
    ),
  ).toBeVisible();
  await expect(
    panel.getByRole("link", {
      name: "Companion setup and release availability",
    }),
  ).toHaveAttribute("href", "/notebook/setup/");
  await chooseNotebookTool(panel, "Write");
  await expect(panel.getByLabel("Your thinking")).toHaveValue(
    "Synthetic unfinished draft survives recovery.",
  );
  await page.unroute(`${companionAddress}/status`);
  await page.route(`${companionAddress}/status`, (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "Synthetic companion session expired." }),
    }),
  );
  await page.reload();
  await expect(panel.getByRole("status")).toContainText("session expired");
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("book-learning-connection"),
    ),
  ).toBeNull();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(sessionStorage.getItem("book-learning-workspace")!).editor
          .body,
    ),
  ).toBe("Synthetic unfinished draft survives recovery.");
});
