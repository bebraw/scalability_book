import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import test from "node:test";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import worker from "../worker/index.ts";

const endpoint = new URL("https://scalableweb.dev/api/admin/feedback/mcp");
const token = Buffer.alloc(32, 5).toString("base64url");
const authorization = `Bearer ${token}`;
const knownChapter = "advanced-web-boundaries";
const timestamp = "2026-01-01T12:00:00.000Z";
const author = {
  login: "fixture-reader-login",
  id: 123,
  avatarUrl: "https://example.test/private-avatar",
};
const replies = Array.from({ length: 11 }, (_, index) => ({
  author,
  body: `Fixture reply ${index + 1}`,
  createdAt: timestamp,
}));
const openIssue = {
  id: "open-issue",
  chapter: knownChapter,
  paragraphId: "p-example",
  category: "missing-example",
  body: "An illustrative question about the example.",
  createdAt: timestamp,
  anonymous: true,
  author,
  replies,
};
const fixture = {
  [knownChapter]: [
    openIssue,
    {
      ...openIssue,
      id: "open-older",
      body: "Long feedback. ".repeat(50),
      createdAt: "2025-01-01T12:00:00.000Z",
    },
    {
      ...openIssue,
      id: "resolved-issue",
      resolvedAt: timestamp,
      resolutionReason: "fixed",
    },
    { ...openIssue, id: "hidden-issue", hiddenAt: timestamp },
  ],
  "retired-chapter": [
    {
      ...openIssue,
      chapter: "retired-chapter",
      id: "retired-issue",
      resolvedAt: timestamp,
    },
  ],
};

function workerFixture(resolve = false) {
  const storageCalls: string[] = [];
  const resolutions = new Map<string, object>();
  const env = {
    ASSETS: {
      fetch: async () => {
        throw new Error("Unexpected static request");
      },
    },
    ADMIN_GITHUB_LOGINS: "moderator, fixture-owner",
    SESSION_SECRET: "synthetic-session-key-for-tests",
    FEEDBACK_MCP_CREDENTIAL: JSON.stringify({
      login: "Fixture-Owner",
      sha256: createHash("sha256").update(token).digest("hex"),
      ...(resolve ? { resolve } : {}),
    }),
    COMMENTS_KV: {
      async get(key: string) {
        storageCalls.push(key);
        return (
          fixture[key.slice("comments:".length) as keyof typeof fixture] ?? null
        );
      },
      async list(options?: { prefix?: string; cursor?: string }) {
        if (options?.prefix?.startsWith("feedback-resolution:")) {
          const prefix = options.prefix;
          storageCalls.push(prefix);
          return {
            keys: Array.from(resolutions, ([name, metadata]) => ({
              name,
              metadata,
            })).filter(({ name }) => name.startsWith(prefix)),
            list_complete: true as const,
          };
        }
        assert.equal(options?.prefix, "comments:");
        storageCalls.push("list");
        return options?.cursor
          ? {
              keys: [{ name: "comments:retired-chapter" }],
              list_complete: true as const,
            }
          : {
              keys: [{ name: `comments:${knownChapter}` }],
              list_complete: false as const,
              cursor: "next",
            };
      },
      async put(key: string, _value: string, options?: { metadata?: object }) {
        assert.ok(resolve, "Read-only fixture must never write to KV");
        assert.match(
          key,
          /^feedback-resolution:/,
          "A resolution must not rewrite a chapter's comments",
        );
        assert.ok(options?.metadata);
        storageCalls.push(`put:${key}`);
        resolutions.set(key, options.metadata);
      },
    },
  };
  return { env, storageCalls, resolutions };
}

function sessionCookie(env: { SESSION_SECRET: string }, login: string) {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Date.now() + 600_000,
      user: { login },
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", env.SESSION_SECRET)
    .update(payload)
    .digest("base64url");
  return `scalableweb_session=${payload}.${signature}`;
}

