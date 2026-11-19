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

function workerFixture() {
  const storageCalls: string[] = [];
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
    }),
    COMMENTS_KV: {
      async get(key: string) {
        storageCalls.push(key);
        return (
          fixture[key.slice("comments:".length) as keyof typeof fixture] ?? null
        );
      },
      async list(options?: { prefix?: string; cursor?: string }) {
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
      async put() {
        assert.fail("The feedback MCP must never write to KV");
      },
    },
  };
  return { env, storageCalls };
}

test("feedback MCP denies all requests before reading KV unless the owner credential is valid", async () => {
  const { env, storageCalls } = workerFixture();
  const payload = Buffer.from(
    JSON.stringify({
      exp: Date.now() + 600_000,
      user: { login: "fixture-owner" },
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", env.SESSION_SECRET)
    .update(payload)
    .digest("base64url");
  const cookie = `scalableweb_session=${payload}.${signature}`;
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
      assert.deepEqual(storageCalls, [`comments:${knownChapter}`]);
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
