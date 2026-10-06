import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { createSiteAssets } from "../scripts/lib/site-assets.ts";
import { createSiteRenderer } from "../scripts/lib/site-renderer.ts";

async function fixture(t: TestContext, fingerprint: boolean) {
  const directory = await mkdtemp(path.join(tmpdir(), "book-site-assets-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return { directory, assets: createSiteAssets(directory, { fingerprint }) };
}

test("changed bytes change the URL while identical builds reuse it", async (t) => {
  const { directory, assets } = await fixture(t, true);
  const file = path.join(directory, "styles.css");
  await writeFile(file, "body { color: black; }");
  await assets.publish("styles.css");
  const originalUrl = assets.url("/styles.css");
  assert.match(originalUrl, /^\/styles\.[a-f0-9]{16}\.css$/);
  assert.equal(
    await readFile(path.join(directory, originalUrl), "utf8"),
    "body { color: black; }",
  );

  const nextBuild = createSiteAssets(directory, { fingerprint: true });
  await nextBuild.publish("styles.css");
  assert.equal(nextBuild.url("/styles.css"), originalUrl);
  await writeFile(file, "body { color: blue; }");
  await nextBuild.publish("styles.css");
  assert.notEqual(nextBuild.url("/styles.css"), originalUrl);
  // Earlier HTML can still fetch the current bytes from the stable alias.
  assert.equal(await readFile(file, "utf8"), "body { color: blue; }");
  assert.equal(
    await readFile(path.join(directory, nextBuild.url("/styles.css")), "utf8"),
    "body { color: blue; }",
  );
});

test("nested scripts retain their directory and unpublished dependencies fail", async (t) => {
  const { directory, assets } = await fixture(t, true);
  assert.throws(() => assets.url("/vendor/demo.js"), /has not been compiled/);
  await mkdir(path.join(directory, "vendor"));
  await writeFile(path.join(directory, "vendor/demo.js"), "window.demo = 1;");
  await assets.publish("vendor/demo.js");
  assert.match(
    assets.url("/vendor/demo.js"),
    /^\/vendor\/demo\.[a-f0-9]{16}\.js$/,
  );
});

test("editable assets keep stable URLs for CSS hot reload", async (t) => {
  const { directory, assets } = await fixture(t, false);
  await writeFile(path.join(directory, "styles.css"), "first");
  await assets.publish("styles.css");
  await writeFile(path.join(directory, "styles.css"), "second");
  await assets.publish("styles.css");
  assert.equal(assets.url("/styles.css"), "/styles.css");
  assert.deepEqual(await readdir(directory), ["styles.css"]);
});

test("rendered HTML resolves base assets and page-specific assets through the same registry", async (t) => {
  const { directory, assets } = await fixture(t, true);
  const names = ["styles.css", "theme.js", "course.css", "course.js"];
  for (const name of names) {
    await writeFile(path.join(directory, name), `compiled ${name}`);
    await assets.publish(name);
  }
  const renderer = createSiteRenderer({
    caseStudies: [],
    chapters: [],
    config: {
      author: { name: "Example", url: "https://example.com/" },
      course: {},
      description: "Example site",
      domain: "example.com",
      themes: [],
      title: "Example",
    },
    indexChapters: [],
    indexPartPages: [],
    partMetadata: { byChapter: new Map(), parts: [] },
    templates: {
      baseLayout: await readFile("site/layouts/BaseLayout.html", "utf8"),
      bookNavigation: "",
      bookPage: "",
      paginationLink: "",
      siteIndex: "",
    },
    assetUrl: assets.url,
  });
  const html = renderer.renderLayout({
    title: "Course",
    description: "Example",
    currentUrl: "/course/",
    stylesheets: ["/course.css"],
    scripts: ["/course.js"],
    children: "<main>Example</main>",
  });
  for (const name of names) {
    assert.ok(html.includes(`"${assets.url(`/${name}`)}"`), name);
    assert.ok(!html.includes(`"/${name}"`), name);
  }
});