test("private comments and confusion markers share submission limits by login and IP", async (t) => {
  const now = Date.parse(timestamp);
  t.mock.timers.enable({ apis: ["Date"], now });
  const window = Math.floor(now / 600_000);
  const campusIp = "192.0.2.1";
  const reader = "fixture-reader";
  const entries = new Map<string, string>([
    [`rate:${window}:login:${reader}`, "9"],
    [`rate:${window}:ip:${campusIp}`, "28"],
  ]);
  const env = {
    ...workerFixture().env,
    COMMENTS_KV: {
      async get(key: string, type?: "json") {
        const value = entries.get(key) ?? null;
        return type === "json" && value ? JSON.parse(value) : value;
      },
      async put(key: string, value: string) {
        entries.set(key, value);
      },
      async list() {
        return { keys: [], list_complete: true as const };
      },
    },
  };
  const submit = (path: string, login: string, ip: string) =>
    worker.fetch(
      new Request(new URL(path, "https://book.test"), {
        method: "POST",
        headers: {
          Cookie: sessionCookie(env, login),
          "CF-Connecting-IP": ip,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chapter: knownChapter,
          paragraphId: "p-example",
          category: "missing-example",
          body: "Could we see an example?",
        }),
      }),
      env,
    );

  assert.equal((await submit("/api/stuck", reader, campusIp)).status, 201);
  const loginLimited = await submit("/api/comments", reader, "192.0.2.2");
  assert.equal(loginLimited.status, 429);
  assert.equal(loginLimited.headers.get("Retry-After"), "600");
  assert.equal(
    (await submit("/api/comments", "fixture-classmate", campusIp)).status,
    201,
  );
  const ipLimited = await submit(
    "/api/stuck",
    "fixture-third-reader",
    campusIp,
  );
  assert.equal(ipLimited.status, 429);
  assert.equal(ipLimited.headers.get("Retry-After"), "600");
  assert.equal(JSON.parse(entries.get(`comments:${knownChapter}`)!).length, 2);
});

test("feedback MCP denies all requests before reading KV unless the owner credential is valid", async () => {
  const { env, storageCalls } = workerFixture();
  const cookie = sessionCookie(env, "fixture-owner");
  const adminApi = new URL("/api/admin/comments", endpoint);

  const denied = [
    await worker.fetch(new Request(endpoint), env),
    await worker.fetch(new Request(endpoint, { headers: { cookie } }), env),
    await worker.fetch(
      new Request(endpoint, {
        headers: {
          authorization: `Bearer ${Buffer.alloc(32, 6).toString("base64url")}`,
          "x-admin": "fixture-owner",
        },
      }),
      env,
    ),
    await worker.fetch(
      new Request(endpoint, {
        method: "OPTIONS",
        headers: { origin: "https://scalableweb.dev", authorization },
      }),
      env,
    ),
    await worker.fetch(new Request(endpoint, { headers: { authorization } }), {
      ...env,
      ADMIN_GITHUB_LOGINS: "moderator",
    }),
    await worker.fetch(new Request(endpoint, { headers: { authorization } }), {
      ...env,
      FEEDBACK_MCP_CREDENTIAL: "",
    }),
    await worker.fetch(new Request(endpoint, { headers: { authorization } }), {
      ...env,
      FEEDBACK_MCP_CREDENTIAL: '{"login":"fixture-owner","sha256":"invalid"}',
    }),
    await worker.fetch(
      new Request(adminApi, { headers: { authorization } }),
      env,
    ),
  ];
  assert.deepEqual(
    denied.map(({ status }) => status),
    [401, 401, 401, 403, 404, 404, 404, 403],
  );
  assert.equal(
    denied[0]?.headers.get("WWW-Authenticate"),
    'Bearer realm="scalableweb-feedback"',
  );
  assert.ok(
    denied.every(
      ({ headers }) =>
        headers.get("Cache-Control") === "private, no-store" &&
        !headers.has("Access-Control-Allow-Origin"),
    ),
  );
  assert.deepEqual(storageCalls, []);

  const admin = await worker.fetch(
    new Request(adminApi, { headers: { cookie } }),
    env,
  );
  assert.equal(
    admin.status,
    200,
    "The rejected cookie actually grants feedback dashboard access.",
  );
});

