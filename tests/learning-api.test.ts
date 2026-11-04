import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createApiProvider } from "../scripts/lib/learning-api.ts";
import {
  apiModelJson,
  apiModelUrl,
  inspectApiModel,
  listApiModels,
  validateApiModelOptions,
  type ApiModelOptions,
} from "../scripts/lib/learning-api-model.ts";
import { localModelUrl } from "../scripts/lib/learning-local-model.ts";
import { parseLearningSettings } from "../scripts/lib/learning-settings.ts";
import { migrateLearningDirectory } from "../scripts/lib/learning-storage.ts";
import { openLearningNotebook } from "../scripts/lib/learning-notebook.ts";
import { openLearningConversations } from "../scripts/lib/learning-conversations.ts";

const key = "synthetic-api-secret-never-written";
const model = "example-chat";
const options: ApiModelOptions = {
  provider: "openai",
  url: "https://api.openai.com/v1",
  model,
  tools: "none",
  contextWindow: 8192,
};
const noTool = async () => {
  throw new Error("No tool should run");
};
const answer = (content = "A plain discussion reply") => ({
  model,
  choices: [{ finish_reason: "stop", message: { role: "assistant", content } }],
});
const call = (
  name = "observe_demo",
  args: unknown = { demoId: "demo-cache-decision-lab" },
) => ({
  model,
  choices: [
    {
      finish_reason: "tool_calls",
      message: {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "synthetic-call",
            type: "function",
            function: { name, arguments: JSON.stringify(args) },
          },
        ],
      },
    },
  ],
});
async function directory(t: test.TestContext) {
  const dir = await mkdtemp(path.join(tmpdir(), "book-api-model-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
function mockApi(
  t: test.TestContext,
  reply: (body: any, init: RequestInit) => unknown | Promise<unknown> = () =>
    answer(),
) {
  const requests: { url: string; init: RequestInit; body: any }[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request, init: RequestInit = {}) => {
      const url = String(input);
      const body = init.body ? JSON.parse(String(init.body)) : null;
      requests.push({ url, init, body });
      assert.equal(init.redirect, "error");
      if (url.endsWith("/models"))
        return Response.json({
          data: [{ id: model }, { id: "another-model" }],
        });
      return Response.json(await reply(body, init));
    },
  );
  return {
    requests,
    completions: () => requests.filter(({ body }) => body !== null),
  };
}

test("API configuration separates HTTPS credentials from local transport and binds named providers to their endpoints", async (t) => {
  assert.equal(
    apiModelUrl("https://gateway.example/api/v1/"),
    "https://gateway.example/api/v1",
  );
  for (const url of [
    "http://gateway.example/v1",
    "https://user:key@gateway.example/v1",
    "https://gateway.example/v1?key=secret",
    "https://gateway.example/v1#secret",
    "https://gateway.example/v1?",
    "https://gateway.example/v1#",
    " https://gateway.example/v1",
    "https://gateway.example\\@elsewhere.example/v1",
  ])
    assert.throws(() => apiModelUrl(url), /HTTPS API base URL/);
  assert.throws(() => localModelUrl(options.url), /loopback/);
  assert.throws(
    () =>
      validateApiModelOptions({ ...options, url: "https://other.example/v1" }),
    /standard API URL/,
  );
  validateApiModelOptions({
    ...options,
    provider: "compatible",
    url: "https://other.example/api/v1",
  });
  for (const contextWindow of [0, 4095, 262145, 8192.5])
    assert.throws(
      () => validateApiModelOptions({ ...options, contextWindow }),
      /context/,
    );
  for (const outputTokens of [0, 255, 32769, 8192, 4096.5])
    assert.throws(
      () => validateApiModelOptions({ ...options, outputTokens }),
      /api-output/,
    );
  assert.throws(
    () => validateApiModelOptions({ ...options, contextWindow: 4096 }),
    /api-output/,
  );
  validateApiModelOptions({
    ...options,
    contextWindow: 4096,
    outputTokens: 1024,
  });
  assert.equal(
    parseLearningSettings({
      provider: "api",
      api: options,
      apiKeyEnv: "STUDY_API_KEY",
    }).provider,
    "api",
  );
  assert.throws(
    () => parseLearningSettings({ provider: "api" }),
    /settings are invalid/,
  );
  for (const apiKeyEnv of ["", "key=value", "1KEY", key + "\n"])
    assert.throws(
      () => parseLearningSettings({ provider: "api", api: options, apiKeyEnv }),
      /settings are invalid/,
    );
  const network = mockApi(t);
  await assert.rejects(inspectApiModel(options, ""), /key is missing/);
  await assert.rejects(
    inspectApiModel(options, "key\r\nAuthorization: injected"),
    /key is missing/,
  );
  assert.equal(network.requests.length, 0);
});

test("model discovery is read-only, uses only header authentication, and never silently picks a different model", async (t) => {
  const network = mockApi(t);
  assert.deepEqual(await listApiModels(options, key), [model, "another-model"]);
  assert.deepEqual(await inspectApiModel(options, key), {
    model,
    contextWindow: 8192,
    version: null,
  });
  await assert.rejects(
    inspectApiModel({ ...options, model: "not-available" }, key),
    /not listed/,
  );
  assert.equal(network.completions().length, 0);
  for (const request of network.requests) {
    assert.equal(request.url, "https://api.openai.com/v1/models");
    assert.equal(
      new Headers(request.init.headers).get("Authorization"),
      `Bearer ${key}`,
    );
    assert.equal(request.init.body, undefined);
    assert.equal(request.init.method, undefined);
  }
});

test("API replies use the selected dialect, retain plain text, and keep credentials out of wire histories", async (t) => {
  const network = mockApi(t, () =>
    answer('{"reply":"This remains ordinary assistant text"}'),
  );
  for (const [provider, url] of [
    ["openai", "https://api.openai.com/v1"],
    ["anthropic", "https://api.anthropic.com/v1"],
    ["gemini", "https://generativelanguage.googleapis.com/v1beta/openai"],
    ["openrouter", "https://openrouter.ai/api/v1"],
    ["compatible", "https://example.test/custom/v1"],
  ] as const) {
    const dir = await directory(t);
    const api = await createApiProvider({
      ...options,
      provider,
      url,
      directory: dir,
      apiKey: key,
    });
    const reply = await api.run(
      null,
      "My deliberately selected text",
      noTool,
      () => {},
    );
    api.close();
    assert.equal(
      typeof reply === "string" ? reply : reply.text,
      '{"reply":"This remains ordinary assistant text"}',
    );
    assert.match(
      typeof reply === "string" ? "" : reply.notices.join(),
      /Discussion-only API model/,
    );
    const request = network.completions().at(-1)!;
    assert.equal(request.url, `${url}/chat/completions`);
    assert.equal(request.body.model, model);
    assert.equal(request.body.stream, false);
    assert.equal(
      request.body[
        provider === "openai" ? "max_completion_tokens" : "max_tokens"
      ],
      4096,
    );
    assert.equal(
      request.body[
        provider === "openai" ? "max_tokens" : "max_completion_tokens"
      ],
      undefined,
    );
    for (const field of [
      "temperature",
      "reasoning_effort",
      "response_format",
      "tools",
      "apiKey",
    ])
      assert.equal(request.body[field], undefined);
    assert.match(
      JSON.stringify(request.body.messages),
      /My deliberately selected text/,
    );
    assert.doesNotMatch(JSON.stringify(request.body), new RegExp(key));
    assert.equal(
      new Headers(request.init.headers).get("Authorization"),
      `Bearer ${key}`,
    );
    assert.equal(
      new Headers(request.init.headers).get("anthropic-version"),
      provider === "anthropic" ? "2026-10-21" : null,
    );
    const listing = network.requests.find(
      (request) => request.url === `${url}/models`,
    )!;
    assert.equal(
      new Headers(listing.init.headers).get("anthropic-version"),
      provider === "anthropic" ? "2026-10-21" : null,
    );
    const db = new DatabaseSync(path.join(dir, "api-provider.sqlite"), {
      readOnly: true,
    });
    try {
      assert.equal(db.prepare("PRAGMA user_version").get()!.user_version, 1);
      const rows = db.prepare("SELECT body FROM api_sessions").all();
      assert.match(JSON.stringify(rows), /My deliberately selected text/);
      assert.doesNotMatch(
        JSON.stringify(rows),
        /synthetic-api-secret|Authorization|Bearer/,
      );
    } finally {
      db.close();
    }
  }
});

test("API context resumes after restart/key rotation and refuses another backend before sending private history", async (t) => {
  const dir = await directory(t);
  const network = mockApi(t);
  let thread = "";
  let api = await createApiProvider({
    ...options,
    directory: dir,
    apiKey: key,
  });
  await api.run(null, "Original selected note text", noTool, (id) => {
    thread = id;
  });
  assert.match(thread, /^api-/);
  api.close();
  api = await createApiProvider({
    ...options,
    directory: dir,
    apiKey: "rotated-synthetic-secret",
  });
  await api.run(thread, "Edited note text", noTool, () => {});
  const resumed = network.completions().at(-1)!;
  assert.match(
    JSON.stringify(resumed.body.messages),
    /Original selected note text/,
  );
  assert.match(JSON.stringify(resumed.body.messages), /Edited note text/);
  assert.equal(
    new Headers(resumed.init.headers).get("Authorization"),
    "Bearer rotated-synthetic-secret",
  );
  assert.throws(
    () => api.validateThread!("local-11111111-1111-4111-8111-111111111111"),
    /another provider/,
  );
  api.close();
  const before = network.completions().length;
  for (const changed of [
    { tools: "native" as const },
    { model: "another-model" },
    { provider: "compatible" as const },
    { provider: "compatible" as const, url: "https://other.example/v1" },
  ]) {
    const other = await createApiProvider({
      ...options,
      ...changed,
      directory: dir,
      apiKey: key,
    });
    try {
      await assert.rejects(
        other.run(thread, "Do not send", noTool, () => {}),
        /different endpoint, model or tool mode/,
      );
    } finally {
      other.close();
    }
  }
  assert.equal(network.completions().length, before);
  const notebook = openLearningNotebook(dir);
  notebook.close();
  const copy = `${dir}-copy`;
  t.after(() => rm(copy, { recursive: true, force: true }));
  assert.match(
    migrateLearningDirectory(dir, copy, true).providerContinuity,
    /API transcripts copied/,
  );
  assert.deepEqual(
    await readFile(path.join(dir, "api-provider.sqlite")),
    await readFile(path.join(copy, "api-provider.sqlite")),
  );
  const copied = await createApiProvider({
    ...options,
    directory: copy,
    apiKey: key,
  });
  copied.validateThread!(thread);
  copied.close();
  const filename = path.join(dir, "api-provider.sqlite");
  const future = new DatabaseSync(filename);
  future.exec("PRAGMA user_version=2");
  future.close();
  const bytes = await readFile(filename);
  await assert.rejects(
    createApiProvider({ ...options, directory: dir, apiKey: key }),
    /newer companion/,
  );
  assert.deepEqual(await readFile(filename), bytes);
  await assert.rejects(
    async () => migrateLearningDirectory(dir, `${dir}-future`, true),
    /newer companion/,
  );
});

test("API native calls pass validated arguments and actual callback results; discussion mode cannot execute them", async (t) => {
  const dir = await directory(t);
  let malformed = "";
  const network = mockApi(t, (body) => {
    if (body.messages.at(-1).role === "tool")
      return answer("The student declined the proposed change.");
    const result = call("change_demo", {
      demoId: "demo-cache-decision-lab",
      controlId: "mean-time",
      value: 0.2,
    });
    if (malformed === "unknown")
      result.choices[0].message.tool_calls.push({
        id: "unknown-call",
        type: "function",
        function: { name: "run_shell", arguments: "{}" },
      });
    if (malformed === "duplicate")
      result.choices[0].message.tool_calls.push({
        ...result.choices[0].message.tool_calls[0],
      });
    if (malformed === "empty")
      result.choices[0].message.tool_calls[0].function.name = "";
    return result;
  });
  const api = await createApiProvider({
    ...options,
    tools: "native",
    directory: dir,
    apiKey: key,
  });
  let calls = 0;
  const reply = await api.run(
    null,
    "Propose a bounded change",
    async (name, args) => {
      calls++;
      assert.equal(name, "change_demo");
      assert.deepEqual(args, {
        demoId: "demo-cache-decision-lab",
        controlId: "mean-time",
        value: 0.2,
      });
      return { accepted: false, reason: "Student declined" };
    },
    () => {},
  );
  assert.equal(calls, 1);
  assert.match(typeof reply === "string" ? reply : reply.text, /declined/);
  const followup = network.completions().at(-1)!.body;
  assert.equal(followup.messages.at(-1).role, "tool");
  assert.match(followup.messages.at(-1).content, /Student declined/);
  assert.equal(
    followup.messages.at(-2).tool_calls[0].id,
    followup.messages.at(-1).tool_call_id,
  );
  assert.equal(followup.tools.length, 3);
  for (const [mode, expected] of [
    ["unknown", /unknown tool/],
    ["duplicate", /invalid tool request/],
    ["empty", /unknown tool/],
  ] as const) {
    malformed = mode;
    await assert.rejects(
      api.run(
        null,
        "Reject the whole malformed batch",
        async () => {
          calls++;
        },
        () => {},
      ),
      expected,
    );
  }
  assert.equal(calls, 1);
  api.close();
  const discussion = await createApiProvider({
    ...options,
    directory: dir,
    apiKey: key,
  });
  try {
    await assert.rejects(
      discussion.run(null, "No tool permission", noTool, () => {}),
      /discussion only/,
    );
  } finally {
    discussion.close();
  }
});

test("API transport failures retain useful status guidance without exposing provider bodies, keys, or network diagnostics", async (t) => {
  let status = 401;
  const body = `PRIVATE_PROVIDER_DIAGNOSTIC ${key}`;
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, init: RequestInit) => {
      assert.equal(init.redirect, "error");
      return new Response(body, {
        status,
        headers: { Location: "https://elsewhere.example/steal" },
      });
    },
  );
  for (const [code, message] of [
    [401, /authentication/],
    [403, /permissions/],
    [402, /credit/],
    [404, /not found/],
    [429, /quota/],
    [400, /model request/],
    [503, /availability/],
    [302, /service could not/],
  ] as const) {
    status = code;
    await assert.rejects(
      apiModelJson(`${options.url}/models`, key, AbortSignal.timeout(1000)),
      (error: Error) => {
        assert.match(error.message, message);
        assert.doesNotMatch(
          error.message,
          /PRIVATE_PROVIDER_DIAGNOSTIC|synthetic-api-secret|elsewhere/,
        );
        return true;
      },
    );
  }
  status = 200;
  await assert.rejects(
    apiModelJson(`${options.url}/models`, key, AbortSignal.timeout(1000)),
    /invalid JSON/,
  );
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error(body);
  });
  await assert.rejects(
    apiModelJson(`${options.url}/models`, key, AbortSignal.timeout(1000)),
    (error: Error) => {
      assert.match(error.message, /network and HTTPS/);
      assert.doesNotMatch(
        error.message,
        /PRIVATE_PROVIDER_DIAGNOSTIC|synthetic-api-secret/,
      );
      return true;
    },
  );
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("x".repeat(512001)),
  );
  await assert.rejects(
    apiModelJson(
      `${options.url}/chat/completions`,
      key,
      AbortSignal.timeout(1000),
      {},
    ),
    /too large/,
  );
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.error(new Error(body));
          },
        }),
      ),
  );
  await assert.rejects(
    apiModelJson(`${options.url}/models`, key, AbortSignal.timeout(1000)),
    (error: Error) => {
      assert.match(error.message, /interrupted/);
      assert.doesNotMatch(
        error.message,
        /PRIVATE_PROVIDER_DIAGNOSTIC|synthetic-api-secret/,
      );
      return true;
    },
  );
});

