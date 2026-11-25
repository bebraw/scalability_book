import {
  assistantPanel,
  openAssistantSettings,
  selectReading,
  downloadedMarkdown,
  chooseAssistantTool,
} from "./learning-workspace.helpers.ts";
import {
  test,
  expect,
  type Locator,
  type Page,
  type Route,
} from "@playwright/test";
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
    const panel = assistantPanel(page);
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
  const panel = assistantPanel(page);
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  return panel;
}

test("opening a class discussion preserves an unsent assistant question and its passage", async ({
  page,
}) => {
  const panel = await connectSyntheticDiscussion(page);
  await chooseAssistantTool(panel, "Discuss");
  const chapter = page.url();
  const paragraphs = page.locator("[data-comment-target]");
  const originalId = await paragraphs.first().getAttribute("id");
  const classId = await paragraphs.nth(1).getAttribute("id");
  const originalText = await selectReading(page);
  await panel.getByRole("button", { name: "Discuss selected text" }).click();
  const question = "Which wait does this passage say the benchmark measures?";
  const message = panel.getByLabel("Message to the teaching assistant");
  await message.fill(question);

  // A saved link or sign-in return can open in a tab with an existing draft.
  await page.goto(`${chapter}?inquiry=1#${classId}`);
  await expect(panel.getByLabel("Course for this inquiry")).toBeVisible();
  await expect(panel.locator(`a[href="${chapter}#${classId}"]`)).toBeVisible();
  await chooseAssistantTool(panel, "Discuss");
  await expect(message).toHaveValue(question);
  const source = panel.getByRole("region", { name: "Assistant context" });
  await expect(source.getByRole("link")).toHaveJSProperty(
    "href",
    `${chapter}#${originalId}`,
  );
  await source
    .getByText("Preview the selected source", { exact: true })
    .click();
  await expect(source.locator("blockquote")).toHaveText(originalText);

  await panel.getByRole("button", { name: "Close teaching assistant" }).click();
  await page
    .getByRole("link", {
      name: "Link to Benchmark to test a claim",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(
    `${chapter}?inquiry=1#benchmark-to-test-a-claim`,
  );
  await expect(panel).toBeHidden();
});

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
  const panel = assistantPanel(page);
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
  // The user's selection must survive navigation even while its messages are in flight.
  let holdRequest!: (route: Route) => void;
  const held = new Promise<Route>((resolve) => {
    holdRequest = resolve;
  });
  await page.route(
    `${companionAddress}/agent/conversations/${first.id}`,
    holdRequest,
    { times: 1 },
  );
  await picker.selectOption(first.id);
  const pending = await held;
  await expect(picker).toHaveValue(first.id);
  await page.reload();
  await pending.abort().catch(() => {}); // The previous document may already have cancelled the request.
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
    .getByRole("button", { name: "Teaching assistant", exact: true })
    .click();
  const panel = assistantPanel(page);
  await expect(
    panel.getByRole("heading", { name: "1. Choose your setup" }),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Export notebook backup" }),
  ).toHaveCount(0);
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
    .getByRole("button", { name: "Teaching assistant", exact: true })
    .click();
  const panel = assistantPanel(page);
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await chooseAssistantTool(panel, "Discuss");
  await panel
    .getByLabel("Message to the teaching assistant")
    .fill("Keep my question while I enable a provider.");
  await expect(
    panel.getByRole("button", { name: "Send message", exact: true }),
  ).toBeDisabled();
  await expect(
    panel.getByRole("region", { name: "Assistant provider" }),
  ).toContainText("No assistant provider is connected");
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
  await chooseAssistantTool(panel, "Discuss");
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
        .getByRole("link", { name: "Learning diary", exact: true }),
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
test("students choose task support and direct explanations without a saved initial note", async ({
  page,
}) => {
  // The browser sees a provider, but the companion has none when asked to reply.
  await advertiseProvider(page);
  await page.goto("/chapters/benchmarking/");
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Teaching assistant", exact: true })
    .click();
  const panel = assistantPanel(page);
  await panel.getByLabel("Companion address").fill(companionAddress);
  await panel
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText("Connected");
  await chooseAssistantTool(panel, "Discuss");
  await panel.getByLabel("How I want help").selectOption("explanation");
  await panel.getByLabel("Where I want support").selectOption("prerequisite");
  await panel
    .getByLabel("My learning goal")
    .fill("Understand the measurement window");
  const question =
    "I do not know what a common observation window means. Please explain directly.";
  const message = panel.getByLabel("Message to the teaching assistant");
  await message.fill(question);
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
  const status = panel.getByRole("status");
  await expect(status).toContainText(/companion setup/i);
  await expect(status).toContainText(/notebook writing works without a model/i);
  await expect(message).toHaveValue(question);
  await panel.getByLabel("Where I want support").selectOption("next-step");
  await expect(panel.getByLabel("How I want help")).toHaveValue("explanation");
});

async function simulateHighlightHandoff(page: Page, allowClipboard = true) {
  await page.addInitScript((allowed) => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          if (!allowed)
            throw new DOMException("Clipboard blocked", "NotAllowedError");
          await Promise.resolve();
          document.body.dataset.copiedHighlight = value;
        },
      },
    });
    // Observe the attempted handoff and its clipboard contents without opening a real vault.
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.protocol === "obsidian:") {
        document.body.dataset.diaryOpened = this.href;
        document.body.dataset.highlightAtOpen =
          document.body.dataset.copiedHighlight ?? "";
        return;
      }
      originalClick.call(this);
    };
    const replace = history.replaceState;
    history.replaceState = function (state, title, url) {
      replace.call(this, state, title, url);
      if (location.hash === "#scalableweb-course-diary-add-highlight") {
        document.body.dataset.viewerSignal = location.href;
        document.body.dataset.highlightAtSignal =
          document.body.dataset.copiedHighlight ?? "";
      }
    };
  }, allowClipboard);
}