for (const era of ["modern", "legacy"] as const) {
  test(`a private ${era} MCP client can list issues and open a single redacted thread`, async () => {
    const { env, storageCalls } = workerFixture();
    const client = new Client(
      { name: "feedback-test", version: "1" },
      { versionNegotiation: { mode: "auto" } },
    );
    const transport = new StreamableHTTPClientTransport(endpoint, {
      requestInit: { headers: { authorization } },
      async fetch(input, init) {
        const response = await worker.fetch(new Request(input, init), env);
        assert.equal(
          response.headers.get("Cache-Control"),
          "private, no-store",
        );
        return response;
      },
    });
    await client.connect(
      transport,
      era === "legacy" ? { prior: { kind: "legacy" } } : undefined,
    );
    try {
      assert.equal(client.getProtocolEra(), era);
      const tools = (await client.listTools()).tools;
      assert.deepEqual(tools.map(({ name }) => name).sort(), [
        "get_feedback",
        "list_feedback",
      ]);
      assert.ok(tools.every(({ annotations }) => annotations?.readOnlyHint));
      assert.deepEqual(storageCalls, []);
      await assert.rejects(
        client.callTool({
          name: "resolve_feedback",
          arguments: {
            chapter: knownChapter,
            id: "open-issue",
            reason: "fixed",
          },
        }),
        /Tool resolve_feedback not found/,
      );
      assert.deepEqual(storageCalls, []);

      const call = async (name: string, args: Record<string, unknown>) => {
        const result = await client.callTool({ name, arguments: args });
        assert.ok(!result.isError, JSON.stringify(result));
        assert.doesNotMatch(
          JSON.stringify(result),
          /fixture-reader-login|private-avatar|"anonymous"|"author"/,
        );
        return result.structuredContent as Record<string, any>;
      };
      const first = await call("list_feedback", { limit: 1 });
      assert.deepEqual(first, {
        issues: [
          {
            id: "open-issue",
            chapter: knownChapter,
            paragraphId: "p-example",
            passageUrl:
              "https://scalableweb.dev/appendices/advanced-web-boundaries/#p-example",
            status: "open",
            featured: false,
            category: "missing-example",
            createdAt: timestamp,
            excerpt: openIssue.body,
          },
        ],
        nextOffset: 1,
      });
      const second = await call("list_feedback", {
        offset: 1,
        chapter: knownChapter,
      });
      assert.equal(second.issues[0].id, "open-older");
      assert.equal(second.issues[0].excerpt.length, 240);
      assert.equal(second.nextOffset, null);
      const resolved = await call("list_feedback", { status: "resolved" });
      assert.deepEqual(
        resolved.issues.map(({ id }: { id: string }) => id),
        ["resolved-issue", "retired-issue"],
      );
      assert.equal(resolved.issues[1].passageUrl, null);

      storageCalls.length = 0;
      const input = { chapter: knownChapter, id: "open-issue" };
      const { issue } = await call("get_feedback", input);
      assert.equal(issue.body, openIssue.body);
      assert.equal(issue.replies.length, 10);
      assert.deepEqual(issue.replies[0], {
        body: "Fixture reply 1",
        createdAt: timestamp,
      });
      assert.equal(issue.nextReplyOffset, 10);
      assert.deepEqual(storageCalls, [
        `comments:${knownChapter}`,
        `feedback-resolution:${knownChapter}:`,
      ]);
      const remaining = await call("get_feedback", {
        ...input,
        replyOffset: 10,
      });
      assert.deepEqual(remaining.issue.replies, [
        { body: "Fixture reply 11", createdAt: timestamp },
      ]);
      assert.equal(remaining.issue.nextReplyOffset, null);
      const missing = await client.callTool({
        name: "get_feedback",
        arguments: { ...input, chapter: "retired-chapter" },
      });
      assert.equal(missing.isError, true);
      assert.match(JSON.stringify(missing), /No feedback issue matches/);
    } finally {
      await client.close();
    }
  });
}