test("stopping an API reply aborts its request and preserves an interrupted turn for recovery", async (t) => {
  const dir = await directory(t);
  let began!: () => void;
  const started = new Promise<void>((resolve) => {
    began = resolve;
  });
  let blocked = true;
  const network = mockApi(t, async (_body, init) => {
    if (blocked) {
      began();
      await new Promise<void>((_resolve, reject) =>
        init.signal!.addEventListener(
          "abort",
          () => reject(new Error("PRIVATE_PROVIDER_DIAGNOSTIC")),
          { once: true },
        ),
      );
    }
    return answer("Recovered after stopping");
  });
  const api = await createApiProvider({
    ...options,
    directory: dir,
    apiKey: key,
  });
  t.after(() => api.close());
  let thread = "";
  const run = api.run(null, "Interrupted private question", noTool, (id) => {
    thread = id;
  });
  const rejected = assert.rejects(run, /Stopped/);
  await started;
  await api.cancel();
  await rejected;
  blocked = false;
  const reply = await api.run(thread, "Resume", noTool, () => {});
  assert.match(
    typeof reply === "string" ? "" : reply.notices.join(),
    /interrupted/,
  );
  assert.doesNotMatch(
    JSON.stringify(network.completions().at(-1)!.body),
    /Interrupted private question/,
  );
  const db = new DatabaseSync(path.join(dir, "api-provider.sqlite"), {
    readOnly: true,
  });
  try {
    assert.match(
      JSON.stringify(db.prepare("SELECT body FROM api_sessions").all()),
      /Interrupted private question/,
    );
  } finally {
    db.close();
  }
});

