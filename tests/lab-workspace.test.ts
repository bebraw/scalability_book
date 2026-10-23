import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { writeLabSourceDownloads } from "../scripts/lib/lab-downloads.ts";

test("workspace download includes only declared exercises and setup, with local records excluded", async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), "lab-downloads-"));
  const labs = path.join(temporary, "labs");
  const downloads = path.join(temporary, "downloads");
  try {
    await mkdir(labs);
    await writeFile(
      path.join(labs, "package.json"),
      JSON.stringify({ workspaces: ["first", "second"] }),
    );
    for (const file of [
      "README.md",
      "AGENTS.md",
      ".gitignore",
      "package-lock.json",
      "workspace.mjs",
    ]) {
      await writeFile(path.join(labs, file), `setup: ${file}`);
    }
    await writeFile(
      path.join(labs, "local-notes.txt"),
      "Unpublished root notes",
    );
    for (const name of ["first", "second", "separate-lab"]) {
      const exercise = path.join(labs, name);
      await mkdir(exercise);
      await writeFile(path.join(exercise, "README.md"), name);
      await writeFile(path.join(exercise, "package.json"), "{}");
      for (const local of [
        "node_modules",
        "test-results",
        ".lab-data",
        ".local",
      ]) {
        await mkdir(path.join(exercise, local));
        await writeFile(path.join(exercise, local, "record.txt"), "Keep local");
      }
      await writeFile(
        path.join(exercise, ".env.model"),
        "SYNTHETIC_KEY=keep-local\n",
      );
    }
    await mkdir(path.join(labs, "node_modules"));
    await writeFile(
      path.join(labs, "node_modules", "record.txt"),
      "Installed workspace dependency",
    );
    await writeLabSourceDownloads(labs, downloads);
    assert.deepEqual((await readdir(downloads)).sort(), [
      "course-workspace.zip",
      "first.zip",
      "second.zip",
      "separate-lab.zip",
    ]);
    const unified = storedEntries(
      await readFile(path.join(downloads, "course-workspace.zip")),
    );
    assert.deepEqual(
      Object.keys(unified).sort(),
      [
        ".gitignore",
        "AGENTS.md",
        "README.md",
        "first/README.md",
        "first/package.json",
        "package-lock.json",
        "package.json",
        "second/README.md",
        "second/package.json",
        "workspace.mjs",
      ]
        .map((name) => `course-workspace/${name}`)
        .sort(),
    );
    const standalone = storedEntries(
      await readFile(path.join(downloads, "first.zip")),
    );
    assert.equal(
      standalone["first/README.md"],
      unified["course-workspace/first/README.md"],
    );
    assert.equal(
      standalone["first/package.json"],
      unified["course-workspace/first/package.json"],
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("workspace preflight does not run unfinished features and selected commands retain failure status", async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), "lab-launcher-"));
  try {
    await copyFile(
      new URL("../labs/workspace.mjs", import.meta.url),
      path.join(temporary, "workspace.mjs"),
    );
    await writeFile(
      path.join(temporary, "package.json"),
      JSON.stringify({
        private: true,
        type: "module",
        workspaces: ["first", "second"],
        scripts: {
          lab: "node workspace.mjs",
          preflight: "node workspace.mjs preflight",
        },
      }),
    );
    for (const name of ["first", "second"]) {
      const exercise = path.join(temporary, name);
      await mkdir(exercise);
      await writeFile(
        path.join(exercise, "package.json"),
        JSON.stringify({
          name,
          private: true,
          scripts: { preflight: "node ready.cjs", check: "node gap.cjs" },
        }),
      );
      await writeFile(
        path.join(exercise, "ready.cjs"),
        `console.log("READY_${name}")`,
      );
      await writeFile(
        path.join(exercise, "gap.cjs"),
        `console.log("FEATURE_${name}", ...process.argv.slice(2)); process.exit(7)`,
      );
    }
    const run = (...args: string[]) =>
      spawnSync("npm", ["run", ...args], {
        cwd: temporary,
        encoding: "utf8",
        timeout: 30_000,
        env: { ...process.env, npm_config_update_notifier: "false" },
      });
    const preflight = run("preflight");
    assert.equal(preflight.status, 0, preflight.stdout + preflight.stderr);
    assert.match(preflight.stdout, /READY_first/);
    assert.match(preflight.stdout, /READY_second/);
    assert.doesNotMatch(preflight.stdout, /FEATURE_/);
    const selected = run("lab", "--", "first", "check", "argument with spaces");
    assert.equal(selected.status, 7, selected.stdout + selected.stderr);
    assert.match(selected.stdout, /FEATURE_first argument with spaces/);
    assert.doesNotMatch(selected.stdout, /FEATURE_second|READY_second/);
    const invalid = run("lab", "--", "all", "check");
    assert.equal(invalid.status, 2);
    assert.doesNotMatch(invalid.stdout, /FEATURE_/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

function storedEntries(archive: Buffer): Record<string, string> {
  const entries: Record<string, string> = {};
  let offset = 0;
  while (archive.readUInt32LE(offset) === 0x04034b50) {
    const size = archive.readUInt32LE(offset + 18);
    const nameLength = archive.readUInt16LE(offset + 26);
    const extraLength = archive.readUInt16LE(offset + 28);
    const start = offset + 30;
    const dataStart = start + nameLength + extraLength;
    assert.equal(archive.readUInt16LE(offset + 8), 0);
    entries[archive.subarray(start, start + nameLength).toString()] = archive
      .subarray(dataStart, dataStart + size)
      .toString();
    offset = dataStart + size;
  }
  return entries;
}