test("book highlights copy a source-linked passage and hand the selected code to Obsidian", async ({
  page,
}) => {
  await simulateHighlightHandoff(page);
  await page.goto("/chapters/introduction/");
  const paragraph = page.locator("[data-comment-target]").first();
  const anchor = await paragraph.getAttribute("id");
  const text = await selectReading(page);
  const group = page.getByRole("group", { name: "Selected book passage" });
  await expect(group.getByText("Download Markdown")).toHaveCount(0);
  await group.getByRole("button", { name: "Copy highlight" }).click();
  await expect(group.getByRole("status")).toContainText(/copied/i);
  const body = page.locator("body");
  const markdown = (await body.getAttribute("data-copied-highlight"))!;
  expect(markdown).toContain("> ");
  expect(markdown.replace(/\\(.)/g, "$1")).toContain(text);
  expect(markdown.trimEnd()).toMatch(
    /\[Book source\]\(https:\/\/scalableweb\.dev\/chapters\/introduction\/#.+\)$/,
  );
  expect(markdown).toContain("#" + anchor + ")");
  await expect(body).not.toHaveAttribute("data-diary-opened", /.*/);
  await expect(body).not.toHaveAttribute("data-viewer-signal", /.*/);
  await expect(page.locator(".learning-workspace")).toHaveCount(0);
  await page.goto("/chapters/architecture/?entry=lecture#saved-passage");
  const originalUrl = page.url();
  const originalLength = await page.evaluate(() => {
    history.replaceState({ testReading: "saved-passage" }, "");
    return history.length;
  });
  const example = page.locator("article.prose pre code").first();
  const code = await example.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    return element.textContent!;
  });
  expect(code.trim().split("\n").length).toBeGreaterThan(1);
  const add = group.getByRole("button", { name: "Add book highlight" });
  await expect(add).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(add).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(body).toHaveAttribute(
    "data-diary-opened",
    "obsidian://scalableweb-course-diary-add-highlight",
  );
  await expect(group.getByRole("status")).toContainText(/paste/i);
  const codeMarkdown = (await body.getAttribute("data-highlight-at-open"))!;
  const viewerUrl = new URL(originalUrl);
  viewerUrl.hash = "scalableweb-course-diary-add-highlight";
  await expect(body).toHaveAttribute("data-viewer-signal", viewerUrl.href);
  await expect(body).toHaveAttribute("data-highlight-at-signal", codeMarkdown);
  expect(page.url()).toBe(originalUrl);
  expect(
    await page.evaluate(() => ({
      state: history.state,
      length: history.length,
    })),
  ).toEqual({
    state: { testReading: "saved-passage" },
    length: originalLength,
  });
  const raw = codeMarkdown
    .split("\n\n[Book source]")[0]!
    .split("\n")
    .map((line) => line.slice(2).replace(/\\(.)/g, "$1"))
    .join("\n");
  expect(raw).toBe(code);
  expect(codeMarkdown).toMatch(
    /\[Book source\]\(https:\/\/scalableweb\.dev\/chapters\/architecture\/#(?!content\))[^)]+\)/,
  );
});

