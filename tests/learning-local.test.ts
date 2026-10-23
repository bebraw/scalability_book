import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createLocalProvider } from "../scripts/lib/learning-local.ts";
import {
  localModelUrl,
  inspectLocalModel,
  localModelJson,
} from "../scripts/lib/learning-local-model.ts";
import { migrateLearningDirectory } from "../scripts/lib/learning-storage.ts";
import { openLearningNotebook } from "../scripts/lib/learning-notebook.ts";
import { openLearningConversations } from "../scripts/lib/learning-conversations.ts";
import {
  startSyntheticLocalModel,
  localAnswer,
  localCall,
} from "./fixtures/learning-local-server.ts";
import { randomUUID } from "node:crypto";

const directory = async (t: test.TestContext) => {
  const dir = await mkdtemp(path.join(tmpdir(), "book-local-model-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
};
const noTool = async () => {
  throw new Error("No tool should be called");
};
const replyText = (value: any) =>
  typeof value === "string" ? value : value.text;
test("local endpoints require literal loopback, reject credentials/redirects and require an explicit loaded context", async (t) => {
  assert.equal(localModelUrl("http://[::1]:1234/v1/"), "http://[::1]:1234/v1");
  for (const value of [
    "https://127.0.0.1/v1",
    "http://localhost/v1",
    "http://2130706433/v1",
    "http://127.1/v1",
    "http://example.test/v1",
    "http://x:y@127.0.0.1/v1",
    "http://127.0.0.1/v1?key=x",
    "http://127.0.0.1/v1#x",
    "http://127.0.0.1/api",
    "http://127.0.0.1\\@example.test/v1",
  ])
    assert.throws(() => localModelUrl(value));
  const fake = await startSyntheticLocalModel();
  t.after(() => fake.close());
  const { contextWindow: _, ...unknownContext } = fake.options;
  await assert.rejects(
    inspectLocalModel(unknownContext),
    /Loaded context is not reported/,
  );
  await assert.rejects(
    inspectLocalModel({ ...fake.options, model: "missing" }),
    /not listed/,
  );
  await assert.rejects(
    localModelJson(`${fake.url}/missing`, AbortSignal.timeout(1000)),
    /rejected/,
  );
  const redirect = await import("node:http").then(({ createServer }) =>
    createServer((_request, response) => {
      response.writeHead(302, { Location: `${fake.url}/models` });
      response.end();
    }),
  );
  redirect.listen(0, "127.0.0.1");
  await import("node:events").then(({ once }) => once(redirect, "listening"));
  t.after(() => {
    redirect.closeAllConnections();
    redirect.close();
  });
  const address = redirect.address() as { port: number };
  await assert.rejects(
    localModelJson(
      `http://127.0.0.1:${address.port}/v1/models`,
      AbortSignal.timeout(1000),
    ),
    /unavailable/,
  );
});
test("local conversations replay exact selected context after restart and isolate provider/model/tool identities", async (t) => {
  const dir = await directory(t);
  const fake = await startSyntheticLocalModel();
  t.after(() => fake.close());
  let provider = await createLocalProvider({ ...fake.options, directory: dir });
  let thread = "";
  const first = await provider.run(
    null,
    JSON.stringify({ selectedNotes: [{ body: "Original selected text" }] }),
    noTool,
    (id) => {
      thread = id;
    },
  );
  assert.match(replyText(first), /Synthetic/);
  assert.equal(fake.requests[0].tools, undefined);
  assert.equal(fake.requests[0].reasoning_effort, "none");
  assert.equal(
    typeof first === "string" ? undefined : first.model,
    fake.options.model,
  );
  assert.match(
    typeof first === "string" ? "" : first.notices.join(),
    /Discussion-only/,
  );
  provider.close();
  provider = await createLocalProvider({ ...fake.options, directory: dir });
  t.after(() => provider.close());
  await provider.run(
    thread,
    JSON.stringify({ selectedNotes: [{ body: "Edited selected text" }] }),
    noTool,
    () => {},
  );
  assert.ok(
    JSON.stringify(fake.requests[1].messages).includes(
      "Original selected text",
    ),
  );
  assert.ok(
    JSON.stringify(fake.requests[1].messages).includes("Edited selected text"),
  );
  assert.throws(
    () => provider.validateThread!("codex-thread"),
    /another provider/,
  );
  const other = await createLocalProvider({
    ...fake.options,
    tools: "native",
    directory: dir,
  });
  try {
    assert.throws(
      () => other.validateThread!(thread),
      /different endpoint, model or tool mode/,
    );
  } finally {
    other.close();
  }
  const notebook = openLearningNotebook(dir);
  notebook.close();
  provider.close();
  const next = `${dir}-copy`;
  t.after(() => rm(next, { recursive: true, force: true }));
  migrateLearningDirectory(dir, next, true);
  assert.deepEqual(
    await readFile(path.join(dir, "local-provider.sqlite")),
    await readFile(path.join(next, "local-provider.sqlite")),
  );
  const copied = await createLocalProvider({
    ...fake.options,
    directory: next,
  });
  try {
    copied.validateThread!(thread);
  } finally {
    copied.close();
  }
});
test("bounded context omits whole old turns visibly, preserves current selection, and rejects oversized current context", async (t) => {
  const dir = await directory(t);
  const fake = await startSyntheticLocalModel(() =>
    localAnswer("x".repeat(3600)),
  );
  t.after(() => fake.close());
  const provider = await createLocalProvider({
    ...fake.options,
    contextWindow: 4096,
    directory: dir,
  });
  t.after(() => provider.close());
  let thread = "";
  await provider.run(null, "first question", noTool, (id) => {
    thread = id;
  });
  const reply = await provider.run(
    thread,
    "Current pinned selection",
    noTool,
    () => {},
  );
  assert.match(
    typeof reply === "string" ? "" : reply.notices.join(),
    /older completed turn/,
  );
  assert.equal(
    fake.requests[1].messages.some(
      (item: any) => item.content === "first question",
    ),
    false,
  );
  assert.equal(
    fake.requests[1].messages.at(-1).content,
    "Current pinned selection",
  );
  const count = fake.requests.length;
  await assert.rejects(
    provider.run(thread, "z".repeat(24000), noTool, () => {}),
    /exceeds the local context budget/,
  );
  assert.equal(fake.requests.length, count);
});
test("native tool round trips contain only validated calls and real callback results, including declined changes", async (t) => {
  const dir = await directory(t);
  const fake = await startSyntheticLocalModel((body) =>
    body.messages.at(-1).role === "tool"
      ? localAnswer("The browser result was supplied by the callback.", true)
      : localCall("change_demo", {
          demoId: "demo-cache-decision-lab",
          controlId: "mean-time",
          value: 0.2,
        }),
  );
  t.after(() => fake.close());
  const provider = await createLocalProvider({
    ...fake.options,
    tools: "native",
    directory: dir,
  });
  t.after(() => provider.close());
  let calls = 0;
  await provider.run(
    null,
    "Propose one change",
    async (name, args) => {
      calls++;
      assert.equal(name, "change_demo");
      assert.equal((args as any).value, 0.2);
      throw new Error("private diagnostics must not leak");
    },
    () => {},
  );
  assert.equal(calls, 1);
  assert.equal(fake.requests[1].messages.at(-1).role, "tool");
  assert.match(fake.requests[1].messages.at(-1).content, /unavailable/);
  assert.doesNotMatch(JSON.stringify(fake.requests[1]), /private diagnostics/);
  assert.equal(
    fake.requests[1].messages.at(-2).tool_calls[0].id,
    fake.requests[1].messages.at(-1).tool_call_id,
  );
});
test("malformed replies, unknown tools and truncation fail without executing a batch or erasing context", async (t) => {
  const dir = await directory(t);
  let mode = "unknown";
  const fake = await startSyntheticLocalModel(() => {
    if (mode === "unknown") {
      const result = localCall();
      result.choices[0]!.message.tool_calls.push({
        ...result.choices[0]!.message.tool_calls[0]!,
        id: "bad",
        function: { name: "execute_command", arguments: "{}" },
      });
      return result;
    }
    if (mode === "truncated") {
      const result = localAnswer("incomplete", true);
      result.choices[0]!.finish_reason = "length";
      return result;
    }
    if (mode === "invalid")
      return {
        choices: [
          {
            finish_reason: "stop",
            message: { role: "assistant", content: "" },
          },
        ],
      };
    return localAnswer("Recovered", true);
  });
  t.after(() => fake.close());
  const provider = await createLocalProvider({
    ...fake.options,
    tools: "native",
    directory: dir,
  });
  t.after(() => provider.close());
  let calls = 0,
    thread = "";
  const tool = async () => {
    calls++;
    return {};
  };
  await assert.rejects(
    provider.run(null, "Retain this question", tool, (id) => {
      thread = id;
    }),
    /unknown tool/,
  );
  assert.equal(calls, 0);
  mode = "truncated";
  await assert.rejects(
    provider.run(thread, "second", tool, () => {}),
    /truncated/,
  );
  mode = "invalid";
  await assert.rejects(
    provider.run(thread, "third", tool, () => {}),
    /identify/,
  );
  mode = "ok";
  const reply = await provider.run(thread, "recover", tool, () => {});
  assert.match(
    typeof reply === "string" ? "" : reply.notices.join(),
    /interrupted/,
  );
  assert.equal(
    fake.requests
      .at(-1)
      .messages.some((item: any) => item.content === "Retain this question"),
    false,
  );
});
test("cancel aborts an outstanding request and next turn can resume retained history", async (t) => {
  const dir = await directory(t);
  let blocked = true;
  let unblock: () => void = () => {};
  const fake = await startSyntheticLocalModel(async () => {
    if (blocked)
      await new Promise<void>((resolve) => {
        unblock = resolve;
      });
    return localAnswer("Recovered");
  });
  t.after(() => fake.close());
  const provider = await createLocalProvider({
    ...fake.options,
    directory: dir,
  });
  t.after(() => provider.close());
  let thread = "";
  const run = provider.run(null, "Please wait", noTool, (id) => {
    thread = id;
  });
  void run.catch(() => {});
  while (!fake.requests.length)
    await new Promise((resolve) => setTimeout(resolve, 5));
  await provider.cancel();
  await assert.rejects(run, /Stopped/);
  blocked = false;
  unblock();
  assert.match(
    replyText(await provider.run(thread, "Try again", noTool, () => {})),
    /Recovered/,
  );
});
test("conversation owner retains work and note snapshots and never exports private transcripts", async (t) => {
  const dir = await directory(t);
  const fake = await startSyntheticLocalModel();
  t.after(() => fake.close());
  const notebook = openLearningNotebook(dir);
  t.after(() => notebook.close());
  const source = {
    url: "https://book.test/demos/",
    anchor: "demo-cache-decision-lab",
    title: "Cache decision lab",
    kind: "demo",
    excerpt: "Selected source",
    revision: null,
    conceptIds: ["cache"],
  };
  const note = notebook.saveEntry({
    kind: "attempt",
    source,
    title: "Thinking",
    body: "Original selected note",
  });
  notebook.saveEntry({
    kind: "scratch",
    source,
    title: "Unselected",
    body: "PRIVATE UNSUPPLIED NOTE",
  });
  let provider = await createLocalProvider({ ...fake.options, directory: dir });
  let conversations = openLearningConversations(dir, notebook, provider);
  const conversation = conversations.start({ source }, "https://book.test");
  const send = async () => {
    conversations.send(
      conversation.id,
      {
        text: "Explain",
        mode: "explanation",
        browserId: randomUUID(),
        noteIds: [note.id],
      },
      "session",
      "https://book.test",
    );
    while (conversations.get(conversation.id).state === "working")
      await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(conversations.get(conversation.id).state, "idle");
  };
  await send();
  conversations.close();
  notebook.saveEntry({
    ...note,
    expected: note.revision,
    body: "Edited selected note",
  });
  provider = await createLocalProvider({ ...fake.options, directory: dir });
  conversations = openLearningConversations(dir, notebook, provider);
  t.after(() => conversations.close());
  await send();
  assert.match(
    JSON.stringify(fake.requests[1].messages),
    /Original selected note/,
  );
  assert.match(
    JSON.stringify(fake.requests[1].messages),
    /Edited selected note/,
  );
  assert.doesNotMatch(JSON.stringify(fake.requests), /PRIVATE UNSUPPLIED NOTE/);
  assert.equal(
    conversations.get(conversation.id).messages.at(-1)!.teaching!.provider
      .model,
    fake.options.model,
  );
  assert.equal(
    JSON.stringify(conversations.get(conversation.id)).includes(
      "selectedNotes",
    ),
    false,
  );
  assert.equal(JSON.stringify(notebook.export()).includes("local-"), false);
  const db = new DatabaseSync(path.join(dir, "local-provider.sqlite"), {
    readOnly: true,
  });
  t.after(() => db.close());
  assert.equal(db.prepare("PRAGMA user_version").get()!.user_version, 1);
});

test("oversized responses fail closed, literal reply text is retained, and future transcript schemas remain unchanged", async (t) => {
  const dir = await directory(t);
  let huge = true;
  const fake = await startSyntheticLocalModel(() =>
    localAnswer(huge ? "x".repeat(600000) : "{"),
  );
  t.after(() => fake.close());
  const provider = await createLocalProvider({
    ...fake.options,
    directory: dir,
  });
  await assert.rejects(
    provider.run(null, "Question", noTool, () => {}),
    /too large/,
  );
  huge = false;
  const original = await provider.run(
    null,
    "Valid JSON envelope with literal reply",
    noTool,
    () => {},
  );
  assert.equal(replyText(original), "{");
  provider.close();
  const filename = path.join(dir, "local-provider.sqlite");
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA user_version=2");
  db.close();
  const bytes = await readFile(filename);
  await assert.rejects(
    createLocalProvider({ ...fake.options, directory: dir }),
    /newer companion/,
  );
  assert.deepEqual(await readFile(filename), bytes);
});

test("discussion-only rejects native calls and malformed envelopes; changed returned models cannot silently resume", async (t) => {
  const dir = await directory(t);
  let mode = "native";
  const fake = await startSyntheticLocalModel(() => {
    if (mode === "native") return localCall();
    const result = localAnswer("Recorded reply");
    if (mode === "envelope")
      result.choices[0]!.message.content = JSON.stringify({
        ok: true,
        message: "Wrong configured format",
      });
    if (mode === "changed") result.model = "different-returned-model";
    return result;
  });
  t.after(() => fake.close());
  const provider = await createLocalProvider({
    ...fake.options,
    directory: dir,
  });
  t.after(() => provider.close());
  let calls = 0,
    thread = "";
  await assert.rejects(
    provider.run(
      null,
      "Do not execute",
      async () => {
        calls++;
      },
      () => {},
    ),
    /discussion only/,
  );
  assert.equal(calls, 0);
  mode = "envelope";
  await assert.rejects(
    provider.run(null, "Wrong envelope", noTool, () => {}),
    /reply format/,
  );
  mode = "valid";
  await provider.run(null, "First recorded reply", noTool, (id) => {
    thread = id;
  });
  mode = "changed";
  await assert.rejects(
    provider.run(thread, "Do not silently change model", noTool, () => {}),
    /changed the model/,
  );
});

test("loaded metadata caps the budget, rejects embedding/unloaded models and never substitutes the advertised maximum", async (t) => {
  let type = "llm",
    context = 8192,
    loaded = true;
  const fake = await startSyntheticLocalModel(undefined, () => ({
    models: [
      {
        key: "synthetic-local-model",
        type,
        max_context_length: 262144,
        loaded_instances: loaded
          ? [{ config: { context_length: context } }]
          : [],
      },
    ],
  }));
  t.after(() => fake.close());
  const info = await inspectLocalModel({
    ...fake.options,
    contextWindow: 65536,
  });
  assert.equal(info.contextWindow, 8192);
  assert.equal(info.loadedContext, 8192);
  assert.equal(info.maximumContext, 262144);
  context = 2048;
  await assert.rejects(
    inspectLocalModel(fake.options),
    /loaded context is too small/,
  );
  context = 8192;
  type = "embedding";
  await assert.rejects(inspectLocalModel(fake.options), /embedding model/);
  type = "llm";
  loaded = false;
  await assert.rejects(inspectLocalModel(fake.options), /not loaded/);
  assert.equal(fake.requests.length, 0);
});
