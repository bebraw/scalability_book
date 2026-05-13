import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import highlight from "highlight.js/lib/core";
import { htmlispToHTMLSync } from "gustwind/htmlisp";
import bash from "highlight.js/lib/languages/bash";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

const root = process.cwd();
const buildDir = path.join(root, "build");
const includeAllChapters = process.argv.includes("--all-chapters");
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

highlight.registerLanguage("bash", bash);
highlight.registerLanguage("html", xml);
highlight.registerLanguage("javascript", javascript);
highlight.registerLanguage("js", javascript);
highlight.registerLanguage("json", json);
highlight.registerLanguage("typescript", typescript);
highlight.registerLanguage("ts", typescript);
highlight.registerLanguage("xml", xml);
highlight.registerLanguage("yaml", yaml);
highlight.registerLanguage("yml", yaml);

marked.setOptions({ gfm: true, breaks: false });

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

for (let index = 0; index < bookPages.length; index++) {
  const page = bookPages[index];
  const rendered = renderMarkdown(page.source, page);
  const previous = bookPages[index - 1];
  const next = bookPages[index + 1];
  await writePage(
    `${page.collection}/${page.slug}/index.html`,
    renderLayout({
      title: `${page.title} - ${config.title}`,
      description: config.description,
      currentUrl: page.url,
      stylesheets: ["/vendor/easymde/easymde.min.css"],
      scripts: ["/comments.js", "/vendor/easymde/easymde.min.js", "/editor.js"],
      children: renderBookPage({ page, rendered, previous, next }),
    }),
  );
}

await writePage(
  "index.html",
  renderLayout({
    title: config.title,
    description: config.description,
    currentUrl: "/",
    children: renderHome(),
  }),
);

await writeFile(path.join(buildDir, "styles.css"), styles(), "utf8");
await writeFile(path.join(buildDir, "theme.js"), themeScript(), "utf8");
await writeFile(path.join(buildDir, "editor.js"), editorScript(), "utf8");
await writeFile(path.join(buildDir, "comments.js"), commentsScript(), "utf8");
await copyStaticAssets();
await copyEditorAssets();

async function writePage(relativePath, content) {
  const outputPath = path.join(buildDir, relativePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content, "utf8");
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
    path.join(root, "site", "assets", "book-cover.svg"),
    path.join(assetsDir, "book-cover.svg"),
  );
}

async function loadTemplates(templatePaths) {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(templatePaths).map(async ([name, templatePath]) => [
        name,
        await readFile(path.join(root, "site", templatePath), "utf8"),
      ]),
    ),
  );
}

function renderMarkdown(source, chapter) {
  const tableOfContents = [];
  const sectionCounters = [];
  const paragraphCounts = new Map();
  const renderer = new marked.Renderer();

  renderer.heading = ({ tokens, depth, raw }) => {
    const text = marked.Parser.parseInline(tokens);
    const slug = slugify(raw);
    const sectionNumber = getSectionNumber(depth, chapter, sectionCounters);
    const displayText = stripHeadingNumber(text);
    const plainText = stripHeadingNumber(decodeHtmlEntities(stripHtml(text)));
    const headingText = sectionNumber
      ? `${sectionNumber} ${plainText}`
      : plainText;

    tableOfContents.push({ slug, level: depth, text: headingText });

    return `<h${depth} id="${slug}">${sectionNumber ? `<span class="section-number">${sectionNumber}</span> ` : ""}${displayText}<a class="heading-anchor" href="#${slug}" aria-label="Link to ${escapeAttribute(plainText)}">#</a></h${depth}>`;
  };

  renderer.code = ({ text, lang }) => {
    const language = lang?.trim().split(/\s+/)[0];
    const renderedCode =
      language && highlight.getLanguage(language)
        ? highlight.highlight(text, { language }).value
        : escapeHtml(text);

    return `<pre><code class="hljs${language ? ` language-${language}` : ""}">${renderedCode.replace(/\n$/, "")}\n</code></pre>`;
  };

  renderer.link = ({ href, title, tokens }) => {
    const text = marked.Parser.parseInline(tokens);
    const external = /^https?:\/\//.test(href);
    const titleAttribute = title ? ` title="${escapeAttribute(title)}"` : "";
    const targetAttributes = external
      ? ' target="_blank" rel="noreferrer"'
      : "";

    return `<a href="${escapeAttribute(href)}"${titleAttribute}${targetAttributes}>${text}</a>`;
  };

  renderer.paragraph = ({ tokens, raw }) => {
    const html = marked.Parser.parseInline(tokens);
    const baseId = stableParagraphId(raw);
    const count = (paragraphCounts.get(baseId) || 0) + 1;
    paragraphCounts.set(baseId, count);
    const paragraphId = count === 1 ? baseId : `${baseId}-${count}`;

    return `<p id="${paragraphId}" data-comment-target="${paragraphId}">${html}<button class="paragraph-comment-button" type="button" data-comment-button="${paragraphId}" aria-label="Comment on this paragraph">Comment</button></p>`;
  };

  return {
    content: marked(source, { renderer }),
    tableOfContents,
  };
}

