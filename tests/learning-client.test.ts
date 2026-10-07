import test from "node:test";
import assert from "node:assert/strict";
import {
  LearningClient,
  LearningConnectionError,
} from "../site/scripts/learning-client.ts";

test("connections validate protocol, retain tab tokens and recover without losing replacement sessions", async (t) => {
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
  globalThis.fetch = async () => Response.json({ token, version: 1 });
  await assert.rejects(
    client.connect("http://127.0.0.1:8788"),
    (error) =>
      error instanceof LearningConnectionError && error.reason === "protocol",
  );
  assert.equal(client.token, "");
  assert.equal(storage.size, 0);
  globalThis.fetch = async () =>
    Response.json({ token: "invalid", version: 2 });
  await assert.rejects(
    client.connect(client.base),
    (error) =>
      error instanceof LearningConnectionError && error.reason === "session",
  );
  assert.equal(client.token, "");
  assert.equal(storage.size, 0);
  globalThis.fetch = async (input, init) => {
    assert.equal(input, "http://127.0.0.1:8788/connect");
    assert.equal(init?.method, "POST");
    assert.equal(init?.body, "{}");
    return Response.json({ token, version: 2 });
  };
  await client.connect("http://127.0.0.1:8788");
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
    Response.json({ token: replacement, version: 2 });
  await client.connect("http://127.0.0.1:8788");
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
  globalThis.fetch = async () => Response.json({ token, version: 2 });
  await client.connect(client.base);
  let sentAuthorization: string | null = null;
  globalThis.fetch = async (_input, init) => {
    sentAuthorization = new Headers(init?.headers).get("Authorization");
    return Response.json({ token: replacement, version: 2 });
  };
  await client.connect("http://127.0.0.1:8789");
  assert.equal(
    sentAuthorization,
    null,
    "A previous companion's token must not be sent to a different address.",
  );
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
