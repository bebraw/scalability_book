// @ts-nocheck
import { spawn } from "node:child_process";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { renderMarkdown } from "./lib/markdown.ts";

const root = process.cwd();
const buildDir = path.join(root, "build");
const tempDir = path.join(root, "tmp", "pdfs");
const outputDir = path.join(root, "output", "pdf");
const outputPath = path.join(
  outputDir,
  "elements-of-scalable-web-development.pdf",
);
const website = "https://scalableweb.dev";

const groups = [
  {
    label: "Front matter",
    entries: [
      entry(
        "Introduction",
        "chapters/introduction",
        "build/chapters/introduction/index.html",
      ),
    ],
  },
  {
    label: "Part I - Establish",
    entries: [
      entry(
        "Establish - Build and measure a baseline",
        "parts/establish",
        "build/parts/establish/index.html",
        "part",
      ),
      entry(
        "1. What does scalability mean for web development?",
        "chapters/what-is-scalability",
        "build/chapters/what-is-scalability/index.html",
      ),
      entry(
        "2. How can coding agents support scalable development?",
        "chapters/scalable-development",
        "build/chapters/scalable-development/index.html",
      ),
      entry(
        "3. How can we measure web applications and development workflows?",
        "chapters/benchmarking",
        "build/chapters/benchmarking/index.html",
      ),
    ],
  },
  {
    label: "Part II - Challenge",
    entries: [
      entry(
        "Challenge - Expose architectural assumptions",
        "parts/challenge",
        "build/parts/challenge/index.html",
        "part",
      ),
      entry(
        "4. How does web architecture shape scalability?",
        "chapters/architecture",
        "build/chapters/architecture/index.html",
      ),
      entry(
        "5. How does development friction limit web projects?",
        "chapters/friction",
        "build/chapters/friction/index.html",
      ),
      entry(
        "6. Which web application assumptions fail under pressure?",
        "chapters/reality",
        "build/chapters/reality/index.html",
      ),
    ],
  },
  {
    label: "Part III - Compare",
    entries: [
      entry(
        "Compare - Evaluate workflows and scaling responses",
        "parts/compare",
        "build/parts/compare/index.html",
        "part",
      ),
      entry(
        "7. When do agent fleets improve web development?",
        "chapters/agent-fleets",
        "build/chapters/agent-fleets/index.html",
      ),
      entry(
        "8. How should web applications respond to scaling pressure?",
        "chapters/scaling",
        "build/chapters/scaling/index.html",
      ),
      entry(
        "9. What do three agent-assisted implementations teach us?",
        "chapters/recap",
        "build/chapters/recap/index.html",
      ),
    ],
  },
  {
    label: "Appendices",
    entries: [
      entry(
        "Appendices",
        "parts/appendices",
        "build/parts/appendices/index.html",
        "part",
      ),
      entry(
        "A. Evaluating agentic development workflows",
        "appendices/evaluating-agentic-workflows",
        "build/appendices/evaluating-agentic-workflows/index.html",
      ),
      entry(
        "B. Reproducible development environments",
        "appendices/reproducible-environments",
        "build/appendices/reproducible-environments/index.html",
      ),
      entry(
        "C. Advanced control boundaries in web applications",
        "appendices/advanced-web-boundaries",
        "build/appendices/advanced-web-boundaries/index.html",
      ),
      entry(
        "D. Agent-system security, control, and traceability",
        "appendices/agent-system-security",
        "build/appendices/agent-system-security/index.html",
      ),
      entry(
        "E. Formal scalability and reliability models",
        "appendices/scalability-models",
        "build/appendices/scalability-models/index.html",
      ),
      entry(
        "F. Durable workflows and retry-safe effects",
        "appendices/durable-workflows",
        "build/appendices/durable-workflows/index.html",
      ),
    ],
  },
  {
    label: "Case studies",
    divider: true,
    entries: [
      entry(
        "Slideotter - Learning faster than the product converged",
        "case-studies/slideotter",
        "build/case-studies/slideotter/index.html",
      ),
      entry(
        "Thesis Journey Tracker - Shipping by constraining the problem",
        "case-studies/thesis-journey-tracker",
        "build/case-studies/thesis-journey-tracker/index.html",
      ),
      entry(
        "Kirjolab - When code production scaled faster than architecture",
        "case-studies/kirjolab",
        "build/case-studies/kirjolab/index.html",
      ),
      entry(
        "Webernetes - Compatibility through source mapping and shared tests",
        "case-studies/webernetes",
        "build/case-studies/webernetes/index.html",
      ),
      entry(
        "Modern Web Guidance - Keeping web-platform advice current",
        "case-studies/modern-web-guidance",
        "build/case-studies/modern-web-guidance/index.html",
      ),
      entry(
        "Temper - Contracts, verification, and bounded autonomy",
        "case-studies/temper",
        "build/case-studies/temper/index.html",
      ),
    ],
  },
  {
    label: "Course project guide",
    divider: true,
    entries: [
      entry(
        "Course project introduction",
        "project/introduction",
        "build/project/introduction/index.html",
      ),
      entry(
        "Common project specification",
        "project",
        "build/project/index.html",
      ),
      entry(
        "Establish project",
        "project/establish",
        "build/project/establish/index.html",
      ),
      entry(
        "Challenge project",
        "project/challenge",
        "build/project/challenge/index.html",
      ),
      entry(
        "Compare project",
        "project/compare",
        "build/project/compare/index.html",
      ),
      markdownEntry(
        "Course development environments",
        "course-development-environments",
        "specifications/course_environment.md",
      ),
      markdownEntry(
        "Course assessment rubric",
        "course-assessment-rubric",
        "specifications/grading.md",
      ),
    ],
  },
];

