import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  rm,
  writeFile,
  readFile,
  mkdir,
  symlink,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const loginModule = new URL(
  "../scripts/lib/learning-codex-login.ts",
  import.meta.url,
).href;
const runner = `
import { loginLearningCodex, logoutLearningCodex } from ${JSON.stringify(loginModule)};
try {
  await (process.argv[3] === "logout" ? logoutLearningCodex : loginLearningCodex)({
    profileDirectory: process.argv[1],
    binary: process.argv[2],
    ...(process.argv[3] === "pipe" ? { withApiKey: true } : {}),
    ...(process.argv[3] === "prompt" ? { apiKey: process.env.LEARNING_PROMPTED_KEY } : {}),
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
`;
const syntheticKey = "synthetic-api-key-for-login-test";

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const directory = await mkdtemp(path.join(tmpdir(), "book-codex-login-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const profileDirectory = path.join(directory, "dedicated profile");
  const binary = path.join(directory, "synthetic-codex");
  await writeFile(
    binary,
    `#!${process.execPath}
import { writeFileSync, existsSync, unlinkSync } from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
const profileDirectory = process.env.CODEX_HOME;
const keyring = process.argv[1] + ".keyring";
if (!args.includes('cli_auth_credentials_store="keyring"')) process.exit(2);
if (args[0] === "login" && args[1] === "status") {
  writeFileSync(path.join(profileDirectory, "status-invocation.json"), JSON.stringify(args));
  console.error("synthetic-private-status-diagnostic");
  process.exit(existsSync(keyring) && !existsSync(process.argv[1] + ".reject-status") ? 0 : 1);
}
if (args[0] === "logout") {
  writeFileSync(path.join(profileDirectory, "logout-invocation.json"), JSON.stringify(args));
  console.error("synthetic-private-logout-diagnostic");
  if (existsSync(process.argv[1] + ".reject-logout")) process.exit(1);
  if (existsSync(keyring)) unlinkSync(keyring);
  process.exit(0);
}
const withApiKey = args.includes("--with-api-key");
let input = "";
if (withApiKey) for await (const chunk of process.stdin) input += chunk;
input = input.trim();
writeFileSync(path.join(profileDirectory, "invocation.json"), JSON.stringify({
  args,
  environment: Object.keys(process.env).sort(),
  profileMatches: process.env.HOME === profileDirectory && process.env.USERPROFILE === profileDirectory,
}));
if (withApiKey) {
  // Deliberately hostile diagnostics prove the wrapper does not echo a key.
  console.log(input);
  console.error(input);
} else console.log("Synthetic browser sign-in prompt");
if (withApiKey && (!input || input === "synthetic-rejected-key")) process.exit(1);
if (input !== "synthetic-no-keyring-key") {
  writeFileSync(keyring, JSON.stringify(
    withApiKey ? { OPENAI_API_KEY: input } : { syntheticBrowserSession: true }
  ), { mode: 0o600 });
  if (input === "synthetic-write-plaintext-key") writeFileSync(path.join(profileDirectory, "auth.json"), "synthetic unexpected plaintext");
}
`,
    { mode: 0o700 },
  );
  return {
    profileDirectory,
    binary,
    keyring: `${binary}.keyring`,
    login(mode: "pipe" | "prompt" | "browser" | "logout", key = syntheticKey) {
      return spawnSync(
        process.execPath,
        ["--input-type=module", "-e", runner, profileDirectory, binary, mode],
        {
          input: mode === "pipe" ? `${key}\n` : "unused outer stdin\n",
          encoding: "utf8",
          timeout: 10_000,
          env: {
            ...process.env,
            OPENAI_API_KEY: "synthetic-inherited-key-must-not-be-forwarded",
            ANTHROPIC_API_KEY: "synthetic-unrelated-key-must-not-be-forwarded",
            LEARNING_PROMPTED_KEY: key,
          },
        },
      );
    },
  };
}

for (const mode of ["pipe", "prompt"] as const) {
  test(`${mode} API key login sends only stdin to the dedicated Codex profile and suppresses key diagnostics`, async (t) => {
    const f = await fixture(t);
    const result = f.login(mode);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");
    const invocation = JSON.parse(
      await readFile(path.join(f.profileDirectory, "invocation.json"), "utf8"),
    );
    assert.deepEqual(invocation.args, [
      "login",
      "--with-api-key",
      "-c",
      'cli_auth_credentials_store="keyring"',
    ]);
    assert.equal(invocation.profileMatches, true);
    for (const key of [
      "OPENAI_API_KEY",
      "ANTHROPIC_API_KEY",
      "LEARNING_PROMPTED_KEY",
    ])
      assert.equal(invocation.environment.includes(key), false);
    assert.deepEqual(JSON.parse(await readFile(f.keyring, "utf8")), {
      OPENAI_API_KEY: syntheticKey,
    });
    assert.equal(existsSync(path.join(f.profileDirectory, "auth.json")), false);
    assert.deepEqual(
      JSON.parse(
        await readFile(
          path.join(f.profileDirectory, "status-invocation.json"),
          "utf8",
        ),
      ),
      ["login", "status", "-c", 'cli_auth_credentials_store="keyring"'],
    );
    assert.equal(
      existsSync(path.join(f.profileDirectory, "companion.lock")),
      false,
    );
    assert.equal(
      existsSync(path.join(f.profileDirectory, "config.toml")),
      false,
    );
  });
}

test("browser login preserves the interactive flow and keyring credential isolation", async (t) => {
  const f = await fixture(t);
  const result = f.login("browser");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Synthetic browser sign-in prompt/);
  const invocation = JSON.parse(
    await readFile(path.join(f.profileDirectory, "invocation.json"), "utf8"),
  );
  assert.deepEqual(invocation.args, [
    "login",
    "-c",
    'cli_auth_credentials_store="keyring"',
  ]);
  assert.equal(invocation.profileMatches, true);
});

