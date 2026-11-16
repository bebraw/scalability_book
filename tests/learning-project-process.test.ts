import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  symlink,
  realpath,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { tmpdir } from "node:os";
import {
  ensureProjectCodex,
  projectCodexVersion,
  runProjectProcess,
  sanitizedProjectEnvironment,
  type ProjectProcessOptions,
  type ProjectProcessResult,
} from "../scripts/lib/learning-project-process.ts";

const supported = process.platform === "darwin" || process.platform === "linux";
async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const directory = await mkdtemp(path.join(tmpdir(), "project process "));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
const success = (stdout = ""): ProjectProcessResult => ({
  code: 0,
  signal: null,
  stdout,
  stderr: "",
  timedOut: false,
  outputLimitExceeded: false,
});

test("project environment preserves terminal HOME and drops credentials and process-injection settings", () => {
  const actual = sanitizedProjectEnvironment({
    HOME: "/real/home",
    PATH: "/bin:/usr/bin",
    TERM: "xterm-256color",
    LC_CTYPE: "UTF-8",
    AALTO_KEY: "private",
    OPENAI_API_KEY: "private",
    DEPARTMENT_ACCESS: "private",
    GITHUB_TOKEN: "private",
    CODEX_HOME: "/ordinary/profile",
    NODE_OPTIONS: "--import hostile.mjs",
    NODE_PATH: "/hostile",
    BASH_ENV: "/hostile",
    NPM_CONFIG_REGISTRY: "https://other.test",
    DYLD_INSERT_LIBRARIES: "/hostile",
    HTTP_PROXY: "http://user:password@proxy.test",
    HTTPS_PROXY: "http://proxy.test:8080",
  });
  assert.deepEqual(actual, {
    HOME: "/real/home",
    PATH: "/bin:/usr/bin",
    TERM: "xterm-256color",
    LC_CTYPE: "UTF-8",
    HTTPS_PROXY: "http://proxy.test:8080",
  });
});

test(
  "process execution keeps arguments literal, uses the chosen directory and returns the real exit",
  { skip: !supported },
  async (t) => {
    const directory = await fixture(t);
    const literal = "$(touch escaped); `touch escaped`; 'quoted value'";
    const result = await runProjectProcess({
      command: process.execPath,
      args: [
        "-e",
        "console.log(JSON.stringify({cwd:process.cwd(),arg:process.argv[1]}));process.exitCode=7",
        literal,
      ],
      cwd: directory,
      env: sanitizedProjectEnvironment(),
      stdio: "capture",
    });
    assert.equal(result.code, 7);
    assert.deepEqual(JSON.parse(result.stdout), {
      cwd: await realpath(directory),
      arg: literal,
    });
    assert.equal(existsSync(path.join(directory, "escaped")), false);
    assert.equal(result.timedOut, false);
  },
);

test(
  "captured output and progress redact a secret split across chunks",
  { skip: !supported },
  async (t) => {
    const directory = await fixture(t);
    const secret = "synthetic-department-key";
    const shown: string[] = [];
    const result = await runProjectProcess({
      command: process.execPath,
      args: [
        "-e",
        "process.stdout.write(process.env.AALTO_LLM_API_KEY.slice(0,10));setTimeout(()=>{console.log(process.env.AALTO_LLM_API_KEY.slice(10));console.error(process.env.AALTO_LLM_API_KEY)},20)",
      ],
      cwd: directory,
      env: { ...sanitizedProjectEnvironment(), AALTO_LLM_API_KEY: secret },
      stdio: "capture",
      onOutput: (text) => shown.push(text),
    });
    assert.equal(result.code, 0);
    assert.equal(result.stdout, "[redacted]\n");
    assert.equal(result.stderr, "[redacted]\n");
    assert.equal(shown.join(""), "[redacted]\n[redacted]\n");
    assert.equal(JSON.stringify(result).includes(secret), false);
  },
);

test(
  "capture preserves UTF-8 characters split across chunks",
  { skip: !supported },
  async (t) => {
    const directory = await fixture(t);
    const result = await runProjectProcess({
      command: process.execPath,
      args: [
        "-e",
        "const b=Buffer.from('Näin\\n');process.stdout.write(b.subarray(0,2));setTimeout(()=>process.stdout.write(b.subarray(2)),20)",
      ],
      cwd: directory,
      env: sanitizedProjectEnvironment(),
      stdio: "capture",
    });
    assert.equal(result.stdout, "Näin\n");
  },
);

test(
  "capture output limit stops a noisy command and is distinct from a timeout",
  { skip: !supported },
  async (t) => {
    const directory = await fixture(t);
    const result = await runProjectProcess({
      command: process.execPath,
      args: [
        "-e",
        "console.log('before');setTimeout(()=>process.stdout.write('x'.repeat(10000)),20);setInterval(()=>{},1000)",
      ],
      cwd: directory,
      env: sanitizedProjectEnvironment(),
      stdio: "capture",
      maxOutputBytes: 100,
    });
    assert.equal(result.outputLimitExceeded, true);
    assert.equal(result.timedOut, false);
    assert.equal(result.stdout, "before\n");
    assert.notEqual(result.code, 0);
  },
);

