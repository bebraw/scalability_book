import { marked } from "marked";
import highlight from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import {
  decodeHtmlEntities,
  escapeAttribute,
  escapeHtml,
  slugify,
  stableParagraphId,
  stripHeadingNumber,
  stripHtml,
} from "./text.mjs";

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

export function renderMarkdown(source, chapter) {
  source = getPublicMarkdownSource(source);

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

function getPublicMarkdownSource(source) {
  const marker = "\n---\n";
  const markerIndex = source.lastIndexOf(marker);

  // Content after the final standalone marker is author-only notes.
  return markerIndex === -1
    ? source
    : `${source.slice(0, markerIndex).trimEnd()}\n`;
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
