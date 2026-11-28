import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { marked } from "marked";
import { lectures } from "../packages/obsidian-course-diary/lecture-layout.ts";
import { writeCourseDiaryDownloads } from "../scripts/lib/course-diary-download.ts";

test("setup, slides and self-study links open the matching lecture on the book that supplied the vault", async (t) => {
  const tmp = await mkdtemp(path.join(tmpdir(), "course-diary-origin-"));
  t.after(() => rm(tmp, { recursive: true, force: true }));
  const study = JSON.parse(await readFile("study/pilot/course.json", "utf8"));
  for (const origin of [
    "https://feat-obsidian-course-diary-scalability-book.survivejs.workers.dev",
    "http://127.0.0.1:3910",
    "https://scalableweb.dev",
  ]) {
    await writeCourseDiaryDownloads(process.cwd(), tmp, origin);
    const note = (file: string) =>
      execFileSync(
        "unzip",
        ["-p", path.join(tmp, "course-diary.zip"), `Course diary/${file}`],
        { encoding: "utf8" },
      );
    const start = note("00-Start here.md");
    assert.ok(
      start.includes(
        `[First-time setup with screenshots](${origin}/diary/#start-with-the-first-lecture)`,
      ),
    );
    assert.ok(start.includes("[Lecture 1](Establish/Lecture%201.md)"));
    assert.ok(start.includes("(https://obsidian.md/help/plugins/web-viewer)"));
    assert.ok(start.includes(`[All lecture slides](${origin}/slides/)`));
    assert.ok(
      note("Establish/Lecture 1.md").includes(
        `[Reading](${origin}/chapters/what-is-scalability/)`,
      ),
    );
    for (const lecture of lectures) {
      const links = new Set<string>();
      marked.walkTokens(marked.lexer(note(lecture.path)), (token) => {
        if (
          token.type === "link" &&
          /\/(slides|learn\/pilot)\//.test(token.href)
        )
          links.add(token.href);
      });
      assert.deepEqual(
        links,
        new Set([
          ...(lecture.number === 1
            ? [`${origin}/slides/lecture-1/orientation/`]
            : []),
          `${origin}/slides/lecture-${lecture.number}/`,
          `${origin}/learn/pilot/${study.modules[lecture.number - 1].id}/`,
        ]),
        `${lecture.path} opens its own slides and self-study activity`,
      );
    }
  }
});

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
    "04-Portfolio.md",
    "Challenge",
    "Compare",
    "Establish",
  ]);
  const notes = new Set(
    (await readdir(vault, { recursive: true })).filter((file) =>
      file.endsWith(".md"),
    ),
  );
  const links = new Map<string, Set<string>>();
  for (const file of notes) {
    const source = pathToFileURL(path.join(vault, file));
    const tokens = marked.lexer(await readFile(source, "utf8"));
    const targets = new Set<string>();
    marked.walkTokens(tokens, (token) => {
      if (token.type !== "link") return;
      const url = new URL(token.href, source);
      if (url.protocol !== "file:") return;
      const target = path.relative(vault, fileURLToPath(url));
      assert.ok(notes.has(target), `${file} links to missing note ${target}`);
      targets.add(target);
    });
    links.set(file, targets);
  }
  for (const [phase, overview, numbers] of [
    ["Establish", "01-Establish.md", [1, 2, 3]],
    ["Challenge", "02-Challenge.md", [4, 5, 6]],
    ["Compare", "03-Compare.md", [7, 8, 9]],
  ] as const) {
    const index = path.join(phase, overview);
    assert.ok(
      links.get("00-Start here.md")?.has(index),
      `Start here opens ${phase}`,
    );
    const lectures = numbers.map((number) => `Lecture ${number}.md`);
    assert.deepEqual((await readdir(path.join(vault, phase))).sort(), [
      overview,
      ...lectures,
    ]);
    for (const number of numbers) {
      const lecture = path.join(phase, `Lecture ${number}.md`);
      assert.ok(
        links.get(index)?.has(lecture),
        `${phase} opens Lecture ${number}`,
      );
      const contents = await readFile(path.join(vault, lecture), "utf8");
      assert.deepEqual(
        [...contents.matchAll(/^#+ Lecture (\d+)\b/gm)].map((match) =>
          Number(match[1]),
        ),
        [number],
        `One lecture per note in ${lecture}`,
      );
    }
  }
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
