// @ts-nocheck
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { transformWithOxc } from "vite";
import { renderMarkdown } from "./lib/markdown.ts";
import { createSiteRenderer } from "./lib/site-renderer.ts";
import {
  chapterNumberFromFilename,
  parseJsonc,
  titleFromFilename,
} from "./lib/text.ts";

const root = process.cwd();
const buildDir = path.join(root, "build");
const siteDir = path.join(root, "site");
const includeAllChapters = process.argv.includes("--all-chapters");
const includeEditor = process.argv.includes("--editable");
const config = parseJsonc(
  await readFile(path.join(root, "site.config.jsonc"), "utf8"),
);
const templates = await loadTemplates({
  baseLayout: "layouts/BaseLayout.html",
  bookContentsSidebar: "components/BookContentsSidebar.html",
  bookPage: "layouts/bookPage.html",
  localTableOfContents: "components/LocalTableOfContents.html",
  paginationLink: "components/PaginationLink.html",
  siteIndex: "layouts/siteIndex.html",
});

await rm(buildDir, { recursive: true, force: true });
await mkdir(buildDir, { recursive: true });

const allChapterFiles = getAllConfiguredChapterFiles(config);
const publishedChapterFiles = includeAllChapters
  ? allChapterFiles
  : config.chapters;
const publishedChapterSet = new Set(publishedChapterFiles);
const partMetadata = getPartMetadata(config.parts || []);
const chapters = await Promise.all(
  publishedChapterFiles.map((file, index) => getChapter(file, index)),
);
const chapterByFile = new Map(
  chapters.map((chapter) => [chapter.file, chapter]),
);
const partPages = await Promise.all(
  partMetadata.parts
    .filter((part) => part.file)
    .map((part) => getPartPage(part)),
);
const bookPages = buildBookPages({
  chapters,
  partPages,
  parts: partMetadata.parts,
});
const indexChapters = await Promise.all(
  allChapterFiles.map(async (file, index) => {
    const chapter = await getChapter(file, index);
    const published = publishedChapterSet.has(file);

    return {
      ...chapter,
      ariaDisabled: published ? null : "true",
      className: published ? "is-published" : "is-unpublished",
      published,
      status: published ? "" : "Coming soon",
      url: published ? chapter.url : null,
      part: partMetadata.byChapter.get(file) || null,
    };
  }),
);
const indexPartPages = await Promise.all(
  partMetadata.parts
    .filter((part) => part.file)
    .map(async (part) => ({
      ...(await getPartPage(part)),
      className: "is-published",
      published: true,
      status: "",
    })),
);
const renderer = createSiteRenderer({
  chapters,
  config,
  indexChapters,
  indexPartPages,
  partMetadata,
  templates,
});

for (let index = 0; index < bookPages.length; index++) {
  const page = bookPages[index];
  const rendered = renderMarkdown(page.source, page);
  const previous = bookPages[index - 1];
  const next = bookPages[index + 1];
  await writePage(
    `${page.collection}/${page.slug}/index.html`,
    renderer.renderLayout({
      title: `${page.title} - ${config.title}`,
      description: config.description,
      currentUrl: page.url,
      stylesheets: includeEditor ? ["/vendor/easymde/easymde.min.css"] : [],
      scripts: includeEditor
        ? [
            "/book-nav.js",
            "/comments.js",
            "/project-fit-checker.js",
            "/model-eval-demo.js",
            "/agent-fleet-demo.js",
            "/scaling-pressure-demo.js",
            "/latency-budget-demo.js",
            "/vendor/easymde/easymde.min.js",
            "/editor.js",
          ]
        : [
            "/book-nav.js",
            "/comments.js",
            "/project-fit-checker.js",
            "/model-eval-demo.js",
            "/agent-fleet-demo.js",
            "/scaling-pressure-demo.js",
            "/latency-budget-demo.js",
          ],
      children: renderer.renderBookPage({ page, rendered, previous, next }),
    }),
  );
}

await writePage(
  "index.html",
  renderer.renderLayout({
    title: config.title,
    description: config.description,
    currentUrl: "/",
    children: renderer.renderHome(),
  }),
);

await compileSiteStylesheet("styles.css");
await compileSiteScript("scripts/theme.ts", "theme.js");
await compileSiteScript("scripts/book-nav.ts", "book-nav.js");
await compileSiteScript("scripts/comments.ts", "comments.js");
await compileSiteScript(
  "scripts/project-fit-checker.ts",
  "project-fit-checker.js",
);
await compileSiteScript("scripts/model-eval-demo.ts", "model-eval-demo.js");
await compileSiteScript("scripts/agent-fleet-demo.ts", "agent-fleet-demo.js");
await compileSiteScript(
  "scripts/scaling-pressure-demo.ts",
  "scaling-pressure-demo.js",
);
await compileSiteScript(
  "scripts/latency-budget-demo.ts",
  "latency-budget-demo.js",
);
if (includeEditor) {
  await compileSiteScript("scripts/editor.ts", "editor.js");
}
await copyStaticAssets();
if (includeEditor) {
  await copyEditorAssets();
}

async function writePage(relativePath, content) {
  const outputPath = path.join(buildDir, relativePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content, "utf8");
}

