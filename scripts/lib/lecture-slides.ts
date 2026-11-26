import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { marked, type Token } from "marked";
import {
  lectures,
  phases,
} from "../../packages/obsidian-course-diary/lecture-layout.ts";
import { renderPublicMarkdown } from "./markdown.ts";
import { localizeBookLinks } from "./starter-book-links.ts";
import { escapeHtml } from "./text.ts";

type SlidePage = { title: string; url: string; content: string };

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
    content: renderPublicMarkdown(publicSource, { number: "" }).content,
  };
}

export async function readLectureSlidePages(
  directory: string,
): Promise<SlidePage[]> {
  const files = (await readdir(directory))
    .filter((name) => /^lecture-\d{2}-.+\.md$/.test(name))
    .sort();
  if (files.length !== lectures.length)
    throw new Error("Expected one slide deck per course lecture");
  const decks = await Promise.all(
    lectures.map(async ({ number, phase }, index) => {
      const filename = files[index]!;
      if (!filename.startsWith(`lecture-${String(number).padStart(2, "0")}-`))
        throw new Error(
          `Expected a slide deck for Lecture ${number}, found ${filename}`,
        );
      const { title, content } = renderStudentDeck(
        await readFile(path.join(directory, filename), "utf8"),
        number,
      );
      return {
        phase,
        title,
        url: `/slides/lecture-${number}/`,
        content:
          '<p class="chapter-kicker"><a href="/slides/">All lecture slides</a> · Draft</p>' +
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
    ...decks,
  ];
}