function renderHome() {
  const firstChapter = chapters[0];

  return renderHtmlisp(templates.siteIndex, {
    bookContents: renderHomeContents(),
    coverAlt: "Cover of Elements of Scalable Web Applications",
    coverImageUrl: "/assets/book-cover.svg",
    title: config.title,
    description: config.description,
    course: config.course,
    firstChapterUrl: firstChapter.url,
  });
}

function renderBookPage({ page, rendered, previous, next }) {
  return renderHtmlisp(templates.bookPage, {
    bookSidebar: renderBookSidebar(page),
    chapterFile: page.file,
    chapterLabel: page.label,
    chapterSlug: page.slug,
    content: rendered.content,
    localToc: renderLocalToc(rendered.tableOfContents),
    nextLink: renderPaginationLink(next, "Next", "next"),
    previousLink: renderPaginationLink(previous, "Previous", "prev"),
  });
}

function renderLayout({
  title,
  description,
  currentUrl,
  stylesheets = [],
  scripts = [],
  children,
}) {
  const canonicalUrl = `https://${config.domain}${currentUrl}`;

  return renderHtmlisp(templates.baseLayout, {
    authorName: config.author.name,
    authorUrl: config.author.url,
    canonicalUrl,
    children,
    description,
    scriptTags: scripts
      .map((src) => `<script src="${escapeAttribute(src)}" defer></script>`)
      .join("\n"),
    siteTitle: config.title,
    stylesheetTags: stylesheets
      .map(
        (href) => `<link rel="stylesheet" href="${escapeAttribute(href)}" />`,
      )
      .join("\n"),
    themes: config.themes,
    title,
  });
}

function renderBookSidebar(currentChapter) {
  return renderHtmlisp(templates.bookContentsSidebar, {
    bookContents: renderSidebarContents(currentChapter),
  });
}

function renderHomeContents() {
  return renderChapterParts({
    chapters: indexChapters,
    currentChapter: null,
    mode: "home",
  });
}

function renderSidebarContents(currentChapter) {
  return renderChapterParts({
    chapters: indexChapters,
    currentChapter,
    mode: "sidebar",
  });
}

function renderChapterParts({ chapters, currentChapter, mode }) {
  const chapterByFile = new Map(
    chapters.map((chapter) => [chapter.file, chapter]),
  );
  const partPageByFile = new Map(
    indexPartPages.map((partPage) => [partPage.file, partPage]),
  );
  const assignedFiles = new Set();
  const parts = partMetadata.parts.map((part) => {
    const partPage = part.file ? partPageByFile.get(part.file) : null;
    const partChapters = part.chapters
      .map((file) => chapterByFile.get(file))
      .filter(Boolean);

    for (const chapter of partChapters) {
      assignedFiles.add(chapter.file);
    }

    return {
      ...part,
      partPage,
      chapters: partChapters,
    };
  });
  const unassignedChapters = chapters.filter(
    (chapter) => !assignedFiles.has(chapter.file),
  );

  if (unassignedChapters.length > 0) {
    parts.unshift({
      number: "",
      title: "Front matter",
      description: "",
      chapters: unassignedChapters,
    });
  }

  return parts
    .filter((part) => part.chapters.length > 0)
    .map((part) =>
      mode === "home"
        ? renderHomePart(part)
        : renderSidebarPart(part, currentChapter),
    )
    .join("\n");
}

function renderHomePart(part) {
  const heading = part.number
    ? `Part ${part.number}: ${part.title}`
    : part.title;
  const headingContent = part.partPage
    ? `<a href="${escapeAttribute(part.partPage.url)}">${escapeHtml(heading)}</a>`
    : escapeHtml(heading);

  return `<section class="book-part" aria-labelledby="${slugify(heading)}-heading">
  <div class="book-part-header">
    <h3 id="${slugify(heading)}-heading">${headingContent}</h3>
  </div>
  <ol class="chapter-grid">
    ${part.chapters.map(renderHomeChapter).join("\n    ")}
  </ol>
</section>`;
}

function renderHomeChapter(chapter) {
  const label =
    chapter.label ||
    (chapter.number === "0" ? "Introduction" : `Chapter ${chapter.number}`);
  const status = chapter.status ? `<em>${escapeHtml(chapter.status)}</em>` : "";
  const inner = `<span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(chapter.title)}</strong>
      ${status}`;

  if (!chapter.published) {
    return `<li class="${escapeAttribute(chapter.className)}"><span class="chapter-card" aria-disabled="true">
      ${inner}
    </span></li>`;
  }

  return `<li class="${escapeAttribute(chapter.className)}"><a href="${escapeAttribute(chapter.url)}">
      ${inner}
    </a></li>`;
}

function renderSidebarPart(part, currentChapter) {
  const heading = part.number
    ? `Part ${part.number}: ${part.title}`
    : part.title;
  const entries = part.partPage
    ? [part.partPage, ...part.chapters]
    : part.chapters;

  return `<section class="book-sidebar-part">
  <h2>${escapeHtml(heading)}</h2>
  <ol>
    ${entries.map((chapter) => renderSidebarChapter(chapter, currentChapter)).join("\n    ")}
  </ol>
</section>`;
}

