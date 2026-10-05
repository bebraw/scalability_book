import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStoredZip } from "../scripts/lib/zip.ts";

test("a curated source archive reproduces dependencies, fixtures, application state and validation in a clean directory", async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), "course-source-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const source = "tests/fixtures/course-source";
  const entries = await Promise.all(
    (await readdir(source)).map(async (name) => ({
      name,
      data: await readFile(path.join(source, name)),
    })),
  );
  const archive = path.join(dir, "source.zip"),
    unpacked = path.join(dir, "unpacked");
  await writeFile(archive, createStoredZip(entries));
  execFileSync("rtk", ["proxy", "unzip", "-q", archive, "-d", unpacked]);
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    npm_config_cache: path.join(dir, "npm-cache"),
  };
  delete childEnv.NODE_TEST_CONTEXT;
  const run = (args: string[]) =>
    execFileSync("rtk", ["proxy", "npm", ...args], {
      cwd: unpacked,
      env: childEnv,
      encoding: "utf8",
    });
  run(["ci", "--offline", "--ignore-scripts"]);
  assert.match(run(["run", "fixtures"]), /Synthetic fixtures initialized/);
  assert.match(run(["run", "validate"]), /pass 1/);
  assert.match(run(["run", "demo"]), /"ready":true/);
  const state = JSON.parse(
    await readFile(path.join(unpacked, ".local/state.json"), "utf8"),
  );
  assert.equal(state.workspaces[0].id, "sample");
  assert.match(run(["run", "demo"]), /"ready":true/);
});
