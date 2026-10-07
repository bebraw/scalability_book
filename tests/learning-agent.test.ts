import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, copyFile, chmod } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  createCodexProvider,
  type LearningProvider,
} from "../scripts/lib/learning-codex.ts";
import { openLearningConversations } from "../scripts/lib/learning-conversations.ts";
import { openLearningNotebook } from "../scripts/lib/learning-notebook.ts";
import {
  supportNeeds,
  teachingPolicyIdentity,
} from "../shared/learning-agent.ts";

const source = {
  url: "https://scalableweb.dev/demos/",
  anchor: "demo-queue-balance-lab",
  title: "Queue balance lab",
  kind: "demo",
  excerpt: "Check the observation interval",
  revision: null,
  conceptIds: ["queue"],
};
const waitUntil = async (fn: () => boolean) => {
  const end = Date.now() + 2000;
  while (!fn()) {
    assert.ok(Date.now() < end, "Synthetic turn did not finish");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};
test("Codex adapter initializes, resumes, uses bounded dynamic tools, declines machine approval and retains disconnect errors", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "book-codex-test-"));
  await writeFile(path.join(directory, "auth.json"), "{}", { mode: 0o600 });
  const binary = path.join(directory, "fake-codex");
  await copyFile(
    new URL("./fixtures/learning-codex-app-server.mjs", import.meta.url),
    binary,
  );
  const text = await import("node:fs/promises").then((fs) =>
    fs.readFile(binary, "utf8"),
  );
  await writeFile(binary, `#!${process.execPath}\n${text}`);
  await chmod(binary, 0o700);
  const provider = await createCodexProvider({ home: directory, binary });
  try {
    assert.equal(provider.version, "0.154.0");
    assert.deepEqual(provider.teaching, teachingPolicyIdentity);
    let thread = "";
    let calls = 0;
    const tool = async (name: string, args: unknown) => {
      assert.equal(name, "observe_demo");
      assert.deepEqual(args, { demoId: source.anchor });
      calls++;
      return { observation: "10 = 20 × 0.5" };
    };
    await writeFile(`${binary}.reject-initialize`, "");
    await assert.rejects(
      provider.run(null, "initialization failure", tool, () => {}),
      /rejected/,
    );
    assert.match(
      await provider.run(null, "question", tool, (id) => {
        thread = id;
      }),
      /actual observation/,
    );
    assert.equal(thread, "synthetic-thread");
    await provider.run(thread, "another question", tool, (id) =>
      assert.equal(id, thread),
    );
    assert.equal(calls, 2);
    await assert.rejects(
      provider.run(thread, "disconnect", tool, () => {}),
      /disconnected/,
    );
    assert.match(
      await provider.run(thread, "reconnect", tool, () => {}),
      /actual observation/,
    );
  } finally {
    provider.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("policy metadata describes each applied exchange without rewriting earlier conversations", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "book-teaching-policy-"));
  const notebook = openLearningNotebook(directory);
  const provider: LearningProvider = {
    name: "Synthetic",
    async run(_thread, _text, _tool, save) {
      save("retained-thread");
      return "Synthetic reply";
    },
    async cancel() {},
    close() {},
  };
  let conversations = openLearningConversations(directory, notebook, provider);
  const input = {
    browserId: randomUUID(),
    text: "Please explain.",
    mode: "explanation",
    noteIds: [],
  };
  try {
    const conversation = conversations.start(
      { source },
      "https://scalableweb.dev",
    );
    const send = async () => {
      conversations.send(
        conversation.id,
        input,
        "session",
        "https://scalableweb.dev",
      );
      await waitUntil(
        () => conversations.get(conversation.id).state === "idle",
      );
    };
    await send();
    const legacy = conversations.get(conversation.id).messages;
    assert.equal(legacy[0]!.teaching, undefined);
    assert.equal(legacy[1]!.teaching, undefined);
    conversations.close();
    provider.version = "test-1";
    provider.teaching = { ...teachingPolicyIdentity };
    conversations = openLearningConversations(directory, notebook, provider);
    await send();
    const current = {
      policy: teachingPolicyIdentity,
      provider: { name: "Synthetic", version: "test-1" },
    };
    assert.deepEqual(conversations.teaching, current);
    assert.deepEqual(
      conversations.get(conversation.id).messages.slice(0, 2),
      legacy,
    );
    assert.deepEqual(
      conversations
        .get(conversation.id)
        .messages.slice(2)
        .map((item) => item.teaching),
      [current, current],
    );
    conversations.close();
    provider.version = "test-2";
    provider.teaching = {
      ...teachingPolicyIdentity,
      version: "synthetic-next",
    };
    conversations = openLearningConversations(directory, notebook, provider);
    await send();
    const messages = conversations.get(conversation.id).messages;
    assert.deepEqual(messages.slice(0, 2), legacy);
    assert.deepEqual(messages[3]!.teaching, current);
    assert.equal(messages[5]!.teaching!.policy.version, "synthetic-next");
    assert.equal(messages[5]!.teaching!.provider.version, "test-2");
    assert.equal(
      conversations.get(conversation.id).threadId,
      "retained-thread",
    );
    assert.deepEqual(notebook.judgments(), []);
    assert.equal(notebook.entries().length, 0);
  } finally {
    conversations.close();
    notebook.close();
    await rm(directory, { recursive: true, force: true });
  }
});
test("dedicated profile refuses inherited configuration and custom skills", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "book-profile-test-"));
  try {
    await writeFile(path.join(directory, "auth.json"), "{}");
    await writeFile(path.join(directory, "config.toml"), "");
    await assert.rejects(
      createCodexProvider({ home: directory }),
      /without config.toml/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("conversations persist independently, send only selected notes, and bound observations to the initiating session and browser", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "book-conversation-test-"),
  );
  const notebook = openLearningNotebook(directory);
  let prompt = "";
  const provider: LearningProvider = {
    name: "Synthetic",
    async run(_thread, text, tool, save) {
      prompt = text;
      save("synthetic-thread");
      await assert.rejects(
        tool("read_book", { path: "/api/courses/private" }),
        /outside/,
      );
      const observation = await tool("observe_demo", { demoId: source.anchor });
      return `Observed ${JSON.stringify(observation)}`;
    },
    async cancel() {},
    close() {},
  };
  let conversations = openLearningConversations(directory, notebook, provider);
  const initial = notebook.saveEntry({
    kind: "attempt",
    source,
    title: "My prediction",
    body: "I expect the averages to agree.",
  });
  notebook.saveEntry({
    kind: "scratch",
    source,
    title: "Unselected",
    body: "PRIVATE UNSELECTED MATERIAL",
  });
  const browser = randomUUID();
  const session = "synthetic-session";
  try {
    const conversation = conversations.start(
      { source },
      "https://scalableweb.dev",
    );
    const large = Array.from({ length: 8 }, (_, index) =>
      notebook.saveEntry({
        kind: "scratch",
        source,
        title: `Long selected note ${index}`,
        body: "x".repeat(16_000),
      }),
    );
    assert.throws(
      () =>
        conversations.send(
          conversation.id,
          {
            browserId: browser,
            text: "Too much context",
            mode: "check",
            noteIds: large.map((note) => note.id),
          },
          session,
          "https://scalableweb.dev",
        ),
      /Select fewer notes/,
    );
    assert.equal(conversations.get(conversation.id).state, "idle");
    assert.equal(conversations.get(conversation.id).messages.length, 0);
    conversations.send(
      conversation.id,
      {
        browserId: browser,
        text: "Check the interval",
        mode: "check",
        noteIds: [initial.id],
      },
      session,
      "https://scalableweb.dev",
    );
    await waitUntil(() => conversations.requests(session, browser).length > 0);
    assert.equal(prompt.includes("PRIVATE UNSELECTED MATERIAL"), false);
    assert.equal(prompt.includes(initial.body), true);
    assert.equal(conversations.requests("other-session", browser).length, 0);
    assert.equal(conversations.requests(session, randomUUID()).length, 0);
    const request = conversations.requests(session, browser)[0]!;
    assert.equal(request.conversationId, conversation.id);
    assert.throws(
      () =>
        conversations.respond(
          request.id,
          { browserId: browser, success: true },
          "other-session",
        ),
      /not found/,
    );
    assert.throws(
      () =>
        conversations.respond(
          request.id,
          { browserId: randomUUID(), success: true },
          session,
        ),
      /started/,
    );
    conversations.respond(
      request.id,
      {
        browserId: browser,
        success: true,
        result: { equation: "10 = 20 × .5" },
      },
      session,
    );
    await waitUntil(() => conversations.get(conversation.id).state === "idle");
    assert.equal(conversations.get(conversation.id).messages.length, 3);
    assert.deepEqual(conversations.get(conversation.id).messages[0]!.noteIds, [
      initial.id,
    ]);
    conversations.close();
    conversations = openLearningConversations(directory, notebook, null);
    assert.equal(
      conversations.get(conversation.id).threadId,
      "synthetic-thread",
    );
    assert.equal(notebook.entries().length, 10);
    assert.deepEqual(conversations.get(conversation.id).messages[0]!.noteIds, [
      initial.id,
    ]);
  } finally {
    conversations.close();
    notebook.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("task support is explicit, bounded, retained across restart and optional for old clients", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "book-task-support-"));
  const notebook = openLearningNotebook(directory);
  const prompts: Record<string, unknown>[] = [];
  const provider: LearningProvider = {
    name: "Synthetic",
    async run(_thread, text) {
      prompts.push(JSON.parse(text));
      return "Synthetic response; this check verifies supplied context, not teaching quality.";
    },
    async cancel() {},
    close() {},
  };
  let conversations = openLearningConversations(directory, notebook, provider);
  try {
    notebook.saveEntry({
      kind: "scratch",
      source,
      title: "Private",
      body: "DO NOT SEND THIS UNSELECTED NOTE",
    });
    const conversation = conversations.start(
      { source },
      "https://scalableweb.dev",
    );
    const input = {
      browserId: randomUUID(),
      text: "I am stuck. Please explain directly.",
      goal: "Understand waiting and processing",
      mode: "explanation",
      noteIds: [],
    };
    assert.throws(
      () =>
        conversations.send(
          conversation.id,
          { ...input, supportNeed: "certify-mastery" },
          "session",
          "https://scalableweb.dev",
        ),
      /Choose where/,
    );
    assert.equal(conversations.get(conversation.id).messages.length, 0);
    for (const need of supportNeeds) {
      conversations.send(
        conversation.id,
        { ...input, ...(need === "unspecified" ? {} : { supportNeed: need }) },
        "session",
        "https://scalableweb.dev",
      );
      await waitUntil(
        () => conversations.get(conversation.id).state === "idle",
      );
      const prompt = prompts.at(-1)!;
      assert.equal(prompt.supportNeed, need);
      assert.equal(prompt.helpMode, "explanation");
      assert.deepEqual(prompt.selectedNotes, []);
      assert.equal(JSON.stringify(prompt).includes("DO NOT SEND THIS"), false);
      const routes = prompt.supportResources as {
        id: string;
        url: string;
        definition: string;
      }[];
      assert.deepEqual(
        routes.map((route) => route.id),
        ["queue"],
      );
      assert.equal(routes[0]!.url, "https://scalableweb.dev/concepts/#queue");
      assert.ok(routes[0]!.definition);
      assert.deepEqual(
        conversations.get(conversation.id).messages.at(-2)!.support,
        { mode: "explanation", goal: input.goal, need },
      );
    }
    conversations.close();
    conversations = openLearningConversations(directory, notebook, null);
    assert.equal(
      conversations.get(conversation.id).messages.at(-2)!.support!.need,
      "next-step",
    );
    assert.equal(notebook.entries().length, 1);
    assert.deepEqual(notebook.judgments(), []);
  } finally {
    conversations.close();
    notebook.close();
    await rm(directory, { recursive: true, force: true });
  }
});