function renderSidebarChapter(chapter, currentChapter) {
  const ariaCurrent =
    chapter.slug === currentChapter.slug ? ' aria-current="page"' : "";
  const number =
    chapter.kind === "part"
      ? chapter.label
      : chapter.number === "0"
        ? "Intro"
        : chapter.number;
  const inner =
    chapter.kind === "part"
      ? `<span class="book-sidebar-part-link">${escapeHtml(`${number}: ${chapter.title}`)}</span>`
      : `<span>${escapeHtml(number)}</span><span>${escapeHtml(chapter.title)}</span>`;

  if (!chapter.published) {
    return `<li><span class="book-sidebar-disabled" aria-disabled="true">${inner}</span></li>`;
  }

  return `<li><a href="${escapeAttribute(chapter.url)}"${ariaCurrent}>${inner}</a></li>`;
}

function renderLocalToc(tableOfContents) {
  const headings = tableOfContents.filter(
    (item) => item.level > 1 && item.level < 4,
  );

  return renderHtmlisp(templates.localTableOfContents, {
    headings: headings.map((item) => ({
      ...item,
      className: `toc-level-${item.level}`,
      href: `#${item.slug}`,
    })),
  });
}

function renderPaginationLink(chapter, label, rel) {
  if (!chapter) {
    return "<span></span>";
  }

  return renderHtmlisp(templates.paginationLink, {
    label,
    rel,
    title: chapter.title,
    url: chapter.url,
  });
}

function renderHtmlisp(htmlInput, props = {}) {
  const rawBlocks = [];
  const rendered = htmlispToHTMLSync({
    htmlInput,
    components: {
      Raw: ({ html }) => {
        const index = rawBlocks.push(html || " ") - 1;

        return `HTMLISP_RAW_${index}`;
      },
    },
    props,
    renderOptions: { escapeByDefault: true },
  });

  return normalizeVoidTags(
    rawBlocks.reduce(
      (html, rawBlock, index) =>
        html.replaceAll(`HTMLISP_RAW_${index}`, rawBlock),
      rendered,
    ),
  );
}

function normalizeVoidTags(html) {
  return html.replaceAll("</meta>", "").replaceAll("</link>", "");
}

