// @ts-nocheck
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { build as viteBuild, transformWithOxc } from "vite";
import {
  getPublicMarkdownSource,
  renderMarkdown,
  resolveTrustedHtmlImports,
} from "./lib/markdown.ts";
import { renderHtmlisp } from "./lib/htmlisp.ts";
import { createSiteRenderer } from "./lib/site-renderer.ts";
import {
  chapterNumberFromFilename,
  escapeAttribute,
  escapeHtml,
  parseJsonc,
  slugify,
  titleFromFilename,
} from "./lib/text.ts";

const root = process.cwd();
const buildDir = path.resolve(root, process.env.BUILD_DIR || "build");
const siteDir = path.join(root, "site");
const includeAllChapters = process.argv.includes("--all-chapters");
const includeEditor = process.argv.includes("--editable");
const bibliographySource = await readFile(
  path.join(root, "bibliography.bib"),
  "utf8",
);
const config = parseJsonc(
  await readFile(path.join(root, "site.config.jsonc"), "utf8"),
);
const templates = await loadTemplates({
  baseLayout: "layouts/BaseLayout.html",
  bookNavigation: "components/BookNavigation.html",
  bookPage: "layouts/bookPage.html",
  paginationLink: "components/PaginationLink.html",
  projectPage: "layouts/projectPage.html",
  siteIndex: "layouts/siteIndex.html",
});
const commonBookScripts = ["/book-nav.js", "/toc-highlight.js", "/comments.js"];
const demoStylesheet = "/styles/demos.css";
const editorScripts = ["/vendor/easymde/easymde.min.js", "/editor.js"];
const developmentScripts = includeEditor ? ["/dev-reload.js"] : [];
const projectSpecificationDefinitions = [
  {
    file: "specifications/00_common_project.md",
    label: "Common contract",
    phase: "common",
    sequence: "00",
    slug: "",
    summary: "Behavior, technical freedom, evidence, and shared evaluation.",
  },
  {
    file: "specifications/01_establish.md",
    label: "Establish",
    phase: "establish",
    sequence: "01",
    slug: "establish",
    summary: "Implementation A · local model · single agent.",
  },
  {
    file: "specifications/02_challenge.md",
    label: "Challenge",
    phase: "challenge",
    sequence: "02",
    slug: "challenge",
    summary: "Implementation B · foundation model · single agent.",
  },
  {
    file: "specifications/03_compare.md",
    label: "Compare",
    phase: "compare",
    sequence: "03",
    slug: "compare",
    summary: "Implementation C · declared agent fleet.",
  },
];
const demoScriptIncludes = [
  {
    title: "Implementation discovery lab",
    chapter: "Scalable development",
    include: "site/includes/project-fit-checker.html",
    script: "/project-fit-checker.js",
  },
  {
    title: "Scalability dimensions lab",
    chapter: "What is scalability?",
    include: "site/includes/scalability-dimensions-demo.html",
    script: "/scalability-dimensions-demo.js",
  },
  {
    title: "Boundary trace",
    chapter: "Architecture",
    include: "site/includes/request-trace-demo.html",
    script: "/request-trace-demo.js",
  },
  {
    title: "Tail latency simulator",
    chapter: "Benchmarking",
    include: "site/includes/benchmark-simulation-demo.html",
    script: "/benchmark-simulation-demo.js",
  },
  {
    title: "Model evaluation lab",
    chapter: "Benchmarking",
    include: "site/includes/model-eval-demo.html",
    script: "/model-eval-demo.js",
  },
  {
    title: "Observability signal picker",
    chapter: "Benchmarking",
    include: "site/includes/observability-signal-demo.html",
    script: "/observability-signal-demo.js",
  },
  {
    title: "OpenTelemetry trace explorer",
    chapter: "Benchmarking",
    include: "site/includes/otel-trace-demo.html",
    script: "/otel-trace-demo.js",
  },
  {
    title: "Workflow loop",
    chapter: "Friction",
    include: "site/includes/workflow-loop-demo.html",
    script: "/workflow-loop-demo.js",
  },
  {
    title: "Friction audit",
    chapter: "Friction",
    include: "site/includes/friction-audit-demo.html",
    script: "/friction-audit-demo.js",
  },
  {
    title: "Changed assumptions map",
    chapter: "Reality",
    include: "site/includes/pressure-map-demo.html",
    script: "/pressure-map-demo.js",
  },
  {
    title: "Agent fleet delegation",
    chapter: "Agent fleets",
    include: "site/includes/agent-fleet-demo.html",
    script: "/agent-fleet-demo.js",
  },
  {
    title: "Scaling pressure planner",
    chapter: "Scaling",
    include: "site/includes/scaling-pressure-demo.html",
    script: "/scaling-pressure-demo.js",
  },
  {
    title: "Orchestration control loop",
    chapter: "Scaling",
    include: "site/includes/orchestration-demo.html",
    script: "/orchestration-demo-loader.js",
  },
  {
    title: "Latency budget map",
    chapter: "Scaling",
    include: "site/includes/latency-budget-demo.html",
    script: "/latency-budget-demo.js",
  },
  {
    title: "Final reflection package",
    chapter: "Recap",
    include: "site/includes/final-reflection-demo.html",
    script: "/final-reflection-demo.js",
  },
];

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
const projectSpecifications = await Promise.all(
  projectSpecificationDefinitions.map(async (definition) => {
    const source = await readFile(path.join(root, definition.file), "utf8");
    const title = source.match(/^#\s+(.+)$/m)?.[1]?.trim() || definition.label;
    const url = definition.slug ? `/project/${definition.slug}/` : "/project/";

    return {
      ...definition,
      downloadUrl: `/project/source/${definition.slug || "common-project"}.md`,
      source,
      title,
      url,
    };
  }),
);

for (let index = 0; index < bookPages.length; index++) {
  const page = bookPages[index];
  const rendered = renderMarkdown(page.source, page, bibliographySource);
  const previous = bookPages[index - 1];
  const next = bookPages[index + 1];
  const pageScripts = [
    ...commonBookScripts,
    ...getDemoScriptsForSource(page.source),
    ...(includeEditor ? editorScripts : []),
    ...developmentScripts,
  ];
  const pageStylesheets = [
    ...(hasDemoInclude(page.source) ? [demoStylesheet] : []),
    ...(includeEditor ? ["/vendor/easymde/easymde.min.css"] : []),
  ];
  await writePage(
    `${page.collection}/${page.slug}/index.html`,
    renderer.renderLayout({
      title: `${page.title} - ${config.title}`,
      description: config.description,
      currentUrl: page.url,
      stylesheets: pageStylesheets,
      scripts: pageScripts,
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
    scripts: developmentScripts,
    children: renderer.renderHome(),
  }),
);

for (let index = 0; index < projectSpecifications.length; index++) {
  const specification = projectSpecifications[index];
  const rendered = renderMarkdown(
    rewriteProjectSpecificationLinks(specification.source),
    { number: "" },
    bibliographySource,
  );
  const previous = projectSpecifications[index - 1];
  const next = projectSpecifications[index + 1];

  await writePage(
    specification.slug
      ? `project/${specification.slug}/index.html`
      : "project/index.html",
    renderer.renderLayout({
      title: `${specification.title} - ${config.title}`,
      description: specification.summary,
      currentUrl: specification.url,
      stylesheets: ["/styles/project.css"],
      scripts: ["/toc-highlight.js", ...developmentScripts],
      children: renderProjectPage({
        content: rendered.content,
        next,
        previous,
        specification,
        tableOfContents: rendered.tableOfContents,
      }),
    }),
  );
}

const demoGalleryHeading = renderMarkdown(
  "# Demo showcase",
  { number: "" },
  bibliographySource,
);
const demoGallery = `${demoGalleryHeading.content}\n${resolveTrustedHtmlImports(getDemoGalleryHtml())}`;
await writePage(
  "demos/index.html",
  renderer.renderLayout({
    title: `Demo showcase - ${config.title}`,
    description: "A single page for previewing and debugging course demos.",
    currentUrl: "/demos/",
    stylesheets: [demoStylesheet],
    scripts: [
      ...demoScriptIncludes.map(({ script }) => script),
      ...developmentScripts,
    ],
    children: renderDemoGalleryPage(demoGallery),
  }),
);

await compileSiteStylesheet("styles.css");
await compileSiteStylesheet("styles/demos.css");
await compileSiteStylesheet("styles/project.css");
await compileSiteScript("scripts/theme.ts", "theme.js");
await compileSiteScript("scripts/book-nav.ts", "book-nav.js");
await compileSiteScript("scripts/toc-highlight.ts", "toc-highlight.js");
await compileSiteScript("scripts/comments.ts", "comments.js");
await compileSiteScript(
  "scripts/project-fit-checker.ts",
  "project-fit-checker.js",
);
await compileSiteScript(
  "scripts/scalability-dimensions-demo.ts",
  "scalability-dimensions-demo.js",
);
await compileSiteScript(
  "scripts/request-trace-demo.ts",
  "request-trace-demo.js",
);
await compileSiteScript(
  "scripts/benchmark-simulation-demo.ts",
  "benchmark-simulation-demo.js",
);
await compileSiteScript("scripts/model-eval-demo.ts", "model-eval-demo.js");
await compileSiteScript(
  "scripts/observability-signal-demo.ts",
  "observability-signal-demo.js",
);
await compileSiteScript("scripts/otel-trace-demo.ts", "otel-trace-demo.js");
await compileSiteScript(
  "scripts/workflow-loop-demo.ts",
  "workflow-loop-demo.js",
);
await compileSiteScript(
  "scripts/friction-audit-demo.ts",
  "friction-audit-demo.js",
);
await compileSiteScript("scripts/pressure-map-demo.ts", "pressure-map-demo.js");
await compileSiteScript("scripts/agent-fleet-demo.ts", "agent-fleet-demo.js");
await compileSiteScript(
  "scripts/scaling-pressure-demo.ts",
  "scaling-pressure-demo.js",
);
await compileSiteBundle(
  "scripts/orchestration-demo.ts",
  "vendor/orchestration-demo.js",
  "OrchestrationDemo",
);
await compileSiteScript(
  "scripts/orchestration-demo-loader.ts",
  "orchestration-demo-loader.js",
);
await compileSiteScript(
  "scripts/latency-budget-demo.ts",
  "latency-budget-demo.js",
);
await compileSiteScript(
  "scripts/final-reflection-demo.ts",
  "final-reflection-demo.js",
);
if (includeEditor) {
  await compileSiteScript("scripts/editor.ts", "editor.js");
  await compileSiteScript("scripts/dev-reload.ts", "dev-reload.js");
}
await copyStaticAssets();
await copyProjectSpecificationSources(projectSpecifications);
if (includeEditor) {
  await copyEditorAssets();
}

async function writePage(relativePath, content) {
  const outputPath = path.join(buildDir, relativePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content, "utf8");
}

function getDemoScriptsForSource(source) {
  return demoScriptIncludes
    .filter(({ include }) => source.includes(include))
    .map(({ script }) => script);
}

function hasDemoInclude(source) {
  return demoScriptIncludes.some(({ include }) => source.includes(include));
}

function getDemoGalleryHtml() {
  const sections = demoScriptIncludes
    .map(({ title, chapter, include }, index) => {
      const id = `demo-${slugify(title)}`;
      const displayIndex = String(index + 1).padStart(2, "0");

      return `<section class="demo-gallery-item" id="${escapeAttribute(id)}">
<div class="demo-gallery-item-header">
<span class="demo-gallery-index" aria-hidden="true">${displayIndex}</span>
<div>
<p>${chapter}</p>
<a href="#${escapeAttribute(id)}">${title}</a>
</div>
<span class="demo-gallery-status"><i aria-hidden="true"></i> Ready</span>
</div>
{{ import "${include}" }}
</section>`;
    })
    .join("\n\n");

  return `<div class="demo-gallery-lede">
<p>Work through one module at a time: change the inputs, inspect what responds, and connect the result to your own project. Repeat a scenario until you can explain the trade-off without relying on the interface.</p>
<dl class="demo-gallery-stats">
<div><dt>Modules</dt><dd>${demoScriptIncludes.length}</dd></div>
<div><dt>Runtime</dt><dd>Browser</dd></div>
<div><dt>Mode</dt><dd>Self-guided</dd></div>
</dl>
</div>

${sections}
`;
}

function renderDemoGalleryPage(content) {
  return `<main class="demo-gallery-page" id="content">
<article class="prose demo-gallery-prose">
${content}
</article>
</main>`;
}

function renderProjectPage({
  content,
  next,
  previous,
  specification,
  tableOfContents,
}) {
  return renderHtmlisp(templates.projectPage, {
    content,
    downloadUrl: specification.downloadUrl,
    nextLink: renderProjectPaginationLink(next, "Next brief"),
    phase: specification.phase,
    projectNavigation: renderProjectNavigation(specification),
    projectSequence: specification.sequence,
    projectSummary: specification.summary,
    projectTitle: specification.label,
    projectToc: renderProjectToc(tableOfContents),
    previousLink: renderProjectPaginationLink(previous, "Previous brief"),
  });
}

function renderProjectNavigation(current) {
  return projectSpecifications
    .map((specification) => {
      const ariaCurrent =
        specification.url === current.url ? ' aria-current="page"' : "";

      return `<li><a href="${escapeAttribute(specification.url)}"${ariaCurrent}>
  <span>${escapeHtml(specification.sequence)}</span>
  <strong>${escapeHtml(specification.label)}</strong>
  <small>${escapeHtml(specification.summary)}</small>
</a></li>`;
    })
    .join("\n");
}

function renderProjectToc(tableOfContents) {
  const headings = tableOfContents.filter(
    (item) => item.level > 1 && item.level < 4,
  );

  return headings
    .map(
      (item) =>
        `<li><a class="toc-level-${item.level}" href="#${escapeAttribute(item.slug)}">${escapeHtml(item.text)}</a></li>`,
    )
    .join("\n");
}

function renderProjectPaginationLink(specification, direction) {
  if (!specification) {
    return "";
  }

  return `<a href="${escapeAttribute(specification.url)}"><span>${escapeHtml(direction)}</span><strong>${escapeHtml(specification.label)}</strong></a>`;
}

function rewriteProjectSpecificationLinks(source) {
  const urlByFilename = new Map(
    projectSpecificationDefinitions.map((definition) => [
      path.basename(definition.file),
      definition.slug ? `/project/${definition.slug}/` : "/project/",
    ]),
  );

  return source.replace(/\]\((\d{2}_[^)]+\.md)\)/g, (match, filename) =>
    urlByFilename.has(filename) ? `](${urlByFilename.get(filename)})` : match,
  );
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
    // Keep this aligned with package.json browserslist Safari/iOS Safari support.
    target: "es2019",
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, result.code, "utf8");
}

async function compileSiteBundle(
  sourceRelativePath,
  outputRelativePath,
  globalName,
) {
  await viteBuild({
    configFile: false,
    logLevel: "warn",
    build: {
      // Webernetes models 64-bit Kubernetes values with BigInt.
      target: "es2020",
      outDir: buildDir,
      emptyOutDir: false,
      sourcemap: false,
      lib: {
        entry: path.join(siteDir, sourceRelativePath),
        formats: ["iife"],
        name: globalName,
        fileName: () => outputRelativePath,
      },
    },
  });
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

async function copyProjectSpecificationSources(specifications) {
  const sourceDir = path.join(buildDir, "project", "source");

  await mkdir(sourceDir, { recursive: true });
  await Promise.all(
    specifications.map((specification) =>
      writeFile(
        path.join(sourceDir, `${specification.slug || "common-project"}.md`),
        rewriteProjectSpecificationLinks(
          getPublicMarkdownSource(specification.source),
        ),
        "utf8",
      ),
    ),
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
