import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
  chmodSync,
  symlinkSync,
  copyFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  readLearningApiKey,
  saveLearningApiKey,
  deleteLearningApiKey,
  validateLearningApiKey,
} from "../scripts/lib/learning-api-credentials.ts";
import type { LearningKeychain } from "../scripts/lib/learning-keychain.ts";

const firstEndpoint = "https://provider.example.test/v1";
const secondEndpoint = "https://other.example.test/v1";
const firstKey = "synthetic-private-first-key";
const secondKey = "synthetic-private-second-key";
function fixture(t: test.TestContext) {
  const directory = mkdtempSync(path.join(tmpdir(), "book-api-credentials-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return {
    directory,
    identity: path.join(directory, "credential-identity.json"),
  };
}
function memoryStore() {
  const values = new Map<string, string>();
  const operations: { operation: string; service: string; account: string }[] =
    [];
  const store: LearningKeychain = {
    async get(service, account) {
      operations.push({ operation: "get", service, account });
      return values.get(`${service}:${account}`) ?? null;
    },
    async set(service, account, key) {
      operations.push({ operation: "set", service, account });
      values.set(`${service}:${account}`, key);
    },
    async delete(service, account) {
      operations.push({ operation: "delete", service, account });
      return values.delete(`${service}:${account}`);
    },
  };
  return { values, operations, store };
}
test("OS credentials are isolated by notebook and canonical endpoint, with only durable nonsecret identity on disk", async (t) => {
  const first = fixture(t),
    second = fixture(t),
    copied = fixture(t);
  const memory = memoryStore();
  await saveLearningApiKey(
    first.directory,
    firstEndpoint,
    firstKey,
    memory.store,
  );
  await saveLearningApiKey(
    first.directory,
    secondEndpoint,
    secondKey,
    memory.store,
  );
  await saveLearningApiKey(
    second.directory,
    firstEndpoint,
    "synthetic-different-notebook-key",
    memory.store,
  );
  assert.equal(
    await readLearningApiKey(
      first.directory,
      `${firstEndpoint}/`,
      undefined,
      memory.store,
    ),
    firstKey,
  );
  assert.equal(
    await readLearningApiKey(
      first.directory,
      secondEndpoint,
      undefined,
      memory.store,
    ),
    secondKey,
  );
  assert.equal(
    await readLearningApiKey(
      second.directory,
      firstEndpoint,
      undefined,
      memory.store,
    ),
    "synthetic-different-notebook-key",
  );
  const identity = JSON.parse(readFileSync(first.identity, "utf8"));
  assert.equal(identity.version, 1);
  assert.match(identity.id, /^[a-f0-9-]{36}$/);
  assert.notEqual(
    identity.id,
    JSON.parse(readFileSync(second.identity, "utf8")).id,
  );
  assert.deepEqual(readdirSync(first.directory), ["credential-identity.json"]);
  assert.doesNotMatch(
    readFileSync(first.identity, "utf8"),
    /synthetic-private|https:\/\/|apiKey|Bearer/,
  );
  if (process.platform !== "win32")
    assert.equal(statSync(first.identity).mode & 0o777, 0o600);
  for (const operation of memory.operations) {
    assert.equal(operation.service, "dev.scalableweb.companion");
    assert.match(operation.account, /^api:[a-f0-9-]{36}:[a-f0-9]{64}$/);
    assert.doesNotMatch(
      operation.account,
      /provider\.example|synthetic-private/,
    );
  }
  const bytes = readFileSync(first.identity);
  await saveLearningApiKey(
    first.directory,
    firstEndpoint,
    "synthetic-rotated-key",
    memory.store,
  );
  assert.deepEqual(readFileSync(first.identity), bytes);
  assert.equal(
    await readLearningApiKey(
      first.directory,
      firstEndpoint,
      undefined,
      memory.store,
    ),
    "synthetic-rotated-key",
  );
  assert.equal(
    await readLearningApiKey(
      first.directory,
      secondEndpoint,
      undefined,
      memory.store,
    ),
    secondKey,
  );
  // Full-directory migration retains this identity; changing only the path must
  // keep same-machine access, while a different OS store requires login.
  copyFileSync(first.identity, copied.identity);
  assert.equal(
    await readLearningApiKey(
      copied.directory,
      firstEndpoint,
      undefined,
      memory.store,
    ),
    "synthetic-rotated-key",
  );
  await assert.rejects(
    readLearningApiKey(
      copied.directory,
      firstEndpoint,
      undefined,
      memoryStore().store,
    ),
    /No API key is saved/,
  );
  for (const endpoint of [
    "https://provider.example.test/other",
    "https://provider.example.test.evil.test/v1",
  ])
    await assert.rejects(
      readLearningApiKey(first.directory, endpoint, undefined, memory.store),
      /No API key is saved/,
    );
  await assert.rejects(
    readLearningApiKey(
      first.directory,
      "http://provider.example.test/v1",
      undefined,
      memory.store,
    ),
    /HTTPS API base URL/,
  );
});

test("missing, locked and unavailable credentials differ without leaking native diagnostics or creating secret files", async (t) => {
  const f = fixture(t);
  const memory = memoryStore();
  const locked: LearningKeychain = {
    async get() {
      throw new Error(`OS_DIAGNOSTIC ${firstKey}`);
    },
    async set() {
      throw new Error(`OS_DIAGNOSTIC ${firstKey}`);
    },
    async delete() {
      throw new Error(`OS_DIAGNOSTIC ${firstKey}`);
    },
  };
  await assert.rejects(
    readLearningApiKey(f.directory, firstEndpoint, undefined, locked),
    /No API key is saved/,
  );
  assert.deepEqual(readdirSync(f.directory), []);
  await assert.rejects(
    saveLearningApiKey(f.directory, firstEndpoint, firstKey, locked),
    (error: Error) => {
      assert.match(error.message, /OS keychain is unavailable, locked/);
      assert.match(error.message, /--api-key-env/);
      assert.doesNotMatch(error.message, /OS_DIAGNOSTIC|synthetic-private/);
      return true;
    },
  );
  assert.deepEqual(readdirSync(f.directory), ["credential-identity.json"]);
  await assert.rejects(
    readLearningApiKey(f.directory, firstEndpoint, undefined, memory.store),
    /No API key is saved/,
  );
  await assert.rejects(
    readLearningApiKey(f.directory, firstEndpoint, undefined, locked),
    /OS keychain is unavailable/,
  );
  await assert.rejects(
    deleteLearningApiKey(f.directory, firstEndpoint, locked),
    /OS keychain is unavailable/,
  );
  const noReadback = {
    ...memory.store,
    async get() {
      return null;
    },
  };
  await assert.rejects(
    saveLearningApiKey(f.directory, firstEndpoint, firstKey, noReadback),
    /did not confirm/,
  );
});

test("explicit environment keys bypass native loading and identity creation without persisting their value", async (t) => {
  const f = fixture(t);
  const variable = "LEARNING_SYNTHETIC_KEY_FOR_TEST";
  const previous = process.env[variable];
  t.after(() => {
    if (previous === undefined) delete process.env[variable];
    else process.env[variable] = previous;
  });
  let calls = 0;
  const unavailable: LearningKeychain = {
    async get() {
      calls++;
      throw new Error("native unavailable");
    },
    async set() {
      calls++;
      throw new Error("native unavailable");
    },
    async delete() {
      calls++;
      throw new Error("native unavailable");
    },
  };
  process.env[variable] = firstKey;
  assert.equal(
    await readLearningApiKey(f.directory, firstEndpoint, variable, unavailable),
    firstKey,
  );
  assert.deepEqual(readdirSync(f.directory), []);
  assert.equal(existsSync(f.identity), false);
  assert.equal(calls, 0);
  process.env[variable] = "synthetic secret with whitespace";
  await assert.rejects(
    readLearningApiKey(f.directory, firstEndpoint, variable, unavailable),
    (error: Error) => {
      assert.match(error.message, /nonempty API key without whitespace/);
      assert.doesNotMatch(error.message, /synthetic secret/);
      return true;
    },
  );
  delete process.env[variable];
  await assert.rejects(
    readLearningApiKey(f.directory, firstEndpoint, variable, unavailable),
    new RegExp(`Set ${variable}`),
  );
  await assert.rejects(
    readLearningApiKey(f.directory, firstEndpoint, "INVALID=NAME", unavailable),
    /valid environment variable name/,
  );
});

test("key deletion affects only the selected endpoint and invalid input cannot replace a saved key", async (t) => {
  for (const value of [undefined, null, 123, {}, []])
    assert.throws(
      () => validateLearningApiKey(value),
      /nonempty API key without whitespace/,
    );
  const f = fixture(t);
  const memory = memoryStore();
  assert.equal(
    await deleteLearningApiKey(f.directory, firstEndpoint, memory.store),
    false,
  );
  await saveLearningApiKey(f.directory, firstEndpoint, firstKey, memory.store);
  await saveLearningApiKey(
    f.directory,
    secondEndpoint,
    secondKey,
    memory.store,
  );
  for (const invalid of [
    "",
    "synthetic key",
    "synthetic\nkey",
    "x".repeat(4097),
    "synthetic-key-\u0080",
  ])
    await assert.rejects(
      saveLearningApiKey(f.directory, firstEndpoint, invalid, memory.store),
      /nonempty API key without whitespace/,
    );
  assert.equal(
    await readLearningApiKey(
      f.directory,
      firstEndpoint,
      undefined,
      memory.store,
    ),
    firstKey,
  );
  assert.equal(
    await deleteLearningApiKey(f.directory, firstEndpoint, memory.store),
    true,
  );
  assert.equal(
    await deleteLearningApiKey(f.directory, firstEndpoint, memory.store),
    false,
  );
  await assert.rejects(
    readLearningApiKey(f.directory, firstEndpoint, undefined, memory.store),
    /No API key is saved/,
  );
  assert.equal(
    await readLearningApiKey(
      f.directory,
      secondEndpoint,
      undefined,
      memory.store,
    ),
    secondKey,
  );
  const malformed = {
    ...memory.store,
    async get() {
      return "malformed secret key";
    },
  };
  await assert.rejects(
    readLearningApiKey(f.directory, secondEndpoint, undefined, malformed),
    /nonempty API key without whitespace/,
  );
});

test("identity corruption, symlinks and public permissions fail without replacing another file", async (t) => {
  const f = fixture(t);
  const memory = memoryStore();
  const target = path.join(f.directory, "other-private-file.json");
  writeFileSync(target, "retained unrelated file", { mode: 0o600 });
  symlinkSync(target, f.identity);
  await assert.rejects(
    saveLearningApiKey(f.directory, firstEndpoint, firstKey, memory.store),
    /regular private/,
  );
  await assert.rejects(
    readLearningApiKey(f.directory, firstEndpoint, undefined, memory.store),
    /regular private/,
  );
  assert.equal(readFileSync(target, "utf8"), "retained unrelated file");
  rmSync(f.identity);
  for (const content of [
    "malformed",
    JSON.stringify({ version: 2, id: "11111111-1111-4111-8111-111111111111" }),
    JSON.stringify({ version: 1, id: "not-an-id" }),
  ]) {
    writeFileSync(f.identity, content, { mode: 0o600 });
    await assert.rejects(
      saveLearningApiKey(f.directory, firstEndpoint, firstKey, memory.store),
      /Credential identity/,
    );
    assert.equal(readFileSync(f.identity, "utf8"), content);
  }
  rmSync(f.identity);
  await saveLearningApiKey(f.directory, firstEndpoint, firstKey, memory.store);
  if (process.platform !== "win32") {
    chmodSync(f.identity, 0o644);
    await assert.rejects(
      readLearningApiKey(f.directory, firstEndpoint, undefined, memory.store),
      /private regular file/,
    );
  }
});