function styles() {
  return `:root {
  color-scheme: light;
  --bg: #f8f6f0;
  --panel: #ffffff;
  --text: #17201d;
  --muted: #53635d;
  --border: #d8ded8;
  --accent: #0f766e;
  --accent-strong: #134e4a;
  --code-bg: #17201d;
  --code-text: #ecfdf5;
  --shadow: 0 18px 40px rgb(23 32 29 / 10%);
  font-family: "Avenir Next", "Segoe UI", system-ui, sans-serif;
}

[data-theme="dark"] {
  color-scheme: dark;
  --bg: #121514;
  --panel: #1c211f;
  --text: #edf3ef;
  --muted: #a8b8b0;
  --border: #35413c;
  --accent: #5eead4;
  --accent-strong: #99f6e4;
  --code-bg: #080b0a;
  --code-text: #e7fff8;
  --shadow: 0 18px 40px rgb(0 0 0 / 24%);
}

[data-theme="sepia"] {
  color-scheme: light;
  --bg: #f4ecd9;
  --panel: #fffaf0;
  --text: #2a2118;
  --muted: #67594a;
  --border: #d9c9aa;
  --accent: #8a4b21;
  --accent-strong: #5e3218;
  --code-bg: #2d241c;
  --code-text: #fff6e5;
}

[data-theme="contrast"] {
  color-scheme: dark;
  --bg: #000000;
  --panel: #050505;
  --text: #ffffff;
  --muted: #f2f2f2;
  --border: #ffffff;
  --accent: #ffdd00;
  --accent-strong: #ffffff;
  --code-bg: #000000;
  --code-text: #ffffff;
}

[data-theme="calm"] {
  color-scheme: light;
  --bg: #eef7f3;
  --panel: #fbfffd;
  --text: #16251f;
  --muted: #52685e;
  --border: #bfd8cd;
  --accent: #2f6f93;
  --accent-strong: #1f4d66;
  --code-bg: #17242b;
  --code-text: #e9f8ff;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-size: 18px;
  line-height: 1.65;
}
a { color: var(--accent-strong); }
a:hover { color: var(--accent); }
.skip-link {
  position: absolute;
  left: 1rem;
  top: -10rem;
  z-index: 10;
  background: var(--accent);
  color: var(--panel);
  padding: .5rem .75rem;
}
.skip-link:focus { top: 1rem; }
.site-header {
  align-items: center;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr auto;
  padding: .85rem clamp(1rem, 3vw, 2.5rem);
  position: sticky;
  top: 0;
  z-index: 5;
}
.brand {
  color: var(--text);
  font-weight: 800;
  text-decoration: none;
}
.header-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: flex-end;
}
.site-header nav {
  display: flex;
  gap: 1rem;
  font-size: .95rem;
}
.site-header nav a { text-decoration: none; }
.theme-picker {
  align-items: center;
  display: flex;
  gap: .45rem;
  font-size: .9rem;
}
.theme-picker select {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: .35rem;
  color: var(--text);
  font: inherit;
  padding: .3rem .45rem;
}
.edit-toggle {
  background: var(--accent-strong);
  border: 1px solid var(--accent-strong);
  border-radius: .35rem;
  color: var(--panel);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  padding: .35rem .7rem;
}
.edit-toggle:hover {
  background: var(--accent);
  border-color: var(--accent);
}
.site-footer {
  border-top: 1px solid var(--border);
  color: var(--muted);
  margin-top: 4rem;
  padding: 1.5rem clamp(1rem, 3vw, 2.5rem);
  text-align: center;
}
.site-footer p {
  margin: 0;
}
.hero {
  align-items: start;
  display: grid;
  gap: 2rem;
  grid-template-columns: minmax(0, 1fr) minmax(14rem, 22rem);
  margin: 0 auto;
  max-width: 72rem;
  padding: clamp(2rem, 6vw, 5rem) clamp(1rem, 3vw, 2.5rem);
}
.hero-copy h1 {
  font-family: Georgia, Cambria, "Times New Roman", serif;
  font-size: clamp(2.6rem, 6vw, 5.25rem);
  letter-spacing: 0;
  line-height: 1;
  margin: .25rem 0 1rem;
  max-width: 11ch;
}
.hero-copy p:not(.eyebrow) {
  color: var(--muted);
  max-width: 42rem;
}
.eyebrow,
.chapter-kicker,
.book-sidebar > p,
.local-toc > p {
  color: var(--muted);
  font-size: .78rem;
  font-weight: 800;
  letter-spacing: .08em;
  margin: 0 0 .75rem;
  text-transform: uppercase;
}
.primary-link {
  background: var(--accent-strong);
  border-radius: .35rem;
  color: var(--panel);
  display: inline-flex;
  font-weight: 700;
  margin-top: 1rem;
  padding: .65rem .9rem;
  text-decoration: none;
}
.primary-link:hover { color: var(--panel); background: var(--accent); }
.cover-panel {
  display: grid;
  gap: 1rem;
}
.cover-panel img {
  aspect-ratio: 3 / 4;
  background: #ffffff;
  border-radius: .5rem;
  box-shadow: var(--shadow);
  display: block;
  height: auto;
  width: 100%;
}
.course-panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: .5rem;
  box-shadow: var(--shadow);
  padding: 1rem;
}
.course-panel dl,
.course-panel dd { margin: 0; }
.course-panel div + div { border-top: 1px solid var(--border); margin-top: .8rem; padding-top: .8rem; }
.course-panel dt { color: var(--muted); font-size: .8rem; font-weight: 700; text-transform: uppercase; }
.course-panel dd { font-weight: 700; line-height: 1.35; margin-top: .2rem; }
.home-main {
  margin: 0 auto 4rem;
  max-width: 72rem;
  padding: 0 clamp(1rem, 3vw, 2.5rem);
}
.home-main h2 {
  font-family: Georgia, Cambria, "Times New Roman", serif;
  font-size: 2rem;
  line-height: 1.15;
}
.book-part {
  margin-top: 2rem;
}
.book-part-header {
  align-items: baseline;
  border-bottom: 1px solid var(--border);
  padding-bottom: .7rem;
}
.book-part-header h3 {
  font-family: Georgia, Cambria, "Times New Roman", serif;
  font-size: 1.45rem;
  line-height: 1.2;
  margin: 0;
}
.book-part-header a {
  color: var(--text);
  text-decoration-color: var(--accent);
  text-decoration-thickness: .08em;
  text-underline-offset: .16em;
}
.book-part-header a:hover {
  color: var(--accent-strong);
}
.chapter-grid {
  display: grid;
  gap: .85rem;
  grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
  list-style: none;
  margin: 1.5rem 0 0;
  padding: 0;
}
.chapter-grid a,
.chapter-grid .chapter-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-left: .35rem solid var(--accent);
  border-radius: .35rem;
  color: var(--text);
  display: block;
  min-height: 8rem;
  padding: 1rem;
  text-decoration: none;
}
.chapter-grid .is-unpublished .chapter-card {
  border-left-color: var(--border);
  color: var(--muted);
  cursor: default;
  opacity: .68;
}
.chapter-grid span {
  color: var(--muted);
  display: block;
  font-size: .85rem;
  font-weight: 700;
  margin-bottom: .5rem;
}
.chapter-grid strong {
  display: block;
  font-size: 1.2rem;
  line-height: 1.3;
}
.chapter-grid em {
  color: var(--muted);
  display: block;
  font-size: .85rem;
  font-style: normal;
  font-weight: 700;
  margin-top: .85rem;
}
.chapter-grid em:empty {
  display: none;
}
.book-shell {
  display: grid;
  gap: clamp(1rem, 3vw, 2rem);
  grid-template-columns: 18rem minmax(0, 48rem) 15rem;
  margin: 0 auto;
  max-width: 88rem;
  padding: 2rem clamp(1rem, 3vw, 2.5rem) 5rem;
}
.book-sidebar,
.local-toc {
  align-self: start;
  max-height: calc(100vh - 6rem);
  overflow: auto;
  position: sticky;
  top: 5rem;
}
.book-sidebar ol,
.local-toc ol {
  list-style: none;
  margin: 0;
  padding: 0;
}
.book-sidebar-part + .book-sidebar-part {
  margin-top: 1.2rem;
}
.book-sidebar h2 {
  color: var(--text);
  font-size: .9rem;
  line-height: 1.25;
  margin: 0 0 .2rem;
}
.book-sidebar-part > p {
  color: var(--muted);
  font-size: .78rem;
  line-height: 1.35;
  margin: 0 0 .5rem;
}
.book-sidebar a,
.book-sidebar-disabled {
  align-items: baseline;
  border-radius: .35rem;
  color: var(--text);
  display: grid;
  gap: .55rem;
  grid-template-columns: 1.6rem 1fr;
  line-height: 1.3;
  padding: .45rem .55rem;
  text-decoration: none;
}
.book-sidebar-disabled {
  color: var(--muted);
  opacity: .68;
}
.book-sidebar a[aria-current="page"] {
  background: var(--panel);
  box-shadow: inset 3px 0 0 var(--accent);
  font-weight: 800;
}
.book-sidebar a span,
.book-sidebar-disabled span {
  color: var(--muted);
  font-size: .8rem;
  font-weight: 800;
}
.book-sidebar .book-sidebar-part-link {
  grid-column: 1 / -1;
}
.local-toc a {
  color: var(--muted);
  display: block;
  font-size: .88rem;
  line-height: 1.35;
  padding: .25rem 0;
  text-decoration: none;
}
.local-toc .toc-level-3 { padding-left: .8rem; }
.chapter-main {
  min-width: 0;
}
.editor-panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-left: .35rem solid var(--accent);
  border-radius: .5rem;
  box-shadow: var(--shadow);
  display: grid;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1rem;
}
.editor-panel[hidden] {
  display: none;
}
.editor-panel h2 {
  font-family: Georgia, Cambria, "Times New Roman", serif;
  font-size: 1.35rem;
  line-height: 1.2;
  margin: 0;
}
.editor-panel p {
  color: var(--muted);
  font-size: .9rem;
  margin: .25rem 0 0;
}
.editor-panel textarea {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: .35rem;
  color: var(--text);
  font: .95rem/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  min-height: 32rem;
  padding: .8rem;
  resize: vertical;
  width: 100%;
}
.editor-panel .EasyMDEContainer {
  color: var(--text);
}
.editor-panel .EasyMDEContainer .CodeMirror {
  background: var(--bg);
  border-color: var(--border);
  color: var(--text);
  font: .95rem/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.editor-panel .EasyMDEContainer .CodeMirror-cursor {
  border-left-color: var(--text);
}
.editor-panel .EasyMDEContainer .CodeMirror-selected {
  background: color-mix(in srgb, var(--accent) 24%, transparent);
}
.editor-panel .editor-toolbar {
  background: var(--panel);
  border-color: var(--border);
  border-radius: .35rem .35rem 0 0;
}
.editor-panel .editor-toolbar button {
  color: var(--text) !important;
}
.editor-panel .editor-toolbar button:hover,
.editor-panel .editor-toolbar button.active {
  background: var(--bg);
  border-color: var(--border);
}
.editor-panel .editor-toolbar i.separator {
  border-left-color: var(--border);
  border-right-color: transparent;
}
.editor-panel .editor-preview,
.editor-panel .editor-preview-side {
  background: var(--panel);
  color: var(--text);
}
.editor-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: .75rem;
}
.editor-actions button {
  border: 1px solid var(--border);
  border-radius: .35rem;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  padding: .45rem .75rem;
}
.editor-actions button:first-child {
  background: var(--accent-strong);
  border-color: var(--accent-strong);
  color: var(--panel);
}
.editor-actions button:first-child:hover {
  background: var(--accent);
  border-color: var(--accent);
}
.editor-actions button:last-of-type {
  background: var(--panel);
  color: var(--text);
}
.editor-actions span {
  color: var(--muted);
  font-size: .9rem;
}
.comments-panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-left: .35rem solid var(--accent);
  border-radius: .5rem;
  box-shadow: var(--shadow);
  display: grid;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1rem;
}
.comments-panel[hidden] { display: none; }
.comments-panel-header {
  align-items: start;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}
.comments-panel h2 {
  font-family: Georgia, Cambria, "Times New Roman", serif;
  font-size: 1.35rem;
  line-height: 1.2;
  margin: 0;
}
.comments-panel p {
  color: var(--muted);
  font-size: .9rem;
  margin: .25rem 0 0;
}
.comments-panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  justify-content: flex-end;
}
.comments-panel button,
.paragraph-comment-form button {
  border: 1px solid var(--border);
  border-radius: .35rem;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  padding: .35rem .65rem;
}
.comments-panel button:first-child,
.paragraph-comment-form button:first-child {
  background: var(--accent-strong);
  border-color: var(--accent-strong);
  color: var(--panel);
}
.comments-panel button:first-child:hover,
.paragraph-comment-form button:first-child:hover {
  background: var(--accent);
  border-color: var(--accent);
}
.comment-thread {
  border-top: 1px solid var(--border);
  padding-top: .85rem;
}
.comment-thread + .comment-thread { margin-top: .85rem; }
.comment-thread h3 {
  font: 800 .82rem/1.3 system-ui, sans-serif;
  letter-spacing: .08em;
  margin: 0 0 .45rem;
  text-transform: uppercase;
}
.comment-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: .35rem;
  padding: .75rem;
}
.comment-card + .comment-card { margin-top: .5rem; }
.comment-card p {
  color: var(--text);
  font-size: .95rem;
  margin: .45rem 0 0;
  white-space: pre-wrap;
}
.comment-meta {
  color: var(--muted);
  display: flex;
  flex-wrap: wrap;
  gap: .35rem;
  font-size: .82rem;
}
.paragraph-comment-button {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--muted);
  cursor: pointer;
  display: none;
  font: 700 .75rem/1 system-ui, sans-serif;
  margin-left: .5rem;
  padding: .25rem .45rem;
  vertical-align: middle;
}
[data-comments-ready="true"] .paragraph-comment-button,
[data-comments-admin="true"] .paragraph-comment-button,
[data-comment-target]:hover .paragraph-comment-button,
.paragraph-comment-button.has-comments {
  display: inline-flex;
}
.paragraph-comment-button.has-comments {
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  border-color: var(--accent);
  color: var(--accent-strong);
}
.paragraph-comment-form {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: .35rem;
  display: grid;
  gap: .6rem;
  margin: .75rem 0 1rem;
  max-width: 68ch;
  padding: .75rem;
}
.paragraph-comment-form textarea {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: .35rem;
  color: var(--text);
  font: inherit;
  min-height: 7rem;
  padding: .6rem;
  resize: vertical;
  width: 100%;
}
.paragraph-comment-form div {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
}
.prose {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: .5rem;
  box-shadow: var(--shadow);
  padding: clamp(1.25rem, 4vw, 3rem);
}
.prose h1,
.prose h2,
.prose h3,
.prose h4 {
  font-family: Georgia, Cambria, "Times New Roman", serif;
  letter-spacing: 0;
  line-height: 1.2;
}
.prose h1 {
  border-top: .35rem solid var(--accent);
  font-size: clamp(2.2rem, 5vw, 4rem);
  margin: 0 0 1.5rem;
  padding-top: 1.2rem;
}
.prose h2 { font-size: 2rem; margin-top: 2.5rem; }
.prose h3 { font-size: 1.45rem; margin-top: 2rem; }
.prose p,
.prose li { max-width: 68ch; }
.prose img { max-width: 100%; }
.prose blockquote {
  border-left: .3rem solid var(--accent);
  color: var(--muted);
  margin-left: 0;
  padding-left: 1rem;
}
.prose pre {
  background: var(--code-bg);
  border-radius: .35rem;
  color: var(--code-text);
  overflow: auto;
  padding: 1rem;
}
.prose code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: .9em;
}
.heading-anchor {
  color: var(--muted);
  font-family: system-ui, sans-serif;
  font-size: .55em;
  margin-left: .35rem;
  opacity: .65;
  text-decoration: none;
}
.chapter-pagination {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 1rem;
}
.chapter-pagination a {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: .35rem;
  color: var(--text);
  display: block;
  line-height: 1.35;
  padding: .8rem;
  text-decoration: none;
}
.chapter-pagination a:last-child { text-align: right; }
.chapter-pagination span {
  color: var(--muted);
  display: block;
  font-size: .78rem;
  font-weight: 800;
  text-transform: uppercase;
}
@media (max-width: 76rem) {
  .book-shell { grid-template-columns: minmax(0, 1fr); }
  .book-sidebar,
  .local-toc {
    max-height: none;
    position: static;
  }
  .book-sidebar ol { columns: 2; }
  .local-toc { display: none; }
}
@media (max-width: 48rem) {
  body { font-size: 16px; }
  .site-header { grid-template-columns: 1fr; position: static; }
  .header-actions { justify-content: flex-start; }
  .site-header nav { flex-wrap: wrap; }
  .hero { grid-template-columns: 1fr; }
  .book-sidebar ol { columns: 1; }
  .chapter-pagination { grid-template-columns: 1fr; }
  .chapter-pagination a:last-child { text-align: left; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}`;
}

