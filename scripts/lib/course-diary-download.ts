import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { build } from "vite";
import {
  lectures,
  phases,
} from "../../packages/obsidian-course-diary/lecture-layout.ts";
import { createStoredZip } from "./zip.ts";

function branchPreviewOrigin(root: string) {
  const branch =
    process.env.WORKERS_CI_BRANCH ||
    process.env.GITHUB_HEAD_REF ||
    spawnSync("git", ["branch", "--show-current"], {
      cwd: root,
      encoding: "utf8",
    }).stdout?.trim();
  if (!branch || branch === "main") return "";
  // Match the alias assigned by Wrangler's versions upload on this project.
  const worker = "scalability-book";
  let alias = branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!/^[a-z]/.test(alias)) return "";
  const limit = 63 - worker.length - 1;
  if (alias.length > limit) {
    const hash = createHash("sha256").update(branch).digest("hex").slice(0, 4);
    alias = alias.slice(0, limit - 5) + "-" + hash;
  }
  return `https://${alias}-${worker}.survivejs.workers.dev`;
}

export async function buildCourseDiaryPlugin(
  root: string,
  previewOrigin = branchPreviewOrigin(root),
) {
  const entry = path.resolve(root, "packages/obsidian-course-diary/main.js");
  if ((await realpath(entry)) !== entry)
    throw new Error("Course diary entry must not be a symlink.");
  const result = await build({
    root,
    configFile: false,
    publicDir: false,
    logLevel: "warn",
    define: { __COURSE_DIARY_PREVIEW_ORIGIN__: JSON.stringify(previewOrigin) },
    build: {
      ssr: entry,
      write: false,
      minify: false,
      rolldownOptions: {
        external: ["obsidian", "electron"],
        output: {
          format: "cjs",
          codeSplitting: false,
          entryFileNames: "main.js",
        },
      },
    },
  });
  const output = !Array.isArray(result) && "output" in result && result.output;
  if (!output || output.length !== 1 || output[0]?.type !== "chunk")
    throw new Error("The course diary plugin must build to a single main.js.");
  return output[0].code;
}

export async function writeCourseDiaryDownloads(
  root: string,
  directory: string,
) {
  const notes = [
    "00-Start here.md",
    "04-Portfolio.md",
    ...phases.map((phase, index) => `${phase}/0${index + 1}-${phase}.md`),
    ...lectures.map((lecture) => lecture.path),
  ];
  const repository = await realpath(root);
  async function readSource(source: string) {
    const file = path.join(repository, source);
    if ((await realpath(file)) !== file)
      throw new Error(
        `Course diary source must not contain symlinks: ${source}`,
      );
    return readFile(file);
  }
  const [manifest, code, noteEntries] = await Promise.all([
    readSource("packages/obsidian-course-diary/manifest.json"),
    buildCourseDiaryPlugin(repository),
    Promise.all(
      notes.map(async (note) => ({
        name: `Course diary/${note}`,
        data: await readSource(`docs/diary-pilot/${note}`),
      })),
    ),
  ]);
  const { id, version } = JSON.parse(manifest.toString("utf8"));
  if (id !== "scalableweb-course-diary" || !/^\d+\.\d+\.\d+$/.test(version))
    throw new Error(
      "The course diary plugin manifest needs its published ID and a release version.",
    );
  const plugin = [
    { name: "manifest.json", data: manifest },
    { name: "main.js", data: Buffer.from(code) },
  ];
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(directory, "course-diary.zip"),
      createStoredZip([
        ...noteEntries,
        ...plugin.map(({ name, data }) => ({
          name: `Course diary/.obsidian/plugins/${id}/${name}`,
          data,
        })),
      ]),
    ),
    writeFile(
      path.join(directory, `course-diary-plugin-${version}.zip`),
      createStoredZip(plugin),
    ),
  ]);
}