function entry(title, key, file, kind = "chapter") {
  return { file, key, kind, title, url: `${website}/${key}/` };
}

function markdownEntry(title, key, file) {
  return { file, key, kind: "supplement", title, url: "" };
}

async function main() {
  await rm(tempDir, { force: true, recursive: true });
  await mkdir(tempDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });

  try {
    await run(process.execPath, [path.join(root, "scripts", "build-site.ts")]);

    const documents = [];
    for (const group of groups) {
      for (const item of group.entries) {
        documents.push({ ...item, content: await readContent(item) });
      }
    }

    const coverSvg = await readFile(
      path.join(buildDir, "assets", "book-cover.svg"),
      "utf8",
    );
    const figureCss = await readFile(
      path.join(root, "site", "styles", "figures.css"),
      "utf8",
    );
    const bodyHtml = renderBody(groups, documents, coverSvg, figureCss);
    const bodyHtmlPath = path.join(tempDir, "body.html");
    const mergedPdfPath = path.join(tempDir, "book.pdf");
    await writeFile(bodyHtmlPath, bodyHtml);

    const browser = await chromium.launch({ headless: true });
    try {
      await printBody(browser, bodyHtmlPath, mergedPdfPath);
    } finally {
      await browser.close();
    }

    await rename(mergedPdfPath, outputPath);
    process.stdout.write(`PDF written to ${path.relative(root, outputPath)}\n`);
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
}

async function readContent(item) {
  const source = await readFile(path.join(root, item.file), "utf8");
  if (item.kind === "supplement") {
    return renderMarkdown(source, { number: "" }).content;
  }

  const opening = source.match(
    /<article\b[^>]*class="[^"]*\bprose\b[^"]*"[^>]*>/i,
  );
  const closingIndex = source.lastIndexOf("</article>");
  if (!opening || opening.index === undefined || closingIndex === -1) {
    throw new Error(`Could not find article content in ${item.file}`);
  }
  return source.slice(opening.index + opening[0].length, closingIndex);
}