function themeScript() {
  return `const root = document.documentElement;
const picker = document.querySelector("[data-theme-picker]");
const storedTheme = localStorage.getItem("theme");
const fallbackTheme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
const activeTheme = storedTheme || fallbackTheme;

root.dataset.theme = activeTheme;
if (picker) {
  picker.value = activeTheme;
  picker.addEventListener("change", () => {
    root.dataset.theme = picker.value;
    localStorage.setItem("theme", picker.value);
  });
}`;
}

function commentsScript() {
  return `const commentsPanel = document.querySelector("[data-comments-panel]");

if (commentsPanel) {
  const chapterSlug = commentsPanel.dataset.chapterSlug;
  const status = commentsPanel.querySelector("[data-comments-status]");
  const list = commentsPanel.querySelector("[data-comments-list]");
  const loginButton = commentsPanel.querySelector("[data-comments-login]");
  const logoutButton = commentsPanel.querySelector("[data-comments-logout]");
  const commentButtons = Array.from(
    document.querySelectorAll("[data-comment-button]"),
  );
  let auth = { authenticated: false, admin: false };
  let comments = [];

  initComments();

  async function initComments() {
    try {
      auth = await fetchJson("/api/auth/status");
      commentsPanel.hidden = false;
      document.documentElement.dataset.commentsReady = auth.authenticated
        ? "true"
        : "false";
      document.documentElement.dataset.commentsAdmin = auth.admin ? "true" : "false";
      updateAuthControls();
      await loadComments();
      wireParagraphButtons();
    } catch {
      commentsPanel.hidden = true;
    }
  }

  function updateAuthControls() {
    if (auth.authenticated) {
      const name = auth.user?.login || "GitHub";
      setStatus(auth.admin ? \`Signed in as \${name}. Local resolution mode is available.\` : \`Signed in as \${name}. Select a paragraph to comment.\`);
      loginButton.hidden = true;
      logoutButton.hidden = false;
      return;
    }

    setStatus(auth.available === false ? "Feedback login is not configured yet." : "Sign in to comment on a paragraph.");
    loginButton.hidden = auth.available === false || !auth.loginUrl;
    logoutButton.hidden = true;
  }

  loginButton.addEventListener("click", () => {
    if (auth.loginUrl) {
      location.href = auth.loginUrl;
    }
  });

  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    location.reload();
  });

  async function loadComments() {
    comments = await fetchJson(\`/api/comments?chapter=\${encodeURIComponent(chapterSlug)}\`);
    renderCommentList();
    updateParagraphBadges();
  }

  function wireParagraphButtons() {
    for (const button of commentButtons) {
      button.addEventListener("click", () => {
        const paragraphId = button.dataset.commentButton;

        if (!auth.authenticated && !auth.admin) {
          commentsPanel.scrollIntoView({ block: "start" });
          setStatus("Sign in with GitHub before commenting.");
          return;
        }

        openForm(paragraphId);
      });
    }
  }

  function openForm(paragraphId) {
    document.querySelector("[data-comment-form]")?.remove();
    const paragraph = document.querySelector(\`[data-comment-target="\${cssEscape(paragraphId)}"]\`);

    if (!paragraph) {
      return;
    }

    const form = document.createElement("form");
    form.className = "paragraph-comment-form";
    form.dataset.commentForm = paragraphId;
    form.innerHTML = \`
      <textarea name="body" required maxlength="4000" aria-label="Comment text"></textarea>
      <div>
        <button type="submit">Post comment</button>
        <button type="button" data-comment-cancel>Cancel</button>
      </div>
    \`;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const textarea = form.elements.body;
      const body = textarea.value.trim();

      if (!body) {
        return;
      }

      form.querySelector("button").disabled = true;

      try {
        await fetchJson("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chapter: chapterSlug, paragraphId, body }),
        });
        form.remove();
        await loadComments();
        setStatus("Comment posted.");
      } catch (error) {
        setStatus(error.message);
        form.querySelector("button").disabled = false;
      }
    });

    form.querySelector("[data-comment-cancel]").addEventListener("click", () => {
      form.remove();
    });

    paragraph.insertAdjacentElement("afterend", form);
    form.elements.body.focus();
  }

  function renderCommentList() {
    const visibleComments = comments.filter((comment) => !comment.resolvedAt);
    list.innerHTML = "";

    if (!visibleComments.length) {
      return;
    }

    const byParagraph = Map.groupBy
      ? Map.groupBy(visibleComments, (comment) => comment.paragraphId)
      : groupByParagraph(visibleComments);

    for (const [paragraphId, threadComments] of byParagraph) {
      const thread = document.createElement("section");
      thread.className = "comment-thread";
      const anchor = document.createElement("a");
      anchor.href = \`#\${paragraphId}\`;
      anchor.textContent = paragraphLabel(paragraphId);
      const title = document.createElement("h3");
      title.append(anchor);
      thread.append(title);

      for (const comment of threadComments) {
        const card = document.createElement("article");
        card.className = "comment-card";
        card.innerHTML = \`
          <div class="comment-meta">
            <strong></strong>
            <span></span>
          </div>
          <p></p>
        \`;
        card.querySelector("strong").textContent = comment.author?.login || "GitHub user";
        card.querySelector("span").textContent = new Date(comment.createdAt).toLocaleString();
        card.querySelector("p").textContent = comment.body;

        if (auth.admin) {
          const resolve = document.createElement("button");
          resolve.type = "button";
          resolve.textContent = "Resolve";
          resolve.addEventListener("click", () => resolveComment(comment.id));
          card.append(resolve);
        }

        thread.append(card);
      }

      list.append(thread);
    }
  }

  async function resolveComment(id) {
    await fetchJson(\`/api/comments/\${encodeURIComponent(id)}/resolve\`, {
      method: "POST",
    });
    await loadComments();
    setStatus("Comment resolved.");
  }

  function updateParagraphBadges() {
    const counts = comments
      .filter((comment) => !comment.resolvedAt)
      .reduce((result, comment) => {
        result.set(comment.paragraphId, (result.get(comment.paragraphId) || 0) + 1);
        return result;
      }, new Map());

    for (const button of commentButtons) {
      const count = counts.get(button.dataset.commentButton) || 0;
      button.classList.toggle("has-comments", count > 0);
      button.textContent = count > 0 ? \`Comment (\${count})\` : "Comment";
    }
  }

  function groupByParagraph(items) {
    const grouped = new Map();

    for (const item of items) {
      const group = grouped.get(item.paragraphId) || [];
      group.push(item);
      grouped.set(item.paragraphId, group);
    }

    return grouped;
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  function paragraphLabel(paragraphId) {
    return \`Paragraph \${commentButtons.findIndex((button) => button.dataset.commentButton === paragraphId) + 1}\`;
  }

  function cssEscape(value) {
    return window.CSS?.escape ? CSS.escape(value) : value.replace(/"/g, "\\\\\\"");
  }

  function setStatus(message) {
    status.textContent = message;
  }
}`;
}

