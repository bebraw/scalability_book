import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createStoredZip } from "../../shared/zip.ts";
export { createStoredZip } from "../../shared/zip.ts";

type ZipEntry = { data: Uint8Array; name: string };
const excludedDirectoryNames = new Set([
  ".git",
  ".lab-data",
  "node_modules",
  "playwright-report",
  "test-results",
]);
const excludedFileNames = new Set([".DS_Store"]);

export async function writeDirectoryZip(
  sourceDirectory: string,
  outputFile: string,
  archiveRoot = path.basename(sourceDirectory),
): Promise<void> {
  const entries = await collectDirectoryEntries(sourceDirectory, archiveRoot);

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, createStoredZip(entries));
}

async function collectDirectoryEntries(
  directory: string,
  archiveDirectory: string,
): Promise<ZipEntry[]> {
  const entries: ZipEntry[] = [];
  const children = await readdir(directory, { withFileTypes: true });

  for (const child of children.sort((a, b) => a.name.localeCompare(b.name))) {
    if (child.isDirectory() && excludedDirectoryNames.has(child.name)) {
      continue;
    }

    if (child.isFile() && excludedFileNames.has(child.name)) {
      continue;
    }

    const sourcePath = path.join(directory, child.name);
    const archivePath = path.posix.join(archiveDirectory, child.name);

    if (child.isDirectory()) {
      entries.push(...(await collectDirectoryEntries(sourcePath, archivePath)));
    } else if (child.isFile()) {
      entries.push({ data: await readFile(sourcePath), name: archivePath });
    }
  }

  return entries;
}