async function printBody(browser, htmlPath, pdfPath) {
  const page = await browser.newPage({
    viewport: { height: 1200, width: 900 },
  });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
  await page.evaluate((siteUrl) => {
    for (const article of document.querySelectorAll(".document")) {
      const prefix = article.getAttribute("data-key");
      const ids = new Map();
      for (const element of article.querySelectorAll("[id]")) {
        const oldId = element.id;
        const nextId = `${prefix}-${oldId}`;
        ids.set(oldId, nextId);
        element.id = nextId;
      }
      for (const link of article.querySelectorAll('a[href^="#"]')) {
        const target = link.getAttribute("href").slice(1);
        if (ids.has(target)) link.setAttribute("href", `#${ids.get(target)}`);
      }
      for (const element of article.querySelectorAll(
        "svg, svg *, [aria-labelledby], [aria-describedby]",
      )) {
        for (const attribute of ["aria-labelledby", "aria-describedby"]) {
          const references = element.getAttribute(attribute);
          if (references)
            element.setAttribute(
              attribute,
              references
                .split(/\s+/)
                .map((id) => ids.get(id) || id)
                .join(" "),
            );
        }
        for (const attribute of [
          "marker-start",
          "marker-mid",
          "marker-end",
          "clip-path",
          "mask",
          "filter",
          "fill",
          "stroke",
        ]) {
          const reference = element
            .getAttribute(attribute)
            ?.match(/^url\(#(.+)\)$/);
          if (reference && ids.has(reference[1]))
            element.setAttribute(attribute, `url(#${ids.get(reference[1])})`);
        }
      }
    }

    for (const demo of document.querySelectorAll(
      "[data-demo-anchor], .concept-index",
    )) {
      const article = demo.closest(".document");
      const concepts = demo.matches(".concept-index");
      const conceptHref = demo
        .querySelector(".concept-reference-link")
        ?.getAttribute("href");
      const url =
        concepts && conceptHref
          ? new URL(conceptHref, siteUrl).href
          : article?.getAttribute("data-url") || siteUrl;
      const callout = document.createElement("aside");
      callout.className = "interactive-note";
      const title = document.createElement("strong");
      title.textContent = concepts ? "Concept connections" : "Interactive lab";
      const description = document.createElement("span");
      description.textContent = concepts
        ? "Explore definitions and connections in the web edition."
        : "This activity is available in the web edition.";
      const link = document.createElement("a");
      link.href = url;
      link.textContent = concepts
        ? "Explore this reading's concepts"
        : url.replace(/^https:\/\//, "");
      callout.append(title, description, link);
      demo.replaceWith(callout);
    }

    document
      .querySelectorAll(
        ".paragraph-feedback-actions, .heading-anchor, .table-anchor, .figure-anchor",
      )
      .forEach((element) => element.remove());
    for (const link of document.querySelectorAll('a[href^="/"]')) {
      link.href = `${siteUrl}${link.getAttribute("href")}`;
    }
    for (const detail of document.querySelectorAll("details"))
      detail.open = true;
  }, website);
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    outline: true,
    path: pdfPath,
    preferCSSPageSize: true,
    printBackground: true,
    tagged: true,
  });
  await page.close();
}

function renderBody(groupDefinitions, documents, coverSvg, figureCss) {
  const documentsByKey = new Map(documents.map((item) => [item.key, item]));
  const toc = groupDefinitions
    .map(
      (group) => `<section class="toc-group">
        <h2>${escapeHtml(group.label)}</h2>
        <ol>${group.entries
          .map(
            (item) =>
              `<li class="toc-${item.kind}"><a href="#doc-${escapeAttribute(item.key)}">${escapeHtml(item.title)}</a></li>`,
          )
          .join("")}</ol>
      </section>`,
    )
    .join("");

  const content = groupDefinitions
    .map((group) => {
      const divider = group.divider
        ? `<section class="section-divider document" data-key="divider-${escapeAttribute(group.label.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}" data-url="">
            <p>Elements of Scalable Web Development</p>
            <h1>${escapeHtml(group.label)}</h1>
          </section>`
        : "";
      return `${divider}${group.entries
        .map((item) => {
          const document = documentsByKey.get(item.key);
          return `<article class="document ${escapeAttribute(item.kind)}" data-key="${escapeAttribute(item.key.replace(/[^a-z0-9]+/g, "-"))}" data-url="${escapeAttribute(item.url)}" id="doc-${escapeAttribute(item.key)}">
              ${document.content}
            </article>`;
        })
        .join("")}`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Elements of Scalable Web Development</title>
    <style>${figureCss}\n${printCss}</style>
  </head>
  <body>
    <section class="cover-page" aria-label="Book cover">${coverSvg}</section>
    <section class="title-page">
      <p class="eyebrow">Aalto University course book</p>
      <h1>Elements of<br>Scalable<br>Web Development</h1>
      <p class="subtitle">Architecture, measurement, scaling pressure, and agentic workflows</p>
      <div class="title-meta">
        <strong>Juho Vepsäläinen</strong>
        <span>Travel edition - 5 October 2026</span>
        <a href="${website}">scalableweb.dev</a>
      </div>
    </section>
    <nav class="contents" aria-label="Contents">
      <p class="eyebrow">Reader's map</p>
      <h1>Contents</h1>
      <p>This edition includes the core book, appendices, case studies, and the course project guide. Interactive activities link to the web edition.</p>
      <div class="toc-grid">${toc}</div>
    </nav>
    <main>${content}</main>
  </body>
</html>`;
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

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with status ${code}`));
    });
  });
}