test("API conversations expose provider/model provenance while selected notes and credentials stay within their intended boundaries", async (t) => {
  const dir = await directory(t);
  const network = mockApi(t);
  const notebook = openLearningNotebook(dir);
  t.after(() => notebook.close());
  const source = {
    url: "https://book.test/reading/",
    title: "Reading",
    kind: "page",
    anchor: "",
    excerpt: "Selected source",
    revision: null,
    conceptIds: [],
  };
  const note = notebook.saveEntry({
    kind: "attempt",
    source,
    title: "Selected",
    body: "Selected note body",
  });
  notebook.saveEntry({
    kind: "scratch",
    source,
    title: "Unselected",
    body: "PRIVATE_UNSELECTED_NOTE",
  });
  const api = await createApiProvider({
    ...options,
    directory: dir,
    apiKey: key,
  });
  const conversations = openLearningConversations(dir, notebook, api);
  t.after(() => conversations.close());
  const conversation = conversations.start({ source }, "https://book.test");
  conversations.send(
    conversation.id,
    {
      text: "Explain",
      mode: "explanation",
      browserId: "11111111-1111-4111-8111-111111111111",
      noteIds: [note.id],
    },
    "session",
    "https://book.test",
  );
  const deadline = Date.now() + 1000;
  while (
    conversations.get(conversation.id).state === "working" &&
    Date.now() < deadline
  )
    await new Promise((resolve) => setTimeout(resolve, 5));
  const saved = conversations.get(conversation.id);
  assert.equal(saved.state, "idle", JSON.stringify(saved));
  assert.equal(saved.messages.at(-1)!.teaching!.provider.name, "OpenAI API");
  assert.equal(saved.messages.at(-1)!.teaching!.provider.model, model);
  assert.match(
    JSON.stringify(network.completions()[0]!.body),
    /Selected note body/,
  );
  assert.doesNotMatch(
    JSON.stringify(network.completions()[0]!.body),
    /PRIVATE_UNSELECTED_NOTE|synthetic-api-secret/,
  );
  assert.doesNotMatch(
    JSON.stringify({
      teaching: conversations.teaching,
      capabilities: conversations.capabilities,
      saved,
      export: notebook.export(),
    }),
    /synthetic-api-secret|Bearer|Authorization|apiKey/,
  );
});

