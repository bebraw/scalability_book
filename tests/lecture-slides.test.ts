import assert from "node:assert/strict";
import { test } from "node:test";
import {
  readLectureSlidePages,
  renderStudentDeck,
} from "../scripts/lib/lecture-slides.ts";

function slideSections(content: string) {
  return content.split(/(?=<h[12]\b)/).slice(1);
}

test("the chapter moves from students’ words through the two systems and four pressures to the demo, project and questions", async () => {
  const pages = await readLectureSlidePages("slides");
  const first = pages.find(
    (page) => page.url === "/slides/lecture-1/",
  )!.content;
  const slides = slideSections(first);
  assert.match(slides[0]!, /What is scalability to you\?/);
  assert.match(slides[0]!, /word cloud/i);

  const topics = slides
    .slice(1, -3)
    .map(
      (section) =>
        section.match(/^<h2\b[^>]*>([^<]+)/)?.[1].toLowerCase() ?? "",
    );
  const positionOf = (topic: string) =>
    topics.findIndex((title) => title.includes(topic));
  const systems = ["application", "development"].map(positionOf);
  const pressures = ["demand", "data", "contributor", "change"].map(positionOf);
  assert.ok(systems.every((position) => position >= 0));
  assert.ok(Math.min(...pressures) > Math.max(...systems));
  assert.equal(
    new Set([...systems, ...pressures]).size,
    6,
    "give each system and pressure its own slide",
  );
  assert.match(
    slides.at(-3)!,
    /href="\/learn\/pilot\/responses\/#slide-capacity"/,
  );
  assert.match(slides.at(-2)!, /href="\/project\/establish\/"/);
  assert.match(slides.at(-1)!, /Ask a question/i);

  const last = pages.find((page) => page.url === "/slides/lecture-9/")!.content;
  assert.match(last, /Complete the Compare record/);
  assert.match(last, /Which idea changed for you/);
  assert.doesNotMatch(
    last,
    /Would you keep the cache|What changes at handover|completed items sometimes still appear|provisional recommendation/i,
  );
  const index = pages.find((page) => page.url === "/slides/")!.content;
  for (const { url, content } of pages.slice(1)) {
    assert.ok(index.includes(`href="${url}"`));
    assert.match(content, /href="\/slides\/"/);
    assert.match(content, /Draft/);
    assert.doesNotMatch(
      content,
      /\[Sources\]|in-class-only|<!--|paragraph-comment-button|marp: true/,
    );
  }
});

test("the Lecture 1 orientation leads to the chapter while existing lecture links keep their decks", async () => {
  const pages = await readLectureSlidePages("slides");
  const index = pages.find(({ url }) => url === "/slides/")!;
  const orientationUrl = "/slides/lecture-1/orientation/";
  const chapterUrl = "/slides/lecture-1/";
  const orientation = pages.find(({ url }) => url === orientationUrl)!;
  const chapter = pages.find(({ url }) => url === chapterUrl)!;
  const lectureUrls = Array.from(
    { length: 9 },
    (_, i) => `/slides/lecture-${i + 1}/`,
  );
  assert.deepEqual(
    Array.from(
      index.content.matchAll(/href="(\/slides\/lecture-[^"]+)"/g),
      ([, target]) => target,
    ),
    [orientationUrl, ...lectureUrls],
  );
  assert.ok(orientation.content.includes(`href="${chapterUrl}"`));
  assert.ok(chapter.content.includes(`href="${orientationUrl}"`));
  assert.match(orientation.content, /href="\/project\/grading\/"/);
  assert.match(orientation.content, /href="\/diary\/"/);
  assert.match(orientation.content, /self- and peer-assessment/i);
  const gradingSlide = slideSections(orientation.content).find((slide) =>
    slide.includes("153"),
  );
  assert.ok(gradingSlide, "show the points breakdown with its grade scale");
  assert.match(gradingSlide, /7 of 9/);
  assert.match(gradingSlide, /10\/30/);
  const scale = gradingSlide.replace(/<[^>]+>/g, "");
  for (const [index, threshold] of [
    "50%",
    "60%",
    "70%",
    "80%",
    "90%",
  ].entries())
    assert.ok(
      scale.includes(`${index + 1} at ${threshold}`),
      `grade ${index + 1} starts at ${threshold}`,
    );
  assert.match(slideSections(orientation.content).at(-1)!, /Ask a question/i);
  assert.doesNotMatch(orientation.content, /keep the cache|two starts/i);
});

test("a reused book figure reaches the student deck with its drawing and accessible description", () => {
  const source = [
    "---",
    "title: Candidate review",
    "---",
    "# How was the export checked?",
    "",
    '{{ import "site/includes/coding-loop-figure.html" }}',
  ].join("\n");
  const { content } = renderStudentDeck(source, 2);
  assert.match(content, /<svg[^>]+role="img"[^>]+aria-labelledby=/);
  assert.match(content, /<desc[^>]*>[^<]*CSV reader finds four fields/);
  assert.match(content, /data-diagram-node="Validate"/);
  assert.doesNotMatch(content, /data-book-diagram-placeholder/);
});

test("title links survive slide reordering and count only visible headings", () => {
  const first = "# Reordering";
  const measure =
    "# Measure twice\n\nA useful [reference](https://example.org/).";
  const privateSlide =
    "<!-- in-class-only -->\n\n# Measure twice\n\nClassroom answer.";
  const record =
    "# Record it\n\n~~~txt\n---\n~~~\n\n<!--\nSpeaker note\n---\ncontinued\n-->";
  for (const slides of [
    [first, privateSlide, measure, record, measure],
    [first, record, measure, measure, privateSlide],
  ]) {
    const source =
      '---\ntitle: "Lecture 1: Reordering"\n---\n\n' +
      slides.join("\n\n---\n\n");
    const { content } = renderStudentDeck(source, 1);
    for (const id of ["measure-twice", "measure-twice-2", "record-it"]) {
      assert.ok(content.includes(`id="${id}"`));
      assert.ok(content.includes(`href="#${id}"`));
    }
    assert.match(content, /href="https:\/\/example\.org\/"/);
    assert.match(content, /<code[^>]*>---/);
    assert.doesNotMatch(
      content,
      /measure-twice-3|Speaker note|continued|Classroom answer/,
    );
  }
});
