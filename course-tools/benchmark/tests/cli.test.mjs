import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
const run = promisify(execFile);
const cli = fileURLToPath(new URL("../cli.mjs", import.meta.url));

test("CLI refuses an existing evidence file before loading the adapter", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "course-runner-cli-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const output = join(directory, "existing.json");
  await writeFile(output, "original observed evidence\n");
  await assert.rejects(
    run(process.execPath, [cli, join(directory, "must-not-load.mjs"), output]),
    (error) => {
      assert.match(error.stderr, /EEXIST/);
      assert.doesNotMatch(error.stderr, /ERR_MODULE_NOT_FOUND/);
      return true;
    },
  );
  assert.equal(await readFile(output, "utf8"), "original observed evidence\n");
});
test("an adapter initialization failure remains in the reserved report", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "course-runner-cli-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const adapter = join(directory, "unavailable.mjs");
  const output = join(directory, "attempt.json");
  await writeFile(
    adapter,
    'export async function createAdapter(){throw new Error("Application access unavailable");}',
  );
  await assert.rejects(
    run(process.execPath, [cli, adapter, output]),
    (error) => {
      assert.match(error.stderr, /Application access unavailable/);
      return true;
    },
  );
  const report = JSON.parse(await readFile(output, "utf8"));
  assert.equal(report.complete, false);
  assert.deepEqual(report.runs, []);
  assert.equal(report.failure, "Application access unavailable");
});