async function compileSiteStylesheet(sourceRelativePath) {
  const outputPath = path.join(buildDir, sourceRelativePath);
  const sourcePath = path.join(siteDir, sourceRelativePath);
  const source = await inlineCssImports(sourcePath);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, source, "utf8");
}

async function inlineCssImports(sourcePath, seen = new Set()) {
  if (seen.has(sourcePath)) {
    throw new Error(`Circular CSS import: ${sourcePath}`);
  }

  seen.add(sourcePath);

  const source = await readFile(sourcePath, "utf8");
  const lines = await Promise.all(
    source.split("\n").map(async (line) => {
      const match = line.match(/^@import\s+"(.+)"\s*;$/);

      if (!match) {
        return line;
      }

      const importPath = path.resolve(path.dirname(sourcePath), match[1]);

      return inlineCssImports(importPath, seen);
    }),
  );

  seen.delete(sourcePath);

  return lines.join("\n");
}

async function compileSiteScript(sourceRelativePath, outputRelativePath) {
  const sourcePath = path.join(siteDir, sourceRelativePath);
  const outputPath = path.join(buildDir, outputRelativePath);
  const source = await readFile(sourcePath, "utf8");
  const result = await transformWithOxc(source, sourcePath, {
    lang: "ts",
    target: "es2022",
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, result.code, "utf8");
}

function getAllConfiguredChapterFiles(config) {
  const files = [...(config.chapters || [])];

  for (const part of config.parts || []) {
    files.push(...(part.chapters || []));
  }

  return [...new Set(files)];
}

async function getChapter(file, index) {
  const source = await readFile(path.join(root, file), "utf8");
  const fallbackTitle = titleFromFilename(file);
  const firstHeading = source.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const title = firstHeading || fallbackTitle;
  const chapterNumber = chapterNumberFromFilename(file);
  const slug =
    chapterNumber === "0" || index === 0
      ? "introduction"
      : path.basename(file, ".md").replace(/^\d+_/, "").replaceAll("_", "-");

  return {
    file,
    index,
    collection: "chapters",
    kind: "chapter",
    label: chapterNumber === "0" ? "Introduction" : `Chapter ${chapterNumber}`,
    number: chapterNumber,
    slug,
    url: `/chapters/${slug}/`,
    title,
    source,
  };
}

async function getPartPage(part) {
  const source = await readFile(path.join(root, part.file), "utf8");
  const fallbackTitle = part.title || titleFromFilename(part.file);
  const firstHeading = source.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const title = firstHeading || fallbackTitle;
  const slug = path
    .basename(part.file, ".md")
    .replace(/^\d+_/, "")
    .replaceAll("_", "-");

  return {
    file: part.file,
    collection: "parts",
    kind: "part",
    label: `Part ${part.number}`,
    number: part.number,
    slug,
    title,
    source,
    url: `/parts/${slug}/`,
  };
}

function buildBookPages({ chapters, partPages, parts }) {
  const pages = chapters.filter((chapter) => chapter.number === "0");
  const partPageByFile = new Map(partPages.map((page) => [page.file, page]));

  for (const part of parts) {
    const partPage = part.file ? partPageByFile.get(part.file) : null;

    if (partPage) {
      pages.push(partPage);
    }

    for (const chapterFile of part.chapters) {
      const chapter = chapterByFile.get(chapterFile);

      if (chapter) {
        pages.push(chapter);
      }
    }
  }

  for (const chapter of chapters) {
    if (!pages.includes(chapter)) {
      pages.push(chapter);
    }
  }

  return pages;
}

function getPartMetadata(parts) {
  const byChapter = new Map();

  return {
    byChapter,
    parts: parts.map((part) => {
      const normalized = {
        number: part.number || "",
        title: part.title || "",
        description: part.description || "",
        file: part.file || "",
        chapters: Array.isArray(part.chapters) ? part.chapters : [],
      };

      for (const chapter of normalized.chapters) {
        byChapter.set(chapter, normalized);
      }

      return normalized;
    }),
  };
}

async function copyEditorAssets() {
  const vendorDir = path.join(buildDir, "vendor", "easymde");

  await mkdir(vendorDir, { recursive: true });
  await copyFile(
    path.join(root, "node_modules", "easymde", "dist", "easymde.min.css"),
    path.join(vendorDir, "easymde.min.css"),
  );
  await copyFile(
    path.join(root, "node_modules", "easymde", "dist", "easymde.min.js"),
    path.join(vendorDir, "easymde.min.js"),
  );
}

async function copyStaticAssets() {
  const assetsDir = path.join(buildDir, "assets");

  await mkdir(assetsDir, { recursive: true });
  await copyFile(
    path.join(siteDir, "favicon.svg"),
    path.join(buildDir, "favicon.svg"),
  );
  await copyFile(
    path.join(siteDir, "assets", "book-cover.svg"),
    path.join(assetsDir, "book-cover.svg"),
  );
  await copyFile(
    path.join(siteDir, "assets", "blank-map-world.svg"),
    path.join(assetsDir, "blank-map-world.svg"),
  );
}

async function loadTemplates(templatePaths) {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(templatePaths).map(async ([name, templatePath]) => [
        name,
        await readFile(path.join(siteDir, templatePath), "utf8"),
      ]),
    ),
  );
}