test("failed API key login retains existing credentials and releases the profile for retry", async (t) => {
  const f = await fixture(t);
  await mkdir(f.profileDirectory);
  const original = JSON.stringify({ syntheticExistingSession: true });
  await writeFile(f.keyring, original);
  const rejected = f.login("pipe", "synthetic-rejected-key");
  assert.equal(rejected.status, 1);
  assert.equal(rejected.stdout, "");
  assert.match(rejected.stderr, /API key sign-in did not complete/);
  assert.equal(rejected.stderr.includes("synthetic-rejected-key"), false);
  assert.equal(await readFile(f.keyring, "utf8"), original);
  assert.equal(
    existsSync(path.join(f.profileDirectory, "companion.lock")),
    false,
  );
  assert.equal(f.login("pipe").status, 0);
});

test("a successful child exit without keyring authentication is not a completed login", async (t) => {
  const f = await fixture(t);
  const result = f.login("pipe", "synthetic-no-keyring-key");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /API key sign-in did not complete/);
  assert.equal(result.stderr.includes("synthetic-no-keyring-key"), false);
});

test("a profile with custom configuration is rejected before sending the key", async (t) => {
  const f = await fixture(t);
  await mkdir(f.profileDirectory);
  await writeFile(path.join(f.profileDirectory, "config.toml"), "");
  const result = f.login("pipe");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /without config.toml/);
  assert.equal(
    existsSync(path.join(f.profileDirectory, "invocation.json")),
    false,
  );
});

test("unexpected plaintext credentials are rejected without being read or removed", async (t) => {
  const f = await fixture(t);
  await mkdir(f.profileDirectory);
  const plaintext = path.join(f.profileDirectory, "auth.json");
  const original = "synthetic credential contents are never parsed";
  await writeFile(plaintext, original, { mode: 0o600 });
  const blocked = f.login("pipe");
  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /new empty --codex-home/);
  assert.equal(
    existsSync(path.join(f.profileDirectory, "invocation.json")),
    false,
  );
  assert.equal(await readFile(plaintext, "utf8"), original);
  assert.equal(existsSync(f.keyring), false);
});

test("unexpected plaintext written during keyring login is rejected and left untouched", async (t) => {
  const f = await fixture(t);
  const result = f.login("pipe", "synthetic-write-plaintext-key");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /unexpected plaintext auth.json/);
  assert.equal(
    await readFile(path.join(f.profileDirectory, "auth.json"), "utf8"),
    "synthetic unexpected plaintext",
  );
  assert.equal(result.stderr.includes("synthetic-write-plaintext-key"), false);
});

test("unexpected credential symlinks are rejected without following them", async (t) => {
  const f = await fixture(t);
  await mkdir(f.profileDirectory);
  const target = `${f.binary}.private-file`;
  await writeFile(target, "synthetic private target");
  await symlink(target, path.join(f.profileDirectory, "auth.json"));
  const result = f.login("pipe");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /unexpected plaintext auth.json/);
  assert.equal(await readFile(target, "utf8"), "synthetic private target");
  assert.equal(
    existsSync(path.join(f.profileDirectory, "invocation.json")),
    false,
  );
});

test("a keyring verification failure is a sanitized login failure without plaintext fallback", async (t) => {
  const f = await fixture(t);
  await writeFile(`${f.binary}.reject-status`, "");
  const result = f.login("pipe");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /credential store/);
  assert.equal(
    result.stderr.includes("synthetic-private-status-diagnostic"),
    false,
  );
  assert.equal(result.stderr.includes(syntheticKey), false);
  assert.equal(existsSync(path.join(f.profileDirectory, "auth.json")), false);
});

test("logout delegates keyring deletion to Codex and verifies sign-out without exposing diagnostics", async (t) => {
  const f = await fixture(t);
  assert.equal(f.login("pipe").status, 0);
  await writeFile(`${f.binary}.reject-logout`, "");
  const failed = f.login("logout");
  assert.equal(failed.status, 1);
  assert.equal(existsSync(f.keyring), true);
  assert.equal(
    failed.stderr.includes("synthetic-private-logout-diagnostic"),
    false,
  );
  await rm(`${f.binary}.reject-logout`);
  const result = f.login("logout");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
  assert.equal(existsSync(f.keyring), false);
  assert.deepEqual(
    JSON.parse(
      await readFile(
        path.join(f.profileDirectory, "logout-invocation.json"),
        "utf8",
      ),
    ),
    ["logout", "-c", 'cli_auth_credentials_store="keyring"'],
  );
});

test(
  "explicit API key login refuses a terminal that would echo a pasted key",
  { skip: process.platform === "win32" },
  async (t) => {
    const f = await fixture(t);
    const driver = fileURLToPath(
      new URL("./fixtures/learning-cli-terminal.py", import.meta.url),
    );
    const result = spawnSync("python3", [driver], {
      input: JSON.stringify({
        command: [
          process.execPath,
          "--input-type=module",
          "-e",
          runner,
          f.profileDirectory,
          f.binary,
          "pipe",
        ],
        environment: process.env,
        steps: [],
      }),
      encoding: "utf8",
      timeout: 25_000,
    });
    assert.equal(result.status, 0, result.stderr);
    const outcome = JSON.parse(result.stdout);
    assert.equal(outcome.code, 1, outcome.transcript);
    assert.match(outcome.transcript, /Pipe an OpenAI API key.*hidden prompt/);
    assert.equal(existsSync(f.profileDirectory), false);
  },
);
