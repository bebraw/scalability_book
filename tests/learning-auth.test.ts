import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.ts";

const secret = "test-only-session-secret";
const env = {
  SESSION_SECRET: secret,
  ASSETS: { fetch: async () => new Response("not an API") },
};
async function cookie(user: unknown, exp = Date.now() + 60000) {
  const payload = Buffer.from(JSON.stringify({ user, exp })).toString(
    "base64url",
  );
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = Buffer.from(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)),
  ).toString("base64url");
  return `scalableweb_session=${payload}.${signature}`;
}
test("answer route requires a verified, unexpired session with stable numeric identity", async () => {
  const url = "https://book.test/api/learning/measurement-boundary";
  const request = (value: string) =>
    new Request(url, { headers: { Cookie: value } });
  assert.equal(
    (await worker.fetch(request("scalableweb_session=forged.invalid"), env))
      .status,
    401,
  );
  assert.equal(
    (await worker.fetch(request("scalableweb_session=%zz"), env)).status,
    401,
  );
  assert.equal(
    (
      await worker.fetch(
        request(await cookie({ id: 123, login: "reader" }, 1)),
        env,
      )
    ).status,
    401,
  );
  assert.equal(
    (await worker.fetch(request(await cookie({ login: "old-session" })), env))
      .status,
    401,
  );
  // A verified identity reaches the storage availability check, rather than a public asset.
  assert.equal(
    (
      await worker.fetch(
        request(await cookie({ id: 123, login: "reader" })),
        env,
      )
    ).status,
    503,
  );
});

test("OAuth preserves an internal exercise destination and signs the numeric user ID", async () => {
  const configured = {
    ...env,
    GITHUB_CLIENT_ID: "test-client",
    GITHUB_CLIENT_SECRET: "test-secret",
  };
  const target = "/chapters/benchmarking/#exercise-measurement-boundary";
  const start = await worker.fetch(
    new Request(
      "https://book.test/api/auth/github/start?returnTo=" +
        encodeURIComponent(target),
    ),
    configured,
  );
  const cookies = start.headers.getSetCookie();
  assert.ok(cookies.some((c) => c.includes(encodeURIComponent(target))));
  const location = new URL(start.headers.get("Location")!);
  const state = location.searchParams.get("state");
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("access_token"))
      return Response.json({ access_token: "test-token" });
    if (url === "https://api.github.com/user")
      return Response.json({ id: 123, login: "reader" });
    throw Error("Unexpected network request: " + url);
  };
  try {
    const callback = await worker.fetch(
      new Request(
        `https://book.test/api/auth/github/callback?code=test&state=${state}`,
        { headers: { Cookie: cookies.map((c) => c.split(";")[0]).join("; ") } },
      ),
      configured,
    );
    assert.equal(callback.status, 302);
    assert.equal(callback.headers.get("Location"), target);
    const session = callback.headers
      .getSetCookie()
      .find((c) => c.startsWith("scalableweb_session="))!
      .split(";")[0]!;
    const status = await worker.fetch(
      new Request("https://book.test/api/auth/status", {
        headers: { Cookie: session },
      }),
      configured,
    );
    assert.equal(
      ((await status.json()) as { user: { id: number } }).user.id,
      123,
    );
    assert.equal(status.headers.get("Cache-Control"), "private, no-store");
  } finally {
    globalThis.fetch = original;
  }
});
