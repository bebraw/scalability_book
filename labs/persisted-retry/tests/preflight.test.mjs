import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startReceiver } from "../receiver.mjs";

test("SQLite and the supplied loopback receiver work before implementation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "retry-preflight-"));
  const server = await startReceiver(dir);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    assert.deepEqual(await (await fetch(base + "/health")).json(), {
      ready: true,
    });
    assert.deepEqual(await (await fetch(base + "/ledger")).json(), {
      effects: [],
      receipts: [],
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  }
});
