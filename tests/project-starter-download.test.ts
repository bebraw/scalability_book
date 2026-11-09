import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { writeProjectStarterDownload } from "../scripts/lib/project-starter-download.ts";

const phases = ["01-establish", "02-challenge", "03-compare"];
const runtimeFiles = [
  ".nvmrc",
  "package.json",
  "server.mjs",
  "index.html",
  "tests/smoke.test.mjs",
];
const expectedFiles = [
  "README.md",
  "AGENTS.md",
  ".gitignore",
  "specifications/README.md",
  "specifications/application.md",
  "docs/adrs/README.md",
  "docs/adrs/template.md",
  "docs/adrs/ADR-001-stack.md",
  ...phases.flatMap((phase) =>
    [
      "README.md",
      "AGENTS.md",
      "architecture.md",
      "evidence/index.md",
      ...runtimeFiles,
    ].map((file) => `projects/${phase}/${file}`),
  ),
].sort();
const contractFiles = [
  "00_introduction.md",
  "00_common_project.md",
  "01_establish.md",
  "02_challenge.md",
  "03_compare.md",
  "course_environment.md",
  "grading.md",
];

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "project-starter-download-"));
  const source = path.join(root, "course-tools/project-starter");
  for (const file of expectedFiles) {
    await put(path.join(source, file), `Authored starter: ${file}\n`);
  }
  for (const file of contractFiles) {
    await put(path.join(root, "specifications", file), `Contract: ${file}\n`);
  }
  return { root, source, archive: path.join(root, "downloads/starter.zip") };
}

async function put(filename: string, text: string) {
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, text);
}

test("starter archive includes the declared source only and hashes the exact exported bytes", async (t) => {
  const { root, source, archive } = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const filename of [
    ".env",
    ".env.model",
    "credentials.json",
    ".local/observations.json",
    "node_modules/example/index.js",
    "specifications/teacher-notes.md",
    "projects/01-establish/evidence/raw-transcript.txt",
    "projects/02-challenge/.dev.vars",
    "projects/02-challenge/data.sqlite",
    "projects/03-compare/test-results/output.txt",
  ]) {
    await put(path.join(source, filename), "SYNTHETIC_PRIVATE_MUST_NOT_SHIP");
  }
  await put(
    path.join(root, ".local/course-preparation/reference/server.mjs"),
    "SYNTHETIC_PRIVATE_MUST_NOT_SHIP",
  );
  await writeProjectStarterDownload(root, archive);
  const bytes = await readFile(archive);
  const entries = storedEntries(bytes);
  assert.deepEqual(
    Object.keys(entries).sort(),
    [...expectedFiles, "starter-manifest.json"]
      .map((file) => `project-starter/${file}`)
      .sort(),
  );
  assert.equal(
    bytes.includes(Buffer.from("SYNTHETIC_PRIVATE_MUST_NOT_SHIP")),
    false,
  );
  const manifest = JSON.parse(entries["project-starter/starter-manifest.json"]);
  assert.equal(manifest.sourceRevision, null);
  assert.equal(manifest.sourceDirty, null);
  assert.equal(manifest.contractRevision, null);
  assert.equal(manifest.contractDirty, null);
  assert.deepEqual(Object.keys(manifest.files).sort(), expectedFiles);
  for (const file of expectedFiles) {
    assert.equal(
      entries[`project-starter/${file}`],
      `Authored starter: ${file}\n`,
    );
    assert.equal(
      manifest.files[file],
      digest(entries[`project-starter/${file}`]),
    );
  }
  for (const file of contractFiles) {
    assert.equal(
      manifest.contractFiles[`specifications/${file}`],
      digest(`Contract: ${file}\n`),
    );
  }
  await writeProjectStarterDownload(root, archive);
  assert.deepEqual(
    await readFile(archive),
    bytes,
    "unchanged inputs produce the same ZIP",
  );
});

