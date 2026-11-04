import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  rm,
  writeFile,
  readFile,
  stat,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const cli =
  process.env.LEARNING_COMPANION_BIN ??
  fileURLToPath(
    new URL("../scripts/learning-companion-entry.ts", import.meta.url),
  );

async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = (server.address() as { port: number }).port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const directory = await mkdtemp(path.join(tmpdir(), "book-cli-onboarding-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const data = path.join(directory, "notebook");
  const binaries = path.join(directory, "binaries");
  await mkdir(binaries);
  const env = { ...process.env, PATH: binaries };
  const run = async (
    args: string[],
    input = "",
    extraEnv: Record<string, string> = {},
    preload?: string,
  ) => {
    const child = spawn(
      process.execPath,
      [
        ...(preload ? ["--import", preload] : []),
        cli,
        ...args,
        "--directory",
        data,
      ],
      {
        env: { ...env, ...extraEnv },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.stdin.on("error", () => {});
    const completed = once(child, "close");
    child.stdin.end(input);
    const timer = setTimeout(() => child.kill("SIGKILL"), 10_000);
    const [code] = await completed;
    clearTimeout(timer);
    return { code, stdout, stderr };
  };
  return { directory, data, binaries, env, run };
}

const endpoint = "https://api.example.test/v1";
const apiKey = "synthetic-cli-api-key";
const rotatedKey = "synthetic-cli-rotated-key";
async function apiFixture(directory: string, replies = false) {
  const preload = path.join(directory, "synthetic-api.mjs");
  const requests = path.join(directory, "api-requests.jsonl");
  const keychainFile = path.join(directory, "synthetic-os-keychain.json");
  const nativeModule = path.join(directory, "synthetic-keyring.mjs");
  await writeFile(
    nativeModule,
    `
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const file = ${JSON.stringify(keychainFile)};
function read() { return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {}; }
export class AsyncEntry {
  constructor(service, account, options) {
    assert.deepEqual(options, { linux: { store: "secret-service" } });
    if (process.env.LEARNING_TEST_KEYCHAIN_UNAVAILABLE) throw new Error("Hostile native diagnostic: " + ${JSON.stringify(apiKey)});
    this.id = service + ":" + account;
  }
  async getPassword() { return read()[this.id] ?? null; }
  async setPassword(key) { writeFileSync(file, JSON.stringify({ ...read(), [this.id]: key })); }
  async deleteCredential() { const saved = read(); const existed = this.id in saved; delete saved[this.id]; writeFileSync(file, JSON.stringify(saved)); return existed; }
}
`,
  );
  await writeFile(
    preload,
    `
import { appendFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
registerHooks({ resolve(specifier, context, next) {
  return specifier === "@napi-rs/keyring" ? { url: pathToFileURL(${JSON.stringify(nativeModule)}).href, shortCircuit: true } : next(specifier, context);
} });
globalThis.fetch = async (url, options = {}) => {
  const authorization = new Headers(options.headers).get("Authorization");
  const accepted = ${JSON.stringify([apiKey, rotatedKey])}.some(key => authorization === "Bearer " + key);
  const body = options.body ? JSON.parse(options.body) : undefined;
  appendFileSync(${JSON.stringify(requests)}, JSON.stringify({ url: String(url), method: options.method ?? "GET", accepted, ...(${replies} ? { body } : {}) }) + "\\n");
  if (!accepted) return Response.json({ error: "Rejected secret " + authorization }, { status: 401 });
  if (String(url) === ${JSON.stringify(`${endpoint}/models`)} && (!options.method || options.method === "GET")) return Response.json({ data: [{ id: "study-small" }] });
  if (${replies} && String(url) === ${JSON.stringify(`${endpoint}/chat/completions`)} && options.method === "POST" && body.model === "study-small") {
    const turns = body.messages.filter(message => message.role === "user").length;
    return Response.json({ model: "study-small", choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Synthetic explanation " + turns + "." } }] });
  }
  throw new Error("Unexpected synthetic API request");
};
`,
  );
  return {
    preload,
    keychainFile,
    async keys(): Promise<string[]> {
      return existsSync(keychainFile)
        ? Object.values(JSON.parse(await readFile(keychainFile, "utf8")))
        : [];
    },
    async requests() {
      return (await readFile(requests, "utf8"))
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
    },
  };
}

test("CLI API key login reaches the selected dedicated Codex profile without exposing the key", async (t) => {
  const f = await fixture(t);
  const port = await freePort();
  const profileDirectory = path.join(f.directory, "chosen-codex-profile");
  const codexCredential = path.join(
    f.directory,
    "synthetic-codex-keyring.json",
  );
  await writeFile(
    path.join(f.binaries, "codex"),
    `#!${process.execPath}
import { existsSync, writeFileSync, rmSync } from "node:fs";
const args = process.argv.slice(2);
const credential = ${JSON.stringify(codexCredential)};
if (args[0] === "--version") { console.log("codex-cli 0.154.0"); process.exit(0); }
if (!args.includes('cli_auth_credentials_store="keyring"')) process.exit(2);
if (args[0] === "login" && args[1] === "status") process.exit(existsSync(credential) ? 0 : 1);
if (args[0] === "logout") { rmSync(credential, { force: true }); process.exit(0); }
if (JSON.stringify(args) !== JSON.stringify(["login", "--with-api-key", "-c", 'cli_auth_credentials_store="keyring"'])) process.exit(2);
let key = "";
for await (const chunk of process.stdin) key += chunk;
key = key.trim();
console.error("Hostile credential diagnostic: " + key);
writeFileSync(credential, JSON.stringify({ OPENAI_API_KEY: key }), { mode: 0o600 });
`,
    { mode: 0o700 },
  );
  const setup = await f.run([
    "setup",
    "--codex",
    "--codex-home",
    profileDirectory,
    "--port",
    String(port),
  ]);
  assert.equal(setup.code, 0, setup.stderr);
  const login = await f.run(["login", "--with-api-key"], `${apiKey}\n`);
  assert.equal(login.code, 0, login.stderr);
  assert.equal(`${login.stdout}${login.stderr}`.includes(apiKey), false);
  assert.deepEqual(JSON.parse(await readFile(codexCredential, "utf8")), {
    OPENAI_API_KEY: apiKey,
  });
  const settings = await readFile(
    path.join(f.data, "companion-settings.json"),
    "utf8",
  );
  assert.equal(settings.includes(apiKey), false);
  const doctor = await f.run(["doctor", "--json"]);
  assert.equal(doctor.code, 0, doctor.stderr);
  assert.equal(`${doctor.stdout}${doctor.stderr}`.includes(apiKey), false);
  assert.equal(JSON.parse(doctor.stdout).provider, "Codex");
  assert.equal(existsSync(path.join(profileDirectory, "auth.json")), false);
  const logout = await f.run(["logout"]);
  assert.equal(logout.code, 0, logout.stderr);
  assert.equal(existsSync(codexCredential), false);
  assert.equal(
    await readFile(path.join(f.data, "companion-settings.json"), "utf8"),
    settings,
  );
});

test("CLI rejects irrelevant authentication and provider options without recording the supplied key", async (t) => {
  const f = await fixture(t);
  for (const args of [
    ["doctor", "--with-api-key"],
    ["start", "--with-api-key"],
    ["setup", "--notebook", "--with-api-key"],
    ["setup", "--notebook", "--api-provider", "openai"],
    ["setup", "--api", "--local-url", "http://127.0.0.1:1234/v1"],
    [
      "setup",
      "--api",
      "--api-key-env",
      "LEARNING_CLI_API_KEY",
      "--with-api-key",
    ],
    ["login", "--api-key", apiKey],
  ]) {
    const result = await f.run(args, `${apiKey}\n`);
    assert.equal(result.code, 1, JSON.stringify(args));
    assert.equal(`${result.stdout}${result.stderr}`.includes(apiKey), false);
    assert.equal(existsSync(path.join(f.data, "api-credentials.json")), false);
    assert.equal(
      existsSync(path.join(f.data, "companion-settings.json")),
      false,
    );
  }
});

test("saved notebook-only mode rejects login and logout before invoking Codex", async (t) => {
  const f = await fixture(t);
  const port = await freePort();
  const setup = await f.run(["setup", "--notebook", "--port", String(port)]);
  assert.equal(setup.code, 0, setup.stderr);
  const calls = path.join(f.directory, "unexpected-codex-call");
  await writeFile(
    path.join(f.binaries, "codex"),
    `#!${process.execPath}
import { writeFileSync } from "node:fs";
writeFileSync(${JSON.stringify(calls)}, "called");
process.exit(0);
`,
    { mode: 0o700 },
  );
  const settings = await readFile(
    path.join(f.data, "companion-settings.json"),
    "utf8",
  );
  for (const command of ["login", "logout"]) {
    const result = await f.run([command]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Notebook-only.*need no provider/);
  }
  assert.equal(existsSync(calls), false);
  assert.equal(existsSync(path.join(f.data, "codex")), false);
  assert.equal(
    await readFile(path.join(f.data, "companion-settings.json"), "utf8"),
    settings,
  );
});

test("direct API onboarding validates access, keeps secrets outside settings/reports, and rotates only a valid key", async (t) => {
  const f = await fixture(t);
  const api = await apiFixture(f.directory);
  const port = await freePort();
  const setup = await f.run(
    [
      "setup",
      "--api",
      "--api-provider",
      "compatible",
      "--api-url",
      endpoint,
      "--model",
      "study-small",
      "--with-api-key",
      "--port",
      String(port),
    ],
    `${apiKey}\n`,
    {},
    api.preload,
  );
  assert.equal(setup.code, 0, setup.stderr);
  assert.equal(`${setup.stdout}${setup.stderr}`.includes(apiKey), false);
  const settings = JSON.parse(
    await readFile(path.join(f.data, "companion-settings.json"), "utf8"),
  );
  assert.equal(settings.provider, "api");
  assert.equal(settings.api.provider, "compatible");
  assert.equal(settings.api.url, endpoint);
  assert.equal(settings.api.model, "study-small");
  assert.equal(settings.api.tools, "none");
  assert.ok(
    settings.api.contextWindow >= 4096 && settings.api.contextWindow <= 262144,
  );
  assert.ok(
    settings.api.outputTokens > 0 &&
      settings.api.outputTokens < settings.api.contextWindow,
  );
  assert.equal(JSON.stringify(settings).includes(apiKey), false);
  assert.deepEqual(await api.keys(), [apiKey]);
  assert.equal(existsSync(path.join(f.data, "api-credentials.json")), false);
  const identity = path.join(f.data, "credential-identity.json");
  assert.equal((await readFile(identity, "utf8")).includes(apiKey), false);
  if (process.platform !== "win32")
    assert.equal((await stat(identity)).mode & 0o777, 0o600);
  const doctor = await f.run(["doctor", "--json"], "", {}, api.preload);
  assert.equal(doctor.code, 0, doctor.stderr);
  assert.equal(`${doctor.stdout}${doctor.stderr}`.includes(apiKey), false);
  assert.ok(
    JSON.parse(doctor.stdout).checks.every(
      (check: { ok: boolean }) => check.ok,
    ),
  );
  const rejectedKey = "synthetic-rejected-api-key";
  const rejected = await f.run(
    ["login", "--with-api-key"],
    `${rejectedKey}\n`,
    {},
    api.preload,
  );
  assert.equal(rejected.code, 1);
  assert.match(rejected.stderr, /authentication|access/);
  assert.equal(
    `${rejected.stdout}${rejected.stderr}`.includes(rejectedKey),
    false,
  );
  assert.deepEqual(await api.keys(), [apiKey]);
  const rotated = await f.run(
    ["login", "--with-api-key"],
    `${rotatedKey}\n`,
    {},
    api.preload,
  );
  assert.equal(rotated.code, 0, rotated.stderr);
  assert.equal(
    `${rotated.stdout}${rotated.stderr}`.includes(rotatedKey),
    false,
  );
  assert.deepEqual(await api.keys(), [rotatedKey]);
  const note = path.join(f.data, "retained-synthetic-note.txt");
  await writeFile(note, "Keep my notebook");
  const logout = await f.run(["logout"], "", {}, api.preload);
  assert.equal(logout.code, 0, logout.stderr);
  assert.deepEqual(await api.keys(), []);
  assert.equal(await readFile(note, "utf8"), "Keep my notebook");
  const missing = await f.run(["doctor", "--json"], "", {}, api.preload);
  assert.equal(missing.code, 1);
  assert.match(missing.stdout, /No API key is saved/);
  const requests = await api.requests();
  assert.ok(requests.length >= 4);
  assert.ok(
    requests.every(
      (request: { url: string; method: string }) =>
        request.url === `${endpoint}/models` && request.method === "GET",
    ),
  );
});

test("an unavailable keychain fails setup without plaintext fallback or changing the notebook configuration", async (t) => {
  const f = await fixture(t);
  const api = await apiFixture(f.directory);
  const port = await freePort();
  const initial = await f.run(["setup", "--notebook", "--port", String(port)]);
  assert.equal(initial.code, 0, initial.stderr);
  const settingsFile = path.join(f.data, "companion-settings.json");
  const settings = await readFile(settingsFile, "utf8");
  const failed = await f.run(
    [
      "setup",
      "--api",
      "--api-provider",
      "compatible",
      "--api-url",
      endpoint,
      "--model",
      "study-small",
      "--with-api-key",
    ],
    `${apiKey}\n`,
    { LEARNING_TEST_KEYCHAIN_UNAVAILABLE: "1" },
    api.preload,
  );
  assert.equal(failed.code, 1);
  assert.match(failed.stderr, /OS keychain.*unavailable/);
  assert.match(failed.stderr, /--api-key-env/);
  assert.equal(`${failed.stdout}${failed.stderr}`.includes(apiKey), false);
  assert.equal(await readFile(settingsFile, "utf8"), settings);
  assert.equal(existsSync(api.keychainFile), false);
  assert.equal(existsSync(path.join(f.data, "api-credentials.json")), false);
  assert.equal(
    (
      await readFile(path.join(f.data, "credential-identity.json"), "utf8")
    ).includes(apiKey),
    false,
  );
});

test("API environment-reference onboarding saves only the variable name and reports its absence", async (t) => {
  const f = await fixture(t);
  const api = await apiFixture(f.directory);
  const port = await freePort();
  const variable = "LEARNING_CLI_API_KEY";
  const setup = await f.run(
    [
      "setup",
      "--api",
      "--api-provider",
      "compatible",
      "--api-url",
      endpoint,
      "--model",
      "study-small",
      "--api-key-env",
      variable,
      "--port",
      String(port),
    ],
    "",
    { [variable]: apiKey, LEARNING_TEST_KEYCHAIN_UNAVAILABLE: "1" },
    api.preload,
  );
  assert.equal(setup.code, 0, setup.stderr);
  const settings = JSON.parse(
    await readFile(path.join(f.data, "companion-settings.json"), "utf8"),
  );
  assert.equal(settings.apiKeyEnv, variable);
  assert.equal(existsSync(api.keychainFile), false);
  assert.equal(
    existsSync(path.join(f.data, "credential-identity.json")),
    false,
  );
  assert.equal(JSON.stringify(settings).includes(apiKey), false);
  assert.equal(existsSync(path.join(f.data, "api-credentials.json")), false);
  const ready = await f.run(
    ["doctor", "--json"],
    "",
    { [variable]: apiKey, LEARNING_TEST_KEYCHAIN_UNAVAILABLE: "1" },
    api.preload,
  );
  assert.equal(ready.code, 0, ready.stderr);
  assert.equal(`${ready.stdout}${ready.stderr}`.includes(apiKey), false);
  const logout = await f.run(
    ["logout"],
    "",
    { [variable]: apiKey, LEARNING_TEST_KEYCHAIN_UNAVAILABLE: "1" },
    api.preload,
  );
  assert.equal(logout.code, 1);
  assert.match(logout.stderr, /environment variable.*Unset/);
  assert.equal(existsSync(api.keychainFile), false);
  const missing = await f.run(
    ["doctor", "--json"],
    "",
    { [variable]: "" },
    api.preload,
  );
  assert.equal(missing.code, 1);
  assert.match(
    `${missing.stdout}${missing.stderr}`,
    new RegExp(`Set ${variable}`),
  );
});

test("a failed API setup preserves the previous notebook choice and does not save the submitted key", async (t) => {
  const f = await fixture(t);
  const api = await apiFixture(f.directory);
  const port = await freePort();
  const initial = await f.run(["setup", "--notebook", "--port", String(port)]);
  assert.equal(initial.code, 0, initial.stderr);
  const settingsFile = path.join(f.data, "companion-settings.json");
  const original = await readFile(settingsFile, "utf8");
  const result = await f.run(
    [
      "setup",
      "--api",
      "--api-provider",
      "compatible",
      "--api-url",
      endpoint,
      "--model",
      "unavailable-model",
      "--with-api-key",
    ],
    `${apiKey}\n`,
    {},
    api.preload,
  );
  assert.equal(result.code, 1);
  assert.match(result.stderr, /not listed/);
  assert.equal(`${result.stdout}${result.stderr}`.includes(apiKey), false);
  assert.equal(await readFile(settingsFile, "utf8"), original);
  assert.equal(existsSync(path.join(f.data, "api-credentials.json")), false);
});

test("setup retains the chosen website and port for doctor and the next start", async (t) => {
  const f = await fixture(t);
  const port = await freePort();
  const origin = "https://onboarding.example.test";
  const setup = await f.run([
    "setup",
    "--notebook",
    "--origin",
    origin,
    "--port",
    String(port),
  ]);
  assert.equal(setup.code, 0, setup.stderr);
  const doctor = await f.run(["doctor", "--json"]);
  assert.equal(doctor.code, 0, doctor.stderr);
  const report = JSON.parse(doctor.stdout);
  assert.deepEqual(report.connection.origins, [origin]);
  assert.ok(
    report.checks.some(
      (check: { name: string; message: string }) =>
        check.name === "Loopback port" &&
        check.message.includes(`127.0.0.1:${port}`),
    ),
  );

  const child = spawn(process.execPath, [cli, "start", "--directory", f.data], {
    env: f.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    output += String(chunk);
  });
  const completed = once(child, "close");
  try {
    const deadline = Date.now() + 8_000;
    while (!output.includes("Learning companion:")) {
      assert.equal(child.exitCode, null, output);
      assert.ok(
        Date.now() < deadline,
        `Companion startup timed out: ${output}`,
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const response = await fetch(`http://127.0.0.1:${port}/connect`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(response.status, 200, await response.text());
  } finally {
    child.kill("SIGTERM");
    await completed;
  }
});

test(
  "guided API setup completes in a terminal without echoing the key",
  { skip: process.platform === "win32" },
  async (t) => {
    const f = await fixture(t);
    const api = await apiFixture(f.directory);
    const port = await freePort();
    const terminal = fileURLToPath(
      new URL("./fixtures/learning-cli-terminal.py", import.meta.url),
    );
    const result = spawnSync("python3", [terminal], {
      encoding: "utf8",
      timeout: 25_000,
      input: JSON.stringify({
        command: [
          process.execPath,
          "--import",
          api.preload,
          cli,
          "setup",
          "--directory",
          f.data,
          "--port",
          String(port),
        ],
        environment: f.env,
        steps: [
          { prompt: "Choice (1", input: "4\n" },
          { prompt: "API provider:", input: "5\n" },
          { prompt: "HTTPS API base URL", input: `${endpoint}\n` },
          { prompt: "API key (hidden;", input: `${apiKey}\n` },
          { prompt: "Model number or exact identifier", input: "1\n" },
        ],
      }),
    });
    assert.equal(result.status, 0, result.stderr);
    const outcome = JSON.parse(result.stdout);
    assert.equal(
      outcome.transcript.includes(apiKey),
      false,
      "The terminal echoed the synthetic API key",
    );
    assert.equal(outcome.code, 0, outcome.transcript);
    assert.equal(outcome.steps, 5, outcome.transcript);
    assert.match(outcome.transcript, /study-small/);
    assert.match(outcome.transcript, /Next, start Companion/);
    const settings = JSON.parse(
      await readFile(path.join(f.data, "companion-settings.json"), "utf8"),
    );
    assert.equal(settings.provider, "api");
    assert.equal(settings.api.provider, "compatible");
    assert.equal(settings.api.model, "study-small");
    assert.equal(JSON.stringify(settings).includes(apiKey), false);
    assert.deepEqual(await api.keys(), [apiKey]);
    assert.equal(existsSync(path.join(f.data, "api-credentials.json")), false);
  },
);

test("configured API companion replies over HTTP and resumes exact selected context after restart", async (t) => {
  const f = await fixture(t);
  const api = await apiFixture(f.directory, true);
  const port = await freePort();
  const origin = "https://onboarding.example.test";
  const setup = await f.run(
    [
      "setup",
      "--api",
      "--api-provider",
      "compatible",
      "--api-url",
      endpoint,
      "--model",
      "study-small",
      "--with-api-key",
      "--port",
      String(port),
      "--origin",
      origin,
    ],
    `${apiKey}\n`,
    {},
    api.preload,
  );
  assert.equal(setup.code, 0, setup.stderr);
  let token = "";
  let running:
    | { child: ReturnType<typeof spawn>; completed: Promise<unknown> }
    | undefined;
  const request = async (route: string, method = "GET", body?: unknown) => {
    const response = await fetch(`http://127.0.0.1:${port}${route}`, {
      method,
      headers: {
        Origin: origin,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    assert.ok(response.ok, JSON.stringify(data));
    assert.equal(JSON.stringify(data).includes(apiKey), false);
    return data;
  };
  const stop = async () => {
    if (!running) return;
    running.child.kill("SIGTERM");
    await running.completed;
    running = undefined;
  };
  const start = async () => {
    const child = spawn(
      process.execPath,
      ["--import", api.preload, cli, "start", "--directory", f.data],
      { env: f.env, stdio: ["ignore", "pipe", "pipe"] },
    );
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += String(chunk);
    });
    running = { child, completed: once(child, "close") };
    const deadline = Date.now() + 8_000;
    while (!output.includes("Learning companion:")) {
      assert.equal(child.exitCode, null, output);
      assert.ok(
        Date.now() < deadline,
        `Companion startup timed out: ${output}`,
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.equal(output.includes(apiKey), false);
    token = "";
    token = (await request("/connect", "POST", {})).token;
  };
  const source = {
    url: `${origin}/demos/`,
    anchor: "demo-cache-decision-lab",
    title: "Cache decision lab",
    kind: "demo",
    excerpt: "Check response age",
    revision: null,
    conceptIds: ["cache"],
  };
  const firstNote = "SYNTHETIC SELECTED FIRST VERSION";
  const updatedNote = "SYNTHETIC SELECTED UPDATED VERSION";
  const unselectedNote = "SYNTHETIC PRIVATE UNSUPPLIED NOTE";
  try {
    await start();
    const status = await request("/status");
    assert.equal(status.provider, "Compatible API");
    assert.equal(status.capabilities.tools, "none");
    const note = await request("/entries", "POST", {
      kind: "scratch",
      source,
      title: "Selected",
      body: firstNote,
    });
    await request("/entries", "POST", {
      kind: "scratch",
      source,
      title: "Unselected",
      body: unselectedNote,
    });
    const conversation = await request("/agent/conversations", "POST", {
      source,
    });
    const send = async (text: string) => {
      await request(`/agent/conversations/${conversation.id}`, "POST", {
        text,
        mode: "explanation",
        browserId: randomUUID(),
        noteIds: [note.id],
      });
      const deadline = Date.now() + 5_000;
      let state;
      do {
        assert.ok(Date.now() < deadline, "Synthetic API reply did not finish");
        await new Promise((resolve) => setTimeout(resolve, 20));
        state = await request(`/agent/conversations/${conversation.id}`);
      } while (state.state === "working");
      assert.equal(state.state, "idle", JSON.stringify(state));
      return state;
    };
    const first = await send("First synthetic question");
    assert.equal(first.messages.at(-1).text, "Synthetic explanation 1.");
    await stop();
    await start();
    const resumed = await request(`/agent/conversations/${conversation.id}`);
    assert.equal(resumed.threadId, first.threadId);
    assert.deepEqual(resumed.messages, first.messages);
    await request(`/entries/${note.id}`, "PUT", {
      ...note,
      expected: note.revision,
      body: updatedNote,
    });
    const second = await send("Second synthetic question");
    assert.equal(second.messages.at(-1).text, "Synthetic explanation 2.");
    const archive = await request("/export");
    assert.equal(JSON.stringify(archive).includes(first.threadId), false);
    const completions = (await api.requests()).filter(
      (item: { method: string }) => item.method === "POST",
    );
    assert.equal(completions.length, 2);
    const replay = JSON.stringify(completions[1].body.messages);
    assert.ok(replay.includes(firstNote));
    assert.ok(replay.includes(updatedNote));
    assert.ok(replay.includes("First synthetic question"));
    assert.ok(replay.includes("Synthetic explanation 1."));
    assert.equal(JSON.stringify(completions).includes(unselectedNote), false);
    assert.equal(JSON.stringify(completions).includes(apiKey), false);
  } finally {
    await stop();
  }
});

test("API login persists a changed environment reference for subsequent doctor and start", async (t) => {
  const f = await fixture(t);
  const api = await apiFixture(f.directory);
  const port = await freePort();
  const oldVariable = "LEARNING_CLI_OLD_API_KEY";
  const newVariable = "LEARNING_CLI_NEW_API_KEY";
  const setup = await f.run(
    [
      "setup",
      "--api",
      "--api-provider",
      "compatible",
      "--api-url",
      endpoint,
      "--model",
      "study-small",
      "--api-key-env",
      oldVariable,
      "--port",
      String(port),
    ],
    "",
    { [oldVariable]: apiKey },
    api.preload,
  );
  assert.equal(setup.code, 0, setup.stderr);
  const login = await f.run(
    ["login", "--api-key-env", newVariable],
    "",
    { [newVariable]: rotatedKey },
    api.preload,
  );
  assert.equal(login.code, 0, login.stderr);
  assert.equal(`${login.stdout}${login.stderr}`.includes(rotatedKey), false);
  const settings = JSON.parse(
    await readFile(path.join(f.data, "companion-settings.json"), "utf8"),
  );
  assert.equal(settings.apiKeyEnv, newVariable);
  assert.equal(JSON.stringify(settings).includes(rotatedKey), false);
  assert.equal(existsSync(path.join(f.data, "api-credentials.json")), false);
  const doctor = await f.run(
    ["doctor", "--json"],
    "",
    { [newVariable]: rotatedKey },
    api.preload,
  );
  assert.equal(doctor.code, 0, doctor.stderr);
  const child = spawn(
    process.execPath,
    ["--import", api.preload, cli, "start", "--directory", f.data],
    {
      env: { ...f.env, [newVariable]: rotatedKey },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    output += String(chunk);
  });
  const completed = once(child, "close");
  try {
    const deadline = Date.now() + 8_000;
    while (!output.includes("Learning companion:")) {
      assert.equal(child.exitCode, null, output);
      assert.ok(
        Date.now() < deadline,
        `Companion startup timed out: ${output}`,
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.equal(output.includes(rotatedKey), false);
    const response = await fetch(`http://127.0.0.1:${port}/connect`, {
      method: "POST",
      headers: {
        Origin: "https://scalableweb.dev",
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    assert.equal(response.status, 200, await response.text());
  } finally {
    child.kill("SIGTERM");
    await completed;
  }
});

test("API login cannot silently change the saved provider configuration or store a key at an overridden endpoint", async (t) => {
  const f = await fixture(t);
  const api = await apiFixture(f.directory);
  const port = await freePort();
  const setup = await f.run(
    [
      "setup",
      "--api",
      "--api-provider",
      "compatible",
      "--api-url",
      endpoint,
      "--model",
      "study-small",
      "--with-api-key",
      "--port",
      String(port),
    ],
    `${apiKey}\n`,
    {},
    api.preload,
  );
  assert.equal(setup.code, 0, setup.stderr);
  const settingsFile = path.join(f.data, "companion-settings.json");
  const credentialsFile = api.keychainFile;
  const settings = await readFile(settingsFile, "utf8");
  const credentials = await readFile(credentialsFile, "utf8");
  const requestCount = (await api.requests()).length;
  for (const options of [
    ["--api-provider", "openai"],
    ["--api-url", "https://other-provider.example.test/v1"],
    ["--api-context", "32768"],
    ["--api-output", "2048"],
    ["--api-tools", "native"],
    ["--model", "another-model"],
    ["--notebook"],
  ]) {
    const result = await f.run(
      ["login", "--with-api-key", ...options],
      `${rotatedKey}\n`,
      {},
      api.preload,
    );
    assert.equal(result.code, 1, JSON.stringify(options));
    assert.match(result.stderr, /setup/);
    assert.equal(
      `${result.stdout}${result.stderr}`.includes(rotatedKey),
      false,
    );
    assert.equal(await readFile(settingsFile, "utf8"), settings);
    assert.equal(await readFile(credentialsFile, "utf8"), credentials);
  }
  assert.equal((await api.requests()).length, requestCount);
});
