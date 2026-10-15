import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.ts";

for (const status of [200, 304]) {
  test(`public agent Markdown is readable as UTF-8 text on ${status} responses`, async () => {
    for (const pathname of [
      "/concepts/agent-guide.md",
      "/concepts/graph.md",
      "/explore/confidence-before-routing/agent.md",
      "/explore/confidence-before-routing/discussion.md",
    ]) {
      const response = await worker.fetch(
        new Request(`https://scalableweb.dev${pathname}`),
        {
          ASSETS: {
            fetch: async () =>
              new Response(status === 304 ? null : "# Queue → Latency\n", {
                status,
                headers: {
                  "Content-Type": "text/markdown",
                  ETag: '"revision"',
                },
              }),
          },
        },
      );
      // Codex's URL reader rejects text/markdown before it can follow images.
      assert.equal(
        response.headers.get("Content-Type"),
        "text/plain; charset=utf-8",
        pathname,
      );
      assert.equal(
        response.headers.get("Cache-Control"),
        "public, max-age=0, must-revalidate",
      );
      assert.equal(response.status, status);
      assert.equal(response.headers.get("ETag"), '"revision"');
      assert.equal(
        await response.text(),
        status === 304 ? "" : "# Queue → Latency\n",
      );
    }
  });
}

test("agent resource handling preserves error responses and other asset formats", async () => {
  for (const [pathname, status, contentType] of [
    ["/concepts/agent-guide.md", 404, "text/html"],
    ["/concepts/graph.json", 200, "application/json"],
    ["/concepts/visuals/graph-little-law.png", 200, "image/png"],
  ] as const) {
    const response = await worker.fetch(
      new Request(`https://scalableweb.dev${pathname}`),
      {
        ASSETS: {
          fetch: async () =>
            new Response("original body", {
              status,
              headers: { "Content-Type": contentType },
            }),
        },
      },
    );
    assert.equal(response.status, status);
    assert.equal(response.headers.get("Content-Type"), contentType);
    assert.equal(await response.text(), "original body");
  }
});