test("Anthropic model discovery follows its documented pagination and never treats an incomplete catalog as complete", async (t) => {
  const urls: string[] = [];
  let repeat = false;
  t.mock.method(
    globalThis,
    "fetch",
    async (input: unknown, init: RequestInit) => {
      const url = String(input);
      urls.push(url);
      assert.equal(
        new Headers(init.headers).get("Authorization"),
        `Bearer ${key}`,
      );
      assert.equal(
        new Headers(init.headers).get("anthropic-version"),
        "2026-10-21",
      );
      assert.equal(init.body, undefined);
      return Response.json(
        url.includes("after_id") && !repeat
          ? {
              data: [{ id: "claude-sonnet-4-6", type: "model" }],
              has_more: false,
              last_id: "claude-sonnet-4-6",
            }
          : {
              data: [{ id: "claude-opus-5-5", type: "model" }],
              has_more: true,
              last_id: "claude-opus-5-5",
            },
      );
    },
  );
  const provider = {
    provider: "anthropic" as const,
    url: "https://api.anthropic.com/v1",
  };
  assert.deepEqual(await listApiModels(provider, key), [
    "claude-opus-5-5",
    "claude-sonnet-4-6",
  ]);
  assert.deepEqual(urls, [
    "https://api.anthropic.com/v1/models",
    "https://api.anthropic.com/v1/models?after_id=claude-opus-5-5",
  ]);
  repeat = true;
  await assert.rejects(listApiModels(provider, key), /invalid continuation/);
});

