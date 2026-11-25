import test from "node:test";
import assert from "node:assert/strict";
import { buildDiaryExcerpt } from "../site/scripts/learning-note-preview.ts";
import type { DiaryExchangePreview } from "../site/scripts/learning-session.ts";

function preview(): DiaryExchangePreview {
  return {
    conversationId: "c0000000-0000-4000-8000-000000000001",
    replyId: "c0000000-0000-4000-8000-000000000002",
    studentId: "c0000000-0000-4000-8000-000000000003",
    source: {
      url: "https://book.example/chapters/example/",
      title: "Synthetic chapter",
      kind: "page",
      anchor: "",
      excerpt: "",
      revision: "synthetic-revision",
      conceptIds: ["queue"],
    },
    teaching:
      "; policy study-assistant v1; Synthetic provider 2; model synthetic",
    studentText: "  My <b>literal</b> question.\n ",
    replyText:
      "\n<script>literal text</script>\n**A suggestion**, not my claim.  ",
    includeStudent: true,
    includeReply: true,
    open: true,
  };
}

const fullIdentity =
  "Reviewed discussion draft; conversation c0000000-0000-4000-8000-000000000001; student message c0000000-0000-4000-8000-000000000003; assistant message c0000000-0000-4000-8000-000000000002; reply context c0000000-0000-4000-8000-000000000002";
const review = "; selected and reviewed by student before saving";
test("the draft retains selected literal text, speaker labels and complete ordinary provenance", () => {
  const snapshot = preview();
  const original = structuredClone(snapshot);
  const draft = buildDiaryExcerpt(snapshot);
  assert.equal(
    draft.body,
    "Your question or response:\n\n  My <b>literal</b> question.\n \n\nTeaching assistant suggestion:\n\n\n<script>literal text</script>\n**A suggestion**, not my claim.  ",
  );
  assert.equal(
    draft.assistance,
    fullIdentity +
      "; policy study-assistant v1; Synthetic provider 2; model synthetic" +
      review,
  );
  assert.deepEqual(snapshot, original);
});

test("only chosen nonempty speakers enter the body and selected-message provenance", () => {
  const snapshot = preview();
  const studentOnly = buildDiaryExcerpt({ ...snapshot, includeReply: false });
  assert.equal(
    studentOnly.body,
    "Your question or response:\n\n  My <b>literal</b> question.\n ",
  );
  assert.match(
    studentOnly.assistance,
    /student message c0000000-0000-4000-8000-000000000003/,
  );
  assert.doesNotMatch(studentOnly.assistance, /assistant message/);
  assert.match(
    studentOnly.assistance,
    /reply context c0000000-0000-4000-8000-000000000002/,
  );

  const replyOnly = buildDiaryExcerpt({ ...snapshot, includeStudent: false });
  assert.equal(
    replyOnly.body,
    "Teaching assistant suggestion:\n\n\n<script>literal text</script>\n**A suggestion**, not my claim.  ",
  );
  assert.doesNotMatch(replyOnly.assistance, /student message/);
  assert.match(
    replyOnly.assistance,
    /assistant message c0000000-0000-4000-8000-000000000002/,
  );

  assert.equal(
    buildDiaryExcerpt({
      ...snapshot,
      includeStudent: false,
      includeReply: false,
    }).body,
    "",
  );
  const blank = buildDiaryExcerpt({
    ...snapshot,
    studentText: " \n ",
    replyText: "\t",
  });
  assert.equal(blank.body, "");
  assert.doesNotMatch(blank.assistance, /student message|assistant message/);
});

test("a legacy reply preserves unknown teaching provenance without inventing a student turn", () => {
  const draft = buildDiaryExcerpt({
    ...preview(),
    studentId: null,
    teaching: "; teaching policy not recorded",
    replyText: "Recorded earlier reply.",
  });
  assert.equal(
    draft.body,
    "Teaching assistant suggestion:\n\nRecorded earlier reply.",
  );
  assert.equal(
    draft.assistance,
    "Reviewed discussion draft; conversation c0000000-0000-4000-8000-000000000001; assistant message c0000000-0000-4000-8000-000000000002; reply context c0000000-0000-4000-8000-000000000002; teaching policy not recorded; selected and reviewed by student before saving",
  );
});

test("a long diary excerpt keeps both speakers in full", () => {
  const snapshot = {
    ...preview(),
    studentText: " " + "s".repeat(31_998) + "\n",
    replyText: "\n" + "r".repeat(31_998) + " ",
  };
  const draft = buildDiaryExcerpt(snapshot);
  assert.ok(draft.body.length > 64_000);
  assert.equal(
    draft.body,
    `Your question or response:\n\n${snapshot.studentText}\n\nTeaching assistant suggestion:\n\n${snapshot.replyText}`,
  );
});

test("Markdown preserves the complete teaching metadata and message identities", () => {
  const teaching = "; model " + "m".repeat(1992);
  const draft = buildDiaryExcerpt({ ...preview(), teaching });
  assert.equal(draft.assistance, fullIdentity + teaching + review);
});