function editorScript() {
  return `const editor = document.querySelector("[data-editor]");
const toggle = document.querySelector("[data-editor-toggle]");

if (editor && toggle) {
  const textarea = editor.querySelector("[data-editor-source]");
  const save = editor.querySelector("[data-editor-save]");
  const cancel = editor.querySelector("[data-editor-cancel]");
  const status = editor.querySelector("[data-editor-status]");
  const slug = editor.dataset.chapterSlug;
  let markdownEditor;
  let originalSource = "";

  fetch("/api/editor/status")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Editor API unavailable");
      }

      return response.json();
    })
    .then(() => {
      toggle.hidden = false;
    })
    .catch(() => {});

  toggle.addEventListener("click", async () => {
    if (editor.hidden) {
      await loadSource();
      editor.hidden = false;
      toggle.textContent = "Hide editor";
      getEditor().codemirror.focus();
      return;
    }

    editor.hidden = true;
    toggle.textContent = "Edit";
  });

  cancel.addEventListener("click", () => {
    setEditorValue(originalSource);
    editor.hidden = true;
    toggle.textContent = "Edit";
    setStatus("Changes discarded.");
  });

  save.addEventListener("click", async () => {
    setStatus("Saving...");
    save.disabled = true;

    try {
      const response = await fetch(\`/api/chapters/\${slug}\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: getEditorValue() }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Save failed");
      }

      originalSource = getEditorValue();
      setStatus("Saved. Reloading...");
      location.reload();
    } catch (error) {
      setStatus(error.message);
      save.disabled = false;
    }
  });

  async function loadSource() {
    if (originalSource) {
      return;
    }

    setStatus("Loading Markdown...");
    const response = await fetch(\`/api/chapters/\${slug}\`);

    if (!response.ok) {
      throw new Error("Unable to load chapter source");
    }

    const data = await response.json();
    originalSource = data.content;
    setEditorValue(data.content);
    setStatus(\`Editing \${data.file}\`);
  }

  function getEditor() {
    if (!markdownEditor && window.EasyMDE) {
      markdownEditor = new EasyMDE({
        element: textarea,
        autofocus: false,
        autosave: {
          enabled: true,
          uniqueId: \`chapter-\${slug}\`,
          delay: 1000,
        },
        minHeight: "32rem",
        nativeSpellcheck: true,
        previewClass: ["editor-preview", "prose"],
        renderingConfig: {
          codeSyntaxHighlighting: true,
        },
        sideBySideFullscreen: false,
        status: false,
        toolbar: [
          "bold",
          "italic",
          "heading",
          "|",
          "quote",
          "unordered-list",
          "ordered-list",
          "|",
          "link",
          "code",
          "table",
          "|",
          "preview",
          "side-by-side",
          "fullscreen",
          "|",
          "guide",
        ],
      });
    }

    return markdownEditor;
  }

  function getEditorValue() {
    return markdownEditor ? markdownEditor.value() : textarea.value;
  }

  function setEditorValue(value) {
    textarea.value = value;

    if (window.EasyMDE) {
      getEditor().value(value);
    }
  }

  function setStatus(message) {
    status.textContent = message;
  }
}`;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stableParagraphId(value) {
  const text = stripHtml(value).toLowerCase().replace(/\s+/g, " ").trim();
  const readable =
    slugify(text).split("-").slice(0, 8).join("-") || "paragraph";

  return `p-${readable}-${hashString(text)}`;
}

function hashString(value) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36);
}

