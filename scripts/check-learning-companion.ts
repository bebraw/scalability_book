// Exercise the release artifact from clean directories; no provider account is needed.
import assert from "node:assert/strict";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { once } from "node:events";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  readFileSync,
  readdirSync,
  chmodSync,
  existsSync,
  writeFileSync,
  cpSync,
} from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { tmpdir } from "node:os";
import { companionRelease } from "../shared/learning-connection.ts";
import { learningDataDirectory } from "./lib/learning-storage.ts";

const root = path.resolve(import.meta.dirname, "..");
const artifact =
  process.env.COMPANION_CHECK_ARTIFACT ??
  path.join(
    root,
    `.local/companion-release/scalableweb-companion-${companionRelease.version}.tgz`,
  );
const directory = mkdtempSync(path.join(tmpdir(), "book-packed-companion-"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
let child: ReturnType<typeof spawn> | null = null;
const currentChild = () => child;
try {
  execFileSync(
    npm,
    [
      "install",
      "--prefix",
      directory,
      "--ignore-scripts",
      "--offline",
      "--no-audit",
      "--no-fund",
      artifact,
    ],
    { encoding: "utf8", shell: process.platform === "win32" },
  );
  const pkg = path.join(directory, "node_modules/@scalableweb/companion");
  const manifest = JSON.parse(
    readFileSync(path.join(pkg, "package.json"), "utf8"),
  );
  assert.equal(manifest.name, companionRelease.name);
  assert.equal(manifest.version, companionRelease.version);
  assert.equal(manifest.dependencies, undefined);
  assert.deepEqual(readdirSync(pkg).sort(), [
    "LICENSE",
    "README.md",
    "bin",
    "dist",
    "package.json",
  ]);
  assert.deepEqual(readdirSync(path.join(pkg, "dist")).sort(), [
    "companion.js",
    "release.json",
  ]);
  const bundle = readFileSync(path.join(pkg, "dist/companion.js"), "utf8");
  assert.ok(
    bundle
      .split("\n")
      .filter((line) => line.startsWith("import "))
      .every((line) => /from ["']node:/.test(line)),
    "The release must import only Node built-ins.",
  );
  assert.ok(
    !/\.local\/learning-companion\/codex|auth\.json.*access_token/.test(bundle),
    "Local credentials must not enter the bundle.",
  );
  const isolatedHome = path.join(directory, "student-home");
  const env = {
    ...process.env,
    HOME: isolatedHome,
    USERPROFILE: isolatedHome,
    XDG_DATA_HOME: path.join(directory, "xdg-data"),
  };
  const bin = path.join(pkg, "bin/companion.mjs"),
    data = learningDataDirectory(process.platform, isolatedHome, env),
    a = path.join(directory, "first-folder"),
    b = path.join(directory, "another-folder");
  mkdirSync(a);
  mkdirSync(b);
  const args = ["--port", "18894", "--origin", "https://book.test"];
  const run = (command: string, extra: string[] = []) =>
    execFileSync(process.execPath, [bin, command, ...args, ...extra], {
      cwd: a,
      encoding: "utf8",
      env,
    });
  const release = JSON.parse(
    readFileSync(path.join(pkg, "dist/release.json"), "utf8"),
  );
  assert.equal(
    run("--version").trim(),
    `${companionRelease.name} ${companionRelease.version} (${release.sourceRevision}${release.dirty ? "+working-tree" : ""})`,
  );
  run("setup", ["--notebook"]);
  const diagnostic = JSON.parse(run("doctor", ["--json"]));
  assert.equal(diagnostic.storage, data);
  assert.equal(diagnostic.release.protocol, companionRelease.protocol);
  assert.equal(
    diagnostic.checks.every((check: { ok: boolean }) => check.ok),
    true,
  );
  const start = async (cwd: string) => {
    child = spawn(process.execPath, [bin, "start", ...args], {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return await new Promise<void>((resolve, reject) => {
      let output = "";
      const timer = setTimeout(
        () => reject(new Error("Packed companion did not start")),
        8000,
      );
      child!.once("exit", () => {
        clearTimeout(timer);
        reject(new Error("Packed companion exited before connecting"));
      });
      child!.stdout!.on("data", (chunk) => {
        output += String(chunk);
        const match = output.match(
          /Learning companion: http:\/\/127\.0\.0\.1:/,
        );
        if (match) {
          clearTimeout(timer);
          assert.doesNotMatch(output, /Pairing code \(single use/);
          resolve();
        }
      });
    });
  };
  const stop = async () => {
    if (child && child.exitCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      await exited;
    }
    child = null;
  };
  let token = "";
  const request = async (route: string, method = "GET", body?: unknown) => {
    const response = await fetch(`http://127.0.0.1:18894${route}`, {
      method,
      headers: {
        Origin: "https://book.test",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    assert.ok(response.ok, JSON.stringify(result));
    return result;
  };
  await start(a);
  token = (await request("/connect", "POST", {})).token;
  const status = await request("/status");
  assert.equal(status.storage, data);
  assert.equal(status.release.name, companionRelease.name);
  assert.equal(status.release.version, companionRelease.version);
  assert.equal(status.schemas.notebook, 1);
  const note = await request("/entries", "POST", {
    kind: "attempt",
    title: "Synthetic first investigation",
    body: "My initial prediction",
    source: {
      url: "https://book.test/demos/",
      kind: "demo",
      anchor: "demo-queue-balance-lab",
      title: "Queue check",
      excerpt: "A common boundary",
      revision: "synthetic",
      conceptIds: ["queue"],
    },
  });
  const busyData = path.join(directory, "busy-port-data");
  const busy = spawnSync(
    process.execPath,
    [bin, "start", ...args, "--directory", busyData],
    { cwd: b, env, encoding: "utf8" },
  );
  assert.equal(busy.status, 1);
  assert.match(busy.stderr, /Port 18894 is unavailable.*--port/);
  assert.equal(existsSync(path.join(busyData, "notebook.sqlite")), false);
  await stop();
  const future = path.join(directory, "future-data");
  mkdirSync(future);
  const futureFile = path.join(future, "notebook.sqlite");
  cpSync(path.join(data, "notebook.sqlite"), futureFile);
  const futureDb = new DatabaseSync(futureFile);
  futureDb.exec("PRAGMA user_version=2");
  futureDb.close();
  const futureBytes = readFileSync(futureFile);
  const incompatible = spawnSync(
    process.execPath,
    [bin, "start", ...args, "--directory", future],
    { cwd: b, env, encoding: "utf8" },
  );
  assert.equal(incompatible.status, 1);
  assert.match(
    incompatible.stderr,
    /needs a newer companion.*data was not changed/,
  );
  assert.deepEqual(readFileSync(futureFile), futureBytes);
  const unavailable = spawnSync(
    process.execPath,
    [bin, "doctor", ...args, "--codex", "--json"],
    { cwd: b, env: { ...env, PATH: a }, encoding: "utf8" },
  );
  assert.equal(unavailable.status, 1);
  assert.match(
    unavailable.stdout,
    /Codex is unavailable.*@openai\/codex@0\.154\.0/,
  );
  writeFileSync(
    path.join(a, "codex"),
    `#!${process.execPath}\nconsole.log("codex-cli 0.0.1");\n`,
    { mode: 0o700 },
  );
  const unsupported = spawnSync(
    process.execPath,
    [bin, "doctor", ...args, "--codex", "--json"],
    { cwd: b, env: { ...env, PATH: a }, encoding: "utf8" },
  );
  assert.equal(unsupported.status, 1);
  assert.match(unsupported.stdout, /0\.0\.1 has not been verified/);
  const readonly = path.join(directory, "readonly-data");
  mkdirSync(readonly);
  chmodSync(readonly, 0o500);
  try {
    const denied = spawnSync(
      process.execPath,
      [bin, "setup", "--directory", readonly, "--notebook", ...args],
      { cwd: b, env, encoding: "utf8" },
    );
    assert.equal(denied.status, 1);
    assert.match(denied.stderr, /permission was denied.*writable --directory/);
    assert.equal(existsSync(path.join(readonly, "notebook.sqlite")), false);
  } finally {
    chmodSync(readonly, 0o700);
  }
  token = "";
  await start(b);
  token = (await request("/connect", "POST", {})).token;
  const retained = await request("/notebook");
  assert.equal(retained.entries[0].id, note.id);
  assert.equal(retained.entries[0].body, "My initial prediction");
  const report = JSON.parse(
    execFileSync(
      process.execPath,
      [
        bin,
        "doctor",
        "--directory",
        path.join(directory, "diagnostic-data"),
        "--port",
        "18895",
        "--json",
      ],
      { cwd: b, encoding: "utf8" },
    ),
  );
  assert.deepEqual(report.connection, { origins: ["https://scalableweb.dev"] });
  assert.doesNotMatch(
    JSON.stringify(report),
    /My initial prediction|Bearer|Pairing code/,
  );
  await stop();
  console.log(
    `Packed ${companionRelease.name}@${companionRelease.version} passed clean installation, built-only runtime, setup/diagnostics, code-free connection and retained work across folders on ${process.platform} / Node ${process.versions.node}.`,
  );
} finally {
  const running = currentChild();
  if (running && running.exitCode === null) {
    const exited = once(running, "exit");
    running.kill("SIGTERM");
    await exited;
  }
  rmSync(directory, { recursive: true, force: true });
}
