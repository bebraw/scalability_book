import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { createStoredZip } from "./zip.ts";

export async function writeCourseDiaryDownload(root: string, output: string) {
  const notes = [
    "00-Start here.md",
    "01-Establish.md",
    "02-Challenge.md",
    "03-Compare.md",
    "04-Portfolio.md",
  ];
  const files = [
    ...notes.map((note) => ({
      source: `docs/diary-pilot/${note}`,
      destination: note,
    })),
    ...["manifest.json", "main.js"].map((file) => ({
      source: `packages/obsidian-course-diary/${file}`,
      destination: `.obsidian/plugins/scalableweb-course-diary/${file}`,
    })),
  ];
  const repository = await realpath(root);
  const entries = await Promise.all(
    files.map(async ({ source, destination }) => {
      const file = path.join(repository, source);
      if ((await realpath(file)) !== file) {
        throw new Error(
          `Course diary source must not contain symlinks: ${source}`,
        );
      }
      return {
        name: `Course diary/${destination}`,
        data: await readFile(file),
      };
    }),
  );
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, createStoredZip(entries));
}
