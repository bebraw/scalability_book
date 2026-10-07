import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openLearningNotebook } from "../scripts/lib/learning-notebook.ts";
import { createCompanionHandler } from "../scripts/lib/learning-companion-http.ts";
import { openLearningConversations } from "../scripts/lib/learning-conversations.ts";
import type { LearningProvider } from "../scripts/lib/learning-provider.ts";
import { teachingPolicyIdentity } from "../shared/learning-agent.ts";

function fixture(
  t: test.TestContext,
  provider: LearningProvider | null = null,
) {
  const directory = mkdtempSync(path.join(tmpdir(), "learning-companion-"));
  const notebook = openLearningNotebook(directory);
  const conversations = openLearningConversations(
    directory,
    notebook,
    provider,
  );
  t.after(() => {
    conversations.close();
    notebook.close();
    rmSync(directory, { recursive: true, force: true });
  });
  let now = 1000;
  const handler = createCompanionHandler({
    origins: ["https://book.test", "http://127.0.0.1:3000"],
    port: 8788,
    notebook,
    conversations,
    now: () => now,
  });
  async function request(
    route: string,
    method = "GET",
    body?: unknown,
    token?: string,
    origin = "https://book.test",
    host = "127.0.0.1:8788",
    headers: Record<string, string> = {},
  ) {
    return handler.handle(
      new Request(`http://${host}${route}`, {
        method,
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    );
  }
  return {
    request,
    notebook,
    later() {
      now += 13 * 60 * 60_000;
    },
    async connect() {
      const response = await request("/connect", "POST", {});
      assert.equal(response.status, 200);
      return ((await response.json()) as { token: string }).token;
    },
  };
}
test("code-free connections authorize only the configured origin and loopback host, and reconnect without restarting", async (t) => {
  const f = fixture(t);
  assert.equal((await f.request("/notebook")).status, 401);
  for (const origin of [
    "",
    "null",
    "https://book.test.evil.test",
    "http://127.0.0.1:3001",
  ]) {
    const response = await f.request("/connect", "POST", {}, undefined, origin);
    assert.equal(response.status, 403);
    assert.equal(response.headers.has("access-control-allow-origin"), false);
  }
  assert.equal(
    (
      await f.request(
        "/connect",
        "POST",
        {},
        undefined,
        "https://book.test",
        "rebind.test:8788",
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request(
        "/connect",
        "POST",
        {},
        undefined,
        "https://book.test",
        "127.0.0.1:8788",
        { "Content-Type": "text/plain" },
      )
    ).status,
    415,
  );
  assert.equal((await f.request("/connect", "POST", [])).status, 400);
  assert.equal(
    (await f.request("/connect", "POST", { excess: "x".repeat(96_000) }))
      .status,
    413,
  );
  const grant = await f.request("/connect", "POST", {});
  assert.equal(grant.status, 200);
  assert.equal(grant.headers.get("cache-control"), "private, no-store");
  const { token, version } = await grant.json();
  assert.equal(version, 2);
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(
    (await f.request("/notebook", "GET", undefined, token)).status,
    200,
  );
  assert.equal(
    (
      await f.request(
        "/notebook",
        "GET",
        undefined,
        token,
        "http://127.0.0.1:3000",
      )
    ).status,
    401,
  );
  const status = await (
    await f.request("/status", "GET", undefined, token)
  ).json();
  assert.equal(status.version, 2);
  assert.equal(
    (await f.request("/pair", "POST", { code: "unused" }, token)).status,
    404,
  );
  assert.equal((await f.request("/disconnect", "POST", {}, token)).status, 200);
  assert.equal(
    (await f.request("/notebook", "GET", undefined, token)).status,
    401,
  );
  const replacement = await (await f.request("/connect", "POST", {})).json();
  assert.notEqual(replacement.token, token);
  f.later();
  assert.equal(
    (await f.request("/notebook", "GET", undefined, replacement.token)).status,
    401,
  );
  assert.equal((await f.request("/connect", "POST", {})).status, 200);
});
test("connection sessions are bounded and expired sessions release capacity", async (t) => {
  const f = fixture(t);
  for (let index = 0; index < 64; index++)
    assert.equal((await f.request("/connect", "POST", {})).status, 200);
  assert.equal((await f.request("/connect", "POST", {})).status, 429);
  f.later();
  assert.equal((await f.request("/connect", "POST", {})).status, 200);
});
test("status advertises only an enabled provider's applied teaching policy", async (t) => {
  const provider: LearningProvider = {
    name: "Synthetic",
    version: "test-version",
    teaching: teachingPolicyIdentity,
    async run() {
      return "Synthetic reply";
    },
    async cancel() {},
    close() {},
  };
  const current = fixture(t, provider);
  const currentStatus = await (
    await current.request("/status", "GET", undefined, await current.connect())
  ).json();
  assert.deepEqual(currentStatus.teaching, {
    policy: teachingPolicyIdentity,
    provider: { name: "Synthetic", version: "test-version" },
  });
  const notebookOnly = fixture(t);
  const notebookStatus = await (
    await notebookOnly.request(
      "/status",
      "GET",
      undefined,
      await notebookOnly.connect(),
    )
  ).json();
  assert.equal(notebookStatus.provider, null);
  assert.equal(notebookStatus.teaching, undefined);
  const { teaching: _teaching, ...unversioned } = provider;
  const earlier = fixture(t, unversioned);
  const earlierStatus = await (
    await earlier.request("/status", "GET", undefined, await earlier.connect())
  ).json();
  assert.equal(earlierStatus.provider, "Synthetic");
  assert.equal(earlierStatus.teaching, undefined);
});
test("browser preflight is origin-gated and sessions expire or can be revoked", async (t) => {
  const f = fixture(t);
  assert.equal((await f.request("/entries", "OPTIONS")).status, 204);
  assert.equal(
    (
      await f.request(
        "/entries",
        "OPTIONS",
        undefined,
        undefined,
        "https://untrusted.test",
      )
    ).status,
    403,
  );
  const token = await f.connect();
  assert.equal((await f.request("/disconnect", "POST", {}, token)).status, 200);
  assert.equal(
    (await f.request("/export", "GET", undefined, token)).status,
    401,
  );
  const second = fixture(t),
    secondToken = await second.connect();
  second.later();
  assert.equal(
    (await second.request("/notebook", "GET", undefined, secondToken)).status,
    401,
  );
});
test("authenticated notebook API captures short notes and prepares only selected submission material", async (t) => {
  const f = fixture(t),
    token = await f.connect();
  const result = await f.request(
    "/entries",
    "POST",
    {
      kind: "scratch",
      title: "Synthetic uncertainty",
      body: "Why?",
      source: {
        url: "https://book.test/chapters/example/",
        kind: "page",
        title: "Example",
        anchor: "",
        excerpt: "Synthetic passage",
        revision: null,
        conceptIds: [],
      },
    },
    token,
  );
  assert.equal(result.status, 201);
  const note = (await result.json()) as { id: string };
  const draft = await f.request("/prepare", "POST", { ids: [note.id] }, token);
  assert.equal(draft.status, 200);
  assert.match(
    ((await draft.json()) as { markdown: string }).markdown,
    /Why\?/,
  );
  const archive = await f.request("/export", "GET", undefined, token);
  assert.equal(archive.status, 200);
  assert.doesNotMatch(
    await archive.text(),
    /synthetic-code|Bearer|providerCredentials/,
  );
});
