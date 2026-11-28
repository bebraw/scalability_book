import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { marked, type Token } from "marked";
import {
  lectures,
  phases,
} from "../../packages/obsidian-course-diary/lecture-layout.ts";
import { renderPublicMarkdown } from "./markdown.ts";
import {
  injectBookDiagrams,
  renderBookDiagrams,
} from "./render-book-diagrams.ts";
import { localizeBookLinks } from "./starter-book-links.ts";
import { escapeHtml } from "./text.ts";

type SlidePage = { title: string; url: string; content: string };

const bookDiagrams = renderBookDiagrams();

export function renderLectureMarkdown(source: string) {
  const { content } = renderPublicMarkdown(source, { number: "" });
  return injectBookDiagrams(content, bookDiagrams);
}

const chapterDecks = [
  "what-scalability-means",
  "agent-supported-development",
  "measurement-and-evidence",
  "web-architecture",
  "development-friction",
  "assumptions-under-pressure",
  "agent-fleets",
  "scaling-responses",
  "engineering-judgment",
];

export async function readLectureDeckSources(directory: string) {
  const decks = lectures.flatMap(({ number, phase }) => {
    const prefix = `lecture-${String(number).padStart(2, "0")}-`;
    const url = `/slides/lecture-${number}/`;
    const chapter = {
      number,
      phase,
      filename: `${prefix}${chapterDecks[number - 1]}.md`,
      url,
    };
    if (number !== 1) return [chapter];
    return [
      {
        number,
        phase,
        filename: `${prefix}orientation.md`,
        url: `${url}orientation/`,
      },
      chapter,
    ];
  });
  const files = new Set(
    (await readdir(directory)).filter((name) =>
      /^lecture-\d{2}-.+\.md$/.test(name),
    ),
  );
  for (const { filename } of decks) {
    if (!files.delete(filename))
      throw new Error(`Missing lecture deck: ${filename}`);
  }
  if (files.size)
    throw new Error(`Unmapped lecture decks: ${[...files].join(", ")}`);
  return decks;
}

export function renderStudentDeck(source: string, lecture: number) {
  const deck = source
    .replaceAll("\r\n", "\n")
    .match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const title = deck?.[1]
    ?.match(/^title:[ \t]*(.+)$/m)?.[1]
    ?.trim()
    .replace(/^(["'])(.*)\1$/, "$2");
  if (!deck || !title)
    throw new Error(`Lecture ${lecture} is missing its deck title`);

  // Markdown tokens keep separators in code or speaker notes inside their slide.
  const slides: Token[][] = [[]];
  for (const token of marked.lexer(deck[2]!)) {
    if (token.type === "hr" && token.raw.trim() === "---") slides.push([]);
    else slides.at(-1)!.push(token);
  }
  const visible = slides.filter(
    (slide) =>
      !slide.some(
        (token) =>
          token.type === "html" && token.raw.includes("<!-- in-class-only -->"),
      ),
  );
  const markdown = visible
    .map((slide, index) =>
      slide
        .map((token) => {
          if (token.type === "code") return token.raw;
          const raw = token.raw.replace(/<!--[\s\S]*?(?:-->|$)/g, "");
          if (token.type !== "heading") return raw;
          if (index > 0) return raw.replace(/^#{1,5}(?=[ \t])/, "#$&");
          if (
            token.depth === 2 &&
            token.text.startsWith(`Lecture ${lecture} · `)
          )
            return raw.replace(/^##[ \t]+/, "");
          return raw;
        })
        .join(""),
    )
    .join("\n\n");
  const publicSource = localizeBookLinks(Buffer.from(markdown), "").toString(
    "utf8",
  );
  return {
    title,
    content: renderLectureMarkdown(publicSource),
  };
}

export async function readLectureSlidePages(
  directory: string,
): Promise<SlidePage[]> {
  const sources = await readLectureDeckSources(directory);
  const decks = await Promise.all(
    sources.map(async ({ filename, number, phase, url }) => {
      const { title, content } = renderStudentDeck(
        await readFile(path.join(directory, filename), "utf8"),
        number,
      );
      return {
        number,
        phase,
        title,
        url,
        content,
      };
    }),
  );
  const groups = phases.map(
    (phase) =>
      `<h2>${phase}</h2><ul>${decks
        .filter((deck) => deck.phase === phase)
        .map(
          (deck) =>
            `<li><a href="${deck.url}">${escapeHtml(deck.title)}</a></li>`,
        )
        .join("")}</ul>`,
  );
  return [
    {
      title: "Lecture slides",
      url: "/slides/",
      content:
        "<h1>Lecture slides</h1><p>Use these draft slides to prepare for class or revisit a lecture. Reopen the same link for the latest version.</p>" +
        groups.join(""),
    },
    ...decks.map(({ number, title, url, content }) => {
      const companionLinks = decks
        .filter((other) => other.number === number && other.url !== url)
        .map(
          (other) => `<a href="${other.url}">${escapeHtml(other.title)}</a> · `,
        )
        .join("");
      return {
        title,
        url,
        content: `<p class="chapter-kicker"><a href="/slides/">All lecture slides</a> · ${companionLinks}Draft</p>${content}`,
      };
    }),
  ];
}