test(
  "timeout kills a captured process group including a child that ignores SIGTERM",
  { skip: !supported },
  async (t) => {
    const directory = await fixture(t);
    const pidFile = path.join(directory, "child.pid");
    const lateFile = path.join(directory, "late.txt");
    const descendant = `process.on('SIGTERM',()=>{});setTimeout(()=>{require('node:fs').writeFileSync(${JSON.stringify(lateFile)},'escaped');process.exit(0)},2200)`;
    const script = `const {spawn}=require('node:child_process');const c=spawn(process.execPath,['-e',${JSON.stringify(descendant)}],{stdio:'ignore'});require('node:fs').writeFileSync(${JSON.stringify(pidFile)},String(c.pid));process.on('SIGTERM',()=>{});setInterval(()=>{},1000)`;
    const result = await runProjectProcess({
      command: process.execPath,
      args: ["-e", script],
      cwd: directory,
      env: sanitizedProjectEnvironment(),
      stdio: "capture",
      timeoutMs: 300,
    });
    assert.equal(result.timedOut, true);
    assert.equal(result.signal, "SIGKILL");
    const pid = Number(await readFile(pidFile, "utf8"));
    let running = false;
    try {
      const state = execFileSync("ps", ["-o", "stat=", "-p", String(pid)], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      running = Boolean(state) && !state.startsWith("Z");
    } catch {
      /* No such process. */
    }
    assert.equal(
      running,
      false,
      "The descendant must not remain runnable after timeout cleanup.",
    );
    await new Promise((resolve) => setTimeout(resolve, 1100));
    assert.equal(
      existsSync(lateFile),
      false,
      "A timed-out descendant must not write its delayed output.",
    );
  },
);

test(
  "explicit abort stops a foreground command and its descendant",
  { skip: !supported },
  async (t) => {
    const directory = await fixture(t);
    const pidFile = path.join(directory, "foreground-child.pid");
    const lateFile = path.join(directory, "foreground-late.txt");
    const descendant = `process.on('SIGTERM',()=>{});setTimeout(()=>{require('node:fs').writeFileSync(${JSON.stringify(lateFile)},'escaped');process.exit(0)},2200)`;
    const script = `const {spawn}=require('node:child_process');const c=spawn(process.execPath,['-e',${JSON.stringify(descendant)}],{stdio:'ignore'});require('node:fs').writeFileSync(${JSON.stringify(pidFile)},String(c.pid));process.on('SIGTERM',()=>{});setInterval(()=>{},1000)`;
    const controller = new AbortController();
    let canInspect = true;
    try {
      execFileSync("ps", ["-axo", "pid=,ppid="], { stdio: "ignore" });
    } catch {
      canInspect = false;
    }
    const running = runProjectProcess({
      command: process.execPath,
      args: ["-e", script],
      cwd: directory,
      env: sanitizedProjectEnvironment(),
      stdio: "inherit",
      signal: controller.signal,
      timeoutMs: 4000,
    });
    if (!canInspect) {
      await assert.rejects(running, /does not allow the process inspection/);
      assert.equal(
        existsSync(pidFile),
        false,
        "Unavailable cleanup must reject before starting the command.",
      );
      t.diagnostic(
        "Host denies process inspection; verified refusal before launch. Foreground cancellation needs a normal host run.",
      );
      return;
    }
    const deadline = Date.now() + 2000;
    while (!existsSync(pidFile) && Date.now() < deadline)
      await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(existsSync(pidFile), true);
    const descendantPid = Number(await readFile(pidFile, "utf8"));
    t.after(() => {
      try {
        process.kill(descendantPid, "SIGKILL");
      } catch {
        /* Already stopped. */
      }
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    controller.abort();
    const result = await running;
    assert.equal(result.timedOut, false);
    assert.equal(result.signal, "SIGKILL");
    await new Promise((resolve) => setTimeout(resolve, 1200));
    assert.equal(existsSync(lateFile), false);
  },
);

test(
  "abort before launch performs no command and missing executables give a bounded diagnostic",
  { skip: !supported },
  async (t) => {
    const directory = await fixture(t);
    const controller = new AbortController();
    controller.abort();
    const result = await runProjectProcess({
      command: process.execPath,
      args: ["-e", "require('node:fs').writeFileSync('unexpected','x')"],
      cwd: directory,
      env: {},
      stdio: "capture",
      signal: controller.signal,
    });
    assert.equal(result.signal, "SIGTERM");
    assert.equal(existsSync(path.join(directory, "unexpected")), false);
    await assert.rejects(
      runProjectProcess({
        command: path.join(directory, "missing"),
        args: [],
        cwd: directory,
        env: {},
        stdio: "capture",
      }),
      /Could not start missing \(ENOENT\)/,
    );
  },
);

async function installFixture(
  directory: string,
  version = projectCodexVersion,
) {
  const folder = path.join(
    directory,
    `codex-${projectCodexVersion}`,
    "node_modules",
    "@openai",
    "codex",
  );
  await mkdir(path.join(folder, "bin"), { recursive: true });
  await writeFile(
    path.join(folder, "package.json"),
    JSON.stringify({ name: "@openai/codex", version }),
  );
  const entry = path.join(folder, "bin/codex.js");
  await writeFile(entry, "// synthetic installed entry\n");
  return entry;
}

test(
  "managed installation pins npm and verifies the exact installed entry without an installer credential",
  { skip: !supported },
  async (t) => {
    const directory = await fixture(t);
    const calls: ProjectProcessOptions[] = [];
    const messages: string[] = [];
    const profile = path.join(directory, "probe-profile");
    await mkdir(profile);
    const result = await ensureProjectCodex({
      directory,
      profile,
      log: (message) => messages.push(message),
      env: {
        PATH: "/usr/bin:/bin",
        HOME: "/real/home",
        AALTO_KEY: "synthetic-key",
        DEPARTMENT_ACCESS: "synthetic-key",
        NODE_OPTIONS: "--import injected",
      },
      run: async (options) => {
        calls.push(options);
        if (options.command === "npm") {
          await installFixture(directory);
          return success();
        }
        return success(`codex-cli ${projectCodexVersion}\n`);
      },
    });
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0]!.args, [
      "install",
      "--prefix",
      path.join(directory, "codex-0.154.0"),
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--save-exact",
      "--registry=https://registry.npmjs.org",
      "@openai/codex@0.154.0",
    ]);
    assert.deepEqual(calls[0]!.env, {
      PATH: "/usr/bin:/bin",
      HOME: "/real/home",
    });
    assert.equal(result.command, process.execPath);
    assert.deepEqual(result.args, [
      path.join(
        directory,
        "codex-0.154.0/node_modules/@openai/codex/bin/codex.js",
      ),
    ]);
    assert.deepEqual(calls[1]!.args, [...result.args, "--version"]);
    assert.equal(calls[1]!.cwd, profile);
    assert.deepEqual(calls[1]!.env, {
      PATH: "/usr/bin:/bin",
      HOME: "/real/home",
      CODEX_HOME: profile,
    });
    assert.match(
      messages.join("\n"),
      /registry=https:\/\/registry.npmjs.org.*@openai\/codex@0.154.0/,
    );
    assert.equal(existsSync(path.join(directory, "codex-0.154.0.lock")), false);
  },
);

test(
  "existing installation is checked, never silently replaced or resolved through PATH",
  { skip: !supported },
  async (t) => {
    const directory = await fixture(t);
    await installFixture(directory);
    const calls: ProjectProcessOptions[] = [];
    await assert.rejects(
      ensureProjectCodex({
        directory,
        log: () => {},
        run: async (options) => {
          calls.push(options);
          return success("codex-cli 0.1.0\n");
        },
      }),
      /did not verify as 0.154.0.*No alternate harness/,
    );
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.command, process.execPath);
    assert.notEqual(calls[0]!.args[0], "codex");
    assert.equal(existsSync(path.join(directory, "codex-0.154.0.lock")), false);
  },
);

