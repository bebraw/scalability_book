import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const cwd = fileURLToPath(new URL("./", import.meta.url));
const output = new URL("test-results/evidence/", import.meta.url);
await mkdir(output, { recursive: true });
const checks = [
  ["preflight", ["--test", "tests/preflight.test.mjs"]],
  ["contract", ["--test", "tests/response.test.mjs"]],
  [
    "browser",
    [
      createRequire(import.meta.url).resolve("@playwright/test/cli"),
      "test",
      "--reporter=line",
    ],
  ],
];
const results = [];
for (const [name, args] of checks) {
  const start = performance.now();
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: "utf8",
    timeout: 120_000,
  });
  const log = `${result.stdout || ""}${result.stderr || ""}${result.error ? `\n${result.error.message}` : ""}`;
  await writeFile(new URL(`${name}.log`, output), log);
  results.push({
    name,
    command: [process.execPath, ...args],
    exitCode: result.status,
    signal: result.signal,
    elapsedMs: Math.round(performance.now() - start),
    log: `${name}.log`,
  });
  console.log(
    `${name}: ${result.status === 0 ? "passed" : "failed or incomplete"} (see test-results/evidence/${name}.log)`,
  );
}
await writeFile(
  new URL("summary.json", output),
  JSON.stringify(
    { observedAt: new Date().toISOString(), runtime: process.version, results },
    null,
    2,
  ) + "\n",
);
process.exitCode = results.every((result) => result.exitCode === 0) ? 0 : 1;
