import assert from "node:assert/strict";
import test from "node:test";
import { startServer } from "../server.mjs";

// These checks establish only the starter's HTTP setup, not course acceptance.
test("malformed request targets are rejected without interrupting the server", async (t) => {
  const server = await startServer();
  t.after(() => {
    server.closeAllConnections();
    return new Promise((resolve) => server.close(resolve));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const invalid = await fetch(`${base}//`, {
    signal: AbortSignal.timeout(1000),
  });
  assert.equal(invalid.status, 400);
  await invalid.text();
  const healthy = await fetch(`${base}/health`);
  assert.equal(healthy.status, 200);
  assert.equal((await healthy.json()).status, "ok");
});

test("the isolated application serves an HTML page and a health response", async (t) => {
  const server = await startServer();
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type"), /text\/html/);
  assert.match(await page.text(), /<!doctype html>/i);
  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, "ok");
});

test("unknown routes return not found and local source files are not served", async (t) => {
  const server = await startServer();
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const pathname of [
    "/__missing-starter-route__",
    "/server.mjs",
    "/.env",
    "/README.md",
  ]) {
    const response = await fetch(`${base}${pathname}`);
    assert.equal(response.status, 404, pathname);
  }
  const mutation = await fetch(`${base}/health`, { method: "POST" });
  assert.equal(mutation.status, 405);
  assert.equal(mutation.headers.get("allow"), "GET, HEAD");
});