test("missing required source or symlinks fail before publishing an incomplete or redirected starter", async (t) => {
  for (const kind of ["missing", "file-link", "directory-link", "root-link"]) {
    await t.test(kind, async (t) => {
      const { root, source, archive } = await fixture();
      t.after(() => rm(root, { recursive: true, force: true }));
      if (kind === "missing") {
        await rm(path.join(source, "projects/03-compare/tests/smoke.test.mjs"));
        await assert.rejects(
          writeProjectStarterDownload(root, archive),
          /ENOENT/,
        );
      } else if (kind === "file-link") {
        await put(path.join(root, "private.txt"), "SYNTHETIC_PRIVATE");
        await rm(path.join(source, "README.md"));
        await symlink(
          path.join(root, "private.txt"),
          path.join(source, "README.md"),
        );
        await assert.rejects(
          writeProjectStarterDownload(root, archive),
          /symlinks/,
        );
      } else if (kind === "directory-link") {
        await put(path.join(root, "private/README.md"), "SYNTHETIC_PRIVATE");
        await put(
          path.join(root, "private/application.md"),
          "SYNTHETIC_PRIVATE",
        );
        await rm(path.join(source, "specifications"), { recursive: true });
        await symlink(
          path.join(root, "private"),
          path.join(source, "specifications"),
        );
        await assert.rejects(
          writeProjectStarterDownload(root, archive),
          /symlinks/,
        );
      } else {
        const linked = await fixture();
        t.after(() => rm(linked.root, { recursive: true, force: true }));
        await rm(source, { recursive: true });
        await symlink(linked.source, source);
        await assert.rejects(
          writeProjectStarterDownload(root, archive),
          /symlinks/,
        );
      }
      await assert.rejects(access(archive), /ENOENT/);
    });
  }
});

test("provenance distinguishes a committed starter, source edits and contract edits", async (t) => {
  const { root, source, archive } = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args: string[]) =>
    execFileSync("git", ["-c", "core.hooksPath=/dev/null", ...args], {
      cwd: root,
      encoding: "utf8",
    }).trim();
  git("init", "--quiet");
  git("add", "course-tools", "specifications");
  git(
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "Synthetic starter",
  );
  const revision = git("rev-parse", "HEAD");
  const manifest = async () => {
    await writeProjectStarterDownload(root, archive);
    return JSON.parse(
      storedEntries(await readFile(archive))[
        "project-starter/starter-manifest.json"
      ],
    );
  };
  await put(path.join(root, "unrelated-notes.txt"), "Unrelated local work");
  const clean = await manifest();
  assert.equal(clean.sourceRevision, revision);
  assert.equal(clean.contractRevision, revision);
  assert.equal(clean.sourceDirty, false);
  assert.equal(clean.contractDirty, false);
  await put(path.join(source, "README.md"), "Changed onboarding\n");
  const edited = await manifest();
  assert.equal(edited.sourceRevision, revision);
  assert.equal(edited.sourceDirty, true);
  assert.equal(edited.contractDirty, false);
  assert.equal(edited.files["README.md"], digest("Changed onboarding\n"));
  git("checkout", "--", "course-tools/project-starter/README.md");
  await put(
    path.join(root, "specifications/00_common_project.md"),
    "Changed contract\n",
  );
  const contract = await manifest();
  assert.equal(contract.sourceDirty, false);
  assert.equal(contract.contractDirty, true);
  assert.equal(contract.contractRevision, revision);
  assert.equal(
    contract.contractFiles["specifications/00_common_project.md"],
    digest("Changed contract\n"),
  );
  // An allowlisted file removed from the index is uncommitted even if ignored.
  git("rm", "--cached", "--quiet", "course-tools/project-starter/AGENTS.md");
  await put(
    path.join(root, ".gitignore"),
    "course-tools/project-starter/AGENTS.md\n",
  );
  git("add", ".gitignore", "specifications");
  git(
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "Ignore required local source",
  );
  assert.equal((await manifest()).sourceDirty, true);
});

test("all three published phase stubs begin with identical independent runtime source", async () => {
  const root = new URL(
    "../course-tools/project-starter/projects/",
    import.meta.url,
  );
  for (const file of runtimeFiles) {
    const contents = await Promise.all(
      phases.map((phase) =>
        readFile(new URL(`${phase}/${file}`, root), "utf8"),
      ),
    );
    assert.equal(
      contents[1],
      contents[0],
      `${file}: B must begin from the same starter as A`,
    );
    assert.equal(
      contents[2],
      contents[0],
      `${file}: C must begin from the same starter as A`,
    );
  }
});

function digest(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

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
