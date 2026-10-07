import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openLearningNotebook } from "../scripts/lib/learning-notebook.ts";
import { createCompanionHandler } from "../scripts/lib/learning-companion-http.ts";
import { openLearningConversations } from "../scripts/lib/learning-conversations.ts";
import type { LearningProvider } from "../scripts/lib/learning-codex.ts";
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
    code: "synthetic-code",
    now: () => now,
  });
  async function request(
    route: string,
    method = "GET",
    body?: unknown,
    token?: string,
    origin = "https://book.test",
    host = "127.0.0.1:8788",
  ) {
    return handler.handle(
      new Request(`http://${host}${route}`, {
        method,
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    async pair() {
      const response = await request("/pair", "POST", {
        code: "synthetic-code",
      });
      assert.equal(response.status, 200);
      return ((await response.json()) as { token: string }).token;
    },
  };
}
test("pairing requires the exact website origin and loopback host; private routes require a session", async (t) => {
  const f = fixture(t);
  assert.equal((await f.request("/notebook")).status, 401);
  const denied = await f.request(
    "/pair",
    "POST",
    { code: "synthetic-code" },
    undefined,
    "https://book.test.evil.test",
  );
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.has("access-control-allow-origin"), false);
  assert.equal(
    (
      await f.request(
        "/pair",
        "POST",
        { code: "synthetic-code" },
        undefined,
        "https://book.test",
        "rebind.test:8788",
      )
    ).status,
    403,
  );
  const token = await f.pair();
  const response = await f.request("/notebook", "GET", undefined, token);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
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
  assert.equal(
    (await f.request("/pair", "POST", { code: "synthetic-code" })).status,
    403,
  );
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
    await current.request("/status", "GET", undefined, await current.pair())
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
      await notebookOnly.pair(),
    )
  ).json();
  assert.equal(notebookStatus.provider, null);
  assert.equal(notebookStatus.teaching, undefined);
  const { teaching: _teaching, ...unversioned } = provider;
  const earlier = fixture(t, unversioned);
  const earlierStatus = await (
    await earlier.request("/status", "GET", undefined, await earlier.pair())
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
  const token = await f.pair();
  assert.equal((await f.request("/disconnect", "POST", {}, token)).status, 200);
  assert.equal(
    (await f.request("/export", "GET", undefined, token)).status,
    401,
  );
  const second = fixture(t),
    secondToken = await second.pair();
  second.later();
  assert.equal(
    (await second.request("/notebook", "GET", undefined, secondToken)).status,
    401,
  );
});
test("authenticated notebook API captures short notes and prepares only selected submission material", async (t) => {
  const f = fixture(t),
    token = await f.pair();
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