const printCss = String.raw`
  @page {
    size: 7.5in 10in;
    margin: 0.7in 0.66in 0.72in;

    @bottom-right {
      color: #61716b;
      content: counter(page);
      font: 8px Arial, sans-serif;
    }
  }

  @page cover {
    margin: 0;

    @bottom-right { content: none; }
  }

  :root {
    --text: #17201d;
    --muted: #52635d;
    --panel: #f6f8f7;
    --bg: #fff;
    --border: #aab8b3;
    --accent: #0f766e;
    --accent-strong: #0b6f67;
    --font-ui: Arial, Helvetica, sans-serif;
    --font-serif: Georgia, Cambria, "Times New Roman", serif;
    color: #17201d;
    font-family: Georgia, Cambria, "Times New Roman", serif;
    font-size: 10.7pt;
    line-height: 1.48;
  }

  * { box-sizing: border-box; }
  html { background: #fff; }
  body { margin: 0; }
  main { display: block; }

  .cover-page {
    break-after: page;
    height: 10in;
    overflow: hidden;
    page: cover;
    width: 7.5in;
  }
  .cover-page svg { display: block; height: 10in; width: 7.5in; }

  a { color: #0b6f67; text-decoration-color: #8dbab5; text-underline-offset: 0.12em; }
  p, li { orphans: 3; widows: 3; }
  p { margin: 0.54em 0; }
  li + li { margin-top: 0.2em; }
  ul, ol { margin: 0.55em 0; padding-left: 1.35em; }
  h1, h2, h3, h4 { color: #17201d; font-family: Arial, Helvetica, sans-serif; line-height: 1.14; }
  h1 { font-size: 25pt; letter-spacing: -0.025em; margin: 0 0 0.5em; }
  h2 { break-after: avoid; font-size: 17pt; letter-spacing: -0.015em; margin: 1.45em 0 0.48em; }
  h3 { break-after: avoid; font-size: 13.2pt; margin: 1.25em 0 0.42em; }
  h4 { break-after: avoid; font-size: 11.2pt; margin: 1.05em 0 0.35em; }
  h2 + p, h3 + p, h4 + p { break-before: avoid; }
  strong { font-weight: 700; }
  code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  code { background: #edf2ef; border-radius: 0.18em; font-size: 0.86em; padding: 0.08em 0.22em; }
  pre { background: #17201d; border-radius: 0.28em; color: #f4f7f5; font-size: 7.8pt; line-height: 1.42; margin: 0.85em 0; overflow-wrap: anywhere; padding: 0.75em 0.9em; white-space: pre-wrap; }
  pre code { background: transparent; color: inherit; padding: 0; }
  blockquote { border-left: 3px solid #0f766e; color: #3f4f49; margin: 0.9em 0; padding: 0.12em 0 0.12em 0.9em; }
  hr { border: 0; border-top: 1px solid #b8c6c1; margin: 1.4em 0; }
  img, svg { height: auto; max-width: 100%; }
  figure { break-inside: avoid; margin: 1em 0; }
  .book-diagram-figure { inline-size: 100%; margin: 1em 0; max-width: 100%; }
  .book-diagram-canvas { background: #f6f8f7; overflow: visible; padding: 0.5em; }
  figcaption, caption { color: #52635d; font-size: 8.6pt; line-height: 1.35; }
  table { border-collapse: collapse; font-family: Arial, Helvetica, sans-serif; font-size: 7.75pt; line-height: 1.3; margin: 0.9em 0; width: 100%; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  th, td { border: 0.5px solid #aab8b3; padding: 0.36em 0.44em; text-align: left; vertical-align: top; }
  th { background: #e5eeea; font-weight: 700; }
  tbody tr:nth-child(even) td { background: #f6f8f7; }
  details { border: 1px solid #c7d2ce; border-radius: 0.3em; break-inside: avoid; margin: 0.8em 0; padding: 0.55em 0.7em; }
  summary { font-family: Arial, Helvetica, sans-serif; font-weight: 700; }

  .title-page {
    break-after: page;
    display: flex;
    flex-direction: column;
    min-height: 8.45in;
    padding-top: 0.45in;
  }
  .title-page .eyebrow, .contents .eyebrow, .section-divider p, .chapter-kicker {
    color: #0f766e;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 8.5pt;
    font-weight: 700;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }
  .title-page h1 { font-size: 42pt; line-height: 0.98; margin: 0.45in 0 0; }
  .title-page .subtitle { border-top: 7px solid #0f766e; font-size: 16pt; line-height: 1.3; margin-top: 0.42in; padding-top: 0.25in; width: 78%; }
  .title-meta { display: flex; flex-direction: column; font-family: Arial, Helvetica, sans-serif; gap: 0.12em; margin-top: auto; }
  .title-meta strong { font-size: 16pt; }
  .title-meta span, .title-meta a { font-size: 9pt; }

  .contents { break-after: page; }
  .contents > h1 { font-size: 32pt; margin-bottom: 0.25em; }
  .contents > p:not(.eyebrow) { color: #4e5f59; font-size: 9.5pt; margin-bottom: 1.2em; max-width: 36em; }
  .toc-grid { column-count: 2; column-gap: 0.42in; }
  .toc-group { break-inside: avoid; margin: 0 0 0.85em; }
  .toc-group h2 { border-bottom: 1px solid #a8b9b3; color: #0b6f67; font-size: 10.5pt; margin: 0 0 0.28em; padding-bottom: 0.2em; }
  .toc-group ol { list-style: none; margin: 0; padding: 0; }
  .toc-group li { font-family: Arial, Helvetica, sans-serif; font-size: 7.8pt; line-height: 1.3; margin: 0 0 0.25em; }
  .toc-group a { color: #17201d; text-decoration: none; }
  .toc-part a { font-weight: 700; }

  .document { break-before: page; }
  .document > :first-child { margin-top: 0; }
  .document > .chapter-kicker + h1 { margin-top: 0.12em; }
  .part { border-top: 8px solid #0f766e; padding-top: 0.28in; }
  .part > h1 { font-size: 34pt; }
  .part > .chapter-kicker { margin-top: 0; }
  .supplement { border-top: 5px solid #0f766e; padding-top: 0.2in; }

  .section-divider {
    align-items: flex-start;
    background: #17201d;
    color: #fff;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    margin: -0.7in -0.66in -0.72in;
    min-height: 10in;
    padding: 0.75in 0.66in;
  }
  .section-divider h1 { color: #fff; font-size: 39pt; margin: 0.15em 0 0; max-width: 5.5in; }
  .section-divider p { color: #5dd5c8; }

  .interactive-note {
    background: #edf5f2;
    border-left: 4px solid #0f766e;
    break-inside: avoid;
    display: grid;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 8.5pt;
    gap: 0.08em;
    margin: 0.85em 0;
    padding: 0.62em 0.75em;
  }
  .interactive-note strong { color: #0b6f67; font-size: 9pt; }
  .interactive-note a { overflow-wrap: anywhere; }

  .paragraph-feedback-actions, .heading-anchor, .table-anchor, .figure-anchor { display: none !important; }
  [data-comment-target] { scroll-margin-top: 0; }
`;

await main();