function titleFromFilename(file) {
  return path
    .basename(file, ".md")
    .replace(/^\d+_/, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function chapterNumberFromFilename(file) {
  const match = path.basename(file).match(/^(\d+)_/);

  return match ? String(Number(match[1])) : "";
}

function getSectionNumber(depth, chapter, counters) {
  if (depth < 2) {
    return "";
  }

  const sectionDepth = depth - 2;
  counters[sectionDepth] = (counters[sectionDepth] || 0) + 1;
  counters.length = sectionDepth + 1;

  return [chapter.number, ...counters].join(".");
}

function stripHtml(value) {
  return value.replace(/<[^>]*>/g, "");
}

function stripHeadingNumber(value) {
  return value.replace(/^\d+(?:\.\d+)+\s+/, "");
}

function decodeHtmlEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function parseJsonc(source) {
  return JSON.parse(stripTrailingCommas(stripJsonComments(source)));
}

function stripJsonComments(source) {
  let output = "";
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    const next = source[index + 1];

    if (inString) {
      output += char;

      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }

      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (index < source.length && source[index] !== "\n") {
        index++;
      }
      output += "\n";
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;
      while (
        index < source.length &&
        !(source[index] === "*" && source[index + 1] === "/")
      ) {
        output += source[index] === "\n" ? "\n" : " ";
        index++;
      }
      index++;
      continue;
    }

    output += char;
  }

  return output;
}

function stripTrailingCommas(source) {
  let output = "";
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let index = 0; index < source.length; index++) {
    const char = source[index];

    if (inString) {
      output += char;

      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }

      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      output += char;
      continue;
    }

    if (char === ",") {
      let nextIndex = index + 1;

      while (/\s/.test(source[nextIndex] || "")) {
        nextIndex++;
      }

      if (source[nextIndex] === "]" || source[nextIndex] === "}") {
        continue;
      }
    }

    output += char;
  }

  return output;
}
