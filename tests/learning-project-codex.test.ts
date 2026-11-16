import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  chmod,
  writeFile,
  readFile,
  rm,
  symlink,
  realpath,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { selectProjectCodex } from "../scripts/lib/learning-project-codex.ts";
import {
  projectCodexVersion,
  type ProjectProcessOptions,
  type ProjectProcessResult,
} from "../scripts/lib/learning-project-process.ts";

const supported = process.platform === "darwin" || process.platform === "linux";
const success = (stdout = ""): ProjectProcessResult => ({
  code: 0,
  signal: null,
  stdout,
  stderr: "",
  timedOut: false,
  outputLimitExceeded: false,
});

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await mkdtemp(path.join(tmpdir(), "project codex selector "));
  t.after(() => rm(root, { recursive: true, force: true }));
  const profile = path.join(root, "course profile"),
    bin = path.join(root, "existing bin"),
    directory = path.join(root, "tools");
  await mkdir(profile);
  await mkdir(bin);
  const command = path.join(bin, "codex");
  await writeFile(command, "#!/bin/sh\nprintf 'codex-cli 0.154.0\\n'\n", {
    mode: 0o755,
  });
  return { root, profile, bin, command, directory };
}

async function installFixture(directory: string) {
  const pkg = path.join(
    directory,
    `codex-${projectCodexVersion}`,
    "node_modules/@openai/codex",
  );
  await mkdir(path.join(pkg, "bin"), { recursive: true });
  await writeFile(
    path.join(pkg, "package.json"),
    JSON.stringify({ name: "@openai/codex", version: projectCodexVersion }),
  );
  await writeFile(
    path.join(pkg, "bin/codex.js"),
    "// synthetic managed entry\n",
  );
}

test(
  "an existing stable CLI is reused without creating tools or exposing keys to its probe",
  { skip: !supported },
  async (t) => {
    const f = await fixture(t),
      calls: ProjectProcessOptions[] = [],
      logs: string[] = [];
    const result = await selectProjectCodex({
      directory: f.directory,
      profile: f.profile,
      env: {
        PATH: f.bin,
        HOME: "/real/student/home",
        CODEX_HOME: "/ordinary/profile",
        AALTO_LLM_API_KEY: "synthetic-aalto-key",
        UNRELATED_TOKEN: "synthetic-token",
        NODE_OPTIONS: "--import injected",
        DEPARTMENT_ACCESS: "synthetic-secret",
      },
      log: (message) => logs.push(message),
      run: async (options) => {
        calls.push(options);
        return success("codex-cli 0.154.1\n");
      },
    });
    assert.deepEqual(result, {
      command: f.command,
      args: [],
      version: "0.154.1",
      source: "installed",
      executable: await realpath(f.command),
    });
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0]!.args, ["--version"]);
    assert.deepEqual(calls[0]!.env, {
      PATH: f.bin,
      HOME: "/real/student/home",
      CODEX_HOME: f.profile,
    });
    assert.equal(calls[0]!.cwd, f.profile);
    assert.equal(calls[0]!.timeoutMs, 15_000);
    assert.equal(calls[0]!.maxOutputBytes, 64_000);
    assert.equal(existsSync(f.directory), false);
    assert.doesNotMatch(logs.join("\n"), /synthetic/);
    assert.match(logs.join("\n"), /installed Codex CLI 0\.154\.1/);
  },
);

test(
  "stable numeric versions meet the minimum without lexicographic or prerelease mistakes",
  { skip: !supported },
  async (t) => {
    for (const [output, eligible] of [
      ["codex-cli 0.154.0\n", true],
      ["codex-cli 0.154.10", true],
      ["codex-cli 0.155.0", true],
      ["codex-cli 1.0.0", true],
      ["codex-cli 0.99.99", false],
      ["codex-cli 0.153.999", false],
      ["codex-cli 0.154.0-alpha.1", false],
      ["codex-cli 0.155.0-rc.1", false],
      ["codex-cli 0.154.0+custom", false],
      ["codex-cli 0.0154.0", false],
      ["codex-cli 9007199254740992.0.0", false],
      ["codex-cli 0.154.0\nunexpected output", false],
      ["some-other-cli 0.154.0", false],
      ["", false],
    ] as const)
      await t.test(output || "empty", async (sub) => {
        const f = await fixture(sub),
          calls: ProjectProcessOptions[] = [];
        const selected = await selectProjectCodex({
          directory: f.directory,
          profile: f.profile,
          env: { PATH: f.bin },
          log: () => {},
          run: async (options) => {
            calls.push(options);
            if (options.command === f.command) return success(output);
            if (options.command === "npm") {
              await installFixture(f.directory);
              return success();
            }
            return success(`codex-cli ${projectCodexVersion}\n`);
          },
        });
        assert.equal(selected.source, eligible ? "installed" : "managed");
        assert.equal(
          calls.filter((call) => call.command === "npm").length,
          eligible ? 0 : 1,
        );
        if (!eligible) assert.equal(selected.version, projectCodexVersion);
      });
  },
);