test("a blocked highlight copy leaves the reader on the passage with a manual fallback", async ({
  page,
}) => {
  await simulateHighlightHandoff(page, false);
  await page.goto("/chapters/introduction/");
  const text = await selectReading(page);
  const group = page.getByRole("group", { name: "Selected book passage" });
  await group.getByRole("button", { name: "Add book highlight" }).click();
  await expect(group.getByRole("status")).toContainText(/copy/i);
  await expect(group.getByRole("status")).toContainText(/paste/i);
  await expect(page.locator("body")).not.toHaveAttribute(
    "data-diary-opened",
    /.*/,
  );
  await expect(page.locator("body")).not.toHaveAttribute(
    "data-viewer-signal",
    /.*/,
  );
  const fallback = group.getByRole("textbox", {
    name: "Highlight with book source",
  });
  await expect(fallback).toBeFocused();
  const markdown = await fallback.inputValue();
  const selected = await fallback.evaluate((field: HTMLTextAreaElement) =>
    field.value.slice(field.selectionStart, field.selectionEnd),
  );
  expect(selected).toBe(markdown);
  expect(markdown.replace(/\\(.)/g, "$1")).toContain(text);
  expect(markdown).toMatch(
    /\[Book source\]\(https:\/\/scalableweb\.dev\/chapters\/introduction\/#.+\)/,
  );
});

test("only the explicit recovery route exposes notebook exports", async ({
  page,
}) => {
  const recovery = page.getByRole("region", { name: "Notebook recovery" });
  const requests: string[] = [];
  page.on("request", (request) => {
    if (["8788", "18888"].includes(new URL(request.url()).port))
      requests.push(request.url());
  });
  await page.goto("/notebook/setup/");
  await expect(recovery).toHaveCount(0);
  await page.goto("/notebook/setup/?legacy=1");
  await expect(recovery).toBeVisible();
  await expect(recovery.getByLabel("Companion address")).toBeVisible();
  await expect(page.locator(".learning-workspace")).toHaveCount(0);
  await expect(page.getByLabel("Your thinking", { exact: true })).toHaveCount(
    0,
  );
  expect(requests).toEqual([]);

  await page.goto("/chapters/introduction/?legacy=1");
  await expect(recovery).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Learning diary", exact: true }),
  ).toHaveAttribute("href", "/diary/");
  await page.goto("/chapters/introduction/?assistant=1");
  await expect(assistantPanel(page)).toBeVisible();
  await expect(recovery).toHaveCount(0);
});

