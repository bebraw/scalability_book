import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.ts";

const revalidate = "public, max-age=0, must-revalidate";
const immutable = "public, max-age=31536000, immutable";

for (const status of [200, 304]) {
  test(`site cache policy preserves validators on ${status} responses`, async () => {
    const env = {
      ASSETS: {
        fetch: async () =>
          new Response(status === 304 ? null : "asset bytes", {
            status,
            headers: { "Content-Type": "text/javascript", ETag: '"revision"' },
          }),
      },
    };
    for (const [pathname, expected] of [
      ["/theme.js", revalidate],
      ["/styles.css", revalidate],
      ["/styles/course.css", revalidate],
      ["/course.js", revalidate],
      ["/vendor/orchestration-demo.js", revalidate],
      ["/styles.a0123456789bcdef.css", immutable],
      ["/theme.a0123456789bcdef.js", immutable],
      ["/vendor/orchestration-demo.a0123456789bcdef.js", immutable],
      ["/theme.short.js", revalidate],
    ]) {
      const response = await worker.fetch(
        new Request(`https://scalableweb.dev${pathname}`),
        env,
      );
      assert.equal(response.status, status);
      assert.equal(response.headers.get("Cache-Control"), expected, pathname);
      assert.equal(response.headers.get("ETag"), '"revision"');
      assert.equal(await response.text(), status === 304 ? "" : "asset bytes");
    }
  });
}

test("HTML revalidates to discover the current asset filenames", async () => {
  const response = await worker.fetch(
    new Request("https://scalableweb.dev/chapters/scaling/"),
    {
      ASSETS: {
        fetch: async () =>
          new Response("<html></html>", {
            headers: { "Content-Type": "text/html", ETag: '"page-revision"' },
          }),
      },
    },
  );
  assert.equal(response.headers.get("Cache-Control"), revalidate);
  assert.equal(response.headers.get("ETag"), '"page-revision"');
});

test("missing assets retain the asset service's error cache policy", async () => {
  const response = await worker.fetch(
    new Request("https://scalableweb.dev/missing.a0123456789bcdef.js"),
    {
      ASSETS: {
        fetch: async () =>
          new Response("missing", {
            status: 404,
            headers: { "Cache-Control": "no-store" },
          }),
      },
    },
  );
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
