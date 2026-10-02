import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.ts";

test("stable learning images revalidate while preserving asset bodies and validators", async () => {
  const env = {
    ASSETS: {
      fetch: async () =>
        new Response("image bytes", {
          headers: { "Content-Type": "image/png", ETag: '"revision"' },
        }),
    },
  };
  for (const file of [
    "graph-queue.png",
    "graph-complete.svg",
    "demo-queue-balance-lab.png",
  ]) {
    const response = await worker.fetch(
      new Request(`https://scalableweb.dev/concepts/visuals/${file}`),
      env,
    );
    assert.equal(
      response.headers.get("Cache-Control"),
      "public, max-age=0, must-revalidate",
    );
    assert.equal(response.headers.get("ETag"), '"revision"');
    assert.equal(await response.text(), "image bytes");
  }
  const other = await worker.fetch(
    new Request("https://scalableweb.dev/assets/book-cover.svg"),
    env,
  );
  assert.equal(
    other.headers.get("Cache-Control"),
    "public, max-age=31536000, immutable",
  );
});
