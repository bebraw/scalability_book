import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { createStoredZip } from "./zip.ts";

const execFileAsync = promisify(execFile);
const sourcePath = "course-tools/project-starter";
const phases = ["01-establish", "02-challenge", "03-compare"];
const phaseFiles = [
  "README.md",
  "AGENTS.md",
  "architecture.md",
  "evidence/index.md",
  ".nvmrc",
  "package.json",
  "server.mjs",
  "index.html",
  "tests/smoke.test.mjs",
];
const sourceFiles = [
  "README.md",
  "AGENTS.md",
  ".gitignore",
  "specifications/README.md",
  "specifications/application.md",
  "docs/adrs/README.md",
  "docs/adrs/template.md",
  "docs/adrs/ADR-001-stack.md",
  ...phases.flatMap((phase) =>
    phaseFiles.map((file) => `projects/${phase}/${file}`),
  ),
].sort();
const contractFiles = [
  "specifications/00_introduction.md",
  "specifications/00_common_project.md",
  "specifications/01_establish.md",
  "specifications/02_challenge.md",
  "specifications/03_compare.md",
  "specifications/course_environment.md",
  "specifications/grading.md",
];

/** Package only the authored starter, never a student's working directory. */
export async function writeProjectStarterDownload(
  repositoryRoot: string,
  outputFile: string,
): Promise<void> {
  const starterRoot = path.join(await realpath(repositoryRoot), sourcePath);
  if ((await realpath(starterRoot)) !== starterRoot) {
    throw new Error(`Starter source must not contain symlinks: ${sourcePath}`);
  }
  const source = await Promise.all(
    sourceFiles.map(async (name) => {
      const filename = path.join(starterRoot, name);
      // A symlink at any level must not redirect an allowed path to local data.
      if ((await realpath(filename)) !== filename) {
        throw new Error(`Starter source must not contain symlinks: ${name}`);
      }
      return { name, data: await readFile(filename) };
    }),
  );
  const contracts = await Promise.all(
    contractFiles.map(async (name) => ({
      name,
      data: await readFile(path.join(repositoryRoot, name)),
    })),
  );
  const provenance = await readProvenance(repositoryRoot);
  const manifest = {
    schemaVersion: 1,
    sourceRepository: "https://github.com/bebraw/scalability_book",
    ...provenance,
    revisionMeaning:
      "Revisions identify the checkout base. Dirty exports include changes beyond that revision; null means Git provenance is unavailable. SHA-256 hashes identify the exported source and referenced contract contents.",
    files: Object.fromEntries(
      source.map(({ name, data }) => [name, sha256(data)]),
    ),
    contractFiles: Object.fromEntries(
      contracts.map(({ name, data }) => [name, sha256(data)]),
    ),
  };
  const archive = createStoredZip([
    ...source.map(({ name, data }) => ({
      name: `project-starter/${name}`,
      data,
    })),
    {
      name: "project-starter/starter-manifest.json",
      data: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`),
    },
  ]);
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, archive);
}

function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

async function readProvenance(repositoryRoot: string) {
  const unknown = {
    sourceRevision: null,
    sourceDirty: null,
    contractRevision: null,
    contractDirty: null,
  };
  const git = async (...args: string[]) => {
    const { stdout } = await execFileAsync("git", args, {
      cwd: repositoryRoot,
      encoding: "utf8",
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
    });
    return stdout;
  };
  try {
    const gitRoot = (await git("rev-parse", "--show-toplevel")).trim();
    if ((await realpath(gitRoot)) !== (await realpath(repositoryRoot))) {
      return unknown;
    }
    const revision = (await git("rev-parse", "HEAD")).trim();
    if (!/^[a-f0-9]{40,64}$/.test(revision)) return unknown;
    const isDirty = async (files: string[]) => {
      const [status, tracked] = await Promise.all([
        git(
          "status",
          "--porcelain=v1",
          "--untracked-files=all",
          "--",
          ...files,
        ),
        git("ls-files", "--cached", "-z", "--", ...files),
      ]);
      const trackedFiles = new Set(tracked.split("\0"));
      return (
        Boolean(status.trim()) || files.some((file) => !trackedFiles.has(file))
      );
    };
    const [sourceDirty, contractDirty] = await Promise.all([
      isDirty(sourceFiles.map((file) => `${sourcePath}/${file}`)),
      isDirty(contractFiles),
    ]);
    return {
      sourceRevision: revision,
      sourceDirty,
      contractRevision: revision,
      contractDirty,
    };
  } catch {
    // Source archives can still be built; never invent a revision for them.
    return unknown;
  }
}
