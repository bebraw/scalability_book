import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";
import {
  developmentBuildPaths,
  rebuildDevelopmentSite,
} from "../scripts/lib/dev-build.ts";

async function fixture(t: TestContext) {
  const root = await mkdtemp(path.join(tmpdir(), "book-dev-build-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return { root, paths: developmentBuildPaths(root, 3000) };
}

async function writeSite(directory: string, content: string) {
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), content);
}

test("development outputs share one root, isolate ports, and honor explicit paths", async (t) => {
  const { root, paths } = await fixture(t);
  assert.equal(paths.current, path.join(root, ".local/dev-build/3000/site"));
  assert.equal(path.dirname(paths.next), path.dirname(paths.current));
  assert.equal(path.dirname(paths.previous), path.dirname(paths.current));
  assert.notEqual(developmentBuildPaths(root, 3001).current, paths.current);
  assert.equal(
    developmentBuildPaths(root, 3000, "preview").current,
    path.join(root, "preview"),
  );
  const external = path.join(tmpdir(), "explicit-book-preview");
  assert.equal(developmentBuildPaths(root, 3000, external).current, external);
});

test("a successful rebuild replaces the site and removes stale staging output", async (t) => {
  const { paths } = await fixture(t);
  await writeSite(paths.current, "old site");
  await writeSite(paths.next, "abandoned partial build");
  await writeSite(paths.previous, "abandoned previous build");
  await rebuildDevelopmentSite(paths, async (directory) => {
    assert.equal(existsSync(directory), false);
    await writeSite(directory, "new site");
  });
  assert.equal(
    await readFile(path.join(paths.current, "index.html"), "utf8"),
    "new site",
  );
  assert.deepEqual(await readdir(path.dirname(paths.current)), ["site"]);
});

test("a failed rebuild retains the served site and removes partial output", async (t) => {
  const { paths } = await fixture(t);
  await writeSite(paths.current, "last successful site");
  await assert.rejects(
    rebuildDevelopmentSite(paths, async (directory) => {
      await writeSite(directory, "incomplete site");
      throw new Error("compiler failed");
    }),
    /compiler failed/,
  );
  assert.equal(
    await readFile(path.join(paths.current, "index.html"), "utf8"),
    "last successful site",
  );
  assert.deepEqual(await readdir(path.dirname(paths.current)), ["site"]);
});

test("an interrupted swap recovers the previous site even if the next build fails", async (t) => {
  const { paths } = await fixture(t);
  await writeSite(paths.previous, "last successful site");
  await writeSite(paths.next, "abandoned partial build");
  await assert.rejects(
    rebuildDevelopmentSite(paths, async () => {
      throw new Error("compiler failed");
    }),
    /compiler failed/,
  );
  assert.equal(
    await readFile(path.join(paths.current, "index.html"), "utf8"),
    "last successful site",
  );
  assert.deepEqual(await readdir(path.dirname(paths.current)), ["site"]);
});

test("a failed installation restores the last successful site", async (t) => {
  const { paths } = await fixture(t);
  await writeSite(paths.current, "last successful site");
  await assert.rejects(
    rebuildDevelopmentSite(paths, async () => {}),
    { code: "ENOENT" },
  );
  assert.equal(
    await readFile(path.join(paths.current, "index.html"), "utf8"),
    "last successful site",
  );
  assert.deepEqual(await readdir(path.dirname(paths.current)), ["site"]);
});
