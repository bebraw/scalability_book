import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { writeCourseDiaryDownloads } from "../scripts/lib/course-diary-download.ts";

test("the starter opens as one portable vault with all nine lectures and the course plugin disabled", async (t) => {
  const tmp = await mkdtemp(path.join(tmpdir(), "course-diary-"));
  t.after(() => rm(tmp, { recursive: true, force: true }));
  const archive = path.join(tmp, "downloads/course-diary.zip");
  await writeCourseDiaryDownloads(process.cwd(), path.dirname(archive));
  const bytes = await readFile(archive);
  await writeCourseDiaryDownloads(process.cwd(), path.dirname(archive));
  assert.deepEqual(await readFile(archive), bytes);

  const unpacked = path.join(tmp, "unpacked");
  execFileSync("unzip", ["-q", archive, "-d", unpacked]);
  assert.deepEqual(await readdir(unpacked), ["Course diary"]);
  const vault = path.join(unpacked, "Course diary");
  assert.deepEqual((await readdir(vault)).sort(), [
    ".obsidian",
    "00-Start here.md",
    "01-Establish.md",
    "02-Challenge.md",
    "03-Compare.md",
    "04-Portfolio.md",
  ]);
  const start = await readFile(path.join(vault, "00-Start here.md"), "utf8");
  const lectures = [];
  for (const phase of ["01-Establish.md", "02-Challenge.md", "03-Compare.md"]) {
    assert.ok(start.includes(`(${phase})`));
    const note = await readFile(path.join(vault, phase), "utf8");
    lectures.push(
      ...[...note.matchAll(/^## Lecture (\d+) /gm)].map((match) =>
        Number(match[1]),
      ),
    );
  }
  assert.deepEqual(lectures, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(await readdir(path.join(vault, ".obsidian")), ["plugins"]);
  const plugins = path.join(vault, ".obsidian/plugins");
  assert.deepEqual(await readdir(plugins), ["scalableweb-course-diary"]);
  const plugin = path.join(plugins, "scalableweb-course-diary");
  assert.deepEqual((await readdir(plugin)).sort(), [
    "main.js",
    "manifest.json",
  ]);
  const manifest = JSON.parse(
    await readFile(path.join(plugin, "manifest.json"), "utf8"),
  );
  assert.equal(manifest.id, path.basename(plugin));
  const update = path.join(tmp, "update");
  execFileSync("unzip", [
    "-q",
    path.join(tmp, "downloads", `course-diary-plugin-${manifest.version}.zip`),
    "-d",
    update,
  ]);
  assert.deepEqual((await readdir(update)).sort(), [
    "main.js",
    "manifest.json",
  ]);
  for (const file of ["main.js", "manifest.json"])
    assert.deepEqual(
      await readFile(path.join(update, file)),
      await readFile(path.join(plugin, file)),
    );
  assert.ok(
    (await readFile("docs/course-diary.md", "utf8")).includes(
      `(/downloads/course-diary-plugin-${manifest.version}.zip)`,
    ),
    "Existing vault users can download the matching update from the guide.",
  );
});
