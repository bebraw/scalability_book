import test from "node:test";
import assert from "node:assert/strict";
import { createLearningKeychain } from "../scripts/lib/learning-keychain.ts";

test("native keychain loading is lazy, uses async entries and requires durable Linux Secret Service", async () => {
  let loads = 0;
  const constructed: unknown[] = [];
  const values = new Map<string, string>();
  class AsyncEntry {
    id: string;
    constructor(service: string, account: string, options: unknown) {
      constructed.push({ service, account, options });
      this.id = `${service}:${account}`;
    }
    async getPassword() {
      return values.get(this.id) ?? null;
    }
    async setPassword(key: string) {
      values.set(this.id, key);
    }
    async deleteCredential() {
      return values.delete(this.id);
    }
  }
  const store = createLearningKeychain(async () => {
    loads++;
    return { AsyncEntry };
  });
  assert.equal(loads, 0);
  assert.equal(await store.get("synthetic-service", "first"), null);
  await store.set("synthetic-service", "first", "synthetic-key");
  assert.equal(await store.get("synthetic-service", "first"), "synthetic-key");
  assert.equal(await store.delete("synthetic-service", "first"), true);
  assert.equal(await store.delete("synthetic-service", "first"), false);
  assert.equal(loads, 1);
  assert.equal(constructed.length, 5);
  for (const entry of constructed)
    assert.deepEqual(entry, {
      service: "synthetic-service",
      account: "first",
      options: { linux: { store: "secret-service" } },
    });
});

test("missing entries are distinct from native loading, constructor, access and deletion failures", async () => {
  const secret = "synthetic-key-must-not-appear";
  const failing = () => {
    throw new Error(`PRIVATE_NATIVE_DIAGNOSTIC ${secret}`);
  };
  const noLibrary = createLearningKeychain(async () => failing());
  class NoService {
    constructor() {
      failing();
    }
    async getPassword(): Promise<null> {
      return null;
    }
    async setPassword() {}
    async deleteCredential() {
      return false;
    }
  }
  class LockedService {
    async getPassword(): Promise<null> {
      return failing();
    }
    async setPassword() {
      failing();
    }
    async deleteCredential(): Promise<boolean> {
      return failing();
    }
  }
  for (const store of [
    noLibrary,
    createLearningKeychain(async () => ({ AsyncEntry: NoService })),
    createLearningKeychain(async () => ({ AsyncEntry: LockedService })),
  ]) {
    for (const operation of [
      () => store.get("synthetic", "entry"),
      () => store.set("synthetic", "entry", secret),
      () => store.delete("synthetic", "entry"),
    ])
      await assert.rejects(operation(), (error: Error) => {
        assert.match(error.message, /OS keychain is unavailable, locked/);
        assert.match(error.message, /--api-key-env/);
        assert.doesNotMatch(
          error.message,
          /PRIVATE_NATIVE_DIAGNOSTIC|synthetic-key/,
        );
        return true;
      });
  }
});

test("native operations receive a 15-second cancellation signal and reported aborts preserve mutation uncertainty", async (t) => {
  const calls: string[] = [];
  t.mock.method(AbortSignal, "timeout", (milliseconds: number) => {
    assert.equal(milliseconds, 15_000);
    const controller = new AbortController();
    queueMicrotask(() =>
      controller.abort(
        new DOMException(
          "PRIVATE_ABORT_DIAGNOSTIC synthetic-key",
          "TimeoutError",
        ),
      ),
    );
    return controller.signal;
  });
  const waitForAbort = async (
    name: string,
    signal: AbortSignal,
  ): Promise<never> => {
    calls.push(name);
    assert.ok(signal instanceof AbortSignal);
    if (signal.aborted) throw signal.reason;
    return new Promise((_resolve, reject) =>
      signal.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      }),
    );
  };
  class AsyncEntry {
    getPassword(signal: AbortSignal): Promise<string | null> {
      return waitForAbort("get", signal);
    }
    setPassword(_key: string, signal: AbortSignal): Promise<void> {
      return waitForAbort("set", signal);
    }
    deleteCredential(signal: AbortSignal): Promise<boolean> {
      return waitForAbort("delete", signal);
    }
  }
  const store = createLearningKeychain(async () => ({ AsyncEntry }));
  for (const [name, operation] of [
    ["get", () => store.get("synthetic", "entry")],
    ["save", () => store.set("synthetic", "entry", "synthetic-key")],
    ["delete", () => store.delete("synthetic", "entry")],
  ] as const) {
    await assert.rejects(operation(), (error: Error) => {
      assert.match(error.message, /timed out/);
      assert.doesNotMatch(
        error.message,
        /PRIVATE_ABORT_DIAGNOSTIC|synthetic-key/,
      );
      if (name === "get")
        assert.doesNotMatch(error.message, /may have completed/);
      else
        assert.match(
          error.message,
          new RegExp(`The ${name} may have completed`),
        );
      return true;
    });
  }
  assert.deepEqual(calls, ["get", "set", "delete"]);
});
