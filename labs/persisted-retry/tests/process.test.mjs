import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openWorker, workerRecord } from "../store.mjs";

const cwd = fileURLToPath(new URL("../", import.meta.url));
async function receiver(dir) {
  const child = spawn(
    process.execPath,
    ["receiver.mjs", "--dir", dir, "--port", "0"],
    { cwd, stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Receiver startup timed out"));
    }, 5000);
    child.stdout.on("data", (chunk) => {
      output += chunk;
      const line = output
        .split("\n")
        .find((line) => line.startsWith('{"ready":'));
      if (line) {
        clearTimeout(timer);
        resolve(JSON.parse(line).url);
      }
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Receiver exited before startup: ${code}`));
    });
  });
  return {
    url,
    async stop() {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      await exited;
    },
  };
}
for (const freshKey of [false, true])
  test(
    freshKey
      ? "negative control: a new key on retry creates a second real effect"
      : "a restarted worker reuses one persistent receiver effect",
    async () => {
      const dir = await mkdtemp(join(tmpdir(), "retry-process-"));
      let server;
      const record = { runtime: process.version, freshKey, attempts: [] };
      try {
        server = await receiver(dir);
        const run = (crash) => {
          const args = [
            "worker.mjs",
            "--dir",
            dir,
            "--receiver",
            server.url,
            ...(crash ? ["--crash-after-effect"] : []),
            ...(freshKey ? ["--fresh-key"] : []),
          ];
          const result = spawnSync(process.execPath, args, {
            cwd,
            encoding: "utf8",
            timeout: 10000,
          });
          record.attempts.push({
            args,
            exitCode: result.status,
            signal: result.signal,
            stdout: result.stdout,
            stderr: result.stderr,
            error: result.error?.message,
          });
          return result;
        };
        const first = run(true);
        assert.equal(first.status, 86, first.stderr);
        record.afterInterruption = await (
          await fetch(server.url + "/ledger")
        ).json();
        assert.equal(record.afterInterruption.effects.length, 1);
        const worker = openWorker(dir);
        try {
          assert.equal(workerRecord(worker).completions.length, 0);
        } finally {
          worker.close();
        }
        await server.stop();
        server = undefined;
        server = await receiver(dir); // Both the receiver and worker are fresh processes.
        const second = run(false);
        assert.equal(second.status, 0, second.stderr);
        record.afterRestart = await (
          await fetch(server.url + "/ledger")
        ).json();
        assert.equal(record.afterRestart.effects.length, freshKey ? 2 : 1);
        const resumed = openWorker(dir);
        try {
          record.worker = workerRecord(resumed);
          assert.equal(record.worker.attempts.length, 2);
          assert.equal(record.worker.completions.length, 1);
          assert.equal(
            JSON.parse(record.worker.completions[0].receipt).replayed,
            !freshKey,
          );
        } finally {
          resumed.close();
        }
      } finally {
        if (server) await server.stop();
        await mkdir(join(cwd, "test-results/runs"), { recursive: true });
        await writeFile(
          join(
            cwd,
            `test-results/runs/${freshKey ? "fresh-key" : "stable-key"}.json`,
          ),
          JSON.stringify(record, null, 2) + "\n",
        );
        await rm(dir, { recursive: true, force: true });
      }
    },
  );
