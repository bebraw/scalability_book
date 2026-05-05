import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
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

const allChapterFiles = await getAllChapterFiles();
const publishedChapterFiles = includeAllChapters
  ? allChapterFiles
  : config.chapters;
const publishedChapterSet = new Set(publishedChapterFiles);
const chapters = await Promise.all(
  publishedChapterFiles.map((file, index) => getChapter(file, index)),
);
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
    };
  }),
);

for (let index = 0; index < chapters.length; index++) {
  const chapter = chapters[index];
  const rendered = renderMarkdown(chapter.source, chapter);
  const previous = chapters[index - 1];
  const next = chapters[index + 1];
  await writePage(
    `chapters/${chapter.slug}/index.html`,
    renderLayout({
      title: `${chapter.title} - ${config.title}`,
      description: config.description,
      currentUrl: chapter.url,
      stylesheets: ["/vendor/easymde/easymde.min.css"],
      scripts: ["/vendor/easymde/easymde.min.js", "/editor.js"],
      children: renderChapter({ chapter, rendered, previous, next }),
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
await copyEditorAssets();

async function writePage(relativePath, content) {
  const outputPath = path.join(buildDir, relativePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content, "utf8");
}

async function getAllChapterFiles() {
  const entries = await readdir(path.join(root, "chapters"));

  return entries
    .filter((entry) => entry.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((entry) => `chapters/${entry}`);
}

async function getChapter(file, index) {
  const source = await readFile(path.join(root, file), "utf8");
  const fallbackTitle = titleFromFilename(file);
  const firstHeading = source.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const title = firstHeading || fallbackTitle;
  const slug =
    index === 0
      ? "introduction"
      : path.basename(file, ".md").replace(/^\d+_/, "").replaceAll("_", "-");

  return {
    file,
    index,
    number: index === 0 ? "0" : String(index),
    slug,
    url: `/chapters/${slug}/`,
    title,
    source,
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

  return {
    content: marked(source, { renderer }),
    tableOfContents,
  };
}

function renderHome() {
  const firstChapter = chapters[0];

  return renderHtmlisp(templates.siteIndex, {
    title: config.title,
    description: config.description,
    course: config.course,
    firstChapterUrl: firstChapter.url,
    chapters: indexChapters.map((chapter) => ({
      ...chapter,
      label: `Chapter ${chapter.number}`,
    })),
  });
}

function renderChapter({ chapter, rendered, previous, next }) {
  return renderHtmlisp(templates.bookPage, {
    bookSidebar: renderBookSidebar(chapter),
    chapterFile: chapter.file,
    chapterLabel: `Chapter ${chapter.number}`,
    chapterSlug: chapter.slug,
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
    chapters: chapters.map((chapter) => ({
      ...chapter,
      ariaCurrent: chapter.slug === currentChapter.slug ? "page" : null,
    })),
  });
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
  display: grid;
  gap: 2rem;
  grid-template-columns: minmax(0, 1fr) 22rem;
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
.course-panel {
  align-self: end;
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
.chapter-grid {
  display: grid;
  gap: .85rem;
  grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
  list-style: none;
  margin: 1.5rem 0 0;
  padding: 0;
}
.chapter-grid a {
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
.chapter-grid .is-unpublished a {
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
  text-transform: uppercase;
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
.book-sidebar a {
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
.book-sidebar a[aria-current="page"] {
  background: var(--panel);
  box-shadow: inset 3px 0 0 var(--accent);
  font-weight: 800;
}
.book-sidebar span {
  color: var(--muted);
  font-size: .8rem;
  font-weight: 800;
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

function titleFromFilename(file) {
  return path
    .basename(file, ".md")
    .replace(/^\d+_/, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