test("the diary assistant link opens the requested passage and preserves an unfinished question on cancellation", async ({
  page,
}) => {
  const path = "/chapters/introduction/";
  const assistant = page.locator("#learning-assistant");
  await page.goto(path + "?assistant=1#first-passage");
  await assistant.getByLabel("Companion address").fill(companionAddress);
  await assistant
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  const source = assistant
    .getByRole("region", { name: "Assistant context" })
    .getByRole("link")
    .first();
  await expect(source).toHaveAttribute("href", /#first-passage$/);
  const message = assistant.getByLabel("Message to the teaching assistant");
  await message.fill("An unfinished question about the first passage");
  // A new reading request may arrive in a fresh document with a saved session.
  await page.goto(path + "?assistant=1&from=diary#second-passage", {
    waitUntil: "commit",
  });
  await expect(message).toHaveValue(
    "An unfinished question about the first passage",
  );
  await expect(source).toHaveAttribute("href", /#first-passage$/);
  await message.fill("");
  await page.goto(path + "?assistant=1#second-passage");
  await expect(source).toHaveAttribute("href", /#second-passage$/);
  await expect(message).toHaveValue("");
});

test("a reviewed assistant exchange downloads only the chosen writing with provenance", async ({
  page,
}) => {
  await routeSyntheticDiscussion(page, (conversation, text) => ({
    ...conversation,
    state: "idle",
    messages: [
      recordedMessage("student", text),
      recordedMessage("agent", "Compare both measurement windows."),
    ],
  }));
  const writes: string[] = [];
  page.on("request", (request) => {
    if (
      request.url() === companionAddress + "/entries" &&
      request.method() === "POST"
    )
      writes.push(request.url());
  });
  const panel = await connectSyntheticDiscussion(page);
  await panel
    .getByLabel("Message to the teaching assistant")
    .fill("An unedited private question.");
  await panel
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  await panel.getByRole("button", { name: "Review for diary" }).click();
  const review = panel.getByRole("region", { name: "Diary exchange preview" });
  await review.getByLabel("Include your thinking").uncheck();
  const reviewed =
    "Check the observation interval before comparing results.\n".repeat(320) +
    "The last reviewed line compares the entire interval.";
  expect(reviewed.length).toBeGreaterThan(16_000);
  await review.getByLabel("Assistant suggestion to review").fill(reviewed);
  const markdown = await downloadedMarkdown(
    review.getByRole("button", { name: "Download Markdown" }),
  );
  expect(markdown).toContain(reviewed);
  expect(markdown).toContain(
    "[Book source](https://scalableweb.dev/chapters/benchmarking/)",
  );
  expect(markdown).toContain("Assistance: Reviewed discussion draft");
  expect(markdown).not.toContain("An unedited private question.");
  expect(markdown).not.toContain("Compare both measurement windows.");
  expect(writes).toEqual([]);
});

test("previous assistant attempts are loaded and attached only by explicit choice", async ({
  page,
}) => {
  const reads: string[] = [];
  page.on("request", (request) => {
    if (request.url() === companionAddress + "/notebook")
      reads.push(request.url());
  });
  await advertiseProvider(page);
  const panel = await connectSyntheticDiscussion(page);
  await openAssistantSettings(panel);
  await panel.getByRole("button", { name: "Save initial thinking" }).click();
  await panel
    .getByLabel("My initial thinking")
    .fill("Compare the same interval.");
  await panel.getByRole("button", { name: "Save private attempt" }).click();
  const attach = panel.getByRole("checkbox", {
    name: /Include my attempt: Compare the same interval/,
  });
  await expect(attach).not.toBeChecked();
  await page.reload();
  await openAssistantSettings(panel);
  await expect(attach).toHaveCount(0);
  expect(reads).toEqual([]);
  await panel
    .getByRole("button", { name: "Load my saved attempts for this reading" })
    .click();
  await expect(attach).toBeVisible();
  await expect(attach).not.toBeChecked();
  await attach.check();
  await panel
    .getByLabel("Message to the teaching assistant")
    .fill("Does the interval matter?");
  const sent = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      request.url().startsWith(companionAddress + "/agent/conversations/"),
  );
  await panel
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  expect((await sent).postDataJSON().noteIds).toHaveLength(1);
});
