import { test } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "../server.mjs";

test("supplied assets and origin log work before implementation", async () => {
  const server = await startServer();
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const path of ["/", "/styles.css", "/app.mjs"])
      assert.equal((await fetch(base + path)).status, 200, path);
    assert.deepEqual(await (await fetch(base + "/control/log")).json(), {
      version: 1,
      requests: [],
    });
    assert.equal((await fetch(base + "/SPEC.md")).status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
