import { test } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "../server.mjs";

test("the supplied page and modules are available without implementing export", async () => {
  const server = await startServer();
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const path of [
      "/",
      "/app.mjs",
      "/export.mjs",
      "/fixture.mjs",
      "/styles.css",
    ]) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200, path);
      assert.ok((await response.text()).length > 0, path);
    }
    assert.equal((await fetch(base + "/SPEC.md")).status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