test("Gemini opaque thought signatures stay in their exact tool/message positions through callbacks and restart", async (t) => {
  const dir = await directory(t);
  let round = 0;
  const signatureA = "opaque-first-signature+/==";
  const signatureB = "opaque-second-signature+/==";
  const signatureText = "opaque-final-signature+/==";
  const network = mockApi(t, () => {
    round++;
    if (round > 2) {
      const result = answer("Only this explanation is visible") as any;
      result.choices[0].message.extra_content = {
        google: {
          thought_signature: signatureText,
          unrelated: "DO_NOT_REPLAY",
        },
        unrelated: "DO_NOT_REPLAY",
      };
      return result;
    }
    const result = call() as any;
    result.choices[0].message.tool_calls[0].id = `signed-call-${round}`;
    result.choices[0].message.tool_calls[0].extra_content = {
      google: {
        thought_signature: round === 1 ? signatureA : signatureB,
        unrelated: "DO_NOT_REPLAY",
      },
    };
    result.choices[0].message.tool_calls[0].unrelated = "DO_NOT_REPLAY";
    return result;
  });
  const gemini = {
    ...options,
    provider: "gemini" as const,
    url: "https://generativelanguage.googleapis.com/v1beta/openai",
    tools: "native" as const,
  };
  let api = await createApiProvider({ ...gemini, directory: dir, apiKey: key });
  let thread = "";
  const reply = await api.run(
    null,
    "Read actual observations",
    async () => ({ observed: "Only actual callback data" }),
    (id) => {
      thread = id;
    },
  );
  assert.equal(
    typeof reply === "string" ? reply : reply.text,
    "Only this explanation is visible",
  );
  assert.doesNotMatch(JSON.stringify(reply), /opaque-|DO_NOT_REPLAY/);
  const third = network.completions()[2]!.body.messages;
  const signed = third.filter((message: any) => message.tool_calls);
  assert.deepEqual(
    signed.map((message: any) => message.tool_calls[0].extra_content),
    [
      { google: { thought_signature: signatureA } },
      { google: { thought_signature: signatureB } },
    ],
  );
  assert.equal(
    third.filter((message: any) => message.role === "tool").length,
    2,
  );
  assert.doesNotMatch(JSON.stringify(third), /DO_NOT_REPLAY/);
  api.close();
  api = await createApiProvider({ ...gemini, directory: dir, apiKey: key });
  try {
    await api.run(
      thread,
      "Resume from the original signed transcript",
      noTool,
      () => {},
    );
    const replay = network.completions().at(-1)!.body.messages;
    assert.deepEqual(
      replay.find(
        (message: any) =>
          message.content === "Only this explanation is visible",
      ).extra_content,
      { google: { thought_signature: signatureText } },
    );
    assert.deepEqual(
      replay
        .filter((message: any) => message.tool_calls)
        .map((message: any) => message.tool_calls[0].extra_content),
      signed.map((message: any) => message.tool_calls[0].extra_content),
    );
  } finally {
    api.close();
  }
});