test(
  "npm-style symlinks and paths containing spaces retain invocation and canonical identity",
  { skip: !supported },
  async (t) => {
    const f = await fixture(t),
      target = path.join(f.root, "installed package entry.js"),
      record = path.join(f.root, "probe.json");
    await writeFile(
      target,
      `#!${process.execPath}\nimport {writeFileSync} from 'node:fs';\nwriteFileSync(${JSON.stringify(record)},JSON.stringify({args:process.argv.slice(2),cwd:process.cwd(),home:process.env.HOME,codexHome:process.env.CODEX_HOME,key:process.env.AALTO_LLM_API_KEY}));\nconsole.log('codex-cli 0.156.0');\n`,
      { mode: 0o755 },
    );
    await rm(f.command);
    await symlink(target, f.command);
    const result = await selectProjectCodex({
      directory: f.directory,
      profile: f.profile,
      env: {
        PATH: f.bin,
        HOME: "/real/home",
        AALTO_LLM_API_KEY: "synthetic-key",
      },
      log: () => {},
    });
    assert.equal(result.command, f.command);
    assert.equal(result.executable, await realpath(target));
    assert.equal(result.source, "installed");
    assert.deepEqual(JSON.parse(await readFile(record, "utf8")), {
      args: ["--version"],
      cwd: await realpath(f.profile),
      home: "/real/home",
      codexHome: f.profile,
    });
    assert.equal(existsSync(f.directory), false);
  },
);

test(
  "the first executable PATH match is authoritative; a later newer match is not substituted",
  { skip: !supported },
  async (t) => {
    const f = await fixture(t),
      second = path.join(f.root, "second bin");
    await mkdir(second);
    await writeFile(path.join(second, "codex"), "#!/bin/sh\n", { mode: 0o755 });
    const calls: ProjectProcessOptions[] = [];
    const result = await selectProjectCodex({
      directory: f.directory,
      profile: f.profile,
      env: { PATH: [f.bin, second].join(path.delimiter) },
      log: () => {},
      run: async (options) => {
        calls.push(options);
        if (options.command === f.command) return success("codex-cli 0.153.9");
        if (options.command === "npm") {
          await installFixture(f.directory);
          return success();
        }
        return success(`codex-cli ${projectCodexVersion}`);
      },
    });
    assert.equal(result.source, "managed");
    assert.equal(
      calls.some((call) => call.command === path.join(second, "codex")),
      false,
    );
  },
);

test(
  "PATH lookup skips nonexecutables, directories and broken links",
  { skip: !supported },
  async (t) => {
    const f = await fixture(t),
      bad = path.join(f.root, "nonexecutable"),
      folder = path.join(f.root, "directory"),
      broken = path.join(f.root, "broken");
    for (const directory of [bad, folder, broken]) await mkdir(directory);
    await writeFile(path.join(bad, "codex"), "not executable");
    await chmod(path.join(bad, "codex"), 0o600);
    await mkdir(path.join(folder, "codex"));
    await symlink(path.join(f.root, "absent"), path.join(broken, "codex"));
    const result = await selectProjectCodex({
      directory: f.directory,
      profile: f.profile,
      env: { PATH: [bad, folder, broken, f.bin].join(path.delimiter) },
      log: () => {},
      run: async (options) => {
        assert.equal(options.command, f.command);
        return success(`codex-cli ${projectCodexVersion}`);
      },
    });
    assert.equal(result.source, "installed");
  },
);