test(
  "wrong package metadata and symlinked managed paths are rejected before execution",
  { skip: !supported },
  async (t) => {
    const directory = await fixture(t);
    const wrong = path.join(directory, "wrong");
    await installFixture(wrong, "9.9.9");
    let calls = 0;
    const run = async () => {
      calls++;
      return success();
    };
    await assert.rejects(
      ensureProjectCodex({ directory: wrong, log: () => {}, run }),
      /not @openai\/codex@0.154.0/,
    );
    const redirected = path.join(directory, "redirected");
    await symlink(wrong, redirected);
    await assert.rejects(
      ensureProjectCodex({ directory: redirected, log: () => {}, run }),
      /symbolic links/,
    );
    const linkEntry = path.join(directory, "entry-link");
    const entry = await installFixture(linkEntry);
    await rm(entry);
    await symlink(
      path.join(
        directory,
        "wrong/codex-0.154.0/node_modules/@openai/codex/bin/codex.js",
      ),
      entry,
    );
    await assert.rejects(
      ensureProjectCodex({ directory: linkEntry, log: () => {}, run }),
      /symbolic links/,
    );
    assert.equal(calls, 0);
  },
);

test(
  "failed installation releases its lock and never starts another executable",
  { skip: !supported },
  async (t) => {
    const directory = await fixture(t);
    let calls = 0;
    await assert.rejects(
      ensureProjectCodex({
        directory,
        log: () => {},
        run: async () => {
          calls++;
          return { ...success(), code: 1 };
        },
      }),
      /installation did not complete/,
    );
    assert.equal(calls, 1);
    assert.equal(existsSync(path.join(directory, "codex-0.154.0.lock")), false);
  },
);