test("Gemini rejects invalid or over-budget signatures before executing any proposed tool", async (t) => {
  const dir = await directory(t);
  let signature: unknown = { invalid: true };
  mockApi(t, () => {
    const result = call() as any;
    result.choices[0].message.tool_calls[0].extra_content = {
      google: { thought_signature: signature },
    };
    return result;
  });
  const api = await createApiProvider({
    ...options,
    provider: "gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/openai",
    tools: "native",
    directory: dir,
    apiKey: key,
  });
  t.after(() => api.close());
  let calls = 0;
  for (const [value, expected] of [
    [{}, /continuation metadata/],
    ["x".repeat(128001), /oversized private continuation/],
    ["x".repeat(32000), /API context budget/],
  ] as const) {
    signature = value;
    await assert.rejects(
      api.run(
        null,
        "Reject before tool side effects",
        async () => {
          calls++;
        },
        () => {},
      ),
      expected,
    );
  }
  assert.equal(calls, 0);
});

test("changing output allowance changes the bounded request and omitted history stays omitted across tool rounds", async (t) => {
  const dir = await directory(t);
  let initial = true;
  const network = mockApi(t, (body) => {
    if (initial) return answer("Old response " + "x".repeat(4500));
    return body.messages.at(-1).role === "tool"
      ? answer("Observed after the old turn was omitted")
      : call();
  });
  let thread = "";
  let api = await createApiProvider({
    ...options,
    contextWindow: 4096,
    outputTokens: 1024,
    tools: "native",
    directory: dir,
    apiKey: key,
  });
  await api.run(null, "Old complete question", noTool, (id) => {
    thread = id;
  });
  initial = false;
  const reply = await api.run(
    thread,
    "Current selected question",
    async () => ({ observed: true }),
    () => {},
  );
  assert.match(
    typeof reply === "string" ? "" : reply.notices.join(),
    /older completed turn/,
  );
  for (const request of network.completions().slice(1)) {
    assert.doesNotMatch(
      JSON.stringify(request.body.messages),
      /Old complete question|Old response/,
    );
    assert.match(
      JSON.stringify(request.body.messages),
      /Current selected question/,
    );
  }
  api.close();
  api = await createApiProvider({
    ...options,
    outputTokens: 2048,
    tools: "native",
    directory: dir,
    apiKey: key,
  });
  try {
    await api.run(
      thread,
      "The same conversation with another output allowance",
      async () => ({}),
      () => {},
    );
    assert.equal(
      network.completions().at(-1)!.body.max_completion_tokens,
      2048,
    );
  } finally {
    api.close();
  }
});