test(
  "missing and explicitly bypassed installed CLIs use the private pinned installation",
  { skip: !supported },
  async (t) => {
    for (const forceManaged of [false, true])
      await t.test(forceManaged ? "forced" : "missing", async (sub) => {
        const f = await fixture(sub),
          calls: ProjectProcessOptions[] = [];
        const result = await selectProjectCodex({
          directory: f.directory,
          profile: f.profile,
          forceManaged,
          env: { PATH: forceManaged ? f.bin : path.join(f.root, "absent") },
          log: () => {},
          run: async (options) => {
            calls.push(options);
            assert.notEqual(options.command, f.command);
            if (options.command === "npm") {
              await installFixture(f.directory);
              return success();
            }
            return success(`codex-cli ${projectCodexVersion}`);
          },
        });
        assert.equal(result.source, "managed");
        assert.equal(result.version, projectCodexVersion);
        assert.equal(result.command, process.execPath);
        assert.equal(result.executable, await realpath(result.args[0]!));
        assert.equal(calls[0]!.command, "npm");
        assert.equal(calls[0]!.env?.CODEX_HOME, undefined);
        assert.equal(calls[1]!.cwd, f.profile);
        assert.equal(calls[1]!.env?.CODEX_HOME, f.profile);
      });
  },
);

test(
  "failed, timed-out and noisy version probes fall back without relaying arbitrary diagnostics",
  { skip: !supported },
  async (t) => {
    for (const mode of ["exit", "throw", "timeout", "output"] as const)
      await t.test(mode, async (sub) => {
        const f = await fixture(sub),
          logs: string[] = [];
        const result = await selectProjectCodex({
          directory: f.directory,
          profile: f.profile,
          env: { PATH: f.bin },
          log: (line) => logs.push(line),
          run: async (options) => {
            if (options.command === f.command) {
              if (mode === "throw")
                throw new Error("untrusted diagnostic synthetic-secret");
              return {
                ...success(`codex-cli ${projectCodexVersion}`),
                code: mode === "exit" ? 1 : null,
                stderr: "untrusted synthetic-secret",
                signal:
                  mode === "timeout" || mode === "output" ? "SIGTERM" : null,
                timedOut: mode === "timeout",
                outputLimitExceeded: mode === "output",
              };
            }
            if (options.command === "npm") {
              await installFixture(f.directory);
              return success();
            }
            return success(`codex-cli ${projectCodexVersion}`);
          },
        });
        assert.equal(result.source, "managed");
        assert.doesNotMatch(
          logs.join("\n"),
          /synthetic-secret|untrusted diagnostic/,
        );
      });
  },
);

test(
  "aborting a version probe stops selection even if the executable returns success",
  { skip: !supported },
  async (t) => {
    const f = await fixture(t),
      controller = new AbortController();
    let calls = 0;
    await assert.rejects(
      selectProjectCodex({
        directory: f.directory,
        profile: f.profile,
        env: { PATH: f.bin },
        signal: controller.signal,
        log: () => {},
        run: async () => {
          calls++;
          controller.abort();
          return success(`codex-cli ${projectCodexVersion}`);
        },
      }),
      /selection was cancelled/,
    );
    assert.equal(calls, 1);
    assert.equal(existsSync(f.directory), false);
    calls = 0;
    await assert.rejects(
      selectProjectCodex({
        directory: f.directory,
        profile: f.profile,
        forceManaged: true,
        signal: controller.signal,
        log: () => {},
        run: async () => {
          calls++;
          return success();
        },
      }),
      /selection was cancelled/,
    );
    assert.equal(calls, 0);
  },
);

test(
  "an externally interrupted version probe does not start npm",
  { skip: !supported },
  async (t) => {
    const f = await fixture(t);
    let calls = 0;
    await assert.rejects(
      selectProjectCodex({
        directory: f.directory,
        profile: f.profile,
        env: { PATH: f.bin },
        log: () => {},
        run: async () => {
          calls++;
          return { ...success(), code: null, signal: "SIGTERM" };
        },
      }),
      /selection was interrupted/,
    );
    assert.equal(calls, 1);
    assert.equal(existsSync(f.directory), false);
  },
);
