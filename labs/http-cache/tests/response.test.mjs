import { test } from "node:test";
import assert from "node:assert/strict";
import { responseFor } from "../response.mjs";
import { startServer } from "../server.mjs";

test("fresh policy returns its exact cache lifetime and validator", () => {
  assert.deepEqual(
    responseFor({ policy: "fresh", version: 1, ifNoneMatch: null }),
    {
      status: 200,
      headers: { "cache-control": "private, max-age=60", etag: '"summary-v1"' },
    },
  );
});
test("validate policy permits storage but requires validation", () => {
  assert.deepEqual(
    responseFor({ policy: "validate", version: 1, ifNoneMatch: null }),
    {
      status: 200,
      headers: { "cache-control": "private, no-cache", etag: '"summary-v1"' },
    },
  );
});
test("the exact validator permits 304 under either policy", () => {
  for (const policy of ["fresh", "validate"])
    assert.equal(
      responseFor({ policy, version: 7, ifNoneMatch: '"summary-v7"' }).status,
      304,
    );
});
test("an old validator returns the current version and leaves inputs unchanged", () => {
  const input = Object.freeze({
    policy: "validate",
    version: 8,
    ifNoneMatch: '"summary-v7"',
  });
  assert.deepEqual(responseFor(input), {
    status: 200,
    headers: { "cache-control": "private, no-cache", etag: '"summary-v8"' },
  });
});
test("a nonmatching validator cannot suppress the response", () => {
  assert.equal(
    responseFor({ policy: "fresh", version: 7, ifNoneMatch: '"different"' })
      .status,
    200,
  );
});
test("actual HTTP validation returns no 304 body and changed data returns 200", async () => {
  const server = await startServer();
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const first = await fetch(base + "/api/summary?policy=validate");
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), { version: 1, total: 3 });
    const unchanged = await fetch(base + "/api/summary?policy=validate", {
      headers: { "if-none-match": '"summary-v1"' },
    });
    assert.equal(unchanged.status, 304);
    assert.equal(await unchanged.text(), "");
    assert.equal(unchanged.headers.get("etag"), '"summary-v1"');
    await fetch(base + "/control/change", { method: "POST" });
    const changed = await fetch(base + "/api/summary?policy=validate", {
      headers: { "if-none-match": '"summary-v1"' },
    });
    assert.equal(changed.status, 200);
    assert.deepEqual(await changed.json(), { version: 2, total: 4 });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
