import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { writeDirectoryZip } from "./zip.ts";

const workspaceFiles = [
  "README.md",
  "AGENTS.md",
  ".gitignore",
  "package.json",
  "package-lock.json",
  "workspace.mjs",
];

export async function writeLabSourceDownloads(
  labsDirectory: string,
  downloadsDirectory: string,
): Promise<void> {
  const manifest = JSON.parse(
    await readFile(path.join(labsDirectory, "package.json"), "utf8"),
  ) as { workspaces: string[] };
  if (
    !Array.isArray(manifest.workspaces) ||
    manifest.workspaces.some((name) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name))
  ) {
    throw new Error("Lab workspaces must name direct exercise directories.");
  }
  // Fail before publishing a workspace with missing setup or exercise files.
  await Promise.all([
    ...workspaceFiles.map((name) => readFile(path.join(labsDirectory, name))),
    ...manifest.workspaces.map((name) =>
      readFile(path.join(labsDirectory, name, "package.json")),
    ),
  ]);
  await writeDirectoryZip(
    labsDirectory,
    path.join(downloadsDirectory, "course-workspace.zip"),
    "course-workspace",
    [...workspaceFiles, ...manifest.workspaces],
  );

  // Independent downloads use the same sources; installed workspace links are
  // never treated as exercises or followed into node_modules.
  const labs = (await readdir(labsDirectory, { withFileTypes: true }))
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        entry.name !== "node_modules",
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  await Promise.all(
    labs.map(async (lab) => {
      await readFile(path.join(labsDirectory, lab.name, "README.md"));
      await writeDirectoryZip(
        path.join(labsDirectory, lab.name),
        path.join(downloadsDirectory, `${lab.name}.zip`),
      );
    }),
  );
}
