import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openReceiver, receiverRecord } from "../store.mjs";
import { applyOnce } from "../apply-once.mjs";

async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), "retry-contract-"));
  let db = openReceiver(dir);
  try {
    await run(
      () => db,
      () => {
        db.close();
        db = openReceiver(dir);
      },
    );
  } finally {
    db.close();
    await rm(dir, { recursive: true, force: true });
  }
}
test("one new command commits its exact effect and reusable receipt", () =>
  fixture((get) => {
    const command = Object.freeze({
      key: "command-17",
      message: 'Åland / 東京: "hello"',
    });
    const result = applyOnce(get(), command);
    assert.deepEqual(result, { effectId: 1, replayed: false });
    assert.deepEqual(JSON.parse(JSON.stringify(receiverRecord(get()))), {
      effects: [{ id: 1, message: 'Åland / 東京: "hello"' }],
      receipts: [
        {
          command_key: "command-17",
          message: 'Åland / 東京: "hello"',
          effect_id: 1,
        },
      ],
    });
  }));
test("a repeated command after reopen returns its original effect", () =>
  fixture((get, reopen) => {
    applyOnce(get(), { key: "same", message: "A" });
    reopen();
    assert.deepEqual(applyOnce(get(), { key: "same", message: "A" }), {
      effectId: 1,
      replayed: true,
    });
    assert.equal(receiverRecord(get()).effects.length, 1);
  }));
test("distinct keys with the same message are distinct commands", () =>
  fixture((get) => {
    applyOnce(get(), { key: "one", message: "A" });
    assert.deepEqual(applyOnce(get(), { key: "two", message: "A" }), {
      effectId: 2,
      replayed: false,
    });
    assert.equal(receiverRecord(get()).effects.length, 2);
  }));
test("conflicting key reuse changes neither ledger", () =>
  fixture((get) => {
    applyOnce(get(), { key: "same", message: "A" });
    const before = receiverRecord(get());
    assert.throws(
      () => applyOnce(get(), { key: "same", message: "B" }),
      (error) => error.code === "KEY_CONFLICT",
    );
    assert.deepEqual(receiverRecord(get()), before);
  }));
test("a receipt-write failure rolls back the effect and leaves the connection usable", () =>
  fixture((get) => {
    get().exec(
      "CREATE TRIGGER refuse_receipt BEFORE INSERT ON receipts BEGIN SELECT RAISE(ABORT, 'injected receipt fault'); END;",
    );
    assert.throws(
      () => applyOnce(get(), { key: "fault", message: "A" }),
      /injected receipt fault/,
    );
    assert.deepEqual(receiverRecord(get()), { effects: [], receipts: [] });
    get().exec("DROP TRIGGER refuse_receipt");
    assert.deepEqual(applyOnce(get(), { key: "fault", message: "A" }), {
      effectId: 1,
      replayed: false,
    });
  }));
