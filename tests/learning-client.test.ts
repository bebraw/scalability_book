import test from "node:test";
import assert from "node:assert/strict";
import {
  LearningClient,
  LearningConnectionError,
} from "../site/scripts/learning-client.ts";

test("incompatible pairing does not persist a token; expired sessions retain a recovery explanation", async (t) => {
  const original = globalThis.fetch;
  const storage = new Map<string, string>();
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "sessionStorage",
  );
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
  t.after(() => {
    globalThis.fetch = original;
    if (descriptor)
      Object.defineProperty(globalThis, "sessionStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  });
  const token = "a".repeat(43),
    client = new LearningClient();
  globalThis.fetch = async () => Response.json({ token, version: 2 });
  await assert.rejects(
    client.pair("http://127.0.0.1:8788", "synthetic"),
    (error) =>
      error instanceof LearningConnectionError && error.reason === "protocol",
  );
  assert.equal(client.token, "");
  assert.equal(storage.size, 0);
  globalThis.fetch = async () => Response.json({ token, version: 1 });
  await client.pair("http://127.0.0.1:8788", "synthetic");
  assert.equal(client.token, token);
  assert.equal(storage.size, 1);
  const restored = new LearningClient();
  let finishRestore!: (response: Response) => void;
  globalThis.fetch = () =>
    new Promise((resolve) => {
      finishRestore = resolve;
    });
  const expiredRestore = assert.rejects(
    restored.status(),
    (error) =>
      error instanceof LearningConnectionError && error.reason === "session",
  );
  const replacement = "b".repeat(43);
  globalThis.fetch = async () =>
    Response.json({ token: replacement, version: 1 });
  await client.pair("http://127.0.0.1:8788", "new synthetic code");
  finishRestore(
    Response.json({ message: "Previous session expired." }, { status: 401 }),
  );
  await expiredRestore;
  assert.equal(restored.token, "");
  assert.equal(client.token, replacement);
  assert.deepEqual(JSON.parse(storage.get("book-learning-connection")!), {
    base: client.base,
    token: replacement,
  });
  globalThis.fetch = async () =>
    Response.json(
      { message: "Your companion session expired." },
      { status: 401 },
    );
  await assert.rejects(
    client.status(),
    (error) =>
      error instanceof LearningConnectionError &&
      error.reason === "session" &&
      /draft are retained/.test(error.message),
  );
  assert.equal(client.token, "");
  assert.equal(storage.size, 0);
  globalThis.fetch = async () => {
    throw new TypeError("Synthetic browser network error");
  };
  await assert.rejects(
    client.status(),
    (error) =>
      error instanceof LearningConnectionError &&
      error.reason === "network" &&
      /cannot tell us which/.test(error.message),
  );
});