test("the owner can resolve individual issues without changing chapter comments or previous resolutions", async () => {
  const { env, resolutions, storageCalls } = workerFixture(true);
  const client = new Client({ name: "resolve-test", version: "1" });
  await client.connect(
    new StreamableHTTPClientTransport(endpoint, {
      requestInit: { headers: { authorization } },
      fetch: (input, init) => worker.fetch(new Request(input, init), env),
    }),
    { prior: { kind: "legacy" } },
  );
  try {
    const tools = (await client.listTools()).tools;
    assert.equal(
      tools.find(({ name }) => name === "resolve_feedback")?.annotations
        ?.readOnlyHint,
      false,
    );
    const close = (id: string, reason: string, chapter = knownChapter) =>
      client.callTool({
        name: "resolve_feedback",
        arguments: { chapter, id, reason },
      });
    assert.equal((await close("open-issue", "invented")).isError, true);
    assert.equal(
      (await close("open-issue", "fixed", "retired-chapter")).isError,
      true,
    );
    assert.equal((await close("hidden-issue", "fixed")).isError, true);
    assert.equal(resolutions.size, 0);

    const [fixed, acknowledged] = await Promise.all([
      close("open-issue", "fixed"),
      close("open-older", "acknowledged"),
    ]);
    assert.equal(fixed.isError, undefined);
    assert.equal(acknowledged.isError, undefined);
    assert.equal(
      (acknowledged.structuredContent?.issue as Record<string, unknown>)
        .resolutionReason,
      "acknowledged",
    );
    assert.doesNotMatch(
      JSON.stringify(fixed),
      /Fixture-Owner|fixture-reader-login|resolvedBy/,
    );
    assert.equal(resolutions.size, 2);
    const receipt = fixed.structuredContent?.issue as Record<string, unknown>;
    assert.equal(receipt.status, "resolved");
    assert.equal(receipt.resolutionReason, "fixed");
    const retry = await close("open-issue", "planned");
    assert.deepEqual(retry.structuredContent, fixed.structuredContent);
    assert.equal(
      storageCalls.filter((key) => key.startsWith("put:")).length,
      2,
    );

    const overview = await worker.fetch(
      new Request(new URL("/api/admin/comments", endpoint), {
        headers: { cookie: sessionCookie(env, "fixture-owner") },
      }),
      env,
    );
    assert.equal(overview.status, 200);
    const { comments } = await overview.json();
    const issue = comments.find(
      ({ id }: { id: string }) => id === "open-issue",
    );
    assert.equal(issue.resolvedBy, "Fixture-Owner");
    assert.equal(issue.resolutionReason, "fixed");
    assert.equal(issue.body, openIssue.body);
    assert.deepEqual(issue.replies, replies);
    const chapterUrl = new URL(
      `/api/comments?chapter=${knownChapter}`,
      endpoint,
    );
    const reader = await worker.fetch(
      new Request(chapterUrl, {
        headers: { cookie: sessionCookie(env, author.login) },
      }),
      env,
    );
    assert.equal(reader.status, 200);
    const readerComments = await reader.json();
    const reflection = readerComments.find(
      ({ id }: { id: string }) => id === "open-older",
    );
    assert.equal(reflection?.resolutionReason, "acknowledged");
    assert.deepEqual(reflection?.replies, replies);
    const publicResponse = await worker.fetch(new Request(chapterUrl), env);
    assert.equal(publicResponse.status, 200);
    assert.deepEqual(await publicResponse.json(), []);
    const open = await client.callTool({
      name: "list_feedback",
      arguments: { chapter: knownChapter },
    });
    assert.deepEqual(open.structuredContent, { issues: [], nextOffset: null });
  } finally {
    await client.close();
  }
});
