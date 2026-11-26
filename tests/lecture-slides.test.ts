import assert from "node:assert/strict";
import { test } from "node:test";
import {
  readLectureSlidePages,
  renderStudentDeck,
} from "../scripts/lib/lecture-slides.ts";

test("student decks keep the opening prediction and leave the closed-book return activity in class", async () => {
  const pages = await readLectureSlidePages("slides");
  const first = pages.find(
    (page) => page.url === "/slides/lecture-1/",
  )!.content;
  const prediction = first.indexOf("record your provisional recommendation");
  assert.ok(
    prediction >= 0 &&
      prediction < first.indexOf("Four pressures organize the course"),
  );
  assert.match(first, /href="\/project\/grading\/"/);
  assert.match(first, /href="#would-you-keep-the-cache"/);
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
