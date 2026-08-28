// @ts-nocheck
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { renderMarkdown } from "./lib/markdown.ts";

const root = process.cwd();
const sourceDir = path.join(root, "slides");
const tempDir = path.join(root, "tmp", "pdfs", "lectures");
const outputDir = path.join(root, "output", "pdf", "lectures");

async function main() {
  await rm(tempDir, { force: true, recursive: true });
  await mkdir(tempDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });

  try {
    const sources = (await readdir(sourceDir))
      .filter((filename) => /^lecture-\d{2}-.+\.md$/.test(filename))
      .sort();

    if (sources.length !== 9) {
      throw new Error(`Expected 9 lecture decks, found ${sources.length}`);
    }

    const browser = await chromium.launch({ headless: true });
    try {
      for (const filename of sources) {
        const source = await readFile(path.join(sourceDir, filename), "utf8");
        const { body, metadata } = parseFrontmatter(source);
        const lectureNumber = filename.match(/^lecture-(\d{2})-/)?.[1] || "";
        const slideSources = body
          .split(/^---$/gm)
          .map((slide) => slide.trim())
          .filter(Boolean);
        const slides = slideSources.map(
          (slideSource, index) =>
            `<section class="slide ${index === 0 ? "slide--title" : "slide--content"}" data-slide-number="${index + 1}">
              <div class="slide-chrome">
                <span>Elements of Scalable Web Development</span>
                <span>Lecture ${Number(lectureNumber)}</span>
              </div>
              <div class="slide-body">${renderMarkdown(stripSourceComments(slideSource), { number: "" }).content}</div>
              <div class="slide-footer">${index + 1} / ${slideSources.length}</div>
            </section>`,
        );
        const html = renderDeckHtml(
          metadata.title || filename,
          slides.join(""),
        );
        const htmlPath = path.join(tempDir, filename.replace(/\.md$/, ".html"));
        const pdfPath = path.join(outputDir, filename.replace(/\.md$/, ".pdf"));
        await writeFile(htmlPath, html);

        const page = await browser.newPage({
          viewport: { height: 720, width: 1280 },
        });
        await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
        await page.evaluate(() => {
          document
            .querySelectorAll(
              ".paragraph-feedback-actions, .heading-anchor, .table-anchor, .figure-anchor",
            )
            .forEach((element) => element.remove());
        });
        await page.emulateMedia({ media: "print" });
        await page.pdf({
          outline: true,
          path: pdfPath,
          preferCSSPageSize: true,
          printBackground: true,
          tagged: true,
        });
        await page.close();
        process.stdout.write(
          `${path.relative(root, pdfPath)} (${slideSources.length} slides)\n`,
        );
      }
    } finally {
      await browser.close();
    }
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
}

function stripSourceComments(source) {
  return source.replace(/<!--\s*\[Sources\][\s\S]*?-->/g, "").trim();
}

function parseFrontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { body: source, metadata: {} };

  const metadata = {};
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^"|"$/g, "");
    metadata[key] = value;
  }
  return { body: match[2], metadata };
}

function renderDeckHtml(title, slides) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>${slideCss}</style>
  </head>
  <body>${slides}</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const slideCss = String.raw`
  @page { size: 13.333333in 7.5in; margin: 0; }

  :root {
    color: #17201d;
    font-family: "Helvetica Neue", Arial, sans-serif;
  }

  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { background: #dfe5e2; }

  .slide {
    background: #fff;
    break-after: page;
    height: 720px;
    overflow: hidden;
    padding: 50px 72px 54px;
    position: relative;
    width: 1280px;
  }
  .slide:last-child { break-after: auto; }

  .slide-chrome {
    align-items: center;
    color: #63716c;
    display: flex;
    font-size: 14px;
    font-weight: 700;
    justify-content: space-between;
    left: 72px;
    letter-spacing: 0.08em;
    position: absolute;
    right: 72px;
    text-transform: uppercase;
    top: 28px;
  }
  .slide-footer {
    bottom: 24px;
    color: #63716c;
    font-size: 14px;
    position: absolute;
    right: 72px;
  }
  .slide-body { height: 100%; padding-top: 42px; }

  h1, h2, h3 { margin: 0; }
  h1 {
    font-size: 48px;
    letter-spacing: -0.035em;
    line-height: 1.04;
    margin-bottom: 30px;
    max-width: 1120px;
  }
  h2 {
    color: #0f766e;
    font-size: 32px;
    letter-spacing: -0.02em;
    line-height: 1.12;
    margin: 22px 0 18px;
  }
  h3 { font-size: 24px; line-height: 1.2; margin: 18px 0 12px; }
  p, li {
    font-family: Georgia, Cambria, "Times New Roman", serif;
    font-size: 22px;
    line-height: 1.34;
  }
  p { margin: 0 0 18px; }
  ul, ol { margin: 8px 0 0; padding-left: 34px; }
  li { margin: 0 0 8px; padding-left: 5px; }
  strong { font-family: "Helvetica Neue", Arial, sans-serif; font-weight: 750; }
  code {
    background: #edf2ef;
    border-radius: 3px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.88em;
    padding: 2px 6px;
  }
  blockquote {
    border-left: 8px solid #0f766e;
    color: #20312b;
    margin: 34px 0 0;
    max-width: 1050px;
    padding: 8px 0 8px 28px;
  }
  blockquote p { font-size: 32px; line-height: 1.25; }
  table {
    border-collapse: collapse;
    font-size: 21px;
    line-height: 1.2;
    margin-top: 18px;
    width: 100%;
  }
  th, td {
    border-bottom: 1px solid #a9b8b2;
    padding: 10px 12px;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #e5eeea;
    font-size: 19px;
    font-weight: 750;
  }
  td { font-family: Georgia, Cambria, "Times New Roman", serif; }
  tbody tr:nth-child(even) td { background: #f5f8f6; }

  .slide--content::before {
    background: #0f766e;
    content: "";
    height: 7px;
    left: 72px;
    position: absolute;
    top: 0;
    width: 180px;
  }
  .slide--content:nth-of-type(even)::before { width: 520px; }

  .slide--title {
    background: linear-gradient(90deg, #fff 0, #fff 79%, #17201d 79%, #17201d 100%);
    padding-right: 330px;
  }
  .slide--title .slide-chrome { right: 330px; }
  .slide--title .slide-footer { display: none; }
  .slide--title .slide-body {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-top: 0;
  }
  .slide--title h1 {
    font-size: 68px;
    line-height: 0.98;
    margin-bottom: 34px;
    max-width: 830px;
  }
  .slide--title h2 { font-size: 32px; margin: 0 0 34px; }
  .slide--title p { font-size: 26px; max-width: 780px; }

  .paragraph-feedback-actions, .heading-anchor, .table-anchor, .figure-anchor {
    display: none !important;
  }
`;

await main();
