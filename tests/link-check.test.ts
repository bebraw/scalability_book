import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  inspectPublishedLinks,
  checkExternalLinks,
} from "../scripts/lib/link-check.ts";

test("published links resolve pages, encoded anchors and downloads, retaining broken-link sources", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "book-links-"));
  try {
    await mkdir(path.join(directory, "chapter"));
    await writeFile(
      path.join(directory, "index.html"),
      `
      <a href="/chapter/?view=all#caf%C3%A9">Good</a>
      <a href="https://book.example/chapter/#café">Absolute</a>
      <a href="/missing/">Missing page</a>
      <a href="/chapter/#gone">Missing anchor</a>
      <a href="https://other.example/p?a=1&amp;b=2#first">External</a>
      <a href="https://other.example/p?a=1&amp;b=2#second">Same request</a>
      <pre>&lt;a href="/not-a-real-link/"&gt;</pre>`,
    );
    await writeFile(
      path.join(directory, "chapter/index.html"),
      `
      <h1 id="café">Title</h1><a href="../lab.zip">Download</a>
      <a href="mailto:teacher@example.com">Email</a>`,
    );
    await writeFile(path.join(directory, "lab.zip"), "fixture");
    const result = await inspectPublishedLinks(
      directory,
      "https://book.example/",
    );
    assert.equal(result.pages, 2);
    assert.equal(result.localLinks, 5);
    assert.deepEqual(result.errors, [
      {
        url: "/missing/",
        sources: ["index.html"],
        detail: "Missing local file",
      },
      {
        url: "/chapter/#gone",
        sources: ["index.html"],
        detail: "Missing anchor #gone",
      },
    ]);
    assert.deepEqual(
      [...result.external.keys()],
      ["https://other.example/p?a=1&b=2"],
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("an empty build cannot silently pass link validation", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "book-links-empty-"));
  try {
    await assert.rejects(
      inspectPublishedLinks(directory, "https://book.example/"),
      /build first/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("the CLI rejects a missing published download with a failing exit status", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "book-links-cli-"));
  try {
    await writeFile(
      path.join(directory, "index.html"),
      '<a href="/missing.zip">Download</a>',
    );
    const result = spawnSync(
      process.execPath,
      ["scripts/check-links.ts", "--local-only"],
      {
        encoding: "utf8",
        env: { ...process.env, BUILD_DIR: directory },
      },
    );
    assert.equal(result.status, 1, result.stderr);
    assert.match(
      result.stderr,
      /Missing local file: \/missing.zip \(from index.html\)/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("external checks use anonymous GET and distinguish missing, blocked and transient responses", async () => {
  const requests = new Map<string, number>();
  const statuses = new Map([
    ["ok", 200],
    ["missing", 404],
    ["gone", 410],
    ["blocked", 403],
    ["limited", 429],
    ["unavailable", 503],
    ["recovered", 503],
  ]);
  const links = new Map(
    [...statuses.keys(), "timeout"].map((name) => [
      `https://other.example/${name}`,
      new Set(["chapter/index.html"]),
    ]),
  );
  const fakeFetch: typeof fetch = async (input, init) => {
    const name = new URL(String(input)).pathname.slice(1);
    const count = (requests.get(name) ?? 0) + 1;
    requests.set(name, count);
    assert.equal(init?.method, "GET");
    assert.equal(init?.credentials, "omit");
    assert.equal(init?.redirect, "follow");
    assert.ok(init?.signal);
    if (name === "timeout") throw new Error("Timed out");
    return new Response(null, {
      status: name === "recovered" && count === 2 ? 200 : statuses.get(name),
    });
  };
  const results = await checkExternalLinks(links, {
    fetch: fakeFetch,
    concurrency: 2,
  });
  const outcomes = Object.fromEntries(
    results.map((result) => [
      new URL(result.url).pathname.slice(1),
      result.outcome,
    ]),
  );
  assert.deepEqual(outcomes, {
    blocked: "inconclusive",
    gone: "missing",
    limited: "inconclusive",
    missing: "missing",
    ok: "ok",
    recovered: "ok",
    timeout: "inconclusive",
    unavailable: "inconclusive",
  });
  assert.equal(requests.get("recovered"), 2);
  assert.equal(requests.get("timeout"), 2);
  assert.equal(requests.get("missing"), 1);
  assert.deepEqual(
    results.find((result) => result.outcome === "missing")?.sources,
    ["chapter/index.html"],
  );
});
